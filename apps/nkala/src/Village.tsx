/** Nkala (Village) : annuaire et carte, pharmacies de garde, annonces, actualités, Commune+, signalements, magazine, taxi, services. Tout vient des fichiers importés ou des contenus des habitants (modérés). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import * as Location from 'expo-location';
import {
  chargerAnnonces, distanceKm, enListe, estOuvert, jourLocal, mesContenus, publierContenu, resultatsSondage, voterSondage, type Ligne,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { Bouton, Carte, Champ, Chargement, Ecran, Entete, EtatVide, Ic, Pastille, Puce, Rangee, SectionTitre, T, Visuel, useToast } from './kit';
import { usePile } from './Pile';
import { useTheme } from './Prefs';
import { EmplacementPub, FilAvecPubs } from './Pub';
import { programmerAlerteGarde } from './Notifications';
import { useContenus } from './useContenu';
import { Verrou } from './Verrou';

type Section = 'chercher' | 'annonces' | 'actus' | 'commune' | 'magazine' | 'services';
type E =
  | { t: 'racine' } | { t: 'resultats'; q: string; cat?: string } | { t: 'carte'; cat?: string } | { t: 'lieu'; id: string } | { t: 'garde' }
  | { t: 'annonce'; a: Ligne } | { t: 'publier' } | { t: 'actu'; id: string } | { t: 'article'; id: string } | { t: 'signaler' } | { t: 'taxi' } | { t: 'idee' };
type Pile = ReturnType<typeof usePile<E>>;
const num = (v: unknown) => Number(v) || 0;

interface Pos { latitude: number; longitude: number }
function usePosition() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [demande, setDemande] = useState(false);
  const localiser = async () => {
    setDemande(true);
    try {
      if (Platform.OS === 'web') { navigator.geolocation?.getCurrentPosition(p => setPos({ latitude: p.coords.latitude, longitude: p.coords.longitude })); return; }
      const p = await Location.requestForegroundPermissionsAsync(); if (!p.granted) return;
      const l = await Location.getCurrentPositionAsync({}); setPos({ latitude: l.coords.latitude, longitude: l.coords.longitude });
    } catch { /* position indisponible */ }
  };
  return { pos, localiser, demande };
}

export function Village() {
  const pile = usePile<E>({ t: 'racine' });
  const [section, setSection] = useState<Section>('chercher');
  const { res, chargement } = useContenus(['categories_lieux', 'lieux', 'gardes', 'actualites', 'magazine', 'services', 'categories_annonces', 'sondages']);
  const P = usePosition();
  if (chargement) return <Ecran><Chargement /></Ecran>;
  const D = { cats: res.categories_lieux ?? [], lieux: res.lieux ?? [], gardes: res.gardes ?? [], actus: res.actualites ?? [], mag: res.magazine ?? [], services: res.services ?? [], catAnn: res.categories_annonces ?? [], sondages: res.sondages ?? [] };
  const e = pile.ecran;
  const ctx = { D, pile, P, setSection };
  switch (e.t) {
    case 'resultats': return <Resultats q={e.q} cat={e.cat} {...ctx} />;
    case 'carte': return <Carte2 cat={e.cat} {...ctx} />;
    case 'lieu': return <Fiche id={e.id} {...ctx} />;
    case 'garde': return <Garde {...ctx} />;
    case 'annonce': return <DetailAnnonce a={e.a} pile={pile} />;
    case 'publier': return <Publier D={D} pile={pile} />;
    case 'actu': return <DetailTexte l={D.actus.find(x => x.id === e.id)} pile={pile} />;
    case 'article': return <DetailTexte l={D.mag.find(x => x.id === e.id)} pile={pile} verrou />;
    case 'signaler': return <Signaler pile={pile} />;
    case 'taxi': return <Taxi pile={pile} />;
    case 'idee': return <Idee pile={pile} />;
    default: return (
      <Ecran bas={90}>
        <Entete titre="Village" sous="Chercher, trouver, s'entraider" />
        <Rangee>{([['chercher', 'Chercher'], ['annonces', 'Annonces'], ['actus', 'Actualités'], ['commune', 'Commune+'], ['magazine', 'Magazine'], ['services', 'Services']] as [Section, string][]).map(([id, l]) => <Puce key={id} label={l} actif={section === id} onPress={() => setSection(id)} />)}</Rangee>
        {section === 'chercher' && <Chercher {...ctx} />}
        {section === 'annonces' && <Annonces {...ctx} />}
        {section === 'actus' && <Actus {...ctx} />}
        {section === 'commune' && <Commune {...ctx} />}
        {section === 'magazine' && <Magazine {...ctx} />}
        {section === 'services' && <Services {...ctx} />}
      </Ecran>
    );
  }
}
type Ctx = { D: { cats: Ligne[]; lieux: Ligne[]; gardes: Ligne[]; actus: Ligne[]; mag: Ligne[]; services: Ligne[]; catAnn: Ligne[]; sondages: Ligne[] }; pile: Pile; P: ReturnType<typeof usePosition>; setSection: (s: Section) => void };

