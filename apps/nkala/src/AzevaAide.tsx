/**
 * « Comment jouer » : la fenêtre d'aide de chaque jeu. Un petit schéma animé montre le geste à faire (le doigt se déplace, les cases
 * s'allument dans l'ordre), suivi des règles en trois lignes. Elle s'ouvre seule la première fois qu'on joue à un type de jeu,
 * puis par le bouton « ? » de la barre du haut.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import type { Ligne, ReglesManche } from '@nkala/noyau';
import { FeuDeBois } from './FeuDeBois';
import { Bouton, T } from './kit';
import { useTheme } from './Prefs';

type Schema = 'feu' | 'cercle' | 'grille' | 'croises' | 'cartes' | 'syllabes' | 'ecoute' | 'choix' | 'ordre' | 'de' | 'paires' | 'categories' | 'trou' | 'compter' | 'tambours' | 'corps' | 'formes' | 'chemin';
interface Aide { schema: Schema; but: string; etapes: string[] }

export const AIDES: Record<string, Aide> = {
  ogoni: { schema: 'feu', but: 'Trouve le mot avant que le feu s\'éteigne.', etapes: ['Lis l\'indice en français.', 'Touche une lettre : si elle est dans le mot, elle s\'affiche.', 'Une lettre ratée fait tomber une bûche. Plus de bûches : le feu s\'éteint.'] },
  pendu: { schema: 'feu', but: 'Trouve le mot avant que le feu s\'éteigne.', etapes: ['Lis l\'indice en français.', 'Touche une lettre : si elle est dans le mot, elle s\'affiche.', 'Une lettre ratée fait tomber une bûche.'] },
  anagramme: { schema: 'cercle', but: 'Remets les lettres du cercle dans l\'ordre.', etapes: ['Lis le sens du mot.', 'Touche les lettres une à une, dans l\'ordre du mot.', 'Tu t\'es trompé ? « Effacer » et recommence avant la fin du temps.'] },
  mots_meles: { schema: 'grille', but: 'Retrouve les mots cachés dans la grille.', etapes: ['Cherche un mot de la liste.', 'Touche sa première lettre, puis sa dernière lettre.', 'Le mot trouvé se colore. Trouve-les tous.'] },
  mots_croises: { schema: 'croises', but: 'Remplis la grille à partir des définitions.', etapes: ['Touche une définition : son mot s\'allume dans la grille.', 'Écris le mot avec les lettres du bas.', 'Les lettres qui se croisent t\'aident pour le mot suivant.'] },
  mots_fleches: { schema: 'croises', but: 'La définition est dans la case, le mot suit la flèche.', etapes: ['Touche une case-flèche pour lire sa définition.', 'Écris le mot avec les lettres du bas, dans le sens de la flèche.', 'Les lettres qui se croisent t\'aident.'] },
  memoire: { schema: 'cartes', but: 'Retrouve les paires : le mot et son sens.', etapes: ['Retourne une carte, puis une autre.', 'Si le mot et son sens vont ensemble, la paire reste ouverte.', 'Sinon elles se referment : retiens leur place.'] },
  syllabes: { schema: 'syllabes', but: 'Assemble les syllabes pour former le mot.', etapes: ['Lis le sens du mot.', 'Touche les syllabes dans l\'ordre.', 'Attention : il y a des syllabes en trop.'] },
  dictee: { schema: 'ecoute', but: 'Écoute, puis écris ce que tu entends.', etapes: ['Touche le haut-parleur pour écouter (autant de fois que tu veux).', 'Écris le mot ou la phrase.', 'Touche « Vérifier ». Les accents comptent.'] },
  qcm: { schema: 'choix', but: 'Choisis la bonne traduction.', etapes: ['Lis la phrase en français.', 'Touche la phrase myènè qui veut dire la même chose.', 'Vert : c\'est juste. Rouge : la bonne réponse s\'affiche.'] },
  quiz: { schema: 'choix', but: 'Choisis la bonne réponse.', etapes: ['Lis (ou écoute) la question.', 'Touche la réponse que tu crois juste.', 'Vert : c\'est juste. Rouge : la bonne réponse s\'affiche.'] },
  ordre: { schema: 'ordre', but: 'Remets les mots dans l\'ordre de la phrase.', etapes: ['Lis la phrase en français.', 'Touche les mots dans l\'ordre : ils montent dans le cadre.', 'Touche un mot du cadre pour le retirer, puis « Vérifier ».'] },
  sequence: { schema: 'ordre', but: 'Remets les éléments dans le bon ordre.', etapes: ['Lis la consigne.', 'Touche les éléments du premier au dernier.', 'Touche un élément placé pour le retirer, puis « Vérifier ».'] },
  plateau: { schema: 'de', but: 'Avance jusqu\'à la dernière case.', etapes: ['Touche « Lancer le dé » : ton pion avance.', 'Case « ? » : réponds à la question pour gagner des crédits de jeu.', 'Case « + » : tu avances. Case « − » : tu recules.'] },
  relier: { schema: 'paires', but: 'Relie chaque élément à celui qui va avec.', etapes: ['Touche un élément de gauche.', 'Touche celui de droite qui lui correspond.', 'Les paires justes se colorent. Relie-les toutes.'] },
  classer: { schema: 'categories', but: 'Range chaque mot dans la bonne case.', etapes: ['Lis le mot du haut.', 'Touche la case où il va.', 'Juste : il se range. Faux : tu vois où il allait.'] },
  trous: { schema: 'trou', but: 'Trouve le mot qui manque.', etapes: ['Lis la phrase : un mot est remplacé par un trait.', 'Touche le mot qui va dans le trou.', 'La phrase complète s\'affiche avec son sens.'] },
  compter: { schema: 'compter', but: 'Compte, puis choisis le nombre.', etapes: ['Compte les noisettes.', 'Touche le nombre écrit en myènè.', 'Plus le niveau monte, plus il y a de noisettes.'] },
  rythme: { schema: 'tambours', but: 'Écoute le rythme, puis rejoue-le.', etapes: ['Regarde et écoute : les tambours s\'allument l\'un après l\'autre.', 'Tape les tambours dans le même ordre.', '« Réécouter » rejoue le rythme.'] },
  zones: { schema: 'corps', but: 'Touche la bonne partie du dessin.', etapes: ['Lis le mot en myènè.', 'Touche le rond placé sur la bonne partie.', 'Vert : c\'est juste. Rouge : le bon rond s\'allume.'] },
  suites: { schema: 'formes', but: 'Trouve la forme qui continue la suite.', etapes: ['Regarde la suite : elle se répète.', 'Touche la forme qui vient à la place du « ? ».', 'Regarde bien la forme, la couleur et la taille.'] },
  chemin: { schema: 'chemin', but: 'Guide le personnage jusqu\'à la maison.', etapes: ['Lis le mot : il dit où aller.', 'Touche la flèche qui correspond.', 'Juste : le personnage avance d\'une case.'] },
};

const DOIGT = '👆';

/** Schéma animé : `pas` avance toutes les 900 ms ; chaque schéma s'en sert pour allumer ses éléments dans l'ordre. */
function SchemaAnime({ schema }: { schema: Schema }) {
  const { c } = useTheme();
  const [pas, setPas] = useState(0);
  useEffect(() => { const t = setInterval(() => setPas(p => p + 1), 900); return () => clearInterval(t); }, []);
  const jaune = c.modules.azeva;
  const tuile = (texte: string, on: boolean, cle: string | number, l = 34, vert = false) => (
    <View key={cle} style={{ width: l, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: vert ? c.succes + '55' : on ? jaune : c.carte, borderWidth: 1.5, borderColor: on ? jaune : c.bord }}>
      <T v="petit" fort couleur={on && !vert ? '#170D08' : c.fort}>{texte}</T>
    </View>
  );
  const doigt = (visible = true) => <T v="sousTitre" style={{ opacity: visible ? 1 : 0, marginTop: -6 }}>{DOIGT}</T>;
  const rangee = (enfants: React.ReactNode, gap = 6) => <View style={{ flexDirection: 'row', gap, justifyContent: 'center', alignItems: 'flex-start' }}>{enfants}</View>;
  const colonne = (texte: string, on: boolean, k: number, l = 34, vert = false) => <View key={k} style={{ alignItems: 'center' }}>{tuile(texte, on, k, l, vert)}{doigt(on)}</View>;

  switch (schema) {
    case 'feu': { const k = pas % 4; return (
      <View style={{ alignItems: 'center', gap: 4 }}>
        <FeuDeBois total={6} restant={[6, 6, 4, 2][k]} largeur={130} />
        {rangee(['m', 'b', 'o', 'l', 'o'].map((l, i) => tuile(k >= 1 && (i === 0 || i === 2 || i === 4) ? l : '', false, i, 26)))}
        {rangee(['m', 'o', 'k', 'z'].map((l, i) => colonne(l, (k === 0 && i === 0) || (k === 1 && i === 1) || (k === 2 && i === 2) || (k === 3 && i === 3), i, 30, i < 2 && k > i)))}
      </View>); }
    case 'cercle': { const k = pas % 5, mot = ['n', 'a', 'g', 'o'], pos = [[40, 0], [80, 40], [40, 80], [0, 40]], ordre = [3, 0, 2, 1]; return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        {rangee(mot.map((l, i) => tuile(i < k ? l : '', i < k, i, 28)))}
        <View style={{ width: 116, height: 116 }}>{mot.map((l, i) => { const p = pos[ordre[i]]; return <View key={i} style={{ position: 'absolute', left: p[0], top: p[1], width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: i < k ? c.squelette : c.carte, borderWidth: 2, borderColor: i === k ? jaune : c.bord }}><T v="petit" fort>{l}</T>{i === k && <T v="petit" style={{ position: 'absolute', top: 22 }}>{DOIGT}</T>}</View>; })}</View>
      </View>); }
    case 'grille': { const k = pas % 4, g = ['kiwo', 'nago', 'emup', 'atri']; return (
      <View style={{ gap: 3 }}>{g.map((l, r) => <View key={r} style={{ flexDirection: 'row', gap: 3 }}>{[...l].map((x, col) => { const mot = r === 1, on = mot && ((k === 1 && col === 0) || (k === 2 && (col === 0 || col === 3))), fait = mot && k === 3; return <View key={col} style={{ width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: fait ? c.succes + '55' : on ? jaune : c.carte, borderWidth: 1, borderColor: c.bord }}><T v="petit" fort couleur={on ? '#170D08' : c.fort}>{x.toUpperCase()}</T>{((k === 1 && mot && col === 0) || (k === 2 && mot && col === 3)) && <T v="petit" style={{ position: 'absolute', top: 16 }}>{DOIGT}</T>}</View>; })}</View>)}</View>); }
    case 'croises': { const k = pas % 5, h = ['n', 'a', 'g', 'o'], v = ['o', 'd', 'o']; return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ width: 4 * 31, height: 3 * 31 }}>
          {h.map((l, i) => <View key={'h' + i} style={{ position: 'absolute', left: i * 31, top: 0, width: 28, height: 28, borderRadius: 6, borderWidth: 1.5, borderColor: jaune, backgroundColor: c.carte, alignItems: 'center', justifyContent: 'center' }}><T v="petit" fort>{i < k ? l.toUpperCase() : ''}</T></View>)}
          {v.slice(1).map((l, i) => <View key={'v' + i} style={{ position: 'absolute', left: 3 * 31, top: (i + 1) * 31, width: 28, height: 28, borderRadius: 6, borderWidth: 1.5, borderColor: c.bord, backgroundColor: c.carte, alignItems: 'center', justifyContent: 'center' }}><T v="petit" fort>{k >= 4 ? '' : ''}</T></View>)}
        </View>
        <T v="petit">→ La maison</T>
        {rangee(['a', 'g', 'n', 'o'].map((l, i) => colonne(l, h[k % 4] === l && k < 4, i, 28)))}
      </View>); }
    case 'cartes': { const k = pas % 4, cartes = ['Nago', '?', 'Maison', '?']; return rangee(cartes.map((t, i) => { const ouverte = (i === 0 && k >= 1) || (i === 2 && k >= 2); return <View key={i} style={{ alignItems: 'center' }}><View style={{ width: 56, height: 70, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: ouverte ? (k === 3 ? c.succes + '55' : c.carte) : jaune, borderWidth: 1.5, borderColor: c.bord }}><T v="petit" fort couleur={ouverte ? c.fort : '#170D08'}>{ouverte ? t : '?'}</T></View>{doigt((i === 0 && k === 1) || (i === 2 && k === 2))}</View>; }), 8); }
    case 'syllabes': { const k = pas % 4, s = ['kôn', 'a', 'ré', 'dô'], ordre = [1, 0, 3]; return (
      <View style={{ alignItems: 'center', gap: 10 }}>
        {rangee(ordre.map((idx, i) => tuile(i < k ? s[idx] : '', i < k, i, 44)))}
        {rangee(s.map((x, i) => colonne(x, ordre[k] === i, i, 44)))}
      </View>); }
    case 'ecoute': { const k = pas % 3; return (
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: k === 0 ? jaune : c.carte, borderWidth: 2, borderColor: jaune, alignItems: 'center', justifyContent: 'center' }}><T v="sousTitre">🔊</T></View>
        <View style={{ width: 170, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: c.bord, backgroundColor: c.carte, justifyContent: 'center', paddingHorizontal: 10 }}><T v="corps">{k === 0 ? '' : k === 1 ? 'mbo…' : 'mbolo'}</T></View>
      </View>); }
    case 'choix': { const k = pas % 3, o = ['Akéwa', 'Mbolo', 'Yaga']; return (
      <View style={{ gap: 6, width: 190 }}>
        <T v="petit" fort style={{ textAlign: 'center' }}>Bonjour</T>
        {o.map((x, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ flex: 1, height: 34, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: k === 2 && i === 1 ? c.succes + '55' : c.carte, borderWidth: 1.5, borderColor: k >= 1 && i === 1 ? (k === 2 ? c.succes : jaune) : c.bord }}><T v="petit" fort>{x}</T></View><T v="petit" style={{ opacity: k === 1 && i === 1 ? 1 : 0 }}>👈</T></View>)}
      </View>); }
    case 'ordre': { const k = pas % 4, mots = ['mboni', 'Igomi', 'gni'], bon = [1, 2, 0]; return (
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ minWidth: 200, minHeight: 44, borderRadius: 10, borderWidth: 1.5, borderColor: c.bord, borderStyle: 'dashed', flexDirection: 'row', gap: 5, padding: 4, justifyContent: 'center' }}>{bon.slice(0, k).map(i => tuile(mots[i], true, i, 58))}</View>
        {rangee(mots.map((m, i) => bon.slice(0, k).includes(i) ? <View key={i} style={{ width: 58 }} /> : colonne(m, bon[k] === i, i, 58)))}
      </View>); }
    case 'de': { const k = pas % 4; return (
      <View style={{ alignItems: 'center', gap: 10 }}>
        {rangee(['1', '?', '+', '4', '★'].map((x, i) => tuile(x, i === [0, 1, 1, 3][k], i, 32)))}
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: c.fort, alignItems: 'center', justifyContent: 'center' }}><T v="sousTitre" couleur={c.fond}>{[' ', '1', '1', '2'][k]}</T></View>
        <T v="petit">{['Lance le dé', 'Tu avances', 'Réponds à la question', 'Relance'][k]}</T>
      </View>); }
    case 'paires': { const k = pas % 4, g = ['Mbwa', 'Pusi'], d = ['Le chat', 'Le chien']; return (
      <View style={{ flexDirection: 'row', gap: 26 }}>
        <View style={{ gap: 8 }}>{g.map((x, i) => tuile(x, k >= 1 && i === 0, i, 76, k === 3 && i === 0))}</View>
        <View style={{ gap: 8 }}>{d.map((x, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{tuile(x, k >= 2 && i === 1, i, 86, k === 3 && i === 1)}<T v="petit" style={{ opacity: k === 2 && i === 1 ? 1 : 0 }}>👈</T></View>)}</View>
      </View>); }
    case 'categories': { const k = pas % 3; return (
      <View style={{ alignItems: 'center', gap: 10 }}>
        {tuile('Ogô', true, 'm', 70)}
        {rangee(['Le corps', 'La maison'].map((x, i) => <View key={i} style={{ alignItems: 'center' }}><View style={{ width: 96, height: 54, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: k === 2 && i === 0 ? c.succes : c.bord, backgroundColor: k === 2 && i === 0 ? c.succes + '33' : 'transparent', alignItems: 'center', justifyContent: 'center' }}><T v="petit" fort>{x}</T>{k === 2 && i === 0 && <T v="petit">Ogô</T>}</View>{doigt(k === 1 && i === 0)}</View>), 10)}
      </View>); }
    case 'trou': { const k = pas % 3; return (
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><T v="corps" fort>Nago</T><View style={{ minWidth: 70, height: 34, borderRadius: 8, borderBottomWidth: 3, borderColor: jaune, alignItems: 'center', justifyContent: 'center', backgroundColor: k === 2 ? c.succes + '33' : 'transparent' }}><T v="corps" fort>{k === 2 ? 'ntcharo' : ''}</T></View></View>
        {rangee(['mbani', 'ntcharo', 'otani'].map((x, i) => colonne(x, k === 1 && i === 1, i, 68)))}
      </View>); }
    case 'compter': { const k = pas % 4; return (
      <View style={{ alignItems: 'center', gap: 10 }}>
        {rangee([0, 1, 2].map(i => <View key={i} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: i < Math.min(3, k + 1) ? '#8B4A22' : c.squelette, borderWidth: 2, borderColor: i === k ? jaune : 'transparent' }} />), 8)}
        {rangee(['mbani', 'ntcharo', 'nayi'].map((x, i) => colonne(x, k === 3 && i === 1, i, 68)))}
      </View>); }
    case 'tambours': { const k = pas % 7, seq = [0, 1, 0], joue = k < 3 ? seq[k] : k >= 4 ? seq[k - 4] : -1; return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        <T v="petit" fort>{k < 3 ? 'Écoute…' : k === 3 ? 'À toi !' : 'Tu rejoues'}</T>
        {rangee([0, 1].map(i => <View key={i} style={{ alignItems: 'center' }}><View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: joue === i ? jaune : c.carte, borderWidth: 4, borderColor: i ? '#C85A32' : '#7A3D1A' }} />{doigt(k >= 4 && joue === i)}</View>), 16)}
      </View>); }
    case 'corps': { const k = pas % 3; return (
      <View style={{ alignItems: 'center', gap: 6 }}>
        <T v="corps" fort style={{ fontStyle: 'italic' }}>Ewondjo</T>
        <View style={{ width: 90, height: 110, alignItems: 'center' }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#8B5A3C' }} />
          <View style={{ width: 46, height: 62, borderRadius: 14, backgroundColor: '#FDFAF7', borderWidth: 1, borderColor: c.bord, marginTop: 2 }} />
          <View style={{ position: 'absolute', top: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: k === 2 ? c.succes : jaune, backgroundColor: k === 2 ? c.succes + '77' : 'transparent' }} />
          <View style={{ position: 'absolute', top: 56, width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: jaune }} />
          {k === 1 && <T v="sousTitre" style={{ position: 'absolute', top: 20 }}>{DOIGT}</T>}
        </View>
      </View>); }
    case 'formes': { const k = pas % 3; const forme = (rond: boolean, i: number | string, on = false) => <View key={i} style={{ width: 28, height: 28, borderRadius: rond ? 14 : 5, backgroundColor: on ? c.succes : '#C85A32' }} />; return (
      <View style={{ alignItems: 'center', gap: 12 }}>
        {rangee([forme(true, 0), forme(false, 1), forme(true, 2), k === 2 ? forme(false, 3, true) : <View key={3} style={{ width: 28, height: 28, borderRadius: 5, borderWidth: 2, borderStyle: 'dashed', borderColor: c.fort, alignItems: 'center', justifyContent: 'center' }}><T v="petit" fort>?</T></View>], 8)}
        {rangee([true, false].map((r, i) => <View key={i} style={{ alignItems: 'center', gap: 4 }}>{forme(r, i)}{doigt(k === 1 && i === 1)}</View>), 22)}
      </View>); }
    case 'chemin': { const k = pas % 3; return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        {rangee([0, 1, 2].map(i => <View key={i} style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: c.bord, backgroundColor: c.carte, alignItems: 'center', justifyContent: 'center' }}><T v="corps">{i === (k === 2 ? 1 : 0) ? '🧍' : i === 2 ? '🏠' : ''}</T></View>), 4)}
        {rangee(['←', '→'].map((x, i) => colonne(x, k === 1 && i === 1, i, 40)), 14)}
      </View>); }
  }
}

