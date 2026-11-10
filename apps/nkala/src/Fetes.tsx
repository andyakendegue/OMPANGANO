/** Écrans de fête : nouveau rang et succès débloqué (confettis plafonnés sur appareil modeste). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, View } from 'react-native';
import type { Rang } from '@nkala/noyau';
import { Confettis } from './Confettis';
import { Ic, Mascotte, T, Bouton } from './kit';
import { usePrefs, useTheme } from './Prefs';
import { mouvement } from './theme';

export type Fete = { type: 'rang'; rang: Rang } | { type: 'succes'; titre: string; xp: number };
const Ctx = createContext<{ feter: (f: Fete) => void }>({ feter: () => {} });
export const useFetes = () => useContext(Ctx);

export function FetesProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<Fete[]>([]);
  const feter = useCallback((f: Fete) => setFile(l => [...l, f]), []);
  const courante = file[0];
  const { c } = useTheme();
  const { prefs, vibrer, reduireAnim } = usePrefs();
  useEffect(() => { if (courante) vibrer('succes'); }, [courante]); // eslint-disable-line react-hooks/exhaustive-deps
  const valeur = useMemo(() => ({ feter }), [feter]);
  return (
    <Ctx.Provider value={valeur}>
      {children}
      <Modal visible={!!courante} transparent animationType="fade" onRequestClose={() => setFile(l => l.slice(1))}>
        <View style={{ flex: 1, backgroundColor: 'rgba(8,4,2,0.82)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          {courante && !reduireAnim && <Confettis declencheur nombre={prefs.animations === 'legeres' ? mouvement.confettisModeste : mouvement.confettisMax} />}
          {courante && (
            <View style={{ width: '100%', maxWidth: 380, borderRadius: 28, padding: 26, alignItems: 'center', gap: 14, backgroundColor: c.fond2, borderWidth: 1, borderColor: c.bordAmbre }}>
              {courante.type === 'rang' ? <>
                <Mascotte taille={110} humeur="content" />
                <T v="libelle">Nouveau rang</T>
                <T v="titre" style={{ textAlign: 'center' }}>{courante.rang.nom}</T>
                <T v="corps" style={{ textAlign: 'center' }}>{courante.rang.description}</T>
              </> : <>
                <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: c.carte, borderWidth: 2, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><Ic nom="coupe" taille={44} couleur={c.accent} /></View>
                <T v="libelle">Succès débloqué</T>
                <T v="titre" style={{ textAlign: 'center' }}>{courante.titre}</T>
                {courante.xp > 0 && <T v="corps">+{courante.xp} XP</T>}
              </>}
              <Bouton label="Continuer" variante="ambre" onPress={() => setFile(l => l.slice(1))} />
            </View>
          )}
        </View>
      </Modal>
    </Ctx.Provider>
  );
}