const OuvertPastille = ({ h }: { h?: string }) => { const { c } = useTheme(); const o = estOuvert(h); return o === null ? null : <Pastille label={o ? 'Ouvert' : 'Fermé'} couleur={o ? c.succes : c.erreur} fond={c.carte} />; };

// ------------------------------------------------------------------ chercher (71, 72)
function Chercher({ D, pile }: Ctx) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [recents, setRecents] = useState<string[]>([]);
  useEffect(() => { AsyncStorage.getItem('nkala_village_recents').then(v => v && setRecents(JSON.parse(v))).catch(() => {}); }, []);
  const lancer = (texte: string, cat?: string) => { const t = texte.trim(); if (t) { const n = [t, ...recents.filter(x => x !== t)].slice(0, 6); setRecents(n); AsyncStorage.setItem('nkala_village_recents', JSON.stringify(n)).catch(() => {}); } pile.pousser({ t: 'resultats', q: t, cat }); };
  const sugg = q.trim().length >= 2 ? D.lieux.filter(l => (l.nom + ' ' + enListe(l.tags).join(' ')).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 5) : [];
  const garde = D.gardes.filter(g => g.debut <= jourLocal() && jourLocal() <= g.fin);
  return (
    <>
      <Champ valeur={q} onChange={setQ} placeholder="Pharmacie, marché, taxi, restaurant…" icone="chercher" onSubmit={() => lancer(q)} />
      {sugg.length > 0 && <Carte plat>{sugg.map(l => <Pressable key={l.id} accessibilityRole="button" onPress={() => pile.pousser({ t: 'lieu', id: l.id })} style={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ic nom="chercher" taille={18} couleur={c.discret} /><T v="corps" fort>{l.nom}</T></Pressable>)}</Carte>}
      {!q && recents.length > 0 && <Rangee>{recents.map(r => <Puce key={r} label={r} icone="horloge" onPress={() => lancer(r)} />)}</Rangee>}
      {garde.length > 0 && <Carte accent="#0D9488" onPress={() => pile.pousser({ t: 'garde' })} label="Pharmacies de garde"><View style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}><Ic nom="croix" taille={28} couleur="#0D9488" /><View style={{ flex: 1 }}><T v="carte">Pharmacies de garde ce soir</T><T v="petit">{garde.length} pharmacie{garde.length > 1 ? 's' : ''} de garde</T></View><Ic nom="suivant" taille={18} couleur={c.discret} /></View></Carte>}
      <SectionTitre titre="Catégories" action="Voir la carte" onAction={() => pile.pousser({ t: 'carte' })} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {D.cats.map(k => <Pressable key={k.id} accessibilityRole="button" accessibilityLabel={k.titre} onPress={() => lancer('', k.id)} style={{ width: '48%', minHeight: 96, borderRadius: 18, padding: 14, justifyContent: 'space-between', backgroundColor: (k.couleur ?? c.accent) + '33', borderWidth: 1, borderColor: (k.couleur ?? c.accent) + '88' }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: k.couleur ?? c.accent, alignItems: 'center', justifyContent: 'center' }}><Ic nom={k.icone || 'etiquette'} taille={22} couleur="#170D08" /></View><T v="carte">{k.titre}</T></Pressable>)}
      </View>
      <EmplacementPub zone="annonce_en_tete" />
    </>
  );
}

