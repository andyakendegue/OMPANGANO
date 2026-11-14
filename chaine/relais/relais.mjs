#!/usr/bin/env node
/**
 * Relais d'ancrage de la chaîne Nkorouna. Seul service à détenir la clé du compte « relais » ; l'API de Nkala ne la voit jamais.
 *
 *   POST /ancrer               corps JSON { racine, de, jusqua, ancrage } signé : en-tête x-signature = HMAC-SHA256 hexadécimal
 *                              du corps brut avec RELAIS_SECRET (même calcul que server/api/src/nkorouna.ts). Écrit la racine dans
 *                              le contrat et répond { reseau, transaction }. Idempotent : une racine déjà ancrée renvoie sa transaction.
 *   GET  /pub/verifier/:hex    certificat d'une empreinte SHA-256 (64 caractères hexadécimaux)
 *   GET  /pub/ancrage/:hex     ancrage d'une racine de Merkle
 *   GET  /                     page de vérification d'un fichier (relais/public/index.html)
 *
 * Variables : RELAIS_CLE_PRIVEE, RELAIS_SECRET (openssl rand -hex 32), CONTRAT_ADRESSE, RPC_URL (défaut http://127.0.0.1:8545),
 *             RESEAU_NOM (défaut nkorouna-pilote), PORT (défaut 8600), HOTE (défaut 127.0.0.1 : derrière un proxy HTTPS en production).
 * Aucun secret, corps de requête ni signature n'est écrit dans les journaux (règles S5, J2).
 */
import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';

const ici = dirname(fileURLToPath(import.meta.url));
const ABI = [
  'function ancrer(bytes32 racine, uint64 de, uint64 jusqua)',
  'function verifier(bytes32 empreinte) view returns (address emetteur, string nomEmetteur, uint64 date, uint64 revoqueLe)',
  'function verifierAncrage(bytes32 racine) view returns (address emetteur, string nomEmetteur, uint64 de, uint64 jusqua, uint64 date)',
  'event Ancre(bytes32 indexed racine, address indexed emetteur, uint64 de, uint64 jusqua)',
];
const HEX64 = /^(0x)?[0-9a-fA-F]{64}$/;
const TAILLE_MAX = 4096;

export const signer = (secret, corps) => createHmac('sha256', secret).update(corps).digest('hex');
export function signatureValide(secret, corps, recue) {
  if (!secret || typeof recue !== 'string' || !/^[0-9a-f]{64}$/.test(recue)) return false;
  return timingSafeEqual(Buffer.from(signer(secret, corps), 'hex'), Buffer.from(recue, 'hex'));
}
const b32 = hex => '0x' + hex.replace(/^0x/, '').toLowerCase();

