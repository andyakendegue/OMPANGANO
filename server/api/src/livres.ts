/**
 * Bibliothèque virtuelle d'Onenji. Les livres déposés dans BIBLIOTHEQUE_DIR (sur le VPS : /opt/bibliotheque) sont lus, découpés en chapitres
 * et publiés dans les collections « bibliotheque » et « livre_chapitres » ; ils peuvent aussi alimenter le RAG (l'assistant « connaît » les livres).
 * Formats : .txt .md .epub .pdf .docx .html. Nom de fichier conseillé : « Auteur - Titre.ext ». Un fichier déjà importé et inchangé est ignoré.
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { decouperChapitres, minutesDeLecture, slugLivre } from '../../../packages/noyau/src/lecture.ts';
import type { Queryable } from './db.ts';
import { extraireTexte } from './dossier.ts';
import { configIa, indexerDocument, type FournisseurEmbedding } from './ia.ts';
import { journaliser, type Ctx } from './ctx.ts';

export const dossierBibliotheque = (env = process.env) => env.BIBLIOTHEQUE_DIR || '/data/bibliotheque';
const EXT = new Set(['.txt', '.md', '.epub', '.pdf', '.docx', '.html', '.htm']);
const COULEURS = ['#B84A28', '#B45309', '#7C2D12', '#0D9488', '#A16207', '#9A3412', '#115E59', '#78350F'];

export interface EtatLivres { dossier: string; enCours: boolean; fin?: string; livres: number; ajoutes: number; modifies: number; inchanges: number; chapitres: number; erreurs: { fichier: string; message: string }[] }
let enCours = false;
export const livresEnCours = () => enCours;

async function lister(racine: string, rel = ''): Promise<string[]> {
  let out: string[] = [];
  let e; try { e = await fs.readdir(path.join(racine, rel), { withFileTypes: true }); } catch { return []; }
  for (const x of e) {
    if (x.name.startsWith('.')) continue;
    const r = path.posix.join(rel, x.name);
    if (x.isDirectory()) out = out.concat(await lister(racine, r)); else if (x.isFile() && EXT.has(path.extname(x.name).toLowerCase())) out.push(r);
  }
  return out;
}

/** « Auteur - Titre.ext » ; le dossier parent peut servir de rayon (catégorie). */
export function metaDepuisNom(rel: string) {
  const base = path.basename(rel, path.extname(rel)).replace(/[_]+/g, ' ').trim();
  const m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(base);
  const dossier = path.dirname(rel);
  return { auteur: m ? m[1].trim() : '', titre: (m ? m[2] : base).trim(), categorie: dossier && dossier !== '.' ? path.basename(dossier) : '' };
}

