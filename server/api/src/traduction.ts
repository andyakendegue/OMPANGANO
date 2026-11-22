/**
 * Traducteur français ↔ myènè (avantage « traducteur » des formules ; administrateurs et validateurs toujours).
 * Même socle que Kak'Igonjo (grammaire, lexique trouvé, extraits myènè d'abord), consigne de traduction, réponse en JSON.
 * Contrôle après le modèle (plan du traducteur, 1er nov. 2026) : chaque mot myènè doit exister au lexique, sinon la
 * traduction est marquée « à vérifier » avec la liste des mots en cause ; une phrase composée est toujours « à vérifier ».
 *
 *   POST /v1/traduction { texte | api, sens: 'fr-myene' | 'myene-fr' }
 *     - `api` (myène → français) : transcription phonétique, par ex. sortie d'une reconnaissance vocale ; convertie en graphie DONDO.
 *   → { source, traduction, motAMot: [{ myene, fr }], francaisGardes, confiance: 'sur' | 'a_verifier', aVerifier: [], api }
 *     `api` = transcription de la phrase myènè (sans tons) à passer à POST /v1/audio/synthese pour l'entendre.
 */
import { aAvantage } from '../../../packages/noyau/src/formules.ts';
import { apiDepuisGraphie, graphieDondo } from '../../../packages/noyau/src/phonetique.ts';
import { construireSysteme } from './ia.ts';
import { motsNonAttestes } from './lexiqueMyene.ts';
import { profilAcces } from './profil_acces.ts';
import { str, type Ctx } from './ctx.ts';

const MAX_CAR = 1000;
export type Sens = 'fr-myene' | 'myene-fr';

export const consigneTraduction = (sens: Sens) => `

### Tâche : TRADUCTION ${sens === 'fr-myene' ? 'du français vers le myènè' : 'du myènè vers le français'}
Ici tu n'es pas en conversation : tu traduis le texte de l'utilisateur, rien d'autre, avec ta connaissance du myènè et la méthode de composition.
${sens === 'fr-myene'
    ? '- Compose la phrase myènè avec les seuls mots attestés ; une notion sans mot attesté reste en français, entre astérisques (*grève*).'
    : '- Lis le texte myènè (graphie normalisée ; une forme peut être écrite autrement par l\'utilisateur), reconnais chaque mot dans le lexique et la grammaire, puis donne le sens français naturel. Un mot que tu ne reconnais pas : garde-le tel quel et signale-le.'}
- Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, de cette forme :
{"traduction": "…", "mot_a_mot": [{"myene": "…", "fr": "…"}], "francais_gardes": ["…"], "compose": true, "remarque": "…"}
- "compose" vaut true si la phrase myènè n'a pas été trouvée telle quelle dans le lexique ou les documents ; "remarque" : une phrase courte au plus (variante, doute), sans auteur ni page.
- Le myènè s'écrit en graphie v3 (jamais è, é, tch, dj, ñ, ṽ) ; infinitif soudé (gojêna), lieu ou temps séparé (go nkala).
- Dans "mot_a_mot", "fr" donne le sens en 1 à 5 mots, sans explication. Ne réfléchis JAMAIS à voix haute dans le JSON : ni hésitation, ni « vérifions », ni choix entre deux mots. Choisis, puis écris ; un doute va dans "remarque", en une phrase.`;

/**
 * Sens d'un mot du mot à mot, court : le modèle y écrivait parfois son raisonnement (essai du 22 nov. 2026, 1 300 caractères pour « ma mère »).
 * On garde la première proposition (avant parenthèse, point-virgule ou phrase suivante), 60 caractères au plus.
 */
