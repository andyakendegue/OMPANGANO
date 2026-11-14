/** Cadre commun des jeux d'Azeva : barre du haut (quitter, avancement, temps, aide « ? »), retour après une réponse, écran « sans contenu ». */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Ligne, Manche } from '@nkala/noyau';
import { Bouton, Carte, Ecran, Entete, EtatVide, Ic, T, Barre } from './kit';
import { useTheme } from './Prefs';

export interface ResultatPartie { bonnes: number; erreurs: number; secondesRestantes: number; serie: number }
export interface PropsJeu {
  jeu: Ligne; manche: Manche; dialecte: string; couleur: string;
  onFin: (r: ResultatPartie) => void; onQuitter: () => void; onBonne: () => void; onErreur: () => void; coeurs: number;
}

/** Ouvre la fenêtre « Comment jouer » du jeu en cours (fournie par JeuRunner). */
export const AideCtx = createContext<{ ouvrir: () => void; ouverte: boolean }>({ ouvrir: () => {}, ouverte: false });

/** Compte à rebours ; il s'arrête tant que la fenêtre d'aide est ouverte. */
export function useCompteArebours(secondes: number, actif: boolean, onFin: () => void) {
  const [reste, setReste] = useState(secondes);
  const { ouverte } = useContext(AideCtx);
  const fin = useRef(onFin); fin.current = onFin;
  useEffect(() => { setReste(secondes); }, [secondes]);
  useEffect(() => {
    if (!actif || secondes <= 0 || ouverte) return;
    const t = setInterval(() => setReste(r => { if (r <= 1) { clearInterval(t); setTimeout(() => fin.current(), 0); return 0; } return r - 1; }), 1000);
    return () => clearInterval(t);
  }, [actif, secondes, ouverte]);
  return reste;
}

export function Cadre({ titre, niveau, avancement, onQuitter, reste, children }: { titre: string; niveau?: string; avancement: number; onQuitter: () => void; reste?: number; children: React.ReactNode }) {
  const { c } = useTheme();
  const aide = useContext(AideCtx);
  return (
    <Ecran bas={30}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter la partie" hitSlop={10} onPress={onQuitter}><Ic nom="fermer" taille={26} /></Pressable>
        <View style={{ flex: 1 }}><Barre valeur={avancement} couleur={c.modules.azeva} /></View>
        {reste !== undefined && reste > 0 && <T v="carte" couleur={reste <= 10 ? c.erreur : c.fort} accessibilityLabel={`${reste} secondes`}>{reste} s</T>}
        <Pressable accessibilityRole="button" accessibilityLabel="Comment jouer" hitSlop={10} onPress={aide.ouvrir} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: c.modules.azeva, alignItems: 'center', justifyContent: 'center' }}><T v="carte" couleur={c.fort}>?</T></Pressable>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T v="libelle">{titre}</T>{!!niveau && <T v="petit" couleur={c.discret}>{niveau}</T>}</View>
      {children}
    </Ecran>
  );
}

export const Retour = ({ ok, texte, onSuite, libelle = 'Suivant' }: { ok: boolean; texte: string; onSuite: () => void; libelle?: string }) => {
  const { c } = useTheme();
  return (<Carte style={{ padding: 16, gap: 10, borderColor: ok ? c.succes : c.erreur }}><T v="sousTitre" couleur={ok ? c.succes : c.erreur} accessibilityRole="alert">{ok ? 'Akéwa ! Bien joué.' : 'Pas cette fois.'}</T>{!!texte && <T v="corps">{texte}</T>}<Bouton label={libelle} variante="ambre" onPress={onSuite} /></Carte>);
};

/** Écran affiché quand la manche servie ne contient pas de quoi jouer (contenu non importé ou non publié sur le serveur). */
export function SansContenu({ titre, onQuitter, texte }: { titre: string; onQuitter: () => void; texte?: string }) {
  return <Ecran><Entete titre={titre} retour={onQuitter} /><EtatVide mascotte titre="Ce jeu attend son contenu" texte={texte ?? 'Le serveur n\'a pas encore de contenu publié pour ce jeu à ce niveau. Reviens bientôt.'} /></Ecran>;
}

/** Bouton de réponse à choix, avec les couleurs de correction. */
export function Choix({ label, etat, onPress, desactive, children }: { label?: string; etat: 'neutre' | 'ok' | 'ko'; onPress: () => void; desactive?: boolean; children?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={desactive} onPress={onPress}
      style={{ minHeight: 56, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center', borderWidth: 2, backgroundColor: etat === 'ok' ? c.succes + '33' : etat === 'ko' ? c.erreur + '33' : c.carte, borderColor: etat === 'ok' ? c.succes : etat === 'ko' ? c.erreur : c.bord }}>
      {children ?? <T v="corps" fort>{label}</T>}
    </Pressable>
  );
}
