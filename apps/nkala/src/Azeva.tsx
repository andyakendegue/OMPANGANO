/** Azeva (Jouer) : hall façon salle de jeux, salles, défi du jour, cœurs, annonce récompensée, duels, classements, collection. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Share, View } from 'react-native';
import {
  appliquerTemps, attenteCoeur, bonneReponse, chargerClassementJeux, chargerDefiDuJour, creerDuel, DIALECTES, etatInitial, etoiles, fonctionActive, graineJour, hasardGraine, jouerDuel, jouable, jourLocal,
  lireDuel, mauvaiseReponse, melanger, peutJouer, rangPourXp, REGLES, demanderPub, reclamerRecompensePub, signalerPub, type CreationPub, type Duel, type EtatJeu, type Ligne, type LigneClassementJeux, type MotJeu, type QuestionnaireItem,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { JeuRunner, type ResultatPartie } from './AzevaJeux';
import { Bouton, Carte, Chargement, Ecran, Entete, EtatVide, Flamme, Ic, Mascotte, Pastille, Puce, Rangee, SectionTitre, T, Barre, Champ, Visuel, useToast } from './kit';
import { usePile } from './Pile';
import { usePrefs, useTheme } from './Prefs';
import { useProgres } from './Progres';
import { EmplacementPub } from './Pub';
import { useContenus } from './useContenu';
import { Confettis } from './Confettis';
import { Image } from 'react-native';

type E =
  | { t: 'hall' } | { t: 'salle'; id: string } | { t: 'jeu'; jeu: Ligne; defiId?: string; duel?: Duel } | { t: 'resultat'; jeu: Ligne; r: ResultatPartie; score: number; xp: number; defiId?: string }
  | { t: 'classements' } | { t: 'duel' } | { t: 'collection' } | { t: 'defi' } | { t: 'coeur' };

const num = (v: unknown) => Number(v) || 0;
const clefEtoiles = (uid: string) => `nkala_etoiles_${uid}`;

/** Les cœurs et les points du joueur (clé de stockage historique conservée : la progression des joueurs reste). */
function useCoeurs() {
  const { profil } = useAuth();
  const cle = `nkala_onenji_${profil?.id || 'anon'}`;
  const [etat, setEtat] = useState<EtatJeu | null>(null);
  useEffect(() => { AsyncStorage.getItem(cle).then(v => setEtat(appliquerTemps(v ? JSON.parse(v) : etatInitial()))).catch(() => setEtat(etatInitial())); }, [cle]);
  useEffect(() => { if (etat) AsyncStorage.setItem(cle, JSON.stringify(etat)).catch(() => {}); }, [etat, cle]);
  useEffect(() => { const t = setInterval(() => setEtat(e => (e ? appliquerTemps(e) : e)), 15_000); return () => clearInterval(t); }, []);
  return { etat, bonne: () => setEtat(e => (e ? bonneReponse(e) : e)), erreur: () => setEtat(e => (e ? mauvaiseReponse(e) : e)), donnerCoeur: () => setEtat(e => (e ? { ...e, coeurs: Math.min(REGLES.coeursMax, e.coeurs + 1), horloge: Date.now() } : e)) };
}

