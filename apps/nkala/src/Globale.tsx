/** Éléments communs à tous les onglets : barre du bas à 5 entrées, menu « Plus », lecteur flottant, fin de journée des enfants. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Modal, Platform, Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { estAdmin, estValidateur } from '@nkala/noyau';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthProvider';
import { emettre } from './evenements';
import { Bouton, Champ, Feuille, Ic, Mascotte, Onde, T, Visuel } from './kit';
import { useLecteur } from './Lecteur';
import { usePrefs, useTheme } from './Prefs';
import { degrades, polices } from './theme';

// ------------------------------------------------------------------ état global
const Ctx = createContext<{ plus: boolean; ouvrirPlus: () => void; fermerPlus: () => void; lecteurPlein: boolean; ouvrirLecteur: () => void; fermerLecteur: () => void }>(
  { plus: false, ouvrirPlus() {}, fermerPlus() {}, lecteurPlein: false, ouvrirLecteur() {}, fermerLecteur() {} });
export const useGlobale = () => useContext(Ctx);
export function GlobaleProvider({ children }: { children: React.ReactNode }) {
  const [plus, setPlus] = useState(false), [lecteurPlein, setLecteur] = useState(false);
  const v = useMemo(() => ({ plus, ouvrirPlus: () => setPlus(true), fermerPlus: () => setPlus(false), lecteurPlein, ouvrirLecteur: () => setLecteur(true), fermerLecteur: () => setLecteur(false) }), [plus, lecteurPlein]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

// ------------------------------------------------------------------ barre du bas
const ONGLETS: { route: string; label: string; icone: string }[] = [
  { route: 'index', label: 'Accueil', icone: 'accueil' }, { route: 'apprendre', label: 'Apprendre', icone: 'apprendre' }, { route: 'azeva', label: 'Jouer', icone: 'jouer' },
  { route: 'ecoute', label: 'Écouter', icone: 'ecouter' }, { route: 'village', label: 'Village', icone: 'village' },
];
export function BarreOnglets({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const { courant } = useLecteur();
  const { ouvrirLecteur } = useGlobale();
  const actif = state.routes[state.index]?.name;
  return (
    <View>
      {courant && <MiniLecteur onOuvrir={ouvrirLecteur} />}
      <View style={{ backgroundColor: c.verre, borderTopWidth: 1, borderTopColor: c.bord, paddingTop: 8, paddingBottom: Math.max(ins.bottom, 10), flexDirection: 'row', justifyContent: 'space-around', ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px)' } as object) : null) }}>
        {ONGLETS.filter(o => (descriptors[state.routes.find(r => r.name === o.route)?.key ?? '']?.options as { href?: string | null } | undefined)?.href !== null && state.routes.some(r => r.name === o.route)).map(o => {
          const on = actif === o.route, route = state.routes.find(r => r.name === o.route)!;
          return (
            <Pressable key={o.route} accessibilityRole="tab" accessibilityLabel={o.label} accessibilityState={{ selected: on }} onPress={() => { const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!on && !e.defaultPrevented) navigation.navigate(o.route as never); }}
              style={{ width: 68, alignItems: 'center', gap: 3 }}>
              <View style={{ width: 52, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(245,158,11,0.18)' : 'transparent' }}><Ic nom={o.icone} taille={22} couleur={on ? c.accent : c.discret} /></View>
              <Text style={{ fontFamily: polices.corpsGras, fontSize: 11, color: on ? c.fort : c.discret }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ mini-lecteur (flottant, toujours accessible)
function MiniLecteur({ onOuvrir }: { onOuvrir: () => void }) {
  const { courant, enLecture, basculer, suivant, position, duree, charge } = useLecteur();
  if (!courant) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Lecteur : ${courant.titre}, ${courant.artiste}. Ouvrir`} onPress={onOuvrir} style={{ marginHorizontal: 10, marginBottom: 6, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' }}>
      <LinearGradient colors={[...degrades.lecteur]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingRight: 10 }}>
        <Visuel uri={courant.pochette} couleur={courant.couleur ?? undefined} taille={44} rayon={10} icone="musique" />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: polices.titre, fontSize: 14, color: '#FDFAF7' }}>{courant.titre}</Text>
          <Text numberOfLines={1} style={{ fontFamily: polices.corps, fontSize: 12, color: '#FED7AA' }}>{charge ? 'Chargement…' : courant.artiste}</Text>
        </View>
        {enLecture && <Onde barres={6} hauteur={22} />}
        <Pressable accessibilityRole="button" accessibilityLabel={enLecture ? 'Pause' : 'Lecture'} hitSlop={8} onPress={basculer} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' }}><Ic nom={enLecture ? 'pause' : 'lecture'} taille={20} couleur="#170D08" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Titre suivant" hitSlop={8} onPress={suivant}><Ic nom="suivantPiste" taille={22} couleur="#FED7AA" /></Pressable>
      </LinearGradient>
      <View style={{ height: 3, backgroundColor: 'rgba(0,0,0,0.3)' }}><View style={{ width: `${duree ? Math.min(100, (position / duree) * 100) : 0}%`, height: 3, backgroundColor: '#F59E0B' }} /></View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ menu « Plus »
export function MenuPlus() {
  const { plus, fermerPlus } = useGlobale();
  const { profil, deconnexion, invite } = useAuth();
  const { c } = useTheme();
  const routeur = useRouter();
  const aller = (chemin: string) => { fermerPlus(); setTimeout(() => routeur.push(chemin as never), 80); };
  const evt = (nom: 'guide' | 'faq' | 'alertes' | 'horsligne') => { fermerPlus(); setTimeout(() => emettre(nom), 120); };
  const items: { icone: string; label: string; sous?: string; action: () => void }[] = [
    { icone: 'micro', label: 'Contribuer', sous: 'Enregistrer, valider, classement', action: () => aller('/contribuer') },
    { icone: 'flamme', label: 'Ma série', sous: 'Calendrier et record', action: () => aller('/serie') },
    { icone: 'profil', label: 'Mon profil', sous: 'Rang, XP, anneaux par module', action: () => aller('/profil') },
    { icone: 'cloche', label: 'Notifications', action: () => evt('alertes') },
    { icone: 'chercher', label: 'Recherche', sous: 'Mots, leçons, jeux, lieux', action: () => aller('/recherche') },
    { icone: 'reseau', label: 'Hors ligne', sous: 'Téléchargements et file d\'envoi', action: () => evt('horsligne') },
    { icone: 'parents', label: 'Espace parents', sous: 'Temps et limites', action: () => aller('/parents') },
    { icone: 'reglages', label: 'Réglages', sous: 'Affichage, sons, famille', action: () => aller('/reglages') },
    { icone: 'aide', label: 'Guide et FAQ', action: () => evt('guide') },
    ...(estValidateur(profil?.role) ? [{ icone: 'bouclier', label: 'Validation', action: () => aller('/validation') }] : []),
    ...(estAdmin(profil?.role) ? [{ icone: 'surveiller', label: 'Administration', sous: 'Contenus, supervision, interrupteurs', action: () => aller('/admin') }] : []),
  ];
  return (
    <Feuille visible={plus} onClose={fermerPlus} titre="Plus">
      {items.map(i => (
        <Pressable key={i.label} accessibilityRole="button" onPress={i.action} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16, backgroundColor: pressed ? c.carte : 'transparent' })}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord, alignItems: 'center', justifyContent: 'center' }}><Ic nom={i.icone} taille={22} couleur={c.accent} /></View>
          <View style={{ flex: 1 }}><T v="carte">{i.label}</T>{!!i.sous && <T v="petit">{i.sous}</T>}</View>
          <Ic nom="suivant" taille={18} couleur={c.discret} />
        </Pressable>
      ))}
      <Bouton label={profil ? 'Me déconnecter' : invite ? 'Créer un compte ou me connecter' : 'Se connecter'} variante="fantome" petit onPress={() => { fermerPlus(); deconnexion(); }} />
    </Feuille>
  );
}

// ------------------------------------------------------------------ limite de temps des enfants (espace parents)
const jourCle = () => `nkala_minutes_${new Date().toISOString().slice(0, 10)}`;
export function FinEnfant() {
  const { prefs } = usePrefs();
  const { c } = useTheme();
  const [minutes, setMinutes] = useState(0);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState(false);
  const actif = prefs.mode === 'enfant' && !!prefs.limiteMinutes;
  const compter = useCallback(async () => { const v = Number((await AsyncStorage.getItem(jourCle())) || 0); setMinutes(v); return v; }, []);
  useEffect(() => {
    if (!actif) return;
    compter();
    const t = setInterval(async () => { if (AppState.currentState !== 'active') return; const v = (await compter()) + 0.5; await AsyncStorage.setItem(jourCle(), String(v)); setMinutes(v); }, 30_000);
    return () => clearInterval(t);
  }, [actif, compter]);
  if (!actif || minutes < (prefs.limiteMinutes ?? 0)) return null;
  const prolonger = async () => {
    if (prefs.parentsCode && code === prefs.parentsCode) { await AsyncStorage.setItem(jourCle(), String(Math.max(0, minutes - 15))); setMinutes(m => m - 15); setCode(''); setErreur(false); } else setErreur(true);
  };
  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: c.fond, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <Mascotte taille={140} humeur="dort" />
        <T v="titre" style={{ textAlign: 'center' }}>C'est fini pour aujourd'hui</T>
        <T v="corps" style={{ textAlign: 'center' }}>Ozangué va dormir. À demain pour de nouveaux jeux !</T>
        {!!prefs.parentsCode && <View style={{ width: '100%', maxWidth: 320, gap: 10 }}>
          <T v="petit" style={{ textAlign: 'center' }}>Un parent peut ajouter 15 minutes avec son code.</T>
          <Champ valeur={code} onChange={t => setCode(t.replace(/\D/g, '').slice(0, 4))} placeholder="Code parent (4 chiffres)" clavier="number-pad" secret />
          {erreur && <T v="petit" couleur={c.erreur}>Code incorrect.</T>}
          <Bouton label="Ajouter 15 minutes" petit variante="fantome" onPress={prolonger} />
        </View>}
      </View>
    </Modal>
  );
}
