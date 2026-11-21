/**
 * Liste des annonces d'une catégorie (hors logement) : affichage liste, grille ou carte (choisi dans la barre du haut),
 * filtres tirés du catalogue, recherche, rayon de distance (aussi posé sur la carte), tri, alerte de nouvelles annonces,
 * « Mes annonces » avec « Repositionner ».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import {
  categorieAnnonce, chargerAnnoncesFiltrees, creerAlerteAnnonces, formaterDistance, formaterPrix, mesContenus, repositionnerAnnonce, resumeAnnonce,
  type ChampAnnonce,
} from '@nkala/noyau';
import { Bouton, Carte, Champ, Chargement, Ecran, Entete, EtatVide, Feuille, Ic, Pastille, Puce, Rangee, T, useToast } from '../kit';
import { useTheme } from '../Prefs';
import { EmplacementPub } from '../Pub';
import { useAuth } from '../AuthProvider';
import { positionActuelle } from '../logement/medias';
import { CarteOSM } from './CarteOSM';
import { prixAnnonceGenerique, type AnnonceGeneriqueVue } from './DetailAnnonce';

export type Affichage = 'liste' | 'grille' | 'carte';
type Annonce = AnnonceGeneriqueVue & { id: string; cree?: string; statut?: string; remonte_le?: string };
type Filtres = Record<string, string | number | undefined>;
const TRIS: [string, string][] = [['recent', 'Récentes'], ['prix', 'Prix croissant'], ['-prix', 'Prix décroissant'], ['distance', 'Distance'], ['completude', 'Plus complètes']];
export const RAYONS_KM = [1, 3, 5, 10];

/** Boutons liste / grille / carte (barre du haut). */
export function ChoixAffichage({ valeur, onChange }: { valeur: Affichage; onChange: (a: Affichage) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4, backgroundColor: c.carte, borderRadius: 14, padding: 3, borderWidth: 1, borderColor: c.bord }}>
      {([['liste', 'liste', 'Liste'], ['grille', 'grille', 'Grille'], ['carte', 'carte', 'Carte']] as [Affichage, string, string][]).map(([id, ic, l]) => (
        <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Affichage : ${l}`} accessibilityState={{ selected: valeur === id }} onPress={() => onChange(id)}
          style={{ width: 38, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: valeur === id ? c.accent : 'transparent' }}>
          <Ic nom={ic} taille={18} couleur={valeur === id ? c.surAccent ?? '#170D08' : c.texte} />
        </Pressable>
      ))}
    </View>
  );
}
/** Affichage retenu, gardé sur l'appareil. */
export function useAffichage(cle: string): [Affichage, (a: Affichage) => void] {
  const [a, setA] = useState<Affichage>('liste');
  useEffect(() => { AsyncStorage.getItem(`nkala_affichage_${cle}`).then(v => { if (v === 'liste' || v === 'grille' || v === 'carte') setA(v); }).catch(() => {}); }, [cle]);
  return [a, (n: Affichage) => { setA(n); AsyncStorage.setItem(`nkala_affichage_${cle}`, n).catch(() => {}); }];
}

function Vignette({ a, hauteur }: { a: Annonce; hauteur: number }) {
  const { c } = useTheme();
  const url = a.fiche?.couvertureUrl;
  return <View style={{ height: hauteur, backgroundColor: c.carte }}>{url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ic nom={categorieAnnonce(a.categorie_id)?.icon ?? 'pricetag'} taille={34} couleur={c.discret} /></View>}</View>;
}
function CarteListe({ a, onPress }: { a: Annonce; onPress: () => void }) {
  const { c } = useTheme();
  const v = (a.fiche?.medias ?? []).some(m => m.type === 'video');
  return (
    <Carte onPress={onPress} label={a.titre}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 120 }}><Vignette a={a} hauteur={110} /></View>
        <View style={{ flex: 1, padding: 12, gap: 3 }}>
          <T v="carte" numberOfLines={2}>{a.titre}</T>
          <T v="sousTitre" couleur={c.accent}>{prixAnnonceGenerique(a)}</T>
          <T v="petit" numberOfLines={1}>{resumeAnnonce(a.fiche)}</T>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {!!a.fiche?.quartier && <T v="petit" couleur={c.discret}>{a.fiche.quartier}</T>}
            {a.distance_m !== undefined && <T v="petit" couleur={c.discret}>{formaterDistance(a.distance_m)}</T>}
            {v && <Pastille label="Vidéo" fond={c.carte} />}
          </View>
        </View>
      </View>
    </Carte>
  );
}
function CarteGrille({ a, onPress, largeur }: { a: Annonce; onPress: () => void; largeur: number }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a.titre} onPress={onPress} style={{ width: largeur, borderRadius: 16, overflow: 'hidden', backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}>
      <Vignette a={a} hauteur={largeur * 0.8} />
      <View style={{ padding: 8, gap: 2 }}>
        <T v="petit" fort couleur={c.accent} numberOfLines={1}>{prixAnnonceGenerique(a)}</T>
        <T v="petit" numberOfLines={2}>{a.titre}</T>
      </View>
    </Pressable>
  );
}

/** Champs filtrables d'une catégorie (catalogue) : choix → puces, oui/non → puce, nombre/année → min/max. */
function FiltresChamps({ champs, f, set }: { champs: ChampAnnonce[]; f: Filtres; set: (k: string, v: string | number | undefined) => void }) {
  return <>{champs.map(ch => {
    const k = `f_${ch.id}`;
    if (ch.type === 'choix' || ch.type === 'multi') return <View key={ch.id} style={{ gap: 6 }}><T v="libelle">{ch.label}</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ch.options!.map(o => <Puce key={o.id} label={o.label} actif={f[k] === o.id} onPress={() => set(k, f[k] === o.id ? undefined : o.id)} />)}</View></View>;
    if (ch.type === 'bool') return <Puce key={ch.id} label={ch.label} actif={f[k] === '1'} onPress={() => set(k, f[k] === '1' ? undefined : '1')} />;
    if (ch.type === 'nombre' || ch.type === 'annee') return (
      <View key={ch.id} style={{ gap: 4 }}><T v="libelle">{ch.label}{ch.unite ? ` (${ch.unite})` : ''}</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Champ valeur={f[`${k}_min`] !== undefined ? String(f[`${k}_min`]) : ''} onChange={t => set(`${k}_min`, Number(t.replace(/\D/g, '')) || undefined)} placeholder="Min" clavier="number-pad" style={{ flex: 1 }} />
          <Champ valeur={f[`${k}_max`] !== undefined ? String(f[`${k}_max`]) : ''} onChange={t => set(`${k}_max`, Number(t.replace(/\D/g, '')) || undefined)} placeholder="Max" clavier="number-pad" style={{ flex: 1 }} />
        </View></View>);
    return <View key={ch.id} style={{ gap: 4 }}><T v="libelle">{ch.label}</T><Champ valeur={typeof f[k] === 'string' ? String(f[k]) : ''} onChange={t => set(k, t || undefined)} /></View>;
  })}</>;
}

export function ListeAnnonces({ categorie, onOuvrir, onPublier, onMesAnnonces }: { categorie: string; onOuvrir: (a: Annonce) => void; onPublier: () => void; onMesAnnonces: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { profil } = useAuth();
  const { width } = useWindowDimensions();
  const cat = categorieAnnonce(categorie);
  const [affichage, setAffichage] = useAffichage(categorie);
  const [f, setF] = useState<Filtres>({ tri: 'recent' });
  const [q, setQ] = useState('');
  const [liste, setListe] = useState<Annonce[] | null>(null);
  const [err, setErr] = useState(false);
  const [feuille, setFeuille] = useState(false);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [moi, setMoi] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => { setF({ tri: 'recent' }); setQ(''); }, [categorie]);
  useEffect(() => {
    setListe(null); setErr(false);
    const t = setTimeout(() => chargerAnnoncesFiltrees({ categorie, ...f, q: q.trim() || undefined }).then(l => setListe(l as Annonce[])).catch(() => setErr(true)), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [categorie, JSON.stringify(f), q]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cat) return null;
  const set = (k: string, v: string | number | undefined) => setF(x => { const n = { ...x }; if (v === undefined) delete n[k]; else n[k] = v; return n; });
  const rayon = async (km?: number) => {
    if (!km) { setF(x => { const { lat: _a, lng: _b, rayon_km: _c, ...r } = x; return { ...r, tri: x.tri === 'distance' ? 'recent' : x.tri }; }); return; }
    const p = moi ?? await positionActuelle();
    if (!p) { toast('Position indisponible : autorisez la localisation.', 'erreur'); return; }
    setMoi(p); setF(x => ({ ...x, lat: p.lat, lng: p.lng, rayon_km: km, tri: 'distance' }));
  };
  const nbFiltres = Object.keys(f).filter(k => k.startsWith('f_') || ['sc', 'transaction', 'prix_min', 'prix_max'].includes(k)).length;
  const filtrables = cat.champs.filter(ch => ch.filtre && (!ch.pour || (f.sc && ch.pour.includes(String(f.sc)))));
  const alerte = async () => {
    try { await creerAlerteAnnonces(`${cat.label}${f.sc ? ` · ${cat.sousCategories.find(s => s.id === f.sc)?.label}` : ''}${q ? ` · ${q}` : ''}`, { categorie, sc: f.sc, transaction: f.transaction, q: q || undefined, prix_max: f.prix_max, ...(f.rayon_km && moi ? { lat: moi.lat, lng: moi.lng, rayon_km: f.rayon_km } : {}) }); toast('Alerte créée : vous serez prévenu des nouvelles annonces.', 'succes'); }
    catch (e) { toast((e as Error).message, 'erreur'); }
  };
  const largeurGrille = (Math.min(width, 640) - 32 - 12) / 2;
  const points = (liste ?? []).filter(a => a.fiche?.positionPublique).map(a => ({ id: a.id, lat: a.fiche.positionPublique!.lat, lng: a.fiche.positionPublique!.lng, titre: a.titre ?? '', prix: prixAnnonceGenerique(a), approx: !!a.fiche.masquee }));
  const sel = liste?.find(a => a.id === choisi);
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Champ valeur={q} onChange={setQ} placeholder={`Rechercher : ${cat.label.toLowerCase()}…`} icone="chercher" /></View>
        <ChoixAffichage valeur={affichage} onChange={setAffichage} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Bouton label="Publier" icone="ajouter" variante="ambre" onPress={onPublier} style={{ flex: 1 }} />
        {profil && <Bouton label="Mes annonces" icone="liste" variante="fantome" large={false} onPress={onMesAnnonces} />}
      </View>
      <Rangee>
        <Puce label="Toutes" actif={!f.sc} onPress={() => set('sc', undefined)} />
        {cat.sousCategories.map(s => <Puce key={s.id} label={s.label} actif={f.sc === s.id} onPress={() => set('sc', f.sc === s.id ? undefined : s.id)} />)}
      </Rangee>
      <Rangee>
        <Puce label={nbFiltres ? `Filtres · ${nbFiltres}` : 'Filtres'} icone="filtre" actif={nbFiltres > 0} onPress={() => setFeuille(true)} />
        {RAYONS_KM.map(km => <Puce key={km} label={`≤ ${km} km`} actif={f.rayon_km === km} onPress={() => rayon(f.rayon_km === km ? undefined : km)} />)}
        {profil && <Puce label="M'alerter" icone="cloche" onPress={alerte} />}
      </Rangee>
      <Rangee>{TRIS.map(([id, l]) => <Puce key={id} label={l} actif={f.tri === id} onPress={() => (id === 'distance' && !f.lat ? rayon(10) : set('tri', id))} />)}</Rangee>
      <EmplacementPub zone="annonce_dans_liste" />
      {err ? <EtatVide icone="alerte" titre="Annonces indisponibles" texte="Réessayez quand vous aurez du réseau." /> : !liste ? <Chargement lignes={2} /> :
        liste.length === 0 ? <EtatVide icone={cat.icon} titre="Aucune annonce trouvée" texte={nbFiltres || q ? 'Élargissez la recherche ou les filtres.' : 'Soyez le premier à publier.'} /> :
        affichage === 'carte' ? <View style={{ gap: 10 }}>
          <CarteOSM points={points} moi={moi} rayonKm={(f.rayon_km as number) ?? null} choisi={choisi} onChoix={setChoisi} hauteur={420} />
          <T v="petit">{points.length} annonce{points.length > 1 ? 's' : ''} sur la carte. Rayon : touchez une distance ci-dessus.</T>
          {sel && <CarteListe a={sel} onPress={() => onOuvrir(sel)} />}
        </View> :
        affichage === 'grille' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{liste.map(a => <CarteGrille key={a.id} a={a} largeur={largeurGrille} onPress={() => onOuvrir(a)} />)}</View> :
        liste.map(a => <CarteListe key={a.id} a={a} onPress={() => onOuvrir(a)} />)}
      <Feuille visible={feuille} onClose={() => setFeuille(false)} titre="Filtres">
        <T v="libelle">Type d'annonce</T>
        <Rangee>{cat.transactions.map(t => <Puce key={t.id} label={t.label} actif={f.transaction === t.id} onPress={() => set('transaction', f.transaction === t.id ? undefined : t.id)} />)}</Rangee>
        <T v="libelle">{cat.prixLabel ?? 'Prix'} (FCFA)</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Champ valeur={f.prix_min ? String(f.prix_min) : ''} onChange={t => set('prix_min', Number(t.replace(/\D/g, '')) || undefined)} placeholder="Minimum" clavier="number-pad" style={{ flex: 1 }} />
          <Champ valeur={f.prix_max ? String(f.prix_max) : ''} onChange={t => set('prix_max', Number(t.replace(/\D/g, '')) || undefined)} placeholder="Maximum" clavier="number-pad" style={{ flex: 1 }} />
        </View>
        <FiltresChamps champs={filtrables} f={f} set={set} />
        {!f.sc && <T v="petit">Choisissez une catégorie (puces en haut) pour voir ses filtres propres.</T>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Bouton label="Effacer" variante="fantome" onPress={() => setF({ tri: 'recent' })} style={{ flex: 1 }} />
          <Bouton label="Voir les annonces" onPress={() => setFeuille(false)} style={{ flex: 1 }} />
        </View>
      </Feuille>
    </>
  );
}

/** « Mes annonces » : statut (en attente, publiée, refusée), repositionner une annonce publiée. */
export function MesAnnonces({ retour, onOuvrir }: { retour: () => void; onOuvrir: (a: Annonce) => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [liste, setListe] = useState<Annonce[] | null>(null);
  const charger = () => mesContenus('annonces').then(l => setListe(l as Annonce[])).catch(() => setListe([]));
  useEffect(() => { charger(); }, []);
  return (
    <Ecran bas={40}>
      <Entete titre="Mes annonces" retour={retour} />
      {!liste ? <Chargement /> : liste.length === 0 ? <EtatVide icone="pricetag" titre="Aucune annonce" texte="Vos annonces apparaîtront ici." /> : liste.map(a => (
        <Carte key={a.id} plat><View style={{ padding: 12, gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={() => onOuvrir(a)}>
            <T v="carte" numberOfLines={1}>{a.titre}</T>
            <T v="petit">{categorieAnnonce(a.categorie_id)?.label ?? (a.categorie_id === 'logement' ? 'Logement' : a.categorie_id)}{a.prix ? ` · ${formaterPrix(a.prix)}` : ''}</T>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pastille label={a.statut === 'publie' ? 'Publiée' : a.statut === 'refuse' ? 'Refusée' : 'En relecture'} couleur={a.statut === 'publie' ? c.succes : a.statut === 'refuse' ? c.erreur : c.texte} fond={c.carte} />
            {a.statut === 'publie' && <Bouton label="Repositionner" icone="fleche_haut" petit large={false} variante="fantome" onPress={async () => { try { const r = await repositionnerAnnonce(a.id); toast(`Annonce remontée en tête. Prochaine fois : ${new Date(r.prochaine).toLocaleDateString('fr-FR')}.`, 'succes'); charger(); } catch (e) { toast((e as Error).message, 'erreur'); } }} />}
          </View>
        </View></Carte>
      ))}
    </Ecran>
  );
}
