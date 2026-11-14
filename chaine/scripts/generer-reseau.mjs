#!/usr/bin/env node
/**
 * Génère un réseau pilote Besu QBFT dans chaine/reseau/ (dossier ignoré par git : il contient des clés privées).
 *   - 4 validateurs (QBFT tolère 1 nœud défaillant sur 4), chacun avec sa clé de nœud ;
 *   - comptes « administrateur » (déploie et agrée les émetteurs) et « relais » (publie les ancrages de Nkala) ;
 *   - genèse QBFT (extraData = RLP [vanité 32 octets, validateurs, vote vide, tour 0, sceaux vides]) ;
 *   - liste blanche des nœuds (seuls nos 4 nœuds peuvent se connecter), pour Docker et pour un lancement local.
 *
 *   node scripts/generer-reseau.mjs [--validateurs 4] [--chainid 241001] [--forcer]
 *
 * Refuse d'écraser un réseau existant sans --forcer (on perdrait les clés et la chaîne).
 */
import { existsSync, mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Wallet, encodeRlp, zeroPadValue, getAddress } from 'ethers';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const dossier = join(racine, 'reseau');
const arg = (nom, defaut) => { const i = process.argv.indexOf(nom); return i > 0 ? process.argv[i + 1] : defaut; };
const N = Number(arg('--validateurs', 4));
const CHAIN_ID = Number(arg('--chainid', 241001));
if (!Number.isInteger(N) || N < 4 || N > 21) throw new Error('Entre 4 et 21 validateurs.');

if (existsSync(dossier)) {
  if (!process.argv.includes('--forcer')) { console.error(`${dossier} existe déjà. Relancer avec --forcer pour tout régénérer (clés et chaîne perdues).`); process.exit(1); }
  rmSync(dossier, { recursive: true });
}
mkdirSync(dossier, { mode: 0o700 });
const secret = (chemin, contenu) => { writeFileSync(chemin, contenu, { mode: 0o600 }); chmodSync(chemin, 0o600); };

// ------------------------------------------------------------------ clés
const noeuds = Array.from({ length: N }, (_, i) => {
  const w = Wallet.createRandom();
  const pub = w.signingKey.publicKey.slice(4); // sans le préfixe 0x04 : identifiant enode (64 octets)
  return { nom: `validateur${i + 1}`, adresse: getAddress(w.address), cle: w.privateKey.slice(2), pub, ipDocker: `172.30.24.${11 + i}`, p2pLocal: 30303 + i, rpcLocal: 8545 + i };
});
const comptes = { administrateur: Wallet.createRandom(), relais: Wallet.createRandom() };

for (const n of noeuds) { mkdirSync(join(dossier, n.nom), { mode: 0o700 }); secret(join(dossier, n.nom, 'cle'), n.cle); }
// Secret partagé entre l'API de Nkala et le relais (HMAC des demandes d'ancrage), comme openssl rand -hex 32
secret(join(dossier, 'secret-relais'), randomBytes(32).toString('hex'));
secret(join(dossier, 'comptes.json'), JSON.stringify(Object.fromEntries(Object.entries(comptes).map(([k, w]) => [k, { adresse: w.address, clePrivee: w.privateKey }])), null, 2));

// ------------------------------------------------------------------ genèse
const extraData = encodeRlp([zeroPadValue('0x', 32), noeuds.map(n => n.adresse), [], '0x', []]);
const genese = {
  config: {
    chainId: CHAIN_ID, berlinBlock: 0, londonBlock: 0,
    zeroBaseFee: true, // aucun frais pour les usagers : réseau à validateurs autorisés
    qbft: { blockperiodseconds: 2, epochlength: 30000, requesttimeoutseconds: 4 },
  },
  nonce: '0x0', timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16), gasLimit: '0x2faf080', difficulty: '0x1',
  mixHash: '0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365', // valeur imposée par QBFT
  coinbase: '0x0000000000000000000000000000000000000000',
  alloc: Object.fromEntries(Object.values(comptes).map(w => [w.address.slice(2).toLowerCase(), { balance: '0x0' }])),
  extraData,
};
writeFileSync(join(dossier, 'genese.json'), JSON.stringify(genese, null, 2));

// ------------------------------------------------------------------ liste blanche des nœuds
const enode = (n, ip, port) => `enode://${n.pub}@${ip}:${port}`;
const permissions = liste => `nodes-allowlist=[${liste.map(e => JSON.stringify(e)).join(',')}]\n`;
writeFileSync(join(dossier, 'permissions-docker.toml'), permissions(noeuds.map(n => enode(n, n.ipDocker, 30303))));
writeFileSync(join(dossier, 'permissions-local.toml'), permissions(noeuds.map(n => enode(n, '127.0.0.1', n.p2pLocal))));
// Besu réécrit ce fichier quand on modifie la liste par l'API : une copie par nœud
for (const n of noeuds) {
  writeFileSync(join(dossier, n.nom, 'permissions-docker.toml'), permissions(noeuds.map(m => enode(m, m.ipDocker, 30303))));
  writeFileSync(join(dossier, n.nom, 'permissions-local.toml'), permissions(noeuds.map(m => enode(m, '127.0.0.1', m.p2pLocal))));
}

writeFileSync(join(dossier, 'noeuds.json'), JSON.stringify({ chainId: CHAIN_ID, noeuds: noeuds.map(({ cle, ...n }) => ({ ...n, enodeDocker: enode(n, n.ipDocker, 30303), enodeLocal: enode(n, '127.0.0.1', n.p2pLocal) })) }, null, 2));
writeFileSync(join(dossier, 'bootnodes-docker.txt'), enode(noeuds[0], noeuds[0].ipDocker, 30303));
writeFileSync(join(dossier, 'bootnodes-local.txt'), enode(noeuds[0], '127.0.0.1', noeuds[0].p2pLocal));

console.log(`Réseau généré dans ${dossier}
  chainId ${CHAIN_ID}, ${N} validateurs : ${noeuds.map(n => n.adresse).join(', ')}
  administrateur ${comptes.administrateur.address}
  relais         ${comptes.relais.address}
Ce dossier contient des clés privées : ne jamais le copier dans le dépôt ni le partager.`);
