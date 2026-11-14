/**
 * État local d'Onenji : résultat du test de niveau et exercices à revoir (erreurs).
 * Gardés sur l'appareil (AsyncStorage) ; le serveur n'en a pas besoin pour ouvrir les leçons.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ResultatTest { parcoursId: string; uniteId?: string | null; bonnes: number; sur: number; le: number; parAge?: boolean }

const CLE_TEST = 'nkala.onenji.test.v1', CLE_ERREURS = 'nkala.onenji.erreurs.v1';
let test: ResultatTest | null | undefined, erreurs: string[] | undefined;
const ecouteurs = new Set<() => void>();
const prevenir = () => ecouteurs.forEach(f => f());
const charge = (async () => {
  try { const t = await AsyncStorage.getItem(CLE_TEST); test = t ? JSON.parse(t) : null; } catch { test = null; }
  try { const e = await AsyncStorage.getItem(CLE_ERREURS); erreurs = e ? JSON.parse(e) : []; } catch { erreurs = []; }
  prevenir();
})();

function useAbonne() { const [, n] = useState(0); useEffect(() => { const f = () => n(x => x + 1); ecouteurs.add(f); return () => { ecouteurs.delete(f); }; }, []); }

/** Délai avant de pouvoir repasser le test (décision : une fois par mois). */
export const DELAI_TEST_MS = 30 * 24 * 3600 * 1000;

export function useTestNiveau() {
  useAbonne();
  return {
    pret: test !== undefined,
    resultat: test ?? null,
    peutRepasser: !test || Date.now() - test.le >= DELAI_TEST_MS,
    enregistrer: async (r: ResultatTest) => { await charge; test = r; prevenir(); await AsyncStorage.setItem(CLE_TEST, JSON.stringify(r)).catch(() => {}); },
  };
}

export function useErreurs() {
  useAbonne();
  return { ids: erreurs ?? [] };
}
/** Une mauvaise réponse ajoute l'exercice à revoir ; une bonne réponse l'en retire. */
export async function noterReponse(exerciceId: string, juste: boolean) {
  await charge;
  const avant = erreurs ?? [];
  const apres = juste ? avant.filter(x => x !== exerciceId) : [exerciceId, ...avant.filter(x => x !== exerciceId)].slice(0, 200);
  if (apres.length === avant.length && apres.every((x, i) => x === avant[i])) return;
  erreurs = apres; prevenir();
  await AsyncStorage.setItem(CLE_ERREURS, JSON.stringify(apres)).catch(() => {});
}
