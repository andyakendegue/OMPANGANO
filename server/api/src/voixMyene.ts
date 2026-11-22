/**
 * Myènè parlé → sons → graphie v3 → (traduction en français) : demande de Capp, 22 nov. 2026.
 *   POST /v1/voix/reconnaitre { audio_base64, traduire?: boolean } → { api, ecrit, duree_s, traduction? }
 * L'enregistrement (30 s au plus) passe par le service de voix interne (server/tts, ZIPA) et n'est jamais gardé.
 * Accès : celui du traducteur (avantage « traducteur ») ; et, comme pour tout enregistrement, l'usage de la voix doit être
 * autorisé (pour un mineur : accord de son parent ou représentant légal, noyau/accordVoix.ts).
 * ZIPA n'a jamais entendu d'orungu : l'écrit rendu est une proposition, que l'utilisateur relit avant de traduire ou d'envoyer.
 */
import { voixAutorisee } from '../../../packages/noyau/src/accordVoix.ts';
import { str, type Ctx } from './ctx.ts';
import { traduire, verifierAccesTraducteur } from './traduction.ts';

const MAX_BASE64 = 2_800_000; // ≈ 2 Mo d'audio : largement 30 s en webm ou m4a

/**
 * Sons reconnus par ZIPA (API standard) → écriture v3 (règles de référence v3.3, § 2). Attention : en API standard, j est le son « y »
 * (≠ notation d'Ambouroue lue par graphieDondo, où j vaut « dy ») ; dʒ, ɟ → j ; tʃ → c ; ʃ → sh ; ʒ → jh ; ɲ → ny ; ŋ → ngh (ŋg → ng,
 * ŋk → nk) ; ɛ → ê ; ɔ → ô ; β → v ; ɣ → g ; ɓ, ɗ → b, d ; aspiration, tons, longueur et accent retirés (la graphie v3 ne note pas les tons).
 */
export function ecritDepuisSons(api: string): string {
  let t = api.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ˈˌːˑʰ|‖]/g, '').toLowerCase();
  const paires: [RegExp, string][] = [
    [/t͡ʃ|tʃ|ʧ/g, 'c'], [/d͡ʒ|dʒ|ʤ|ɟ/g, '\u0001'], [/ʃ/g, 'sh'], [/ʒ/g, '\u0001h'], // « dy » protégé : le j de l'API (= y) est remplacé ensuite
    [/ŋ(?=[gɡk])/g, 'n'], [/ŋ/g, 'ngh'], [/ɲ/g, 'ny'], [/j/g, 'y'],
    [/ɛ/g, 'ê'], [/ɔ/g, 'ô'], [/[əɐ]/g, 'a'], [/ɪ/g, 'i'], [/ʊ/g, 'u'],
    [/β/g, 'v'], [/[ɣɡ]/g, 'g'], [/[ɾɹr]/g, 'r'], [/ɓ/g, 'b'], [/ɗ/g, 'd'], [/ɸ/g, 'f'], [/ʋ/g, 'v'], [/x/g, 'k'], [/ʔ/g, ''],
  ];
  for (const [re, v] of paires) t = t.replace(re, v);
  t = t.replace(/\u0001/g, 'j');
  return t.replace(/[^a-zêô' -]/g, '').replace(/\s+/g, ' ').trim().normalize('NFC');
}

export function registerVoixMyene(ctx: Ctx) {
  const { app, db, fail, acteur, env } = ctx;
  app.post('/v1/voix/reconnaitre', { bodyLimit: 4 * 1024 * 1024 }, async (req) => {
    const a = await acteur(req);
    await verifierAccesTraducteur(ctx, a);
    if (!a.isAdmin) {
      const u = (await db.query<any>(`SELECT data FROM users WHERE id = $1`, [a.auth.uid]))[0]?.data ?? {};
      if (!voixAutorisee(u)) fail(403, "La reconnaissance de la voix demande l'autorisation d'usage de la voix et, pour un mineur, l'accord de son parent ou représentant légal.");
    }
    const b = (req.body || {}) as { audio_base64?: string; traduire?: boolean };
    const audio = str(b.audio_base64) ? b.audio_base64 : '';
    if (audio.length < 100) fail(400, 'Enregistrement attendu.');
    if (audio.length > MAX_BASE64) fail(413, 'Enregistrement trop long (30 secondes au plus).');
    const base = (env.TTS_URL || '').replace(/\/+$/, '');
    if (!base) fail(503, "La reconnaissance du myènè n'est pas encore branchée.");
    const r = await fetch(`${base}/reconnaitre`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio_base64: audio }), signal: AbortSignal.timeout(60_000) })
      .catch(() => fail(502, 'Service de reconnaissance injoignable.'));
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) fail(r.status === 400 ? 400 : 502, j.erreur === 'audio trop court' ? 'Enregistrement trop court : parle un peu plus longtemps.' : j.erreur === 'audio illisible' ? 'Enregistrement illisible.' : 'La reconnaissance a échoué.');
    const api = String(j.api ?? '').trim();
    const ecrit = ecritDepuisSons(api);
    if (!ecrit) return { api, ecrit, duree_s: j.duree_s ?? null, vide: true };
    const traduction = b.traduire ? await traduire(ctx, a.auth.uid, ecrit, 'myene-fr') : undefined;
    return { api, ecrit, duree_s: j.duree_s ?? null, ...(traduction ? { traduction } : {}) };
  });
}
