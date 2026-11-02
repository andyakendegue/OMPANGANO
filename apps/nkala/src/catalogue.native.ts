import * as SQLite from 'expo-sqlite';
import type { QuestionnaireItem, StockageCatalogue } from '@nkala/noyau';

// Même schéma que le web (itemStore) : fiches indexées par dialecte, curseur de reprise dans « meta ».
let dbp: Promise<SQLite.SQLiteDatabase> | null = null;
const ouvrir = () => (dbp ??= (async () => {
  const db = await SQLite.openDatabaseAsync('nkala_catalogue.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY NOT NULL, dialect TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS items_dialect ON items (dialect, id);
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY NOT NULL, v TEXT);
  `);
  return db;
})());

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
        await db.runAsync(`INSERT OR REPLACE INTO items (id, dialect, data) VALUES (?, ?, ?)`, [f.id, String(f.dialect || ''), JSON.stringify(f)]);
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
};
