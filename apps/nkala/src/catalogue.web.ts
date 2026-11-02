import { melanger, normaliserRecherche, texteRecherche, type QuestionnaireItem, type StockageCatalogue } from '@nkala/noyau';

// Sur le web, l'application d'origine (src/) garde IndexedDB ; ici une copie en mémoire suffit à l'aperçu.
const fiches = new Map<string, QuestionnaireItem>();
let etat: { curseur: string | null; epoque: string | null } = { curseur: null, epoque: null };

function trier({ dialecte, texte, categorie, dialectes }: { dialecte?: string | null; texte?: string; categorie?: string | null; dialectes?: string[] }) {
  const q = normaliserRecherche(texte || '');
  return [...fiches.keys()].sort().map(id => fiches.get(id)!).filter(f =>
    (!dialecte || f.dialect === dialecte) && (!dialectes?.length || dialectes.includes(String(f.dialect))) &&
    (!categorie || (f.category || f.theme || 'general') === categorie) && (!q || texteRecherche(f).includes(q)));
}

export const catalogue: StockageCatalogue = {
  async lireCurseur() { return etat; },
  async ecrirePage(f, supprimees, curseur, epoque) {
    f.forEach(x => fiches.set(x.id, x));
    supprimees.forEach(id => fiches.delete(id));
    etat = { curseur: curseur ?? etat.curseur, epoque: epoque ?? etat.epoque };
  },
  async vider() { fiches.clear(); etat = { curseur: null, epoque: null }; },
  async compter() { return fiches.size; },
  async suivante(dialecte, apresId) {
    const ids = [...fiches.keys()].sort();
    for (const id of ids) {
      const f = fiches.get(id)!;
      if ((!dialecte || f.dialect === dialecte) && (!apresId || id > apresId)) return f;
    }
    return null;
  },
  async rechercher({ dialecte, texte, categorie, dialectes, limite, decalage }) {
    return trier({ dialecte, texte, categorie, dialectes }).slice(decalage, decalage + limite);
  },
  async compterRecherche(req) { return trier(req).length; },
  async compteursThemes(dialectes) {
    const m: Record<string, number> = {};
    for (const f of fiches.values()) {
      if (dialectes?.length && !dialectes.includes(String(f.dialect))) continue;
      const c = f.category || (f.theme as string) || 'general'; m[c] = (m[c] || 0) + 1;
    }
    return m;
  },
  async identifiants({ dialectes, categorie }) {
    return [...fiches.values()]
      .filter(f => (!dialectes?.length || dialectes.includes(String(f.dialect))) && (!categorie || (f.category || f.theme) === categorie))
      .map(f => f.id).sort();
  },
  async compteursDialectes() {
    const m: Record<string, number> = {};
    for (const f of fiches.values()) m[String(f.dialect)] = (m[String(f.dialect)] || 0) + 1;
    return m;
  },
  async fiche(id) { return fiches.get(id) ?? null; },
  async aleatoires(dialecte, n) {
    return melanger([...fiches.values()].filter(f => !dialecte || f.dialect === dialecte)).slice(0, n);
  },
  async parIds(ids) {
    return ids.map(id => fiches.get(id)).filter((f): f is QuestionnaireItem => !!f);
  },
  async doublons(limite) {
    const par = new Map<string, string[]>();
    for (const f of fiches.values()) {
      const cle = `${f.dialect}\u0001${texteRecherche(f)}`;
      par.set(cle, [...(par.get(cle) || []), f.id]);
    }
    return [...par].filter(([, ids]) => ids.length > 1).slice(0, limite)
      .map(([cle, ids]) => { const [dialecte, fr, my] = cle.split('\u0001'); return { dialecte, texte: `${my} = ${fr}`, ids }; });
  },
};
