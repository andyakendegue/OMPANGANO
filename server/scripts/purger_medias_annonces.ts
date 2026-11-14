// Efface du stockage les médias d'annonces refusées, supprimées ou remplacées depuis plus de 30 jours.
// Les chemins sont notés dans medias_annonces_a_effacer par l'API (refus, suppression par l'auteur, modification).
// Lancer dans le conteneur de l'API : npx tsx scripts/purger_medias_annonces.ts [--essai]
// À mettre en tâche quotidienne (cron) une fois validé par Capp.
import { loadConfig } from '../api/src/config.ts';
import { createPgDb } from '../api/src/db.ts';
import { createS3Storage } from '../api/src/storage.ts';

const essai = process.argv.includes('--essai');
const cfg = loadConfig();
const db = await createPgDb(cfg.databaseUrl);
const storage = createS3Storage(cfg.s3);
// Un chemin encore utilisé par une annonce vivante (republiée entre-temps) n'est jamais effacé.
const r = await db.query<{ chemin: string }>(`
  SELECT e.chemin FROM medias_annonces_a_effacer e
  WHERE e.efface_le IS NULL AND e.at < clock_timestamp() - interval '30 days'
    AND NOT EXISTS (SELECT 1 FROM contenus c WHERE c.collection = 'annonces' AND c.deleted_at IS NULL AND c.statut <> 'refuse' AND c.data::text LIKE '%' || e.chemin || '%')
  ORDER BY e.at LIMIT 5000`);
let n = 0;
for (const { chemin } of r) {
  if (essai) { console.log('[essai]', chemin); continue; }
  try { await storage.remove(chemin); await db.query(`UPDATE medias_annonces_a_effacer SET efface_le = clock_timestamp() WHERE chemin = $1`, [chemin]); n++; }
  catch (e) { console.error('échec', chemin, (e as Error).message); }
}
// Suivi des URL d'envoi : ne sert qu'à la limite quotidienne, conservé 30 jours (registre des traitements).
if (!essai) await db.query(`DELETE FROM medias_annonces_envois WHERE at < clock_timestamp() - interval '30 days'`);
console.log(essai ? `${r.length} fichier(s) seraient effacés.` : `${n} fichier(s) effacé(s).`);
await db.close();
