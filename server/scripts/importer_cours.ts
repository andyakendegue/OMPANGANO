/**
 * Import des cours d'Onênji en production avec MISE À JOUR des lignes existantes (cursus v3, consigne du 22 nov. 2026 :
 * « import des cours en production à la fin de chaque lot », accord de Capp). `scripts/exemples.ts importer` n'ajoute que
 * les lignes nouvelles ; celui-ci remplace le contenu des parcours, unités, leçons et exercices par celui de contenu/exemples
 * (identifiants inchangés, progression des comptes gardée ; un exercice retiré arrive avec publie = false). Rien n'est supprimé.
 * Option : --mots-jeux <fichier.json> ({ id: { myene } }) met à jour le mot myènè des jeux d'Azeva (conversion v3).
 *
 * Sur le VPS, APRÈS une sauvegarde datée de la base :
 *   docker compose exec -T api npx tsx scripts/importer_cours.ts [--mots-jeux /chemin] [--essai]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPgDb } from '../api/src/db.ts';
import { dossierExemples } from '../api/src/exemples.ts';

const args = process.argv.slice(2);
const essai = args.includes('--essai');
const iMots = args.indexOf('--mots-jeux');
const COLLECTIONS = ['parcours', 'unites', 'lecons', 'exercices'];
const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
const bilan: Record<string, { ajoutees: number; mises_a_jour: number; non_publiees: number }> = {};
try {
  await db.tx(async q => {
    for (const c of COLLECTIONS) {
      const lignes = JSON.parse(readFileSync(join(dossierExemples(), `${c}.json`), 'utf8')) as Record<string, any>[];
      const b = { ajoutees: 0, mises_a_jour: 0, non_publiees: 0 };
      for (const l of lignes) {
        const publie = l.publie !== false;
        // `exemple: true` comme les imports précédents (même origine : contenu/exemples)
        const r = await q.query<any>(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, publie = EXCLUDED.publie, statut = EXCLUDED.statut, deleted_at = NULL, updated_at = clock_timestamp()
          RETURNING (xmax = 0) AS nouvelle`, [c, l.id, JSON.stringify({ ...l, exemple: true }), publie, publie ? 'publie' : 'brouillon']);
        if (r[0]?.nouvelle) b.ajoutees++; else b.mises_a_jour++;
        if (!publie) b.non_publiees++;
      }
      bilan[c] = b;
    }
    if (iMots >= 0) {
      const maj = JSON.parse(readFileSync(args[iMots + 1], 'utf8')) as Record<string, { myene: string }>;
      let n = 0;
      for (const [id, v] of Object.entries(maj)) n += (await q.query(`UPDATE contenus SET data = jsonb_set(data, '{myene}', to_jsonb($2::text)), updated_at = clock_timestamp() WHERE collection = 'mots_jeux' AND id = $1 RETURNING id`, [id, v.myene])).length;
      bilan.mots_jeux = { ajoutees: 0, mises_a_jour: n, non_publiees: 0 };
    }
    if (essai) throw new Error('ESSAI');
  });
} catch (e) { if ((e as Error).message !== 'ESSAI') { console.error((e as Error).message); process.exitCode = 1; } else console.log('Essai : rien n\'a été enregistré.'); }
console.log(JSON.stringify(bilan));
await db.close();
