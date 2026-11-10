/**
 * Base vectorielle du RAG. VECTOR_URL vide : les vecteurs restent dans PostgreSQL (jsonb), la similarité est calculée par l'API (suffisant jusqu'à quelques milliers de morceaux).
 * VECTOR_URL=http://172.17.0.1:6333 : Qdrant (VECTOR_API_KEY facultatif, VECTOR_COLLECTION, défaut « nkala_rag ») ; PostgreSQL garde le texte et les documents.
 */
export interface Vecteurs {
  actif: boolean;
  assurer(dim: number): Promise<void>;
  remplacer(documentId: string, points: { id: number; vecteur: number[] }[]): Promise<void>;
  supprimer(documentId: string): Promise<void>;
  chercher(vecteur: number[], k: number): Promise<{ id: number; score: number }[]>;
}

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
    async assurer(dim) { if (pret === dim) return; await appel('PUT', `/collections/${nom}`, { vectors: { size: dim, distance: 'Cosine' } }, [409]); pret = dim; },
    async remplacer(documentId, points) {
      await this.supprimer(documentId);
      if (points.length) await appel('PUT', `/collections/${nom}/points?wait=true`, { points: points.map(p => ({ id: p.id, vector: p.vecteur, payload: { document_id: documentId } })) });
    },
    async supprimer(documentId) { await appel('POST', `/collections/${nom}/points/delete?wait=true`, { filter: { must: [{ key: 'document_id', match: { value: documentId } }] } }, [404]); },
    async chercher(vecteur, k) { const j = await appel('POST', `/collections/${nom}/points/search`, { vector: vecteur, limit: k * 3, with_payload: false }); return (j?.result ?? []).map((x: any) => ({ id: Number(x.id), score: x.score })); },
  };
}
