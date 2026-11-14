/** Étape « Médias » : photos (appareil ou galerie), vidéos, photos 360°, étiquette de pièce, ordre (la première photo = couverture), état d'envoi. */
import { useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { CATALOGUE_LOGEMENT, libellePiece, LIMITES_MEDIAS, VIDEO_MAX_S, type TypeMedia } from '@nkala/noyau';
import { Barre, Bouton, Carte, Feuille, Ic, Pastille, Puce, SectionTitre, T, useToast } from '../kit';
import { useTheme } from '../Prefs';
import { choisirImages, choisirVideo, preparerImage, type ImageChoisie, type MediaLocal, type Source } from './medias';
import type { Progression } from './fileMediasAnnonce';

const LIBELLES: Record<TypeMedia, string> = { photo: 'Photos', video: 'Vidéos', pano360: 'Photos 360°' };

export function EtapeMedias({ medias, ajouter, modifier, retirer, deplacer, progression, onRelancer }: {
  medias: MediaLocal[];
  ajouter: (m: MediaLocal[]) => Promise<void>;
  modifier: (id: string, p: Partial<MediaLocal>) => void;
  retirer: (id: string) => void;
  deplacer: (id: string, sens: -1 | 1) => void;
  progression: Progression;
  onRelancer: () => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const [occupe, setOccupe] = useState<string | null>(null);
  const [aConfirmer, setAConfirmer] = useState<ImageChoisie[]>([]);
  const [piecePour, setPiecePour] = useState<string | null>(null);
  const [source, setSource] = useState<{ type: TypeMedia } | null>(null);
  const compte = (t: TypeMedia) => medias.filter(m => m.type === t).length;
  const reste = (t: TypeMedia) => LIMITES_MEDIAS[t] - compte(t);

  const traiter = async (imgs: ImageChoisie[], type: 'photo' | 'pano360') => {
    if (!imgs.length) return;
    setOccupe(type === 'photo' ? 'Préparation des photos…' : 'Préparation de la photo 360°…');
    try {
      const prets: MediaLocal[] = [];
      let ordre = medias.length;
      for (const im of imgs.slice(0, reste(type))) prets.push(await preparerImage(im, type, ordre++));
      await ajouter(prets);
      if (imgs.length > reste(type)) toast(`${LIBELLES[type]} : ${LIMITES_MEDIAS[type]} au plus.`, 'erreur');
    } catch (e) { toast((e as Error).message || 'Image illisible.', 'erreur'); } finally { setOccupe(null); }
  };

  const choisir = async (type: TypeMedia, src: Source) => {
    setSource(null);
    if (reste(type) <= 0) { toast(`${LIBELLES[type]} : ${LIMITES_MEDIAS[type]} au plus.`, 'erreur'); return; }
    if (type === 'video') {
      setOccupe('Préparation de la vidéo…');
      try { const r = await choisirVideo(src, medias.length); if (r.erreur) toast(r.erreur, 'erreur'); if (r.media) await ajouter([r.media]); }
      finally { setOccupe(null); }
      return;
    }
    const r = await choisirImages(src, reste(type));
    if (r.erreur) { toast(r.erreur, 'erreur'); return; }
    if (type === 'pano360') {
      const ok = r.images.filter(i => i.probable360), non = r.images.length - ok.length;
      if (non) toast(`${non} image${non > 1 ? 's' : ''} pas au format 360° (largeur = 2 × hauteur) : ajoutez-la comme photo.`, 'erreur');
      await traiter(ok, 'pano360');
      return;
    }
    // Photo : une image au format 2:1 est peut-être une 360 → on demande
    await traiter(r.images.filter(i => !i.probable360), 'photo');
    const q = r.images.filter(i => i.probable360);
    if (q.length) setAConfirmer(q);
  };

  const repondre360 = async (oui: boolean) => {
    const [im, ...suite] = aConfirmer;
    setAConfirmer(suite);
    if (im) await traiter([im], oui ? 'pano360' : 'photo');
  };

  const tri = [...medias].sort((a, b) => a.ordre - b.ordre);
  const pct = progression.total ? progression.envoyes / progression.total : 0;
  const premierePhoto = tri.find(m => m.type === 'photo')?.id;
  return (
    <View style={{ gap: 14 }}>
      <T v="corps">Ajoutez au moins une photo. Les vidéos et photos 360° aident beaucoup les personnes qui ne peuvent pas se déplacer.</T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['photo', 'video', 'pano360'] as TypeMedia[]).map(t => (
          <Pressable key={t} accessibilityRole="button" accessibilityLabel={`Ajouter : ${LIBELLES[t]}`} disabled={!!occupe} onPress={() => (t === 'pano360' ? choisir('pano360', 'galerie') : setSource({ type: t }))}
            style={{ flex: 1, minHeight: 92, borderRadius: 18, padding: 12, gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: c.carte, borderWidth: 1, borderColor: c.bordAmbre, opacity: occupe ? 0.5 : 1 }}>
            <Ic nom={t === 'photo' ? 'camera' : t === 'video' ? 'video' : 'globe-outline'} taille={28} couleur={c.accent} />
            <T v="petit" fort style={{ textAlign: 'center' }}>{LIBELLES[t]}</T>
            <T v="petit" couleur={c.discret}>{compte(t)} / {LIMITES_MEDIAS[t]}</T>
          </Pressable>
        ))}
      </View>
      <T v="petit">Photos 360° : importez une image d'appareil 360° (Insta360, Ricoh Theta…) ou du mode « Panorama 360 / Photo Sphere » de votre téléphone. Vidéos : {VIDEO_MAX_S} secondes et 50 Mo au plus.</T>
      {occupe && <Carte plat><View style={{ padding: 14 }}><T v="petit">{occupe}</T></View></Carte>}

      {medias.length > 0 && (
        <Carte plat><View style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="carte">Envoi</T>
            <T v="petit">{progression.horsLigne ? 'Hors ligne : reprise au retour du réseau' : pct >= 1 ? 'Tout est envoyé' : progression.enCours ? `${Math.round(pct * 100)} %` : `${Math.round(pct * 100)} % · en pause`}</T>
          </View>
          <Barre valeur={pct} couleur={pct >= 1 ? c.succes : c.accent} />
          {pct < 1 && !progression.enCours && <Bouton label="Reprendre l'envoi" petit variante="fantome" onPress={onRelancer} />}
        </View></Carte>
      )}

      {(['photo', 'video', 'pano360'] as TypeMedia[]).filter(t => compte(t)).map(t => (
        <View key={t} style={{ gap: 10 }}>
          <SectionTitre titre={LIBELLES[t]} />
          {tri.filter(m => m.type === t).map((m, k, l) => {
            const vu = m.uriVignette ?? (m.type !== 'video' ? m.uri : undefined);
            const fini = m.envoye.principal && (!m.cheminVignette || m.envoye.vignette) && (!m.cheminHd || m.envoye.hd);
            return (
              <Carte key={m.id} plat><View style={{ padding: 10, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ width: 84, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: c.fond2, alignItems: 'center', justifyContent: 'center' }}>
                  {vu ? <Image source={{ uri: vu }} style={{ width: '100%', height: '100%' }} /> : <Ic nom={m.type === 'video' ? 'lecture' : 'image'} taille={26} couleur={c.discret} />}
                  {m.id === premierePhoto && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(23,13,8,0.75)', paddingVertical: 2 }}><T v="petit" couleur="#F59E0B" style={{ textAlign: 'center', fontSize: 10 }}>Couverture</T></View>}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Choisir la pièce" onPress={() => setPiecePour(m.id)}>
                    <T v="corps" fort couleur={m.piece ? c.texte : c.accent}>{libellePiece(m.piece) || 'Quelle pièce ? ›'}</T>
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {m.erreur ? <Pastille label="Erreur" couleur={c.erreur} fond={c.carte} /> : fini ? <Pastille label="✓ Envoyé" couleur={c.succes} fond={c.carte} /> : <Pastille label="En attente" fond={c.carte} />}
                    {m.capturedInApp && <Pastille label="Pris sur place" couleur={c.accent} fond={c.carte} />}
                    {!!m.dureeS && <Pastille label={`${Math.round(m.dureeS)} s`} fond={c.carte} />}
                  </View>
                  {!!m.erreur && <T v="petit" couleur={c.erreur}>{m.erreur}</T>}
                </View>
                <View style={{ gap: 4 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Monter" disabled={k === 0} onPress={() => deplacer(m.id, -1)} hitSlop={6} style={{ opacity: k === 0 ? 0.3 : 1 }}><Ic nom="fleche_haut" taille={20} couleur={c.texte} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Descendre" disabled={k === l.length - 1} onPress={() => deplacer(m.id, 1)} hitSlop={6} style={{ opacity: k === l.length - 1 ? 0.3 : 1 }}><Ic nom="fleche_bas" taille={20} couleur={c.texte} /></Pressable>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Retirer ce média" onPress={() => retirer(m.id)} hitSlop={8}><Ic nom="supprimer" taille={20} couleur={c.erreur} /></Pressable>
              </View></Carte>
            );
          })}
        </View>
      ))}

      <Feuille visible={!!source} onClose={() => setSource(null)} titre={source?.type === 'video' ? 'Ajouter une vidéo' : 'Ajouter des photos'}>
        {Platform.OS !== 'web' && <Bouton label={source?.type === 'video' ? 'Filmer maintenant' : 'Prendre une photo'} icone={source?.type === 'video' ? 'video' : 'camera'} onPress={() => source && choisir(source.type, 'camera')} />}
        <Bouton label="Choisir dans la galerie" icone="image" variante="fantome" onPress={() => source && choisir(source.type, 'galerie')} />
        <T v="petit">Prises sur place avec l'appareil photo de Nkala, vos photos et vidéos comptent pour le badge « Visite certifiée » (au moins 3, dont une vidéo ou une 360°, à moins de 150 m du logement).</T>
      </Feuille>
      <Feuille visible={aConfirmer.length > 0} onClose={() => repondre360(false)} titre="C'est une photo 360° ?">
        {aConfirmer[0] && <Image source={{ uri: aConfirmer[0].uri }} style={{ width: '100%', height: 140, borderRadius: 14 }} resizeMode="cover" />}
        <T v="corps">Cette image a le format d'une photo 360° (largeur égale à deux fois la hauteur). Si oui, on pourra la regarder tout autour dans la visionneuse.</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Bouton label="Oui, 360°" icone="globe-outline" onPress={() => repondre360(true)} style={{ flex: 1 }} />
          <Bouton label="Photo normale" variante="fantome" onPress={() => repondre360(false)} style={{ flex: 1 }} />
        </View>
      </Feuille>
      <Feuille visible={!!piecePour} onClose={() => setPiecePour(null)} titre="Quelle pièce ?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATALOGUE_LOGEMENT.pieces.map(p => <Puce key={p.id} label={p.label} actif={medias.find(m => m.id === piecePour)?.piece === p.id} onPress={() => { if (piecePour) modifier(piecePour, { piece: p.id }); setPiecePour(null); }} />)}
        </View>
      </Feuille>
    </View>
  );
}
