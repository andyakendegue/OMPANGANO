/**
 * Dossier de référence du RAG (EMBEDDINGS_DIR, sur le serveur : /opt/embeddings monté en lecture seule dans le conteneur).
 * Tout fichier déposé là est lu, découpé et vectorisé ; un fichier modifié est réindexé, un fichier retiré est oublié.
 * Appelé chaque nuit par cron (scripts/indexer_dossier.ts) et à la demande depuis la console.
 *
 * Formats : .txt .md .markdown .csv .tsv .json .html .htm .xml .srt .vtt .rtf (texte), .pdf (pdftotext), .docx (unzip).
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Queryable } from './db.ts';
import { configIa, indexerDocument, type FournisseurEmbedding } from './ia.ts';
import { vecteursParDefaut } from './vecteurs.ts';

const run = promisify(execFile);
const vecteurs = vecteursParDefaut();
const TEXTE = new Set(['.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.srt', '.vtt', '.rtf', '.log']);
const MARQUE = new Set(['.html', '.htm', '.xml']);
const TAILLE_MAX = 30 * 1024 * 1024;
const TEXTE_MAX = 2_000_000;

export interface EtatDossier {
  dossier: string; enCours: boolean; debut?: string; fin?: string; declencheur?: string;
  fichiers: number; ajoutes: number; modifies: number; inchanges: number; supprimes: number; ignores: number;
  erreurs: { fichier: string; message: string }[]; morceaux: number; embedding: string;
}

export const dossierEmbeddings = (env = process.env) => env.EMBEDDINGS_DIR || '/data/embeddings';

async function lister(racine: string, rel = ''): Promise<string[]> {
  let sortie: string[] = [];
  let entrees;
  try { entrees = await fs.readdir(path.join(racine, rel), { withFileTypes: true }); } catch { return []; }
  for (const e of entrees) {
    if (e.name.startsWith('.') || e.name.startsWith('~$') || e.name === 'node_modules') continue;
    const r = path.posix.join(rel, e.name);
    if (e.isDirectory()) sortie = sortie.concat(await lister(racine, r));
    else if (e.isFile()) sortie.push(r);
  }
  return sortie;
}

const sansBalises = (h: string) => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n');

/** Texte d'un fichier, ou null si le format n'est pas pris en charge. */
export async function extraireTexte(chemin: string): Promise<string | null> {
  const ext = path.extname(chemin).toLowerCase();
  if (TEXTE.has(ext)) {
    let t = await fs.readFile(chemin, 'utf8');
    if (ext === '.json') { try { t = JSON.stringify(JSON.parse(t), null, 1); } catch { /* texte brut */ } }
    if (ext === '.srt' || ext === '.vtt') t = t.replace(/^\d+\s*$/gm, '').replace(/^[\d:.,]+ --> [\d:.,]+.*$/gm, '').replace(/^WEBVTT.*$/m, '');
    if (ext === '.rtf') t = t.replace(/\\par[d]?/g, '\n').replace(/\\'[0-9a-f]{2}/gi, '').replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
    return t;
  }
  if (MARQUE.has(ext)) return sansBalises(await fs.readFile(chemin, 'utf8'));
  if (ext === '.pdf') { const { stdout } = await run('pdftotext', ['-layout', '-enc', 'UTF-8', chemin, '-'], { maxBuffer: 80 * 1024 * 1024, timeout: 120_000 }); return stdout; }
  if (ext === '.docx') { const { stdout } = await run('unzip', ['-p', chemin, 'word/document.xml'], { maxBuffer: 80 * 1024 * 1024, timeout: 60_000 }); return sansBalises(stdout.replace(/<\/w:p>/g, '\n')); }
  if (ext === '.epub') return extraireEpub(chemin);
  return null;
}

/** EPUB : fichiers de contenu lus dans l'ordre de lecture (spine) du fichier OPF. */
async function extraireEpub(chemin: string): Promise<string> {
  const lire = async (nom: string) => (await run('unzip', ['-p', chemin, nom], { maxBuffer: 80 * 1024 * 1024, timeout: 60_000 })).stdout;
  const conteneur = await lire('META-INF/container.xml');
  const opfChemin = /full-path="([^"]+)"/.exec(conteneur)?.[1];
  if (!opfChemin) throw new Error('EPUB sans fichier OPF.');
  const opf = await lire(opfChemin);
  const base = opfChemin.includes('/') ? opfChemin.slice(0, opfChemin.lastIndexOf('/') + 1) : '';
  const manifeste = new Map<string, string>();
  for (const m of opf.matchAll(/<item\b[^>]*>/g)) { const id = /\bid="([^"]+)"/.exec(m[0])?.[1], href = /\bhref="([^"]+)"/.exec(m[0])?.[1]; if (id && href) manifeste.set(id, href); }
  const ordre = [...opf.matchAll(/<itemref\b[^>]*\bidref="([^"]+)"/g)].map(m => manifeste.get(m[1])).filter(Boolean) as string[];
  let texte = '';
  for (const href of ordre) {
    try { texte += '\n\n' + sansBalises(await lire(base + decodeURIComponent(href.split('#')[0]))); } catch { /* page absente : on continue */ }
  }
  return texte;
}

