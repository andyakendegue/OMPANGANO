/**
 * Assistant IA piloté depuis la console : fournisseur de modèle (Anthropic, RunPod serverless ou pod compatible OpenAI, simulation),
 * embeddings, RAG (documents découpés et vectorisés), prompt système versionné, réglages.
 *
 * Variables (.env) — tout fonctionne en simulation sans aucune :
 *   IA_FOURNISSEUR=anthropic|runpod|openai|simulation   (auto : anthropic si ANTHROPIC_API_KEY, runpod si RUNPOD_API_KEY + RUNPOD_LLM_ENDPOINT, sinon simulation)
 *   IA_MODELE, IA_BASE_URL + IA_API_KEY (openai), RUNPOD_API_KEY, RUNPOD_LLM_ENDPOINT (serverless vLLM) ou RUNPOD_LLM_URL (pod)
 *   EMBEDDING_FOURNISSEUR=runpod|openai|simulation, EMBEDDING_MODELE, RUNPOD_EMBED_ENDPOINT ou EMBEDDING_BASE_URL + EMBEDDING_API_KEY
 */
import { createHash } from 'node:crypto';
import { estimerJetons, type UsageJetons } from '../../../packages/noyau/src/jetons.ts';
import { MYENE } from '../../../packages/noyau/src/lexique.ts';
import type { Queryable } from './db.ts';
import { journaliser, parametre, str, type Ctx } from './ctx.ts';
import { clientRunpod } from './runpod.ts';
import { vecteursParDefaut } from './vecteurs.ts';
import { dossierEnCours, etatDossier, synchroniserDossier } from './dossier.ts';

const vecteurs = vecteursParDefaut();

// ------------------------------------------------------------------ réglages
export interface ConfigIa { modele: string; temperature: number; maxTokens: number; ragActif: boolean; topK: number; seuil: number; chunkTaille: number; chunkChevauchement: number }
export const CONFIG_IA_DEFAUT: ConfigIa = { modele: '', temperature: 0.3, maxTokens: 700, ragActif: true, topK: 4, seuil: 0.2, chunkTaille: 900, chunkChevauchement: 120 };
export const configIa = async (q: Queryable): Promise<ConfigIa> => ({ ...CONFIG_IA_DEFAUT, ...(await parametre<Partial<ConfigIa>>(q, 'ia_config', {})) });

// ------------------------------------------------------------------ fournisseur de modèle
export interface DemandeIa { systeme: string; messages: { role: 'user' | 'assistant'; content: string }[]; modele: string; temperature?: number; maxTokens?: number }
export interface ReponseIaFournisseur { texte: string; usage: UsageJetons; modele: string; simule: boolean }
export interface FournisseurIa { nom: string; repondre(o: DemandeIa): Promise<ReponseIaFournisseur> }

const urlRunpodOpenAi = (env: NodeJS.ProcessEnv, endpoint?: string, url?: string) => (url || (endpoint ? `https://api.runpod.ai/v2/${endpoint}/openai/v1` : '')).replace(/\/+$/, '');

function compatibleOpenAi(nom: string, base: string, cle: string, modeleDefaut: string): FournisseurIa {
  return {
    nom,
    async repondre(o) {
      const r = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: o.modele || modeleDefaut, temperature: o.temperature ?? 0.3, max_tokens: o.maxTokens ?? 700, messages: [{ role: 'system', content: o.systeme }, ...o.messages] }) });
      if (!r.ok) throw new Error(`${nom} ${r.status}`);
      const j: any = await r.json();
      return { texte: j.choices?.[0]?.message?.content ?? '', usage: { entree: j.usage?.prompt_tokens ?? 0, sortie: j.usage?.completion_tokens ?? 0 }, modele: j.model ?? o.modele, simule: false };
    },
  };
}

