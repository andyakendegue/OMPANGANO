/** Page détail d'une annonce de logement (et aperçu identique avant l'envoi), « Mes alertes ». */
import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CHARGES_COMPRISES, distanceM, formaterDistance, formaterPrix, libellePiece, libelleTypeBien, publierContenu, TRANSACTIONS,
  type LogementPublic, type MediaAnnonce,
} from '@nkala/noyau';
import { Bouton, Carte, EtatVide, Feuille, Ic, Pastille, Puce, Rangee, SectionTitre, T, useToast } from '../kit';
import { useTheme } from '../Prefs';
import { AffichageEquipements } from './Equipements';
import { Visionneuse360, type Pano } from './Visionneuse360';
import { ajouterAlerte, alertesDisponibles, basculerAlerte, lireAlertes, RAYONS_ALERTE, supprimerAlerte, type AlerteLogement } from './alertesProximite';

/** Média avec adresses lisibles : URL signée (serveur) ou fichier local (aperçu du brouillon). */
export type MediaVu = MediaAnnonce & { url?: string; urlVignette?: string; urlHd?: string; uri?: string; uriVignette?: string; uriHd?: string };
export type LogementVu = Partial<LogementPublic> & { medias?: MediaVu[]; couvertureUrl?: string; positionReelle?: { lat: number; lng: number } };
export interface AnnonceVue { id?: string; titre?: string; description?: string; prix?: number; ville?: string; telephone?: string; auteur?: string; distance_m?: number; logement: LogementVu }

const src = (m: MediaVu) => m.url ?? m.uri;
const vignette = (m: MediaVu) => m.urlVignette ?? m.uriVignette ?? (m.type !== 'video' ? src(m) : undefined);
export const prixAnnonce = (a: AnnonceVue) => (a.prix ? formaterPrix(a.prix, a.logement.periode === 'total' ? undefined : a.logement.periode) : 'Prix sur demande');

function LecteurVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, p => { p.loop = false; });
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 14 }} />;
}

