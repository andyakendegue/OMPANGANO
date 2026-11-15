// Reversements, masterclass et vidéos en streaming (décision de Capp du 15 nov. 2026 ; audit Apprendre §18).
// TAUX FICTIFS : les taux réels des contrats sont confidentiels et ne figurent jamais dans le dépôt (vérification séparée, hors dépôt).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import {
  appliquerSeuil, calculerReversements, partApplicationOuverte, poidsContributeurs, revenusNets, trimestreDe, validerParametresReversements,
  PARAMETRES_REVERSEMENTS_VIDES, type EntreesTrimestre, type ParametresReversements,
} from '../../../packages/noyau/src/reversements.ts';
import { prixMasterclass, fourchetteOuverte } from '../../../packages/noyau/src/coursDistance.ts';
import { peutRegarderVideo } from '../../../packages/noyau/src/formules.ts';

const FICTIFS: ParametresReversements = {
  ...PARAMETRES_REVERSEMENTS_VIDES,
  contributeur: { taux_pub: 0.1, taux_abonnements: 0.03, taux_application: 0.04, taux_exceptionnel: 0.2, part_apport_defaut: 0.5, modules: ['onenji'] },
  coefficients_zones: { z: 0.4 }, formules_modules: { f: ['onenji', 'igolani'] }, modules_video: ['igolani'],
  createurs: { taux_fonds: 0.5, max_passages_par_chapitre: 2 }, professeurs: { taux: 0.5 },
  associations: { taux_enveloppe: 0.1, plafond_frais: 0.2, part_membres: 0.6, part_association: 0.4, cle_ia_formules: { f: 0.25 }, ponderations_uc: {} },
};
const vide = (t = '2027-T2'): EntreesTrimestre => ({ trimestre: t, paiements: [], temps: [], minutes: [], pub: [], ia: { frais_infra: 0, usage: [], uc: [] }, membres: [], operations: [], beneficiaires: [] });

test('moteur (taux fictifs) : revenus nets, part vidéo, fonds des créateurs, contributeur spécial, exceptionnel, seuils', () => {
  assert.equal(revenusNets({ encaisse: 10_000, frais: 200, commission: 300, taxe: 100, rembourse: 0 }), 9400);
  assert.equal(revenusNets({ encaisse: 1000, rembourse: 5000 }), 0, 'jamais négatif');
  const e: EntreesTrimestre = {
    ...vide(),
    paiements: [{ id: 'a', categorie: 'abonnement', plan_id: 'f', encaisse: 100_000 }, { id: 'b', categorie: 'autre', encaisse: 50_000 }],
    temps: [{ plan_id: 'f', module: 'igolani', secondes: 300 }, { plan_id: 'f', module: 'onenji', secondes: 700 }],
    minutes: [{ createur_id: 'c1', secondes: 600 }, { createur_id: 'c2', secondes: 1800 }],
    pub: [{ zone: 'z', montant: 20_000 }, { zone: 'autre', montant: 99_999 }],
    operations: [{ id: 'op', montant: 30_000, couts: 10_000, part_apport: null }],
    beneficiaires: [{ id: 'cs', type: 'contributeur_special', date_pv: '2026-11-20' }, { id: 'c1', type: 'createur' }, { id: 'c2', type: 'createur' }],
  };
  const r = calculerReversements(e, FICTIFS);
  const releve = (id: string) => r.releves.find(x => x.beneficiaire_id === id)!;
  // part vidéo = 100 000 × 30 % = 30 000 ; fonds = 15 000 ; c1 = 1/4, c2 = 3/4
  assert.equal(r.totaux.fonds_createurs, 15_000);
  assert.deepEqual([releve('c1').brut, releve('c2').brut], [3750, 11_250]);
  const cs = releve('cs');
  const part = (code: string) => cs.parts.find(x => x.code === code)!.montant;
  assert.equal(part('publicite'), 800, '20 000 × 0,4 × 10 % ; zone sans coefficient : 0');
  assert.equal(part('abonnements'), 2550, '(100 000 − 15 000 reversés aux créateurs) × 3 %');
  assert.equal(part('application'), 5400, '(150 000 − 15 000) × 4 %');
  assert.equal(part('exceptionnel'), 2000, '(30 000 − 10 000) × 20 % × part par défaut 50 %');
  // procès-verbal : la part « application » commence au trimestre qui suit
  assert.equal(partApplicationOuverte('2027-T1', '2026-11-20'), true);
  assert.equal(partApplicationOuverte('2026-T4', '2026-11-20'), false);
  assert.equal(partApplicationOuverte('2027-T1', null), false);
  // seuil, report, retenue ; solde versé au quatrième trimestre même sous le seuil
  assert.deepEqual(appliquerSeuil(800, { seuil_fcfa: 1000 }, '2027-T2'), { report_entrant: 0, retenue: 0, a_payer: 0, report_sortant: 800 });
  assert.deepEqual(appliquerSeuil(800, { seuil_fcfa: 1000, report_entrant: 300, retenue_pct: 10 }, '2027-T2'), { report_entrant: 300, retenue: 110, a_payer: 990, report_sortant: 0 });
  assert.equal(appliquerSeuil(800, { seuil_fcfa: 1000 }, '2027-T4').a_payer, 800);
});