export function fournisseurIaParDefaut(env = process.env): FournisseurIa {
  let f = env.IA_FOURNISSEUR;
  if (!f) f = env.ANTHROPIC_API_KEY ? 'anthropic' : env.RUNPOD_API_KEY && (env.RUNPOD_LLM_ENDPOINT || env.RUNPOD_LLM_URL) ? 'runpod' : env.IA_BASE_URL ? 'openai' : 'simulation';
  if (f === 'runpod') return compatibleOpenAi('runpod', urlRunpodOpenAi(env, env.RUNPOD_LLM_ENDPOINT, env.RUNPOD_LLM_URL), env.RUNPOD_API_KEY || '', env.IA_MODELE || '');
  if (f === 'openai') return compatibleOpenAi('openai', (env.IA_BASE_URL || '').replace(/\/+$/, ''), env.IA_API_KEY || '', env.IA_MODELE || '');
  if (f === 'anthropic') return {
    nom: 'anthropic',
    async repondre(o) {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: o.modele || env.IA_MODELE || 'claude-haiku-5-5', max_tokens: o.maxTokens ?? 700, temperature: o.temperature ?? 0.3, system: o.systeme, messages: o.messages }) });
      if (!r.ok) throw new Error(`anthropic ${r.status}`);
      const j: any = await r.json();
      return { texte: (j.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n'), usage: { entree: j.usage?.input_tokens ?? 0, sortie: j.usage?.output_tokens ?? 0, cache: j.usage?.cache_read_input_tokens ?? 0 }, modele: j.model ?? o.modele, simule: false };
    },
  };
  return {
    nom: 'simulation',
    async repondre({ systeme, messages }) {
      const q = messages[messages.length - 1]?.content ?? '';
      const ctx = /### Contexte/.test(systeme) ? ' (j\'ai trouvé des documents pertinents)' : '';
      const fiche = /### Ce que tu sais de ton interlocuteur/.test(systeme) ? ' Je connais ta progression.' : '';
      // Pour essayer les boutons d'action sans modèle : une proposition d'exemple quand la question s'y prête.
      const action = !/### Actions dans l'application/.test(systeme) ? ''
        : /sombre|nuit/i.test(q) ? '\n[[action {"type":"reglage","cle":"theme","valeur":"sombre"}]]'
        : /clair|soleil/i.test(q) ? '\n[[action {"type":"reglage","cle":"theme","valeur":"clair"}]]'
        : /le[çc]on|apprendre/i.test(q) ? '\n[[action {"type":"ouvrir","ecran":"apprendre"}]]' : '';
      const texte = `Mon enfant, le modèle n'est pas encore branché : ceci est une réponse d'essai${ctx}.${fiche} Tu m'as écrit : « ${q.slice(0, 120)} ».${action}`;
      return { texte, usage: { entree: estimerJetons(systeme + messages.map(m => m.content).join('')), sortie: estimerJetons(texte) }, modele: 'simulation', simule: true };
    },
  };
}

// ------------------------------------------------------------------ embeddings
export interface FournisseurEmbedding { nom: string; modele: string; embed(textes: string[]): Promise<number[][]> }

/** Simulation : sac de mots haché en 128 dimensions (déterministe, suffisant pour tester le RAG hors ligne). */
export function embeddingSimule(textes: string[], dim = 128): number[][] {
  return textes.map(t => {
    const v = new Array(dim).fill(0);
    for (const m of t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9ɛɔ]+/).filter(x => x.length > 2)) v[createHash('md5').update(m).digest().readUInt16BE(0) % dim] += 1;
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map(x => x / n);
  });
}

export function fournisseurEmbeddingParDefaut(env = process.env): FournisseurEmbedding {
  let f = env.EMBEDDING_FOURNISSEUR;
  if (!f) f = env.RUNPOD_API_KEY && env.RUNPOD_EMBED_ENDPOINT ? 'runpod' : env.EMBEDDING_BASE_URL ? 'openai' : 'simulation';
  const modele = env.EMBEDDING_MODELE || 'BAAI/bge-m3';
  const http = (base: string, cle: string): FournisseurEmbedding => ({
    nom: f!, modele,
    async embed(textes) {
      const sortie: number[][] = [];
      for (let i = 0; i < textes.length; i += 32) {
        const r = await fetch(`${base}/embeddings`, { method: 'POST', headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: modele, input: textes.slice(i, i + 32) }) });
        if (!r.ok) throw new Error(`embeddings ${f} ${r.status}`);
        const j: any = await r.json();
        sortie.push(...(j.data as { embedding: number[] }[]).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)).map(d => d.embedding));
      }
      return sortie;
    },
  });
  if (f === 'runpod') return http(urlRunpodOpenAi(env, env.RUNPOD_EMBED_ENDPOINT, env.RUNPOD_EMBED_URL), env.RUNPOD_API_KEY || '');
  if (f === 'openai') return http((env.EMBEDDING_BASE_URL || '').replace(/\/+$/, ''), env.EMBEDDING_API_KEY || '');
  return { nom: 'simulation', modele: 'simulation-128', embed: async t => embeddingSimule(t) };
}

