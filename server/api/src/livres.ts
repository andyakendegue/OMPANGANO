/**
 * Bibliothèque virtuelle d'Onenji. Les livres déposés dans BIBLIOTHEQUE_DIR (sur le VPS : /opt/bibliotheque) sont lus, découpés en chapitres
 * et publiés dans les collections « bibliotheque » et « livre_chapitres » ; ils peuvent aussi alimenter le RAG (l'assistant « connaît » les livres).
 * Formats : .txt .md .epub .pdf .docx .html. Nom de fichier conseillé : « Auteur - Titre.ext ». Un fichier déjà importé et inchangé est ignoré.
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ancienLibelle, decouperChapitres, libellesFichier, minutesDeLecture, slugLivre } from '../../../packages/noyau/src/lecture.ts';
import type { Queryable } from './db.ts';
import { extraireTexte } from './dossier.ts';
import { configIa, indexerDocument, type FournisseurEmbedding } from './ia.ts';
import { journaliser, type Ctx } from './ctx.ts';

export const dossierBibliotheque = (env = process.env) => env.BIBLIOTHEQUE_DIR || '/data/bibliotheque';
const EXT = new Set(['.txt', '.md', '.epub', '.pdf', '.docx', '.html', '.htm']);
const COULEURS = ['#B84A28', '#B45309', '#7C2D12', '#0D9488', '#A16207', '#9A3412', '#115E59', '#78350F'];

export interface EtatLivres { dossier: string; enCours: boolean; fin?: string; livres: number; ajoutes: number; modifies: number; inchanges: number; chapitres: number; erreurs: { fichier: string; message: string }[]; reindexes?: number; rag_en_attente?: number; renommes?: number }
let enCours = false;
export const livresEnCours = () => enCours;

async function lister(racine: string, rel = ''): Promise<string[]> {
  let out: string[] = [];
  let e; try { e = await fs.readdir(path.join(racine, rel), { withFileTypes: true }); } catch { return []; }
  for (const x of e) {
    if (x.name.startsWith('.')) continue;
    const r = path.posix.join(rel, x.name);
    // Les sommaires de dossier (INDEX, LISEZMOI, README) ne sont pas des livres.
    if (x.isDirectory()) out = out.concat(await lister(racine, r)); else if (x.isFile() && EXT.has(path.extname(x.name).toLowerCase()) && !/^(index|lisezmoi|readme)\./i.test(x.name)) out.push(r);
  }
  return out;
}

/** Nom brut « Auteur - Titre.ext » et dossier parent : sert seulement à l'identifiant (stable). L'affichage passe par libellesFichier. */
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
    // Indexation pour l'assistant (embeddings) : un échec ne bloque pas l'import du texte. La fiche garde « rag_fait » et le livre est
    // réindexé au passage suivant. Après 3 échecs de suite, le service est jugé indisponible pour ce passage (une seule erreur signalée).
    const ragActif = !!embed && env.BIBLIOTHEQUE_RAG !== 'non';
    let ragCoupe = false, echecsSuite = 0;
    const indexer = async (id: string, rel: string, meta: { titre: string; auteur: string }, texte: string, data: Record<string, any>): Promise<boolean> => {
      if (!ragActif || ragCoupe) return false;
      try {
        const doc = 'lvdoc-' + slugLivre(id);
        await q.query(`INSERT INTO ia_documents (id, titre, source, texte, par) VALUES ($1,$2,$3,$4,'bibliotheque')
          ON CONFLICT (id) DO UPDATE SET titre = EXCLUDED.titre, source = EXCLUDED.source, texte = EXCLUDED.texte, updated_at = clock_timestamp()`,
          [doc, `${meta.titre}${meta.auteur ? ' — ' + meta.auteur : ''}`.slice(0, 200), 'bibliotheque:' + rel, texte.slice(0, 2_000_000)]);
        await indexerDocument(q, embed!, doc, await configIa(q));
        echecsSuite = 0;
        await q.query(`UPDATE contenus SET data = data || '{"rag_fait": true}'::jsonb WHERE collection = 'bibliotheque' AND id = $1`, [id]);
        return true;
      } catch (e) {
        etat.rag_en_attente = (etat.rag_en_attente ?? 0) + 1;
        if (++echecsSuite >= 3) { ragCoupe = true; etat.erreurs.push({ fichier: '(indexation pour l\'assistant)', message: `Service d'embeddings indisponible (${(e as Error).message.slice(0, 160)}) : textes importés, indexation reportée au passage suivant.` }); }
        void data; return false;
      }
    };
    for (const rel of fichiers) {
      rang++; etat.livres++;
      try {
        const octets = await fs.readFile(path.join(racine, rel));
        const empreinte = createHash('sha256').update(octets).digest('hex');
        const brut = metaDepuisNom(rel);
        const meta = libellesFichier(rel);
        // Identifiant tiré du titre (coupé à 50 signes) ; si un autre fichier l'occupe déjà, on y ajoute une empreinte du chemin.
        let id = 'lv-' + slugLivre(`${brut.auteur} ${brut.titre}`);
        let ancien = (await q.query<any>(`SELECT data FROM contenus WHERE collection = 'bibliotheque' AND id = $1`, [id]))[0];
        if (ancien?.data?.fichier && ancien.data.fichier !== rel) {
          id = 'lv-' + slugLivre(`${brut.auteur} ${brut.titre}`).slice(0, 40) + '-' + createHash('md5').update(rel).digest('hex').slice(0, 8);
          ancien = (await q.query<any>(`SELECT data FROM contenus WHERE collection = 'bibliotheque' AND id = $1`, [id]))[0];
        }
        const memeTexte = !!ancien && ancien.data.empreinte === empreinte;
        // Fiches importées avec le nom brut (« 09_hors_normatif », « Decision_N_104… ») : libellés remis au propre, sauf s'ils ont été modifiés dans la console.
        if (ancien) {
          const maj: Record<string, string> = {};
          const auto = (v: string, b: string, m: string) => v === b || (v === ancienLibelle(m) && v !== m);
          if (auto(ancien.data.titre, brut.titre, meta.titre) && meta.titre !== ancien.data.titre) maj.titre = meta.titre;
          if ((ancien.data.categorie === brut.categorie || ancien.data.categorie === 'livre') && meta.categorie && meta.categorie !== ancien.data.categorie) maj.categorie = meta.categorie;
          if (auto(ancien.data.auteur, brut.auteur, meta.auteur) && meta.auteur !== ancien.data.auteur) maj.auteur = meta.auteur;
          if (Object.keys(maj).length) {
            await q.query(`UPDATE contenus SET data = data || $2::jsonb, updated_at = clock_timestamp() WHERE collection = 'bibliotheque' AND id = $1`, [id, JSON.stringify(maj)]);
            Object.assign(ancien.data, maj); etat.renommes = (etat.renommes ?? 0) + 1;
          }
        }
        // Inchangé : rien à faire, sauf si son indexation pour l'assistant n'a pas encore réussi (elle est refaite ici).
        if (memeTexte && (ancien.data.rag_fait === true || !ragActif || ragCoupe)) { etat.inchanges++; continue; }
        if (memeTexte) { const texte = (await extraireTexte(path.join(racine, rel))) ?? ''; if (texte && await indexer(id, rel, meta, texte, ancien.data)) etat.reindexes = (etat.reindexes ?? 0) + 1; continue; }
        const texte = await extraireTexte(path.join(racine, rel));
        if (!texte || texte.trim().length < 200) throw new Error('Texte introuvable ou trop court (PDF scanné sans texte ?).');
        const chapitres = decouperChapitres(texte);
        const palette = COULEURS[(parseInt(createHash('md5').update(id).digest('hex').slice(0, 4), 16)) % COULEURS.length];
        // La fiche conserve ce que la console a modifié (résumé, couverture, accès…) : seuls l'empreinte et le nombre de chapitres sont remis à jour
        const data = { ...(ancien?.data ?? { id, titre: meta.titre, auteur: meta.auteur, categorie: meta.categorie || 'livre', type: 'livre', langue: 'français', couleur: palette, ordre: rang, source: 'Bibliothèque libre de droits', publie: true }),
          empreinte, fichier: rel, nb_chapitres: chapitres.length, minutes: minutesDeLecture(texte), rag_fait: false, id };
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
        await indexer(id, rel, meta, texte, data);
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