test('moteur (taux fictifs) : masterclass, associations au poids d\'utilisation, paramètres validés', () => {
  const e: EntreesTrimestre = {
    ...vide(),
    paiements: [{ id: 'm1', categorie: 'masterclass', hote_id: 'prof', encaisse: 8000, frais: 160 }, { id: 'm2', categorie: 'masterclass', hote_id: 'prof', encaisse: 8000, annule: true },
      { id: 'ia', categorie: 'ia', encaisse: 40_000 }, { id: 'ab', categorie: 'abonnement', plan_id: 'f', encaisse: 80_000 }],
    ia: { frais_infra: 50_000, usage: [{ modele: 'm', quantite: 300 }, { modele: 'n', quantite: 100 }], uc: [{ modele: 'm', user_id: 'u1', uc: 1 }, { modele: 'm', user_id: 'u2', uc: 3 }, { modele: 'n', user_id: 'u1', uc: 1 }] },
    membres: [{ association_id: 'as', user_id: 'u1' }],
    beneficiaires: [{ id: 'p', type: 'professeur', user_id: 'prof' }, { id: 'as', type: 'association' }],
  };
  const r = calculerReversements(e, FICTIFS);
  assert.equal(r.releves.find(x => x.beneficiaire_id === 'p')!.brut, 3920, '(8000 − 160) × 50 % ; masterclass annulée : rien');
  // poids : u1 = (300 × 1/4 + 100 × 1) / 400 = 0,4375
  assert.equal(poidsContributeurs(e.ia).u1, 0.4375);
  // revenus IA = 40 000 + 80 000 × 25 % = 60 000 ; frais plafonnés à 20 % = 12 000 ; enveloppe = 4 800 ; association = 2 100
  assert.equal(r.totaux.enveloppe_ia, 4800);
  assert.equal(r.releves.find(x => x.beneficiaire_id === 'as')!.brut, 2100);
  assert.equal(validerParametresReversements({ ...FICTIFS, professeurs: { taux: 1.5 } }), null, 'taux au-delà de 1 refusé');
  assert.ok(validerParametresReversements(FICTIFS));
});

test('vidéos en streaming et prix des masterclass (règles pures)', () => {
  assert.deepEqual(peutRegarderVideo('abonnement', { igolani: false }), { ok: false, motif: 'abonnement_requis' });
  assert.deepEqual(peutRegarderVideo('abonnement', { igolani: true }), { ok: true, avecPub: false });
  assert.deepEqual(peutRegarderVideo('gratuit_avec_pub', {}), { ok: true, avecPub: true });
  assert.equal(fourchetteOuverte({ prix_min_fcfa: 0, prix_max_fcfa: 0 }), false);
  const t = { prix_heure_fcfa: 6000, minimum_fcfa: 1000, prix_min_fcfa: 2000, prix_max_fcfa: 9000 };
  assert.deepEqual(prixMasterclass(t, 60, 7500), { prix: 7500, choisi: true });
  assert.deepEqual(prixMasterclass(t, 60, 12_000), { prix: 6000, choisi: false }, 'hors fourchette : tarif générique');
  assert.deepEqual(prixMasterclass({ ...t, prix_max_fcfa: 0 }, 30, 7500), { prix: 3000, choisi: false }, 'fourchette fermée');
});