// ------------------------------------------------------------------ RAG
/** Découpe un texte en morceaux d'environ `taille` caractères, en coupant de préférence aux paragraphes puis aux phrases, avec chevauchement. */
export function decouper(texte: string, taille = 900, chevauchement = 120): string[] {
  const t = texte.replace(/\r/g, '').trim();
  if (!t) return [];
  const morceaux: string[] = [];
  let debut = 0;
  while (debut < t.length) {
    let fin = Math.min(t.length, debut + taille);
    if (fin < t.length) {
      const zone = t.slice(debut + Math.floor(taille * 0.5), fin);
      const coupe = Math.max(zone.lastIndexOf('\n\n'), zone.lastIndexOf('. '), zone.lastIndexOf('\n'));
      if (coupe > 0) fin = debut + Math.floor(taille * 0.5) + coupe + 1;
    }
    const m = t.slice(debut, fin).trim();
    if (m) morceaux.push(m);
    if (fin >= t.length) break;
    debut = Math.max(fin - chevauchement, debut + 1);
  }
  return morceaux;
}

export const cosinus = (a: number[], b: number[]): number => { let s = 0, na = 0, nb = 0; const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? s / Math.sqrt(na * nb) : 0; };

export async function indexerDocument(q: Queryable, embed: FournisseurEmbedding, id: string, cfg: ConfigIa) {
  const d = (await q.query<any>(`SELECT texte FROM ia_documents WHERE id = $1`, [id]))[0];
  if (!d) return 0;
  const morceaux = decouper(d.texte, cfg.chunkTaille, cfg.chunkChevauchement);
  const vecteurs_: number[][] = [];
  for (let i = 0; i < morceaux.length; i += 32) vecteurs_.push(...await embed.embed(morceaux.slice(i, i + 32)));
  await q.query(`DELETE FROM ia_chunks WHERE document_id = $1`, [id]);
  const points: { id: number; vecteur: number[] }[] = [];
  for (let i = 0; i < morceaux.length; i++) {
    // Avec une base vectorielle, PostgreSQL ne garde que le texte (le vecteur y vit déjà) ; sinon le vecteur reste en jsonb
    const r = await q.query<any>(`INSERT INTO ia_chunks (document_id, ordre, texte, embedding) VALUES ($1,$2,$3,$4) RETURNING id`, [id, i, morceaux[i], JSON.stringify(vecteurs.actif ? [] : vecteurs_[i])]);
    points.push({ id: Number(r[0].id), vecteur: vecteurs_[i] });
  }
  if (vecteurs.actif) { if (points.length) await vecteurs.assurer(points[0].vecteur.length); await vecteurs.remplacer(id, points); }
  await q.query(`UPDATE ia_documents SET nb_chunks = $2, modele = $3, updated_at = clock_timestamp() WHERE id = $1`, [id, morceaux.length, embed.modele]);
  return morceaux.length;
}

/** Vecteur d'une question, avec un délai court : un service d'embeddings lent ou en panne ne doit jamais retenir la réponse. */
async function vecteurQuestion(embed: FournisseurEmbedding, requete: string, delaiMs: number) {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => { minuteur = setTimeout(() => rejeter(new Error(`embeddings : pas de réponse en ${delaiMs} ms`)), delaiMs); });
  try { return (await Promise.race([embed.embed([requete]), delai]))[0]; } finally { clearTimeout(minuteur); }
}