function CarteLieu({ l, cat, pos, onPress }: { l: Ligne; cat?: Ligne; pos: Pos | null; onPress: () => void }) {
  const { c } = useTheme();
  const km = pos && num(l.latitude) ? distanceKm(pos, { latitude: num(l.latitude), longitude: num(l.longitude) }) : null;
  return (
    <Carte onPress={onPress} label={l.nom}>
      <Visuel uri={l.photo} couleur={(cat?.couleur ?? '#3B1D10')} hauteur={110} largeur="100%" rayon={0} icone={cat?.icone || 'batiment'} />
      <View style={{ padding: 14, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T v="carte" style={{ flex: 1 }}>{l.nom}</T>{l.verifie === true && <Ic nom="bouclier" taille={16} couleur={c.succes} />}<OuvertPastille h={l.horaires} /></View>
        <T v="petit">{[l.quartier, l.ville, km !== null && `${km.toFixed(1)} km`, num(l.note) > 0 && `★ ${num(l.note).toFixed(1)}`].filter(Boolean).join(' · ')}</T>
      </View>
    </Carte>
  );
}

// ------------------------------------------------------------------ résultats (73), carte (74), fiche (75), garde (76)
function Resultats({ q, cat, D, pile, P }: Ctx & { q: string; cat?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [c0, setC0] = useState<string | undefined>(cat);
  const n = q.toLowerCase();
  let liste = D.lieux.filter(l => (!c0 || l.categorie_id === c0) && (!n || (l.nom + ' ' + l.description + ' ' + enListe(l.tags).join(' ')).toLowerCase().includes(n)));
  if (ouvert) liste = liste.filter(l => estOuvert(l.horaires) !== false);
  if (P.pos) liste = [...liste].sort((a, b) => distanceKm(P.pos!, { latitude: num(a.latitude), longitude: num(a.longitude) }) - distanceKm(P.pos!, { latitude: num(b.latitude), longitude: num(b.longitude) }));
  return (
    <Ecran bas={90}>
      <Entete titre={q || D.cats.find(k => k.id === c0)?.titre || 'Résultats'} sous={`${liste.length} résultat${liste.length > 1 ? 's' : ''}`} retour={pile.retour} />
      <Rangee><Puce label="Ouvert maintenant" actif={ouvert} onPress={() => setOuvert(!ouvert)} /><Puce label={P.pos ? 'Près de moi ✓' : 'Près de moi'} icone="itineraire" actif={!!P.pos} onPress={P.localiser} /><Puce label="Carte" icone="carte" onPress={() => pile.pousser({ t: 'carte', cat: c0 })} />{D.cats.map(k => <Puce key={k.id} label={k.titre} actif={c0 === k.id} onPress={() => setC0(c0 === k.id ? undefined : k.id)} />)}</Rangee>
      {liste.length === 0 ? <EtatVide icone="chercher" titre="Aucun résultat" texte="Essaie un autre mot, ou ajoute ce lieu pour aider les autres." action="Ajouter un lieu" onAction={() => Linking.openURL('mailto:contact@essaka.engineering?subject=Ajouter%20un%20lieu%20Nkala').catch(() => {})} /> :
        <FilAvecPubs items={liste} zone="carte_partenaire" cle={l => l.id} rendu={l => <CarteLieu l={l} cat={D.cats.find(k => k.id === l.categorie_id)} pos={P.pos} onPress={() => pile.pousser({ t: 'lieu', id: l.id })} />} />}
    </Ecran>
  );
}

/** Carte schématique (épingles placées d'après la latitude et la longitude). La carte routière (OpenStreetMap) se branche à la fin avec le module natif de cartes. */
function Carte2({ cat, D, pile }: Ctx & { cat?: string }) {
  const { c } = useTheme();
  const [sel, setSel] = useState<Ligne | null>(null);
  const lieux = D.lieux.filter(l => (!cat || l.categorie_id === cat) && num(l.latitude) && num(l.longitude));
  const lats = lieux.map(l => num(l.latitude)), lons = lieux.map(l => num(l.longitude));
  const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const pos = (l: Ligne) => ({ x: lo1 === lo0 ? 50 : 8 + ((num(l.longitude) - lo0) / (lo1 - lo0)) * 84, y: la1 === la0 ? 50 : 8 + ((la1 - num(l.latitude)) / (la1 - la0)) * 84 });
  return (
    <Ecran bas={30} defile={false}>
      <Entete titre="Carte" retour={pile.retour} />
      <View style={{ flex: 1, borderRadius: 24, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord, overflow: 'hidden', marginVertical: 12 }}>
        {lieux.length === 0 && <EtatVide icone="carte" titre="Aucun lieu à placer" />}
        {lieux.map(l => { const p = pos(l), k = D.cats.find(x => x.id === l.categorie_id); return (
          <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={l.nom} onPress={() => setSel(l)} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, marginLeft: -16, marginTop: -32 }}>
            <Ic nom="carte" taille={32} couleur={sel?.id === l.id ? c.fort : (k?.couleur ?? c.accent)} /></Pressable>); })}
      </View>
      <T v="petit">Carte schématique : les lieux sont placés les uns par rapport aux autres.</T>
      {sel && <CarteLieu l={sel} cat={D.cats.find(k => k.id === sel.categorie_id)} pos={null} onPress={() => pile.pousser({ t: 'lieu', id: sel.id })} />}
    </Ecran>
  );
}

function Fiche({ id, D, pile, P }: Ctx & { id: string }) {
  const l = D.lieux.find(x => x.id === id);
  const { c } = useTheme();
  if (!l) return <Ecran><Entete titre="Lieu introuvable" retour={pile.retour} /></Ecran>;
  const cat = D.cats.find(k => k.id === l.categorie_id);
  const km = P.pos && num(l.latitude) ? distanceKm(P.pos, { latitude: num(l.latitude), longitude: num(l.longitude) }) : null;
  const itineraire = () => Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${l.latitude},${l.longitude}` : `https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`).catch(() => {});
  return (
    <Ecran bas={40}>
      <Entete titre={l.nom} sous={cat?.titre} retour={pile.retour} />
      <Visuel uri={l.photo} couleur={cat?.couleur} hauteur={190} largeur="100%" icone={cat?.icone || 'batiment'} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><OuvertPastille h={l.horaires} />{l.verifie === true && <Pastille label="Vérifié" couleur={c.succes} fond={c.carte} />}{num(l.note) > 0 && <Pastille label={`★ ${num(l.note).toFixed(1)}`} couleur={c.accent} fond={c.carte} />}{km !== null && <Pastille label={`${km.toFixed(1)} km`} fond={c.carte} />}</View>
      {!!l.description && <T v="corps">{l.description}</T>}
      <Carte plat><View style={{ padding: 14, gap: 8 }}>
        {!!l.adresse && <View style={{ flexDirection: 'row', gap: 10 }}><Ic nom="village" taille={18} couleur={c.accent} /><T v="corps" style={{ flex: 1 }}>{[l.adresse, l.quartier, l.ville].filter(Boolean).join(', ')}</T></View>}
        {!!l.horaires && <View style={{ flexDirection: 'row', gap: 10 }}><Ic nom="horloge" taille={18} couleur={c.accent} /><T v="corps" style={{ flex: 1 }}>{l.horaires}</T></View>}
      </View></Carte>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Bouton label="Appeler" icone="telephone" desactive={!l.telephone} onPress={() => Linking.openURL(`tel:${l.telephone}`).catch(() => {})} style={{ flex: 1 }} />
        <Bouton label="Itinéraire" icone="itineraire" variante="ambre" desactive={!num(l.latitude)} onPress={itineraire} style={{ flex: 1 }} />
      </View>
      {!!l.whatsapp && <Bouton label="WhatsApp" variante="fantome" icone="envoyer" onPress={() => Linking.openURL(`https://wa.me/${String(l.whatsapp).replace(/\D/g, '')}`).catch(() => {})} />}
    </Ecran>
  );
}

