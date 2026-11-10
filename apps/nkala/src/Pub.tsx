import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { melangerPubs, demanderFilPub, demanderPub, fonctionActive, type PubFil, profilAgeDepuis, signalerPub, zoneAffichable, ZONES, type CreationPub, type ZonePub } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { useDroits } from './Droits';
import { Visuel } from './kit';
import { useTheme } from './Prefs';
import { polices } from './theme';

/** Compteur des activités qui interdisent la publicité (exercice, question, leçon, devoir, enregistrement de voix). */
let activites = 0;
const ecouteurs = new Set<() => void>();
const prevenir = () => ecouteurs.forEach(f => f());

/** À appeler dans tout écran où la publicité est interdite : tant qu'il est monté, aucun emplacement ne s'affiche. */
export function useSansPublicite(actif = true) {
  useEffect(() => {
    if (!actif) return;
    activites++; prevenir();
    return () => { activites--; prevenir(); };
  }, [actif]);
}

/**
 * Emplacement publicitaire (NKALA_AUDIT_COMPLET.md §10bis.1). Ne rend rien si la publicité est coupée par le serveur, si l'utilisateur
 * est abonné, enfant ou sans compte, hors ligne ou en pleine activité. Sinon la passerelle de l'API (GET /v1/pub) choisit une création ;
 * aucune donnée personnelle n'est transmise. L'affichage et le clic sont comptés une fois.
 */
export function EmplacementPub({ zone }: { zone: ZonePub }) {
  const { profil } = useAuth();
  const { abonne } = useDroits();
  const { c } = useTheme();
  const [enLigne, setEnLigne] = useState(true);
  const [creation, setCreation] = useState<CreationPub | null>(null);
  const [, rafraichir] = useState(0);
  const compte = useRef<string | null>(null);
  useEffect(() => NetInfo.addEventListener(e => setEnLigne(e.isConnected !== false)), []);
  useEffect(() => { const f = () => rafraichir(n => n + 1); ecouteurs.add(f); return () => { ecouteurs.delete(f); }; }, []);
  const visible = !!profil && zoneAffichable(zone, {
    active: fonctionActive('publicite'), abonne, enLigne, profil: profilAgeDepuis(profil?.birthDate), activiteEnCours: activites > 0,
  });
  useEffect(() => {
    if (!visible) { setCreation(null); return; }
    let annule = false;
    demanderPub(zone).then(r => { if (!annule) setCreation(r.pub); }).catch(() => {});
    return () => { annule = true; };
  }, [visible, zone]);
  useEffect(() => { if (creation && compte.current !== creation.id) { compte.current = creation.id; signalerPub('affichage', creation.id, zone).catch(() => {}); } }, [creation, zone]);
  if (!visible || !creation) return null;
  const { hauteur } = ZONES[zone];
  return (
    <Pressable accessibilityRole={creation.lien ? 'link' : 'image'} accessibilityLabel={`Publicité : ${creation.texte_alt}`}
      onPress={() => { if (creation.lien) { signalerPub('clic', creation.id, zone).catch(() => {}); Linking.openURL(creation.lien).catch(() => {}); } }}
      style={{ height: hauteur ?? 50, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.bord, backgroundColor: c.carte, flexDirection: 'row', alignItems: 'center' }}>
      <Visuel uri={creation.image} largeur={(hauteur ?? 50) * 2} hauteur={hauteur ?? 50} rayon={0} icone="etiquette" />
      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <Text style={{ fontFamily: polices.corpsGras, fontSize: 11, color: c.discret }}>Publicité{creation.annonceur ? ` · ${creation.annonceur}` : ''}</Text>
        <Text numberOfLines={2} style={{ fontFamily: polices.corpsMoyen, fontSize: 13, color: c.fort }}>{creation.titre || creation.texte_alt}</Text>
      </View>
    </Pressable>
  );
}

