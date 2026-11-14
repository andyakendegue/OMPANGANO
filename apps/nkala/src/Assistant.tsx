/**
 * Kaka Igonjo (Kak'Igonjo), l'assistant, en chat flottant : un vieux sage ôrungu, bienveillant.
 * Au repos : la tête d'un vieil Orungu dans une auréole, en bas à droite. Au toucher : il glisse à gauche, son buste apparaît,
 * il se penche devant le chat, et la fenêtre sort de lui comme un génie de sa lampe.
 * Tenue (décrite par Capp, 11 nov. 2026) : vêtement blanc ; duku = bonnet blanc à bord, sans gland ; okorouè = pagne à motif
 * qui couvre le buste et la taille, noué au-dessus de l'épaule droite pour un homme (gauche pour une femme), dont les deux
 * extrémités portent une bordure de pagne rouge souvent brodée de dentelle blanche.
 */
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, Path, Pattern, Rect } from 'react-native-svg';
import { ApiError, ECRANS_IA, chargerContenu, creerChat, envoyerAuChat, fonctionActive, lireChat, listerChats, moduleActif, supprimerChat, validerAction, type ActionIa, type EtatLocalChat, type FicheChat, type ModuleId, type NiveauContexte, type RefusChat } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { Barre, Ic, T } from './kit';
import { useLecteur } from './Lecteur';
import { usePrefs, useTheme } from './Prefs';
import { degrades, marque, ombres, polices, rayons } from './theme';

// ------------------------------------------------------------------ ouverture depuis un autre écran
const ecouteurs = new Set<() => void>();
/** Ouvre le chat flottant depuis n'importe quel écran (carte « Parler à Kak'Igonjo » d'Onenji, par exemple). */
export function ouvrirAssistant() { ecouteurs.forEach(f => f()); }

// Le dessin du vieux sage est dans KakIgonjo.tsx (partagé avec la mascotte du kit).
import { VieilOrungu } from './KakIgonjo';
export { VieilOrungu };


// ------------------------------------------------------------------ auréole
const NATIF = Platform.OS !== 'web';

/** L'auréole de la charte : lueur ambre, anneau en dégradé « flamme », disque brun du lecteur. `zoom` : 0 = tête seule, 1 = tête et buste. */
function Aureole({ taille, zoom, pulse }: { taille: number; zoom: Animated.Value; pulse: boolean }) {
  const { c } = useTheme();
  const { reduireAnim, prefs } = usePrefs();
  const v = useRef(new Animated.Value(0)).current;
  const anime = pulse && !reduireAnim && prefs.animations === 'completes';
  useEffect(() => {
    if (!anime) { v.setValue(0); return; }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIF }),
      Animated.timing(v, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIF }),
    ]));
    a.start();
    return () => a.stop();
  }, [anime, v]);
  const d = taille - 10;
  return (
    <View style={{ width: taille, height: taille }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -9, top: -9, width: taille + 18, height: taille + 18, borderRadius: taille, backgroundColor: marque.ambre, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.06] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.1] }) }] }} />
      <LinearGradient colors={[...degrades.flamme]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ width: taille, height: taille, borderRadius: taille / 2, padding: 3 }, ombres.bouton]}>
        <View style={{ flex: 1, borderRadius: taille / 2, padding: 2, backgroundColor: c.fond }}>
          <LinearGradient colors={[...degrades.lecteur]} style={{ flex: 1, borderRadius: d / 2, overflow: 'hidden' }}>
            <Animated.View style={{ transform: [{ translateY: zoom.interpolate({ inputRange: [0, 1], outputRange: [d * 0.207, 0] }) }, { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1.55, 1] }) }] }}>
              <VieilOrungu taille={d} />
            </Animated.View>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}

// ------------------------------------------------------------------ chat flottant
/** `actions` : propositions de Kak'Igonjo (réglage, écran) ; `faites` : indices déjà appliquées par l'utilisateur. */
type Bulle = { role: 'user' | 'assistant'; content: string; actions?: ActionIa[]; faites?: number[]; accueil?: boolean };

