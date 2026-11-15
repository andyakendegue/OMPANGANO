/**
 * Synthèse audio du myènè (avantage « Outils de synthèse audio » des formules, `synthese_audio` ; administrateurs et validateurs toujours).
 * L'API Nkala relaie vers le service de synthèse interne (server/tts, écoute sur la passerelle Docker) :
 *   POST /v1/audio/synthese { api?: "[m̩bólò]", texte?: "Mbolo", voix?, vitesse?, tons? } → audio/wav
 *   - `api` : transcription phonétique avec tons (prioritaire : c'est elle qui dit le mot juste) ;
 *   - `texte` : graphie DONDO, convertie sans tons (apiDepuisGraphie) quand la transcription manque.
 *   POST /v1/audio/phonemes  → ce que le modèle lira (contrôle, sans calcul audio)
 *   GET  /v1/admin/audio/etat → état du service et voix disponibles
 * Variable : TTS_URL (http://172.17.0.1:8700 sur le serveur). Sans elle : 503, rien d'autre ne casse.
 */
import { createHash } from 'node:crypto';
import { aAvantage } from '../../../packages/noyau/src/formules.ts';
import { apiDepuisGraphie } from '../../../packages/noyau/src/phonetique.ts';
import { profilAcces } from './profil_acces.ts';
import { str, type Ctx } from './ctx.ts';

const MAX_CAR = 600;
/** Petit cache en mémoire : un même mot demandé plusieurs fois n'est calculé qu'une fois. */
const cache = new Map<string, Buffer>();
const CACHE_MAX = 300;

export function registerSynthese({ app, db, fail, acteur, env }: Ctx) {
  const url = () => (env.TTS_URL || '').replace(/\/+$/, '');

  const autorise = async (req: any) => {
    const a = await acteur(req);
    if (a.isAdmin || a.isStaff) return a;
    const p = await profilAcces(db, a.auth.uid);
    if (!aAvantage({ avantages: p.avantages, role: a.role }, 'synthese_audio')) fail(402, 'La synthèse audio est incluse dans les formules qui la proposent.');
    return a;
  };

  const demande = (b: any) => {
    const api = str(b?.api) && b.api.trim() ? b.api.trim() : str(b?.texte) && b.texte.trim() ? apiDepuisGraphie(b.texte) : '';
    if (!api) fail(400, 'Transcription (api) ou texte attendu.');
    if (api.length > MAX_CAR) fail(400, `${MAX_CAR} caractères au plus.`);
    return { api, voix: str(b?.voix) ? b.voix.slice(0, 40) : undefined, vitesse: typeof b?.vitesse === 'number' ? b.vitesse : undefined, tons: ['accent', 'fleches', 'aucun'].includes(b?.tons) ? b.tons : undefined };
  };

  const appeler = async (chemin: string, corps: unknown) => {
    if (!url()) fail(503, 'Le service de synthèse vocale n\'est pas encore branché.');
    const r = await fetch(`${url()}${chemin}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps), signal: AbortSignal.timeout(60_000) })
      .catch(() => fail(502, 'Service de synthèse vocale injoignable.'));
    if (!r.ok) fail(r.status === 400 ? 400 : 502, ((await r.json().catch(() => ({}))) as any).erreur || `synthèse ${r.status}`);
    return r;
  };

  app.post('/v1/audio/synthese', async (req, reply) => {
    await autorise(req);
    const d = demande(req.body);
    const cle = createHash('sha256').update(JSON.stringify(d)).digest('hex');
    let wav = cache.get(cle);
    if (!wav) {
      wav = Buffer.from(await (await appeler('/synthese', d)).arrayBuffer());
      cache.set(cle, wav);
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
    }
    reply.header('Content-Type', 'audio/wav').header('Cache-Control', 'private, max-age=86400').header('X-Transcription', encodeURIComponent(d.api));
    return reply.send(wav);
  });

  app.post('/v1/audio/phonemes', async (req) => {
    await autorise(req);
    const d = demande(req.body);
    return { api: d.api, ...(await (await appeler('/phonemes', d)).json() as object) };
  });

  app.get('/v1/admin/audio/etat', async (req) => {
    const a = await acteur(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    if (!url()) return { branche: false };
    try { return { branche: true, ...(await (await fetch(`${url()}/sante`, { signal: AbortSignal.timeout(5000) })).json() as object) }; }
    catch { return { branche: true, joignable: false }; }
  });
}
