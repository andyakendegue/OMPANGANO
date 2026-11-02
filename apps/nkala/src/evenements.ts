// Petit bus d'événements pour ouvrir le guide, la FAQ… depuis n'importe quel écran.
type Nom = 'guide' | 'faq' | 'alertes' | 'horsligne' | 'onglet';
const abonnes = new Map<Nom, Set<() => void>>();
export const emettre = (n: Nom) => abonnes.get(n)?.forEach(f => f());
export const ecouter = (n: Nom, f: () => void) => {
  if (!abonnes.has(n)) abonnes.set(n, new Set());
  abonnes.get(n)!.add(f);
  return () => { abonnes.get(n)!.delete(f); };
};

// Navigation entre sous-onglets et sélection d'une fiche (équivalent de pendingSelectId du site web).
let ongletEnAttente: string | null = null;
let ficheEnAttente: string | null = null;
export const demanderOnglet = (id: string) => { ongletEnAttente = id; abonnes.get('onglet' as Nom)?.forEach(f => f()); };
export const prendreOnglet = (ids: string[]) => { const o = ongletEnAttente; if (o && ids.includes(o)) { ongletEnAttente = null; return o; } return null; };
export const demanderFiche = (id: string) => { ficheEnAttente = id; };
export const prendreFiche = () => { const f = ficheEnAttente; ficheEnAttente = null; return f; };
