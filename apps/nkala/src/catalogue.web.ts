import { normaliserRecherche, texteRecherche, type QuestionnaireItem, type StockageCatalogue } from '@nkala/noyau';

// Sur le web, l'application d'origine (src/) garde IndexedDB ; ici une copie en mémoire suffit à l'aperçu.
const fiches = new Map<string, QuestionnaireItem>();
let etat: { curseur: string | null; epoque: string | null } = { curseur: null, epoque: null };

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
  async rechercher({ dialecte, texte, limite, decalage }) {
    const q = normaliserRecherche(texte || '');
    return [...fiches.keys()].sort().map(id => fiches.get(id)!)
      .filter(f => (!dialecte || f.dialect === dialecte) && (!q || texteRecherche(f).includes(q)))
      .slice(decalage, decalage + limite);
  },
  async parIds(ids) {
    return ids.map(id => fiches.get(id)).filter((f): f is QuestionnaireItem => !!f);
  },
};