let enCours = false;
export const dossierEnCours = () => enCours;

/** Synchronise le dossier avec ia_documents. Une seule exécution à la fois. */
export async function synchroniserDossier(q: Queryable, embed: FournisseurEmbedding, declencheur = 'manuel', env = process.env): Promise<EtatDossier> {
  const racine = dossierEmbeddings(env);
  const etat: EtatDossier = { dossier: racine, enCours: true, debut: new Date().toISOString(), declencheur, fichiers: 0, ajoutes: 0, modifies: 0, inchanges: 0, supprimes: 0, ignores: 0, erreurs: [], morceaux: 0, embedding: embed.nom };
  if (enCours) throw new Error('Une synchronisation est déjà en cours.');
  enCours = true;
  const sauver = (e: EtatDossier) => q.query(`INSERT INTO parametres (cle, valeur) VALUES ('ia_dossier_etat', $1::jsonb) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur`, [JSON.stringify(e)]);
  try {
    await sauver(etat);
    try { await fs.access(racine); } catch { etat.erreurs.push({ fichier: racine, message: 'Dossier introuvable ou non monté.' }); return etat; }
    const cfg = await configIa(q);
    const vus = new Set<string>();
    for (const rel of await lister(racine)) {
      etat.fichiers++;
      const abs = path.join(racine, rel);
      const id = 'f_' + createHash('sha1').update(rel).digest('hex').slice(0, 20);
      try {
        const st = await fs.stat(abs);
        if (st.size > TAILLE_MAX || st.size === 0) { etat.ignores++; continue; }
        const brut = await fs.readFile(abs);
        const empreinte = createHash('sha256').update(brut).update(String(cfg.chunkTaille)).update(String(cfg.chunkChevauchement)).update(embed.modele).digest('hex');
        vus.add(id);
        const ancien = (await q.query<any>(`SELECT empreinte, nb_chunks FROM ia_documents WHERE id = $1`, [id]))[0];
        if (ancien && ancien.empreinte === empreinte && ancien.nb_chunks > 0) { etat.inchanges++; continue; }
        const texte = ((await extraireTexte(abs)) ?? null);
        if (texte === null) { etat.ignores++; vus.delete(id); continue; }
        const propre = texte.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim().slice(0, TEXTE_MAX);
        if (propre.length < 10) { etat.ignores++; vus.delete(id); continue; }
        await q.query(`INSERT INTO ia_documents (id, titre, source, texte, par, chemin, empreinte) VALUES ($1,$2,$3,$4,'dossier',$5,$6)
          ON CONFLICT (id) DO UPDATE SET titre = EXCLUDED.titre, source = EXCLUDED.source, texte = EXCLUDED.texte, chemin = EXCLUDED.chemin, empreinte = EXCLUDED.empreinte, updated_at = clock_timestamp()`,
          [id, rel.replace(/\.[^.]+$/, '').slice(0, 200), 'dossier:' + rel, propre, rel, empreinte]);
        etat.morceaux += await indexerDocument(q, embed, id, cfg);
        if (ancien) etat.modifies++; else etat.ajoutes++;
      } catch (e) { etat.erreurs.push({ fichier: rel, message: (e as Error).message.slice(0, 300) }); }
      if ((etat.ajoutes + etat.modifies) % 5 === 0) await sauver(etat).catch(() => {});
    }
    // Fichiers retirés du dossier : leurs documents sont oubliés. On ne touche pas aux documents saisis à la main.
    const anciens = await q.query<any>(`SELECT id FROM ia_documents WHERE chemin IS NOT NULL`);
    for (const d of anciens) if (!vus.has(d.id)) {
      if (etat.erreurs.length && etat.fichiers === 0) break; // dossier vide par accident : on ne purge rien
      await vecteurs.supprimer(d.id).catch(() => {});
      await q.query(`DELETE FROM ia_documents WHERE id = $1`, [d.id]);
      etat.supprimes++;
    }
    return etat;
  } finally {
    enCours = false;
    etat.enCours = false; etat.fin = new Date().toISOString();
    await sauver(etat).catch(() => {});
  }
}

export async function etatDossier(q: Queryable, env = process.env): Promise<EtatDossier & { presents: number }> {
  const racine = dossierEmbeddings(env);
  const dernier = (await q.query<any>(`SELECT valeur FROM parametres WHERE cle = 'ia_dossier_etat'`))[0]?.valeur as EtatDossier | undefined;
  const presents = (await lister(racine)).length;
  return { ...(dernier ?? { dossier: racine, fichiers: 0, ajoutes: 0, modifies: 0, inchanges: 0, supprimes: 0, ignores: 0, erreurs: [], morceaux: 0, embedding: '' }), dossier: racine, enCours, presents };
}
