/** Liste des logements : cartes riches, filtres (dont rayon autour de moi), tri, carte schématique. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import {
  CATALOGUE_LOGEMENT, chargerLogements, formaterDistance, itemEquipement, libelleTypeBien, resumePieces, TRANSACTIONS, type FiltresLogement,
} from '@nkala/noyau';
import { Bouton, Carte, Champ, Chargement, EtatVide, Feuille, Ic, Pastille, Puce, Rangee, T } from '../kit';
import { useTheme } from '../Prefs';
import { EmplacementPub, FilAvecPubs } from '../Pub';
import { positionActuelle } from './medias';
import { prixAnnonce, type AnnonceVue } from './DetailLogement';

type Annonce = AnnonceVue & { id: string; cree?: string };
const CLE_FILTRES = 'nkala_filtres_logement';
const TRIS: [NonNullable<FiltresLogement['tri']>, string][] = [['recent', 'Récentes'], ['prix', 'Prix croissant'], ['-prix', 'Prix décroissant'], ['distance', 'Distance'], ['completude', 'Plus complètes']];

function CarteLogement({ a, onPress }: { a: Annonce; onPress: () => void }) {
  const { c } = useTheme();
  const L = a.logement;
  const m = L.medias ?? [];
  const n360 = m.filter(x => x.type === 'pano360').length, nVid = m.filter(x => x.type === 'video').length;
  return (
    <Carte onPress={onPress} label={a.titre}>
      <View style={{ height: 160, backgroundColor: c.carte }}>
        {L.couvertureUrl ? <Image source={{ uri: L.couvertureUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ic nom="maison" taille={40} couleur={c.discret} /></View>}
        <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 }}>
          {n360 > 0 && <Pastille label="360°" couleur="#170D08" fond="#F59E0B" />}
          {nVid > 0 && <Pastille label="Vidéo" couleur="#FDFAF7" fond="rgba(23,13,8,0.75)" />}
          {L.certifiee && <Pastille label="✓ Certifiée" couleur="#FDFAF7" fond="#15803D" />}
        </View>
      </View>
      <View style={{ padding: 14, gap: 4 }}>
        <T v="sousTitre" couleur={c.accent}>{prixAnnonce(a)}</T>
        <T v="carte" numberOfLines={1}>{a.titre}</T>
        <T v="petit">{[libelleTypeBien(L.typeBien), resumePieces(L.pieces)].filter(Boolean).join(' · ')}</T>
        <T v="petit" couleur={c.discret}>{[L.quartier, a.ville, a.distance_m !== undefined && formaterDistance(a.distance_m)].filter(Boolean).join(' · ')}</T>
      </View>
    </Carte>
  );
}

/** Carte schématique : les logements placés les uns par rapport aux autres (la carte routière viendra avec le module natif de cartes). */
function CarteLogements({ liste, onOuvrir }: { liste: Annonce[]; onOuvrir: (a: Annonce) => void }) {
  const { c } = useTheme();
  const [sel, setSel] = useState<Annonce | null>(null);
  const pts = liste.filter(a => a.logement.positionPublique);
  if (!pts.length) return <EtatVide icone="carte" titre="Aucun logement à placer" />;
  const lats = pts.map(a => a.logement.positionPublique!.lat), lngs = pts.map(a => a.logement.positionPublique!.lng);
  const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const xy = (a: Annonce) => { const p = a.logement.positionPublique!; return { x: lo1 === lo0 ? 50 : 8 + ((p.lng - lo0) / (lo1 - lo0)) * 84, y: la1 === la0 ? 50 : 8 + ((la1 - p.lat) / (la1 - la0)) * 84 }; };
  return (
    <View style={{ gap: 10 }}>
      <View style={{ height: 320, borderRadius: 24, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord, overflow: 'hidden' }}>
        {pts.map(a => { const p = xy(a); return (
          <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={a.titre} onPress={() => setSel(a)} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, marginLeft: -16, marginTop: -32 }}>
            <Ic nom={a.logement.masquee ? 'radio-button-on' : 'location'} taille={32} couleur={sel?.id === a.id ? c.fort : c.accent} />
          </Pressable>); })}
      </View>
      <T v="petit">Carte schématique. Les emplacements masqués sont approximatifs.</T>
      {sel && <CarteLogement a={sel} onPress={() => onOuvrir(sel)} />}
    </View>
  );
}

