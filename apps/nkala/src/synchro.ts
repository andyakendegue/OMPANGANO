import { synchroniserCatalogue } from '@nkala/noyau';
import { catalogue } from './catalogue';
import { donneesChangees } from './donnees';
import { definirSync, lireSync, reglerCatalogue } from './syncEtat';

let enCours: Promise<{ ok: boolean; changees: number }> | null = null;
/** En dessous de ce volume le téléchargement est trop rapide pour mériter un indicateur (comme sur le web). */
const MIN_A_AFFICHER = 500;
/** Fiches déjà reçues par les synchronisations enchaînées à moins de 5 s : le compteur ne repart pas de zéro. */
let episode = 0;
let minuteur: ReturnType<typeof setTimeout> | null = null;

/** Synchronisation du catalogue : une seule à la fois, avec progression visible (« Téléchargement x / y »). */
export function lancerSynchro(): Promise<{ ok: boolean; changees: number }> {
  if (enCours) return enCours;
  enCours = (async () => {
    let affiche = false;
    const r = await synchroniserCatalogue(catalogue, p => {
      if (p.total < MIN_A_AFFICHER) return;
      affiche = true;
      definirSync({ genre: 'telechargement', fait: episode + p.fait, total: episode + p.total });
    });
    if (lireSync().genre === 'telechargement') definirSync({ genre: null, fait: 0, total: 0 });
    if (affiche && r.ok) {
      episode += r.changees;
      if (minuteur) clearTimeout(minuteur);
      minuteur = setTimeout(() => { episode = 0; minuteur = null; }, 5000);
    }
    if (r.changees > 0) donneesChangees();
    return r;
  })().finally(() => { enCours = null; reglerCatalogue(); });
  return enCours;
}