/** Autorise-t-on les publicités dans les listes ? Mêmes raisons de s'abstenir que les bandeaux. */
function usePubsAutorisees(zone: ZonePub) {
  const { profil } = useAuth();
  const { abonne } = useDroits();
  const [enLigne, setEnLigne] = useState(true);
  const [, rafraichir] = useState(0);
  useEffect(() => NetInfo.addEventListener(e => setEnLigne(e.isConnected !== false)), []);
  useEffect(() => { const f = () => rafraichir(n => n + 1); ecouteurs.add(f); return () => { ecouteurs.delete(f); }; }, []);
  return !!profil && zoneAffichable(zone, { active: fonctionActive('publicite'), abonne, enLigne, profil: profilAgeDepuis(profil?.birthDate), activiteEnCours: activites > 0 });
}

/** Créations à glisser dans une liste (voir melangerPubs). Liste vide quand la publicité est interdite ou indisponible. */
export function useFilPub(zone: ZonePub, n = 3): PubFil[] {
  const ok = usePubsAutorisees(zone);
  const [pubs, setPubs] = useState<PubFil[]>([]);
  useEffect(() => {
    if (!ok) { setPubs([]); return; }
    let annule = false;
    demanderFilPub(zone, n).then(r => { if (!annule) setPubs(r.pubs); }).catch(() => {});
    return () => { annule = true; };
  }, [ok, zone, n]);
  return pubs;
}

/** Publication sponsorisée, au format d'un élément de la liste, avec la mention « Publicité » toujours visible. */
export function PubDansListe({ pub }: { pub: PubFil }) {
  const { c } = useTheme();
  const compte = useRef(false);
  useEffect(() => { if (!compte.current) { compte.current = true; signalerPub('affichage', pub.id, pub.zone).catch(() => {}); } }, [pub.id, pub.zone]);
  const ouvrir = () => { if (pub.lien) { signalerPub('clic', pub.id, pub.zone).catch(() => {}); Linking.openURL(pub.lien).catch(() => {}); } };
  return (
    <View accessibilityLabel={`Publicité : ${pub.texte_alt}`} style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.bordAmbre, backgroundColor: c.carte }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12 }}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: c.squelette }}><Text style={{ fontFamily: polices.corpsTresGras, fontSize: 11, letterSpacing: 0.6, color: c.discret }}>PUBLICITÉ</Text></View>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: polices.corpsGras, fontSize: 13, color: c.fort }}>{pub.annonceur || 'Annonceur'}</Text>
      </View>
      {pub.image ? <Visuel uri={pub.image} largeur="100%" hauteur={150} rayon={0} icone="etiquette" style={{ marginTop: 10 }} /> : null}
      <View style={{ padding: 14, gap: 10 }}>
        <Text style={{ fontFamily: polices.corpsMoyen, fontSize: 15, lineHeight: 21, color: c.texte }}>{pub.titre || pub.texte_alt}</Text>
        {pub.lien ? <Pressable accessibilityRole="link" accessibilityLabel={`${pub.cta || 'Découvrir'} : ${pub.texte_alt}`} onPress={ouvrir} style={{ alignSelf: 'flex-start', paddingHorizontal: 16, height: 38, borderRadius: 12, borderWidth: 1.5, borderColor: c.accent, justifyContent: 'center' }}><Text style={{ fontFamily: polices.titre, fontSize: 14, color: c.accent }}>{pub.cta || 'Découvrir'}</Text></Pressable> : null}
      </View>
    </View>
  );
}

/** Liste dont les éléments alternent avec des publications sponsorisées (mention « Publicité »). Sans publicité autorisée, c'est la liste seule. */
export function FilAvecPubs<T>({ items, zone, cle, rendu, premier = 2, intervalle = 5 }: { items: readonly T[]; zone: ZonePub; cle: (i: T) => string; rendu: (i: T) => React.ReactNode; premier?: number; intervalle?: number }) {
  const pubs = useFilPub(zone);
  return <>{melangerPubs(items, pubs, cle, { premier, intervalle }).map(e => (e.type === 'pub' ? <PubDansListe key={e.cle} pub={e.pub} /> : <View key={e.cle}>{rendu(e.item)}</View>))}</>;
}
