import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { MYENE } from '@nkala/noyau';
import { Bouton, Carte, Ecran, Ic, Mascotte, Onde, T } from '../src/kit';
import { Logo } from '../src/Fond';
import { usePrefs, useTheme, type ModeUsage } from '../src/Prefs';

const PAGES = [
  { icone: 'village', titre: 'Chez toi, où que tu sois', texte: 'Nkala, c\'est le village dans ta poche : apprendre la langue, jouer, écouter et retrouver les tiens.' },
  { icone: 'jouer', titre: 'Quatre portes, un seul compte', texte: 'Apprendre avec Onenji, jouer avec Azeva, écouter avec Ontci, vivre au village avec Nkala. Ton XP te suit partout.' },
  { icone: 'micro', titre: 'Ta voix compte', texte: 'Chaque mot que tu enregistres aide à garder la langue vivante pour les générations qui viennent.' },
];

/** Écrans 01 à 05 : démarrage animé, trois pages d'accueil, choix du mode (adulte, enfant, lecture facile). */
export default function Entree() {
  const { regler } = usePrefs();
  const { c } = useTheme();
  const [etape, setEtape] = useState(-1); // -1 démarrage, 0-2 pages, 3 mode
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(op, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const t = setTimeout(() => setEtape(0), 1800);
    return () => clearTimeout(t);
  }, [op]);

  const choisir = (mode: ModeUsage) => regler({ mode, entreeVue: true });

  if (etape === -1) return (
    <Ecran defile={false} contenu={{ alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <Animated.View style={{ opacity: op, alignItems: 'center', gap: 16 }}>
        <Logo taille={96} />
        <T v="titre">Nkala</T>
        <Onde barres={14} hauteur={40} />
        <T v="corps" style={{ fontStyle: 'italic' }}>{MYENE.NKALA.mot} · {MYENE.NKALA.sens.toLowerCase()}</T>
      </Animated.View>
    </Ecran>
  );

  if (etape <= 2) {
    const p = PAGES[etape];
    return (
      <Ecran defile={false} contenu={{ justifyContent: 'space-between', paddingBottom: 32 }}>
        <View style={{ alignItems: 'flex-end' }}><Bouton label="Passer" variante="fantome" petit large={false} onPress={() => setEtape(3)} /></View>
        <View style={{ alignItems: 'center', gap: 18 }}>
          {etape === 2 ? <Mascotte taille={150} humeur="parle" /> : <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bordAmbre, alignItems: 'center', justifyContent: 'center' }}><Ic nom={p.icone} taille={64} couleur={c.accent} /></View>}
          <T v="titre" style={{ textAlign: 'center' }}>{p.titre}</T>
          <T v="corps" style={{ textAlign: 'center' }}>{p.texte}</T>
        </View>
        <View style={{ gap: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>{PAGES.map((_, i) => <View key={i} style={{ width: i === etape ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === etape ? c.accent : c.bord }} />)}</View>
          <Bouton label={etape === 2 ? 'C\'est parti' : 'Suivant'} onPress={() => setEtape(etape + 1)} />
        </View>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <T v="titre">Comment veux-tu utiliser Nkala ?</T>
      <T v="corps">Tu pourras changer plus tard dans les réglages.</T>
      <Carte onPress={() => choisir('adulte')} label="Mode adulte"><View style={{ padding: 18, gap: 6 }}><T v="carte">Adulte ou ado</T><T v="petit">Toutes les fonctions : apprendre, jouer, écouter, village.</T></View></Carte>
      <Carte onPress={() => choisir('enfant')} label="Mode enfant"><View style={{ padding: 18, gap: 6 }}><T v="carte">Enfant</T><T v="petit">Sans lecture : icônes, sons, grands boutons. Choisi par un parent. Pas de publicité, durée de jeu limitée.</T></View></Carte>
      <Carte onPress={() => choisir('facile')} label="Lecture facile"><View style={{ padding: 18, gap: 6 }}><T v="carte">Lecture facile</T><T v="petit">Gros caractères et interface épurée.</T></View></Carte>
    </Ecran>
  );
}