/** Clé de la bibliothèque (Bibliotheque.tsx) où sont gardés « Mes mots ». */
const CLE_LECTURE = 'nkala.lecture.v1';
export const NOM_ASSISTANT = "Kak'Igonjo";
/**
 * Message de bienvenue (formule donnée par Capp). Modifiable depuis la console : collection « Messages », type « kakigonjo »
 * (le premier publié) ; {prénom} y est remplacé par le prénom de l'utilisateur, ou retiré s'il est inconnu.
 */
export const ACCUEIL_KAKIGONJO = "Mbolo {prénom} ! Myè no Kak'Igonjo. Wulinya myè, de quoi as-tu besoin ?";
export function texteAccueil(modele: string | null | undefined, prenom?: string | null): string {
  const p = (prenom ?? '').trim().split(/\s+/)[0];
  return (modele?.trim() || ACCUEIL_KAKIGONJO).replace(/\s*\{\s*pr[ée]nom\s*\}/gi, p ? ` ${p}` : '');
}
/** Modèle d'accueil publié sur le serveur (ou la formule par défaut tant qu'il n'est pas chargé). */
export function useAccueilKakIgonjo(): string {
  const [modele, setModele] = useState(ACCUEIL_KAKIGONJO);
  useEffect(() => {
    let annule = false;
    chargerContenu<{ id: string; type?: string; texte?: string; publie?: boolean }>('messages')
      .then(r => { const m = r.lignes.find(x => x.type === 'kakigonjo' && x.publie !== false && x.texte?.trim()); if (!annule && m?.texte) setModele(m.texte); })
      .catch(() => {});
    return () => { annule = true; };
  }, []);
  return modele;
}
/** Bulle d'accueil : son texte est calculé à l'affichage (modèle du serveur + prénom). */
const accueil = (): Bulle => ({ role: 'assistant', content: '', accueil: true });