export async function importerLivres(q: Queryable, embed: FournisseurEmbedding | null, env = process.env): Promise<EtatLivres> {
  const racine = dossierBibliotheque(env);
  const etat: EtatLivres = { dossier: racine, enCours: true, livres: 0, ajoutes: 0, modifies: 0, inchanges: 0, chapitres: 0, erreurs: [] };
  if (enCours) throw new Error('Un import de la bibliothèque est déjà en cours.');
  enCours = true;
  const sauver = () => q.query(`INSERT INTO parametres (cle, valeur) VALUES ('bibliotheque_etat', $1::jsonb) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur`, [JSON.stringify(etat)]);
  try {
    await sauver();
    const fichiers = await lister(racine);
    let rang = 0;
    for (const rel of fichiers) {
      rang++; etat.livres++;
      try {
        const brut = await fs.readFile(path.join(racine, rel));
        const empreinte = createHash('sha256').update(brut).digest('hex');
        const meta = metaDepuisNom(rel);
        const id = 'lv-' + slugLivre(`${meta.auteur} ${meta.titre}`);
        const ancien = (await q.query<any>(`SELECT data FROM contenus WHERE collection = 'bibliotheque' AND id = $1`, [id]))[0];
        if (ancien && ancien.data.empreinte === empreinte) { etat.inchanges++; continue; }
        const texte = await extraireTexte(path.join(racine, rel));
        if (!texte || texte.trim().length < 200) throw new Error('Texte introuvable ou trop court (PDF scanné sans texte ?).');
        const chapitres = decouperChapitres(texte);
        const palette = COULEURS[(parseInt(createHash('md5').update(id).digest('hex').slice(0, 4), 16)) % COULEURS.length];
        // La fiche conserve ce que la console a modifié (résumé, couverture, accès…) : seuls l'empreinte et le nombre de chapitres sont remis à jour
        const data = { ...(ancien?.data ?? { id, titre: meta.titre, auteur: meta.auteur, categorie: meta.categorie || 'livre', type: 'livre', langue: 'français', couleur: palette, ordre: rang, source: 'Bibliothèque libre de droits', publie: true }),
          empreinte, fichier: rel, nb_chapitres: chapitres.length, minutes: minutesDeLecture(texte), id };
        await q.query(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ('bibliotheque', $1, $2::jsonb, $3, 'publie')
          ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, publie = EXCLUDED.publie, deleted_at = NULL, updated_at = clock_timestamp()`, [id, JSON.stringify(data), data.publie !== false]);
        await q.query(`DELETE FROM contenus WHERE collection = 'livre_chapitres' AND data->>'livre_id' = $1`, [id]);
        for (let i = 0; i < chapitres.length; i++) {
          const cid = `${id}-${String(i + 1).padStart(3, '0')}`;
          await q.query(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ('livre_chapitres', $1, $2::jsonb, true, 'publie')`,
            [cid, JSON.stringify({ id: cid, livre_id: id, titre: chapitres[i].titre, texte: chapitres[i].texte, ordre: i + 1, publie: true })]);
        }
        etat.chapitres += chapitres.length;
        ancien ? etat.modifies++ : etat.ajoutes++;
        if (embed && env.BIBLIOTHEQUE_RAG !== 'non') {
          const doc = 'lvdoc-' + slugLivre(id);
          await q.query(`INSERT INTO ia_documents (id, titre, source, texte, par) VALUES ($1,$2,$3,$4,'bibliotheque')
            ON CONFLICT (id) DO UPDATE SET titre = EXCLUDED.titre, source = EXCLUDED.source, texte = EXCLUDED.texte, updated_at = clock_timestamp()`,
            [doc, `${meta.titre}${meta.auteur ? ' — ' + meta.auteur : ''}`.slice(0, 200), 'bibliotheque:' + rel, texte.slice(0, 2_000_000)]);
          await indexerDocument(q, embed, doc, await configIa(q));
        }
      } catch (e) { etat.erreurs.push({ fichier: rel, message: (e as Error).message.slice(0, 300) }); }
      await sauver().catch(() => {});
    }
    return etat;
  } finally { enCours = false; etat.enCours = false; etat.fin = new Date().toISOString(); await sauver().catch(() => {}); }
}

export async function etatLivres(q: Queryable, env = process.env) {
  const dernier = (await q.query<any>(`SELECT valeur FROM parametres WHERE cle = 'bibliotheque_etat'`))[0]?.valeur as EtatLivres | undefined;
  const presents = (await lister(dossierBibliotheque(env))).length;
  const n = Number((await q.query<any>(`SELECT count(*) AS n FROM contenus WHERE collection = 'bibliotheque' AND deleted_at IS NULL AND data->>'fichier' IS NOT NULL`))[0].n);
  return { ...(dernier ?? { dossier: dossierBibliotheque(env), livres: 0, ajoutes: 0, modifies: 0, inchanges: 0, chapitres: 0, erreurs: [] }), dossier: dossierBibliotheque(env), enCours, presents, importes: n };
}

export function registerLivres(ctx: Ctx) {
  const { app, db, fail, acteur, embed, env } = ctx;
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  app.get('/v1/admin/bibliotheque/etat', async (req) => { await admin(req); return etatLivres(db, env); });
  app.post('/v1/admin/bibliotheque/importer', async (req, reply) => {
    const a = await admin(req);
    if (enCours) return fail(409, 'Un import est déjà en cours.');
    await journaliser(db, a.auth.uid, 'bibliotheque_import');
    void importerLivres(db, embed, env).then(() => ctx.notify('contenus')).catch(e => req.log.error({ err: e }, 'import de la bibliothèque'));
    return reply.status(202).send({ ok: true });
  });
}