export function Azeva() {
  const pile = usePile<E>({ t: 'hall' });
  const { profil } = useAuth();
  const { prefs } = usePrefs();
  const coeurs = useCoeurs();
  const { res, chargement } = useContenus(['salles', 'jeux', 'mots_jeux', 'plateau', 'succes', 'avatars']);
  const [dialecte, setDialecte] = useState('orungu');
  const [fiches, setFiches] = useState<QuestionnaireItem[]>([]);
  useEffect(() => { catalogue.aleatoires(dialecte, 80).then(l => setFiches(l.filter(jouable))).catch(() => setFiches([])); }, [dialecte]);
  const mots = useMemo<MotJeu[]>(() => [
    ...fiches.map(f => ({ id: f.id, myene: f.myeneText.trim(), francais: f.frenchText.trim() })),
    ...(res.mots_jeux ?? []).map(m => ({ id: m.id, myene: String(m.myene), francais: String(m.francais), theme: m.theme, audio: m.audio, image: m.image })),
  ], [fiches, res.mots_jeux]);
  const jeux = (res.jeux ?? []).filter(j => prefs.mode !== 'enfant' || j.mode_enfant === true || j.mode_enfant === 'oui');
  const D = { salles: res.salles ?? [], jeux, mots, fiches, plateau: (res.plateau ?? []).map(c => ({ id: c.id, position: num(c.position), type: c.type, texte: c.texte, effet: num(c.effet) })) as never[] };
  const e = pile.ecran;
  if (chargement || !coeurs.etat) return <Ecran><Chargement /></Ecran>;
  const etat = coeurs.etat;

  if (e.t === 'jeu') {
    if (!peutJouer(etat)) return <Coeur etat={etat} pile={pile} coeurs={coeurs} />;
    return <JeuxFlux e={e} D={D} dialecte={dialecte} pile={pile} coeurs={coeurs} etat={etat} />;
  }
  switch (e.t) {
    case 'resultat': return <Resultat e={e} pile={pile} coeurs={coeurs} />;
    case 'salle': return <Salle id={e.id} D={D} pile={pile} />;
    case 'classements': return <Classements retour={pile.retour} jeux={D.jeux} />;
    case 'duel': return <DuelEcran retour={pile.retour} mots={res.mots_jeux ?? []} />;
    case 'collection': return <Collection retour={pile.retour} succes={res.succes ?? []} avatars={res.avatars ?? []} />;
    case 'defi': return <DefiJour pile={pile} D={D} />;
    case 'coeur': return <Coeur etat={etat} pile={pile} coeurs={coeurs} />;
    default: return <Hall D={D} pile={pile} etat={etat} dialecte={dialecte} setDialecte={setDialecte} />;
  }
}
type Donnees = { salles: Ligne[]; jeux: Ligne[]; mots: MotJeu[]; fiches: QuestionnaireItem[]; plateau: never[] };
type Pile = ReturnType<typeof usePile<E>>;
type Coeurs = ReturnType<typeof useCoeurs>;

// ------------------------------------------------------------------ hall (46)
function Hall({ D, pile, etat, dialecte, setDialecte }: { D: Donnees; pile: Pile; etat: EtatJeu; dialecte: string; setDialecte: (d: string) => void }) {
  const { c } = useTheme();
  const { donnees } = useProgres();
  const [defi, setDefi] = useState<{ id: string; titre: string; jeu_id?: string; xp?: number } | null>(null);
  useEffect(() => { chargerDefiDuJour().then(r => setDefi(r.defi)).catch(() => {}); }, []);
  const attente = attenteCoeur(etat);
  const jaune = c.modules.azeva;
  const jeuDefi = D.jeux.find(j => j.id === defi?.jeu_id) ?? D.jeux[0];
  return (
    <Ecran bas={90}>
      <Entete titre="Jouer" sous={`${etat.points} points · série ${donnees.serie ?? 0} j`} droite={<Pressable accessibilityRole="button" accessibilityLabel={`${etat.coeurs} cœurs`} onPress={() => pile.pousser({ t: 'coeur' })} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><Ic nom="coeur" taille={22} couleur={c.erreur} /><T v="carte">{etat.coeurs}</T></Pressable>} />
      {jeuDefi && <Carte accent={jaune} onPress={() => pile.pousser({ t: 'defi' })} label="Défi du jour">
        <View style={{ padding: 18, gap: 8 }}><T v="libelle" couleur={jaune}>Défi du jour</T><T v="sousTitre">{defi?.titre ?? `Une partie de ${jeuDefi.titre}`}</T><T v="petit">{defi?.xp ? `+${defi.xp} XP à gagner` : 'Chaque jour, un nouveau défi.'}</T>
          <Bouton label="Relever le défi" variante="ambre" petit large={false} icone="lecture" onPress={() => pile.pousser({ t: 'jeu', jeu: jeuDefi, defiId: defi?.id })} /></View></Carte>}
      <Rangee>{DIALECTES.map(d => <Puce key={d.code} label={d.nom} actif={dialecte === d.code} onPress={() => setDialecte(d.code)} couleur={jaune} />)}</Rangee>
      <SectionTitre titre="Les salles" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {D.salles.map(s => {
          const jeux = D.jeux.filter(j => j.salle_id === s.id);
          return (
            <Carte key={s.id} accent={s.couleur} onPress={() => pile.pousser({ t: 'salle', id: s.id })} style={{ width: '47%', flexGrow: 1 }} label={`Salle ${s.titre}`}>
              <View style={{ padding: 16, gap: 8, minHeight: 120 }}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: s.couleur ?? jaune, alignItems: 'center', justifyContent: 'center' }}><Ic nom={s.icone || 'jouer'} taille={24} couleur="#170D08" /></View><T v="carte">{s.titre}</T><T v="petit">{jeux.length} jeu{jeux.length > 1 ? 'x' : ''}</T></View>
            </Carte>
          );
        })}
      </View>
      {D.salles.length === 0 && <EtatVide mascotte titre="La salle de jeux ouvre bientôt" texte="Les premiers jeux arrivent." />}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Carte onPress={() => pile.pousser({ t: 'classements' })} style={{ flex: 1 }} label="Classements"><View style={{ padding: 14, gap: 6 }}><Ic nom="coupe" taille={24} couleur={jaune} /><T v="petit" fort numberOfLines={1}>Classements</T></View></Carte>
        <Carte onPress={() => pile.pousser({ t: 'duel' })} style={{ flex: 1 }} label="Duel"><View style={{ padding: 14, gap: 6 }}><Ic nom="duel" taille={24} couleur={jaune} /><T v="petit" fort numberOfLines={1}>Duel</T></View></Carte>
        <Carte onPress={() => pile.pousser({ t: 'collection' })} style={{ flex: 1 }} label="Collection"><View style={{ padding: 14, gap: 6 }}><Ic nom="etoile" taille={24} couleur={jaune} /><T v="petit" fort numberOfLines={1}>Collection</T></View></Carte>
      </View>
      {attente !== null && <T v="petit">Prochain cœur dans {Math.ceil(attente / 60_000)} min.</T>}
    </Ecran>
  );
}

