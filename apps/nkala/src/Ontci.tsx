/** Ontci (Écouter) : à la une, albums, recherche, ma musique, radio en direct, télévision. Catalogue lu dans les fichiers importés. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { enListe, type Ligne } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { useGlobale } from './Globale';
import { Bouton, Carte, Champ, Chargement, Ecran, Entete, EtatVide, Ic, Onde, Pastille, Puce, Rangee, SectionTitre, T, Visuel } from './kit';
import { useLecteur, type Piste } from './Lecteur';
import { usePile } from './Pile';
import { useTheme } from './Prefs';
import { EmplacementPub } from './Pub';
import { useContenus } from './useContenu';
import { Verrou } from './Verrou';

type E = { t: 'accueil' } | { t: 'album'; id: string } | { t: 'chercher' } | { t: 'ma' } | { t: 'radio' } | { t: 'tv' } | { t: 'chaine'; id: string } | { t: 'playlist'; id: string };
type Pile = ReturnType<typeof usePile<E>>;

const CLE_FAV = 'nkala_ontci_favoris', CLE_REC = 'nkala_ontci_recents';

export function Ontci() {
  const pile = usePile<E>({ t: 'accueil' });
  const { res, chargement } = useContenus(['artistes', 'albums', 'titres', 'radios', 'chaines_tv', 'playlists', 'genres']);
  const L = useLecteur();
  const { ouvrirLecteur } = useGlobale();
  const [fav, setFav] = useState<string[]>([]);
  const [rec, setRec] = useState<string[]>([]);
  useEffect(() => { AsyncStorage.multiGet([CLE_FAV, CLE_REC]).then(([f, r]) => { if (f[1]) setFav(JSON.parse(f[1])); if (r[1]) setRec(JSON.parse(r[1])); }).catch(() => {}); }, []);
  const basculerFav = useCallback((id: string) => setFav(f => { const n = f.includes(id) ? f.filter(x => x !== id) : [...f, id]; AsyncStorage.setItem(CLE_FAV, JSON.stringify(n)).catch(() => {}); return n; }), []);

  const D = useMemo(() => {
    const artistes = res.artistes ?? [], albums = res.albums ?? [];
    const pistes: (Piste & { album_id?: string })[] = (res.titres ?? []).map(t => {
      const al = albums.find(a => a.id === t.album_id), ar = artistes.find(a => a.id === (t.artiste_id || al?.artiste_id));
      return { album_id: t.album_id, id: t.id, titre: t.titre, artiste: ar?.nom ?? 'Artiste', pochette: al?.pochette, couleur: al?.couleur, audio_url: t.audio_url, duree_s: t.duree_s, paroles: t.paroles, traduction: t.traduction, niveau_acces: t.niveau_acces ?? 'libre', collection: 'titres' };
    });
    return { artistes, albums, pistes, radios: res.radios ?? [], tv: res.chaines_tv ?? [], playlists: res.playlists ?? [], genres: res.genres ?? [] };
  }, [res]);

  const jouer = (liste: Piste[], i = 0) => {
    L.jouer(liste, i);
    const id = liste[i]?.id; if (id) setRec(r => { const n = [id, ...r.filter(x => x !== id)].slice(0, 30); AsyncStorage.setItem(CLE_REC, JSON.stringify(n)).catch(() => {}); return n; });
    ouvrirLecteur();
  };
  if (chargement) return <Ecran><Chargement /></Ecran>;
  const e = pile.ecran;
  const ctx = { D, pile, jouer, fav, basculerFav, rec };
  switch (e.t) {
    case 'album': return <Album id={e.id} {...ctx} />;
    case 'playlist': return <Playlist id={e.id} {...ctx} />;
    case 'chercher': return <Chercher {...ctx} />;
    case 'ma': return <MaMusique {...ctx} />;
    case 'radio': return <Radios {...ctx} />;
    case 'tv': return <Television {...ctx} />;
    case 'chaine': return <Chaine id={e.id} D={D} pile={pile} />;
    default: return <Accueil {...ctx} />;
  }
}
type Ctx = { D: { artistes: Ligne[]; albums: Ligne[]; pistes: Piste[]; radios: Ligne[]; tv: Ligne[]; playlists: Ligne[]; genres: Ligne[] }; pile: Pile; jouer: (l: Piste[], i?: number) => void; fav: string[]; basculerFav: (id: string) => void; rec: string[] };

const Pochette = ({ a, taille = 150, onPress }: { a: Ligne; taille?: number; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={`Album ${a.titre}`} onPress={onPress} style={{ width: taille, gap: 6 }}>
    <Visuel uri={a.pochette} couleur={a.couleur} taille={taille} rayon={18} icone="musique" /><T v="carte" numberOfLines={1}>{a.titre}</T><T v="petit" numberOfLines={1}>{a.annee ?? ''}</T>
  </Pressable>
);

// ------------------------------------------------------------------ accueil écouter (61)
function Accueil({ D, pile, jouer, rec }: Ctx) {
  const { c } = useTheme();
  const une = D.albums.filter(a => a.a_la_une === true || a.a_la_une === 'oui');
  const recents = rec.map(id => D.pistes.find(p => p.id === id)).filter(Boolean) as Piste[];
  return (
    <Ecran bas={160}>
      <Entete titre="Écouter" droite={<View style={{ flexDirection: 'row', gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Chercher" onPress={() => pile.pousser({ t: 'chercher' })} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord, alignItems: 'center', justifyContent: 'center' }}><Ic nom="chercher" taille={22} /></Pressable></View>} />
      <Rangee>{[<Puce key="m" label="Ma musique" icone="coeur" onPress={() => pile.pousser({ t: 'ma' })} />, <Puce key="r" label="Radio en direct" icone="radio" onPress={() => pile.pousser({ t: 'radio' })} />, <Puce key="t" label="Télévision" icone="tv" onPress={() => pile.pousser({ t: 'tv' })} />]}</Rangee>
      {D.radios.length > 0 && <Carte onPress={() => pile.pousser({ t: 'radio' })} accent="#C85A32" label="Radio en direct"><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}><Pastille label="● EN DIRECT" couleur="#FDFAF7" fond="#B91C1C" /><View style={{ flex: 1 }}><T v="carte">{D.radios[0].nom}</T><T v="petit">{D.radios[0].description}</T></View><Onde barres={6} hauteur={24} /></View></Carte>}
      {une.length > 0 && <><SectionTitre titre="À la une" /><Rangee>{une.map(a => <Pochette key={a.id} a={a} taille={170} onPress={() => pile.pousser({ t: 'album', id: a.id })} />)}</Rangee></>}
      <EmplacementPub zone="bandeau_catalogue" />
      {D.playlists.length > 0 && <><SectionTitre titre="Listes de l'équipe" /><Rangee>{D.playlists.map(p => <Carte key={p.id} onPress={() => pile.pousser({ t: 'playlist', id: p.id })} accent={p.couleur} style={{ width: 160 }} label={p.titre}><View style={{ padding: 14, gap: 6, minHeight: 100 }}><Ic nom="musique" taille={26} couleur={c.accent} /><T v="carte" numberOfLines={2}>{p.titre}</T><T v="petit" numberOfLines={2}>{p.description}</T></View></Carte>)}</Rangee></>}
      <SectionTitre titre="Nouveautés" />
      {D.albums.length === 0 ? <EtatVide mascotte titre="Le catalogue arrive" texte="Les premiers titres seront bientôt là." /> : <Rangee>{D.albums.map(a => <Pochette key={a.id} a={a} onPress={() => pile.pousser({ t: 'album', id: a.id })} />)}</Rangee>}
      {recents.length > 0 && <><SectionTitre titre="Récemment écoutés" />{recents.slice(0, 5).map((p, i) => <LigneTitre key={p.id} p={p} onPress={() => jouer(recents, i)} />)}</>}
      {D.pistes.length > 0 && D.genres.length > 0 && <><SectionTitre titre="Genres" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{D.genres.map(g => <Pressable key={g.id} accessibilityRole="button" onPress={() => pile.pousser({ t: 'chercher' })} style={{ width: '48%', height: 72, borderRadius: 16, padding: 12, justifyContent: 'flex-end', backgroundColor: g.couleur ?? c.accent }}><T v="carte" couleur="#170D08">{g.titre}</T></Pressable>)}</View></>}
    </Ecran>
  );
}

function LigneTitre({ p, onPress, fav, onFav }: { p: Piste; onPress: () => void; fav?: boolean; onFav?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${p.titre}, ${p.artiste}`} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 6, borderRadius: 14, backgroundColor: pressed ? c.carte : 'transparent' })}>
      <Visuel uri={p.pochette} couleur={p.couleur ?? undefined} taille={48} rayon={12} icone="musique" />
      <View style={{ flex: 1 }}><T v="carte" numberOfLines={1}>{p.titre}</T><T v="petit" numberOfLines={1}>{p.artiste}</T></View>
      {p.niveau_acces && p.niveau_acces !== 'libre' && <Ic nom="verrou" taille={16} couleur={c.discret} />}
      {onFav && <Pressable accessibilityRole="button" accessibilityLabel={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} hitSlop={10} onPress={onFav}><Ic nom="coeur" taille={22} couleur={fav ? c.erreur : c.discret} /></Pressable>}
    </Pressable>
  );
}

// ------------------------------------------------------------------ album (62)
function Album({ id, D, pile, jouer, fav, basculerFav }: Ctx & { id: string }) {
  const a = D.albums.find(x => x.id === id);
  const liste = useMemo(() => D.pistes.filter(p => (p as Piste & { album_id?: string }).album_id === id), [D, id]);
  const { c } = useTheme();
  if (!a) return <Ecran><Entete titre="Album introuvable" retour={pile.retour} /></Ecran>;
  const ar = D.artistes.find(x => x.id === a.artiste_id);
  return (
    <Ecran halo={false} bas={160} style={{ backgroundColor: a.couleur ?? c.fond }}>
      <LinearGradient pointerEvents="none" colors={[(a.couleur ?? '#5A2414') + 'CC', c.fond]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }} />
      <Entete titre="" retour={pile.retour} />
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Visuel uri={a.pochette} couleur={a.couleur} taille={230} rayon={22} icone="musique" />
        <T v="titre" style={{ textAlign: 'center' }}>{a.titre}</T><T v="corps" style={{ textAlign: 'center' }}>{ar?.nom} · {a.annee} · {a.genre}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}><Bouton label="Lecture" icone="lecture" variante="ambre" onPress={() => liste.length && jouer(liste, 0)} style={{ flex: 1 }} /><Bouton label="Aléatoire" icone="aleatoire" variante="fantome" onPress={() => liste.length && jouer([...liste].sort(() => Math.random() - 0.5), 0)} style={{ flex: 1 }} /></View>
      {liste.length === 0 ? <T v="corps">Aucun titre dans cet album pour le moment.</T> : liste.map((p, i) => (
        <Verrou key={p.id} contenu={{ id: p.id, acces: (p.niveau_acces as never) || 'libre', roles: ['admin'] }}><LigneTitre p={p} onPress={() => jouer(liste, i)} fav={fav.includes(p.id)} onFav={() => basculerFav(p.id)} /></Verrou>
      ))}
    </Ecran>
  );
}

function Playlist({ id, D, pile, jouer, fav, basculerFav }: Ctx & { id: string }) {
  const p = D.playlists.find(x => x.id === id);
  const ids = enListe(p?.titres_ids);
  const liste = ids.map(i => D.pistes.find(x => x.id === i)).filter(Boolean) as Piste[];
  return (
    <Ecran bas={160}>
      <Entete titre={p?.titre ?? 'Liste'} sous={p?.description} retour={pile.retour} />
      <Bouton label="Tout écouter" icone="lecture" variante="ambre" desactive={!liste.length} onPress={() => jouer(liste, 0)} />
      {liste.map((t, i) => <LigneTitre key={t.id} p={t} onPress={() => jouer(liste, i)} fav={fav.includes(t.id)} onFav={() => basculerFav(t.id)} />)}
    </Ecran>
  );
}

// ------------------------------------------------------------------ chercher (69)
function Chercher({ D, pile, jouer }: Ctx) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const n = q.trim().toLowerCase();
  const titres = n ? D.pistes.filter(p => (p.titre + ' ' + p.artiste).toLowerCase().includes(n)) : [];
  const albums = n ? D.albums.filter(a => String(a.titre).toLowerCase().includes(n)) : [];
  return (
    <Ecran bas={160}>
      <Entete titre="Chercher" retour={pile.retour} />
      <Champ valeur={q} onChange={setQ} placeholder="Titres, artistes, albums" icone="chercher" focus />
      {!n && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{D.genres.map(g => <Pressable key={g.id} accessibilityRole="button" onPress={() => setQ(String(g.titre))} style={{ width: '48%', height: 76, borderRadius: 16, padding: 12, justifyContent: 'flex-end', backgroundColor: g.couleur ?? c.accent }}><T v="carte" couleur="#170D08">{g.titre}</T></Pressable>)}</View>}
      {n && titres.length === 0 && albums.length === 0 && <EtatVide icone="chercher" titre="Rien trouvé" texte="Essaie un autre mot." />}
      {albums.map(a => <Pressable key={a.id} accessibilityRole="button" onPress={() => pile.pousser({ t: 'album', id: a.id })} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Visuel uri={a.pochette} couleur={a.couleur} taille={48} rayon={10} icone="musique" /><T v="carte">{a.titre}</T></Pressable>)}
      {titres.map((p, i) => <LigneTitre key={p.id} p={p} onPress={() => jouer(titres, i)} />)}
    </Ecran>
  );
}

// ------------------------------------------------------------------ ma musique (68)
function MaMusique({ D, pile, jouer, fav, basculerFav, rec }: Ctx) {
  const [onglet, setOnglet] = useState<'fav' | 'rec' | 'tel'>('fav');
  const f = fav.map(id => D.pistes.find(p => p.id === id)).filter(Boolean) as Piste[];
  const r = rec.map(id => D.pistes.find(p => p.id === id)).filter(Boolean) as Piste[];
  const liste = onglet === 'fav' ? f : r;
  return (
    <Ecran bas={160}>
      <Entete titre="Ma musique" retour={pile.retour} />
      <Rangee>{[['fav', 'Favoris'], ['rec', 'Récents'], ['tel', 'Téléchargés']].map(([id, l]) => <Puce key={id} label={l} actif={onglet === id} onPress={() => setOnglet(id as never)} />)}</Rangee>
      {onglet === 'tel' ? <EtatVide icone="telecharger" titre="Téléchargements chiffrés" texte="Écouter sans réseau arrive avec la protection des contenus (niveau 1)." /> :
        liste.length === 0 ? <EtatVide icone="coeur" titre={onglet === 'fav' ? 'Pas encore de favoris' : 'Rien écouté récemment'} texte={onglet === 'fav' ? 'Touche le cœur d\'un titre pour le retrouver ici.' : undefined} /> :
          liste.map((p, i) => <LigneTitre key={p.id} p={p} onPress={() => jouer(liste, i)} fav={fav.includes(p.id)} onFav={() => basculerFav(p.id)} />)}
    </Ecran>
  );
}

// ------------------------------------------------------------------ radio (66) et télévision (67)
function Radios({ D, pile, jouer }: Ctx) {
  const L = useLecteur();
  const [sel, setSel] = useState(0);
  const r = D.radios[sel];
  const prog = Array.isArray(r?.programme) ? (r.programme as { heure: string; titre: string }[]) : [];
  return (
    <Ecran bas={160}>
      <Entete titre="Radio en direct" retour={pile.retour} />
      {D.radios.length === 0 ? <EtatVide icone="radio" titre="Pas encore de radio" texte="Les webradios arrivent bientôt." /> : <>
        <Rangee>{D.radios.map((x, i) => <Puce key={x.id} label={x.nom} actif={sel === i} onPress={() => setSel(i)} />)}</Rangee>
        <Carte accent={r.couleur} style={{ padding: 20, gap: 12, alignItems: 'center' }}>
          <Pastille label="● EN DIRECT" couleur="#FDFAF7" fond="#B91C1C" /><Visuel uri={r.image} couleur={r.couleur} taille={140} rayon={24} icone="radio" /><T v="sousTitre">{r.nom}</T><T v="petit" style={{ textAlign: 'center' }}>{r.description}</T>
          <Onde actif={L.enLecture && L.courant?.id === r.id} barres={20} />
          <Bouton label={L.enLecture && L.courant?.id === r.id ? 'Pause' : 'Écouter le direct'} icone={L.enLecture && L.courant?.id === r.id ? 'pause' : 'lecture'} variante="ambre" desactive={!r.flux_url} onPress={() => (L.courant?.id === r.id ? L.basculer() : jouer([{ id: r.id, titre: r.nom, artiste: 'En direct', pochette: r.image, couleur: r.couleur, audio_url: r.flux_url, niveau_acces: 'libre' }], 0))} />
          {!r.flux_url && <T v="petit">L'adresse du flux n'est pas encore renseignée.</T>}
        </Carte>
        {prog.length > 0 && <><SectionTitre titre="Programme" />{prog.map(x => <View key={x.heure + x.titre} style={{ flexDirection: 'row', gap: 12 }}><T v="carte" style={{ width: 56 }}>{x.heure}</T><T v="corps">{x.titre}</T></View>)}</>}
      </>}
    </Ecran>
  );
}

function Television({ D, pile }: Ctx) {
  return (
    <Ecran bas={160}>
      <Entete titre="Télévision" retour={pile.retour} />
      {D.tv.length === 0 ? <EtatVide icone="tv" titre="Pas encore de chaîne" texte="Les chaînes en direct arrivent bientôt." /> : D.tv.map(ch => (
        <Carte key={ch.id} onPress={() => pile.pousser({ t: 'chaine', id: ch.id })} label={ch.nom}><Visuel uri={ch.image} hauteur={140} largeur="100%" rayon={0} icone="tv" /><View style={{ padding: 14, gap: 4 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Pastille label="● DIRECT" couleur="#FDFAF7" fond="#B91C1C" /><T v="carte">{ch.nom}</T></View><T v="petit">{ch.description}</T></View></Carte>
      ))}
    </Ecran>
  );
}
function Chaine({ id, D, pile }: { id: string; D: Ctx['D']; pile: Pile }) {
  const ch = D.tv.find(x => x.id === id);
  const player = useVideoPlayer(ch?.flux_url ? { uri: ch.flux_url } : null, p => { p.play(); });
  const guide = Array.isArray(ch?.guide) ? (ch!.guide as { heure: string; titre: string }[]) : [];
  return (
    <Ecran bas={160}>
      <Entete titre={ch?.nom ?? 'Chaîne'} retour={pile.retour} />
      <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 16 / 9 }}>{ch?.flux_url ? <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls allowsFullscreen /> : <EtatVide icone="tv" titre="Flux non renseigné" />}</View>
      {guide.length > 0 && <><SectionTitre titre="Guide" />{guide.map(x => <View key={x.heure + x.titre} style={{ flexDirection: 'row', gap: 12 }}><T v="carte" style={{ width: 56 }}>{x.heure}</T><T v="corps">{x.titre}</T></View>)}</>}
    </Ecran>
  );
}
void useAuth;
