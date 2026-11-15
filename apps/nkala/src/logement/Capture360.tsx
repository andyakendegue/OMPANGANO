/**
 * Capture 360° guidée : la personne se place au centre de la pièce et prend 8 à 10 photos en tournant sur elle-même.
 * La boussole du téléphone (expo-location, déjà présent) indique de combien tourner avant chaque photo et mesure l'angle réel ;
 * les photos sont ensuite assemblées en panorama sur le téléphone (assemblage360.ts). Aucun module natif nouveau.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Bouton, Carte, Ic, T } from '../kit';
import { useTheme } from '../Prefs';
import { Assembleur } from './Assembleur';
import { champDeVision, focaleExif, hauteurSansTrou, nombrePhotos, type ConfigAssemblage, type ResultatAssemblage } from './assemblage360';
import { autoriserPosition, fichierDepuisDataUri, nouvelId, positionActuelle, prendrePhoto360, reduireEnDataUri, type ImageChoisie } from './medias';
import { Panorama } from './Panorama';

interface Prise { src: string; yaw: number }
type Etape = 'intro' | 'prise' | 'assemblage' | 'apercu';

const ecart = (a: number, b: number) => { const d = ((a - b) % 360 + 540) % 360 - 180; return d; };
const TOLERANCE = 25;

export function Capture360({ visible, onClose, onTermine }: { visible: boolean; onClose: () => void; onTermine: (img: ImageChoisie) => void }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const [etape, setEtape] = useState<Etape>('intro');
  const [prises, setPrises] = useState<Prise[]>([]);
  const [fov, setFov] = useState<{ hfov: number; vfov: number } | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<(ResultatAssemblage & { uri: string }) | null>(null);
  const cap0 = useRef<number | null>(null);
  const position = useRef<Promise<{ lat: number; lng: number } | null> | null>(null);
  const debut = useRef<string>(new Date().toISOString());

  const total = fov ? nombrePhotos(fov.hfov) : 8;
  const pas = 360 / total;
  const k = prises.length;
  const cible = k * pas;
  const relatif = cap !== null && cap0.current !== null ? ((cap - cap0.current) % 360 + 360) % 360 : null;
  const delta = relatif !== null && k > 0 ? ecart(cible, relatif) : null;
  const aligne = delta === null || Math.abs(delta) < 8;

  const reinitialiser = useCallback(() => { setEtape('intro'); setPrises([]); setFov(null); setResultat(null); setErreur(null); cap0.current = null; }, []);
  useEffect(() => { if (!visible) reinitialiser(); }, [visible, reinitialiser]);

  // Boussole (téléphone seulement) pendant la prise de vue
  useEffect(() => {
    if (!visible || etape !== 'prise' || Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null, vivant = true;
    Location.watchHeadingAsync(h => { const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading; if (vivant && Number.isFinite(v)) setCap(v); })
      .then(s => { if (vivant) sub = s; else s.remove(); }).catch(() => setCap(null));
    return () => { vivant = false; sub?.remove(); };
  }, [visible, etape]);

  const commencer = async () => {
    setErreur(null);
    await autoriserPosition();
    position.current = positionActuelle();
    debut.current = new Date().toISOString();
    setEtape('prise');
  };

  const prendre = async () => {
    setErreur(null);
    const capAuMoment = cap;
    const r = await prendrePhoto360();
    if (!r) return;
    if ('erreur' in r) { setErreur(r.erreur); return; }
    setOccupe(true);
    try {
      const src = await reduireEnDataUri(r.uri, r.largeur, r.hauteur);
      let champ = fov;
      if (k === 0) {
        champ = champDeVision(r.largeur, r.hauteur, focaleExif(r.exif));
        setFov(champ);
        cap0.current = capAuMoment;
      }
      // Angle réel mesuré par la boussole ; s'il paraît faux (métal, béton armé), on garde l'angle visé.
      let yaw = cible;
      if (k > 0 && capAuMoment !== null && cap0.current !== null) {
        const mesure = ((capAuMoment - cap0.current) % 360 + 360) % 360;
        if (Math.abs(ecart(mesure, cible)) <= TOLERANCE) yaw = mesure;
      }
      const suite = [...prises, { src, yaw: k === 0 ? 0 : yaw }];
      setPrises(suite);
      if (champ && suite.length >= nombrePhotos(champ.hfov)) setEtape('assemblage');
    } catch (e) { setErreur((e as Error).message || 'Photo illisible.'); } finally { setOccupe(false); }
  };

  const vaov = useMemo(() => (fov ? hauteurSansTrou(prises.map(p => p.yaw), fov.hfov, fov.vfov) : 50), [fov, prises]);
  const config: ConfigAssemblage | null = useMemo(() => (etape === 'assemblage' && fov ? { images: prises, hfov: fov.hfov, vfov: fov.vfov, vaov, largeur: 4096 } : null), [etape, fov, prises, vaov]);
  const fini = useCallback(async (r: ResultatAssemblage) => {
    try {
      const uri = await fichierDepuisDataUri(r.data, `pano360_${nouvelId()}.jpg`);
      setResultat({ ...r, uri }); setEtape('apercu');
    } catch (e) { setErreur((e as Error).message); setEtape('prise'); }
  }, []);
  const echec = useCallback((m: string) => { setErreur(`Assemblage impossible : ${m}`); setEtape('prise'); }, []);

  const utiliser = async () => {
    if (!resultat || !fov) return;
    const pos = await (position.current ?? Promise.resolve(null));
    onTermine({
      uri: resultat.uri, largeur: resultat.largeur, hauteur: resultat.hauteur, probable360: false, capturedInApp: true, capturedAt: debut.current,
      ...(pos ? { capturedLat: pos.lat, capturedLng: pos.lng } : {}),
      pano: { haov: 360, vaov },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.fond, paddingTop: ins.top + 10, paddingBottom: ins.bottom + 16, paddingHorizontal: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Bouton label="Fermer" variante="fantome" petit large={false} icone="fermer" onPress={onClose} />
          <T v="sousTitre" style={{ flex: 1 }}>Photo 360°</T>
          {etape === 'prise' && <T v="petit" couleur={c.accent}>{k} / {total}</T>}
        </View>

        {etape === 'intro' && <ScrollView contentContainerStyle={{ gap: 14 }}>
          <Ic nom="globe-outline" taille={56} couleur={c.accent} style={{ alignSelf: 'center' }} />
          <T v="corps">Nkala va vous guider pour prendre 8 à 10 photos en tournant sur vous-même, puis les assembler en une photo 360°.</T>
          <Carte plat><View style={{ padding: 14, gap: 8 }}>
            <T v="corps">1. Placez-vous au centre de la pièce.</T>
            <T v="corps">2. Tenez le téléphone <T v="corps" fort>à l'horizontale</T>, à hauteur des yeux.</T>
            <T v="corps">3. Tournez sur vous-même <T v="corps" fort>sans avancer</T>, dans le sens indiqué, et prenez chaque photo quand la flèche est verte.</T>
            <T v="corps">4. Gardez la même hauteur pour toutes les photos.</T>
          </View></Carte>
          <T v="petit">Évitez qu'une personne bouge dans la pièce pendant la prise. Les photos prises ici comptent pour « Visite certifiée ».</T>
          <Bouton label="Commencer" icone="camera" onPress={commencer} />
        </ScrollView>}

        {etape === 'prise' && <View style={{ flex: 1, gap: 14 }}>
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
            <View style={{ width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: aligne ? c.succes : c.accent, alignItems: 'center', justifyContent: 'center' }}>
              {k === 0 ? <Ic nom="camera" taille={64} couleur={c.accent} /> : delta === null
                ? <T v="titre" couleur={c.accent}>{Math.round(cible)}°</T>
                : <View style={{ transform: [{ rotate: `${Math.max(-90, Math.min(90, delta))}deg` }] }}><Ic nom="arrow-up" taille={90} couleur={aligne ? c.succes : c.accent} /></View>}
            </View>
          </View>
          <T v="carte" style={{ textAlign: 'center' }}>
            {k === 0 ? 'Première photo : visez un mur, téléphone à l\'horizontale.'
              : delta === null ? `Tournez d'environ ${Math.round(pas)}° vers la droite depuis la photo précédente.`
              : aligne ? 'C\'est bon : prenez la photo.'
              : `Tournez de ${Math.abs(Math.round(delta))}° vers la ${delta > 0 ? 'droite' : 'gauche'}.`}
          </T>
          {Platform.OS !== 'web' && cap === null && k > 0 && <T v="petit" style={{ textAlign: 'center' }}>Boussole indisponible : tournez d'un huitième de tour environ entre deux photos.</T>}
          {!!erreur && <T v="petit" couleur={c.erreur} style={{ textAlign: 'center' }}>{erreur}</T>}
          <Bouton label={occupe ? 'Préparation…' : `Prendre la photo ${k + 1} sur ${total}`} icone="camera" charge={occupe} onPress={prendre} />
          {k > 0 && <Bouton label="Reprendre la photo précédente" variante="fantome" petit onPress={() => { setPrises(p => p.slice(0, -1)); if (k === 1) { setFov(null); cap0.current = null; } }} />}
          <ScrollView horizontal contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
            {prises.map((p, i) => <Image key={i} source={{ uri: p.src }} style={{ width: 64, height: 48, borderRadius: 8 }} />)}
          </ScrollView>
        </View>}

        {etape === 'assemblage' && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Ic nom="sync" taille={48} couleur={c.accent} />
          <T v="carte">Assemblage de la photo 360°…</T>
          <T v="petit">Quelques secondes : ne quittez pas l'application.</T>
          {config && <Assembleur config={config} onFini={fini} onErreur={echec} />}
        </View>}

        {etape === 'apercu' && resultat && <View style={{ flex: 1, gap: 12 }}>
          <View style={{ flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#170D08' }}>
            <Panorama url={resultat.uri} pano={{ haov: 360, vaov }} onErreur={setErreur} />
          </View>
          <T v="petit">{resultat.couverture < 0.85 ? 'Quelques zones sont vides (photos trop espacées ou téléphone penché). Vous pouvez recommencer pour un meilleur résultat.' : 'Glissez pour vérifier le résultat.'}</T>
          {!!erreur && <T v="petit" couleur={c.erreur}>{erreur}</T>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Bouton label="Recommencer" variante="fantome" onPress={reinitialiser} style={{ flex: 1 }} />
            <Bouton label="Utiliser cette 360°" icone="ok" onPress={utiliser} style={{ flex: 1 }} />
          </View>
        </View>}
      </View>
    </Modal>
  );
}
