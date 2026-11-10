/** Onenji (Apprendre) : parcours par étape de la vie, leçons, cours d'artisans, bibliothèque, Ozangué et cours à distance. Tous les contenus viennent des fichiers JSON/CSV importés. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenCapture from 'expo-screen-capture';
import {
  creerSalle, demanderLicence, demanderOzangue, enListe, fonctionActive, leconOuverte, lireSalle, progressionUnite, quitterSalle, rejoindreSalle, resoudreMedia, serveursIce, verifierAcces, quitterSalle as _q,
  envoyerSignal, type EtatLecon, type Exercice, type Lecon, type Ligne, type MembreAppel, type NiveauAcces, type Parcours, type Unite,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { Bouton, Carte, Ecran, Entete, EtatVide, Ic, Mascotte, Pastille, Rangee, SectionTitre, T, Visuel, Champ, Barre, Chargement, Puce, useToast } from './kit';
import { Certificat, ControleUnite, FinLecon, LeconRunner } from './OnenjiLecon';
import { usePile } from './Pile';
import { usePrefs, useTheme } from './Prefs';
import { useProgres } from './Progres';
import { EmplacementPub, FilAvecPubs, useSansPublicite } from './Pub';
import { useContenus } from './useContenu';
import { Verrou } from './Verrou';

type E =
  | { t: 'hub' } | { t: 'parcours'; id: string } | { t: 'lecon'; lecon: Lecon; unite: Unite; parcours: Parcours }
  | { t: 'fin'; lecon: Lecon; res: EtatLecon; xp: number; parcoursId: string } | { t: 'controle'; unite: Unite; parcoursId: string }
  | { t: 'finUnite'; unite: Unite; bonnes: number; sur: number; valide: boolean; parcoursId: string } | { t: 'certificat'; parcours: Parcours }
  | { t: 'artisans' } | { t: 'cours'; id: string } | { t: 'video'; id: string; debut?: number } | { t: 'ozangue' } | { t: 'classe' } | { t: 'biblio' };

const num = (v: unknown) => Number(v) || 0;
const tri = <T extends Ligne>(l: T[]) => [...l].sort((a, b) => num(a.ordre) - num(b.ordre));

export function Onenji() {
  const pile = usePile<E>({ t: 'hub' });
  const { res, chargement } = useContenus(['parcours', 'unites', 'lecons', 'exercices', 'cours_artisans', 'chapitres', 'bibliotheque', 'opportunites']);
  const { prefs } = usePrefs();
  const enfant = prefs.mode === 'enfant';
  const D = useMemo(() => {
    const parcours = tri(res.parcours ?? []).filter(p => !enfant || num(p.cycle) <= 2) as unknown as Parcours[];
    return { parcours, unites: tri(res.unites ?? []) as unknown as Unite[], lecons: tri(res.lecons ?? []).filter(l => !enfant || l.mode !== 'adulte') as unknown as Lecon[], exercices: tri(res.exercices ?? []) as unknown as Exercice[], cours: tri(res.cours_artisans ?? []), chapitres: tri(res.chapitres ?? []), biblio: res.bibliotheque ?? [], opportunites: res.opportunites ?? [] };
  }, [res, enfant]);
  const e = pile.ecran;
  if (chargement) return <Ecran><Chargement /></Ecran>;

  switch (e.t) {
    case 'parcours': return <ParcoursEcran id={e.id} D={D} pile={pile} />;
    case 'lecon': return <LeconFlux e={e} D={D} pile={pile} />;
    case 'fin': return <FinLecon lecon={e.lecon} resultat={e.res} xpGagne={e.xp} onSuite={() => pile.retour()} />;
    case 'controle': {
      const unite = D.unites.find(u => u.id === e.unite.id)!;
      const ids = D.lecons.filter(l => l.unite_id === unite.id).map(l => l.id);
      return <ControleFlux unite={unite} exercices={D.exercices.filter(x => ids.includes(x.lecon_id))} pile={pile} parcoursId={e.parcoursId} />;
    }
    case 'finUnite': return (
      <Ecran contenu={{ alignItems: 'center' }}>
        <Mascotte taille={130} humeur={e.valide ? 'content' : 'triste'} />
        <T v="titre" style={{ textAlign: 'center' }}>{e.valide ? 'Unité validée !' : 'Pas encore'}</T>
        <T v="corps" style={{ textAlign: 'center' }}>{e.bonnes} bonne{e.bonnes > 1 ? 's' : ''} réponse{e.bonnes > 1 ? 's' : ''} sur {e.sur}. Il en faut 4 sur 5 pour valider « {e.unite.titre} ».</T>
        {!e.valide && <T v="petit" style={{ textAlign: 'center' }}>Reprends les leçons de l'unité, puis retente le contrôle quand tu veux. Rien n'est perdu.</T>}
        <Bouton label={e.valide ? 'Continuer' : 'Revoir les leçons'} onPress={() => pile.retour()} />
      </Ecran>
    );
    case 'certificat': return <CertificatEcran parcours={e.parcours} onFermer={pile.retour} />;
    case 'artisans': return <Artisans D={D} pile={pile} />;
    case 'cours': return <FicheCours id={e.id} D={D} pile={pile} />;
    case 'video': return <LecteurVideo id={e.id} debut={e.debut} D={D} pile={pile} />;
    case 'ozangue': return <Ozangue retour={pile.retour} />;
    case 'classe': return <ClasseDistance retour={pile.retour} />;
    case 'biblio': return <Bibliotheque D={D} retour={pile.retour} />;
    default: return <Hub D={D} pile={pile} />;
  }
}
type Donnees = { parcours: Parcours[]; unites: Unite[]; lecons: Lecon[]; exercices: Exercice[]; cours: Ligne[]; chapitres: Ligne[]; biblio: Ligne[]; opportunites: Ligne[] };
type Pile = ReturnType<typeof usePile<E>>;

// ------------------------------------------------------------------ accueil (31)
function Hub({ D, pile }: { D: Donnees; pile: Pile }) {
  const { c } = useTheme();
  const { donnees, xp, rang } = useProgres();
  const { prefs } = usePrefs();
  const enfant = prefs.mode === 'enfant';
  const ouvertes = D.lecons.filter(l => !donnees.leconsTerminees[l.id]);
  const prochaine = ouvertes.find(l => leconOuverte(D.lecons.filter(x => x.unite_id === l.unite_id), l.id, donnees));
  const uniteDe = (l: Lecon) => D.unites.find(u => u.id === l.unite_id);
  const parcoursDe = (l: Lecon) => D.parcours.find(p => p.id === uniteDe(l)?.parcours_id);
  return (
    <Ecran bas={90}>
      <Entete titre="Apprendre" sous={`${rang.rang.nom} · ${xp} XP`} droite={<Pastille label={`🔥 ${donnees.serie ?? 0}`} couleur={c.accent} fond={c.carte} />} />
      {prochaine && uniteDe(prochaine) && parcoursDe(prochaine) && (
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
            <Carte key={p.id} accent={p.couleur ?? undefined} onPress={() => pile.pousser({ t: 'parcours', id: p.id })} label={`Parcours ${p.titre}`} style={{ width: 170 }}>
              <View style={{ padding: 16, gap: 8, minHeight: 150 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.couleur ?? c.accent, alignItems: 'center', justifyContent: 'center' }}><Ic nom="apprendre" taille={22} couleur="#FDFAF7" /></View>
                <T v="sousTitre" style={{ fontStyle: 'italic' }}>{p.titre}</T>
                <T v="petit" numberOfLines={2}>{p.description || `${lecons.length} leçons`}</T>
                <Barre valeur={lecons.length ? fait / lecons.length : 0} couleur={p.couleur ?? undefined} />
              </View>
            </Carte>
          );
        })}</Rangee>}
      {!enfant && <>
        <SectionTitre titre="Cours d'artisans" action={D.cours.length ? 'Tout voir' : undefined} onAction={() => pile.pousser({ t: 'artisans' })} />
        {D.cours.length === 0 ? <T v="petit">Les cours en vidéo des artisans arrivent bientôt.</T> :
          <Rangee>{D.cours.slice(0, 6).map(k => <Carte key={k.id} onPress={() => pile.pousser({ t: 'cours', id: k.id })} style={{ width: 200 }} label={k.titre}>
            <Visuel uri={k.image} hauteur={110} largeur="100%" rayon={0} icone="video" />
            <View style={{ padding: 12, gap: 4 }}><T v="carte" numberOfLines={2}>{k.titre}</T><T v="petit">{k.artisan}{num(k.duree_min) ? ` · ${k.duree_min} min` : ''}</T></View>
          </Carte>)}</Rangee>}
        <EmplacementPub zone="bandeau_apprendre" />
        <Carte onPress={() => pile.pousser({ t: 'ozangue' })} label="Parler à Ozangué"><View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16 }}>
          <Mascotte taille={64} humeur="parle" /><View style={{ flex: 1 }}><T v="carte">Ozangué, ton assistant</T><T v="petit">{fonctionActive('assistantIA') ? 'Pose-lui une question sur la langue.' : 'Bientôt disponible.'}</T></View><Ic nom="suivant" taille={18} couleur={c.discret} /></View></Carte>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Carte onPress={() => pile.pousser({ t: 'biblio' })} style={{ flex: 1 }} label="Bibliothèque"><View style={{ padding: 16, gap: 6 }}><Ic nom="livre" taille={24} couleur={c.accent} /><T v="carte">Bibliothèque</T><T v="petit">{D.biblio.length} document{D.biblio.length > 1 ? 's' : ''}</T></View></Carte>
          <Carte onPress={() => pile.pousser({ t: 'classe' })} style={{ flex: 1 }} label="Cours à distance"><View style={{ padding: 16, gap: 6 }}><Ic nom="video" taille={24} couleur={c.accent} /><T v="carte">Cours à distance</T><T v="petit">Groupe de 4, chiffré</T></View></Carte>
        </View>
      </>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ parcours qui serpente (32)
function ParcoursEcran({ id, D, pile }: { id: string; D: Donnees; pile: Pile }) {
  const { c } = useTheme();
  const toast = useToast();
  const { donnees } = useProgres();
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T v="sousTitre">{u.titre}</T>{valide && <Pastille label="Validée" couleur={c.succes} fond={c.carte} />}</View>
            <Barre valeur={progressionUnite(lecons, donnees)} couleur={couleur} />
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

function LeconFlux({ e, D, pile }: { e: Extract<E, { t: 'lecon' }>; D: Donnees; pile: Pile }) {
  const { terminerLecon } = useProgres();
  const ex = D.exercices.filter(x => x.lecon_id === e.lecon.id);
  return (
    <Verrou contenu={{ id: e.lecon.id, acces: ((e.lecon.niveau_acces as NiveauAcces) || 'libre'), roles: ['admin', 'validator'] }} regle={e.lecon as unknown as Record<string, any>}>
      <LeconRunner titre={e.lecon.titre} exercices={ex} onQuitter={pile.retour} onFin={async res => { const r = await terminerLecon(e.lecon, res.bonnes, res.erreurs); pile.remplacer({ t: 'fin', lecon: e.lecon, res, xp: r.xpGagne, parcoursId: e.parcours.id }); }} />
    </Verrou>
  );
}
function ControleFlux({ unite, exercices, pile, parcoursId }: { unite: Unite; exercices: Exercice[]; pile: Pile; parcoursId: string }) {
  const { validerUnite } = useProgres();
  return <ControleUnite unite={unite} exercices={exercices} onQuitter={pile.retour} onFin={async (b, s) => { const r = await validerUnite(unite.id, b, s); pile.remplacer({ t: 'finUnite', unite, bonnes: b, sur: s, valide: r.valide, parcoursId }); }} />;
}
function CertificatEcran({ parcours, onFermer }: { parcours: Parcours; onFermer: () => void }) {
  const { profil } = useAuth();
  return <Certificat parcours={parcours} nom={profil?.fullName || profil?.displayName || ''} onFermer={onFermer} />;
}

// ------------------------------------------------------------------ artisans (41-43)
function Artisans({ D, pile }: { D: Donnees; pile: Pile }) {
  const [metier, setMetier] = useState<string | null>(null);
  const metiers = [...new Set(D.cours.map(k => String(k.metier || '')).filter(Boolean))];
  const liste = D.cours.filter(k => !metier || k.metier === metier);
  return (
    <Ecran bas={40}>
      <Entete titre="Cours d'artisans" retour={pile.retour} />
      <EmplacementPub zone="bandeau_apprendre" />
      {metiers.length > 0 && <Rangee>{[<Puce key="t" label="Tous" actif={!metier} onPress={() => setMetier(null)} />, ...metiers.map(m => <Puce key={m} label={m} actif={metier === m} onPress={() => setMetier(m)} />)]}</Rangee>}
      {liste.length === 0 ? <EtatVide mascotte titre="Bientôt des cours" texte="Les artisans préparent leurs premiers cours." /> :
        <FilAvecPubs items={liste} zone="bandeau_apprendre" cle={k => k.id} rendu={k => <Carte onPress={() => pile.pousser({ t: 'cours', id: k.id })} label={k.titre}>
          <Visuel uri={k.image} hauteur={150} largeur="100%" rayon={0} icone="video" />
          <View style={{ padding: 14, gap: 4 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T v="carte" style={{ flex: 1 }}>{k.titre}</T>{k.niveau_acces && k.niveau_acces !== 'libre' && <Ic nom="verrou" taille={16} />}</View><T v="petit">{k.artisan}{k.metier ? ` · ${k.metier}` : ''}{num(k.duree_min) ? ` · ${k.duree_min} min` : ''}</T></View>
        </Carte>} />}
    </Ecran>
  );
}

function FicheCours({ id, D, pile }: { id: string; D: Donnees; pile: Pile }) {
  const k = D.cours.find(x => x.id === id);
  if (!k) return <Ecran><Entete titre="Cours introuvable" retour={pile.retour} /></Ecran>;
  const chapitres = D.chapitres.filter(x => x.cours_id === id);
  return (
    <Ecran bas={40}>
      <Entete titre={k.titre} sous={k.artisan} retour={pile.retour} />
      <Visuel uri={k.image} hauteur={180} largeur="100%" icone="video" />
      <T v="corps">{k.description}</T>
      <Verrou contenu={{ id, acces: ((k.niveau_acces as NiveauAcces) || 'libre'), roles: ['admin', 'validator'] }} regle={k}>
        <Bouton label={k.video_url || k.protege ? 'Regarder le cours' : 'Vidéo bientôt disponible'} icone="lecture" desactive={!k.video_url && !k.protege} onPress={() => pile.pousser({ t: 'video', id })} />
        {chapitres.length > 0 && <><SectionTitre titre="Chapitres" />{chapitres.map(ch => (
          <Carte key={ch.id} plat onPress={() => (k.video_url || k.protege) && pile.pousser({ t: 'video', id, debut: num(ch.debut_s) })} label={ch.titre}><View style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}><T v="carte" style={{ width: 28 }}>{num(ch.ordre)}</T><T v="corps" style={{ flex: 1 }} fort>{ch.titre}</T><T v="petit">{Math.floor(num(ch.debut_s) / 60)}:{String(num(ch.debut_s) % 60).padStart(2, '0')}</T></View></Carte>
        ))}</>}
      </Verrou>
    </Ecran>
  );
}

/** Lecteur vidéo : chapitres, filigrane portant l'empreinte du compte, enregistrement d'écran interdit pour les cours protégés. Le chiffrement des segments se branche sur la licence (étape T10). */
function LecteurVideo({ id, debut, D, pile }: { id: string; debut?: number; D: Donnees; pile: Pile }) {
  const k = D.cours.find(x => x.id === id)!;
  const { c } = useTheme();
  const { profil } = useAuth();
  const [source, setSource] = useState<string | null>(null);
  const [filigrane, setFiligrane] = useState((profil?.id ?? 'invité').slice(-8));
  const [refus, setRefus] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 20, y: 40 });
  const protege = !!k.niveau_acces && k.niveau_acces !== 'libre';
  useSansPublicite(true);
  useEffect(() => {
    (async () => {
      try {
        if (profil && protege) { const a = await verifierAcces('cours_artisans', id); if (!a.autorise) { setRefus(a.motif ?? 'refus'); return; } const l = await demanderLicence('cours_artisans', id); setFiligrane(l.filigrane); if (l.urlHls) { setSource(l.urlHls); return; } }
        setSource(/^https?:\/\//.test(k.video_url) ? k.video_url : await resoudreMedia(k.video_url));
      } catch { setRefus('indisponible'); }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setPos({ x: 10 + Math.random() * 60, y: 10 + Math.random() * 70 }), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { if (Platform.OS === 'web' || !protege) return; ScreenCapture.preventScreenCaptureAsync('video').catch(() => {}); return () => { ScreenCapture.allowScreenCaptureAsync('video').catch(() => {}); }; }, [protege]);
  const player = useVideoPlayer(source ? { uri: source } : null, p => { if (debut) p.currentTime = debut; p.play(); });
  return (
    <Ecran bas={30}>
      <Entete titre={k.titre} sous={k.artisan} retour={pile.retour} />
      {refus ? <EtatVide icone="verrou" titre="Lecture impossible" texte="Ce cours est réservé ou la vidéo est indisponible." /> : (
        <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 16 / 9 }}>
          {source ? <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls allowsFullscreen allowsPictureInPicture={false} /> : <EtatVide icone="video" titre="Chargement…" />}
          <View pointerEvents="none" style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%` }}><T v="petit" couleur="rgba(255,255,255,0.35)">{filigrane}</T></View>
        </View>
      )}
      {D.chapitres.filter(x => x.cours_id === id).map(ch => (
        <Pressable key={ch.id} accessibilityRole="button" onPress={() => { try { player.currentTime = num(ch.debut_s); player.play(); } catch { /* */ } }} style={{ padding: 12, borderRadius: 12, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}><T v="corps" fort>{ch.titre}</T></Pressable>
      ))}
      <T v="petit">Sous-titres omyènè et français : selon les fichiers fournis avec le cours.</T>
    </Ecran>
  );
}

// ------------------------------------------------------------------ bibliothèque
function Bibliotheque({ D, retour }: { D: Donnees; retour: () => void }) {
  return (
    <Ecran bas={40}>
      <Entete titre="Bibliothèque" retour={retour} />
      {D.biblio.length === 0 ? <EtatVide mascotte titre="Bibliothèque en préparation" texte="Livres, annales et fiches libres de droits arriveront ici." /> :
        D.biblio.map(b => <Carte key={b.id} onPress={() => b.url && Linking.openURL(b.url).catch(() => {})} label={b.titre}><View style={{ padding: 14, gap: 4 }}><T v="carte">{b.titre}</T><T v="petit">{[b.auteur, b.type, b.langue].filter(Boolean).join(' · ')}</T></View></Carte>)}
      {D.opportunites.length > 0 && <><SectionTitre titre="Opportunités pour la jeunesse" />{D.opportunites.map(o => <Carte key={o.id} plat onPress={() => o.lien && Linking.openURL(o.lien).catch(() => {})} label={o.titre}><View style={{ padding: 14, gap: 4 }}><T v="carte">{o.titre}</T><T v="petit">{[o.organisme, o.date_limite && `avant le ${o.date_limite}`].filter(Boolean).join(' · ')}</T><T v="petit">{o.description}</T></View></Carte>)}</>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ Ozangué (44)
type Bulle = { role: 'user' | 'assistant'; content: string };
function Ozangue({ retour }: { retour: () => void }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const [bulles, setBulles] = useState<Bulle[]>([{ role: 'assistant', content: 'Mbolo ! Je suis Ozangué. Pose-moi une question sur la langue myènè ou la culture.' }]);
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
    try { const r = await demanderOzangue(m, conv, hist); setConv(r.conversationId); setQuota(r.quota); setBulles(b => [...b, { role: 'assistant', content: r.reponse }]); }
    catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };
  return (
    <Ecran bas={30}>
      <Entete titre="Ozangué" sous="Ton assistant d'apprentissage" retour={retour} />
      {!profil && <EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connecte-toi pour parler à Ozangué." />}
      {profil && <>
        {bulles.map((b, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, justifyContent: b.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {b.role === 'assistant' && <Mascotte taille={36} humeur="parle" />}
            <View style={{ maxWidth: '82%', padding: 12, borderRadius: 18, backgroundColor: b.role === 'user' ? c.accent : c.carte, borderWidth: b.role === 'user' ? 0 : 1, borderColor: c.bord }}><T v="corps" couleur={b.role === 'user' ? c.surAccent : c.texte}>{b.content}</T></View>
          </View>
        ))}
        {occupe && <T v="petit">Ozangué écrit…</T>}
        {!!erreur && <T v="corps" couleur={c.erreur} accessibilityRole="alert">{erreur}</T>}
        {quota?.alerte && <T v="petit" couleur={c.accent}>Il te reste peu de messages aujourd'hui.</T>}
        <Champ valeur={texte} onChange={setTexte} placeholder="Écris ta question…" auto="sentences" onSubmit={envoyer} maxLength={2000} />
        <Bouton label="Envoyer" icone="envoyer" charge={occupe} desactive={!texte.trim()} onPress={envoyer} />
        <T v="petit">Ozangué n'utilise que des mots myènè vérifiés. S'il ne connaît pas un mot, il te le dit.</T>
      </>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ cours à distance (45) : groupes de 4 au plus
function ClasseDistance({ retour }: { retour: () => void }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const toast = useToast();
  const [salle, setSalle] = useState<{ id: string; titre: string } | null>(null);
  const [membres, setMembres] = useState<MembreAppel[]>([]);
  const [code, setCode] = useState('');
  const [max, setMax] = useState(4);
  const dernier = useRef(0);
  useEffect(() => { serveursIce().then(r => setMax(r.maxGroupe)).catch(() => {}); }, []);
  useEffect(() => {
    if (!salle) return;
    const t = setInterval(async () => { try { const r = await lireSalle(salle.id, dernier.current); setMembres(r.membres); dernier.current = r.dernier; /* r.signaux : à remettre au pont WebRTC */ } catch { /* salle fermée */ } }, 2000);
    return () => { clearInterval(t); quitterSalle(salle.id).catch(() => {}); };
  }, [salle?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!profil) return <Ecran><Entete titre="Cours à distance" retour={retour} /><EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connecte-toi pour suivre un cours à distance." /></Ecran>;
  return (
    <Ecran bas={30}>
      <Entete titre="Cours à distance" sous={`Groupes de ${max} au plus · chiffré de bout en bout`} retour={retour} />
      {!salle ? <>
        <Bouton label="Créer une salle" icone="ajouter" onPress={async () => { try { const s = await creerSalle('Cours à distance'); setSalle({ id: s.id, titre: s.titre }); dernier.current = 0; } catch (e) { toast((e as Error).message, 'erreur'); } }} />
        <T v="corps">Ou rejoins une salle avec son code :</T>
        <Champ valeur={code} onChange={setCode} placeholder="Code de la salle" icone="video" />
        <Bouton label="Rejoindre" variante="fantome" desactive={code.length < 4} onPress={async () => { try { const s = await rejoindreSalle(code.trim()); setSalle({ id: s.id, titre: s.titre }); setMembres(s.membres); dernier.current = 0; } catch (e) { toast((e as Error).message, 'erreur'); } }} />
      </> : <>
        <Carte><View style={{ padding: 16, gap: 6 }}><T v="libelle">Code de la salle</T><T v="titre">{salle.id}</T><T v="petit">Donne ce code à tes camarades (3 au plus avec toi).</T></View></Carte>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Array.from({ length: max }, (_, i) => {
            const m = membres[i];
            return <View key={i} style={{ width: '48%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: m ? c.carte : 'transparent', borderWidth: 1, borderStyle: m ? 'solid' : 'dashed', borderColor: c.bord, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ic nom={m ? 'profil' : 'ajouter'} taille={28} couleur={m ? c.accent : c.discret} /><T v="petit" fort={!!m}>{m ? m.nom + (m.hote ? ' (hôte)' : '') : 'Place libre'}</T>
            </View>;
          })}
        </View>
        <Carte plat><View style={{ padding: 14 }}><T v="petit">L'image et le son passent de pair à pair (WebRTC), chiffrés de bout en bout. Cette version de développement gère la salle et les signaux ; la caméra et le micro se branchent avec la version de développement native (react-native-webrtc).</T></View></Carte>
        <Bouton label="Quitter la salle" variante="fantome" onPress={() => { quitterSalle(salle.id).catch(() => {}); setSalle(null); setMembres([]); }} />
      </>}
    </Ecran>
  );
}
void _q; void enListe; void envoyerSignal;
