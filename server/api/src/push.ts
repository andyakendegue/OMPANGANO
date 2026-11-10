/**
 * Notifications poussées : enregistrement des jetons Expo, envoi depuis la console (tous, comptes précis, ethnie, rôle) et historique.
 * PUSH_FOURNISSEUR=expo|simulation (auto : expo ; l'API Expo Push n'exige pas de clé, EXPO_ACCESS_TOKEN la sécurise si activé). Simulation : rien n'est envoyé.
 */
import type { Ctx } from './ctx.ts';
import { journaliser, str } from './ctx.ts';

const URL_EXPO = 'https://exp.host/--/api/v2/push/send';
export const jetonExpoValide = (j: unknown): j is string => str(j) && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/.test(j);

export function registerPush({ app, db, fail, acteur, env }: Ctx) {
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  const simule = () => env.PUSH_FOURNISSEUR === 'simulation';

  app.post('/v1/push/jeton', async (req, reply) => {
    const a = await acteur(req);
    const { jeton, plateforme } = (req.body || {}) as { jeton?: string; plateforme?: string };
    if (!jetonExpoValide(jeton)) return fail(400, 'Jeton de notification invalide.');
    await db.query(`INSERT INTO push_jetons (jeton, user_id, plateforme) VALUES ($1,$2,$3) ON CONFLICT (jeton) DO UPDATE SET user_id = EXCLUDED.user_id, plateforme = EXCLUDED.plateforme`, [jeton, a.auth.uid, plateforme?.slice(0, 20) ?? null]);
    return reply.status(204).send();
  });
  app.delete('/v1/push/jeton', async (req, reply) => { const a = await acteur(req); await db.query(`DELETE FROM push_jetons WHERE user_id = $1`, [a.auth.uid]); return reply.status(204).send(); });

  app.post('/v1/admin/push/envoyer', async (req) => {
    const a = await admin(req);
    const { titre, corps, cible } = (req.body || {}) as { titre?: string; corps?: string; cible?: { tous?: boolean; userIds?: string[]; tribu?: string; role?: string } };
    if (!str(titre) || !str(corps) || !titre.trim() || !corps.trim() || titre.length > 80 || corps.length > 300) return fail(400, 'Titre (80 caractères) et message (300 caractères) attendus.');
    const c = cible ?? { tous: true };
    const params: unknown[] = []; let filtre = 'TRUE';
    if (c.userIds?.length) { params.push(c.userIds.filter(str).slice(0, 5000)); filtre = `j.user_id = ANY($${params.length}::text[])`; }
    else if (c.tribu) { params.push(c.tribu); filtre = `u.data->>'tribe' = $${params.length}`; }
    else if (c.role) { params.push(c.role); filtre = `u.role = $${params.length}`; }
    else if (!c.tous) return fail(400, 'Cible attendue.');
    const jetons = (await db.query<any>(`SELECT j.jeton FROM push_jetons j LEFT JOIN users u ON u.id = j.user_id WHERE ${filtre} LIMIT 20000`, params)).map(r => r.jeton as string);
    let ok = 0; const invalides: string[] = [];
    if (!simule()) {
      for (let i = 0; i < jetons.length; i += 100) {
        const lot = jetons.slice(i, i + 100);
        try {
          const r = await fetch(URL_EXPO, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify(lot.map(to => ({ to, title: titre, body: corps, sound: 'default', channelId: 'defaut' }))) });
          const j: any = await r.json();
          (j.data ?? []).forEach((t: any, k: number) => { if (t.status === 'ok') ok++; else if (t.details?.error === 'DeviceNotRegistered') invalides.push(lot[k]); });
        } catch { /* lot perdu : compté comme non envoyé */ }
      }
      if (invalides.length) await db.query(`DELETE FROM push_jetons WHERE jeton = ANY($1::text[])`, [invalides]);
    } else ok = jetons.length;
    await db.query(`INSERT INTO push_envois (titre, corps, cible, nb, ok, simule, par) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [titre, corps, JSON.stringify(c), jetons.length, ok, simule(), a.auth.uid]);
    await journaliser(db, a.auth.uid, 'push_envoi', undefined, { nb: jetons.length, ok });
    return { destinataires: jetons.length, envoyes: ok, retires: invalides.length, simule: simule() };
  });
  app.get('/v1/admin/push/historique', async (req) => { await admin(req); return db.query(`SELECT id, titre, corps, cible, nb, ok, simule, at FROM push_envois ORDER BY at DESC LIMIT 100`); });
  app.get('/v1/admin/push/etat', async (req) => { await admin(req); return { fournisseur: simule() ? 'simulation' : 'expo', jetons: Number((await db.query<any>(`SELECT count(*) AS n FROM push_jetons`))[0].n) }; });
}
