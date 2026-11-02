import * as SQLite from 'expo-sqlite';
import { normaliserRecherche, texteRecherche, type QuestionnaireItem, type StockageCatalogue } from '@nkala/noyau';

// Même schéma que le web (itemStore) : fiches indexées par dialecte, curseur de reprise dans « meta ».
let dbp: Promise<SQLite.SQLiteDatabase> | null = null;
const ouvrir = () => (dbp ??= (async () => {
  const db = await SQLite.openDatabaseAsync('nkala_catalogue_v2.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY NOT NULL, dialect TEXT NOT NULL, txt TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS items_dialect ON items (dialect, id);
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY NOT NULL, v TEXT);
  `);
  return db;
})());

function filtre({ dialecte, texte, categorie, dialectes }: { dialecte?: string | null; texte?: string; categorie?: string | null; dialectes?: string[] }) {
  const c: string[] = []; const params: (string | number)[] = [];
  if (dialecte) { c.push('dialect = ?'); params.push(dialecte); }
  if (dialectes?.length) { c.push(`dialect IN (${dialectes.map(() => '?').join(',')})`); params.push(...dialectes); }
  if (categorie) { c.push(`COALESCE(json_extract(data, '$.category'), json_extract(data, '$.theme'), 'general') = ?`); params.push(categorie); }
  const q = normaliserRecherche(texte || '');
  if (q) { c.push('instr(txt, ?) > 0'); params.push(q); }
  return { sql: c.length ? `WHERE ${c.join(' AND ')}` : '', params };
}

export const catalogue: StockageCatalogue = {
  async lireCurseur() {
    const db = await ouvrir();
    const rows = await db.getAllAsync<{ k: string; v: string }>(`SELECT k, v FROM meta WHERE k IN ('curseur','epoque')`);
    const m = Object.fromEntries(rows.map(r => [r.k, r.v]));
    return { curseur: m.curseur || null, epoque: m.epoque || null };
  },
  async ecrirePage(fiches, supprimees, curseur, epoque) {
    const db = await ouvrir();
    await db.withTransactionAsync(async () => {
      for (const f of fiches) {
        await db.runAsync(`INSERT OR REPLACE INTO items (id, dialect, txt, data) VALUES (?, ?, ?, ?)`, [f.id, String(f.dialect || ''), texteRecherche(f), JSON.stringify(f)]);
      }
      for (const id of supprimees) await db.runAsync(`DELETE FROM items WHERE id = ?`, [id]);
      if (curseur) await db.runAsync(`INSERT OR REPLACE INTO meta (k, v) VALUES ('curseur', ?)`, [curseur]);
      if (epoque) await db.runAsync(`INSERT OR REPLACE INTO meta (k, v) VALUES ('epoque', ?)`, [epoque]);
    });
  },
  async vider() {
    const db = await ouvrir();
    await db.execAsync(`DELETE FROM items; DELETE FROM meta;`);
  },
  async compter() {
    const db = await ouvrir();
    return (await db.getFirstAsync<{ n: number }>(`SELECT count(*) AS n FROM items`))?.n ?? 0;
  },
  async suivante(dialecte, apresId) {
    const db = await ouvrir();
    const row = await db.getFirstAsync<{ data: string }>(
      `SELECT data FROM items WHERE (? IS NULL OR dialect = ?) AND id > ? ORDER BY id LIMIT 1`,
      [dialecte, dialecte, apresId ?? '']
    );
    return row ? (JSON.parse(row.data) as QuestionnaireItem) : null;
  },
  async rechercher({ dialecte, texte, categorie, dialectes, limite, decalage }) {
    const db = await ouvrir();
    const { sql, params } = filtre({ dialecte, texte, categorie, dialectes });
    const rows = await db.getAllAsync<{ data: string }>(`SELECT data FROM items ${sql} ORDER BY id LIMIT ? OFFSET ?`, [...params, limite, decalage]);
    return rows.map(r => JSON.parse(r.data) as QuestionnaireItem);
  },
  async compterRecherche(req) {
    const db = await ouvrir();
    const { sql, params } = filtre(req);
    return (await db.getFirstAsync<{ n: number }>(`SELECT count(*) AS n FROM items ${sql}`, params))?.n ?? 0;
  },
  async compteursThemes(dialectes) {
    const db = await ouvrir();
    const rows = await db.getAllAsync<{ c: string; n: number }>(
      `SELECT COALESCE(json_extract(data, '$.category'), json_extract(data, '$.theme'), 'general') AS c, count(*) AS n FROM items ${dialectes?.length ? `WHERE dialect IN (${dialectes.map(() => '?').join(',')})` : ''} GROUP BY c`,
      dialectes?.length ? dialectes : []
    );
    return Object.fromEntries(rows.map(r => [r.c, r.n]));
  },
  async identifiants({ dialectes, categorie }) {
    const db = await ouvrir();
    const clauses: string[] = [];
    const params: (string | number)[] = [];
    if (dialectes?.length) { clauses.push(`dialect IN (${dialectes.map(() => '?').join(',')})`); params.push(...dialectes); }
    if (categorie) { clauses.push(`COALESCE(json_extract(data, '$.category'), json_extract(data, '$.theme')) = ?`); params.push(categorie); }
    const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM items${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY id`, params);
    return rows.map(r => r.id);
  },
  async compteursDialectes() {
    const db = await ouvrir();
    const rows = await db.getAllAsync<{ dialect: string; n: number }>(`SELECT dialect, count(*) AS n FROM items GROUP BY dialect`);
    return Object.fromEntries(rows.map(r => [r.dialect, r.n]));
  },
  async fiche(id) {
    const db = await ouvrir();
    const row = await db.getFirstAsync<{ data: string }>(`SELECT data FROM items WHERE id = ?`, [id]);
    return row ? (JSON.parse(row.data) as QuestionnaireItem) : null;
  },
  async aleatoires(dialecte, n) {
    const db = await ouvrir();
    const rows = await db.getAllAsync<{ data: string }>(`SELECT data FROM items WHERE (? IS NULL OR dialect = ?) ORDER BY random() LIMIT ?`, [dialecte ?? null, dialecte ?? null, n]);
    return rows.map(r => JSON.parse(r.data) as QuestionnaireItem);
  },
  async parIds(ids) {
    if (!ids.length) return [];
    const db = await ouvrir();
    const rows = await db.getAllAsync<{ data: string }>(`SELECT data FROM items WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id`, ids);
    return rows.map(r => JSON.parse(r.data) as QuestionnaireItem);
  },
  async doublons(limite) {
    const db = await ouvrir();
    const rows = await db.getAllAsync<{ dialect: string; txt: string; ids: string }>(
      `SELECT dialect, txt, group_concat(id, '|') AS ids FROM items GROUP BY dialect, txt HAVING count(*) > 1 ORDER BY count(*) DESC LIMIT ?`, [limite]
    );
    return rows.map(r => ({ dialecte: r.dialect, texte: r.txt.split('\u0001').slice(0, 2).reverse().join(' = '), ids: r.ids.split('|') }));
  },
};
