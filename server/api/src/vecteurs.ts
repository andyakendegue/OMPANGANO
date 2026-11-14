/**
 * Base vectorielle du RAG. VECTOR_URL vide : les vecteurs restent dans PostgreSQL (jsonb), la similarité est calculée par l'API (suffisant jusqu'à quelques milliers de morceaux).
 * VECTOR_URL=http://172.17.0.1:6333 : Qdrant (VECTOR_API_KEY facultatif, VECTOR_COLLECTION, défaut « nkala_rag ») ; PostgreSQL garde le texte et les documents.
 * Mémoire (budget ~6 Go) : vecteurs complets sur disque (mmap, Qdrant ne charge que les pages utiles), copie quantifiée int8 en RAM
 * (4 fois plus petite), charges utiles sur disque. La recherche parcourt la copie int8 puis re-note les meilleurs candidats avec les vecteurs complets.
 */
export interface Vecteurs {
  actif: boolean;
  assurer(dim: number): Promise<void>;
  remplacer(documentId: string, points: { id: number; vecteur: number[] }[]): Promise<void>;
  supprimer(documentId: string): Promise<void>;
  chercher(vecteur: number[], k: number): Promise<{ id: number; score: number }[]>;
}

// Quantification scalaire int8 : quantile 0.99 écarte les valeurs extrêmes ; always_ram garde la copie compacte en mémoire vive
const QUANTIFICATION = { scalar: { type: 'int8', quantile: 0.99, always_ram: true } };
// Recherche : candidats tirés de la copie int8 (x2), puis re-notés avec les vecteurs complets lus sur disque
const RECHERCHE = { quantization: { ignore: false, rescore: true, oversampling: 2.0 } };

export function vecteursParDefaut(env = process.env): Vecteurs {
  const base = (env.VECTOR_URL || '').replace(/\/+$/, ''), nom = env.VECTOR_COLLECTION || 'nkala_rag';
  if (!base) return { actif: false, assurer: async () => {}, remplacer: async () => {}, supprimer: async () => {}, chercher: async () => [] };
  const h = { 'Content-Type': 'application/json', ...(env.VECTOR_API_KEY ? { 'api-key': env.VECTOR_API_KEY } : {}) };
  const appel = async (m: string, chemin: string, corps?: unknown, tolere: number[] = []) => {
    const r = await fetch(`${base}${chemin}`, { method: m, headers: h, body: corps === undefined ? undefined : JSON.stringify(corps) });
    if (!r.ok && !tolere.includes(r.status)) throw new Error(`Qdrant ${m} ${chemin} : ${r.status} ${(await r.text().catch(() => '')).slice(0, 120)}`);
    return r.ok ? r.json() as Promise<any> : null;
  };
  let pret = 0;
  return {
    actif: true,
    async assurer(dim) {
      if (pret === dim) return;
      // Changement de modèle d'embedding (simulation 128 -> bge-m3 1024) : la collection est recréée, les documents se réindexent ensuite
      const info = await appel('GET', `/collections/${nom}`, undefined, [404]);
      const taille = info?.result?.config?.params?.vectors?.size;
      if (taille && taille !== dim) await appel('DELETE', `/collections/${nom}`);
      if (!taille || taille !== dim) await appel('PUT', `/collections/${nom}`, {
        vectors: { size: dim, distance: 'Cosine', on_disk: true },
        on_disk_payload: true,
        quantization_config: QUANTIFICATION,
      }, [409]);
      else if (!info?.result?.config?.quantization_config || info?.result?.config?.params?.vectors?.on_disk !== true) {
        // Collection créée avant ces réglages : mise à jour sur place (Qdrant reconstruit les segments en arrière-plan, sans réindexer)
        // Échec toléré : la recherche fonctionne sans ces réglages, seule la mémoire en pâtit
        await appel('PATCH', `/collections/${nom}`, { vectors: { '': { on_disk: true } }, params: { on_disk_payload: true }, quantization_config: QUANTIFICATION })
          .catch(e => console.warn('[vecteurs] réglages mémoire non appliqués :', (e as Error).message));
      }
      pret = dim;
    },
    async remplacer(documentId, points) {
      await this.supprimer(documentId);
      if (points.length) await appel('PUT', `/collections/${nom}/points?wait=true`, { points: points.map(p => ({ id: p.id, vector: p.vecteur, payload: { document_id: documentId } })) });
    },
    async supprimer(documentId) { await appel('POST', `/collections/${nom}/points/delete?wait=true`, { filter: { must: [{ key: 'document_id', match: { value: documentId } }] } }, [404]); },
    async chercher(vecteur, k) { const j = await appel('POST', `/collections/${nom}/points/search`, { vector: vecteur, limit: k * 3, with_payload: false, params: RECHERCHE }); return (j?.result ?? []).map((x: any) => ({ id: Number(x.id), score: x.score })); },
  };
}