function Garde({ D, pile, P }: Ctx) {
  const { c } = useTheme();
  const [alerte, setAlerte] = useState(false);
  useEffect(() => { AsyncStorage.getItem('nkala_garde_alerte').then(v => setAlerte(v === '1')).catch(() => {}); }, []);
  const aujourd = jourLocal();
  const liste = D.gardes.filter(g => g.debut <= aujourd && aujourd <= g.fin).map(g => D.lieux.find(l => l.id === g.lieu_id)).filter(Boolean) as Ligne[];
  return (
    <Ecran bas={90}>
      <Entete titre="Pharmacies de garde" sous={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} retour={pile.retour} />
      <Carte plat onPress={() => { const n = !alerte; setAlerte(n); programmerAlerteGarde(n); }} label="Alerte pharmacie de garde"><View style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}><Ic nom="cloche" taille={22} couleur={alerte ? c.accent : c.discret} /><View style={{ flex: 1 }}><T v="carte">Prévenez-moi chaque semaine</T><T v="petit">{alerte ? 'Alerte activée' : 'Alerte désactivée'}</T></View></View></Carte>
      {liste.length === 0 ? <EtatVide icone="croix" titre="Pas de garde publiée" texte="Le planning n'est pas encore à jour. Appelez la pharmacie la plus proche." /> : liste.map(l => <CarteLieu key={l.id} l={l} cat={D.cats.find(k => k.id === 'pharmacie')} pos={P.pos} onPress={() => pile.pousser({ t: 'lieu', id: l.id })} />)}
    </Ecran>
  );
}

