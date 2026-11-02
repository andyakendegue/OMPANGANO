import { obtenirJeton, urlApi } from './api';

type Fetch = (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; body: { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }> } } | null }>;

/**
 * Signal de modification (flux /v1/events, SSE). Le `fetch` à utiliser est fourni par l'application (celui d'Expo sait lire un flux).
 * Reconnexion automatique avec attente croissante ; `surReconnexion` demande une relecture : des événements ont pu être manqués.
 */
export function ecouterModifications(fetchFlux: Fetch, surChangement: (collection: string) => void, surReconnexion?: () => void): () => void {
  let arrete = false;
  let dejaConnecte = false;
  let controleur: AbortController | null = null;

  const boucle = async () => {
    let delai = 2000;
    while (!arrete) {
      try {
        controleur = new AbortController();
        const jeton = await obtenirJeton(false);
        if (!jeton) { await new Promise(r => setTimeout(r, 5000)); continue; }
        const res = await fetchFlux(`${urlApi()}/v1/events`, { headers: { Authorization: `Bearer ${jeton}` }, signal: controleur.signal });
        if (!res.ok || !res.body) throw new Error(`events ${res.status}`);
        delai = 2000;
        if (dejaConnecte) surReconnexion?.();
        dejaConnecte = true;
        const lecteur = res.body.getReader();
        const decodeur = new TextDecoder();
        let tampon = '';
        for (;;) {
          const { done, value } = await lecteur.read();
          if (done) break;
          tampon += decodeur.decode(value, { stream: true });
          let i: number;
          while ((i = tampon.indexOf('\n\n')) >= 0) {
            const bloc = tampon.slice(0, i);
            tampon = tampon.slice(i + 2);
            const ligne = bloc.split('\n').find(l => l.startsWith('data:'));
            if (!ligne) continue;
            try { surChangement(JSON.parse(ligne.slice(5)).collection); } catch { /* ligne mal formée */ }
          }
        }
      } catch {
        if (arrete) return;
      }
      await new Promise(r => setTimeout(r, delai));
      delai = Math.min(delai * 2, 60_000);
    }
  };
  boucle();
  return () => { arrete = true; controleur?.abort(); };
}