// ---------------------------------------------------------------- parcours complet dans l'API
let db: Db, app: FastifyInstance;
const storage = { presignPut: async () => '', presignGet: async () => '', remove: async () => {}, put: async () => {}, exists: async () => false } as unknown as MediaStorage;
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string, o: { email?: string; verified?: boolean } = {}) => Buffer.from(JSON.stringify({
  iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: o.email, email_verified: o.verified ?? false, firebase: { sign_in_provider: 'password' } })).toString('base64url');
const ADMIN = tok('capp', { email: 'andymigoumbi@gmail.com', verified: true });
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json };
}
async function user(uid: string) { const t = tok(uid, { email: `${uid}@x.com` }); await call('GET', '/v1/me', t); await call('PATCH', '/v1/me', t, { displayName: uid, birthDate: '1990-01-01' }); return t; }

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  Object.assign(process.env, { MODULES_ACTIFS: 'ompangano,onenji,azeva,ontci,nkala', FONCTIONS_ACTIVES: 'achats' });
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' } as any);
});
after(async () => { await app.close(); await db.close(); delete process.env.MODULES_ACTIFS; delete process.env.FONCTIONS_ACTIVES; });

test('API : masterclass au prix choisi, annulation tracée, calcul validé et scellé, export, relevés personnels, rectificatif', async () => {
  const prof = await user('prof1'), eleve = await user('eleve1');
  // fourchette des masterclass et professeur
  assert.equal((await call('PUT', '/v1/admin/parametres/cours_distance', ADMIN, { valeur: { prix_heure_fcfa: 6000, minimum_fcfa: 1000, plans_inclus: [], prix_min_fcfa: 2000, prix_max_fcfa: 9000 } })).status, 200);
  await call('POST', '/v1/admin/professeurs', ADMIN, { userId: 'prof1' });
  const debut = new Date(Date.now() + 86_400_000).toISOString();
  assert.equal((await call('POST', '/v1/appels/planning', prof, { titre: 'Phonétique', debut, dureeMin: 60, prixFcfa: 12_000 })).status, 400, 'hors fourchette');
  const mc = await call('POST', '/v1/appels/planning', prof, { titre: 'Phonétique', debut, dureeMin: 60, prixFcfa: 7000 });
  assert.equal(mc.status, 201, JSON.stringify(mc.body)); assert.equal(mc.body.prixFcfa, 7000);
  const annulee = await call('POST', '/v1/appels/planning', prof, { titre: 'Annulée', debut, dureeMin: 30 });
  assert.equal(annulee.body.prixFcfa, 3000, 'sans prix choisi : tarif générique');
  // deux places payées (une par cours), puis le professeur annule le second : statut gardé, place à rembourser
  for (const [i, code] of [mc.body.code, annulee.body.code].entries())
    await db.query(`INSERT INTO paiements (id, reference, user_id, produit_id, montant_fcfa, operateur, telephone, mode, statut, frais_fcfa, confirme_at, expire_at) VALUES ($1,$2,'eleve1',$3,$4,'airtel','+24106000000','simulation','confirme',$5,clock_timestamp(),clock_timestamp() + interval '1 day')`,
      [`pay_t${i}`, `NK-T${i}`, `seance:${code}`, i ? 3000 : 7000, i ? 60 : 140]);
  await db.query(`UPDATE cours_planifies SET inscrits = array_append(inscrits, 'eleve1') WHERE code = $1`, [annulee.body.code]);
  assert.equal((await call('POST', `/v1/appels/planning/${annulee.body.code}/desinscrire`, ADMIN)).status, 204);
  assert.equal((await db.query<any>(`SELECT statut FROM cours_planifies WHERE code = $1`, [annulee.body.code]))[0].statut, 'annule');
  assert.equal((await db.query<any>(`SELECT rembourse_fcfa FROM paiements WHERE id = 'pay_t1'`))[0].rembourse_fcfa, 3000);
  assert.equal((await call('GET', `/v1/appels/planning/${annulee.body.code}`, eleve)).status, 404, 'cours annulé : plus inscriptible');

  // bénéficiaires, paramètres (fictifs), recettes publicitaires
  const t = trimestreDe(new Date());
  assert.equal((await call('POST', '/v1/admin/reversements/calculs', ADMIN, { trimestre: t })).status, 409, 'sans paramètres : refus');
  assert.equal((await call('POST', '/v1/admin/reversements/parametres', ADMIN, { valeurs: { ...FICTIFS, professeurs: { taux: 2 } }, dateEffet: '2026-01-01' })).status, 400);
  assert.equal((await call('POST', '/v1/admin/reversements/parametres', ADMIN, { valeurs: FICTIFS, dateEffet: '2026-01-01' })).status, 201);
  const bp = (await call('POST', '/v1/admin/reversements/beneficiaires', ADMIN, { type: 'professeur', nom: 'Professeur', user_id: 'prof1' })).body.id;
  const bc = (await call('POST', '/v1/admin/reversements/beneficiaires', ADMIN, { type: 'contributeur_special', nom: 'Linguiste', user_id: 'linguiste' })).body.id;
  assert.equal((await call('POST', '/v1/admin/reversements/recettes-pub', ADMIN, { lignes: [{ jour: new Date().toISOString().slice(0, 10), zone: 'z', montant_fcfa: 50_000 }] })).body.lignes, 1);
  assert.equal((await call('GET', '/v1/admin/reversements/beneficiaires', eleve)).status, 403, 'administrateurs seulement');

  // calcul : professeur = (7000 − 140) × 50 % = 3430 ; masterclass annulée : rien ; contributeur : pub 50 000 × 0,4 × 10 % = 2000
  const calc = await call('POST', '/v1/admin/reversements/calculs', ADMIN, { trimestre: t });
  assert.equal(calc.status, 201, JSON.stringify(calc.body));
  const detail = (await call('GET', `/v1/admin/reversements/calculs/${calc.body.id}`, ADMIN)).body;
  const de = (b: string) => detail.releves.find((r: any) => r.beneficiaire_id === b);
  assert.equal(Number(de(bp).a_payer_fcfa), 3430);
  assert.equal(Number(de(bc).detail.find((p: any) => p.code === 'publicite').montant), 2000);
  assert.equal((await call('GET', '/v1/reversements/mes-releves', prof)).body.length, 0, 'pas visible avant validation');
  // validation scellée, export, relevé personnel, paiement
  const v = await call('POST', `/v1/admin/reversements/calculs/${calc.body.id}/valider`, ADMIN);
  assert.equal(v.status, 200); assert.match(v.body.hash, /^[0-9a-f]{64}$/);
  assert.equal((await call('POST', `/v1/admin/reversements/calculs/${calc.body.id}/valider`, ADMIN)).status, 409, 'déjà scellé');
  const csv = await app.inject({ method: 'GET', url: `/v1/admin/reversements/calculs/${calc.body.id}/export.csv`, headers: { authorization: `Bearer ${ADMIN}` } });
  assert.equal(csv.statusCode, 200); assert.match(csv.body, /Professeur;professeur;Masterclass/);
  const mes = (await call('GET', '/v1/reversements/mes-releves', prof)).body;
  assert.equal(mes.length, 1); assert.equal(Number(mes[0].a_payer_fcfa), 3430);
  assert.equal((await call('POST', `/v1/admin/reversements/releves/${mes[0].id}/payer`, ADMIN, { reference: 'MM-123' })).status, 200);
  // un trimestre validé ne se recalcule que par un rectificatif, qui remplace l'ancien à sa validation
  assert.equal((await call('POST', '/v1/admin/reversements/calculs', ADMIN, { trimestre: t })).status, 409);
  const rect = await call('POST', '/v1/admin/reversements/calculs', ADMIN, { trimestre: t, rectifie: calc.body.id });
  assert.equal(rect.status, 201);
  const v2 = await call('POST', `/v1/admin/reversements/calculs/${rect.body.id}/valider`, ADMIN);
  assert.equal(v2.status, 200); assert.notEqual(v2.body.hash, v.body.hash);
  assert.equal((await db.query<any>(`SELECT statut FROM reversements_calculs WHERE id = $1`, [calc.body.id]))[0].statut, 'remplace');
  assert.equal((await db.query<any>(`SELECT hash_precedent FROM reversements_calculs WHERE id = $1`, [rect.body.id]))[0].hash_precedent, v.body.hash, 'chaîne d\'empreintes');
});
