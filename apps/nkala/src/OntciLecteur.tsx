/** Lecteur plein écran d'Ontci (63 à 65, 70) : pochette, onde, gestes, paroles qui défilent, file d'attente avec préchargement visible. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobale } from './Globale';
import { Ic, Onde, Pastille, Squelette, T, Visuel } from './kit';
import { useLecteur } from './Lecteur';
import { EmplacementPub } from './Pub';
import { useTheme } from './Prefs';
import { polices } from './theme';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function LecteurPlein() {
  const { lecteurPlein, fermerLecteur } = useGlobale();
  const L = useLecteur();
  const { c } = useTheme();
  const [vue, setVue] = useState<'lecteur' | 'paroles' | 'file'>('lecteur');
  const [largeurBarre, setLargeurBarre] = useState(1);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dy) < 40,
    onPanResponderRelease: (_, g) => { if (g.dx < -60) L.suivant(); else if (g.dx > 60) L.precedent(); },
  }), [L.suivant, L.precedent]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = L.courant;
  const couleur = t?.couleur || '#5A2414';
  const lignes = (t?.paroles ?? '').split('\n').filter(Boolean);
  const trad = (t?.traduction ?? '').split('\n');
  const actuelle = L.duree > 0 && lignes.length ? Math.min(lignes.length - 1, Math.floor((L.position / L.duree) * lignes.length)) : 0;
  const refRef = useRef<ScrollView>(null);
  useEffect(() => { if (vue === 'paroles') refRef.current?.scrollTo({ y: Math.max(0, actuelle * 56 - 120), animated: true }); }, [actuelle, vue]);
  if (!t) return null;
  const message = L.refus === 'audio_indisponible' ? 'Cet audio n\'est pas encore disponible.' : L.refus ? 'Ce titre est réservé aux abonnés.' : null;
  return (
    <Modal visible={lecteurPlein} animationType="slide" onRequestClose={fermerLecteur}>
      <LinearGradient colors={[couleur, c.fond]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.8 }} style={{ flex: 1, paddingTop: 54, paddingHorizontal: 24, paddingBottom: 32, gap: 16 }} {...pan.panHandlers}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Réduire le lecteur" hitSlop={12} onPress={fermerLecteur}><Ic nom="fleche_bas" taille={28} couleur="#FDFAF7" /></Pressable>
          <View style={{ flexDirection: 'row', gap: 6 }}>{(['lecteur', 'paroles', 'file'] as const).map(v => <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: vue === v }} onPress={() => setVue(v)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: vue === v ? 'rgba(255,255,255,0.22)' : 'transparent' }}><T v="petit" couleur="#FDFAF7">{v === 'lecteur' ? 'Lecture' : v === 'paroles' ? 'Paroles' : 'File'}</T></Pressable>)}</View>
          <View style={{ width: 28 }} />
        </View>

        {vue === 'lecteur' && <View style={{ alignItems: 'center', gap: 18, flex: 1, justifyContent: 'center' }}>
          {L.charge && !message ? <Squelette l={260} h={260} r={24} /> : <Visuel uri={t.pochette} couleur={couleur} largeur={260} hauteur={260} rayon={24} icone="musique" />}
          <Onde actif={L.enLecture} barres={22} hauteur={34} />
        </View>}
        {vue === 'paroles' && <ScrollView ref={refRef} style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingVertical: 20 }} showsVerticalScrollIndicator={false}>
          {lignes.length === 0 ? <T v="corps" couleur="#FED7AA" style={{ textAlign: 'center' }}>Les paroles de ce titre ne sont pas encore disponibles.</T> : lignes.map((l, i) => (
            <View key={i} style={{ minHeight: 42, opacity: i === actuelle ? 1 : 0.5 }}><T v="sousTitre" couleur="#FDFAF7" style={i === actuelle ? { fontFamily: polices.titreGras } : null}>{l}</T>{!!trad[i] && <T v="petit" couleur="#FED7AA">{trad[i]}</T>}</View>))}
        </ScrollView>}
        {vue === 'file' && <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
          {L.file.map((p, i) => <View key={p.id + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: i === L.index ? 'rgba(255,255,255,0.14)' : 'transparent' }}>
            <Visuel uri={p.pochette} couleur={p.couleur ?? undefined} taille={44} rayon={10} icone="musique" /><View style={{ flex: 1 }}><T v="carte" couleur="#FDFAF7" numberOfLines={1}>{p.titre}</T><T v="petit" couleur="#FED7AA" numberOfLines={1}>{p.artiste}</T></View>
            {i === L.index + 1 && <Pastille label="Prêt" couleur="#22C55E" fond="rgba(0,0,0,0.3)" />}{i === L.index && L.enLecture && <Onde barres={4} hauteur={16} />}</View>)}
        </ScrollView>}

        <View style={{ gap: 4 }}>
          <T v="titre" couleur="#FDFAF7" numberOfLines={1}>{t.titre}</T>
          <T v="corps" couleur="#FED7AA" numberOfLines={1}>{L.charge && !message ? 'Chargement…' : t.artiste}</T>
          {!!message && <T v="petit" couleur="#FCA5A5" accessibilityRole="alert">{message}</T>}
        </View>
        <Pressable accessibilityRole="adjustable" accessibilityLabel={`Position ${mmss(L.position)} sur ${mmss(L.duree)}`} onLayout={e => setLargeurBarre(e.nativeEvent.layout.width)} onPress={e => L.duree && L.aller((e.nativeEvent.locationX / largeurBarre) * L.duree)} style={{ height: 24, justifyContent: 'center' }}>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' }}><View style={{ width: `${L.duree ? Math.min(100, (L.position / L.duree) * 100) : 0}%`, height: 5, borderRadius: 3, backgroundColor: '#F59E0B' }} /></View>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="petit" couleur="#FED7AA">{mmss(L.position)}</T><T v="petit" couleur="#FED7AA">{mmss(L.duree)}</T></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Lecture aléatoire" accessibilityState={{ selected: L.aleatoire }} onPress={L.basculerAleatoire} hitSlop={10}><Ic nom="aleatoire" taille={24} couleur={L.aleatoire ? '#F59E0B' : '#FED7AA'} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Précédent" onPress={L.precedent} hitSlop={10}><Ic nom="precedent" taille={32} couleur="#FDFAF7" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={L.enLecture ? 'Pause' : 'Lecture'} onPress={L.basculer} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' }}><Ic nom={L.enLecture ? 'pause' : 'lecture'} taille={34} couleur="#170D08" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Suivant" onPress={L.suivant} hitSlop={10}><Ic nom="suivantPiste" taille={32} couleur="#FDFAF7" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Répétition : ${L.boucle}`} onPress={L.changerBoucle} hitSlop={10}><Ic nom="boucle" taille={24} couleur={L.boucle === 'aucune' ? '#FED7AA' : '#F59E0B'} />{L.boucle === 'piste' && <T v="petit" couleur="#F59E0B" style={{ position: 'absolute', right: -6, top: -6 }}>1</T>}</Pressable>
        </View>
        {L.delaiPremierSonMs !== null && <T v="petit" couleur="rgba(254,215,170,0.6)" style={{ textAlign: 'center' }}>Premier son en {L.delaiPremierSonMs} ms</T>}
        <EmplacementPub zone="bandeau_lecteur" />
      </LinearGradient>
    </Modal>
  );
}
