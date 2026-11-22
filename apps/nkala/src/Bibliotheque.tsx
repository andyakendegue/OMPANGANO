/**
 * Bibliothèque virtuelle d'Onênji : étagère par rayons, fiche de livre, lecteur de chapitres où chaque mot se touche (glossaire, « Mes mots »,
 * explication par Kak'Igonjo), mini-quiz « complète le texte » en fin de chapitre, XP la première fois, série quotidienne et succès.
 * Les livres viennent des collections « bibliotheque » et « livre_chapitres » (import de /opt/bibliotheque ou fichiers CSV/JSON).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { demanderKakIgonjo, regleSansFormule, ficheLivre, fonctionActive, listerLivres, quizLecture, rayonsBibliotheque, texteChapitre, type ChapitreListe, type ChapitreTexte, type Ligne, type LivreListe, type NiveauAcces, type QuestionLecture, type QuestionnaireItem } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { KakIgonjoFeuille } from './KakIgonjoCours';
import { Son } from './OnenjiLecon';
import { Anneau, Barre, Bouton, Carte, Champ, Chargement, Ecran, Entete, EtatVide, Ic, Mascotte, Pastille, Puce, Rangee, SectionTitre, T, useToast } from './kit';
import { usePile } from './Pile';
import { usePrefs, useTheme } from './Prefs';
import { useProgres } from './Progres';
import { polices } from './theme';
import { useContenus } from './useContenu';
import { Verrou } from './Verrou';

type E = { t: 'etagere' } | { t: 'livre'; id: string } | { t: 'lire'; livreId: string; idx: number } | { t: 'mots' } | { t: 'dico' };
interface Mot { mot: string; sens: string; livre: string; le: number }
interface Reglages { position: Record<string, number>; mots: Mot[]; taille: number; dernier?: string }
const CLE = 'nkala.lecture.v1';
const VIDE: Reglages = { position: {}, mots: [], taille: 17 };
const num = (v: unknown) => Number(v) || 0;

const ecouteursLecture = new Set<() => void>();
/**
 * « Mes mots » nourri par les leçons (audit Apprendre §3.D) : à la fin d'une leçon, ses mots myènè rejoignent le carnet,
 * avec la leçon comme origine. Les mots déjà présents ne sont pas dupliqués. Renvoie le nombre de mots ajoutés.
 */
export async function ajouterMesMots(mots: { mot: string; sens: string }[], origine: string): Promise<number> {
  let r: Reglages = VIDE;
  try { const b = await AsyncStorage.getItem(CLE); if (b) r = { ...VIDE, ...JSON.parse(b) }; } catch { /* carnet vide */ }
  const deja = new Set(r.mots.map(m => m.mot.toLowerCase()));
  const nouveaux = mots.filter(m => m.mot && !deja.has(m.mot.toLowerCase())).map(m => ({ mot: m.mot, sens: m.sens, livre: origine, le: Date.now() }));
  if (!nouveaux.length) return 0;
  await AsyncStorage.setItem(CLE, JSON.stringify({ ...r, mots: [...nouveaux, ...r.mots].slice(0, 2000) })).catch(() => {});
  ecouteursLecture.forEach(f => f());
  return nouveaux.length;
}

function useLecture() {
  const [r, setR] = useState<Reglages>(VIDE);
  useEffect(() => {
    const relire = () => { AsyncStorage.getItem(CLE).then(b => { if (b) setR({ ...VIDE, ...JSON.parse(b) }); }).catch(() => {}); };
    relire(); ecouteursLecture.add(relire);
    return () => { ecouteursLecture.delete(relire); };
  }, []);
  const regler = useCallback((p: Partial<Reglages> | ((a: Reglages) => Partial<Reglages>)) => setR(a => { const n = { ...a, ...(typeof p === 'function' ? p(a) : p) }; AsyncStorage.setItem(CLE, JSON.stringify(n)).catch(() => {}); return n; }), []);
  return { r, regler };
}

