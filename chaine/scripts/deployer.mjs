#!/usr/bin/env node
/**
 * Déploie le contrat Registre et agrée le compte du relais comme émetteur (pour les ancrages de Nkala).
 *   RPC_URL (défaut http://127.0.0.1:8545)
 *   ADMIN_CLE_PRIVEE / RELAIS_ADRESSE : sinon lus dans reseau/comptes.json (réseau généré par generer-reseau.mjs)
 *   RELAIS_NOM (défaut « Nkala — registre Nkorouna »)
 * Écrit reseau/deploiement.json { adresse, chainId, bloc, relais }. Compiler d'abord : npx hardhat compile.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractFactory, JsonRpcProvider, Wallet } from 'ethers';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const artefact = join(racine, 'artifacts/contracts/Registre.sol/Registre.json');
if (!existsSync(artefact)) { console.error('Contrat non compilé : npx hardhat compile'); process.exit(1); }
const { abi, bytecode } = JSON.parse(readFileSync(artefact, 'utf8'));
const fichierComptes = join(racine, 'reseau/comptes.json');
const comptes = existsSync(fichierComptes) ? JSON.parse(readFileSync(fichierComptes, 'utf8')) : {};
const cleAdmin = process.env.ADMIN_CLE_PRIVEE || comptes.administrateur?.clePrivee;
const relais = process.env.RELAIS_ADRESSE || comptes.relais?.adresse;
if (!cleAdmin || !relais) { console.error('ADMIN_CLE_PRIVEE et RELAIS_ADRESSE attendus (ou reseau/comptes.json).'); process.exit(1); }

const fournisseur = new JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545', undefined, { cacheTimeout: -1 });
const admin = new Wallet(cleAdmin, fournisseur);
const { chainId } = await fournisseur.getNetwork();
// Réseau sans frais : prix du gaz à 0 (le réseau local de test Hardhat accepte aussi 0, base fee nulle)
const frais = { gasPrice: 0n };

const contrat = await new ContractFactory(abi, bytecode, admin).deploy(admin.address, frais);
const recu = await contrat.deploymentTransaction().wait();
const adresse = await contrat.getAddress();
await (await contrat.agreerEmetteur(relais, process.env.RELAIS_NOM || 'Nkala — registre Nkorouna', frais)).wait();

const sortie = { adresse, chainId: Number(chainId), bloc: recu.blockNumber, administrateur: admin.address, relais };
writeFileSync(join(racine, 'reseau/deploiement.json'), JSON.stringify(sortie, null, 2));
console.log(`Registre déployé à ${adresse} (chainId ${chainId}, bloc ${recu.blockNumber}) ; relais ${relais} agréé comme émetteur.`);