export function sensCourt(fr: string): string {
  const t = fr.split(/\s*[(;]|\.\s|\n/)[0].trim();
  return t.length <= 60 ? t : t.slice(0, 60).replace(/\s+\S*$/, '') + '…';
}

/** Lit la réponse du modèle : JSON éventuellement entouré de texte ou de ```json. */
export function lireJsonTraduction(texte: string): { traduction: string; mot_a_mot: { myene: string; fr: string }[]; francais_gardes: string[]; compose: boolean; remarque: string } | null {
  const m = texte.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    if (!str(j.traduction) || !j.traduction.trim()) return null;
    return {
      traduction: j.traduction.trim().normalize('NFC'),
      mot_a_mot: Array.isArray(j.mot_a_mot) ? j.mot_a_mot.filter((x: any) => x && str(x.myene)).slice(0, 60).map((x: any) => ({ myene: String(x.myene).normalize('NFC'), fr: sensCourt(String(x.fr ?? '')) })) : [],
      francais_gardes: Array.isArray(j.francais_gardes) ? j.francais_gardes.filter(str).slice(0, 30) : [],
      compose: j.compose !== false,
      remarque: str(j.remarque) ? j.remarque.slice(0, 300) : '',
    };
  } catch { return null; }
}

export function registerTraduction({ app, db, fail, acteur, env, ia, embed }: Ctx) {
  app.post('/v1/traduction', async (req) => {
    const a = await acteur(req);
    if (!a.isAdmin && !a.isStaff) {
      const p = await profilAcces(db, a.auth.uid);
      if (!aAvantage({ avantages: p.avantages, role: a.role }, 'traducteur')) fail(402, 'Le traducteur est inclus dans les formules qui le proposent.');
    }
    const b = (req.body || {}) as { texte?: string; api?: string; sens?: string };
    const sens: Sens = b.sens === 'myene-fr' ? 'myene-fr' : b.sens === 'fr-myene' ? 'fr-myene' : fail(400, 'Sens attendu : fr-myene ou myene-fr.');
    const source = (str(b.texte) && b.texte.trim() ? b.texte.trim() : sens === 'myene-fr' && str(b.api) && b.api.trim() ? graphieDondo(b.api) : '').normalize('NFC');
    if (!source) fail(400, 'Texte à traduire attendu.');
    if (source.length > MAX_CAR) fail(400, `${MAX_CAR} caractères au plus.`);

    const { systeme, cfg, socle } = await construireSysteme(db, embed, { message: source, enfant: false, delaiRagMs: 120_000 });
    let rep;
    try { rep = await ia.repondre({ systeme: systeme + consigneTraduction(sens), messages: [{ role: 'user', content: source }], modele: cfg.modele || env.IA_MODELE || '', temperature: 0.2, maxTokens: Math.max(cfg.maxTokens, 900) }); }
    catch { return fail(502, 'Le traducteur ne répond pas pour le moment. Réessaie dans un instant.'); }
    await db.query(`INSERT INTO ia_usage (user_id, conversation_id, modele, jetons_entree, jetons_sortie, jetons_cache, simule, jetons_socle) VALUES ($1,'traduction',$2,$3,$4,$5,$6,$7)`,
      [a.auth.uid, rep.modele, rep.usage.entree, rep.usage.sortie, rep.usage.cache ?? 0, rep.simule, Math.min(socle, rep.usage.entree)]);

    const j = lireJsonTraduction(rep.texte);
    if (!j) return { source, sens, traduction: rep.texte.trim(), motAMot: [], francaisGardes: [], confiance: 'a_verifier', aVerifier: [], remarque: 'Réponse du modèle hors format.', api: null, simule: rep.simule };
    const myene = sens === 'fr-myene' ? j.traduction : source;
    const aVerifier = motsNonAttestes(myene, j.francais_gardes);
    return {
      source, sens, traduction: j.traduction, motAMot: j.mot_a_mot, francaisGardes: j.francais_gardes, remarque: j.remarque,
      confiance: aVerifier.length || (sens === 'fr-myene' && j.compose) ? 'a_verifier' : 'sur', aVerifier, compose: j.compose,
      api: apiDepuisGraphie(myene.replace(/\*[^*]+\*/g, ' ')), simule: rep.simule,
    };
  });
}