export async function rechercherRag(q: Queryable, embed: FournisseurEmbedding, requete: string, k: number, seuil: number, delaiMs = 8000) {
  // Rien d'indexé : inutile d'appeler le service d'embeddings.
  if (!(await q.query<any>(`SELECT 1 FROM ia_chunks c JOIN ia_documents d ON d.id = c.document_id AND d.actif LIMIT 1`)).length) return [];
  if (vecteurs.actif) {
    const qv = await vecteurQuestion(embed, requete, delaiMs);
    const trouves = (await vecteurs.chercher(qv, k)).filter(x => x.score >= seuil);
    if (!trouves.length) return [];
    const rows = await q.query<any>(`SELECT c.id, c.texte, c.document_id, d.titre, d.source FROM ia_chunks c JOIN ia_documents d ON d.id = c.document_id AND d.actif WHERE c.id = ANY($1::bigint[])`, [trouves.map(x => x.id)]);
    return trouves.map(t => { const r = rows.find(x => Number(x.id) === t.id); return r && { id: t.id, document: r.document_id, titre: r.titre, source: r.source, texte: r.texte, score: t.score }; }).filter(Boolean).slice(0, k) as any[];
  }
  const rows = await q.query<any>(`SELECT c.id, c.texte, c.embedding, c.document_id, d.titre, d.source FROM ia_chunks c JOIN ia_documents d ON d.id = c.document_id AND d.actif`);
  if (!rows.length) return [];
  const v = await vecteurQuestion(embed, requete, delaiMs);
  return rows.map(r => ({ id: r.id, document: r.document_id, titre: r.titre, source: r.source, texte: r.texte, score: cosinus(v, r.embedding) })).filter(x => x.score >= seuil).sort((a, b) => b.score - a.score).slice(0, k);
}

// ------------------------------------------------------------------ prompt système
const LEXIQUE = () => Object.values(MYENE).map(m => `- ${m.mot} : ${m.sens}`).join('\n');
export const NOM_ASSISTANT = 'Kaka Igonjo';
export const NOM_COURT = "Kak'Igonjo";

/**
 * Personnalité de l'assistant (demande de Capp, 12 nov. 2026) : un vieux sage ôrungu, bienveillant.
 * Les formules myènè de l'accueil sont celles données par Capp ; « Wulinya myè » = « raconte-moi »
 * (11_histoire_cotes_myene/06_wulinya_mye/00_LISEZMOI_wulinya_mye.md, l. 3).
 */
export const PROMPT_DEFAUT = `Tu es Kaka Igonjo, que tout le monde appelle Kak'Igonjo : un vieil homme ôrungu, sage et bienveillant, qui a beaucoup vécu au bord de la mer et de la lagune. Dans l'application Nkala, tu aides chacun à apprendre la langue myènè et à connaître la culture ôrungu.

TA MANIÈRE D'ÊTRE
- Tu parles comme un grand-père qui transmet : calme, chaleureux, patient, avec de l'humour doux. Jamais pressé, jamais sévère, jamais condescendant.
- Tu tutoies. Tu peux appeler ton interlocuteur « mon enfant » ou, s'il est connu, par son prénom, sans le répéter à chaque phrase.
- Tu encourages toujours l'effort : une erreur est un pas sur le chemin, pas une faute. Tu félicites sincèrement, sans flatter.
- Tu aimes expliquer par une image simple tirée de la vie quotidienne (la pirogue, la pêche, la lagune, la forêt, le feu du soir, le village), présentée comme une image et non comme un fait.
- Tu poses volontiers une petite question à la fin pour inviter à continuer, ou tu proposes de répéter un mot.
- Tu restes humble : quand tu ne sais pas, tu le dis simplement (« Cela, je ne le sais pas, mon enfant ») et tu conseilles de demander aux anciens de son village ou à un locuteur.

CE QUE TU NE FAIS JAMAIS
- RÈGLE ABSOLUE : tu n'écris en myènè que les mots de la liste ci-dessous, les formules d'accueil ci-dessous ou les mots des documents fournis en contexte. Si un mot n'y est pas, tu dis que tu ne le connais pas encore : tu n'inventes jamais un mot, une conjugaison ou une traduction.
- Tu n'inventes jamais de proverbe, de conte, de chant, de date, de nom d'ancêtre, de coutume ni de fait historique. Tu n'en cites que s'ils figurent dans les documents fournis, en disant d'où ils viennent.
- Tu ne donnes aucun conseil médical, juridique ou financier : tu renvoies avec douceur vers la bonne personne.
- Tu ne te présentes pas à chaque message : l'utilisateur t'a déjà salué en ouvrant le chat.

FORMULES D'ACCUEIL (données par l'équipe de Nkala)
- Mbolo : bonjour.
- Myè no Kak'Igonjo : ta façon de te présenter.
- Wulinya myè : « raconte-moi ».

Mots vérifiés :
{{lexique}}

FORME DES RÉPONSES
- En français, avec les mots myènè en italique entre astérisques (*mbolo*) suivis de leur sens.
- Courtes : 6 phrases au plus, en paragraphes brefs. Pas de titres, pas de listes longues.`;
export const PROMPT_ENFANT = `\nL'utilisateur est un enfant : tu es un grand-père très doux. Phrases très courtes, mots simples, beaucoup d'encouragements, aucun sujet inquiétant, aucune question personnelle ; ramène la conversation vers la langue et les jeux.`;