export function creerRelais(cfg) {
  const { cle, secret, contratAdresse, rpcUrl = 'http://127.0.0.1:8545', reseau = 'nkorouna-pilote' } = cfg;
  if (!cle || !secret || secret.length < 32 || !contratAdresse) throw new Error('RELAIS_CLE_PRIVEE, RELAIS_SECRET (32 caractères au moins) et CONTRAT_ADRESSE sont obligatoires.');
  // cacheTimeout -1 : sinon ethers garde le nonce 250 ms en cache et deux ancrages rapprochés se télescopent
  const fournisseur = new JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1, pollingInterval: 500 });
  const compte = new Wallet(cle, fournisseur);
  const lecture = new Contract(contratAdresse, ABI, fournisseur);
  const ecriture = new Contract(contratAdresse, ABI, compte);
  const page = readFileSync(join(ici, 'public/index.html'));
  let file = Promise.resolve(); // une transaction à la fois : pas de collision de nonce
  const enSerie = f => { const p = file.then(f, f); file = p.catch(() => {}); return p; };
  const appels = new Map(); // limite simple : 30 demandes d'écriture par minute et par adresse IP

  async function transactionDe(racine) {
    const journaux = await lecture.queryFilter(lecture.filters.Ancre(racine), 0, 'latest');
    return journaux.at(-1)?.transactionHash ?? null;
  }

  async function ancrer(corps) {
    let d; try { d = JSON.parse(corps); } catch { return [400, { erreur: 'JSON invalide.' }]; }
    const { racine, de, jusqua } = d ?? {};
    if (typeof racine !== 'string' || !HEX64.test(racine) || !Number.isSafeInteger(de) || !Number.isSafeInteger(jusqua) || de < 1 || jusqua < de) return [400, { erreur: 'racine (64 hex), de et jusqua (entiers, 1 ≤ de ≤ jusqua) attendus.' }];
    const r = b32(racine);
    return enSerie(async () => {
      const existant = await lecture.verifierAncrage(r);
      if (existant.date !== 0n) return [200, { reseau, transaction: await transactionDe(r), deja: true }];
      const tx = await ecriture.ancrer(r, de, jusqua, { gasPrice: 0n });
      await tx.wait(); // QBFT : un bloc suffit, il est définitif
      return [200, { reseau, transaction: tx.hash }];
    });
  }

  const vueCertificat = c => c.date === 0n ? { connu: false } : { connu: true, emetteur: c.emetteur, nomEmetteur: c.nomEmetteur, date: new Date(Number(c.date) * 1000).toISOString(), revoque: c.revoqueLe !== 0n, revoqueLe: c.revoqueLe === 0n ? null : new Date(Number(c.revoqueLe) * 1000).toISOString() };
  const vueAncrage = a => a.date === 0n ? { connu: false } : { connu: true, emetteur: a.emetteur, nomEmetteur: a.nomEmetteur, de: Number(a.de), jusqua: Number(a.jusqua), date: new Date(Number(a.date) * 1000).toISOString() };

  const serveur = createServer(async (req, res) => {
    const repondre = (statut, objet, type = 'application/json; charset=utf-8') => {
      res.writeHead(statut, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
        ...(type.startsWith('text/html') ? { 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'" } : {}) });
      res.end(typeof objet === 'string' || Buffer.isBuffer(objet) ? objet : JSON.stringify(objet));
    };
    try {
      const url = new URL(req.url ?? '/', 'http://relais');
      if (req.method === 'GET' && url.pathname === '/') return repondre(200, page, 'text/html; charset=utf-8');
      const m = url.pathname.match(/^\/pub\/(verifier|ancrage)\/([^/]+)$/);
      if (req.method === 'GET' && m) {
        if (!HEX64.test(m[2])) return repondre(400, { erreur: 'Empreinte de 64 caractères hexadécimaux attendue.' });
        return repondre(200, m[1] === 'verifier' ? vueCertificat(await lecture.verifier(b32(m[2]))) : vueAncrage(await lecture.verifierAncrage(b32(m[2]))));
      }
      if (req.method === 'POST' && url.pathname === '/ancrer') {
        const ip = req.socket.remoteAddress ?? '?', maintenant = Date.now();
        const recents = (appels.get(ip) ?? []).filter(t => maintenant - t < 60_000);
        if (recents.length >= 30) return repondre(429, { erreur: 'Trop de demandes.' });
        appels.set(ip, [...recents, maintenant]);
        const morceaux = []; let taille = 0;
        for await (const m of req) { taille += m.length; if (taille > TAILLE_MAX) return repondre(413, { erreur: 'Corps trop grand.' }); morceaux.push(m); }
        const corps = Buffer.concat(morceaux).toString('utf8');
        if (!signatureValide(secret, corps, req.headers['x-signature'])) return repondre(401, { erreur: 'Signature invalide.' });
        const [statut, objet] = await ancrer(corps);
        return repondre(statut, objet);
      }
      return repondre(404, { erreur: 'Introuvable.' });
    } catch (e) {
      console.error(`[relais] ${req.method} ${(req.url ?? '').split('?')[0]} : ${e?.shortMessage ?? e?.code ?? 'erreur'}`);
      return repondre(500, { erreur: 'Erreur interne.' });
    }
  });
  return { serveur, adresseRelais: compte.address };
}

// Lancement direct : node relais/relais.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { serveur, adresseRelais } = creerRelais({ cle: process.env.RELAIS_CLE_PRIVEE, secret: process.env.RELAIS_SECRET, contratAdresse: process.env.CONTRAT_ADRESSE, rpcUrl: process.env.RPC_URL, reseau: process.env.RESEAU_NOM });
  const port = Number(process.env.PORT || 8600), hote = process.env.HOTE || '127.0.0.1';
  serveur.listen(port, hote, () => console.log(`Relais d'ancrage sur http://${hote}:${port} (compte ${adresseRelais})`));
}
