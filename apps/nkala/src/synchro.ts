import { synchroniserCatalogue } from '@nkala/noyau';
import { catalogue } from './catalogue';
import { donneesChangees } from './donnees';
import { definirSync, lireSync } from './syncEtat';

let enCours: Promise<{ ok: boolean; changees: number }> | null = null;

/** Synchronisation du catalogue : une seule à la fois, avec progression visible (« Téléchargement x / y »). */
export function lancerSynchro(): Promise<{ ok: boolean; changees: number }> {
  if (enCours) return enCours;
  enCours = (async () => {
    const r = await synchroniserCatalogue(catalogue, p => definirSync({ genre: 'telechargement', fait: p.fait, total: p.total }));
    if (lireSync().genre === 'telechargement') definirSync({ genre: null, fait: 0, total: 0 });
    if (r.changees > 0) donneesChangees();
    return r;
  })().finally(() => { enCours = null; });
  return enCours;
}
