// Interrupteurs de fonctionnalités : chaque module de Nkala se publie séparément.
export type ModuleId = 'ompangano' | 'onenji' | 'streaming' | 'traducteur' | 'annonces';

export const MODULES: Record<ModuleId, { label: string; actif: boolean }> = {
  ompangano: { label: 'Ompangano (collecte)', actif: true },
  onenji: { label: 'Onenji (apprentissage)', actif: true },
  streaming: { label: 'Écoute (Essaka Play)', actif: false },
  traducteur: { label: 'Traducteur', actif: false },
  annonces: { label: 'Annonces', actif: false },
};

export const moduleActif = (id: ModuleId): boolean => MODULES[id].actif;
