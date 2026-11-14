/** Éléments communs à tous les onglets : barre du bas à 5 entrées, menu « Plus », lecteur flottant, fin de journée des enfants. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Modal, Platform, Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { estAdmin, estValidateur, moduleActif, moduleEnEssai, type ModuleId } from '@nkala/noyau';
import { useModules } from './useModules';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthProvider';
import { compterNonLues } from './Alertes';
import { ecouter, emettre } from './evenements';
import { Avatar, Bouton, Champ, Feuille, Ic, Mascotte, Onde, T, Visuel } from './kit';
import { useLecteur } from './Lecteur';
import { useProgres } from './Progres';
import { usePrefs, useTheme } from './Prefs';
import { degrades, polices } from './theme';

// ------------------------------------------------------------------ état global
const Ctx = createContext<{ plus: boolean; ouvrirPlus: () => void; fermerPlus: () => void; lecteurPlein: boolean; ouvrirLecteur: () => void; fermerLecteur: () => void; boutique: boolean; ouvrirBoutique: () => void; fermerBoutique: () => void }>(
  { plus: false, ouvrirPlus() {}, fermerPlus() {}, lecteurPlein: false, ouvrirLecteur() {}, fermerLecteur() {}, boutique: false, ouvrirBoutique() {}, fermerBoutique() {} });
export const useGlobale = () => useContext(Ctx);
export function GlobaleProvider({ children }: { children: React.ReactNode }) {
  const [plus, setPlus] = useState(false), [lecteurPlein, setLecteur] = useState(false), [boutique, setBoutique] = useState(false);
  const v = useMemo(() => ({ plus, ouvrirPlus: () => setPlus(true), fermerPlus: () => setPlus(false), lecteurPlein, ouvrirLecteur: () => setLecteur(true), fermerLecteur: () => setLecteur(false), boutique, ouvrirBoutique: () => setBoutique(true), fermerBoutique: () => setBoutique(false) }), [plus, lecteurPlein, boutique]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

// ------------------------------------------------------------------ notifications non lues (pastille de l'onglet Moi et du menu)
function useNonLues() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const lire = () => { compterNonLues().then(setN).catch(() => {}); };
    lire();
    const a = ecouter('nonLues', lire);
    const b = AppState.addEventListener('change', st => { if (st === 'active') lire(); });
    return () => { a(); b.remove(); };
  }, []);
  return n;
}

// ------------------------------------------------------------------ barre du bas
// expo-router retire l'option `href` avant de passer les écrans à la barre : la visibilité se lit donc ici, dans les interrupteurs.
const ONGLETS: { route: string; label: string; icone: string; module?: ModuleId }[] = [
  { route: 'index', label: 'Accueil', icone: 'accueil' }, { route: 'apprendre', label: 'Apprendre', icone: 'apprendre', module: 'onenji' }, { route: 'azeva', label: 'Jouer', icone: 'jouer', module: 'azeva' },
  { route: 'ecoute', label: 'Écouter', icone: 'ecouter', module: 'ontci' }, { route: 'village', label: 'Village', icone: 'village', module: 'nkala' },
  // Partie contributeur (Ompangano) : même règle que les autres modules (interrupteur côté serveur). Décision de Capp, 13 nov. 2026.
  { route: 'contribuer', label: 'Contribuer', icone: 'micro', module: 'ompangano' },
];
export function BarreOnglets({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const { courant } = useLecteur();
  const { ouvrirLecteur, ouvrirPlus, plus } = useGlobale();
  const { profil } = useAuth();
  const nonLues = useNonLues();
  useModules();
  const actif = state.routes[state.index]?.name;
  const surProfil = plus || ['profil', 'reglages', 'serie', 'parents'].includes(actif ?? '');
  return (
    <View>
      {courant && <MiniLecteur onOuvrir={ouvrirLecteur} />}
      <View style={{ backgroundColor: c.verre, borderTopWidth: 1, borderTopColor: c.bord, paddingTop: 8, paddingBottom: Math.max(ins.bottom, 10), flexDirection: 'row', justifyContent: 'space-around', ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px)' } as object) : null) }}>
        {ONGLETS.filter(o => (!o.module || moduleActif(o.module)) && state.routes.some(r => r.name === o.route)).map(o => {
          const on = actif === o.route, route = state.routes.find(r => r.name === o.route)!;
          const essai = !!o.module && moduleEnEssai(o.module);
          return (
            <Pressable key={o.route} accessibilityRole="tab" accessibilityLabel={essai ? `${o.label} (essai, visible des administrateurs seulement)` : o.label} accessibilityState={{ selected: on }} onPress={() => { const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!on && !e.defaultPrevented) navigation.navigate(o.route as never); }}
              style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 3 }}>
              <View style={{ width: 52, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(245,158,11,0.18)' : 'transparent' }}><Ic nom={o.icone} taille={22} couleur={on ? c.accent : c.discret} />
                {essai && <View style={{ position: 'absolute', top: -3, right: 0, paddingHorizontal: 4, height: 14, borderRadius: 7, backgroundColor: c.accent, borderWidth: 1.5, borderColor: c.fond, justifyContent: 'center' }}><Text style={{ fontFamily: polices.corpsTresGras, fontSize: 8, color: '#FFFFFF' }}>ADMIN</Text></View>}
              </View>
              <Text numberOfLines={1} style={{ fontFamily: polices.corpsGras, fontSize: 11, color: on ? c.fort : c.discret }}>{o.label}</Text>
            </Pressable>
          );
        })}
        {/* Moi : photo du profil ; ouvre le menu (profil, notifications, réglages…) */}
        <Pressable accessibilityRole="tab" accessibilityLabel={`Mon espace${nonLues ? `, ${nonLues} notification${nonLues > 1 ? 's' : ''} non lue${nonLues > 1 ? 's' : ''}` : ''}`} accessibilityState={{ selected: surProfil }} onPress={ouvrirPlus}
          style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 3 }}>
          <View style={{ height: 30, justifyContent: 'center' }}>
            {profil ? <Avatar nom={profil.displayName || profil.fullName} uri={profil.photoURL || null} taille={28} actif={surProfil} />
              : <View style={{ width: 52, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: surProfil ? 'rgba(245,158,11,0.18)' : 'transparent' }}><Ic nom="profil" taille={22} couleur={surProfil ? c.accent : c.discret} /></View>}
            {nonLues > 0 && <View style={{ position: 'absolute', top: -2, right: -8, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.erreur, borderWidth: 2, borderColor: c.fond, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: polices.corpsTresGras, fontSize: 10, color: '#FFFFFF' }}>{nonLues > 9 ? '9+' : nonLues}</Text></View>}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: polices.corpsGras, fontSize: 11, color: surProfil ? c.fort : c.discret }}>Moi</Text>
        </Pressable>
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
  const { plus, fermerPlus, ouvrirBoutique } = useGlobale();
  const { profil, deconnexion, invite } = useAuth();
  const { c } = useTheme();
  const routeur = useRouter();
  const nonLues = useNonLues();
  const { xp, rang } = useProgres();
  const aller = (chemin: string) => { fermerPlus(); setTimeout(() => routeur.push(chemin as never), 80); };
  const evt = (nom: 'guide' | 'faq' | 'alertes' | 'horsligne') => { fermerPlus(); setTimeout(() => emettre(nom), 120); };
  const items: { icone: string; label: string; sous?: string; action: () => void }[] = [
    { icone: 'couronne', label: 'Nkala Plus et achats', sous: 'Abonnement sans publicité', action: () => { fermerPlus(); setTimeout(ouvrirBoutique, 120); } },
    { icone: 'flamme', label: 'Ma série', sous: 'Calendrier et record', action: () => aller('/serie') },
    { icone: 'cloche', label: 'Notifications', sous: nonLues ? `${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Tout est lu', action: () => evt('alertes') },
    { icone: 'chercher', label: 'Recherche', sous: 'Mots, leçons, jeux, lieux', action: () => aller('/recherche') },
    { icone: 'reseau', label: 'Hors ligne', sous: 'Téléchargements et file d\'envoi', action: () => evt('horsligne') },
    { icone: 'parents', label: 'Espace parents', sous: 'Temps et limites', action: () => aller('/parents') },
    { icone: 'reglages', label: 'Réglages', sous: 'Affichage, sons, famille', action: () => aller('/reglages') },
    { icone: 'aide', label: 'Guide et FAQ', action: () => evt('guide') },
    ...(estValidateur(profil?.role) ? [{ icone: 'bouclier', label: 'Validation', action: () => aller('/validation') }] : []),
    ...(estAdmin(profil?.role) ? [{ icone: 'surveiller', label: 'Administration', sous: 'Contenus, supervision, interrupteurs', action: () => aller('/admin') }] : []),
  ];
  return (
    <Feuille visible={plus} onClose={fermerPlus} titre="Mon espace">
      <Pressable accessibilityRole="button" accessibilityLabel={profil ? 'Voir mon profil' : 'Se connecter'} onPress={() => (profil ? aller('/profil') : (fermerPlus(), deconnexion()))}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, backgroundColor: pressed ? c.carteHaut : c.carte, borderWidth: 1, borderColor: c.bordAmbre, marginBottom: 6 })}>
        <Avatar nom={profil ? profil.displayName || profil.fullName : undefined} uri={profil?.photoURL || null} taille={56} actif />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="sousTitre" numberOfLines={1}>{profil ? profil.displayName || profil.fullName || 'Mon profil' : 'Sans compte'}</T>
          <T v="petit" numberOfLines={1}>{profil ? `${rang.rang.nom} · ${xp} XP · Voir mon profil` : 'Crée un compte pour garder ta progression'}</T>
        </View>
        <Ic nom="suivant" taille={18} couleur={c.discret} />
      </Pressable>
      {items.map(i => (
        <Pressable key={i.label} accessibilityRole="button" onPress={i.action} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16, backgroundColor: pressed ? c.carte : 'transparent' })}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord, alignItems: 'center', justifyContent: 'center' }}>
            <Ic nom={i.icone} taille={22} couleur={c.accent} />
            {i.icone === 'cloche' && nonLues > 0 && <View style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: c.erreur }} />}
          </View>
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
        <T v="corps" style={{ textAlign: 'center' }}>Kak'Igonjo va dormir. À demain pour de nouveaux jeux !</T>
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