// ------------------------------------------------------------------ annonces (77, 78, 79)
function Annonces({ D, pile }: Ctx) {
  const { c } = useTheme();
  const [cat, setCat] = useState<string | undefined>();
  const [liste, setListe] = useState<Ligne[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setListe(null); setErr(false); chargerAnnonces(cat).then(l => setListe(l as Ligne[])).catch(() => setErr(true)); }, [cat]);
  return (
    <>
      <Rangee><Puce label="Toutes" actif={!cat} onPress={() => setCat(undefined)} />{D.catAnn.map(k => <Puce key={k.id} label={k.titre} icone={k.icone} actif={cat === k.id} onPress={() => setCat(k.id)} />)}</Rangee>
      <Bouton label="Publier une annonce" icone="ajouter" variante="ambre" onPress={() => pile.pousser({ t: 'publier' })} />
      <EmplacementPub zone="annonce_dans_liste" />
      {err ? <EtatVide icone="alerte" titre="Annonces indisponibles" texte="Réessaie quand tu auras du réseau." /> : !liste ? <Chargement lignes={2} /> : liste.length === 0 ? <EtatVide icone="etiquette" titre="Aucune annonce ici" texte="Sois le premier à publier." /> :
        <FilAvecPubs items={liste} zone="annonce_dans_liste" cle={a => a.id} rendu={a => <Carte onPress={() => pile.pousser({ t: 'annonce', a })} label={a.titre}><View style={{ padding: 14, gap: 4 }}><T v="carte">{a.titre}</T>{num(a.prix) > 0 && <T v="sousTitre" couleur={c.accent}>{num(a.prix).toLocaleString('fr-FR')} FCFA</T>}<T v="petit">{[a.ville, a.auteur].filter(Boolean).join(' · ')}</T></View></Carte>} />}
    </>
  );
}
function DetailAnnonce({ a, pile }: { a: Ligne; pile: Pile }) {
  const { c } = useTheme();
  return (
    <Ecran bas={40}>
      <Entete titre={a.titre} retour={pile.retour} />
      {num(a.prix) > 0 && <T v="titre" couleur={c.accent}>{num(a.prix).toLocaleString('fr-FR')} FCFA</T>}
      <T v="corps">{a.description}</T>
      <T v="petit">{[a.ville, `Par ${a.auteur ?? 'un habitant'}`].filter(Boolean).join(' · ')}</T>
      <Bouton label="Appeler" icone="telephone" desactive={!a.telephone} onPress={() => Linking.openURL(`tel:${a.telephone}`).catch(() => {})} />
      <Bouton label="Signaler cette annonce" variante="fantome" petit onPress={async () => { try { await publierContenu('signalements', { titre: `Annonce ${a.id}`, description: `Annonce signalée : ${a.titre}`, categorie: 'annonce' }); } catch { /* */ } pile.retour(); }} />
    </Ecran>
  );
}
function Publier({ D, pile }: { D: Ctx['D']; pile: Pile }) {
  const { profil } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ titre: '', description: '', prix: '', ville: '', telephone: '', categorie_id: D.catAnn[0]?.id ?? 'divers' });
  const [occupe, setOccupe] = useState(false);
  const [mes, setMes] = useState<Ligne[]>([]);
  useEffect(() => { if (profil) mesContenus('annonces').then(l => setMes(l as Ligne[])).catch(() => {}); }, [profil]);
  if (!profil) return <Ecran><Entete titre="Publier" retour={pile.retour} /><EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connecte-toi pour publier une annonce." /></Ecran>;
  const quota = num(D.catAnn.find(k => k.id === f.categorie_id)?.quota_gratuit) || 3;
  const ceMois = mes.filter(a => new Date(a.cree).getMonth() === new Date().getMonth()).length;
  const envoyer = async () => {
    setOccupe(true);
    try { await publierContenu('annonces', { ...f, prix: Number(f.prix) || 0 }); toast('Annonce envoyée : elle sera visible après relecture.', 'succes'); pile.retour(); }
    catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); }
  };
  return (
    <Ecran bas={40}>
      <Entete titre="Publier une annonce" retour={pile.retour} />
      <Rangee>{D.catAnn.map(k => <Puce key={k.id} label={k.titre} actif={f.categorie_id === k.id} onPress={() => setF({ ...f, categorie_id: k.id })} />)}</Rangee>
      <Champ valeur={f.titre} onChange={t => setF({ ...f, titre: t })} placeholder="Titre" auto="sentences" maxLength={100} />
      <Champ valeur={f.description} onChange={t => setF({ ...f, description: t })} placeholder="Description" auto="sentences" lignes={4} maxLength={1500} />
      <Champ valeur={f.prix} onChange={t => setF({ ...f, prix: t.replace(/\D/g, '') })} placeholder="Prix en FCFA (facultatif)" clavier="number-pad" />
      <Champ valeur={f.ville} onChange={t => setF({ ...f, ville: t })} placeholder="Ville" auto="words" />
      <Champ valeur={f.telephone} onChange={t => setF({ ...f, telephone: t })} placeholder="Téléphone" clavier="phone-pad" />
      <T v="petit">Quota gratuit : {ceMois} / {quota} annonces ce mois-ci. Chaque annonce est relue avant d'être publiée. Les photos arrivent bientôt.</T>
      <Bouton label="Envoyer pour relecture" charge={occupe} desactive={!f.titre.trim() || ceMois >= quota} onPress={envoyer} />
    </Ecran>
  );
}