export function ListeLogements({ onOuvrir, onPublier, onAlertes }: { onOuvrir: (a: Annonce) => void; onPublier: () => void; onAlertes: () => void }) {
  const { c } = useTheme();
  const [f, setF] = useState<FiltresLogement>({ tri: 'recent' });
  const [liste, setListe] = useState<Annonce[] | null>(null);
  const [err, setErr] = useState(false);
  const [feuille, setFeuille] = useState(false);
  const [carte, setCarte] = useState(false);
  const [localise, setLocalise] = useState(false);
  useEffect(() => { AsyncStorage.getItem(CLE_FILTRES).then(v => { if (v) { const s = JSON.parse(v) as FiltresLogement; delete s.lat; delete s.lng; delete s.rayon_km; if (s.tri === 'distance') s.tri = 'recent'; setF(s); } }).catch(() => {}); }, []);
  useEffect(() => {
    setListe(null); setErr(false);
    chargerLogements(f).then(l => setListe(l as Annonce[])).catch(() => setErr(true));
    // La position n'est jamais gardée sur l'appareil avec les filtres
    const { lat: _a, lng: _b, rayon_km: _c, ...garde } = f; AsyncStorage.setItem(CLE_FILTRES, JSON.stringify(garde)).catch(() => {});
  }, [f]);
  const autourDeMoi = async (rayon?: number) => {
    setLocalise(true);
    const p = await positionActuelle();
    setLocalise(false);
    if (!p) return;
    setF(x => ({ ...x, lat: p.lat, lng: p.lng, rayon_km: rayon ?? x.rayon_km, tri: rayon ? 'distance' : x.tri }));
  };
  const nbFiltres = ['transaction', 'type', 'prix_min', 'prix_max', 'chambres_min', 'meuble', 'quartier', 'rayon_km', 'avec360', 'certifiee'].filter(k => (f as Record<string, unknown>)[k]).length + (f.equip?.length ?? 0);
  const set = (p: Partial<FiltresLogement>) => setF(x => ({ ...x, ...p }));
  const basc = (id: string) => set({ equip: f.equip?.includes(id) ? f.equip.filter(x => x !== id) : [...(f.equip ?? []), id] });
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Bouton label="Publier un logement" icone="ajouter" variante="ambre" onPress={onPublier} style={{ flex: 1 }} />
        <Bouton label="Mes alertes" icone="cloche" variante="fantome" large={false} onPress={onAlertes} />
      </View>
      <Rangee>
        <Puce label={nbFiltres ? `Filtres · ${nbFiltres}` : 'Filtres'} icone="filtre" actif={nbFiltres > 0} onPress={() => setFeuille(true)} />
        <Puce label={f.rayon_km ? `≤ ${f.rayon_km} km` : localise ? 'Localisation…' : 'Autour de moi'} icone="itineraire" actif={!!f.rayon_km} onPress={() => (f.rayon_km ? set({ rayon_km: undefined, lat: undefined, lng: undefined, tri: f.tri === 'distance' ? 'recent' : f.tri }) : autourDeMoi(3))} />
        <Puce label="Avec 360°" actif={!!f.avec360} onPress={() => set({ avec360: !f.avec360 })} />
        <Puce label="Certifiées" actif={!!f.certifiee} onPress={() => set({ certifiee: !f.certifiee })} />
        <Puce label={carte ? 'Liste' : 'Voir sur la carte'} icone={carte ? 'liste' : 'carte'} onPress={() => setCarte(!carte)} />
      </Rangee>
      <Rangee>{TRIS.map(([id, l]) => <Puce key={id} label={l} actif={f.tri === id} onPress={() => (id === 'distance' && f.lat === undefined ? autourDeMoi() .then(() => set({ tri: 'distance' })) : set({ tri: id }))} />)}</Rangee>
      <EmplacementPub zone="annonce_dans_liste" />
      {err ? <EtatVide icone="alerte" titre="Annonces indisponibles" texte="Réessayez quand vous aurez du réseau." /> : !liste ? <Chargement lignes={2} /> :
        liste.length === 0 ? <EtatVide icone="maison" titre="Aucun logement trouvé" texte={nbFiltres ? 'Élargissez vos filtres.' : 'Soyez le premier à publier.'} /> :
        carte ? <CarteLogements liste={liste} onOuvrir={onOuvrir} /> :
        <FilAvecPubs items={liste} zone="annonce_dans_liste" cle={a => a.id} rendu={a => (a.logement ? <CarteLogement a={a} onPress={() => onOuvrir(a)} /> :
          <Carte onPress={() => onOuvrir(a)} label={a.titre}><View style={{ padding: 14, gap: 4 }}><T v="carte">{a.titre}</T>{(a.prix ?? 0) > 0 && <T v="sousTitre" couleur={c.accent}>{Number(a.prix).toLocaleString('fr-FR')} FCFA</T>}<T v="petit">{[a.ville, a.auteur].filter(Boolean).join(' · ')}</T></View></Carte>)} />}
      <Feuille visible={feuille} onClose={() => setFeuille(false)} titre="Filtres">
        <T v="libelle">Transaction</T>
        <Rangee>{TRANSACTIONS.map(t => <Puce key={t.id} label={t.label} actif={f.transaction === t.id} onPress={() => set({ transaction: f.transaction === t.id ? undefined : t.id })} />)}</Rangee>
        <T v="libelle">Type de bien</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{CATALOGUE_LOGEMENT.typesDeBien.map(t => <Puce key={t.id} label={t.label} icone={t.icon} actif={f.type === t.id} onPress={() => set({ type: f.type === t.id ? undefined : t.id })} />)}</View>
        <T v="libelle">Prix (FCFA)</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Champ valeur={f.prix_min ? String(f.prix_min) : ''} onChange={t => set({ prix_min: Number(t.replace(/\D/g, '')) || undefined })} placeholder="Minimum" clavier="number-pad" style={{ flex: 1 }} />
          <Champ valeur={f.prix_max ? String(f.prix_max) : ''} onChange={t => set({ prix_max: Number(t.replace(/\D/g, '')) || undefined })} placeholder="Maximum" clavier="number-pad" style={{ flex: 1 }} />
        </View>
        <T v="libelle">Chambres (au moins)</T>
        <Rangee>{[1, 2, 3, 4, 5].map(n => <Puce key={n} label={n === 5 ? '5 et +' : String(n)} actif={f.chambres_min === n} onPress={() => set({ chambres_min: f.chambres_min === n ? undefined : n })} />)}</Rangee>
        <T v="libelle">Meublé</T>
        <Rangee>{([['oui', 'Meublé'], ['partiel', 'Partiellement'], ['non', 'Non meublé']] as const).map(([id, l]) => <Puce key={id} label={l} actif={f.meuble === id} onPress={() => set({ meuble: f.meuble === id ? undefined : id })} />)}</Rangee>
        <T v="libelle">Quartier ou ville</T>
        <Champ valeur={f.quartier ?? ''} onChange={t => set({ quartier: t || undefined })} placeholder="Ex. Batterie IV, Owendo…" auto="words" />
        <T v="libelle">Rayon autour de moi</T>
        <Rangee>{[1, 3, 5, 10].map(r => <Puce key={r} label={`${r} km`} actif={f.rayon_km === r} onPress={() => (f.rayon_km === r ? set({ rayon_km: undefined }) : f.lat !== undefined ? set({ rayon_km: r }) : autourDeMoi(r))} />)}</Rangee>
        <T v="libelle">Équipements clés</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{CATALOGUE_LOGEMENT.filtresCles.map(id => { const it = itemEquipement(id); return it ? <Puce key={id} label={it.label} icone={it.icon} actif={!!f.equip?.includes(id)} onPress={() => basc(id)} /> : null; })}</View>
        <Rangee><Puce label="Avec 360°" actif={!!f.avec360} onPress={() => set({ avec360: !f.avec360 })} /><Puce label="Avec vidéo" actif={!!f.avecVideo} onPress={() => set({ avecVideo: !f.avecVideo })} /><Puce label="Certifiées seulement" actif={!!f.certifiee} onPress={() => set({ certifiee: !f.certifiee })} /></Rangee>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Bouton label="Effacer" variante="fantome" onPress={() => setF({ tri: 'recent' })} style={{ flex: 1 }} />
          <Bouton label="Voir les logements" onPress={() => setFeuille(false)} style={{ flex: 1 }} />
        </View>
      </Feuille>
    </>
  );
}
