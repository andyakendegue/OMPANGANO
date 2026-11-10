import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { demanderPub, fonctionActive, profilAgeDepuis, signalerPub, zoneAffichable, ZONES, type CreationPub, type ZonePub } from '@nkala/noyau';
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
