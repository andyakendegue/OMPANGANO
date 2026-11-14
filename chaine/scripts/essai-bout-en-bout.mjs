#!/usr/bin/env node
/**
 * Essai complet sur un nœud EVM local (hardhat node, même EVM que Besu en « london ») :
 * déploiement, agrément du relais, certification d'un fichier, ancrage signé comme le fait Nkala, refus d'une mauvaise
 * signature, idempotence, lecture publique. Ne touche ni aux clés de reseau/ ni à un réseau réel.
 *   node scripts/essai-bout-en-bout.mjs [--rpc http://127.0.0.1:8545]   (sinon lance son propre nœud sur le port 8555)
 */
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { Contract, ContractFactory, JsonRpcProvider, Wallet } from 'ethers';
import { creerRelais, signer } from '../relais/relais.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--rpc');
let rpc = i > 0 ? process.argv[i + 1] : null, noeud = null;
if (!rpc) {
  rpc = 'http://127.0.0.1:8555';
  noeud = spawn(join(racine, 'node_modules/.bin/hardhat'), ['node', '--port', '8555'], { cwd: racine, stdio: 'ignore' });
}
const fournisseur = new JsonRpcProvider(rpc, undefined, { staticNetwork: true, pollingInterval: 200, cacheTimeout: -1 });
for (let k = 0; ; k++) { try { await fournisseur.getBlockNumber(); break; } catch { if (k > 120) throw new Error('Nœud injoignable'); await new Promise(r => setTimeout(r, 500)); } }

const frais = { gasPrice: 0n };
const admin = Wallet.createRandom().connect(fournisseur), relaisCompte = Wallet.createRandom();
const etape = t => console.log('✔ ' + t);
try {
  const { abi, bytecode } = JSON.parse(readFileSync(join(racine, 'artifacts/contracts/Registre.sol/Registre.json'), 'utf8'));
  const registre = await new ContractFactory(abi, bytecode, admin).deploy(admin.address, frais);
  await registre.waitForDeployment();
  const adresse = await registre.getAddress();
  await (await registre.agreerEmetteur(relaisCompte.address, 'Nkala — registre Nkorouna', frais)).wait();
  await (await registre.agreerEmetteur(admin.address, 'Établissement de démonstration', frais)).wait();
  etape(`contrat déployé (${adresse}), relais et établissement agréés, sans frais (gasPrice 0)`);

  const document = Buffer.from('Attestation de réussite — exemple inventé pour l\'essai ' + randomBytes(4).toString('hex'));
  const empreinte = createHash('sha256').update(document).digest('hex');
  await (await registre.certifier('0x' + empreinte, frais)).wait();
  etape('document certifié par l\'établissement');

  const secret = randomBytes(32).toString('hex');
  const { serveur } = creerRelais({ cle: relaisCompte.privateKey, secret, contratAdresse: adresse, rpcUrl: rpc, reseau: 'essai' });
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${serveur.address().port}`;
  const poster = (corps, signature) => fetch(base + '/ancrer', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(signature ? { 'x-signature': signature } : {}) }, body: corps });

  // Exactement ce qu'envoie server/api/src/nkorouna.ts (POST /v1/admin/nkorouna/ancrer)
  const racineMerkle = createHash('sha256').update('mouvements 1 à 7').digest('hex');
  const corps = JSON.stringify({ racine: racineMerkle, de: 1, jusqua: 7, ancrage: 1 });
  assert.equal((await poster(corps)).status, 401, 'sans signature');
  assert.equal((await poster(corps, signer('mauvais-secret-'.padEnd(64, 'x'), corps))).status, 401, 'mauvais secret');
  assert.equal((await poster(corps.replace('"de":1', '"de":2'), signer(secret, corps))).status, 401, 'corps modifié après signature');
  etape('signatures absentes, fausses ou corps modifié : refusés (401)');
  const mauvais = JSON.stringify({ racine: 'zz', de: 3, jusqua: 1 });
  assert.equal((await poster(mauvais, signer(secret, mauvais))).status, 400);
  etape('ancrage malformé refusé (400)');

  const r1 = await poster(corps, signer(secret, corps));
  assert.equal(r1.status, 200); const j1 = await r1.json();
  assert.equal(j1.reseau, 'essai'); assert.match(j1.transaction, /^0x[0-9a-f]{64}$/);
  const lu = await new Contract(adresse, abi, fournisseur).verifierAncrage('0x' + racineMerkle);
  assert.equal(lu.de, 1n); assert.equal(lu.jusqua, 7n); assert.equal(lu.emetteur_, relaisCompte.address);
  etape(`racine ancrée par le relais (transaction ${j1.transaction.slice(0, 18)}…)`);
  const r2 = await (await poster(corps, signer(secret, corps))).json();
  assert.equal(r2.deja, true); assert.equal(r2.transaction, j1.transaction);
  etape('même ancrage renvoyé : idempotent, même transaction');

  const v = await (await fetch(`${base}/pub/verifier/${empreinte}`)).json();
  assert.equal(v.connu, true); assert.equal(v.nomEmetteur, 'Établissement de démonstration'); assert.equal(v.revoque, false);
  const inconnu = await (await fetch(`${base}/pub/verifier/${'ab'.repeat(32)}`)).json();
  assert.equal(inconnu.connu, false);
  const a = await (await fetch(`${base}/pub/ancrage/${racineMerkle}`)).json();
  assert.equal(a.connu, true); assert.equal(a.jusqua, 7);
  assert.equal((await fetch(`${base}/pub/verifier/pas-hex`)).status, 400);
  assert.match(await (await fetch(base + '/')).text(), /Vérifier un document/);
  etape('lecture publique : document certifié reconnu, inconnu refusé, ancrage visible, page servie');
  serveur.close();
  console.log('\nEssai de bout en bout réussi.');
} finally { noeud?.kill(); }