const cleVue = (moteur: string) => `nkala_aide_jeu_${moteur}`;

/** Fenêtre d'aide du jeu : `ouverte` est piloté par JeuRunner ; `premiereFois` l'ouvre seule si ce type de jeu n'a jamais été expliqué. */
export function useAideJeu(moteur: string) {
  const [ouverte, setOuverte] = useState(false);
  useEffect(() => { AsyncStorage.getItem(cleVue(moteur)).then(v => { if (!v) setOuverte(true); }).catch(() => setOuverte(true)); }, [moteur]);
  const fermer = () => { setOuverte(false); AsyncStorage.setItem(cleVue(moteur), '1').catch(() => {}); };
  return { ouverte, ouvrir: () => setOuverte(true), fermer };
}

export function AideJeu({ jeu, moteur, regles, visible, onFermer }: { jeu: Ligne; moteur: string; regles: ReglesManche; visible: boolean; onFermer: () => void }) {
  const { c } = useTheme();
  const a = AIDES[moteur] ?? AIDES.quiz;
  const reglages = [
    `${regles.questions} ${['ogoni', 'pendu', 'anagramme', 'mots_meles', 'mots_croises', 'mots_fleches', 'syllabes'].includes(moteur) ? 'mots' : moteur === 'memoire' || moteur === 'relier' ? 'paires' : moteur === 'sequence' ? 'suites' : moteur === 'plateau' ? 'questions au moins' : 'questions'}`,
    regles.dureeS ? `${regles.dureeS} s` : null,
    moteur === 'ogoni' || moteur === 'pendu' ? `${regles.erreursMax} bûches` : null,
    `XP × ${(regles.xpPct / 100).toFixed(2).replace(/\.?0+$/, '')}`,
  ].filter(Boolean).join(' · ');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,4,2,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 380, borderRadius: 24, backgroundColor: c.fond, borderWidth: 2, borderColor: c.modules.azeva, padding: 20, gap: 14 }}>
          <T v="libelle" couleur={c.discret}>Comment jouer</T>
          <T v="sousTitre">{String(jeu.titre)}</T>
          <T v="corps">{String(jeu.consigne || a.but)}</T>
          <View style={{ minHeight: 150, borderRadius: 18, backgroundColor: c.squelette, alignItems: 'center', justifyContent: 'center', padding: 14 }} accessibilityLabel="Démonstration animée du geste à faire" accessible>
            {visible && <SchemaAnime schema={a.schema} />}
          </View>
          <View style={{ gap: 8 }}>
            {a.etapes.map((e, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.modules.azeva, alignItems: 'center', justifyContent: 'center' }}><T v="petit" fort couleur="#170D08">{i + 1}</T></View>
                <T v="corps" style={{ flex: 1 }}>{e}</T>
              </View>
            ))}
          </View>
          <T v="petit" couleur={c.discret}>Niveau {regles.titre} : {reglages}. Une erreur coûte un cœur.</T>
          <Bouton label="J'ai compris, je joue" variante="ambre" icone="lecture" onPress={onFermer} />
        </View>
      </View>
    </Modal>
  );
}
