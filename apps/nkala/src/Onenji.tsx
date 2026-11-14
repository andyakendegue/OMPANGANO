/**
 * Onenji (Apprendre), organisé en trois onglets sous la recherche (décision de Capp, 13 nov. 2026) :
 * Inenga (cours par étapes de la vie, test de niveau, révision, cours à distance à 4), Igolani (vidéothèque : tous les cours vidéo,
 * les artisans sont une catégorie) et Ezango (bibliothèque et dictionnaire). Kak'Igonjo accompagne les leçons. Contenus importés (JSON/CSV).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenCapture from 'expo-screen-capture';
import {
  accesChapitreVideo, accesCompletVideo, accesLecon, chargerExercices, demanderLicence, demanderKakIgonjo, ETAPES_UNITE, etapesCouvertes, filtrerVariante, finPartieGratuite, leconOuverte, motsDesExercices, peutAcceder,
  progressionUnite, resoudreMedia, uniteSuivante, VARIANTES_TRIBALES, type EtatLecon, type Exercice, type Lecon, type Ligne, type NiveauAcces, type Parcours, type Unite,
} from '@nkala/noyau';
import { texteAccueil, useAccueilKakIgonjo } from './Assistant';
import { useAuth } from './AuthProvider';
import { Bouton, Carte, Ecran, Entete, EtatVide, Feuille, Ic, Mascotte, Pastille, Rangee, SectionTitre, T, Visuel, Champ, Barre, Chargement, Puce, useToast } from './kit';
import { ajouterMesMots, Bibliotheque } from './Bibliotheque';
import { CoursDistance } from './CoursDistance';
import { useDroits } from './Droits';
import { ControleUnite, FinLecon, LeconRunner, libelleDialecte, TestNiveau } from './OnenjiLecon';
import { Certificat, MesCertificats } from './OnenjiCertificat';
import { FicheGrammaire, ListeGrammaire } from './OnenjiGrammaire';
import { supprimerUnite, telechargerUnite, useHorsLigne } from './OnenjiHorsLigne';
import { useErreurs, useTestNiveau } from './OnenjiEtat';
import { usePile } from './Pile';
import { usePrefs, useTheme } from './Prefs';
import { useProgres } from './Progres';
import { EmplacementPub, FilAvecPubs, PubEntreEcrans, useSansPublicite } from './Pub';
import { useContenus } from './useContenu';
import { Verrou } from './Verrou';

type E =
  | { t: 'hub' } | { t: 'parcours'; id: string } | { t: 'lecon'; lecon: Lecon; unite: Unite; parcours: Parcours }
  | { t: 'fin'; lecon: Lecon; res: EtatLecon; xp: number; parcoursId: string } | { t: 'controle'; unite: Unite; parcoursId: string }
  | { t: 'finUnite'; unite: Unite; bonnes: number; sur: number; valide: boolean; parcoursId: string } | { t: 'certificat'; parcours: Parcours }
  | { t: 'test' } | { t: 'resultatTest' } | { t: 'revision' } | { t: 'grammaire' } | { t: 'fiche'; id: string } | { t: 'certificats' }
  | { t: 'artisans' } | { t: 'cours'; id: string } | { t: 'video'; id: string; debut?: number } | { t: 'kakigonjo' } | { t: 'classe' } | { t: 'biblio' };

const num = (v: unknown) => Number(v) || 0;
const tri = <T extends Ligne>(l: T[]) => [...l].sort((a, b) => num(a.ordre) - num(b.ordre));

export function Onenji() {
  const pile = usePile<E>({ t: 'hub' });
  const { res: base, chargement: chargeBase } = useContenus(['parcours', 'unites', 'lecons', 'cours_artisans', 'chapitres', 'bibliotheque', 'opportunites', 'grammaire']);
  // Exercices : collection privée, servie selon les droits du compte (14 nov. 2026) ; rechargée quand le compte ou ses droits changent.
  const { profil } = useAuth();
  const droits = useDroits();
  const [exo, setExo] = useState<{ lignes: Ligne[]; pret: boolean }>({ lignes: [], pret: false });
  useEffect(() => {
    let annule = false;
    chargerExercices(profil?.id ?? null, true).then(r => { if (!annule) setExo({ lignes: r.lignes, pret: true }); }).catch(() => { if (!annule) setExo(e => ({ ...e, pret: true })); });
    return () => { annule = true; };
  }, [profil?.id, droits.abonneJusque, (droits.achats ?? []).length]); // eslint-disable-line react-hooks/exhaustive-deps
  const res = useMemo<Record<string, Ligne[]>>(() => ({ ...base, exercices: exo.lignes }), [base, exo.lignes]);
  const chargement = chargeBase || !exo.pret;
  const { prefs } = usePrefs();
  const enfant = prefs.mode === 'enfant';
  const D = useMemo(() => {
    const parcours = tri(res.parcours ?? []).filter(p => !enfant || num(p.cycle) <= 2) as unknown as Parcours[];
    // Variante de l'apprenant (ôrungu par défaut) : à chaque position d'une leçon, l'exercice de sa variante, sinon le commun.
    const exercices = filtrerVariante(tri(res.exercices ?? []) as unknown as Exercice[], prefs.variante || 'orungu');
    return { parcours, unites: tri(res.unites ?? []) as unknown as Unite[], lecons: tri(res.lecons ?? []).filter(l => !enfant || l.mode !== 'adulte') as unknown as Lecon[], exercices, cours: tri(res.cours_artisans ?? []), chapitres: tri(res.chapitres ?? []), biblio: res.bibliotheque ?? [], opportunites: res.opportunites ?? [], grammaire: tri(res.grammaire ?? []) };
  }, [res, enfant, prefs.variante]);
  const e = pile.ecran;
  if (chargement) return <Ecran><Chargement /></Ecran>;

  switch (e.t) {
    case 'parcours': return <ParcoursEcran id={e.id} D={D} pile={pile} />;
    case 'lecon': return <LeconFlux e={e} D={D} pile={pile} />;
    case 'fin': return <FinLecon lecon={e.lecon} resultat={e.res} xpGagne={e.xp} onSuite={() => pile.retour()} exercices={D.exercices.filter(x => x.lecon_id === e.lecon.id)} />;
    case 'grammaire': return <ListeGrammaire fiches={D.grammaire} retour={pile.retour} ouvrir={id => pile.pousser({ t: 'fiche', id })} />;
    case 'fiche': return <FicheGrammaire fiche={D.grammaire.find(f => f.id === e.id)} retour={pile.retour} />;
    case 'certificats': return <MesCertificats retour={pile.retour} ouvrir={id => { const p = D.parcours.find(x => x.id === id); if (p) pile.pousser({ t: 'certificat', parcours: p }); }} />;
    case 'test': return <TestFlux D={D} pile={pile} />;
    case 'resultatTest': return <ResultatTest D={D} pile={pile} />;
    case 'revision': return <Revision D={D} pile={pile} />;
    case 'controle': {
      const unite = D.unites.find(u => u.id === e.unite.id)!;
      const ids = D.lecons.filter(l => l.unite_id === unite.id).map(l => l.id);
      return <ControleFlux unite={unite} exercices={D.exercices.filter(x => ids.includes(x.lecon_id))} pile={pile} parcoursId={e.parcoursId} />;
    }
    case 'finUnite': {
      // Carte « unité suivante » (maquettes du 10 nov.) : elle ouvre directement sa première leçon.
      const suite = e.valide ? uniteSuivante(e.unite.id, D.parcours, D.unites) : null;
      const premiere = suite ? D.lecons.filter(l => l.unite_id === suite.unite.id)[0] : undefined;
      return (
        <Ecran contenu={{ alignItems: 'center' }}>
          <Mascotte taille={130} humeur={e.valide ? 'content' : 'triste'} />
          <T v="titre" style={{ textAlign: 'center' }}>{e.valide ? 'Unité validée !' : 'Pas encore'}</T>
          <T v="corps" style={{ textAlign: 'center' }}>{e.bonnes} bonne{e.bonnes > 1 ? 's' : ''} réponse{e.bonnes > 1 ? 's' : ''} sur {e.sur}. Il en faut 4 sur 5 pour valider « {e.unite.titre} ».</T>
          {!e.valide && <T v="petit" style={{ textAlign: 'center' }}>Reprends les leçons de l'unité, puis retente le contrôle quand tu veux. Rien n'est perdu.</T>}
          {suite && premiere && (
            <Carte accent={suite.parcours.couleur ?? undefined} style={{ alignSelf: 'stretch' }} label={`Unité suivante : ${suite.unite.titre}`}
              onPress={() => pile.remplacer({ t: 'lecon', lecon: premiere, unite: suite.unite, parcours: suite.parcours })}>
              <View style={{ padding: 16, gap: 4 }}><T v="libelle">Unité suivante</T><T v="sousTitre">{suite.unite.titre}</T><T v="petit">{suite.parcours.titre} · {premiere.titre}</T></View>
            </Carte>
          )}
          <Bouton label={e.valide ? (suite ? 'Plus tard' : 'Continuer') : 'Revoir les leçons'} variante={suite ? 'fantome' : 'brique'} onPress={() => pile.retour()} />
        </Ecran>
      );
    }
    case 'certificat': return <Certificat parcours={e.parcours} onFermer={pile.retour} />;
    case 'artisans': return <Videotheque D={D} pile={pile} entete={<Entete titre="Igolani" sous="La vidéothèque" retour={pile.retour} />} />;
    case 'cours': return <FicheCours id={e.id} D={D} pile={pile} />;
    case 'video': return <LecteurVideo id={e.id} debut={e.debut} D={D} pile={pile} />;
    case 'kakigonjo': return <KakIgonjoChat retour={pile.retour} />;
    case 'classe': return <CoursDistance retour={pile.retour} />;
    case 'biblio': return <Bibliotheque retour={pile.retour} />;
    default: return <Hub D={D} pile={pile} />;
  }
}
type Donnees = { parcours: Parcours[]; unites: Unite[]; lecons: Lecon[]; exercices: Exercice[]; cours: Ligne[]; chapitres: Ligne[]; biblio: Ligne[]; opportunites: Ligne[]; grammaire: Ligne[] };
type Pile = ReturnType<typeof usePile<E>>;

// ------------------------------------------------------------------ accueil : trois onglets sous la recherche (31)
type SousOnglet = 'inenga' | 'igolani' | 'ezango';
const SOUS_ONGLETS: { id: SousOnglet; label: string; sous: string; icone: string }[] = [
  { id: 'inenga', label: 'Inenga', sous: 'Cours', icone: 'apprendre' },
  { id: 'igolani', label: 'Igolani', sous: 'Vidéothèque', icone: 'video' },
  { id: 'ezango', label: 'Ezango', sous: 'Bibliothèque', icone: 'livre' },
];
/** Dernier onglet ouvert, gardé tant que l'application tourne. */
let dernierSousOnglet: SousOnglet = 'inenga';