function Salle({ id, D, pile }: { id: string; D: Donnees; pile: Pile }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const [et, setEt] = useState<Record<string, number>>({});
  useEffect(() => { AsyncStorage.getItem(clefEtoiles(profil?.id ?? 'anon')).then(v => v && setEt(JSON.parse(v))).catch(() => {}); }, [profil?.id]);
  const s = D.salles.find(x => x.id === id);
  const jeux = D.jeux.filter(j => j.salle_id === id);
  return (
    <Ecran bas={40}>
      <Entete titre={s?.titre ?? 'Salle'} sous={s?.description} retour={pile.retour} />
      {jeux.length === 0 && <EtatVide mascotte titre="Salle en préparation" />}
      {jeux.map(j => (
        <Carte key={j.id} onPress={() => pile.pousser({ t: 'jeu', jeu: j })} label={j.titre} accent={j.couleur}><View style={{ padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: j.couleur ?? c.modules.azeva, alignItems: 'center', justifyContent: 'center' }}><Ic nom="jouer" taille={26} couleur="#170D08" /></View>
          <View style={{ flex: 1 }}><T v="carte">{j.titre}</T><T v="petit" numberOfLines={2}>{j.description}</T></View>
          <View style={{ flexDirection: 'row' }}>{[1, 2, 3].map(k => <Ic key={k} nom="etoile" taille={16} couleur={(et[j.id] ?? 0) >= k ? c.modules.azeva : c.bord} />)}</View>
        </View></Carte>
      ))}
    </Ecran>
  );
}

// ------------------------------------------------------------------ partie
function JeuxFlux({ e, D, dialecte, pile, coeurs, etat }: { e: Extract<E, { t: 'jeu' }>; D: Donnees; dialecte: string; pile: Pile; coeurs: Coeurs; etat: EtatJeu }) {
  const { enregistrerPartie } = useProgres();
  const { c } = useTheme();
  return (
    <JeuRunner jeu={e.jeu} mots={D.mots} fiches={D.fiches} dialecte={dialecte} couleur={e.jeu.couleur ?? c.modules.azeva} cases={D.plateau} coeurs={etat.coeurs}
      onQuitter={pile.retour} onBonne={coeurs.bonne} onErreur={coeurs.erreur}
      onFin={async r => { const x = await enregistrerPartie({ jeuId: e.jeu.id, bonnes: r.bonnes, erreurs: r.erreurs, secondesRestantes: r.secondesRestantes, serie: r.serie, defiId: e.defiId }); pile.remplacer({ t: 'resultat', jeu: e.jeu, r, score: x.score, xp: x.xpGagne, defiId: e.defiId }); }} />
  );
}