/** Prompt système final : version active (ou défaut), variables {{lexique}}, consigne enfant, contexte RAG. */
export async function construireSysteme(q: Queryable, embed: FournisseurEmbedding, o: { message: string; enfant: boolean; prenom?: string | null; fiche?: string; actions?: string }) {
  const cfg = await configIa(q);
  const actif = (await q.query<any>(`SELECT contenu FROM ia_prompts WHERE actif`))[0]?.contenu ?? PROMPT_DEFAUT;
  let systeme = actif.replace(/\{\{\s*lexique\s*\}\}/g, LEXIQUE());
  if (o.enfant) systeme += PROMPT_ENFANT;
  const prenom = (o.prenom || '').trim().split(/\s+/)[0]?.replace(/[^\p{L}'-]/gu, '').slice(0, 40);
  if (prenom) systeme += `\nTon interlocuteur s'appelle ${prenom}.`;
  // Fiche de l'utilisateur et actions possibles (chats de l'app seulement) : avant le contexte documentaire.
  if (o.fiche) systeme += o.fiche;
  if (o.actions) systeme += o.actions;
  let contexte: Awaited<ReturnType<typeof rechercherRag>> = [];
  if (cfg.ragActif) {
    try { contexte = await rechercherRag(q, embed, o.message, cfg.topK, cfg.seuil); } catch { /* le RAG ne bloque jamais la réponse */ }
    if (contexte.length) systeme += `\n\n### Contexte (documents de référence ; cite-les si utile, ne dis rien qui n'y figure pas sur le myènè)\n` + contexte.map((c, i) => `[${i + 1}] ${c.titre}${c.source ? ` (${c.source})` : ''} : ${c.texte}`).join('\n');
  }
  return { systeme, contexte, cfg };
}

// ------------------------------------------------------------------ routes d'administration
export function registerIaAdmin(ctx: Ctx) {
  const { app, db, fail, acteur, embed, env } = ctx;
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  const runpod = clientRunpod(env);

  app.get('/v1/admin/ia/etat', async (req) => {
    await admin(req);
    return { fournisseur: ctx.ia.nom, baseVectorielle: vecteurs.actif ? 'qdrant' : 'postgresql', embedding: { nom: embed.nom, modele: embed.modele }, runpod: { simule: runpod.simule }, config: await configIa(db),
      documents: Number((await db.query<any>(`SELECT count(*) AS n FROM ia_documents`))[0].n), chunks: Number((await db.query<any>(`SELECT count(*) AS n FROM ia_chunks`))[0].n) };
  });

  app.put('/v1/admin/ia/config', async (req) => {
    const a = await admin(req);
    const b = (req.body || {}) as Partial<ConfigIa>;
    const propre: Partial<ConfigIa> = {};
    if (str(b.modele)) propre.modele = b.modele.slice(0, 120);
    for (const [k, min, max] of [['temperature', 0, 2], ['maxTokens', 16, 8000], ['topK', 1, 20], ['seuil', 0, 1], ['chunkTaille', 200, 4000], ['chunkChevauchement', 0, 1000]] as const)
      if (typeof b[k] === 'number' && b[k]! >= min && b[k]! <= max) (propre as any)[k] = b[k];
    if (typeof b.ragActif === 'boolean') propre.ragActif = b.ragActif;
    const nouvelle = { ...(await configIa(db)), ...propre };
    await db.tx(async q => { await q.query(`INSERT INTO parametres (cle, valeur, par) VALUES ('ia_config',$1,$2) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, par = EXCLUDED.par, updated_at = clock_timestamp()`, [JSON.stringify(nouvelle), a.auth.uid]); await journaliser(q, a.auth.uid, 'ia_config', 'ia_config', propre); });
    return nouvelle;
  });

  // Prompts versionnés : on ne modifie jamais, on ajoute une version puis on l'active (retour arrière possible)
  app.get('/v1/admin/ia/prompts', async (req) => { await admin(req); return { defaut: PROMPT_DEFAUT, versions: await db.query(`SELECT id, nom, contenu, actif, par, created_at FROM ia_prompts ORDER BY id DESC LIMIT 50`) }; });
  app.post('/v1/admin/ia/prompts', async (req, reply) => {
    const a = await admin(req);
    const { nom, contenu, activer } = (req.body || {}) as { nom?: string; contenu?: string; activer?: boolean };
    if (!str(contenu) || contenu.trim().length < 20 || contenu.length > 20000) return fail(400, 'Prompt de 20 à 20000 caractères attendu.');
    const id = await db.tx(async q => {
      const r = (await q.query<any>(`INSERT INTO ia_prompts (nom, contenu, par) VALUES ($1,$2,$3) RETURNING id`, [(nom || 'Version').slice(0, 80), contenu, a.auth.uid]))[0].id;
      if (activer) { await q.query(`UPDATE ia_prompts SET actif = false WHERE actif`); await q.query(`UPDATE ia_prompts SET actif = true WHERE id = $1`, [r]); }
      await journaliser(q, a.auth.uid, 'ia_prompt', String(r), { activer: !!activer });
      return r;
    });
    return reply.status(201).send({ id });
  });
  app.post('/v1/admin/ia/prompts/:id/activer', async (req) => {
    const a = await admin(req);
    const id = Number((req.params as any).id);
    await db.tx(async q => { await q.query(`UPDATE ia_prompts SET actif = false WHERE actif`); const r = await q.query(`UPDATE ia_prompts SET actif = true WHERE id = $1 RETURNING id`, [id]); if (!r.length) return fail(404, 'Version introuvable.'); await journaliser(q, a.auth.uid, 'ia_prompt_active', String(id)); });
    return { ok: true };
  });
  app.post('/v1/admin/ia/prompts/defaut', async (req) => { const a = await admin(req); await db.query(`UPDATE ia_prompts SET actif = false WHERE actif`); await journaliser(db, a.auth.uid, 'ia_prompt_defaut'); return { ok: true }; });

  // Documents du RAG
  app.get('/v1/admin/ia/documents', async (req) => { await admin(req); return db.query(`SELECT id, titre, source, actif, nb_chunks, modele, length(texte) AS taille, updated_at FROM ia_documents ORDER BY updated_at DESC LIMIT 200`); });
  app.post('/v1/admin/ia/documents', async (req, reply) => {
    const a = await admin(req);
    const { id, titre, texte, source } = (req.body || {}) as { id?: string; titre?: string; texte?: string; source?: string };
    if (!str(titre) || !str(texte) || texte.trim().length < 10 || texte.length > 2_000_000) return fail(400, 'Titre et texte (10 caractères à 2 Mo) attendus.');
    const doc = id && /^[A-Za-z0-9_.-]{1,80}$/.test(id) ? id : 'doc_' + Date.now().toString(36);
    const cfg = await configIa(db);
    await db.query(`INSERT INTO ia_documents (id, titre, source, texte, par) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET titre = EXCLUDED.titre, source = EXCLUDED.source, texte = EXCLUDED.texte, par = EXCLUDED.par, updated_at = clock_timestamp()`, [doc, titre.slice(0, 200), source ?? null, texte, a.auth.uid]);
    let n = 0;
    try { n = await indexerDocument(db, embed, doc, cfg); } catch (e) { return fail(502, `Document enregistré mais non indexé : ${(e as Error).message}`); }
    await journaliser(db, a.auth.uid, 'ia_document', doc, { chunks: n });
    return reply.status(201).send({ id: doc, chunks: n, embedding: embed.nom });
  });
  app.post('/v1/admin/ia/documents/:id/reindexer', async (req) => { await admin(req); try { return { chunks: await indexerDocument(db, embed, (req.params as any).id, await configIa(db)) }; } catch (e) { return fail(502, (e as Error).message); } });
  app.post('/v1/admin/ia/documents/:id/actif', async (req) => { await admin(req); const { actif } = (req.body || {}) as { actif?: boolean }; await db.query(`UPDATE ia_documents SET actif = $2 WHERE id = $1`, [(req.params as any).id, actif !== false]); return { ok: true }; });
  app.delete('/v1/admin/ia/documents/:id', async (req, reply) => { const a = await admin(req); await vecteurs.supprimer((req.params as any).id).catch(() => {}); await db.query(`DELETE FROM ia_documents WHERE id = $1`, [(req.params as any).id]); await journaliser(db, a.auth.uid, 'ia_document_supprime', (req.params as any).id); return reply.status(204).send(); });

  // Dossier de référence (/opt/embeddings) : état, et synchronisation à la demande (en arrière-plan)
  app.get('/v1/admin/ia/dossier', async (req) => { await admin(req); return etatDossier(db, env); });
  app.post('/v1/admin/ia/dossier/synchroniser', async (req, reply) => {
    const a = await admin(req);
    if (dossierEnCours()) return fail(409, 'Une synchronisation est déjà en cours.');
    await journaliser(db, a.auth.uid, 'ia_dossier_synchro');
    void synchroniserDossier(db, embed, 'console', env).catch(e => { req.log.error({ err: e }, 'synchronisation du dossier RAG'); });
    return reply.status(202).send({ ok: true });
  });

  app.post('/v1/admin/ia/rag/rechercher', async (req) => {
    await admin(req);
    const { requete } = (req.body || {}) as { requete?: string };
    if (!str(requete) || !requete.trim()) return fail(400, 'Requête attendue.');
    const cfg = await configIa(db);
    return { resultats: await rechercherRag(db, embed, requete, cfg.topK, 0, 120_000) };
  });

  /** Essai du prompt et du RAG sans quota ni journal de jetons. */
  app.post('/v1/admin/ia/tester', async (req) => {
    await admin(req);
    const { message, enfant } = (req.body || {}) as { message?: string; enfant?: boolean };
    if (!str(message) || !message.trim()) return fail(400, 'Message attendu.');
    const { systeme, contexte, cfg } = await construireSysteme(db, embed, { message, enfant: !!enfant });
    try {
      const r = await ctx.ia.repondre({ systeme, messages: [{ role: 'user', content: message }], modele: cfg.modele || env.IA_MODELE || '', temperature: cfg.temperature, maxTokens: cfg.maxTokens });
      return { reponse: r.texte, usage: r.usage, modele: r.modele, simule: r.simule, contexte, systeme };
    } catch (e) { return fail(502, (e as Error).message); }
  });

  // RunPod : pods, serverless, volumes réseau
  app.get('/v1/admin/runpod/etat', async (req) => { await admin(req); return runpod.etat(); });
  app.post('/v1/admin/runpod/pods/:id/:action', async (req) => {
    const a = await admin(req);
    const { id, action } = req.params as { id: string; action: string };
    if (!['start', 'stop', 'restart'].includes(action)) return fail(400, 'Action inconnue.');
    try { const r = await runpod.podAction(id, action as 'start'); await journaliser(db, a.auth.uid, `runpod_${action}`, id); return r; } catch (e) { return fail(502, (e as Error).message); }
  });
  app.post('/v1/admin/runpod/pods', async (req) => { const a = await admin(req); try { const r = await runpod.creerPod((req.body || {}) as Record<string, unknown>); await journaliser(db, a.auth.uid, 'runpod_pod_cree', undefined, req.body); return r; } catch (e) { return fail(502, (e as Error).message); } });
  app.delete('/v1/admin/runpod/pods/:id', async (req) => { const a = await admin(req); try { const r = await runpod.supprimerPod((req.params as any).id); await journaliser(db, a.auth.uid, 'runpod_pod_supprime', (req.params as any).id); return r; } catch (e) { return fail(502, (e as Error).message); } });
  app.post('/v1/admin/runpod/volumes', async (req) => { const a = await admin(req); try { const r = await runpod.creerVolume((req.body || {}) as Record<string, unknown>); await journaliser(db, a.auth.uid, 'runpod_volume_cree', undefined, req.body); return r; } catch (e) { return fail(502, (e as Error).message); } });
  app.patch('/v1/admin/runpod/endpoints/:id', async (req) => { const a = await admin(req); try { const r = await runpod.majEndpoint((req.params as any).id, (req.body || {}) as Record<string, unknown>); await journaliser(db, a.auth.uid, 'runpod_endpoint', (req.params as any).id, req.body); return r; } catch (e) { return fail(502, (e as Error).message); } });
}