function PleinEcranPhotos({ photos, depart, visible, onClose }: { photos: MediaVu[]; depart: number; visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const [i, setI] = useState(depart);
  useEffect(() => { if (visible) setI(depart); }, [visible, depart]);
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="fade" statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: depart * width, y: 0 }} onMomentumScrollEnd={e => setI(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {photos.map(p => <Image key={p.id} source={{ uri: src(p) }} resizeMode="contain" style={{ width, height }} accessibilityLabel={libellePiece(p.piece) || 'Photo'} />)}
        </ScrollView>
        <View style={{ position: 'absolute', top: ins.top + 10, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}><Ic nom="fermer" couleur="#fff" /></Pressable>
          <T v="carte" couleur="#fff">{i + 1} / {photos.length}{photos[i]?.piece ? ` · ${libellePiece(photos[i].piece)}` : ''}</T>
        </View>
      </View>
    </Modal>
  );
}

function Galerie({ medias }: { medias: MediaVu[] }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const larg = Math.min(width, 640) - 32;
  const photos = medias.filter(m => m.type === 'photo'), videos = medias.filter(m => m.type === 'video'), panos = medias.filter(m => m.type === 'pano360');
  const onglets = ([['photo', `Photos · ${photos.length}`], ['video', `Vidéos · ${videos.length}`], ['pano360', `360° · ${panos.length}`]] as const).filter(([t]) => medias.some(m => m.type === t));
  const [onglet, setOnglet] = useState<string>(onglets[0]?.[0] ?? 'photo');
  const [i, setI] = useState(0);
  const [plein, setPlein] = useState<number | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [pano, setPano] = useState<number | null>(null);
  const listePanos: Pano[] = panos.map(p => ({ id: p.id, url: src(p)!, urlHd: p.urlHd ?? p.uriHd, apercu: vignette(p), piece: p.piece })).filter(p => !!p.url);
  if (!medias.length) return <View style={{ height: 180, borderRadius: 18, backgroundColor: c.carte, alignItems: 'center', justifyContent: 'center' }}><Ic nom="image" taille={40} couleur={c.discret} /></View>;
  return (
    <View style={{ gap: 10 }}>
      {onglets.length > 1 && <Rangee>{onglets.map(([t, l]) => <Puce key={t} label={l} icone={t === 'photo' ? 'image' : t === 'video' ? 'video' : 'globe-outline'} actif={onglet === t} onPress={() => { setOnglet(t); setI(0); }} />)}</Rangee>}
      {onglet === 'photo' && photos.length > 0 && (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: 18 }} onMomentumScrollEnd={e => setI(Math.round(e.nativeEvent.contentOffset.x / larg))}>
            {photos.map((p, k) => (
              <Pressable key={p.id} accessibilityRole="imagebutton" accessibilityLabel={`Agrandir la photo ${k + 1}`} onPress={() => setPlein(k)}>
                <Image source={{ uri: src(p) }} style={{ width: larg, height: larg * 0.66, backgroundColor: c.carte }} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 6 }}>
            {!!photos[i]?.piece && <Pastille label={libellePiece(photos[i].piece)} couleur="#FDFAF7" fond="rgba(23,13,8,0.75)" />}
            <Pastille label={`${i + 1} / ${photos.length}`} couleur="#FDFAF7" fond="rgba(23,13,8,0.75)" />
          </View>
        </View>
      )}
      {onglet === 'video' && videos.map(v => (
        video === v.id && src(v) ? <LecteurVideo key={v.id} url={src(v)!} /> : (
          <Pressable key={v.id} accessibilityRole="button" accessibilityLabel="Lire la vidéo" onPress={() => setVideo(v.id)} style={{ height: larg * 0.56, borderRadius: 18, overflow: 'hidden', backgroundColor: c.carte, alignItems: 'center', justifyContent: 'center' }}>
            {vignette(v) && <Image source={{ uri: vignette(v) }} style={{ position: 'absolute', width: '100%', height: '100%' }} />}
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(23,13,8,0.75)', alignItems: 'center', justifyContent: 'center' }}><Ic nom="lecture" taille={30} couleur="#F59E0B" /></View>
            <View style={{ position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 6 }}>
              {!!v.dureeS && <Pastille label={`${Math.round(v.dureeS)} s`} couleur="#FDFAF7" fond="rgba(23,13,8,0.75)" />}
              {!!v.piece && <Pastille label={libellePiece(v.piece)} couleur="#FDFAF7" fond="rgba(23,13,8,0.75)" />}
            </View>
          </Pressable>
        )))}
      {onglet === 'pano360' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {panos.map((p, k) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Ouvrir la photo 360° ${libellePiece(p.piece)}`} onPress={() => setPano(k)}
              style={{ width: panos.length === 1 ? '100%' : '48%', height: panos.length === 1 ? larg * 0.5 : 120, borderRadius: 16, overflow: 'hidden', backgroundColor: c.carte, justifyContent: 'flex-end' }}>
              {vignette(p) && <Image source={{ uri: vignette(p) }} style={{ position: 'absolute', width: '100%', height: '100%' }} />}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, backgroundColor: 'rgba(23,13,8,0.6)' }}>
                <Ic nom="globe-outline" taille={18} couleur="#F59E0B" /><T v="petit" couleur="#FDFAF7" style={{ flex: 1 }}>{libellePiece(p.piece) || 'Visite 360°'}</T><T v="petit" couleur="#F59E0B">Ouvrir</T>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      <PleinEcranPhotos photos={photos} depart={plein ?? 0} visible={plein !== null} onClose={() => setPlein(null)} />
      {listePanos.length > 0 && <Visionneuse360 panos={listePanos} depart={pano ?? 0} visible={pano !== null} onClose={() => setPano(null)} />}
    </View>
  );
}

function Info({ icone, texte }: { icone: string; texte: string }) {
  const { c } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}><Ic nom={icone} taille={18} couleur={c.accent} /><T v="petit">{texte}</T></View>;
}
const LigneCond = ({ l, v }: { l: string; v: string }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 4 }}><T v="corps">{l}</T><T v="corps" fort>{v}</T></View>;

/** Corps de la fiche (sans les boutons) : sert à la page détail et à l'aperçu avant l'envoi. */
export function VueLogement({ a, pos }: { a: AnnonceVue; pos?: { lat: number; lng: number } | null }) {
  const { c } = useTheme();
  const [infoCertif, setInfoCertif] = useState(false);
  const L = a.logement, p = L.pieces ?? {}, co = L.conditions ?? {};
  const medias = useMemo(() => [...(L.medias ?? [])].sort((x, y) => x.ordre - y.ordre), [L.medias]);
  const pt = L.positionPublique ?? L.position;
  const dist = a.distance_m ?? (pos && pt ? distanceM(pos, pt) : undefined);
  const cuisine = ({ interieure: 'Cuisine intérieure', exterieure: 'Cuisine extérieure', americaine: 'Cuisine américaine', aucune: 'Sans cuisine' } as Record<string, string>)[p.cuisine ?? ''] ?? '';
  const meuble = ({ non: 'Non meublé', partiel: 'Partiellement meublé', oui: 'Meublé' } as Record<string, string>)[p.meuble ?? ''] ?? '';
  const conditions: [string, string][] = [
    co.cautionMois !== undefined ? ['Caution', `${co.cautionMois} mois`] : null,
    co.avanceMois !== undefined ? ['Avance de loyer', `${co.avanceMois} mois`] : null,
    co.fraisAgence !== undefined ? ["Frais d'agence", formaterPrix(co.fraisAgence)] : null,
    co.fraisVisite !== undefined ? ['Frais de visite', formaterPrix(co.fraisVisite)] : null,
    co.charges !== undefined ? ['Charges', formaterPrix(co.charges, 'mois')] : null,
    co.chargesComprises?.length ? ['Charges comprises', co.chargesComprises.map(x => CHARGES_COMPRISES.find(k => k.id === x)?.label ?? x).join(', ')] : null,
    co.disponibleLe ? ['Disponible le', new Date(co.disponibleLe).toLocaleDateString('fr-FR')] : null,
    co.dureeMinMois !== undefined ? ['Durée minimale', `${co.dureeMinMois} mois`] : null,
    co.animaux !== undefined ? ['Animaux', co.animaux ? 'Acceptés' : 'Non acceptés'] : null,
  ].filter(Boolean) as [string, string][];
  return (
    <>
      <Galerie medias={medias} />
      <T v="titre" couleur={c.accent}>{prixAnnonce(a)}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pastille label={TRANSACTIONS.find(t => t.id === L.transaction)?.label ?? 'Logement'} fond={c.carte} />
        {!!L.typeBien && <Pastille label={libelleTypeBien(L.typeBien)} fond={c.carte} />}
        {!!meuble && <Pastille label={meuble} fond={c.carte} />}
        {L.negociable && <Pastille label="Négociable" couleur={c.accent} fond={c.carte} />}
        {L.certifiee && <Pressable accessibilityRole="button" accessibilityLabel="Visite certifiée : explication" onPress={() => setInfoCertif(true)}><Pastille label="✓ Visite certifiée" couleur={c.succes} fond={c.carte} /></Pressable>}
        {dist !== undefined && <Pastille label={formaterDistance(dist)} fond={c.carte} />}
      </View>
      {!!a.description && <T v="corps">{a.description}</T>}
      <SectionTitre titre="Pièces" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {!!p.chambres && <Info icone="bed" texte={`${p.chambres} chambre${p.chambres > 1 ? 's' : ''}`} />}
        {!!p.salons && <Info icone="tv-outline" texte={`${p.salons} salon${p.salons > 1 ? 's' : ''}`} />}
        {!!p.sallesDeBain && <Info icone="water-outline" texte={`${p.sallesDeBain} salle${p.sallesDeBain > 1 ? 's' : ''} de bain`} />}
        {!!p.wcInterieurs && <Info icone="male-female-outline" texte={`${p.wcInterieurs} WC intérieur${p.wcInterieurs > 1 ? 's' : ''}`} />}
        {!!p.wcExterieurs && <Info icone="male-female-outline" texte={`${p.wcExterieurs} WC extérieur${p.wcExterieurs > 1 ? 's' : ''}`} />}
        {!!cuisine && <Info icone="restaurant-outline" texte={cuisine} />}
        {!!p.surfaceHabitable && <Info icone="resize" texte={`${p.surfaceHabitable} m² habitables`} />}
        {!!p.surfaceTerrain && <Info icone="map-outline" texte={`Terrain ${p.surfaceTerrain} m²`} />}
        {p.etage !== undefined && <Info icone="layers-outline" texte={p.etage === 0 ? 'Rez-de-chaussée' : `${p.etage}e étage`} />}
        {!!p.niveaux && <Info icone="layers" texte={`${p.niveaux} niveau${p.niveaux > 1 ? 'x' : ''}`} />}
      </View>
      <SectionTitre titre="Équipements et services" />
      <AffichageEquipements valeurs={L.equipements} />
      {conditions.length > 0 && <><SectionTitre titre="Conditions" /><Carte plat><View style={{ padding: 14 }}>{conditions.map(([l, v]) => <LigneCond key={l} l={l} v={v} />)}</View></Carte></>}
      <SectionTitre titre="Emplacement" />
      <Carte plat><View style={{ padding: 14, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}><Ic nom="village" taille={18} couleur={c.accent} /><T v="corps" style={{ flex: 1 }}>{[L.quartier, a.ville].filter(Boolean).join(', ') || 'Quartier non précisé'}</T></View>
        {!!L.repere && <View style={{ flexDirection: 'row', gap: 10 }}><Ic nom="flag-outline" taille={18} couleur={c.accent} /><T v="corps" style={{ flex: 1 }}>{L.repere}</T></View>}
        {L.masquee && <T v="petit">Emplacement approximatif (à 300 m près) : le propriétaire précisera l'adresse au moment de la visite.</T>}
      </View></Carte>
      <Feuille visible={infoCertif} onClose={() => setInfoCertif(false)} titre="Visite certifiée">
        <T v="corps">Au moins trois photos ou vidéos, dont une vidéo ou une photo 360°, ont été prises avec l'appareil photo depuis l'application Nkala, à moins de 150 m de l'emplacement indiqué.</T>
        <T v="petit">C'est une déclaration de l'application, pas une garantie : une position de téléphone peut être falsifiée. Visitez toujours avant de payer, et ne versez jamais d'argent sans avoir vu le logement.</T>
        <Bouton label="Compris" onPress={() => setInfoCertif(false)} />
      </Feuille>
    </>
  );
}

/** Boutons de la page détail : alerte, appeler, WhatsApp, itinéraire, partager, signaler. */
export function ActionsLogement({ a, onSignale }: { a: AnnonceVue & { id: string }; onSignale?: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const L = a.logement;
  const pt = L.positionPublique ?? L.position;
  const [feuille, setFeuille] = useState(false);
  const [rayon, setRayon] = useState(300);
  const [alerte, setAlerte] = useState<AlerteLogement | null>(null);
  useEffect(() => { lireAlertes().then(l => setAlerte(l.find(x => x.annonceId === a.id) ?? null)); }, [a.id, feuille]);
  const tel = (a.telephone ?? '').replace(/[^\d+]/g, '');
  const wa = (L.whatsapp || a.telephone || '').replace(/\D/g, '');
  const waNum = wa.length === 8 || wa.length === 9 ? `241${wa.replace(/^0/, '')}` : wa;
  const itineraire = () => pt && Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${pt.lat},${pt.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${pt.lat},${pt.lng}`).catch(() => {});
  const activer = async () => {
    if (!pt) return;
    const r = await ajouterAlerte({ annonceId: a.id, titre: a.titre ?? 'Logement', prixLabel: prixAnnonce(a), quartier: L.quartier, lat: pt.lat, lng: pt.lng, rayonM: rayon }, !!L.masquee);
    toast(r.message, r.ok ? 'succes' : 'erreur'); setFeuille(false);
  };
  return (
    <>
      <Carte plat onPress={() => setFeuille(true)} label="M'alerter quand je passe à proximité"><View style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Ic nom="cloche" taille={22} couleur={alerte?.actif ? c.accent : c.discret} />
        <View style={{ flex: 1 }}><T v="carte">M'alerter quand je passe à proximité</T><T v="petit">{!alertesDisponibles ? "Disponible dans l'application mobile" : alerte?.actif ? `Alerte active à ${alerte.rayonM} m` : 'Notification quand vous passez près de ce logement'}</T></View>
      </View></Carte>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Bouton label="Appeler" icone="telephone" desactive={!tel} onPress={() => Linking.openURL(`tel:${tel}`).catch(() => {})} style={{ flex: 1 }} />
        <Bouton label="WhatsApp" icone="logo-whatsapp" variante="ambre" desactive={wa.length < 8} onPress={() => Linking.openURL(`https://wa.me/${waNum}?text=${encodeURIComponent(`Bonjour, je vous contacte au sujet de votre annonce Nkala : ${a.titre ?? ''}`)}`).catch(() => {})} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Bouton label={L.masquee ? 'Itinéraire (zone)' : 'Itinéraire'} icone="itineraire" variante="fantome" desactive={!pt} onPress={itineraire} style={{ flex: 1 }} />
        <Bouton label="Partager" icone="partage" variante="fantome" onPress={() => Share.share({ message: `${a.titre} — ${prixAnnonce(a)}${L.quartier ? `\n${L.quartier}${a.ville ? `, ${a.ville}` : ''}` : ''}\nÀ voir dans l'application Nkala (Village > Annonces > Logement).` }).catch(() => {})} style={{ flex: 1 }} />
      </View>
      <Bouton label="Signaler cette annonce" variante="fantome" petit onPress={async () => { try { await publierContenu('signalements', { titre: `Annonce ${a.id}`, description: `Annonce signalée : ${a.titre}`, categorie: 'annonce' }); toast('Signalement envoyé, merci.', 'succes'); } catch (e) { toast((e as Error).message, 'erreur'); } onSignale?.(); }} />
      <Feuille visible={feuille} onClose={() => setFeuille(false)} titre="Alerte de proximité">
        {!alertesDisponibles ? <T v="corps">Disponible dans l'application mobile Nkala (Android et iPhone).</T> : <>
          <T v="corps">Nkala vous préviendra par une notification quand vous passerez près de ce logement, même application fermée, au plus une fois par jour.</T>
          <T v="petit">Pour cela, le téléphone va demander l'accès à votre position « toujours ». Votre position reste sur votre téléphone : elle n'est jamais envoyée à Nkala. Sans cet accès, l'alerte ne fonctionne que lorsque l'application est ouverte.</T>
          <T v="libelle">Rayon</T>
          <Rangee>{RAYONS_ALERTE.map(r => <Puce key={r} label={r < 1000 ? `${r} m` : '1 km'} actif={rayon === r} onPress={() => setRayon(r)} />)}</Rangee>
          {L.masquee && <T v="petit">Emplacement approximatif : rayon de 300 m au minimum.</T>}
          <Bouton label={alerte?.actif ? 'Mettre à jour l\'alerte' : 'Activer l\'alerte'} icone="cloche" onPress={activer} />
          {alerte && <Bouton label="Supprimer l'alerte" variante="fantome" petit onPress={async () => { await supprimerAlerte(a.id); setAlerte(null); setFeuille(false); toast('Alerte supprimée.', 'succes'); }} />}
        </>}
      </Feuille>
    </>
  );
}

/** « Mes alertes » : liste, désactiver, supprimer. */
export function MesAlertes({ onOuvrir }: { onOuvrir: (annonceId: string) => void }) {
  const { c } = useTheme();
  const [liste, setListe] = useState<AlerteLogement[] | null>(null);
  const charger = () => lireAlertes().then(setListe);
  useEffect(() => { charger(); }, []);
  if (!alertesDisponibles) return <EtatVide icone="cloche" titre="Alertes de proximité" texte="Disponible dans l'application mobile." />;
  if (!liste) return null;
  if (!liste.length) return <EtatVide icone="cloche" titre="Aucune alerte" texte="Sur une annonce de logement, touchez « M'alerter quand je passe à proximité »." />;
  return (
    <View style={{ gap: 10 }}>
      <T v="petit">{liste.filter(a => a.actif).length} / 20 alertes actives. Elles sont gardées sur ce téléphone seulement.</T>
      {liste.map(a => (
        <Carte key={a.annonceId} plat><View style={{ padding: 14, gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={() => onOuvrir(a.annonceId)}><T v="carte">{a.titre}</T><T v="petit">{[a.quartier, a.prixLabel, `rayon ${a.rayonM} m`].filter(Boolean).join(' · ')}</T></Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Bouton label={a.actif ? 'Désactiver' : 'Réactiver'} petit large={false} variante="fantome" onPress={async () => { await basculerAlerte(a.annonceId, !a.actif); charger(); }} />
            <Bouton label="Supprimer" petit large={false} variante="fantome" onPress={async () => { await supprimerAlerte(a.annonceId); charger(); }} />
            {a.actif && <Ic nom="cloche" taille={18} couleur={c.accent} style={{ alignSelf: 'center' }} />}
          </View>
        </View></Carte>
      ))}
    </View>
  );
}
