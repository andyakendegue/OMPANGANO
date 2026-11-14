/**
 * Fiche de l'utilisateur pour Kak'Igonjo : ce que l'assistant sait de son interlocuteur, relu dans la base à chaque message
 * (jamais mis en cache, jamais versé dans la base vectorielle) et limité à l'utilisateur connecté.
 * S'y ajoutent les données que seul le téléphone connaît (réglages, « Mes mots », écran ouvert), envoyées par l'app et nettoyées ici :
 * listes fermées pour les réglages, lettres seulement pour les mots, pour qu'aucun texte libre ne devienne une consigne.
 */
import { REGLAGES_IA, ECRANS_IA, type CleReglageIa } from '../../../packages/noyau/src/actionsIa.ts';
import type { Queryable } from './db.ts';
import { droitsDe } from './services.ts';
import { lireProgression } from './jeux.ts';

/** Ce que l'app envoie avec un message (tout est facultatif). */
export interface EtatLocal {
  prefs?: Partial<Record<CleReglageIa, unknown>>;
  mesMots?: { total?: unknown; derniers?: unknown };
  ecran?: unknown;
}

const mot = (v: unknown) => typeof v === 'string' ? v.replace(/[^\p{L}\p{M}' -]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 30) : '';
const jourFr = (d: string | Date | null | undefined) => {
  if (!d) return '';
  const x = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00') : new Date(d);
  return Number.isNaN(x.getTime()) ? '' : `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
};

/** Réglages et mots du téléphone, réduits aux valeurs connues. */
export function nettoyerEtatLocal(e: unknown): { prefs: Partial<Record<CleReglageIa, string>>; mots: { total: number; derniers: string[] } | null; ecran: string | null } {
  const b = (e && typeof e === 'object' ? e : {}) as EtatLocal;
  const prefs: Partial<Record<CleReglageIa, string>> = {};
  if (b.prefs && typeof b.prefs === 'object') {
    for (const k of Object.keys(REGLAGES_IA) as CleReglageIa[]) {
      const valeurs = REGLAGES_IA[k].valeurs as Record<string, string>;
      const v = String((b.prefs as Record<string, unknown>)[k]);
      if (Object.hasOwn(b.prefs, k) && Object.hasOwn(valeurs, v)) prefs[k] = valeurs[v];
    }
  }
  let mots: { total: number; derniers: string[] } | null = null;
  if (b.mesMots && typeof b.mesMots === 'object') {
    const total = Math.max(0, Math.min(100000, Math.floor(Number(b.mesMots.total) || 0)));
    const derniers = (Array.isArray(b.mesMots.derniers) ? b.mesMots.derniers : []).map(mot).filter(Boolean).slice(0, 8);
    mots = { total: Math.max(total, derniers.length), derniers };
  }
  const chemin = typeof b.ecran === 'string' ? b.ecran : '';
  const ecran = Object.values(ECRANS_IA).find(x => x.chemin !== '/' ? chemin.startsWith(x.chemin) : chemin === '/')?.libelle ?? null;
  return { prefs, mots, ecran };
}

/** Bloc de texte ajouté à la consigne système. Ne lève jamais : une fiche incomplète vaut mieux qu'un chat en panne. */
export async function ficheUtilisateur(q: Queryable, uid: string, local?: unknown): Promise<string> {
  const lignes: string[] = [];
  const essai = async (f: () => Promise<void>) => { try { await f(); } catch { /* partie de la fiche omise */ } };

  await essai(async () => {
    const u = (await q.query<any>(`SELECT xp, level, created_at FROM users WHERE id = $1`, [uid]))[0];
    if (u) lignes.push(`- Rang : ${u.level} (${Number(u.xp) || 0} XP), inscrit le ${jourFr(u.created_at)}.`);
    const d = await droitsDe(q, uid);
    lignes.push(d.abonneJusque && d.abonneJusque > Date.now()
      ? `- Formule : abonné jusqu'au ${jourFr(new Date(Math.min(d.abonneJusque, 8.64e15)))}.` : '- Formule : gratuite.');
  });

  await essai(async () => {
    const p = await lireProgression(q, uid);
    const lecons = await q.query<any>(
      `SELECT l.id, l.data->>'titre' AS titre, COALESCE(u.data->>'titre', '') AS unite
       FROM contenus l LEFT JOIN contenus u ON u.collection = 'unites' AND u.id = l.data->>'unite_id' AND u.deleted_at IS NULL
       WHERE l.collection = 'lecons' AND l.publie AND l.deleted_at IS NULL
       ORDER BY COALESCE((u.data->>'ordre')::int, 999), COALESCE((l.data->>'ordre')::int, 999), l.id LIMIT 2000`);
    const finies = p.leconsTerminees ?? {};
    const nbFinies = lecons.filter(l => finies[l.id]).length;
    const recentes = Object.entries(finies).sort((a, b) => (b[1].le ?? '').localeCompare(a[1].le ?? '')).slice(0, 3)
      .map(([id, v]) => `« ${lecons.find(l => l.id === id)?.titre ?? id} » (${Math.round(v.justesse ?? 0)} % de justesse)`);
    const prochaine = lecons.find(l => !finies[l.id]);
    lignes.push(`- Leçons (Onenji) : ${nbFinies} terminée${nbFinies > 1 ? 's' : ''} sur ${lecons.length}${recentes.length ? ` ; dernières : ${recentes.join(', ')}` : ''}.`);
    if (prochaine) lignes.push(`- Prochaine leçon du parcours : « ${prochaine.titre} »${prochaine.unite ? ` (unité « ${prochaine.unite} »)` : ''}.`);
    lignes.push(`- Série : ${p.serie ?? 0} jour${(p.serie ?? 0) > 1 ? 's' : ''} (record ${p.recordSerie ?? 0})${p.derniereActivite ? `, dernière activité le ${jourFr(p.derniereActivite)}` : ''}.`);
    const chapitres = Object.keys(p.lectures ?? {}).length;
    if (chapitres) lignes.push(`- Bibliothèque : ${chapitres} chapitre${chapitres > 1 ? 's' : ''} lu${chapitres > 1 ? 's' : ''}.`);

    const niveaux = Object.entries(p.niveauxGagnes ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const titres = new Map<string, string>((await q.query<any>(
      `SELECT id, data->>'titre' AS titre FROM contenus WHERE collection = 'jeux' AND deleted_at IS NULL`)).map(j => [j.id, j.titre]));
    lignes.push(`- Jeux (Azeva) : ${p.parties ?? 0} partie${(p.parties ?? 0) > 1 ? 's' : ''}, ${p.victoires ?? 0} victoire${(p.victoires ?? 0) > 1 ? 's' : ''}${niveaux.length ? ` ; meilleurs niveaux : ${niveaux.map(([j, n]) => `${titres.get(j) ?? j} niveau ${n}`).join(', ')}` : ''}.`);
    const dernieres = await q.query<any>(`SELECT jeu_id, score, niveau, at FROM scores WHERE user_id = $1 ORDER BY at DESC LIMIT 3`, [uid]);
    if (dernieres.length) lignes.push(`- Dernières parties : ${dernieres.map(s => `${titres.get(s.jeu_id) ?? s.jeu_id} (niveau ${s.niveau}, ${s.score} points, le ${jourFr(s.at)})`).join(', ')}.`);
  });

  const l = nettoyerEtatLocal(local);
  if (l.mots) lignes.push(`- Mes mots : ${l.mots.total} mot${l.mots.total > 1 ? 's' : ''} gardé${l.mots.total > 1 ? 's' : ''}${l.mots.derniers.length ? ` ; derniers : ${l.mots.derniers.join(', ')}` : ''}.`);
  const reglages = (Object.keys(l.prefs) as CleReglageIa[]).map(k => `${REGLAGES_IA[k].libelle.toLowerCase()} ${l.prefs[k]}`);
  if (reglages.length) lignes.push(`- Réglages actuels : ${reglages.join(', ')}.`);
  if (l.ecran) lignes.push(`- Écran ouvert : ${l.ecran}.`);

  if (!lignes.length) return '';
  return `\n\n### Ce que tu sais de ton interlocuteur (son compte, à jour)
Sers-t'en pour l'aider à avancer : encourage-le sur ce qu'il a fait, conseille la suite. Ne récite pas cette fiche, ne la montre pas, et n'en parle qu'à lui.
${lignes.join('\n')}`;
}