function OngletsApprendre({ actif, choisir }: { actif: SousOnglet; choisir: (o: SousOnglet) => void }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6, padding: 4, borderRadius: 16, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}>
      {SOUS_ONGLETS.map(o => {
        const on = o.id === actif;
        return (
          <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${o.label}, ${o.sous}`} onPress={() => choisir(o.id)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: on ? c.accent : 'transparent' }}>
            <T v="carte" couleur={on ? c.surAccent : c.fort} style={{ fontStyle: 'italic' }}>{o.label}</T>
            <T v="petit" couleur={on ? c.surAccent : c.discret}>{o.sous}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Hub({ D, pile }: { D: Donnees; pile: Pile }) {
  const [onglet, setOnglet] = useState<SousOnglet>(dernierSousOnglet);
  const { xp, rang, donnees } = useProgres();
  const { c } = useTheme();
  const choisir = (o: SousOnglet) => { dernierSousOnglet = o; setOnglet(o); };
  // En-tête commun : titre et recherche, puis les trois onglets juste dessous.
  const entete = <>
    <Entete titre="Apprendre" sous={`${rang.rang.nom} · ${xp} XP`} droite={<Pastille label={`🔥 ${donnees.serie ?? 0}`} couleur={c.accent} fond={c.carte} />} />
    <OngletsApprendre actif={onglet} choisir={choisir} />
  </>;
  if (onglet === 'ezango') return <Bibliotheque retour={() => choisir('inenga')} entete={entete} />;
  if (onglet === 'igolani') return <Videotheque D={D} pile={pile} entete={entete} />;
  return <Inenga D={D} pile={pile} entete={entete} />;
}

/** Inenga : test de niveau, reprise, étapes de la vie, révision des erreurs, cours à distance. */
function Inenga({ D, pile, entete }: { D: Donnees; pile: Pile; entete: React.ReactNode }) {
  const { c } = useTheme();
  const { donnees } = useProgres();
  const { prefs } = usePrefs();
  const test = useTestNiveau();
  const { ids: erreurs } = useErreurs();
  const enfant = prefs.mode === 'enfant';
  // Dans l'ordre du cursus : étape, puis unité, puis leçon (la colonne « ordre » des leçons ne vaut qu'à l'intérieur d'une unité).
  const rangUnite = new Map<string, number>(); let r = 0;
  for (const p of D.parcours) for (const u of D.unites.filter(x => x.parcours_id === p.id)) rangUnite.set(u.id, r++);
  const ouvertes = D.lecons.filter(l => !donnees.leconsTerminees[l.id] && rangUnite.has(l.unite_id)).sort((a, b) => (rangUnite.get(a.unite_id)! - rangUnite.get(b.unite_id)!) || (num(a.ordre) - num(b.ordre)));
  const prochaine = ouvertes.find(l => leconOuverte(D.lecons.filter(x => x.unite_id === l.unite_id), l.id, donnees));
  const uniteDe = (l: Lecon) => D.unites.find(u => u.id === l.unite_id);
  const parcoursDe = (l: Lecon) => D.parcours.find(p => p.id === uniteDe(l)?.parcours_id);
  const aRevoir = D.exercices.filter(x => erreurs.includes(x.id));
  const depart = test.resultat ? D.parcours.find(p => p.id === test.resultat!.parcoursId) : undefined;
  const [choixVariante, setChoixVariante] = useState(false);
  return (
    <Ecran bas={90}>
      {entete}
      {test.pret && !test.resultat && (
        <Carte accent={c.accent} onPress={() => pile.pousser({ t: 'test' })} label="Passer le test de niveau"><View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16 }}>
          <Mascotte taille={64} humeur="parle" />
          <View style={{ flex: 1, gap: 4 }}><T v="libelle">Avant ton premier cours</T><T v="sousTitre">{enfant ? 'On choisit ton étape' : 'Passe le test de niveau'}</T><T v="petit">{enfant ? 'Selon ton âge.' : 'Gratuit, quelques minutes. Il te dit par où commencer.'}</T></View>
        </View></Carte>
      )}
      {test.resultat && prochaine && uniteDe(prochaine) && parcoursDe(prochaine) && (
        <Carte accent={parcoursDe(prochaine)?.couleur ?? c.modules.onenji} onPress={() => pile.pousser({ t: 'lecon', lecon: prochaine, unite: uniteDe(prochaine)!, parcours: parcoursDe(prochaine)! })} label="Reprendre la leçon">
          <View style={{ padding: 18, gap: 8 }}>
            <T v="libelle">{enfant ? 'Continue' : 'Reprendre là où tu en étais'}</T>
            <T v="sousTitre">{prochaine.titre}</T>
            <T v="petit">{parcoursDe(prochaine)?.titre} · {uniteDe(prochaine)?.titre}</T>
            <Bouton label="C'est parti" variante="ambre" petit large={false} icone="lecture" onPress={() => pile.pousser({ t: 'lecon', lecon: prochaine, unite: uniteDe(prochaine)!, parcours: parcoursDe(prochaine)! })} />
          </View>
        </Carte>
      )}
      <SectionTitre titre="Les étapes de la vie" />
      {D.parcours.length === 0 ? <EtatVide mascotte titre="Bientôt des parcours" texte="Les premiers parcours arrivent. Reviens vite !" /> :
        <Rangee>{D.parcours.map(p => {
          const unites = D.unites.filter(u => u.parcours_id === p.id);
          const lecons = D.lecons.filter(l => unites.some(u => u.id === l.unite_id));
          const fait = lecons.filter(l => donnees.leconsTerminees[l.id]).length;
          return (
            <Carte key={p.id} accent={p.couleur ?? undefined} onPress={() => pile.pousser({ t: 'parcours', id: p.id })} label={`Parcours ${p.titre}${depart?.id === p.id ? ', ton point de départ' : ''}`} style={{ width: 170 }}>
              <View style={{ padding: 16, gap: 8, minHeight: 150 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.couleur ?? c.accent, alignItems: 'center', justifyContent: 'center' }}><Ic nom="apprendre" taille={22} couleur="#FDFAF7" /></View>
                <T v="sousTitre" style={{ fontStyle: 'italic' }}>{p.titre}</T>
                {depart?.id === p.id && <Pastille label="Ton point de départ" couleur={c.succes} fond={c.carte} />}
                <T v="petit" numberOfLines={2}>{p.description || `${lecons.length} leçons`}</T>
                <Barre valeur={lecons.length ? fait / lecons.length : 0} couleur={p.couleur ?? undefined} />
              </View>
            </Carte>
          );
        })}</Rangee>}
      {aRevoir.length > 0 && (
        <Carte onPress={() => pile.pousser({ t: 'revision' })} label={`Revoir mes erreurs, ${aRevoir.length}`}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
          <Ic nom="coupe" taille={26} couleur={c.accent} /><View style={{ flex: 1 }}><T v="carte">Revoir mes erreurs</T><T v="petit">{aRevoir.length} exercice{aRevoir.length > 1 ? 's' : ''} à reprendre. Une bonne réponse l'efface.</T></View><Ic nom="suivant" taille={18} couleur={c.discret} />
        </View></Carte>
      )}
      {test.resultat && !enfant && test.peutRepasser && <Pressable accessibilityRole="button" onPress={() => pile.pousser({ t: 'test' })}><T v="petit" style={{ textDecorationLine: 'underline' }}>Repasser le test de niveau</T></Pressable>}
      {!enfant && <>
        <EmplacementPub zone="bandeau_apprendre" />
        <SectionTitre titre="Cours à distance" />
        <Carte onPress={() => pile.pousser({ t: 'classe' })} label="Cours à distance"><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
          <Ic nom="video" taille={26} couleur={c.accent} /><View style={{ flex: 1 }}><T v="carte">Rejoindre ou créer une salle</T><T v="petit">Avec un enseignant, 4 personnes au plus. Image et son d'appareil à appareil.</T></View><Ic nom="suivant" taille={18} couleur={c.discret} />
        </View></Carte>
      </>}
      <SectionTitre titre="Mes outils" />
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Outil icone="grammaire" titre="Grammaire" sous={`${D.grammaire.length} fiche${D.grammaire.length > 1 ? 's' : ''}`} onPress={() => pile.pousser({ t: 'grammaire' })} />
        {!enfant && <Outil icone="diplome" titre="Certificats" sous="Numérotés" onPress={() => pile.pousser({ t: 'certificats' })} />}
        {!enfant && <Outil icone="langue" titre="Ma variante" sous={libelleDialecte(prefs.variante || 'orungu')} onPress={() => setChoixVariante(true)} />}
      </View>
      <ChoixVariante visible={choixVariante} onClose={() => setChoixVariante(false)} />
    </Ecran>
  );
}

function Outil({ icone, titre, sous, onPress }: { icone: string; titre: string; sous: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Carte onPress={onPress} plat label={titre} style={{ flexGrow: 1, flexBasis: '30%', minWidth: 100 }}>
      <View style={{ padding: 14, gap: 4 }}><Ic nom={icone} taille={22} couleur={c.accent} /><T v="carte" numberOfLines={1}>{titre}</T><T v="petit" numberOfLines={1}>{sous}</T></View>
    </Carte>
  );
}

/** Choix de la variante des cours (audit §8.3) : ôrungu par défaut ; un exercice sans version dans la variante choisie reste en version commune. */
function ChoixVariante({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { prefs, regler } = usePrefs();
  const actuelle = prefs.variante || 'orungu';
  const liste: [string, string][] = [['orungu', 'Ôrungu (par défaut)'], ...VARIANTES_TRIBALES.filter(([k]) => k !== 'orungu').map(([k, l]) => [k, l.replace(/^Ethnie /, '')] as [string, string])];
  return (
    <Feuille visible={visible} onClose={onClose} titre="Ma variante">
      <T v="petit">Les leçons montrent les mots de ta variante quand ils existent ; sinon la forme commune, puis l'ôrungu. Chaque mot affiche son dialecte et sa source.</T>
      <View style={{ gap: 8, marginTop: 10 }}>
        {liste.map(([k, l]) => <Puce key={k} label={l} actif={actuelle === k} onPress={() => { regler({ variante: k }); onClose(); }} />)}
      </View>
    </Feuille>
  );
}

function TestFlux({ D, pile }: { D: Donnees; pile: Pile }) {
  const { enregistrer } = useTestNiveau();
  return <TestNiveau parcours={D.parcours} unites={D.unites} lecons={D.lecons} exercices={D.exercices} onQuitter={pile.retour}
    onFini={async r => { await enregistrer({ ...r, le: Date.now() }); pile.remplacer({ t: 'resultatTest' }); }} />;
}
function ResultatTest({ D, pile }: { D: Donnees; pile: Pile }) {
  const { resultat } = useTestNiveau();
  const p = D.parcours.find(x => x.id === resultat?.parcoursId);
  const u = D.unites.find(x => x.id === resultat?.uniteId);
  return (
    <Ecran contenu={{ alignItems: 'center' }}>
      <Mascotte taille={130} humeur="content" />
      <T v="titre" style={{ textAlign: 'center' }}>Ton point de départ</T>
      <T v="sousTitre" style={{ textAlign: 'center', fontStyle: 'italic' }}>{p?.titre ?? 'Première étape'}{u ? ` · ${u.titre}` : ''}</T>
      {!!resultat?.sur && <T v="corps" style={{ textAlign: 'center' }}>{resultat.bonnes} bonne{resultat.bonnes > 1 ? 's' : ''} réponse{resultat.bonnes > 1 ? 's' : ''} sur {resultat.sur}. Les étapes d'avant restent ouvertes si tu veux réviser.</T>}
      <Bouton label="Commencer" variante="ambre" onPress={() => (p ? pile.remplacer({ t: 'parcours', id: p.id }) : pile.retour())} />
    </Ecran>
  );
}
function Revision({ D, pile }: { D: Donnees; pile: Pile }) {
  const { ids } = useErreurs();
  const [liste] = useState(() => D.exercices.filter(x => ids.includes(x.id)).slice(0, 10));
  return <LeconRunner titre="Revoir mes erreurs" exercices={liste} onQuitter={pile.retour} onFin={() => pile.retour()} />;
}

// ------------------------------------------------------------------ parcours qui serpente (32)
function ParcoursEcran({ id, D, pile }: { id: string; D: Donnees; pile: Pile }) {
  const { c } = useTheme();
  const toast = useToast();
  const { donnees } = useProgres();
  const test = useTestNiveau();
  const p = D.parcours.find(x => x.id === id);
  if (!p) return <Ecran><Entete titre="Parcours introuvable" retour={pile.retour} /></Ecran>;
  const unites = D.unites.filter(u => u.parcours_id === id);
  const couleur = p.couleur ?? c.accent;
  const toutesValidees = unites.length > 0 && unites.every(u => donnees.unitesValidees.includes(u.id));
  let n = 0;
  return (
    <Ecran bas={40}>
      <Entete titre={p.titre} sous={p.description ?? undefined} retour={pile.retour} />
      {unites.length === 0 && <EtatVide mascotte titre="Parcours en préparation" texte="Les unités arrivent bientôt." />}
      {unites.map(u => {
        const lecons = D.lecons.filter(l => l.unite_id === u.id);
        const toutes = lecons.length > 0 && lecons.every(l => donnees.leconsTerminees[l.id]);
        const valide = donnees.unitesValidees.includes(u.id);
        return (
          <View key={u.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><T v="sousTitre">{u.titre}</T>
              <View style={{ flexDirection: 'row', gap: 6 }}>{test.resultat?.uniteId === u.id && <Pastille label="Départ" couleur={c.accent} fond={c.carte} />}{lecons.length > 0 && accesLecon(lecons[0], u, unites) !== 'libre' && <Pastille label="Forfait" couleur={c.discret} fond={c.carte} />}{valide && <Pastille label="Validée" couleur={c.succes} fond={c.carte} />}</View></View>
            <Barre valeur={progressionUnite(lecons, donnees)} couleur={couleur} />
            <OutilsUnite unite={u} lecons={lecons} D={D} pile={pile} libre={lecons.length > 0 && accesLecon(lecons[0], u, unites) === 'libre'} />
            <View style={{ alignItems: 'center', gap: 16, paddingVertical: 12 }}>
              {lecons.map(l => {
                const fait = !!donnees.leconsTerminees[l.id], ouvert = leconOuverte(lecons, l.id, donnees), decalage = Math.sin(n++ * 1.1) * 56;
                return (
                  <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={`${l.titre}${fait ? ', terminée' : ouvert ? '' : ', verrouillée'}`} onPress={() => (ouvert ? pile.pousser({ t: 'lecon', lecon: l, unite: u, parcours: p }) : toast('Termine la leçon précédente.', 'info'))}
                    style={{ transform: [{ translateX: decalage }], alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: fait ? couleur : ouvert ? c.carte : c.squelette, borderWidth: 3, borderColor: ouvert || fait ? couleur : c.bord }}>
                      <Ic nom={fait ? 'ok' : ouvert ? 'lecture' : 'verrou'} taille={28} couleur={fait ? '#FDFAF7' : ouvert ? couleur : c.discret} />
                    </View>
                    <T v="petit" fort numberOfLines={1} style={{ maxWidth: 150, textAlign: 'center' }}>{l.titre}</T>
                  </Pressable>
                );
              })}
              <Bouton label={valide ? 'Refaire le contrôle' : 'Contrôle de fin d\'unité'} icone="coupe" variante={toutes ? 'ambre' : 'fantome'} petit large={false} desactive={!toutes} onPress={() => pile.pousser({ t: 'controle', unite: u, parcoursId: id })} />
            </View>
          </View>
        );
      })}
      {toutesValidees && <Bouton label="Mon certificat" icone="diplome" variante="ambre" onPress={() => pile.pousser({ t: 'certificat', parcours: p })} />}
    </Ecran>
  );
}

/** Sous le titre d'une unité : étapes du programme couvertes, fiche de grammaire, téléchargement pour le hors ligne. */
function OutilsUnite({ unite, lecons, D, pile, libre }: { unite: Unite; lecons: Lecon[]; D: Donnees; pile: Pile; libre: boolean }) {
  const { c } = useTheme();
  const toast = useToast();
  const droits = useDroits();
  const hl = useHorsLigne();
  const [charge, setCharge] = useState<string | null>(null);
  const ids = new Set(lecons.map(l => l.id));
  const ex = D.exercices.filter(x => ids.has(x.lecon_id));
  const couvertes = etapesCouvertes(ex);
  const fiches = D.grammaire.filter(f => f.unite_id === unite.id);
  const telecharge = !!hl.unites[unite.id];
  const permis = libre || peutAcceder({ id: unite.id, acces: 'abonnement' }, droits).ok;
  return (
    <View style={{ gap: 6 }}>
      {ex.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }} accessibilityLabel={`Étapes : ${ETAPES_UNITE.filter(x => couvertes.has(x.id)).map(x => x.label).join(', ')}`}>
        {ETAPES_UNITE.map(x => <View key={x.id} style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: couvertes.has(x.id) ? c.accent : c.bord, opacity: couvertes.has(x.id) ? 1 : 0.45 }}><T v="petit" style={{ fontSize: 11 }}>{x.label}</T></View>)}
      </View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {fiches.map(f => <Puce key={f.id} label={`Grammaire · ${f.titre}`} icone="grammaire" onPress={() => pile.pousser({ t: 'fiche', id: f.id })} />)}
        {hl.possible && ex.length > 0 && permis && <Puce label={charge ?? (telecharge ? 'Hors ligne ✓' : 'Télécharger')} icone={telecharge ? 'ok' : 'telecharger'} actif={telecharge}
          onPress={async () => {
            if (charge) return;
            if (telecharge) { const autres = D.exercices.filter(x => !ids.has(x.lecon_id) && D.lecons.some(l => l.id === x.lecon_id && hl.unites[l.unite_id])); await supprimerUnite(unite.id, ex, autres); toast('Unité retirée du téléphone.'); return; }
            setCharge('0 %');
            const r = await telechargerUnite(unite.id, ex, (f, t) => setCharge(`${Math.round((f / Math.max(1, t)) * 100)} %`)).catch(() => null);
            setCharge(null);
            toast(!r ? 'Téléchargement impossible.' : r.echecs ? `${r.total - r.echecs} fichier(s) sur ${r.total} : réessaie avec du réseau.` : 'Unité disponible hors ligne.', r && !r.echecs ? 'succes' : 'info');
          }} />}
      </View>
    </View>
  );
}

function LeconFlux({ e, D, pile }: { e: Extract<E, { t: 'lecon' }>; D: Donnees; pile: Pile }) {
  const { terminerLecon } = useProgres();
  const test = useTestNiveau();
  const ex = D.exercices.filter(x => x.lecon_id === e.lecon.id);
  // Le test de niveau passe avant le premier cours (décision de Capp, 13 nov. 2026).
  if (test.pret && !test.resultat) return (
    <Ecran contenu={{ alignItems: 'center' }}>
      <Entete titre={e.lecon.titre} retour={pile.retour} recherche={false} />
      <Mascotte taille={110} humeur="parle" />
      <T v="sousTitre" style={{ textAlign: 'center' }}>D'abord, le test de niveau</T>
      <T v="corps" style={{ textAlign: 'center' }}>Il est gratuit et ne prend que quelques minutes. Il te dit par où commencer.</T>
      <Bouton label="Passer le test" variante="ambre" onPress={() => pile.remplacer({ t: 'test' })} />
    </Ecran>
  );
  // Accès : colonne « niveau_acces » de la leçon, sinon première unité de chaque étape gratuite et le reste au forfait (une formule citée dans « plans » l'ouvre aussi).
  const acces = accesLecon(e.lecon, e.unite, D.unites.filter(u => u.parcours_id === e.parcours.id)) as NiveauAcces;
  return (
    <Verrou contenu={{ id: e.lecon.id, acces, roles: ['admin', 'validator'] }} regle={e.lecon as unknown as Record<string, any>}>
      <LeconRunner titre={e.lecon.titre} exercices={ex} onQuitter={pile.retour} onFin={async res => {
        const r = await terminerLecon(e.lecon, res.bonnes, res.erreurs);
        // « Mes mots » nourri par les leçons : les mots de la leçon rejoignent le carnet (sans doublon).
        ajouterMesMots(motsDesExercices(ex), `Leçon · ${e.lecon.titre}`).catch(() => 0);
        pile.remplacer({ t: 'fin', lecon: e.lecon, res, xp: r.xpGagne, parcoursId: e.parcours.id });
      }} />
    </Verrou>
  );
}
function ControleFlux({ unite, exercices, pile, parcoursId }: { unite: Unite; exercices: Exercice[]; pile: Pile; parcoursId: string }) {
  const { validerUnite } = useProgres();
  return <ControleUnite unite={unite} exercices={exercices} onQuitter={pile.retour} onFin={async (b, s) => { const r = await validerUnite(unite.id, b, s); pile.remplacer({ t: 'finUnite', unite, bonnes: b, sur: s, valide: r.valide, parcoursId }); }} />;
}
// ------------------------------------------------------------------ Igolani : la vidéothèque (41-43)
/** Tous les cours vidéo (collection « cours_artisans ») rangés par catégorie ; les artisans ne sont qu'une catégorie. */
function Videotheque({ D, pile, entete }: { D: Donnees; pile: Pile; entete: React.ReactNode }) {
  const { prefs } = usePrefs();
  const [cat, setCat] = useState<string | null>(null);
  const categorieDe = (k: Ligne) => String(k.categorie || (k.artisan ? 'Artisans' : '') || 'Autres');
  const visibles = D.cours.filter(k => prefs.mode !== 'enfant' || !k.niveau || k.niveau === 'debutant');
  const categories = [...new Set(visibles.map(categorieDe))];
  const liste = visibles.filter(k => !cat || categorieDe(k) === cat);
  return (
    <Ecran bas={90}>
      {entete}
      <EmplacementPub zone="bandeau_apprendre" />
      {categories.length > 1 && <Rangee>{[<Puce key="t" label="Tout" actif={!cat} onPress={() => setCat(null)} />, ...categories.map(m => <Puce key={m} label={m} actif={cat === m} onPress={() => setCat(m)} />)]}</Rangee>}
      {liste.length === 0 ? <EtatVide mascotte titre="Bientôt des vidéos" texte="Les premiers cours vidéo arrivent." /> :
        <FilAvecPubs items={liste} zone="bandeau_apprendre" cle={k => k.id} rendu={k => <Carte onPress={() => pile.pousser({ t: 'cours', id: k.id })} label={k.titre}>
          <Visuel uri={k.image} hauteur={150} largeur="100%" rayon={0} icone="video" />
          <View style={{ padding: 14, gap: 4 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T v="carte" style={{ flex: 1 }}>{k.titre}</T>{k.niveau_acces && k.niveau_acces !== 'libre' && <Ic nom="verrou" taille={16} />}</View>
            <T v="petit">{categorieDe(k)}{k.artisan ? ` · ${k.artisan}` : ''}{num(k.duree_min) ? ` · ${k.duree_min} min` : ''}</T></View>
        </Carte>} />}
    </Ecran>
  );
}

/** Durée lisible (secondes). */
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/**
 * Fiche d'une vidéo (décision du 13 nov. 2026) : réglage vidéo par vidéo (« niveau_acces » de la vidéo ou du chapitre) ;
 * sinon 1er chapitre gratuit avec publicité, la suite au forfait, à l'achat pour un cours d'artisan long.
 */
function FicheCours({ id, D, pile }: { id: string; D: Donnees; pile: Pile }) {
  const { c } = useTheme();
  const droits = useDroits();
  const k = D.cours.find(x => x.id === id);
  if (!k) return <Ecran><Entete titre="Cours introuvable" retour={pile.retour} /></Ecran>;
  const chapitres = D.chapitres.filter(x => x.cours_id === id);
  const complet = accesCompletVideo(k as any, chapitres as any);
  const toutOuvert = peutAcceder({ id, acces: complet, roles: ['admin', 'validator'] }, droits).ok;
  const dispo = !!(k.video || k.video_url || k.protege);
  const { profil } = useAuth();
  const gratuitJusque = finPartieGratuite(k as any, chapitres as any);
  return (
    <Ecran bas={40}>
      <Entete titre={k.titre} sous={k.artisan} retour={pile.retour} />
      <Visuel uri={k.image} hauteur={180} largeur="100%" icone="video" />
      <T v="corps">{k.description}</T>
      {!toutOuvert && gratuitJusque !== 0 && <T v="petit" couleur={c.accent}>{gratuitJusque === null ? 'Gratuit, avec publicité.' : `Le début est gratuit (avec publicité) ; la suite ${complet === 'achat' ? 's\'achète' : 'est au forfait'}.`}</T>}
      {!profil && dispo && <EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connecte-toi pour regarder les vidéos d'Igolani (le début reste gratuit)." />}
      {!!profil && (toutOuvert || gratuitJusque !== 0) && <Bouton label={dispo ? (toutOuvert ? 'Regarder le cours' : 'Regarder le début gratuit') : 'Vidéo bientôt disponible'} icone="lecture" desactive={!dispo} onPress={() => pile.pousser({ t: 'video', id })} />}
      {chapitres.length > 0 && <><SectionTitre titre="Chapitres" />{chapitres.map((ch, i) => {
        const a = accesChapitreVideo(k as any, chapitres as any, i);
        const ouvert = toutOuvert || peutAcceder({ id: ch.id, acces: a, roles: ['admin', 'validator'] }, droits).ok;
        return (
          <Carte key={ch.id} plat onPress={() => (dispo && ouvert && profil ? pile.pousser({ t: 'video', id, debut: num(ch.debut_s) }) : undefined)} label={`${ch.titre}${ouvert ? '' : ', réservé'}`}>
            <View style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <T v="carte" style={{ width: 28 }}>{num(ch.ordre) || i + 1}</T><T v="corps" style={{ flex: 1 }} fort>{ch.titre}</T>
              {a === 'gratuit_avec_pub' && !toutOuvert && <Pastille label="Gratuit" couleur={c.succes} fond={c.carte} />}
              {!ouvert && <Ic nom="verrou" taille={16} couleur={c.discret} />}
              <T v="petit">{mmss(num(ch.debut_s))}</T>
            </View>
          </Carte>
        );
      })}</>}
      {!toutOuvert && <Verrou contenu={{ id, acces: complet, roles: ['admin', 'validator'] }} regle={k}><View /></Verrou>}
    </Ecran>
  );
}

/**
 * Lecteur vidéo : chapitres, filigrane portant l'empreinte du compte, enregistrement d'écran interdit pour les cours protégés.
 * Partie gratuite : publicité avant la lecture, puis arrêt au début du premier chapitre réservé (limite donnée par la licence du serveur).
 */
function LecteurVideo({ id, debut, D, pile }: { id: string; debut?: number; D: Donnees; pile: Pile }) {
  const k = D.cours.find(x => x.id === id)!;
  const { c } = useTheme();
  const { profil } = useAuth();
  const droits = useDroits();
  const chapitres = D.chapitres.filter(x => x.cours_id === id);
  const complet = accesCompletVideo(k as any, chapitres as any);
  const toutOuvert = peutAcceder({ id, acces: complet, roles: ['admin', 'validator'] }, droits).ok;
  const [source, setSource] = useState<string | null>(null);
  const [filigrane, setFiligrane] = useState((profil?.id ?? 'invité').slice(-8));
  const [refus, setRefus] = useState<string | null>(null);
  const [limite, setLimite] = useState<number | null>(toutOuvert ? null : finPartieGratuite(k as any, chapitres as any));
  const [avecPub, setAvecPub] = useState(!toutOuvert);
  const [finGratuite, setFinGratuite] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 40 });
  const protege = !!k.protege || complet !== 'libre';
  useSansPublicite(!avecPub);
  useEffect(() => {
    (async () => {
      try {
        // Compte obligatoire (décision de Capp, 14 nov. 2026) : l'adresse de la vidéo n'arrive qu'avec la licence du serveur.
        if (!profil) { setRefus('compte'); return; }
        const l = await demanderLicence('cours_artisans', id);
        setFiligrane(l.filigrane); setAvecPub(l.avecPub); setLimite(l.limiteS ?? null);
        if (l.urlHls) { setSource(l.urlHls); return; }
        const adresse = l.videoUrl || k.video_url;
        if (!adresse) { setRefus('indisponible'); return; }
        setSource(/^https?:\/\//.test(adresse) ? adresse : await resoudreMedia(adresse));
      } catch (e) { setRefus((e as { status?: number }).status === 402 ? 'reserve' : 'indisponible'); }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setPos({ x: 10 + Math.random() * 60, y: 10 + Math.random() * 70 }), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { if (Platform.OS === 'web' || !protege) return; ScreenCapture.preventScreenCaptureAsync('video').catch(() => {}); return () => { ScreenCapture.allowScreenCaptureAsync('video').catch(() => {}); }; }, [protege]);
  const debutSur = limite !== null && debut ? Math.min(debut, Math.max(0, limite - 1)) : debut;
  const player = useVideoPlayer(source ? { uri: source } : null, p => { p.timeUpdateEventInterval = 1; if (debutSur) p.currentTime = debutSur; p.play(); });
  // Arrêt à la fin de la partie gratuite.
  useEffect(() => {
    if (limite === null || !source) return;
    const sub = player.addListener('timeUpdate', ({ currentTime }: { currentTime: number }) => { if (currentTime >= limite) { try { player.pause(); player.currentTime = Math.max(0, limite - 0.5); } catch { /* */ } setFinGratuite(true); } });
    return () => sub.remove();
  }, [player, limite, source]);
  const motifs: Record<string, string> = { reserve: 'Ce cours est réservé : passe à un forfait ou achète-le.', compte: 'Connecte-toi pour regarder ce cours.', indisponible: 'La vidéo est indisponible pour le moment.' };
  return (
    <Ecran bas={30}>
      <Entete titre={k.titre} sous={k.artisan} retour={pile.retour} />
      {avecPub && source && <PubEntreEcrans zone="video_igolani" toujours />}
      {refus ? <EtatVide icone="verrou" titre="Lecture impossible" texte={motifs[refus] ?? motifs.indisponible} /> : (
        <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 16 / 9 }}>
          {source ? <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls allowsFullscreen allowsPictureInPicture={false} /> : <EtatVide icone="video" titre="Chargement…" />}
          <View pointerEvents="none" style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%` }}><T v="petit" couleur="rgba(255,255,255,0.35)">{filigrane}</T></View>
        </View>
      )}
      {limite !== null && limite > 0 && !refus && <T v="petit" couleur={c.accent}>Partie gratuite jusqu'à {mmss(limite)}.</T>}
      {finGratuite && <Verrou contenu={{ id, acces: complet, roles: ['admin', 'validator'] }} regle={k}><View /></Verrou>}
      {chapitres.map((ch, i) => {
        const bloque = limite !== null && num(ch.debut_s) >= limite;
        return (
          <Pressable key={ch.id} accessibilityRole="button" accessibilityLabel={`${ch.titre}${bloque ? ', réservé' : ''}`} disabled={bloque} onPress={() => { try { player.currentTime = num(ch.debut_s); player.play(); } catch { /* */ } }}
            style={{ padding: 12, borderRadius: 12, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: bloque ? 0.55 : 1 }}>
            <T v="corps" fort style={{ flex: 1 }}>{num(ch.ordre) || i + 1}. {ch.titre}</T>{bloque && <Ic nom="verrou" taille={16} couleur={c.discret} />}<T v="petit">{mmss(num(ch.debut_s))}</T>
          </Pressable>
        );
      })}
      <T v="petit">Sous-titres omyènè et français : selon les fichiers fournis avec le cours.</T>
    </Ecran>
  );
}