function Resultat({ e, pile, coeurs }: { e: Extract<E, { t: 'resultat' }>; pile: Pile; coeurs: Coeurs }) {
  const { c } = useTheme();
  const { prefs } = usePrefs();
  const { profil } = useAuth();
  const total = e.r.bonnes + e.r.erreurs;
  const victoire = e.r.bonnes > e.r.erreurs;
  const et = etoiles(e.r.bonnes, total);
  useEffect(() => { const cle = clefEtoiles(profil?.id ?? 'anon'); AsyncStorage.getItem(cle).then(v => { const o = v ? JSON.parse(v) : {}; if ((o[e.jeu.id] ?? 0) < et) AsyncStorage.setItem(cle, JSON.stringify({ ...o, [e.jeu.id]: et })); }).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Ecran contenu={{ alignItems: 'center' }}>
      {victoire && prefs.animations !== 'aucune' && <Confettis declencheur nombre={prefs.animations === 'legeres' ? 20 : 40} />}
      <Mascotte taille={130} humeur={victoire ? 'content' : 'triste'} />
      <T v="titre" style={{ textAlign: 'center' }}>{victoire ? 'Victoire !' : 'Partie perdue'}</T>
      {victoire ? <View style={{ flexDirection: 'row', gap: 6 }}>{[1, 2, 3].map(k => <Ic key={k} nom="etoile" taille={36} couleur={et >= k ? c.modules.azeva : c.bord} />)}</View>
        : <T v="corps" style={{ textAlign: 'center' }}>Pas cette fois. Le mot était juste là. Réessaie : tu vas y arriver.</T>}
      <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
        {[['Score', e.score], ['XP', `+${e.xp}`], ['Réussies', `${e.r.bonnes}/${total}`]].map(([l, v]) => <Carte key={String(l)} style={{ flex: 1, padding: 14, alignItems: 'center' }}><T v="titre" couleur={c.accent}>{String(v)}</T><T v="petit">{String(l)}</T></Carte>)}
      </View>
      <EmplacementPub zone="bandeau_resultats" />
      <Bouton label="Rejouer" variante="ambre" icone="lecture" onPress={() => pile.remplacer({ t: 'jeu', jeu: e.jeu, defiId: e.defiId })} />
      <Bouton label="Retour au hall" variante="fantome" onPress={pile.racine} />
    </Ecran>
  );
}

// ------------------------------------------------------------------ recharger un cœur (55) : attendre, gagner des points, ou regarder une annonce au choix
function Coeur({ etat, pile, coeurs }: { etat: EtatJeu; pile: Pile; coeurs: Coeurs }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const { prefs } = usePrefs();
  const toast = useToast();
  const [pub, setPub] = useState<CreationPub | null>(null);
  const [reste, setReste] = useState(0);
  const debut = useRef(0);
  const attente = attenteCoeur(etat);
  const possible = !!profil && fonctionActive('publicite') && prefs.mode !== 'enfant';
  const proposer = async () => { try { const r = await demanderPub('recompense_coeur'); if (!r.pub) { toast('Aucune annonce pour le moment.', 'info'); return; } setPub(r.pub); setReste(6); debut.current = Date.now(); signalerPub('affichage', r.pub.id, 'recompense_coeur').catch(() => {}); } catch (e) { toast((e as Error).message, 'erreur'); } };
  useEffect(() => { if (!pub || reste <= 0) return; const t = setTimeout(() => setReste(r => r - 1), 1000); return () => clearTimeout(t); }, [pub, reste]);
  const reclamer = async () => { if (!pub) return; try { await reclamerRecompensePub(pub.id, Date.now() - debut.current); coeurs.donnerCoeur(); toast('Un cœur de plus !', 'succes'); setPub(null); if (peutJouer(etat) || true) pile.retour(); } catch (e) { toast((e as Error).message, 'erreur'); setPub(null); } };
  return (
    <Ecran>
      <Entete titre="Mes cœurs" retour={pile.ecran.t === 'coeur' ? pile.retour : undefined} />
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>{Array.from({ length: REGLES.coeursMax }, (_, i) => <Ic key={i} nom="coeur" taille={36} couleur={i < etat.coeurs ? c.erreur : c.bord} />)}</View>
        <T v="corps" style={{ textAlign: 'center' }}>{etat.coeurs === 0 ? 'Plus de cœurs.' : `${etat.coeurs} cœur${etat.coeurs > 1 ? 's' : ''}.`} {attente !== null ? `Un cœur revient dans ${Math.ceil(attente / 60_000)} min (un toutes les ${REGLES.minutesParCoeur} min).` : ''}</T>
        <T v="petit" style={{ textAlign: 'center' }}>Une mauvaise réponse retire un cœur. {REGLES.pointsParBonneReponse} points par bonne réponse, {REGLES.pointsParCoeur} points rendent un cœur.</T>
      </View>
      {possible && <Bouton label="Regarder une annonce (+1 cœur)" icone="cadeau" variante="ambre" onPress={proposer} />}
      {possible && <T v="petit" style={{ textAlign: 'center' }}>C'est ton choix : 3 annonces au plus par jour, jamais pendant une leçon.</T>}
      <Modal visible={!!pub} transparent animationType="fade"><View style={{ flex: 1, backgroundColor: 'rgba(8,4,2,0.92)', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        {pub && <><Visuel uri={pub.image} largeur="100%" hauteur={260} rayon={20} icone="etiquette" /><T v="sousTitre" couleur="#FDFAF7" style={{ textAlign: 'center' }}>{pub.titre || pub.texte_alt}</T><T v="petit" couleur="#FED7AA">Publicité{pub.annonceur ? ` · ${pub.annonceur}` : ''}</T>
          <Bouton label={reste > 0 ? `Encore ${reste} s…` : 'Récupérer mon cœur'} desactive={reste > 0} variante="ambre" onPress={reclamer} />
          <Bouton label="Fermer sans récompense" variante="fantome" petit onPress={() => setPub(null)} /></>}
      </View></Modal>
    </Ecran>
  );
}

// ------------------------------------------------------------------ défi du jour (59)
function DefiJour({ pile, D }: { pile: Pile; D: Donnees }) {
  const { c } = useTheme();
  const [defi, setDefi] = useState<{ id: string; titre: string; jeu_id?: string; xp?: number } | null>(null);
  const [reste, setReste] = useState('');
  useEffect(() => { chargerDefiDuJour().then(r => setDefi(r.defi)).catch(() => {}); }, []);
  useEffect(() => {
    const maj = () => { const n = new Date(), f = new Date(n); f.setHours(24, 0, 0, 0); const s = Math.floor((+f - +n) / 1000); setReste(`${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`); };
    maj(); const t = setInterval(maj, 1000); return () => clearInterval(t);
  }, []);
  const jeu = D.jeux.find(j => j.id === defi?.jeu_id) ?? D.jeux[0];
  return (
    <Ecran>
      <Entete titre="Défi du jour" retour={pile.retour} />
      <Carte accent={c.modules.azeva} style={{ padding: 22, gap: 10, alignItems: 'center' }}>
        <Flamme taille={44} /><T v="sousTitre" style={{ textAlign: 'center' }}>{defi?.titre ?? 'Pas de défi publié aujourd\'hui'}</T>
        <T v="titre" couleur={c.accent} accessibilityLabel={`Temps restant ${reste}`}>{reste}</T><T v="petit">avant le prochain défi</T>
        {!!defi?.xp && <T v="corps">Récompense : +{defi.xp} XP</T>}
      </Carte>
      {jeu && <Bouton label="Jouer maintenant" icone="lecture" variante="ambre" onPress={() => pile.remplacer({ t: 'jeu', jeu, defiId: defi?.id })} />}
    </Ecran>
  );
}

// ------------------------------------------------------------------ classements (56)
function Classements({ retour, jeux }: { retour: () => void; jeux: Ligne[] }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const [groupe, setGroupe] = useState('tous');
  const [portee, setPortee] = useState('semaine');
  const [liste, setListe] = useState<LigneClassementJeux[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { if (!profil) return; setListe(null); setErr(false); chargerClassementJeux(portee, groupe).then(r => setListe(r.classement)).catch(() => setErr(true)); }, [groupe, portee, profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  void jeux;
  return (
    <Ecran bas={40}>
      <Entete titre="Classements" retour={retour} />
      {!profil ? <EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connecte-toi pour apparaître dans les classements." /> : <>
        <Rangee>{[['tous', 'Tous'], ['amis', 'Amis'], ['village', 'Mon village'], ['ethnie', 'Mon ethnie']].map(([id, l]) => <Puce key={id} label={l} actif={groupe === id} onPress={() => setGroupe(id)} />)}</Rangee>
        <Rangee>{[['jour', 'Aujourd\'hui'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['tout', 'Toujours']].map(([id, l]) => <Puce key={id} label={l} actif={portee === id} onPress={() => setPortee(id)} />)}</Rangee>
        {err ? <EtatVide icone="alerte" titre="Classement indisponible" texte="Réessaie quand tu auras du réseau." /> : !liste ? <Chargement /> : liste.length === 0 ? <EtatVide mascotte titre="Personne ici pour l'instant" texte="Joue une partie : tu seras le premier !" /> :
          liste.map(l => <Carte key={l.id} plat style={l.moi ? { borderColor: c.accent } : undefined}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}><T v="titre" style={{ width: 40 }} couleur={l.rang <= 3 ? c.modules.azeva : c.fort}>{l.rang}</T><View style={{ flex: 1 }}><T v="carte">{l.nom}{l.moi ? ' (moi)' : ''}</T><T v="petit">{l.tribu ?? ''} · {l.parties} partie{l.parties > 1 ? 's' : ''}</T></View><T v="carte" couleur={c.accent}>{l.points}</T></View></Carte>)}
      </>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ duel asynchrone (57) : même graine, trois manches
function DuelEcran({ retour, mots }: { retour: () => void; mots: Ligne[] }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [duel, setDuel] = useState<Duel | null>(null);
  const [manche, setManche] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [q, setQ] = useState<{ enonce: string; options: string[]; bonne: number }[]>([]);
  const construire = (seed: string) => {
    const h = hasardGraine(graineJour(seed)); const base = [...mots].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const tirage = melanger(base, h).slice(0, 3);
    return tirage.map(m => { const faux = melanger(base.filter(x => x.id !== m.id), h).slice(0, 3).map(x => String(x.myene)); const opts = melanger([String(m.myene), ...faux], h); return { enonce: `Comment dit-on « ${m.francais} » ?`, options: opts, bonne: opts.indexOf(String(m.myene)) }; });
  };
  if (!profil) return <Ecran><Entete titre="Duel" retour={retour} /><EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connecte-toi pour défier un ami." /></Ecran>;
  const demarrer = (d: Duel) => { if (mots.length < 4) { toast('Il faut au moins 4 mots dans « mots_jeux » pour un duel.', 'erreur'); return; } setDuel(d); setQ(construire(d.seed)); setManche(0); setScore(0); setChoisi(null); };
  if (duel && manche !== null && manche < 3 && q[manche]) {
    const k = q[manche];
    return (
      <Ecran>
        <Entete titre={`Manche ${manche + 1} / 3`} retour={() => { setManche(null); setDuel(null); }} /><Barre valeur={manche / 3} couleur={c.modules.azeva} />
        <T v="sousTitre">{k.enonce}</T>
        {k.options.map((o, i) => <Pressable key={i} accessibilityRole="button" disabled={choisi !== null} onPress={async () => { setChoisi(i); const s = score + (i === k.bonne ? 100 : 0); setScore(s); setTimeout(async () => { if (manche === 2) { try { setDuel(await jouerDuel(duel.id, s)); } catch (e) { toast((e as Error).message, 'erreur'); } } setManche(manche + 1); setChoisi(null); }, 900); }} style={{ minHeight: 56, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 2, backgroundColor: choisi !== null && i === k.bonne ? c.succes + '33' : choisi === i ? c.erreur + '33' : c.carte, borderColor: choisi !== null && i === k.bonne ? c.succes : choisi === i ? c.erreur : c.bord }}><T v="corps" fort>{o}</T></Pressable>)}
      </Ecran>
    );
  }
  if (duel && manche === 3) {
    const entries = Object.entries(duel.scores);
    return (
      <Ecran contenu={{ alignItems: 'center' }}>
        <Mascotte taille={110} humeur="content" /><T v="titre">Duel {duel.id}</T>
        {entries.map(([uid, s]) => <Carte key={uid} plat style={{ alignSelf: 'stretch' }}><View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between' }}><T v="carte">{duel.noms[uid] ?? 'Joueur'}{uid === profil.id ? ' (moi)' : ''}</T><T v="carte" couleur={c.accent}>{s}</T></View></Carte>)}
        {!duel.termine && <T v="corps" style={{ textAlign: 'center' }}>Ton score est enregistré. Envoie le code <T v="carte">{duel.id}</T> à ton ami : quand il aura joué, reviens ici pour voir qui gagne.</T>}
        <Bouton label="Partager le code" icone="partage" onPress={() => Share.share({ message: `Je te défie sur Nkala ! Ouvre Jouer > Duel et entre le code ${duel.id}.` }).catch(() => {})} />
        <Bouton label="Terminer" variante="fantome" onPress={() => { setDuel(null); setManche(null); }} />
      </Ecran>
    );
  }
  return (
    <Ecran>
      <Entete titre="Duel" sous="Trois manches, à ton rythme" retour={retour} />
      <Carte><View style={{ padding: 18, gap: 10 }}><T v="carte">Défier quelqu'un</T><T v="petit">Tu joues 3 manches, puis tu envoies le code. Ton ami joue les mêmes questions quand il veut.</T><Bouton label="Lancer un duel" icone="duel" variante="ambre" onPress={async () => { try { const r = await creerDuel(); demarrer({ id: r.id, seed: r.seed, createur: profil.id, scores: {}, noms: {}, termine: false }); } catch (e) { toast((e as Error).message, 'erreur'); } }} /></View></Carte>
      <Carte><View style={{ padding: 18, gap: 10 }}><T v="carte">Relever un défi</T><Champ valeur={code} onChange={setCode} placeholder="Code du duel" icone="duel" /><Bouton label="Jouer ce duel" variante="fantome" desactive={code.length < 4} onPress={async () => { try { const d = await lireDuel(code.trim()); if (d.scores[profil.id] !== undefined) { setDuel(d); setManche(3); } else demarrer(d); } catch (e) { toast((e as Error).message, 'erreur'); } }} /></View></Carte>
    </Ecran>
  );
}

// ------------------------------------------------------------------ collection (58)
function Collection({ retour, succes, avatars }: { retour: () => void; succes: Ligne[]; avatars: Ligne[] }) {
  const { c } = useTheme();
  const { donnees, rang } = useProgres();
  return (
    <Ecran bas={40}>
      <Entete titre="Collection" retour={retour} />
      <SectionTitre titre="Avatars" />
      <Rangee>{avatars.map(a => { const ouvert = rang.index + 1 >= num(a.rang_min) && (!a.succes_id || donnees.succes.includes(a.succes_id)); return (
        <View key={a.id} accessibilityLabel={`${a.nom}${ouvert ? '' : ', verrouillé'}`} style={{ alignItems: 'center', gap: 6, opacity: ouvert ? 1 : 0.45 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: a.couleur ?? c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.bordAmbre }}><Ic nom={ouvert ? 'profil' : 'verrou'} taille={30} couleur="#FDFAF7" /></View><T v="petit" fort>{a.nom}</T></View>); })}</Rangee>
      <SectionTitre titre="Succès" />
      {succes.map(s => { const fait = donnees.succes.includes(s.id); return (
        <Carte key={s.id} plat><View style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', opacity: fait ? 1 : 0.7 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: fait ? c.modules.azeva : c.squelette, alignItems: 'center', justifyContent: 'center' }}><Ic nom={fait ? 'coupe' : 'verrou'} taille={22} couleur={fait ? '#170D08' : c.discret} /></View>
          <View style={{ flex: 1 }}><T v="carte">{s.titre}</T><T v="petit">{s.description}</T></View>{fait && <Pastille label="Débloqué" couleur={c.succes} fond={c.carte} />}</View></Carte>); })}
    </Ecran>
  );
}
void Image; void jourLocal; void rangPourXp; void useCallback;