// ------------------------------------------------------------------ actualités (80) et magazine (83)
function Actus({ D, pile }: Ctx) {
  const { c } = useTheme();
  const l = [...D.actus].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return (
    <>
      <EmplacementPub zone="annonce_en_tete" />
      {l.length === 0 ? <EtatVide icone="magazine" titre="Pas encore d'actualité" /> : <FilAvecPubs items={l} zone="annonce_dans_liste" cle={a => a.id} rendu={a => (
        <Carte onPress={() => pile.pousser({ t: 'actu', id: a.id })} accent={a.categorie === 'alerte' ? '#EF4444' : undefined} label={a.titre}><View style={{ padding: 14, gap: 6 }}>{a.categorie === 'alerte' && <Pastille label="ALERTE" couleur="#FDFAF7" fond="#B91C1C" />}<T v="carte">{a.titre}</T><T v="petit">{a.resume}</T><T v="petit" couleur={c.discret}>{a.date}{a.source ? ` · ${a.source}` : ''}</T></View></Carte>)} />}
    </>
  );
}
function Magazine({ D, pile }: Ctx) {
  const [rub, setRub] = useState<string | null>(null);
  const rubs = [...new Set(D.mag.map(m => String(m.rubrique)))];
  return (
    <>
      <Rangee><Puce label="Tout" actif={!rub} onPress={() => setRub(null)} />{rubs.map(r => <Puce key={r} label={r} actif={rub === r} onPress={() => setRub(r)} />)}</Rangee>
      {D.mag.length === 0 ? <EtatVide icone="magazine" titre="Le magazine arrive" /> : <FilAvecPubs items={D.mag.filter(m => !rub || m.rubrique === rub)} zone="annonce_dans_liste" cle={m => m.id} rendu={m => <Carte onPress={() => pile.pousser({ t: 'article', id: m.id })} label={m.titre}><Visuel uri={m.image} hauteur={110} largeur="100%" rayon={0} icone="magazine" /><View style={{ padding: 14, gap: 4 }}><Pastille label={String(m.rubrique)} /><T v="carte">{m.titre}</T><T v="petit">{m.resume}</T></View></Carte>} />}
    </>
  );
}
function DetailTexte({ l, pile, verrou }: { l?: Ligne; pile: Pile; verrou?: boolean }) {
  if (!l) return <Ecran><Entete titre="Introuvable" retour={pile.retour} /></Ecran>;
  const corps = <><Visuel uri={l.image} hauteur={170} largeur="100%" icone="magazine" /><T v="corps">{l.corps || l.resume}</T></>;
  return (<Ecran bas={40}><Entete titre={l.titre} sous={[l.auteur, l.date].filter(Boolean).join(' · ')} retour={pile.retour} />{verrou ? <Verrou contenu={{ id: l.id, acces: (l.niveau_acces as never) || 'libre', roles: ['admin'] }}>{corps}</Verrou> : corps}</Ecran>);
}