// ------------------------------------------------------------------ Kak'Igonjo (44)
type Bulle = { role: 'user' | 'assistant'; content: string; accueil?: boolean };
function KakIgonjoChat({ retour }: { retour: () => void }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const modeleAccueil = useAccueilKakIgonjo();
  const [bulles, setBulles] = useState<Bulle[]>([{ role: 'assistant', content: '', accueil: true }]);
  const [texte, setTexte] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [conv, setConv] = useState<string | undefined>();
  const [quota, setQuota] = useState<{ restantJour: number; alerte: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useSansPublicite(true);
  const envoyer = async () => {
    const m = texte.trim(); if (!m || occupe) return;
    setTexte(''); setErreur(null); setOccupe(true);
    const hist = bulles.slice(1);
    setBulles(b => [...b, { role: 'user', content: m }]);
    try { const r = await demanderKakIgonjo(m, conv, hist); setConv(r.conversationId); setQuota(r.quota); setBulles(b => [...b, { role: 'assistant', content: r.reponse }]); }
    catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };
  return (
    <Ecran bas={30}>
      <Entete titre="Kak'Igonjo" sous="Le vieux sage du village" retour={retour} />
      {!profil && <EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connecte-toi pour parler à Kak'Igonjo." />}
      {profil && <>
        {bulles.map((b, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, justifyContent: b.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {b.role === 'assistant' && <Mascotte taille={36} humeur="parle" />}
            <View style={{ maxWidth: '82%', padding: 12, borderRadius: 18, backgroundColor: b.role === 'user' ? c.accent : c.carte, borderWidth: b.role === 'user' ? 0 : 1, borderColor: c.bord }}><T v="corps" couleur={b.role === 'user' ? c.surAccent : c.texte}>{b.accueil ? texteAccueil(modeleAccueil, profil?.displayName || profil?.fullName) : b.content}</T></View>
          </View>
        ))}
        {occupe && <T v="petit">Kak'Igonjo écrit…</T>}
        {!!erreur && <T v="corps" couleur={c.erreur} accessibilityRole="alert">{erreur}</T>}
        {quota?.alerte && <T v="petit" couleur={c.accent}>Il te reste peu de messages aujourd'hui.</T>}
        <Champ valeur={texte} onChange={setTexte} placeholder="Écris ta question…" auto="sentences" onSubmit={envoyer} maxLength={2000} />
        <Bouton label="Envoyer" icone="envoyer" charge={occupe} desactive={!texte.trim()} onPress={envoyer} />
        <T v="petit">Kak'Igonjo n'utilise que des mots myènè vérifiés. S'il ne connaît pas un mot, il te le dit.</T>
      </>}
    </Ecran>
  );
}
