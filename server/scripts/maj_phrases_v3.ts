/**
 * Phrases d'Ompangano en graphie v3.5 (22 nov. 2026, demande de Capp : « refais les 50 125 phrases et mets-les à jour
 * en base »). Fichier produit par 17_edition_DONDO_myene/v3_rekanga_2026-11-21/passe_v35_phrases.py :
 *   { id: { avant (texte v2 attendu en base), myene (v3.5), api, sons (sons rares), rang (priorité d'enregistrement) } }
 *
 * Pour chaque fiche : le texte n'est remplacé que s'il est encore celui de l'import v2 (une fiche corrigée à la main
 * depuis n'est pas touchée : elle est listée). Champs écrits : myeneText, phoneticApi, myeneText_v2 (ancien texte gardé),
 * graphie, sonsRares, rangEnregistrement, updatedAt. Chaque changement va dans item_audit. Rien n'est supprimé.
 *
 * Option --aussi id1,id2 : fiches dont le texte en base est antérieur à v2 (import, sans correction humaine) à mettre aussi en v3.5.
 *
 * Sur le VPS, APRÈS une sauvegarde datée de la table items :
 *   docker compose exec -T api npx tsx scripts/maj_phrases_v3.ts /chemin/phrases_v35.json [--essai]
 */
import { readFileSync } from 'node:fs';
import { createPgDb } from '../api/src/db.ts';
import { journaliser, type EntreeJournal } from '../api/src/protection.ts';

const args = process.argv.slice(2);
const essai = args.includes('--essai');
const iAussi = args.indexOf('--aussi');
// --aussi id1,id2 : fiches importées restées dans une graphie plus ancienne que v2 (vérifiées une à une, aucune correction humaine)
const aussi = new Set(iAussi >= 0 ? args[iAussi + 1].split(',') : []);
const fichier = args.find((a, i) => !a.startsWith('--') && i !== iAussi + 1) || (() => { throw new Error('fichier JSON manquant'); })();
const phrases = JSON.parse(readFileSync(fichier, 'utf8')) as Record<string, { avant: string; myene: string; api: string; sons: string; rang: number }>;
const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
const bilan = { fiches: 0, modifiees: 0, deja_v3: 0, classees_seulement: 0, corrigees_a_la_main: [] as string[], absentes: 0 };
const maintenant = new Date().toISOString();
try {
  await db.tx(async q => {
    const rows = await q.query<any>(`SELECT id, data->>'myeneText' AS myene, data->>'createdBy' AS auteur FROM items WHERE deleted_at IS NULL`);
    const enBase = new Map(rows.map(r => [r.id as string, r as { myene: string; auteur: string }]));
    const maj: { id: string; data: Record<string, unknown> }[] = [];
    const journal: EntreeJournal[] = [];
    for (const [id, p] of Object.entries(phrases)) {
      const b = enBase.get(id);
      if (!b) { bilan.absentes++; continue; }
      bilan.fiches++;
      const classement = { sonsRares: p.sons, rangEnregistrement: p.rang, graphie: 'v3.5' };
      if (b.myene === p.myene) { bilan.deja_v3++; maj.push({ id, data: classement }); continue; }
      if ((b.myene !== p.avant && !aussi.has(id)) || b.auteur === 'system_ompangano') {
        bilan.corrigees_a_la_main.push(id); maj.push({ id, data: { sonsRares: p.sons, rangEnregistrement: p.rang } }); bilan.classees_seulement++; continue;
      }
      maj.push({ id, data: { ...classement, myeneText: p.myene, phoneticApi: p.api, myeneText_v2: b.myene, updatedAt: maintenant } });
      journal.push({ itemId: id, action: 'modifie', acteur: 'graphie_v3.5', source: 'serveur', ancienMyene: b.myene, nouveauMyene: p.myene, dateServeur: maintenant, detail: 'graphie v3.5 (règles de référence, 22 nov. 2026)' });
      bilan.modifiees++;
    }
    if (!essai) {
      for (let i = 0; i < maj.length; i += 500) {
        const part = maj.slice(i, i + 500);
        await q.query(`UPDATE items t SET data = t.data || v.data, updated_at = clock_timestamp()
          FROM unnest($1::text[], $2::jsonb[]) AS v(id, data) WHERE t.id = v.id`,
          [part.map(m => m.id), part.map(m => JSON.stringify(m.data))]);
      }
      await journaliser(q, journal);
    }
  });
  console.log(JSON.stringify({ essai, ...bilan, corrigees_a_la_main: bilan.corrigees_a_la_main.slice(0, 50), nb_corrigees_a_la_main: bilan.corrigees_a_la_main.length }));
} finally {
  await db.close?.();
}
