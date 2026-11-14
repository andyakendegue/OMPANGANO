/**
 * Serveur de démonstration : tout en un, sans Docker ni compte externe. PGlite (PostgreSQL en WASM, sauvegardé dans server/.demo-data),
 * SMS, achats et notifications simulés, IA simulée avec RAG, régie interne, contenus d'exemple importés.
 *   cd server && npm run demo        →  http://localhost:3001
 * Connexion dans l'application : n'importe quel numéro (06 12 34 56) et le code 000000. Administrateur : +24100000001.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.ts';
import { createPgliteDb, runMigrations } from './db.ts';
import type { MediaStorage } from './storage.ts';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..', '..', '..');
Object.assign(process.env, {
  SMS_FOURNISSEUR: 'simulation', ACHATS_FOURNISSEUR: 'simulation', PUSH_FOURNISSEUR: 'simulation', NODE_ENV: 'development',
  MODULES_ACTIFS: process.env.MODULES_ACTIFS ?? 'ompangano,onenji,azeva,ontci,nkala', FONCTIONS_ACTIVES: process.env.FONCTIONS_ACTIVES ?? 'publicite,achats,assistantIA',
  ADMIN_TELEPHONES: process.env.ADMIN_TELEPHONES ?? '+24100000001',
});

const memoire = new Map<string, Uint8Array>();
const storage: MediaStorage = {
  presignPut: async p => `http://localhost:${process.env.PORT || 3001}/demo-media/${p}`, presignGet: async p => `http://localhost:${process.env.PORT || 3001}/demo-media/${p}`,
  remove: async p => { memoire.delete(p); }, put: async (p, b) => { memoire.set(p, b); }, exists: async p => memoire.has(p), get: async p => memoire.get(p) ?? null,
};

const db = await createPgliteDb(join(racine, 'server', process.env.DEMO_DATA || '.demo-data'));
await runMigrations(db);

// Contenus d'exemple : importés une seule fois (une collection déjà remplie n'est pas touchée)
const exemples = join(racine, 'contenu', 'exemples');
for (const f of readdirSync(exemples).filter(x => x.endsWith('.json'))) {
  const collection = f.replace('.json', '');
  if ((await db.query<any>(`SELECT 1 FROM contenus WHERE collection = $1 LIMIT 1`, [collection])).length) continue;
  for (const l of JSON.parse(readFileSync(join(exemples, f), 'utf8')) as Record<string, any>[])
    await db.query(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [collection, l.id, JSON.stringify(l), l.publie !== false, l.publie === false ? 'brouillon' : 'publie']);
}
const sem = async (collection: string, id: string, data: Record<string, unknown>) => db.query(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ($1,$2,$3,true,'publie') ON CONFLICT DO NOTHING`, [collection, id, JSON.stringify({ id, publie: true, ...data })]);
await db.query(`INSERT INTO regie_annonceurs (id, nom, contact) VALUES ('demo-an','Commerce exemple','contact@exemple.ga') ON CONFLICT DO NOTHING`);
await db.query(`INSERT INTO regie_campagnes (id, annonceur_id, nom, statut, plafond_jour) VALUES ('demo-ca','demo-an','Campagne d''exemple','active',0) ON CONFLICT DO NOTHING`);
for (const [i, zone] of ['bandeau_accueil', 'annonce_dans_liste', 'annonce_en_tete', 'bandeau_apprendre', 'bandeau_catalogue', 'bandeau_resultats', 'recompense_coeur', 'bandeau_lecteur'].entries())
  await sem('pub_creations', `demo-pub-${i}`, { zone, campagne_id: 'demo-ca', annonceur: 'Commerce exemple', titre: 'Votre commerce ici : parlez-en à la régie Nkala', texte_alt: 'Publicité d\'exemple', format: zone === 'annonce_dans_liste' ? 'natif' : 'bandeau', cta: 'Découvrir' });
await sem('produits', 'abo-mensuel', { titre: 'Nkala Plus (mois)', type: 'abonnement', prix_fcfa: 1500, periode: 'mois', donne_acces: ['tout'] });
await sem('produits', 'abo-annuel', { titre: 'Nkala Plus (an)', type: 'abonnement', prix_fcfa: 15000, periode: 'an', donne_acces: ['tout'] });
await sem('produits', 'cours-hors-bord', { titre: 'Cours : entretien d\'un hors-bord', type: 'achat', prix_fcfa: 3000, prix_nkr: 1400, periode: 'unique', donne_acces: ['demo-hors-bord'] });
await sem('produits', 'pack-nkr-500', { titre: '500 Nkorouna', type: 'nkorouna', prix_fcfa: 1000, nkorouna: 500 });
await sem('produits', 'pack-nkr-1500', { titre: '1 500 Nkorouna', type: 'nkorouna', prix_fcfa: 2500, nkorouna: 1500 });
await db.query(`INSERT INTO ia_documents (id, titre, source, texte) VALUES ('demo-doc','Salutations','[LEC] Bonjour','Mbolo se dit à une personne pour dire bonjour. Mbôluani se dit à plusies personnes. Akéwa signifie merci. Kôkôlô signifie s''il te plaît.') ON CONFLICT DO NOTHING`);
const { indexerDocument, configIa, fournisseurEmbeddingParDefaut } = await import('./ia.ts');
await indexerDocument(db, fournisseurEmbeddingParDefaut(), 'demo-doc', await configIa(db));

// Compte administrateur de démonstration déjà inscrit (sans passer par le long formulaire de filiation)
await db.query(`INSERT INTO users (id, role, data) VALUES ('tel_24100000001','user',$1) ON CONFLICT (id) DO NOTHING`, [JSON.stringify({ displayName: 'Admin démo', fullName: 'Admin démo', birthDate: '1985-01-01', registrationCompleted: true, termsAccepted: true, dataUsageAccepted: true, phone: '+24100000001', tribe: 'Ôrungu' })]);

const verify = async () => { throw new Error('Firebase désactivé en démonstration : connexion par SMS'); };
const app = await buildApp({ db, verify, storage, corsOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8081', 'http://localhost:19006', ...(process.env.DEMO_CORS ? process.env.DEMO_CORS.split(',') : [])], logger: false, sessionSecret: 'demo-secret-nkala-0123456789abcdef' });
// Stockage de démonstration en mémoire : reçoit les envois « présignés » (PUT) et sert les fichiers (GET), CORS ouvert.
const types = new Map<string, string>();
app.addContentTypeParser(/^(image|video|audio)\/.*/, { parseAs: 'buffer', bodyLimit: 60 * 1024 * 1024 }, (_req, corps, fait) => fait(null, corps));
app.options('/demo-media/*', async (_req, reply) => reply.header('Access-Control-Allow-Origin', '*').header('Access-Control-Allow-Methods', 'GET,PUT,HEAD').header('Access-Control-Allow-Headers', '*').status(204).send());
app.put('/demo-media/*', async (req, reply) => {
  const p = (req.params as { '*': string })['*'];
  memoire.set(p, new Uint8Array(req.body as Buffer)); types.set(p, String(req.headers['content-type'] || 'application/octet-stream'));
  return reply.header('Access-Control-Allow-Origin', '*').status(200).send();
});
app.get('/demo-media/*', async (req, reply) => {
  const p = (req.params as { '*': string })['*'];
  const b = memoire.get(p);
  reply.header('Access-Control-Allow-Origin', '*');
  if (!b) return reply.status(404).send();
  return reply.header('Content-Type', types.get(p) || 'application/octet-stream').send(Buffer.from(b));
});
await app.listen({ port: Number(process.env.PORT || 3001), host: '0.0.0.0' });
console.log('\n  Nkala — API de démonstration : http://localhost:' + (process.env.PORT || 3001) + '\n  Connexion : numéro libre + code 000000 · administrateur : +24100000001\n');