type Livre = LivreListe & Record<string, unknown>;
type Chap = ChapitreListe;
/** Minutes de lecture d'après le nombre de mots (≈ 200 mots par minute). */
const minutesMots = (mots: number) => Math.max(1, Math.round(mots / 200));
/** Rayons des textes officiels (import du 12 nov. 2026) : rangés après la littérature sur l'étagère. */
const RAYONS_OFFICIELS = /^(decrets?|arretes?|decisions|sommaires|ordonnances|lois|autres actes|textes officiels|jo\b)/i;
const sansAccent = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Bibliothèque servie par morceaux (14 nov. 2026) : la liste des livres arrive par pages et par rayon, la fiche avec ses chapitres
 * sans texte, et le texte d'un chapitre seulement quand on l'ouvre (gardé sur l'appareil pour la relecture hors ligne).
 * `entete` : en-tête fourni par l'onglet Ezango d'Apprendre (titre, recherche, onglets) ; sans lui, l'étagère garde son propre en-tête.
 */
export function Bibliotheque({ retour, entete }: { retour: () => void; entete?: React.ReactNode }) {
  const pile = usePile<E>({ t: 'etagere' });
  const { res } = useContenus(['opportunites']);
  const { r, regler } = useLecture();
  const e = pile.ecran;
  switch (e.t) {
    case 'livre': return <FicheLivre id={e.id} pile={pile} r={r} />;
    case 'lire': return <LecteurCharge livreId={e.livreId} idx={e.idx} pile={pile} r={r} regler={regler} />;
    case 'mots': return <MesMots r={r} regler={regler} retour={pile.retour} />;
    case 'dico': return <Dictionnaire r={r} regler={regler} retour={pile.retour} />;
    default: return <Etagere opp={res.opportunites ?? []} pile={pile} r={r} retour={retour} entete={entete} />;
  }
}

/** Fiche d'un livre (livre + chapitres sans texte), partagée par la fiche et le lecteur. */
function useFiche(id: string) {
  const [f, setF] = useState<{ livre: Livre; chapitres: Chap[] } | null | 'erreur'>(null);
  useEffect(() => { let ok = true; setF(null); ficheLivre(id).then(x => { if (ok) setF(x as { livre: Livre; chapitres: Chap[] }); }).catch(() => { if (ok) setF('erreur'); }); return () => { ok = false; }; }, [id]);
  return f;
}

// ------------------------------------------------------------------ couverture
function Couverture({ l, w = 112, h = 156 }: { l: Livre; w?: number; h?: number }) {
  const { c } = useTheme();
  const col = (l.couleur as string) || c.accent;
  return (
    <View style={{ width: w, height: h, borderRadius: 8, overflow: 'hidden', backgroundColor: col, flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}>
      <View style={{ width: Math.max(8, w * 0.09), backgroundColor: 'rgba(0,0,0,0.22)' }} />
      <View style={{ flex: 1, padding: w * 0.09, justifyContent: 'space-between' }}>
        <Text numberOfLines={5} style={{ color: '#FFF8F0', fontFamily: polices.titreGras, fontSize: Math.max(11, w * 0.115), lineHeight: Math.max(14, w * 0.14) }}>{l.titre}</Text>
        <Text numberOfLines={2} style={{ color: 'rgba(255,248,240,0.82)', fontFamily: polices.corpsMoyen, fontSize: Math.max(9, w * 0.085) }}>{(l.auteur as string) || ''}</Text>
      </View>
    </View>
  );
}

function progressionLivre(l: Livre, chap: Chap[], donnees: Record<string, { bonnes: number; sur: number }> | undefined) {
  const faits = chap.filter(c => donnees?.[c.id]).length;
  return { faits, total: chap.length, part: chap.length ? faits / chap.length : 0, prochain: Math.min(chap.findIndex(c => !donnees?.[c.id]) === -1 ? 0 : chap.findIndex(c => !donnees?.[c.id]), Math.max(0, chap.length - 1)) };
}

// ------------------------------------------------------------------ étagère
type Pile = ReturnType<typeof usePile<E>>;
const ouvrirLivre = (l: Livre, pile: Pile) => { if (!Number(l.nb_chapitres) && l.url) Linking.openURL(String(l.url)).catch(() => {}); else pile.pousser({ t: 'livre', id: l.id }); };

function Rayon({ nom, livres, pile, lectures, onTout }: { nom: string; livres: Livre[]; pile: Pile; lectures: Record<string, { bonnes: number; sur: number }> | undefined; onTout?: () => void }) {
  const { c } = useTheme();
  if (!livres.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionTitre titre={nom.charAt(0).toUpperCase() + nom.slice(1)} action={onTout ? 'Tout voir' : undefined} onAction={onTout} />
      <View style={{ borderBottomWidth: 6, borderBottomColor: c.bord, borderRadius: 3, paddingBottom: 10 }}>
        <Rangee espace={14}>{livres.map(l => <Volume key={l.id} l={l} pile={pile} lectures={lectures} />)}</Rangee>
      </View>
    </View>
  );
}
function Volume({ l, pile, lectures }: { l: Livre; pile: Pile; lectures: Record<string, { bonnes: number; sur: number }> | undefined }) {
  const lus = Object.keys(lectures ?? {}).filter(k => k.startsWith(l.id + '-')).length, total = Number(l.nb_chapitres) || 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${l.titre}, ${l.auteur ?? ''}`} onPress={() => ouvrirLivre(l, pile)} style={{ width: 112, gap: 6 }}>
      <Couverture l={l} />{lus > 0 && total > 0 && <Barre valeur={Math.min(1, lus / total)} hauteur={5} />}
      <T v="petit" numberOfLines={2} style={{ textAlign: 'center' }}>{lus >= total && total > 0 ? '★ ' : ''}{l.titre}</T>
    </Pressable>
  );
}

function Etagere({ opp, pile, r, retour, entete }: { opp: Ligne[]; pile: Pile; r: Reglages; retour: () => void; entete?: React.ReactNode }) {
  const { c } = useTheme();
  const { prefs } = usePrefs();
  const { donnees } = useProgres();
  const cycleMax = prefs.mode === 'enfant' ? 2 : undefined;
  const [q, setQ] = useState(''); const [rayon, setRayon] = useState('');
  const [rayons, setRayons] = useState<{ total: number; chapitres: number; rayons: { rayon: string; n: number }[] } | null>(null);
  const [etageres, setEtageres] = useState<Record<string, Livre[]>>({});
  const [liste, setListe] = useState<{ livres: Livre[]; total: number; page: number } | null>(null);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [encours, setEncours] = useState<Livre | null>(null);
  const lectures = donnees.lectures;
  const lus = Object.keys(lectures ?? {}).length;
  const ordonnes = useMemo(() => [...(rayons?.rayons ?? [])].sort((a, b) => Number(RAYONS_OFFICIELS.test(sansAccent(a.rayon))) - Number(RAYONS_OFFICIELS.test(sansAccent(b.rayon))) || b.n - a.n), [rayons]);
  useEffect(() => { rayonsBibliotheque().then(setRayons).catch(() => setErreur(true)); }, []);
  // Étagères par défaut : les six premiers rayons (littérature d'abord), 12 livres chacun.
  useEffect(() => {
    let ok = true;
    for (const x of ordonnes.slice(0, 6)) listerLivres({ rayon: x.rayon, n: 12, cycleMax }).then(rp => { if (ok) setEtageres(a => ({ ...a, [x.rayon]: rp.livres as Livre[] })); }).catch(() => {});
    return () => { ok = false; };
  }, [ordonnes, cycleMax]);
  // Recherche ou rayon choisi : liste paginée, demandée au serveur.
  const filtre = rayon || q.trim().length >= 2;
  useEffect(() => {
    if (!filtre) { setListe(null); return; }
    let ok = true; setCharge(true);
    const h = setTimeout(() => listerLivres({ q: q.trim() || undefined, rayon: rayon || undefined, cycleMax, n: 30, page: 0 })
      .then(rp => { if (ok) setListe({ livres: rp.livres as Livre[], total: rp.total, page: 0 }); }).catch(() => { if (ok) setErreur(true); }).finally(() => { if (ok) setCharge(false); }), 300);
    return () => { ok = false; clearTimeout(h); };
  }, [q, rayon, cycleMax, filtre]);
  useEffect(() => { if (r.dernier) listerLivres({ ids: [r.dernier] }).then(rp => setEncours((rp.livres[0] as Livre) ?? null)).catch(() => {}); }, [r.dernier]);
  const plus = async () => {
    if (!liste) return;
    setCharge(true);
    try { const rp = await listerLivres({ q: q.trim() || undefined, rayon: rayon || undefined, cycleMax, n: 30, page: liste.page + 1 }); setListe({ livres: [...liste.livres, ...(rp.livres as Livre[])], total: rp.total, page: liste.page + 1 }); }
    catch { setErreur(true); } finally { setCharge(false); }
  };
  const objectif = (() => { const auj = new Date().toISOString().slice(0, 10); return Object.values(lectures ?? {}).some(x => (x as { jour?: string }).jour === auj); })();
  const totalEnCours = Number(encours?.nb_chapitres) || 0;
  const lusEnCours = encours ? Object.keys(lectures ?? {}).filter(k => k.startsWith(encours.id + '-')).length : 0;
  return (
    <Ecran bas={40}>
      {entete ?? <Entete titre="Bibliothèque" sous="Lis, touche les mots, gagne de l'XP" retour={retour} droite={<Pastille label={`${lus} chapitre${lus > 1 ? 's' : ''} lu${lus > 1 ? 's' : ''}`} couleur={c.accent} fond={c.carte} />} />}
      <Carte onPress={() => pile.pousser({ t: 'dico' })} accent={c.accent} label="Dictionnaire"><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 }}>
        <Ic nom="chercher" taille={26} couleur={c.accent} /><View style={{ flex: 1 }}><T v="carte">Dictionnaire</T><T v="petit">Myènè ⇄ français : écouter, garder dans Mes mots, demander à Kak'Igonjo</T></View><Ic nom="suivant" taille={18} couleur={c.discret} />
      </View></Carte>
      <Carte plat><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <Mascotte taille={52} humeur={objectif ? 'content' : 'parle'} />
        <View style={{ flex: 1 }}><T v="carte">{objectif ? 'Défi du jour réussi' : 'Défi du jour : lis un chapitre'}</T><T v="petit">{objectif ? 'Ta série continue. Reviens demain !' : 'Un chapitre terminé aujourd\'hui entretient ta série et rapporte de l\'XP.'}</T></View>
        {objectif && <Ic nom="ok" taille={26} couleur={c.succes} />}
      </View></Carte>
      {encours && <Carte onPress={() => pile.pousser({ t: 'lire', livreId: encours.id, idx: r.position[encours.id] ?? 0 })} accent={encours.couleur as string} label={`Reprendre ${encours.titre}`}>
        <View style={{ flexDirection: 'row', gap: 14, padding: 14, alignItems: 'center' }}>
          <Couverture l={encours} w={58} h={82} />
          <View style={{ flex: 1, gap: 6 }}><T v="libelle">Reprendre ma lecture</T><T v="carte" numberOfLines={2}>{encours.titre}</T>{totalEnCours > 0 && <><Barre valeur={Math.min(1, lusEnCours / totalEnCours)} /><T v="petit">{lusEnCours} / {totalEnCours} chapitres</T></>}</View>
          <Ic nom="suivant" taille={18} couleur={c.discret} />
        </View>
      </Carte>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Carte onPress={() => pile.pousser({ t: 'mots' })} plat style={{ flex: 1 }} label="Mes mots"><View style={{ padding: 14, gap: 4 }}><Ic nom="livre" taille={22} couleur={c.accent} /><T v="carte">Mes mots</T><T v="petit">{r.mots.length} collectés</T></View></Carte>
        <Carte plat style={{ flex: 1 }}><View style={{ padding: 14, gap: 4 }}><Ic nom="etoile" taille={22} couleur={c.accent} /><T v="carte">{(rayons?.total ?? 0).toLocaleString('fr-FR')} livre{(rayons?.total ?? 0) > 1 ? 's' : ''}</T><T v="petit">{(rayons?.chapitres ?? 0).toLocaleString('fr-FR')} chapitres</T></View></Carte>
      </View>
      <Champ valeur={q} onChange={setQ} placeholder="Chercher un titre ou un auteur" icone="chercher" auto="none" />
      {ordonnes.length > 1 && <Rangee><Puce label="Tous" actif={!rayon} onPress={() => setRayon('')} />{ordonnes.map(x => <Puce key={x.rayon} label={`${x.rayon} · ${x.n}`} actif={rayon === x.rayon} onPress={() => setRayon(rayon === x.rayon ? '' : x.rayon)} />)}</Rangee>}
      {erreur && !rayons ? <EtatVide icone="reseau" titre="Bibliothèque injoignable" texte="Vérifie ta connexion, puis reviens. Les chapitres déjà ouverts restent lisibles." />
        : !rayons ? <Chargement />
        : rayons.total === 0 ? <EtatVide mascotte titre="Les rayons se remplissent" texte="Les livres libres de droits arrivent bientôt." />
        : filtre ? (
          !liste ? <Chargement /> : liste.livres.length === 0 ? <EtatVide icone="chercher" titre="Rien trouvé" texte="Essaie un autre mot ou un autre rayon." /> : <>
            <T v="petit">{liste.total.toLocaleString('fr-FR')} livre{liste.total > 1 ? 's' : ''}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>{liste.livres.map(l => <Volume key={l.id} l={l} pile={pile} lectures={lectures} />)}</View>
            {liste.livres.length < liste.total && <Bouton label="Afficher plus" variante="fantome" charge={charge} onPress={plus} />}
          </>)
        : ordonnes.slice(0, 6).map(x => <Rayon key={x.rayon} nom={x.rayon} livres={etageres[x.rayon] ?? []} pile={pile} lectures={lectures} onTout={() => setRayon(x.rayon)} />)}
      {opp.length > 0 && <><SectionTitre titre="Opportunités pour la jeunesse" />{opp.map(o => <Carte key={o.id} plat onPress={() => o.lien && Linking.openURL(o.lien as string).catch(() => {})} label={o.titre}><View style={{ padding: 14, gap: 4 }}><T v="carte">{o.titre}</T><T v="petit">{[o.organisme, o.date_limite].filter(Boolean).join(' · ')}</T></View></Carte>)}</>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ fiche d'un livre
function FicheLivre({ id, pile, r }: { id: string; pile: Pile; r: Reglages }) {
  const f = useFiche(id);
  if (f === null) return <Ecran><Entete titre="Livre" retour={pile.retour} /><Chargement /></Ecran>;
  if (f === 'erreur') return <Ecran><Entete titre="Livre" retour={pile.retour} /><EtatVide icone="livre" titre="Livre introuvable" texte="Il a peut-être été retiré, ou la connexion manque." /></Ecran>;
  return <FicheLivreVue l={f.livre} chap={f.chapitres} pile={pile} r={r} />;
}
function FicheLivreVue({ l, chap, pile, r }: { l: Livre; chap: Chap[]; pile: Pile; r: Reglages }) {
  const { c } = useTheme();
  const { donnees } = useProgres();
  const p = progressionLivre(l, chap, donnees.lectures);
  const reprise = r.position[l.id] ?? p.prochain;
  const minutes = num(l.minutes) || chap.reduce((n, x) => n + minutesMots(x.mots), 0);
  return (
    <Ecran bas={40}>
      <Entete titre={l.titre} retour={pile.retour} />
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Couverture l={l} w={130} h={182} />
        <View style={{ flex: 1, gap: 8 }}>
          {!!l.auteur && <T v="carte">{l.auteur as string}</T>}
          <T v="petit">{[l.categorie, l.annee, `${chap.length} chapitre${chap.length > 1 ? 's' : ''}`, `${minutes} min`].filter(Boolean).join(' · ')}</T>
          <Anneau valeur={p.part} taille={64}><T v="carte">{Math.round(p.part * 100)}%</T></Anneau>
        </View>
      </View>
      {!!l.resume && <T v="corps">{l.resume as string}</T>}
      {/* Bibliothèque gratuite (15 nov. 2026) : seuls un livre « reserve » (personnel) ou un rang minimal la retiennent. */}
      <Verrou contenu={{ id: l.id, acces: (l.niveau_acces === 'reserve' ? 'reserve' : 'libre') as NiveauAcces, roles: ['admin', 'validator'] }} regle={regleSansFormule(l as { rang_min?: unknown })}>
        <Bouton label={p.faits === 0 && !r.position[l.id] ? 'Commencer la lecture' : p.faits === p.total ? 'Relire depuis le début' : 'Reprendre la lecture'} icone="livre" variante="ambre" onPress={() => pile.pousser({ t: 'lire', livreId: l.id, idx: p.faits === p.total ? 0 : reprise })} />
        <SectionTitre titre="Chapitres" />
        {chap.map((x, i) => { const res = donnees.lectures?.[x.id]; return (
          <Carte key={x.id} plat onPress={() => pile.pousser({ t: 'lire', livreId: l.id, idx: i })} label={x.titre}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: res ? c.succes : c.fond2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.bord }}>{res ? <Ic nom="ok" taille={18} couleur="#FFF" /> : <T v="petit">{i + 1}</T>}</View>
              <View style={{ flex: 1 }}><T v="carte" numberOfLines={2}>{x.titre}</T><T v="petit">{minutesMots(x.mots)} min{res && res.sur > 0 ? ` · quiz ${res.bonnes}/${res.sur}` : ''}</T></View>
              {res && res.sur > 0 && <Text style={{ color: c.accent, fontSize: 14 }}>{'★'.repeat(Math.max(1, Math.round((res.bonnes / res.sur) * 3)))}</Text>}
            </View>
          </Carte>); })}
      </Verrou>
    </Ecran>
  );
}

// ------------------------------------------------------------------ lecteur
type Selection = { mot: string; phrase: string; sens?: string };
const nettoie = (m: string) => m.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');

type Regler = (p: Partial<Reglages> | ((a: Reglages) => Partial<Reglages>)) => void;
/** Charge la fiche puis le texte du chapitre demandé (copie locale pour la relecture hors ligne). */
function LecteurCharge({ livreId, idx, pile, r, regler }: { livreId: string; idx: number; pile: Pile; r: Reglages; regler: Regler }) {
  const f = useFiche(livreId);
  const { profil } = useAuth();
  const [texte, setTexte] = useState<ChapitreTexte | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  const chap = f && f !== 'erreur' ? f.chapitres : [];
  const i = Math.min(Math.max(idx, 0), Math.max(0, chap.length - 1));
  const cid = chap[i]?.id;
  useEffect(() => {
    if (!cid) return;
    let ok = true; setTexte(null); setRefus(null);
    texteChapitre(livreId, cid, !!profil).then(x => { if (ok) setTexte(x.chapitre); })
      .catch(e => { if (ok) setRefus((e as { status?: number }).status === 401 ? 'Connecte-toi pour lire ce livre.' : (e as { status?: number }).status === 402 ? (e as Error).message : 'Ce chapitre ne se charge pas. Vérifie ta connexion.'); });
    return () => { ok = false; };
  }, [livreId, cid, profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (f === 'erreur') return <Ecran><Entete titre="Livre" retour={pile.retour} /><EtatVide icone="livre" titre="Livre introuvable" /></Ecran>;
  if (refus) return <Ecran><Entete titre={f?.livre.titre ?? 'Livre'} retour={pile.retour} /><EtatVide icone="verrou" titre="Lecture impossible" texte={refus} /></Ecran>;
  if (!f || !texte) return <Ecran><Entete titre={f ? f.livre.titre : 'Livre'} retour={pile.retour} /><Chargement lignes={6} /></Ecran>;
  return <Lecteur l={f.livre} chap={chap} ch={texte} idx={i} pile={pile} r={r} regler={regler} />;
}

function Lecteur({ l, chap, ch, idx, pile, r, regler }: { l: Livre; chap: Chap[]; ch: ChapitreTexte; idx: number; pile: Pile; r: Reglages; regler: Regler }) {
  const { c } = useTheme();
  const toast = useToast();
  const { lireChapitre, donnees } = useProgres();
  const [phase, setPhase] = useState<'texte' | 'quiz' | 'fin'>('texte');
  const [sel, setSel] = useState<Selection | null>(null);
  const [explication, setExplication] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [bilan, setBilan] = useState<{ bonnes: number; sur: number; xp: number; premiere: boolean } | null>(null);
  useEffect(() => { setPhase('texte'); setSel(null); setExplication(null); setBilan(null); regler(a => ({ dernier: l.id, position: { ...a.position, [l.id]: idx } })); }, [idx, l.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const glossaire = useMemo(() => (Array.isArray(ch?.glossaire) ? (ch.glossaire as { mot: string; sens: string }[]) : []), [ch]);
  const questions = useMemo<QuestionLecture[]>(() => {
    const fournies = Array.isArray(ch?.questions) ? (ch.questions as { enonce: string; options: string[]; bonne: number }[]).filter(x => x?.enonce && Array.isArray(x.options) && x.options.length >= 2).map(x => ({ ...x, mot: x.options[x.bonne] })) : [];
    return fournies.length ? fournies : quizLecture(ch?.texte ?? '', 3);
  }, [ch]);
  const paragraphes = useMemo(() => (ch?.texte ?? '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean), [ch]);
  if (!ch) return null;
  const taille = r.taille;
  const toucher = (mot: string, para: string) => {
    const m = nettoie(mot); if (m.length < 2) return;
    const phrase = (para.split(/(?<=[.!?…»])\s+/).find(p => p.includes(mot)) ?? para).slice(0, 260);
    const g = glossaire.find(x => x.mot.toLowerCase() === m.toLowerCase());
    setSel({ mot: m, phrase, sens: g?.sens }); setExplication(null);
  };
  const garder = () => {
    if (!sel) return;
    if (r.mots.some(x => x.mot.toLowerCase() === sel.mot.toLowerCase())) { toast('Déjà dans Mes mots.'); return; }
    regler(a => ({ mots: [{ mot: sel.mot, sens: sel.sens ?? explication ?? '', livre: l.titre, le: Date.now() }, ...a.mots] }));
    toast('Ajouté à Mes mots.', 'succes');
  };
  const expliquer = async () => {
    if (!sel) return;
    setOccupe(true);
    try { const rep = await demanderKakIgonjo(`Explique en une ou deux phrases simples le mot « ${sel.mot} » dans cette phrase : « ${sel.phrase} »`); setExplication(rep.reponse); }
    catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); }
  };
  const suite = idx + 1 < chap.length;
  const deja = !!donnees.lectures?.[ch.id];

  if (phase === 'quiz') return <Quiz questions={questions} titre={ch.titre} onFini={async (bonnes, sur) => {
    setOccupe(true);
    try { const x = await lireChapitre(l.id, ch.id, bonnes, sur); setBilan({ bonnes, sur, xp: x.xpGagne, premiere: x.premiereFois }); }
    catch (e) { toast((e as Error).message, 'erreur'); setBilan({ bonnes, sur, xp: 0, premiere: false }); } finally { setOccupe(false); setPhase('fin'); }
  }} />;

  if (phase === 'fin' && bilan) return (
    <Ecran contenu={{ alignItems: 'center' }}>
      <Mascotte taille={120} humeur={bilan.sur === 0 || bilan.bonnes / Math.max(1, bilan.sur) >= 0.5 ? 'content' : 'parle'} />
      <T v="titre" style={{ textAlign: 'center' }}>Chapitre terminé !</T>
      {bilan.sur > 0 && <T v="corps" style={{ textAlign: 'center' }}>{bilan.bonnes} bonne{bilan.bonnes > 1 ? 's' : ''} réponse{bilan.bonnes > 1 ? 's' : ''} sur {bilan.sur}</T>}
      <T v="sousTitre" couleur={c.accent}>{bilan.xp > 0 ? `+${bilan.xp} XP` : bilan.premiere ? '' : 'Déjà lu : pas d\'XP en plus'}</T>
      <Bouton label={suite ? 'Chapitre suivant' : 'Terminer le livre'} variante="ambre" onPress={() => (suite ? pile.remplacer({ t: 'lire', livreId: l.id, idx: idx + 1 }) : pile.retour())} />
      <Bouton label="Revenir au livre" variante="fantome" onPress={pile.retour} />
    </Ecran>
  );

  return (
    <Ecran bas={60}>
      <Entete titre={l.titre} sous={`${ch.titre} · ${idx + 1}/${chap.length}`} retour={pile.retour} droite={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Réduire le texte" onPress={() => regler({ taille: Math.max(14, taille - 1) })} hitSlop={8}><Text style={{ color: c.fort, fontFamily: polices.titre, fontSize: 15, padding: 8 }}>A−</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Agrandir le texte" onPress={() => regler({ taille: Math.min(26, taille + 1) })} hitSlop={8}><Text style={{ color: c.fort, fontFamily: polices.titre, fontSize: 20, padding: 6 }}>A+</Text></Pressable>
        </View>} />
      <Barre valeur={(idx + 1) / chap.length} hauteur={5} />
      <View style={{ gap: taille * 0.9 }}>
        {paragraphes.map((p, i) => (
          <Text key={i} selectable={false} style={{ color: c.fort, fontFamily: polices.corps, fontSize: taille, lineHeight: taille * 1.65 }}>
            {p.split(/(\s+)/).map((m, j) => /^\s+$/.test(m) ? m : (
              <Text key={j} onPress={() => toucher(m, p)} style={sel && nettoie(m).toLowerCase() === sel.mot.toLowerCase() ? { backgroundColor: c.halo2, color: c.accent } : glossaire.some(g => g.mot.toLowerCase() === nettoie(m).toLowerCase()) ? { textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: c.accent } : undefined}>{m}</Text>))}
          </Text>))}
      </View>
      <T v="petit" style={{ textAlign: 'center' }}>Touche un mot pour le comprendre ou le garder. Les mots soulignés ont une explication.</T>
      <Bouton label={questions.length ? (deja ? 'Refaire le quiz' : 'J\'ai fini : le quiz') : 'J\'ai fini ce chapitre'} variante="ambre" icone="ok" charge={occupe} onPress={() => (questions.length ? setPhase('quiz') : (async () => { setOccupe(true); try { const x = await lireChapitre(l.id, ch.id, 0, 0); setBilan({ bonnes: 0, sur: 0, xp: x.xpGagne, premiere: x.premiereFois }); } catch (e) { toast((e as Error).message, 'erreur'); setBilan({ bonnes: 0, sur: 0, xp: 0, premiere: false }); } finally { setOccupe(false); setPhase('fin'); } })())} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {idx > 0 && <Bouton label="Précédent" variante="fantome" petit large={false} icone="retour" onPress={() => pile.remplacer({ t: 'lire', livreId: l.id, idx: idx - 1 })} />}
        {suite && <Bouton label="Passer au suivant" variante="fantome" petit large={false} onPress={() => pile.remplacer({ t: 'lire', livreId: l.id, idx: idx + 1 })} />}
      </View>
      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <Pressable accessibilityLabel="Fermer" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={() => setSel(null)}>
        {sel && <Pressable onPress={() => {}} style={{ margin: 12, padding: 16, gap: 8, borderRadius: 20, backgroundColor: c.fond2, borderWidth: 1, borderColor: c.bordAmbre, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, maxWidth: 640, alignSelf: 'center', width: '96%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><T v="sousTitre" style={{ flex: 1 }}>{sel.mot}</T><Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setSel(null)} hitSlop={10}><Ic nom="fermer" taille={22} couleur={c.discret} /></Pressable></View>
          {occupe ? <Chargement lignes={1} /> : <T v="corps">{sel.sens || explication || 'Pas d\'explication dans le glossaire de ce chapitre.'}</T>}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Bouton label="Garder ce mot" petit large={false} icone="coeur" onPress={garder} />
            {!sel.sens && !explication && fonctionActive('assistantIA') && <Bouton label="Demander à Kak'Igonjo" petit large={false} variante="fantome" onPress={expliquer} />}
          </View>
        </Pressable>}
        </Pressable>
      </Modal>
    </Ecran>
  );
}

// ------------------------------------------------------------------ quiz de fin de chapitre
function Quiz({ questions, titre, onFini }: { questions: QuestionLecture[]; titre: string; onFini: (bonnes: number, sur: number) => void }) {
  const { c } = useTheme();
  const { vibrer } = usePrefs();
  const [i, setI] = useState(0); const [choix, setChoix] = useState<number | null>(null); const [bonnes, setBonnes] = useState(0);
  const q = questions[i];
  const valider = (k: number) => { if (choix !== null) return; setChoix(k); const ok = k === q.bonne; if (ok) setBonnes(b => b + 1); vibrer(ok ? 'succes' : 'erreur'); };
  const suivant = () => { if (i + 1 < questions.length) { setI(i + 1); setChoix(null); } else onFini(bonnes, questions.length); };
  return (
    <Ecran bas={40}>
      <Entete titre="Quiz du chapitre" sous={titre} />
      <Barre valeur={(i + (choix !== null ? 1 : 0)) / questions.length} />
      <T v="libelle">Complète le texte · {i + 1}/{questions.length}</T>
      <T v="sousTitre">« {q.enonce} »</T>
      {q.options.map((o, k) => {
        const bon = choix !== null && k === q.bonne, faux = choix === k && k !== q.bonne;
        return <Pressable key={k} accessibilityRole="button" onPress={() => valider(k)} style={{ padding: 16, borderRadius: 16, borderWidth: 2, borderColor: bon ? c.succes : faux ? c.erreur : c.bord, backgroundColor: bon ? c.succes + '22' : faux ? c.erreur + '22' : c.carte }}><T v="corps" couleur={c.fort}>{o}</T></Pressable>;
      })}
      {choix !== null && <>
        <T v="corps" couleur={choix === q.bonne ? c.succes : c.erreur}>{choix === q.bonne ? 'Bravo !' : `Pas tout à fait : c'était « ${q.options[q.bonne]} ».`}</T>
        <Bouton label={i + 1 < questions.length ? 'Question suivante' : 'Voir mon résultat'} variante="ambre" onPress={suivant} />
      </>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ mes mots
function MesMots({ r, regler, retour }: { r: Reglages; regler: (p: Partial<Reglages>) => void; retour: () => void }) {
  const { c } = useTheme();
  const [ordre, setOrdre] = useState(false);
  const liste = ordre ? [...r.mots].sort((a, b) => a.mot.localeCompare(b.mot, 'fr')) : r.mots;
  return (
    <Ecran bas={40}>
      <Entete titre="Mes mots" sous={`${r.mots.length} mot${r.mots.length > 1 ? 's' : ''} : leçons, lectures, dictionnaire`} retour={retour} />
      {r.mots.length === 0 ? <EtatVide mascotte titre="Aucun mot pour l'instant" texte="Les mots de tes leçons arrivent ici. Pendant la lecture, touche un mot puis « Garder ce mot »." /> : <>
        <Rangee><Puce label="Récents" actif={!ordre} onPress={() => setOrdre(false)} /><Puce label="A → Z" actif={ordre} onPress={() => setOrdre(true)} /></Rangee>
        {liste.map(m => <Carte key={m.mot + m.le} plat><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
          <View style={{ flex: 1 }}><T v="carte">{m.mot}</T>{!!m.sens && <T v="corps">{m.sens}</T>}<T v="petit">{m.livre}</T></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${m.mot}`} hitSlop={10} onPress={() => regler({ mots: r.mots.filter(x => x !== m) })}><Ic nom="fermer" taille={20} couleur={c.discret} /></Pressable>
        </View></Carte>)}
      </>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ dictionnaire interactif (demande de Capp, 13 nov. 2026)
/**
 * Recherche dans les deux sens (myènè ⇄ français) parmi les fiches du corpus présentes sur l'appareil (catalogue local, hors ligne).
 * Chaque entrée : mot, traduction, dialecte, référence, écoute si un enregistrement existe, « Mes mots », explication par Kak'Igonjo.
 */
function Dictionnaire({ r, regler, retour }: { r: Reglages; regler: (f: (a: Reglages) => Partial<Reglages>) => void; retour: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<QuestionnaireItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [cherche, setCherche] = useState(false);
  const [explique, setExplique] = useState<QuestionnaireItem | null>(null);
  useEffect(() => { catalogue.compter().then(setTotal).catch(() => setTotal(0)); }, []);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setRes([]); return; }
    setCherche(true);
    const h = setTimeout(() => { catalogue.rechercher({ texte: t, limite: 40, decalage: 0 }).then(l => setRes(l.filter(f => f.status !== 'archived'))).catch(() => setRes([])).finally(() => setCherche(false)); }, 250);
    return () => clearTimeout(h);
  }, [q]);
  const garder = (f: QuestionnaireItem) => {
    if (r.mots.some(x => x.mot.toLowerCase() === f.myeneText.toLowerCase())) { toast('Déjà dans Mes mots.'); return; }
    regler(a => ({ mots: [{ mot: f.myeneText, sens: f.frenchText, livre: 'Dictionnaire', le: Date.now() }, ...a.mots] }));
    toast('Ajouté à Mes mots.', 'succes');
  };
  return (
    <Ecran bas={40}>
      <Entete titre="Dictionnaire" sous="Myènè ⇄ français" retour={retour} recherche={false} />
      <Champ valeur={q} onChange={setQ} placeholder="Un mot en myènè ou en français" icone="chercher" auto="none" focus />
      {total === 0 && <EtatVide mascotte titre="Le dictionnaire n'est pas encore sur ce téléphone" texte="Il se télécharge avec la partie Contribuer (fiches du corpus). Ouvre-la une fois avec du réseau." />}
      {cherche && <Chargement />}
      {!cherche && q.trim().length >= 2 && res.length === 0 && total !== 0 && <EtatVide icone="chercher" titre="Aucun mot trouvé" texte="Essaie une autre orthographe ou demande à Kak'Igonjo." />}
      {res.map(f => (
        <Carte key={f.id} plat><View style={{ padding: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1 }}><T v="sousTitre" style={{ fontStyle: 'italic' }}>{f.myeneText}</T><T v="corps">{f.frenchText}</T></View>
            {!!f.sampleAudioUrl && <Son audio={f.sampleAudioUrl} />}
          </View>
          <T v="petit">{[f.dialect, f.theme || f.category, f.sourceRef].filter(Boolean).join(' · ')}</T>
          {!!f.contextNotes && <T v="petit" numberOfLines={3}>{f.contextNotes}</T>}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Puce label="Mes mots" icone="ajouter" onPress={() => garder(f)} />
            <Puce label="Kak'Igonjo explique" icone="info" onPress={() => setExplique(f)} />
          </View>
        </View></Carte>
      ))}
      {explique && <KakIgonjoFeuille visible onClose={() => setExplique(null)} titre={explique.myeneText}
        consigne={`Explique-moi simplement le mot ou l'expression myènè « ${explique.myeneText} » (${explique.frenchText}), dialecte ${explique.dialect}${explique.sourceRef ? `, référence ${explique.sourceRef}` : ''}. Donne un exemple d'usage seulement si tu le trouves dans le corpus, et dis d'où il vient.`}
        affiche={`Que veut dire « ${explique.myeneText} » ?`} />}
      <T v="petit" style={{ color: c.discret }}>Les fiches viennent du corpus Ompangano ; certaines sont encore en cours de validation par les locuteurs.</T>
    </Ecran>
  );
}
