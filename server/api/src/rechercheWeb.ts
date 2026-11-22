/**
 * Recherche web de Kak'Igonjo, sans frais (demande de Capp, 22 nov. 2026) : moteur SearXNG hébergé chez nous (server/searxng,
 * 172.17.0.1:8710), qui interroge les moteurs publics sans clé ni abonnement.
 *
 * Le modèle décide seul : s'il lui manque une information récente ou un fait de culture générale, il répond seulement
 * `[[recherche: mots-clés]]` ; le serveur cherche, puis lui repose la question avec les résultats (deux appels, seulement dans ce cas).
 * Jamais pour le myènè (mots, grammaire, traduction : seuls le corpus et les règles comptent), jamais en mode enfant.
 *
 * Variable : SEARXNG_URL (http://172.17.0.1:8710). Sans elle, ou avec le réglage `rechercheWeb: false`, rien ne change.
 */
import type { DemandeIa, FournisseurIa, ReponseIaFournisseur } from './ia.ts';

export interface ResultatWeb { titre: string; url: string; extrait: string }

export const rechercheDisponible = (env = process.env) => !!(env.SEARXNG_URL || '').trim();

export const CONSIGNE_RECHERCHE = `

### Recherche sur Internet
- Si la question demande une information récente ou un fait que ni ta connaissance ni le contexte ne donnent (actualité, date, personne, lieu, chiffre…), réponds UNIQUEMENT par : [[recherche: quelques mots-clés]] — rien d'autre. On te redonnera la question avec les résultats.
- Pour ces questions-là, ne réponds jamais « je ne sais pas » sans avoir d'abord demandé une recherche.
- Jamais pour le myènè (mot, grammaire, traduction, phonétique) : là, seuls ta connaissance du myènè, le lexique et le contexte comptent.`;

const RE_DEMANDE = /\[\[\s*recherche\s*:\s*([^\]\n]{2,200})\]\]/i;
/**
 * Repli (essai du 22 nov. 2026 : à « Qui est le président du Gabon aujourd'hui ? », le modèle a répondu « je ne le sais pas »
 * au lieu de demander une recherche) : un aveu d'ignorance sur une question qui ne porte pas sur le myènè déclenche la recherche
 * avec la question elle-même.
 */
const RE_IGNORANCE = /je ne (le |la |les )?(sais|connais) pas|je n'en sais rien|je ne suis pas (sûr|certain)|je n'ai pas (cette|l')information/i;
const RE_QUESTION_MYENE = /my[eè]n[eè]|[oô]rungu|mpongw|galwa|nkomi|traduis|tradui[st]|comment (dit|dire|écri)|que veut dire|ça veut dire|en v3|graphie|phon[eé]ti/i;
export function rechercheDeRepli(reponse: string, question: string): string | null {
  if (!RE_IGNORANCE.test(reponse) || RE_QUESTION_MYENE.test(question) || question.trim().length < 6) return null;
  return question.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** Requête demandée par le modèle, ou null. */
export const demandeRecherche = (texte: string): string | null => texte.match(RE_DEMANDE)?.[1].trim() ?? null;

/** Interroge le moteur hébergé (JSON). Une panne ou un délai renvoie une liste vide : la réponse part sans résultats. */
export async function rechercherWeb(requete: string, n = 5, env = process.env): Promise<ResultatWeb[]> {
  const base = (env.SEARXNG_URL || '').replace(/\/+$/, '');
  if (!base) return [];
  const url = `${base}/search?${new URLSearchParams({ q: requete.slice(0, 200), format: 'json', language: 'fr', safesearch: '2' })}`;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return [];
    const j: any = await r.json();
    return (Array.isArray(j.results) ? j.results : [])
      .filter((x: any) => x?.url && (x.title || x.content))
      .slice(0, n)
      .map((x: any) => ({ titre: String(x.title ?? '').slice(0, 160), url: String(x.url).slice(0, 300), extrait: String(x.content ?? '').replace(/\s+/g, ' ').slice(0, 400) }));
  } catch { return []; }
}

export const blocResultats = (requete: string, res: ResultatWeb[]) => `

### Résultats de recherche sur Internet (pour : « ${requete} ») — informations non vérifiées : présente-les comme telles, cite le site si utile ; n'en tire jamais un mot ni une règle de myènè. Ne demande plus de recherche.
${res.length ? res.map((x, i) => `[W${i + 1}] ${x.titre} (${new URL(x.url).hostname}) : ${x.extrait}`).join('\n') : 'Aucun résultat : dis simplement que tu n\'as pas trouvé.'}`;

/**
 * Réponse du modèle avec recherche web éventuelle. `actif` : réglage + moteur disponible + pas un enfant.
 * La consigne n'est ajoutée qu'à la demande ; l'usage des deux appels est additionné (coût réel).
 */
export async function repondreAvecRecherche(ia: FournisseurIa, demande: DemandeIa, actif: boolean, env = process.env): Promise<ReponseIaFournisseur & { recherche?: { requete: string; resultats: ResultatWeb[] } }> {
  if (!actif) return ia.repondre(demande);
  const r1 = await ia.repondre({ ...demande, systeme: demande.systeme + CONSIGNE_RECHERCHE });
  const question = [...demande.messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const requete = demandeRecherche(r1.texte) ?? rechercheDeRepli(r1.texte, question);
  if (!requete) return r1;
  const resultats = await rechercherWeb(requete, 5, env);
  const r2 = await ia.repondre({ ...demande, systeme: demande.systeme + blocResultats(requete, resultats) });
  return {
    ...r2,
    texte: r2.texte.replace(RE_DEMANDE, '').trim() || 'Je n\'ai pas trouvé, mon enfant.',
    usage: { entree: r1.usage.entree + r2.usage.entree, sortie: r1.usage.sortie + r2.usage.sortie, cache: (r1.usage.cache ?? 0) + (r2.usage.cache ?? 0) },
    recherche: { requete, resultats },
  };
}
