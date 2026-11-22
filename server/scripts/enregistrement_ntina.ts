/**
 * Planning d'enregistrement des mots de Ntina (cursus v3, transversal ; 22 nov. 2026, demande de Capp).
 * Fichier d'entrée : 14_programme_et_jeux/enregistrement_v3/mots_Ntina_pour_Ompangano.json (outils_enregistrement_v3.py).
 *
 *   --creer <fichier.json>  : thème « Les mots de Ntina » (ntina_mots), une fiche Ompangano par mot (rien n'est remplacé si
 *                             la fiche existe), défi « Les mots de Ntina » (enregistrements, 30 jours).
 *   --attacher              : met dans chaque exercice de Ntina (et chaque zone de scène) le son d'un enregistrement VALIDÉ de la
 *                             fiche du même mot, d'une voix autorisée (accord de voix, et accord du parent pour un mineur) ;
 *                             de préférence au format audio/mp4 (lisible sur iPhone). Un exercice qui a déjà un son est gardé.
 *   --essai                 : n'écrit rien, affiche le bilan.
 *
 * Sur le VPS, APRÈS une sauvegarde datée des tables items, themes, challenges et contenus :
 *   docker compose exec -T api npx tsx scripts/enregistrement_ntina.ts --creer /tmp/mots_Ntina_pour_Ompangano.json [--essai]
 */
import { readFileSync } from 'node:fs';
import { SQL_VOIX_AUTORISEE } from '../../packages/noyau/src/accordVoix.ts';
import { createPgDb } from '../api/src/db.ts';

const args = process.argv.slice(2);
const essai = args.includes('--essai');
const iCreer = args.indexOf('--creer');
const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
const bilan: Record<string, unknown> = { essai };
const maintenant = new Date();
try {
  await db.tx(async q => {
    if (iCreer >= 0) {
      const fiches = JSON.parse(readFileSync(args[iCreer + 1], 'utf8')) as Record<string, any>[];
      const theme = { name: 'Les mots de Ntina', shortName: 'Mots de Ntina', icon: '🧒', color: '#F59E0B', description: 'Les mots que les tout-petits apprennent dans Ntina : enregistrez-les pour que chaque leçon ait sa voix.', keywords: ['ntina', 'enfant', 'mot'], createdAt: maintenant.toISOString(), createdBy: 'planning_ntina' };
      const fin = new Date(maintenant.getTime() + 30 * 86400_000);
      const defi = { title: 'Les mots de Ntina', description: 'Enregistrez 10 mots de Ntina : ils serviront de modèle aux enfants dans les leçons.', theme: 'ntina_mots', targetCount: 10, challengeType: 'recordings', xpReward: 300, badgeRewardId: 'badge-defi-ntina', badgeRewardName: 'Voix de Ntina', badgeRewardIcon: '🧒', startDate: maintenant.toISOString(), endDate: fin.toISOString(), isActive: true, createdAt: maintenant.toISOString() };
      let ajoutees = 0;
      if (!essai) {
        await q.query(`INSERT INTO themes (id, data) VALUES ('ntina_mots', $1) ON CONFLICT (id) DO NOTHING`, [JSON.stringify(theme)]);
        await q.query(`INSERT INTO challenges (id, data) VALUES ('defi-mots-ntina', $1) ON CONFLICT (id) DO NOTHING`, [JSON.stringify(defi)]);
        for (const f of fiches) {
          const r = await q.query<any>(`INSERT INTO items (id, source_ref, dialect, category, status, data) VALUES ($1,$1,'orungu','ntina_mots','active',$2)
            ON CONFLICT DO NOTHING RETURNING id`, [f.id, JSON.stringify({ ...f, sourceRef: f.id, leconId: f.sourceRef, createdBy: 'planning_ntina', createdAt: maintenant.toISOString(), recordingsCount: 0, contributionsCount: 0 })]);
          if (r.length) ajoutees++;
        }
      }
      Object.assign(bilan, { fiches: fiches.length, ajoutees, theme: 'ntina_mots', defi: 'defi-mots-ntina' });
    }
    if (args.includes('--attacher')) {
      const sons = await q.query<any>(`SELECT DISTINCT ON (lower(i.data->>'myeneText')) lower(i.data->>'myeneText') AS mot, c.audio_storage_path AS audio
        FROM contributions c JOIN items i ON i.id = c.item_id JOIN users u ON u.id = c.user_id
        WHERE i.category = 'ntina_mots' AND c.status = 'approved' AND c.deleted_at IS NULL AND c.audio_storage_path IS NOT NULL AND ${SQL_VOIX_AUTORISEE('u')}
        ORDER BY lower(i.data->>'myeneText'), (c.audio_mime_type = 'audio/mp4') DESC, c.updated_at DESC`);
      const parMot = new Map(sons.map(s => [String(s.mot).replace(/[ !?.]+$/, ''), s.audio as string]));
      const exos = await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'exercices' AND deleted_at IS NULL AND data->>'lecon_id' LIKE 'ntina-%'`);
      let exercices = 0, zones = 0;
      for (const e of exos) {
        const d = e.data as Record<string, any>; let change = false;
        const cle = (m?: string) => (m ?? '').toLowerCase().replace(/[ !?.]+$/, '');
        if (!d.audio && parMot.get(cle(d.mot_myene))) { d.audio = parMot.get(cle(d.mot_myene)); change = true; exercices++; }
        for (const z of (Array.isArray(d.zones) ? d.zones : [])) if (!z.audio && parMot.get(cle(z.mot))) { z.audio = parMot.get(cle(z.mot)); change = true; zones++; }
        if (change && !essai) await q.query(`UPDATE contenus SET data = $2, updated_at = clock_timestamp() WHERE collection = 'exercices' AND id = $1`, [e.id, JSON.stringify(d)]);
      }
      Object.assign(bilan, { sons_valides: parMot.size, exercices_avec_son: exercices, zones_avec_son: zones });
    }
  });
  console.log(JSON.stringify(bilan));
} finally {
  await db.close();
}
