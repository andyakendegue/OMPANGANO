/**
 * RunPod : gestion des pods (GPU à la demande), des endpoints serverless et des volumes réseau, depuis la console d'administration.
 * Variables : RUNPOD_API_KEY (gestion), RUNPOD_REST_URL (défaut https://rest.runpod.io/v1).
 * Sans clé : mode simulation (données fictives) pour développer la console avant d'ouvrir le compte.
 * Les routes REST de RunPod sont à vérifier avec votre compte (la documentation évolue) : tout passe par `appel()`, un seul endroit à ajuster.
 */
export interface EtatRunpod { simule: boolean; pods: any[]; endpoints: any[]; volumes: any[]; erreur?: string }

export function clientRunpod(env = process.env) {
  const cle = env.RUNPOD_API_KEY, base = (env.RUNPOD_REST_URL || 'https://rest.runpod.io/v1').replace(/\/+$/, '');
  const simule = !cle;
  const sim = { pods: [{ id: 'pod-sim-1', name: 'llm-kakigonjo', desiredStatus: 'RUNNING', gpu: 'A40', costPerHr: 0.4 }], endpoints: [{ id: 'ep-sim-1', name: 'embeddings', workersMin: 0, workersMax: 2 }, { id: 'ep-sim-2', name: 'llm-vllm', workersMin: 0, workersMax: 1 }], volumes: [{ id: 'vol-sim-1', name: 'modeles', size: 100, dataCenterId: 'EU-RO-1' }] };
  async function appel(methode: string, chemin: string, corps?: unknown): Promise<any> {
    const r = await fetch(`${base}${chemin}`, { method: methode, headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps) });
    if (!r.ok) throw new Error(`RunPod ${r.status} ${(await r.text().catch(() => '')).slice(0, 160)}`);
    return r.status === 204 ? {} : r.json();
  }
  return {
    simule,
    async etat(): Promise<EtatRunpod> {
      if (simule) return { simule, ...sim };
      const [pods, endpoints, volumes] = await Promise.allSettled([appel('GET', '/pods'), appel('GET', '/endpoints'), appel('GET', '/networkvolumes')]);
      const v = (x: PromiseSettledResult<any>) => (x.status === 'fulfilled' ? (Array.isArray(x.value) ? x.value : x.value?.items ?? []) : []);
      const err = [pods, endpoints, volumes].find(x => x.status === 'rejected') as PromiseRejectedResult | undefined;
      return { simule, pods: v(pods), endpoints: v(endpoints), volumes: v(volumes), erreur: err ? String(err.reason?.message ?? err.reason) : undefined };
    },
    async podAction(id: string, action: 'start' | 'stop' | 'restart') { if (simule) return { ok: true, simule, id, action }; return appel('POST', `/pods/${encodeURIComponent(id)}/${action}`); },
    async creerPod(corps: Record<string, unknown>) { if (simule) return { simule, id: 'pod-sim-' + Date.now(), ...corps }; return appel('POST', '/pods', corps); },
    async supprimerPod(id: string) { if (simule) return { ok: true, simule }; return appel('DELETE', `/pods/${encodeURIComponent(id)}`); },
    async creerVolume(corps: Record<string, unknown>) { if (simule) return { simule, id: 'vol-sim-' + Date.now(), ...corps }; return appel('POST', '/networkvolumes', corps); },
    async majEndpoint(id: string, corps: Record<string, unknown>) { if (simule) return { simule, id, ...corps }; return appel('PATCH', `/endpoints/${encodeURIComponent(id)}`, corps); },
  };
}
export type ClientRunpod = ReturnType<typeof clientRunpod>;
