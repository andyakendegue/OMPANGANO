/**
 * Web radio (AzuraCast sur un pod RunPod). L'application et l'API ne parlent jamais au pod directement : elles passent par le proxy
 * « azuracast-proxy » du serveur (server/proxies/azuracast-proxy).
 *   AZURACAST_URL      adresse publique du proxy (flux et « à l'antenne »), ex. https://radio.essaka.engineering
 *   AZURACAST_API_URL  adresse interne du proxy pour l'API d'administration (défaut : AZURACAST_URL)
 *   AZURACAST_API_KEY  clé d'API AzuraCast (Profil > Clés d'API) : facultative, nécessaire seulement pour les actions d'administration
 * Sans AZURACAST_URL : simulation (une station de démonstration, sans flux).
 */
import { journaliser, type Ctx } from './ctx.ts';

export interface StationEnDirect { id: string; nom: string; flux: string; hls: string | null; titre: string; artiste: string; pochette: string | null; auditeurs: number; enDirect: boolean }

const SIMULEE: StationEnDirect[] = [{ id: 'demo', nom: 'Radio Nkala (démonstration)', flux: '', hls: null, titre: 'Mbolo', artiste: 'Ozangué', pochette: null, auditeurs: 0, enDirect: false }];

export function clientAzuracast(env = process.env) {
  const publique = (env.AZURACAST_URL || '').replace(/\/+$/, '');
  const interne = (env.AZURACAST_API_URL || publique).replace(/\/+$/, '');
  const simule = !publique;
  const entetes = (): Record<string, string> => (env.AZURACAST_API_KEY ? { 'X-API-Key': env.AZURACAST_API_KEY } : {});
  const absolu = (u: string | null | undefined) => (!u ? null : /^https?:/.test(u) ? u : publique + (u.startsWith('/') ? '' : '/') + u);
  async function get<T>(base: string, chemin: string): Promise<T> {
    const r = await fetch(base + chemin, { headers: { Accept: 'application/json', ...entetes() }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`AzuraCast ${chemin} : HTTP ${r.status}`);
    return r.json() as Promise<T>;
  }
  return {
    simule, publique,
    /** Stations avec le titre en cours (API publique, sans clé). */
    async aLAntenne(): Promise<StationEnDirect[]> {
      if (simule) return SIMULEE;
      const l = await get<any[]>(publique, '/api/nowplaying');
      return l.map(n => ({
        id: String(n.station?.shortcode ?? n.station?.id), nom: n.station?.name ?? '', flux: absolu(n.station?.listen_url) ?? '', hls: n.station?.hls_enabled ? absolu(n.station?.hls_url) : null,
        titre: n.now_playing?.song?.title ?? '', artiste: n.now_playing?.song?.artist ?? '', pochette: absolu(n.now_playing?.song?.art), auditeurs: Number(n.listeners?.current ?? 0), enDirect: !!n.live?.is_live
      }));
    },
    async ping() { if (simule) return { simule, ok: true as boolean, stations: 1 }; try { return { simule, ok: true as boolean, stations: (await get<any[]>(publique, '/api/stations')).length }; } catch (e) { return { simule, ok: false as boolean, stations: 0, erreur: (e as Error).message }; } },
    /** Version et état du serveur (clé d'API requise). */
    async etatServeur() { if (simule || !env.AZURACAST_API_KEY) return null; try { return await get<any>(interne, '/api/admin/server/stats'); } catch { return null; } }
  };
}

export function registerRadio(ctx: Ctx) {
  const { app, db, fail, acteur, env } = ctx;
  const az = clientAzuracast(env);
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  let cache: { t: number; v: StationEnDirect[] } | null = null;

  // « À l'antenne » : mis en cache 15 s pour ne pas interroger le pod à chaque appel
  app.get('/v1/radio/direct', async () => {
    if (cache && Date.now() - cache.t < 15_000) return { stations: cache.v, simule: az.simule };
    try { const v = await az.aLAntenne(); cache = { t: Date.now(), v }; return { stations: v, simule: az.simule }; }
    catch { return { stations: cache?.v ?? [], simule: az.simule, indisponible: true }; }
  });

  app.get('/v1/admin/radio/etat', async (req) => { await admin(req); return { url: az.publique || null, ...(await az.ping()), serveur: await az.etatServeur(), station: await az.aLAntenne().catch(() => []) }; });

  /** Crée ou met à jour une ligne de la collection « radios » par station AzuraCast (nom et flux) ; programme, image et accès restent ceux saisis. */
  app.post('/v1/admin/radio/synchroniser', async (req) => {
    const a = await admin(req);
    if (az.simule) return fail(409, 'AZURACAST_URL n\'est pas renseigné : rien à synchroniser.');
    let stations: StationEnDirect[];
    try { stations = await az.aLAntenne(); } catch (e) { return fail(502, (e as Error).message); }
    let crees = 0, maj = 0;
    for (const s of stations) {
      const id = 'az_' + s.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
      const existe = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'radios' AND id = $1`, [id]))[0];
      const data = { ...(existe?.data ?? {}), id, nom: existe?.data?.nom || s.nom, flux_url: s.hls || s.flux, flux_mp3: s.flux, azuracast: s.id, publie: existe?.data?.publie ?? true };
      await db.query(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ('radios', $1, $2::jsonb, $3, 'publie')
        ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = clock_timestamp()`, [id, JSON.stringify(data), data.publie !== false]);
      existe ? maj++ : crees++;
    }
    await journaliser(db, a.auth.uid, 'radio_synchronisee', undefined, { crees, maj });
    return { crees, maj };
  });
}
