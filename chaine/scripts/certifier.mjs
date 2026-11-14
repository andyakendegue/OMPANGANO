#!/usr/bin/env node
/**
 * Certifie un fichier (ou révoque son certificat) au nom d'un émetteur agréé.
 *   EMETTEUR_CLE_PRIVEE=… CONTRAT_ADRESSE=… [RPC_URL=…] node scripts/certifier.mjs <fichier> [--revoquer]
 * Seule l'empreinte SHA-256 du fichier part sur la chaîne ; le fichier ne quitte pas la machine.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';

const [fichier] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const { EMETTEUR_CLE_PRIVEE: cle, CONTRAT_ADRESSE: adresse, RPC_URL: rpc = 'http://127.0.0.1:8545' } = process.env;
if (!fichier || !cle || !adresse) { console.error('Usage : EMETTEUR_CLE_PRIVEE=… CONTRAT_ADRESSE=… node scripts/certifier.mjs <fichier> [--revoquer]'); process.exit(1); }
const empreinte = '0x' + createHash('sha256').update(readFileSync(fichier)).digest('hex');
const contrat = new Contract(adresse, ['function certifier(bytes32)', 'function revoquer(bytes32)'], new Wallet(cle, new JsonRpcProvider(rpc, undefined, { cacheTimeout: -1 })));
const tx = process.argv.includes('--revoquer') ? await contrat.revoquer(empreinte, { gasPrice: 0n }) : await contrat.certifier(empreinte, { gasPrice: 0n });
await tx.wait();
console.log(`${process.argv.includes('--revoquer') ? 'Révoqué' : 'Certifié'} : ${fichier}\n  SHA-256 ${empreinte.slice(2)}\n  transaction ${tx.hash}`);