// ------------------------------------------------------------------ Commune+ (81), signaler (82), taxi (84), services (85)
function Commune({ D, pile }: Ctx) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const toast = useToast();
  const [res, setRes] = useState<Record<string, { resultats: Record<string, number>; total: number }>>({});
  useEffect(() => { D.sondages.forEach(s => resultatsSondage(s.id).then(r => setRes(x => ({ ...x, [s.id]: r }))).catch(() => {})); }, [D.sondages]);
  const voter = async (id: string, choix: string) => { try { const r = await voterSondage(id, choix); setRes(x => ({ ...x, [id]: r })); toast('Vote enregistré, merci !', 'succes'); } catch (e) { toast((e as Error).message, 'erreur'); } };
  return (
    <>
      <Carte plat><View style={{ padding: 14 }}><T v="petit">Les services citoyens vous parlent avec respect : vous avez la parole sur votre commune.</T></View></Carte>
      {D.sondages.length === 0 && <EtatVide icone="vote" titre="Pas de sondage en cours" />}
      {D.sondages.map(s => { const r = res[s.id], total = r?.total ?? 0; return (
        <Carte key={s.id}><View style={{ padding: 16, gap: 10 }}><T v="carte">{s.question}</T>
          {enListe(s.options).map(o => { const n = r?.resultats?.[o] ?? 0; return (
            <Pressable key={o} accessibilityRole="button" disabled={!profil} onPress={() => voter(s.id, o)} style={{ borderRadius: 12, borderWidth: 1, borderColor: c.bord, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${total ? (n / total) * 100 : 0}%`, backgroundColor: c.accent + '44' }} />
              <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}><T v="corps" fort>{o}</T><T v="petit">{total ? Math.round((n / total) * 100) : 0} %</T></View></Pressable>); })}
          <T v="petit">{profil ? `${total} vote${total > 1 ? 's' : ''} · un vote par compte` : 'Connectez-vous pour voter.'}</T></View></Carte>); })}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Bouton label="Proposer une idée" variante="fantome" icone="ia" onPress={() => pile.pousser({ t: 'idee' })} style={{ flex: 1 }} />
        <Bouton label="Signaler" variante="fantome" icone="alerte" onPress={() => pile.pousser({ t: 'signaler' })} style={{ flex: 1 }} />
      </View>
    </>
  );
}
function Formulaire({ titre, pile, collection, champs, intro, categories, bouton }: { titre: string; pile: Pile; collection: 'idees' | 'signalements' | 'taxi_demandes'; champs: { cle: string; placeholder: string; lignes?: number; clavier?: 'number-pad' }[]; intro?: string; categories?: string[]; bouton: string }) {
  const { profil } = useAuth();
  const toast = useToast();
  const [v, setV] = useState<Record<string, string>>({});
  const [cat, setCat] = useState(categories?.[0]);
  const [occupe, setOccupe] = useState(false);
  const [mes, setMes] = useState<Ligne[]>([]);
  useEffect(() => { if (profil) mesContenus(collection).then(l => setMes(l as Ligne[])).catch(() => {}); }, [profil, collection]);
  if (!profil) return <Ecran><Entete titre={titre} retour={pile.retour} /><EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connectez-vous pour continuer." /></Ecran>;
  return (
    <Ecran bas={40}>
      <Entete titre={titre} retour={pile.retour} />
      {!!intro && <T v="corps">{intro}</T>}
      {categories && <Rangee>{categories.map(k => <Puce key={k} label={k} actif={cat === k} onPress={() => setCat(k)} />)}</Rangee>}
      {champs.map(ch => <Champ key={ch.cle} valeur={v[ch.cle] ?? ''} onChange={t => setV({ ...v, [ch.cle]: ch.clavier ? t.replace(/\D/g, '') : t })} placeholder={ch.placeholder} lignes={ch.lignes} clavier={ch.clavier} auto="sentences" />)}
      <Bouton label={bouton} charge={occupe} desactive={!Object.values(v).some(x => x.trim())} onPress={async () => { setOccupe(true); try { await publierContenu(collection, { ...v, ...(cat ? { categorie: cat } : {}), titre: v.titre || v.description || v.depart || titre, prix: Number(v.prix) || undefined }); toast('Envoyé, merci.', 'succes'); pile.retour(); } catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); } }} />
      {mes.length > 0 && <><SectionTitre titre="Mes envois" />{mes.slice(0, 5).map(m => <Carte key={m.id} plat><View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><T v="corps" style={{ flex: 1 }} numberOfLines={1}>{m.titre ?? m.description}</T><Pastille label={m.statut === 'publie' ? 'Publié' : m.statut === 'refuse' ? 'Refusé' : 'En attente'} /></View></Carte>)}</>}
    </Ecran>
  );
}
const Signaler = ({ pile }: { pile: Pile }) => <Formulaire titre="Signaler un problème" pile={pile} collection="signalements" categories={['Route', 'Éclairage', 'Déchets', 'Eau', 'Autre']} champs={[{ cle: 'description', placeholder: 'Que se passe-t-il ? Où ?', lignes: 4 }, { cle: 'lieu', placeholder: 'Quartier ou rue' }]} intro="Votre signalement est transmis à l'équipe, qui le relaie à la mairie." bouton="Envoyer le signalement" />;
const Idee = ({ pile }: { pile: Pile }) => <Formulaire titre="Proposer une idée" pile={pile} collection="idees" champs={[{ cle: 'titre', placeholder: 'Votre idée en une phrase' }, { cle: 'description', placeholder: 'Expliquez-nous', lignes: 4 }]} bouton="Envoyer l'idée" />;
const Taxi = ({ pile }: { pile: Pile }) => <Formulaire titre="Taxi" pile={pile} collection="taxi_demandes" champs={[{ cle: 'depart', placeholder: 'Départ' }, { cle: 'arrivee', placeholder: 'Arrivée' }, { cle: 'prix', placeholder: 'Votre prix pour la course (FCFA)', clavier: 'number-pad' }]} intro="Vous fixez le prix de la course : les chauffeurs acceptent ou non." bouton="Demander une course" />;

function Services({ D, pile, setSection }: Ctx) {
  const { c } = useTheme();
  const aller = (cible?: string) => { if (cible === 'taxi') pile.pousser({ t: 'taxi' }); else if (cible === 'signaler') pile.pousser({ t: 'signaler' }); else if (cible === 'commune') setSection('commune'); };
  return (
    <>
      {D.services.map(s => (
        <Carte key={s.id} onPress={s.etat === 'ouvert' ? () => aller(s.cible) : undefined} label={s.titre}><View style={{ padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center', opacity: s.etat === 'ouvert' ? 1 : 0.6 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.fond2, borderWidth: 1, borderColor: c.bord, alignItems: 'center', justifyContent: 'center' }}><Ic nom={s.icone || 'village'} taille={24} couleur={c.accent} /></View>
          <View style={{ flex: 1 }}><T v="carte">{s.titre}</T><T v="petit">{s.description}</T></View>{s.etat === 'ouvert' ? <Ic nom="suivant" taille={18} couleur={c.discret} /> : <Pastille label="Bientôt" />}</View></Carte>))}
      {D.services.length === 0 && <EtatVide icone="village" titre="Services à venir" />}
    </>
  );
}
void useMemo;