/** Les mots myènè arrivent entre astérisques (*mbolo*) : ils s'affichent en italique, sans les astérisques. */
function TexteBulle({ texte, couleur }: { texte: string; couleur: string }) {
  const morceaux = texte.split(/\*([^*\n]+)\*/g);
  return <T v="corps" couleur={couleur}>{morceaux.map((m, i) => (i % 2 ? <Text key={i} style={{ fontFamily: polices.italique, fontStyle: 'italic' }}>{m}</Text> : m))}</T>;
}
const S = 108, REPOS = 64, MARGE = 16;
const nb = (n: number) => Math.round(n).toLocaleString('fr-FR');
const argent = (n: number, devise: string) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 ? 2 : 0 })} ${devise}`;

/** Jauge de contexte d'un chat : jetons renvoyés au modèle à chaque message, par rapport à ce qui est inclus. */
function JaugeContexte({ chat, admin }: { chat: FicheChat; admin: boolean }) {
  const { c } = useTheme();
  const k = chat.contexte;
  const teinte: Record<NiveauContexte, string> = { ok: c.succes, alerte: c.accent, exces: c.erreur, plein: c.erreur };
  const libelle = k.niveau === 'plein' ? 'Chat plein' : k.niveau === 'exces' ? `+ ${nb(k.exces)} en excès` : k.niveau === 'alerte' ? 'Bientôt plein' : '';
  return (
    <View style={{ gap: 4 }} accessible accessibilityLabel={`Contexte : ${nb(k.jetons)} jetons sur ${nb(k.inclus)} inclus. ${libelle}`}>
      <Barre valeur={k.inclus ? k.jetons / k.inclus : 0} couleur={teinte[k.niveau]} hauteur={5} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T v="petit" numberOfLines={1} style={{ flexShrink: 1 }}>Contexte {nb(k.jetons)} / {nb(k.inclus)} jetons{libelle ? ` · ${libelle}` : ''}</T>
        <T v="petit" numberOfLines={1} couleur={chat.frais > 0 ? c.erreur : undefined}>{chat.frais > 0 ? `Frais ${argent(chat.frais, chat.devise)}` : ''}{admin && chat.cout !== undefined ? `${chat.frais > 0 ? ' · ' : ''}Coût ${argent(chat.cout, chat.devise)}` : ''}</T>
      </View>
    </View>
  );
}

export function AssistantFlottant() {
  const { c } = useTheme();
  const { reduireAnim, vibrer, prefs, regler } = usePrefs();
  const routeur = useRouter();
  const { profil } = useAuth();
  const { courant } = useLecteur();
  const ins = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const chemin = usePathname();

  const [ouvert, setOuvert] = useState(false);
  const [monte, setMonte] = useState(false);
  const [clavier, setClavier] = useState(0);
  const [vue, setVue] = useState<'chat' | 'liste'>('chat');
  const [chats, setChats] = useState<FicheChat[]>([]);
  const [chat, setChat] = useState<FicheChat | null>(null);
  const [charge, setCharge] = useState(false);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [bulles, setBulles] = useState<Bulle[]>(() => [accueil()]);
  const [texte, setTexte] = useState('');
  const [occupe, setOccupe] = useState(false);
  /** Envoi refusé par le serveur (contexte en excès ou plein), avec le message en attente. */
  const [refus, setRefus] = useState<(RefusChat & { message: string; erreur: string }) | null>(null);
  const [quota, setQuota] = useState<{ restantJour: number; alerte: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const liste = useRef<ScrollView>(null);
  const charges = useRef(false);

  /** a : le vieil homme glisse et se déploie ; g : le chat sort (génie). */
  const a = useRef(new Animated.Value(0)).current;
  const g = useRef(new Animated.Value(0)).current;

  const basculer = useCallback((cible: boolean) => {
    vibrer('leger');
    setOuvert(cible);
    if (cible) setMonte(true); else Keyboard.dismiss();
    if (reduireAnim) {
      Animated.parallel([
        Animated.timing(a, { toValue: cible ? 1 : 0, duration: 1, useNativeDriver: NATIF }),
        Animated.timing(g, { toValue: cible ? 1 : 0, duration: 160, useNativeDriver: NATIF }),
      ]).start(() => { if (!cible) setMonte(false); });
      return;
    }
    if (cible) {
      Animated.parallel([
        Animated.timing(a, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: NATIF }),
        Animated.sequence([Animated.delay(200), Animated.timing(g, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: NATIF })]),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(g, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: NATIF }),
        Animated.timing(a, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: NATIF }),
      ]).start(() => setMonte(false));
    }
  }, [a, g, reduireAnim, vibrer]);

  useEffect(() => { const f = () => basculer(true); ecouteurs.add(f); return () => { ecouteurs.delete(f); }; }, [basculer]);
  useEffect(() => {
    if (Platform.OS !== 'ios') return; // Android redimensionne la fenêtre ; le web n'a pas de clavier à compenser.
    const s1 = Keyboard.addListener('keyboardWillShow', e => setClavier(e.endCoordinates.height));
    const s2 = Keyboard.addListener('keyboardWillHide', () => setClavier(0));
    return () => { s1.remove(); s2.remove(); };
  }, []);
  useEffect(() => { if (monte && vue === 'chat') setTimeout(() => liste.current?.scrollToEnd({ animated: true }), 60); }, [bulles, occupe, monte, vue, refus]);

  const actif = fonctionActive('assistantIA');
  const uid = profil?.id;
  const nomProfil = profil?.displayName || profil?.fullName || null;
  const modeleAccueil = useAccueilKakIgonjo();
  const admin = (profil as { role?: string } | null)?.role === 'admin';

  const ouvrirChat = useCallback(async (f: FicheChat) => {
    setVue('chat'); setChat(f); setRefus(null); setErreur(null); setCharge(true);
    try { const r = await lireChat(f.id); setChat(r.chat); setBulles([accueil(), ...r.messages.map(m => ({ role: m.role, content: m.content }))]); }
    catch (e) { setErreur((e as Error).message); }
    finally { setCharge(false); }
  }, [nomProfil]);
  const nouveauChat = useCallback(() => { setVue('chat'); setChat(null); setBulles([accueil()]); setRefus(null); setErreur(null); }, [nomProfil]);
  const rafraichir = useCallback(async () => { try { const r = await listerChats(); setChats(r.chats); return r.chats; } catch { return null; } }, []);

  // À la première ouverture : reprendre le chat le plus récent. Changement de compte : tout oublier.
  useEffect(() => { charges.current = false; setChats([]); nouveauChat(); }, [uid, nouveauChat]);
  useEffect(() => {
    if (!monte || !uid || !actif || charges.current) return;
    charges.current = true;
    rafraichir().then(l => { if (l?.length) ouvrirChat(l[0]); });
  }, [monte, uid, actif, rafraichir, ouvrirChat]);

  const envoyer = async (repris?: { message: string; accepteFrais: boolean }) => {
    const m = (repris?.message ?? texte).trim(); if (!m || occupe) return;
    if (!repris) { setTexte(''); setBulles(b => [...b, { role: 'user', content: m }]); }
    setErreur(null); setRefus(null); setOccupe(true);
    try {
      let id = chat?.id;
      if (!id) { const n = await creerChat(); id = n.chat.id; setChat(n.chat); }
      const r = await envoyerAuChat(id, m, repris?.accepteFrais, await etatLocal());
      setChat(r.chat); setQuota(r.quota); setBulles(b => [...b, { role: 'assistant', content: r.reponse, actions: r.actions?.length ? r.actions : undefined }]);
      void rafraichir();
    } catch (e) {
      const corps = e instanceof ApiError ? e.corps : null;
      if (corps?.code) setRefus({ ...corps, message: m, erreur: (e as Error).message });
      else setErreur((e as Error).message);
    } finally { setOccupe(false); }
  };
  /** Ce que seul le téléphone connaît, envoyé avec chaque message pour que Kak'Igonjo en tienne compte. */
  const etatLocal = async (): Promise<EtatLocalChat> => {
    let mesMots: EtatLocalChat['mesMots'];
    try {
      const l = JSON.parse((await AsyncStorage.getItem(CLE_LECTURE)) || '{}') as { mots?: { mot: string }[] };
      if (Array.isArray(l.mots)) mesMots = { total: l.mots.length, derniers: l.mots.slice(0, 8).map(x => String(x.mot ?? '')) };
    } catch { /* bibliothèque jamais ouverte */ }
    const { theme, mode, animations, sons, vibrations, rappel } = prefs;
    return { prefs: { theme, mode, animations, sons, vibrations, rappel }, mesMots, ecran: chemin };
  };
  /** Applique une action proposée, après le toucher de l'utilisateur ; revalidée ici (même liste fermée que le serveur). */
  const appliquer = (iBulle: number, iAction: number, brut: ActionIa) => {
    const modules = Object.fromEntries((Object.keys(ECRANS_IA) as (keyof typeof ECRANS_IA)[]).map(k => (ECRANS_IA[k] as { module?: ModuleId }).module).filter((m): m is ModuleId => !!m).map(m => [m, moduleActif(m)]));
    const a = validerAction(brut, { enfant: prefs.mode === 'enfant', modules });
    if (!a) { setErreur('Cette action n\'est pas possible ici.'); return; }
    vibrer('leger');
    setBulles(b => b.map((x, i) => i === iBulle ? { ...x, faites: [...(x.faites ?? []), iAction] } : x));
    if (a.type === 'reglage') regler({ [a.cle]: a.valeur } as never);
    else { basculer(false); routeur.push(ECRANS_IA[a.ecran].chemin as never); }
  };
  /** Abandonne le message refusé et repart dans un chat neuf avec ce même message. */
  const repartir = () => { const m = refus?.message ?? ''; nouveauChat(); setTexte(m); };
  const supprimer = async (id: string) => {
    setASupprimer(null);
    try { await supprimerChat(id); setChats(l => l.filter(x => x.id !== id)); if (chat?.id === id) nouveauChat(); }
    catch (e) { setErreur((e as Error).message); }
  };

  // Outils internes : pas d'assistant par-dessus.
  if (/^\/(admin|validation)/.test(chemin)) return null;

  // Géométrie : au-dessus de la barre d'onglets (et du mini-lecteur), ou du clavier.
  const bas = clavier > 0 ? clavier + 10 : 57 + Math.max(ins.bottom, 10) + (courant ? 68 : 0) + 12;
  const PW = Math.min(W - 24, 400);
  const PH = Math.max(260, Math.min(540, H - ins.top - bas - 36));
  const gauchePanneau = W - 12 - PW;
  const gaucheAvatar = Math.max(2, gauchePanneau - 12);
  const k = REPOS / S, dec = (S * (1 - k)) / 2;
  const glisse = -(W - MARGE - S - gaucheAvatar);
  const retrait = S - (gauchePanneau - gaucheAvatar) + 2; // place laissée au vieil homme dans le pied du chat

  const fumee = [{ dx: 26, dy: 70, r: 26, de: 0 }, { dx: 70, dy: 120, r: 38, de: 0.1 }, { dx: 130, dy: 90, r: 30, de: 0.18 }, { dx: 60, dy: 190, r: 46, de: 0.25 }];
  const utilisable = actif && !!profil;
  const bouton = (nom: string, label: string, onPress: () => void, on = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} hitSlop={6} onPress={onPress} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.carte : 'transparent' }}><Ic nom={nom} taille={21} couleur={on ? c.accent : c.discret} /></Pressable>
  );
  const pastille = (label: string, onPress: () => void, plein = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: plein ? c.accent : 'transparent', borderWidth: plein ? 0 : 1, borderColor: c.bord }}><T v="petit" fort couleur={plein ? c.surAccent : c.fort}>{label}</T></Pressable>
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {monte && <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.verre, opacity: g }]} pointerEvents={ouvert ? 'auto' : 'none'}>
        <Pressable accessibilityLabel="Fermer l'assistant" accessibilityRole="button" style={{ flex: 1 }} onPress={() => basculer(false)} />
      </Animated.View>}

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: bas }}>
        {/* la fumée du génie */}
        {monte && !reduireAnim && fumee.map((f, i) => (
          <Animated.View key={i} pointerEvents="none" style={{
            position: 'absolute', left: gaucheAvatar + S / 2 - f.r, bottom: S * 0.55, width: f.r * 2, height: f.r * 2, borderRadius: f.r, backgroundColor: i % 2 ? marque.terre : marque.ambre,
            opacity: g.interpolate({ inputRange: [0, f.de + 0.05, f.de + 0.3, Math.min(1, f.de + 0.75), 1], outputRange: [0, 0, 0.32, 0, 0] }),
            transform: [{ translateX: g.interpolate({ inputRange: [0, 1], outputRange: [0, f.dx] }) }, { translateY: g.interpolate({ inputRange: [0, 1], outputRange: [0, -f.dy] }) }, { scale: g.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.5] }) }],
          }} />
        ))}

        {/* le chat : sort du coin bas-gauche, là où se tient le vieil homme */}
        {monte && <Animated.View pointerEvents={ouvert ? 'auto' : 'none'} accessibilityViewIsModal style={[{
          position: 'absolute', right: 12, bottom: 12, width: PW, height: PH, borderRadius: rayons.fiche, backgroundColor: c.carteHaut, borderWidth: 1, borderColor: c.bordAmbre, transformOrigin: 'left bottom',
          opacity: g.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [
            { rotate: g.interpolate({ inputRange: [0, 0.55, 0.8, 1], outputRange: ['-16deg', '5deg', '-1.5deg', '0deg'] }) },
            { scaleX: g.interpolate({ inputRange: [0, 0.45, 0.8, 1], outputRange: [0.06, 0.5, 1.03, 1] }) },
            { scaleY: g.interpolate({ inputRange: [0, 0.6, 0.85, 1], outputRange: [0, 1.06, 0.98, 1] }) },
          ],
        }, ombres.carte]}>
          <View style={{ paddingLeft: 18, paddingRight: 8, paddingTop: 8, paddingBottom: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: c.bord }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <View style={{ flex: 1 }}>
                <T v="carte" accessibilityRole="header" numberOfLines={1}>{vue === 'liste' ? 'Mes chats' : chat?.titre && chat.titre !== 'Nouveau chat' ? chat.titre : NOM_ASSISTANT}</T>
                <T v="petit" numberOfLines={1}>{vue === 'liste' ? `${chats.length} chat${chats.length > 1 ? 's' : ''}` : chat ? `${NOM_ASSISTANT} · ${chat.messages} message${chat.messages > 1 ? 's' : ''}` : 'Le vieux sage du village'}</T>
              </View>
              {utilisable && bouton('ajouter', 'Nouveau chat', nouveauChat)}
              {utilisable && bouton('liste', vue === 'liste' ? 'Revenir au chat' : 'Mes chats', () => { setASupprimer(null); if (vue === 'liste') setVue('chat'); else { setVue('liste'); void rafraichir(); } }, vue === 'liste')}
              {bouton('fermer', 'Fermer', () => basculer(false))}
            </View>
            {vue === 'chat' && chat && utilisable && <JaugeContexte chat={chat} admin={admin} />}
          </View>

          {vue === 'liste' ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 110, gap: 8 }} showsVerticalScrollIndicator={false}>
              {chats.length === 0 && <T v="corps" style={{ textAlign: 'center', paddingTop: 24 }}>Aucun chat pour l'instant.</T>}
              {chats.map(f => (
                <View key={f.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: f.id === chat?.id ? c.accent : c.bord, backgroundColor: c.carte, flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir le chat ${f.titre}`} onPress={() => ouvrirChat(f)} style={{ flex: 1, padding: 12, gap: 6 }}>
                    <T v="carte" numberOfLines={1}>{f.titre}</T>
                    <JaugeContexte chat={f} admin={admin} />
                  </Pressable>
                  {aSupprimer === f.id
                    ? <View style={{ paddingRight: 8 }}>{pastille('Supprimer', () => supprimer(f.id), true)}</View>
                    : <Pressable accessibilityRole="button" accessibilityLabel={`Supprimer le chat ${f.titre}`} hitSlop={6} onPress={() => setASupprimer(f.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ic nom="supprimer" taille={19} couleur={c.discret} /></Pressable>}
                </View>
              ))}
              {chats.length > 0 && <T v="petit" style={{ paddingTop: 4 }}>Le contexte, c'est tout ce que Kak'Igonjo relit à chaque message. Plus un chat est long, plus il pèse : ouvre un nouveau chat quand tu changes de sujet.</T>}
            </ScrollView>
          ) : (
            <ScrollView ref={liste} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 46, gap: 10 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {!actif ? <T v="corps" style={{ textAlign: 'center', paddingTop: 24 }}>Kak'Igonjo arrive bientôt.</T>
                : !profil ? <T v="corps" style={{ textAlign: 'center', paddingTop: 24 }}>Connecte-toi pour parler à Kak'Igonjo.</T>
                : <>
                  {bulles.map((b, i) => (
                    <View key={i} style={{ alignSelf: b.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', paddingVertical: 10, paddingHorizontal: 13, borderRadius: 18, borderBottomRightRadius: b.role === 'user' ? 6 : 18, borderTopLeftRadius: b.role === 'user' ? 18 : 6, backgroundColor: b.role === 'user' ? c.accent : c.carte, borderWidth: b.role === 'user' ? 0 : 1, borderColor: c.bord }}>
                      {b.role === 'assistant' ? <TexteBulle texte={b.accueil ? texteAccueil(modeleAccueil, nomProfil) : b.content} couleur={c.texte} /> : <T v="corps" couleur={c.surAccent}>{b.content}</T>}
                      {!!b.actions?.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10 }}>
                        {b.actions.map((x, j) => b.faites?.includes(j)
                          ? <View key={j} accessibilityLabel={`${x.libelle} : fait`} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.bord }}><Ic nom="ok" taille={16} couleur={c.succes} /><T v="petit" fort>{x.libelle}</T></View>
                          : <View key={j}>{pastille(x.libelle, () => appliquer(i, j, x), true)}</View>)}
                      </View>}
                    </View>
                  ))}
                  {charge && <T v="petit">Chargement du chat…</T>}
                  {occupe && <T v="petit" accessibilityLiveRegion="polite">Kak'Igonjo réfléchit…</T>}
                  {refus && (
                    <View accessibilityRole="alert" style={{ borderRadius: 16, borderWidth: 1, borderColor: c.erreur, backgroundColor: c.carte, padding: 12, gap: 10 }}>
                      <T v="corps" fort>{refus.code === 'frais' ? 'Ce chat dépasse le contexte inclus' : refus.code === 'plein' ? 'Ce chat est plein' : 'Ce chat a dépassé le contexte inclus'}</T>
                      <T v="petit">{nb(refus.contexte.jetons)} jetons de contexte pour {nb(refus.contexte.inclus)} inclus{refus.contexte.exces > 0 ? `, soit ${nb(refus.contexte.exces)} en excès` : ''}.{refus.code === 'frais' ? ` Envoyer ce message ajoute environ ${argent(refus.fraisEstimes, refus.devise)} de frais.` : ' Ouvre un nouveau chat pour continuer.'}</T>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {pastille('Nouveau chat', repartir, refus.code !== 'frais')}
                        {refus.code === 'frais' && pastille(`Continuer (${argent(refus.fraisEstimes, refus.devise)})`, () => envoyer({ message: refus.message, accepteFrais: true }), true)}
                      </View>
                    </View>
                  )}
                  {!!erreur && <T v="corps" couleur={c.erreur} accessibilityRole="alert">{erreur}</T>}
                  {quota?.alerte && <T v="petit" couleur={c.accent}>Il te reste peu de messages aujourd'hui.</T>}
                </>}
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: retrait, paddingRight: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.bord }}>
            <TextInput accessibilityLabel="Ta question à Kak'Igonjo" value={texte} onChangeText={setTexte} editable={utilisable && vue === 'chat'} placeholder="Ta question…" placeholderTextColor={c.discret} autoCapitalize="sentences" maxLength={2000} onSubmitEditing={() => envoyer()} returnKeyType="send"
              style={[{ flex: 1, minWidth: 0, height: 44, borderRadius: 22, paddingHorizontal: 14, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord, fontFamily: polices.corps, fontSize: 15, color: c.fort }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Envoyer" accessibilityState={{ disabled: !texte.trim() || occupe }} disabled={!texte.trim() || occupe || vue !== 'chat'} onPress={() => envoyer()}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, opacity: !texte.trim() || occupe ? 0.45 : 1 }}><Ic nom="envoyer" taille={19} couleur={c.surAccent} /></Pressable>
          </View>
        </Animated.View>}

        {/* le vieil Orungu : tête seule au repos ; tête et buste, penché devant le chat, une fois ouvert */}
        <Animated.View style={{
          position: 'absolute', right: MARGE, bottom: 0, width: S, height: S,
          transform: [
            { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [dec, glisse] }) },
            { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [dec, 0] }) },
            { scale: a.interpolate({ inputRange: [0, 1], outputRange: [k, 1] }) },
            { rotate: a.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['0deg', '-13deg', '-8deg'] }) },
          ],
        }}>
          <Pressable accessibilityRole="button" accessibilityLabel={ouvert ? 'Fermer Kak\'Igonjo, l\'assistant' : 'Parler à Kak\'Igonjo, l\'assistant'} accessibilityState={{ expanded: ouvert }} onPress={() => basculer(!ouvert)} style={{ borderRadius: S / 2 }}>
            <Aureole taille={S} zoom={a} pulse={!ouvert} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
