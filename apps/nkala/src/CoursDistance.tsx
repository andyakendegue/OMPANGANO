/**
 * Cours à distance d'Onenji (écran 45) : salle de 4 personnes au plus, code à partager, image et son de pair à pair (WebRTC, maillage).
 * Le serveur ne fait que la signalisation (offres, réponses, candidats ICE, relevés toutes les secondes) et donne les serveurs STUN/TURN
 * (coturn, identifiants valables une heure). Le flux est chiffré par WebRTC (DTLS-SRTP) d'un appareil à l'autre : le serveur ne le voit pas,
 * même quand il passe par le relais TURN.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import { adminProfesseurs, chargerModesPaiement, creerPaiement, creerSalle, declarerPaiement, entrerCoursPrevu, envoyerSignal, inscrireCoursPrevu, lireCoursPrevu, lirePaiement, lireSalle, mesCoursPrevus, moiCoursDistance, normaliserTelephone, planifierCours, prixSeance, quitterCoursPrevu, quitterSalle, rejoindreSalle, serveursIce, simulerPaiement, type CoursPrevu, type MembreAppel, type Paiement } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { Bouton, Carte, Champ, Ecran, Entete, EtatVide, Feuille, Ic, Puce, T, useToast } from './kit';
import { useTheme } from './Prefs';
import { useSansPublicite } from './Pub';
import { candidat, description, fluxLocal, nouvellePair, retournementPossible, retournerCamera, rtcAbsent, rtcDisponible, VueVideo, type Flux } from './rtc';

type Signal = { type: 'offre' | 'reponse'; sdp: { type: string; sdp: string } } | { type: 'ice'; candidat: unknown } | { type: 'bonjour' };
interface Pair { pc: any; flux: Flux | null; enAttente: unknown[]; distante: boolean }

/** Qui lance l'offre entre deux membres : le plus petit identifiant (évite que les deux le fassent en même temps). */
export const initiateur = (moi: string, autre: string) => moi < autre;

function useSalleRtc(salleId: string | null, moi: string, iceServers: unknown[]) {
  const pairs = useRef(new Map<string, Pair>());
  const local = useRef<Flux | null>(null);
  const [fluxMoi, setFluxMoi] = useState<Flux | null>(null);
  const [membres, setMembres] = useState<MembreAppel[]>([]);
  const [, rafraichir] = useState(0);
  const [erreurMedia, setErreurMedia] = useState<string | null>(null);
  const [micro, setMicro] = useState(true);
  const [camera, setCamera] = useState(true);
  const dernier = useRef(0);
  /** Vrai une fois la caméra et le micro demandés (accordés ou non) : les connexions partent ensuite avec les bonnes pistes. */
  const pret = useRef(false);
  const maj = () => rafraichir(x => x + 1);

  const envoyer = useCallback((a: string, s: Signal) => { if (salleId) envoyerSignal(salleId, a, s).catch(() => {}); }, [salleId]);

  const pairDe = useCallback((uid: string): Pair => {
    const ex = pairs.current.get(uid);
    if (ex) return ex;
    const pc = nouvellePair({ iceServers });
    const p: Pair = { pc, flux: null, enAttente: [], distante: false };
    local.current?.getTracks().forEach(t => pc.addTrack(t, local.current));
    pc.addEventListener('icecandidate', (e: any) => { if (e.candidate) envoyer(uid, { type: 'ice', candidat: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); });
    pc.addEventListener('track', (e: any) => { if (e.streams?.[0]) { p.flux = e.streams[0]; maj(); } });
    pc.addEventListener('connectionstatechange', () => { if (pc.connectionState === 'failed') { try { pc.restartIce?.(); } catch { /* */ } } maj(); });
    pairs.current.set(uid, p);
    return p;
  }, [iceServers, envoyer]);

  const fermerPair = (uid: string) => { const p = pairs.current.get(uid); if (p) { try { p.pc.close(); } catch { /* */ } pairs.current.delete(uid); maj(); } };

  const offrir = useCallback(async (uid: string) => {
    const p = pairDe(uid);
    const o = await p.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await p.pc.setLocalDescription(o);
    envoyer(uid, { type: 'offre', sdp: { type: o.type, sdp: o.sdp } });
  }, [pairDe, envoyer]);

  const recevoir = useCallback(async (de: string, s: Signal) => {
    if (s.type === 'offre') {
      const p = pairDe(de);
      await p.pc.setRemoteDescription(description(s.sdp)); p.distante = true;
      for (const c of p.enAttente.splice(0)) await p.pc.addIceCandidate(candidat(c)).catch(() => {});
      const r = await p.pc.createAnswer();
      await p.pc.setLocalDescription(r);
      envoyer(de, { type: 'reponse', sdp: { type: r.type, sdp: r.sdp } });
    } else if (s.type === 'reponse') {
      const p = pairs.current.get(de); if (!p) return;
      await p.pc.setRemoteDescription(description(s.sdp)); p.distante = true;
      for (const c of p.enAttente.splice(0)) await p.pc.addIceCandidate(candidat(c)).catch(() => {});
    } else if (s.type === 'ice') {
      const p = pairDe(de);
      if (p.distante) await p.pc.addIceCandidate(candidat(s.candidat)).catch(() => {}); else p.enAttente.push(s.candidat);
    } else if (s.type === 'bonjour' && initiateur(moi, de)) {
      // l'autre vient d'arriver (ou de relancer) : on refait l'offre
      fermerPair(de); await offrir(de);
    }
  }, [pairDe, envoyer, offrir, moi]);

  // Caméra et micro à l'entrée dans la salle (vidéo refusée : on garde le son ; tout refusé : on écoute seulement).
  useEffect(() => {
    if (!salleId || !rtcDisponible) return;
    let annule = false;
    (async () => {
      let f: Flux | null = null;
      try { f = await fluxLocal(true); } catch { try { f = await fluxLocal(false); setCamera(false); setErreurMedia('Caméra refusée ou absente : tu participes avec le son seulement.'); } catch { setErreurMedia('Caméra et micro refusés : tu peux voir et entendre les autres, sans parler. Autorise-les dans les réglages du téléphone ou du navigateur.'); } }
      if (annule) { f?.getTracks().forEach(t => t.stop()); return; }
      local.current = f; setFluxMoi(f); pret.current = true;
    })();
    return () => { annule = true; };
  }, [salleId]);

  // Relevé de la salle : membres et signaux, une fois par seconde.
  useEffect(() => {
    if (!salleId) return;
    let actif = true, premier = true;
    const tour = async () => {
      try {
        const r = await lireSalle(salleId, dernier.current);
        if (!actif) return;
        dernier.current = r.dernier;
        setMembres(r.membres);
        const autres = r.membres.filter(m => m.uid !== moi).map(m => m.uid);
        for (const uid of [...pairs.current.keys()]) if (!autres.includes(uid)) fermerPair(uid);
        for (const s of r.signaux) await recevoir(s.de, s.data as Signal).catch(() => {});
        if (rtcDisponible && pret.current) {
          for (const uid of autres) {
            if (pairs.current.has(uid)) continue;
            if (initiateur(moi, uid)) await offrir(uid).catch(() => {});
            else if (premier) envoyer(uid, { type: 'bonjour' });
          }
          premier = false;
        }
      } catch { /* salle fermée ou réseau : on réessaie */ }
    };
    const t = setInterval(tour, 1000); tour();
    return () => { actif = false; clearInterval(t); };
  }, [salleId, moi, recevoir, offrir, envoyer]); // eslint-disable-line react-hooks/exhaustive-deps

  const quitter = useCallback(() => {
    for (const uid of [...pairs.current.keys()]) fermerPair(uid);
    local.current?.getTracks().forEach(t => t.stop()); local.current = null; setFluxMoi(null);
    dernier.current = 0; pret.current = false; setMembres([]);
  }, []);
  useEffect(() => () => quitter(), [quitter]);

  return {
    membres, fluxMoi, erreurMedia, micro, camera,
    fluxDe: (uid: string) => pairs.current.get(uid)?.flux ?? null,
    etatDe: (uid: string) => pairs.current.get(uid)?.pc?.connectionState as string | undefined,
    basculerMicro: () => { const v = !micro; local.current?.getAudioTracks().forEach(t => { t.enabled = v; }); setMicro(v); },
    basculerCamera: () => { const v = !camera; local.current?.getVideoTracks().forEach(t => { t.enabled = v; }); setCamera(v); },
    retourner: () => retournerCamera(local.current),
    quitter,
  };
}

export function CoursDistance({ retour }: { retour: () => void }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const toast = useToast();
  const [salle, setSalle] = useState<{ id: string; titre: string } | null>(null);
  const [code, setCode] = useState('');
  const [titre, setTitre] = useState('');
  const [ice, setIce] = useState<{ iceServers: unknown[]; maxGroupe: number }>({ iceServers: [], maxGroupe: 4 });
  const moi = profil?.id ?? '';
  const rtc = useSalleRtc(salle?.id ?? null, moi, ice.iceServers);
  const [droitsCours, setDroitsCours] = useState<Awaited<ReturnType<typeof moiCoursDistance>> | null>(null);
  const [aPayer, setAPayer] = useState<CoursPrevu | null>(null);
  useEffect(() => { if (profil) moiCoursDistance().then(setDroitsCours).catch(() => {}); }, [profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useSansPublicite(!!salle);
  useEffect(() => { if (profil) serveursIce().then(setIce).catch(() => {}); }, [profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sortir = () => { if (salle) quitterSalle(salle.id).catch(() => {}); rtc.quitter(); setSalle(null); };
  useEffect(() => () => { if (salle) quitterSalle(salle.id).catch(() => {}); }, [salle?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profil) return <Ecran><Entete titre="Cours à distance" retour={retour} /><EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connecte-toi pour suivre un cours à distance." /></Ecran>;
  if (!salle) return (
    <Ecran bas={30}>
      <Entete titre="Cours à distance" sous={`Groupes de ${ice.maxGroupe} au plus, avec un enseignant`} retour={retour} />
      <Planning entrer={s => setSalle(s)} droits={droitsCours} />
      {aPayer && <PaiementSeance cours={aPayer} onFermer={() => setAPayer(null)} onPaye={() => { setAPayer(null); evenementPlanning(); }} />}
      <T v="libelle">{droitsCours?.admin ? 'Tout de suite' : 'Rejoindre avec un code'}</T>
      {!rtcDisponible && <Carte plat><View style={{ padding: 14, flexDirection: 'row', gap: 10 }}><Ic nom="alerte" taille={20} couleur={c.accent} /><T v="petit" style={{ flex: 1 }}>{rtcAbsent}</T></View></Carte>}
      {/* Salle immédiate hors planning : administrateurs seulement (essais, assistance). */}
      {droitsCours?.admin && <>
        <Champ valeur={titre} onChange={setTitre} placeholder="Nom de la salle d'essai (facultatif)" maxLength={80} />
        <Bouton label="Créer une salle d'essai" icone="ajouter" onPress={async () => { try { const s = await creerSalle(titre.trim() || 'Salle d\'essai'); setSalle({ id: s.id, titre: s.titre }); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
      </>}
      <T v="corps">Entre le code reçu de ton professeur :</T>
      <Champ valeur={code} onChange={t => setCode(t.toLowerCase().replace(/[^0-9a-f]/g, ''))} placeholder="Code de la salle (8 caractères)" icone="video" auto="none" maxLength={8} />
      <Bouton label="Rejoindre" variante="fantome" desactive={code.length < 8} onPress={async () => {
        try { const s = await rejoindreSalle(code.trim()); setSalle({ id: s.id, titre: s.titre }); }
        catch (e) {
          // Le code peut être celui d'un cours prévu : on s'y inscrit (place payante : paiement Mobile Money d'abord).
          try { const p = await inscrireCoursPrevu(code.trim()); toast(`Inscrit : « ${p.titre} », ${dateHeure(p.debut)}.`, 'succes'); setCode(''); evenementPlanning(); }
          catch (e2) {
            if ((e2 as { status?: number }).status === 402) { try { setAPayer(await lireCoursPrevu(code.trim())); } catch { toast((e2 as Error).message, 'erreur'); } }
            else toast(((e2 as { status?: number }).status === 404 ? (e as Error) : (e2 as Error)).message, 'erreur');
          }
        }
      }} />
      <Carte plat><View style={{ padding: 14, gap: 6 }}>
        <T v="petit">L'image et le son vont directement d'un appareil à l'autre, chiffrés par WebRTC (DTLS-SRTP). Le serveur met seulement les participants en relation ; il ne voit ni n'enregistre le cours.</T>
        <T v="petit">Une salle se ferme quand tout le monde est parti, et au plus tard après 3 heures.</T>
      </View></Carte>
    </Ecran>
  );

  const places = Array.from({ length: ice.maxGroupe }, (_, i) => rtc.membres[i]);
  return (
    <Ecran bas={30}>
      <Entete titre={salle.titre} sous={`Code : ${salle.id} · ${rtc.membres.length}/${ice.maxGroupe}`} retour={sortir} recherche={false} />
      {!rtcDisponible && <T v="petit" couleur={c.accent}>{rtcAbsent}</T>}
      {!!rtc.erreurMedia && <T v="petit" couleur={c.accent} accessibilityRole="alert">{rtc.erreurMedia}</T>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {places.map((m, i) => {
          const estMoi = m?.uid === moi;
          const flux = m ? (estMoi ? rtc.fluxMoi : rtc.fluxDe(m.uid)) : null;
          const etat = m && !estMoi ? rtc.etatDe(m.uid) : undefined;
          const video = estMoi ? rtc.camera && !!flux : !!flux;
          return (
            <View key={m?.uid ?? `libre-${i}`} style={{ width: '48%', flexGrow: 1, aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', backgroundColor: m ? '#000' : 'transparent', borderWidth: 1, borderStyle: m ? 'solid' : 'dashed', borderColor: c.bord, alignItems: 'center', justifyContent: 'center' }}>
              {m && video && <VueVideo flux={flux} miroir={estMoi} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />}
              {(!m || !video) && <View style={{ alignItems: 'center', gap: 6 }}><Ic nom={m ? 'profil' : 'ajouter'} taille={30} couleur={m ? c.accent : c.discret} />{!m && <T v="petit">Place libre</T>}</View>}
              {m && <View style={{ position: 'absolute', left: 8, bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)' }}>
                  <T v="petit" couleur="#FDFAF7" numberOfLines={1}>{estMoi ? 'Moi' : m.nom}{m.hote ? ' · hôte' : ''}{estMoi && !rtc.micro ? ' · muet' : ''}{etat && etat !== 'connected' ? ` · ${etat === 'failed' ? 'coupé' : 'connexion…'}` : ''}</T>
                </View>
              </View>}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Commande icone={rtc.micro ? 'micro' : 'mic_off'} label={rtc.micro ? 'Couper le micro' : 'Rallumer le micro'} actif={rtc.micro} onPress={rtc.basculerMicro} />
        <Commande icone={rtc.camera ? 'video' : 'video_off'} label={rtc.camera ? 'Couper la caméra' : 'Rallumer la caméra'} actif={rtc.camera} onPress={rtc.basculerCamera} />
        {retournementPossible && Platform.OS !== 'web' && <Commande icone="retourner" label="Changer de caméra" actif onPress={rtc.retourner} />}
        <Commande icone="raccrocher" label="Quitter la salle" danger onPress={sortir} />
      </View>
      <Carte><View style={{ padding: 16, gap: 6 }}><T v="libelle">Code de la salle</T><T v="titre" style={{ letterSpacing: 2 }}>{salle.id}</T><T v="petit">Donne ce code à tes camarades ({ice.maxGroupe - 1} au plus avec toi).</T></View></Carte>
    </Ecran>
  );
}

function Commande({ icone, label, onPress, actif, danger }: { icone: string; label: string; onPress: () => void; actif?: boolean; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? c.erreur : actif ? c.carte : c.fort, borderWidth: 1, borderColor: c.bord }}>
      <Ic nom={icone} taille={26} couleur={danger ? '#FDFAF7' : actif ? c.fort : c.fond} />
    </Pressable>
  );
}

// ------------------------------------------------------------------ planning des cours (14 nov. 2026)
const ecouteursPlanning = new Set<() => void>();
const evenementPlanning = () => ecouteursPlanning.forEach(f => f());
export const dateHeure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/** « JJ/MM/AAAA » et « HH:MM » (heure du téléphone) → date ISO, ou null. */
export function lireDateHeure(jour: string, heure: string): string | null {
  const j = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(jour.trim()), h = /^(\d{1,2})[:h](\d{2})$/.exec(heure.trim());
  if (!j || !h) return null;
  const d = new Date(Number(j[3]), Number(j[2]) - 1, Number(j[1]), Number(h[1]), Number(h[2]));
  return Number.isNaN(d.getTime()) || d.getDate() !== Number(j[1]) ? null : d.toISOString();
}

function Planning({ entrer, droits }: { entrer: (s: { id: string; titre: string }) => void; droits: Awaited<ReturnType<typeof moiCoursDistance>> | null }) {
  const { c } = useTheme();
  const toast = useToast();
  const [liste, setListe] = useState<CoursPrevu[] | null>(null);
  const [form, setForm] = useState(false);
  const demain = new Date(Date.now() + 86_400_000);
  const [titre, setTitre] = useState('');
  const [jour, setJour] = useState(`${String(demain.getDate()).padStart(2, '0')}/${String(demain.getMonth() + 1).padStart(2, '0')}/${demain.getFullYear()}`);
  const [heure, setHeure] = useState('18:00');
  const [duree, setDuree] = useState(60);
  // Un administrateur choisit le professeur du cours ; un professeur anime lui-même.
  const [profs, setProfs] = useState<{ uid: string; nom: string }[]>([]);
  const [prof, setProf] = useState<string | null>(null);
  useEffect(() => { if (droits?.admin && form) adminProfesseurs().then(setProfs).catch(() => {}); }, [droits?.admin, form]);
  const prix = prixSeance(droits?.tarif, duree);
  const charger = useCallback(() => { mesCoursPrevus().then(setListe).catch(() => setListe([])); }, []);
  useEffect(() => { charger(); ecouteursPlanning.add(charger); const t = setInterval(charger, 60_000); return () => { ecouteursPlanning.delete(charger); clearInterval(t); }; }, [charger]);
  const creer = async () => {
    const debut = lireDateHeure(jour, heure);
    if (!debut) { toast('Date (JJ/MM/AAAA) ou heure (HH:MM) illisible.', 'erreur'); return; }
    try { const p = await planifierCours(titre.trim() || 'Cours à distance', debut, duree, prof ?? undefined); setForm(false); setTitre(''); charger(); partager(p); } catch (e) { toast((e as Error).message, 'erreur'); }
  };
  const partager = (p: CoursPrevu) => { Share.share({ message: `Cours à distance sur Nkala : « ${p.titre} », ${dateHeure(p.debut)} (${p.dureeMin} min). Code d'inscription : ${p.code} (Apprendre › Inenga › Cours à distance).` }).catch(() => {}); };
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><T v="libelle" style={{ flex: 1 }}>Mes cours prévus</T>{droits?.peutAnimer && <Pressable accessibilityRole="button" onPress={() => setForm(f => !f)} hitSlop={8}><T v="petit" fort couleur={c.accent}>{form ? 'Fermer' : '+ Planifier'}</T></Pressable>}</View>
      {form && <Carte plat><View style={{ padding: 14, gap: 10 }}>
        <Champ valeur={titre} onChange={setTitre} placeholder="Nom du cours" maxLength={80} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 3 }}><Champ valeur={jour} onChange={setJour} placeholder="JJ/MM/AAAA" clavier="numbers-and-punctuation" label="Jour" /></View>
          <View style={{ flex: 2 }}><Champ valeur={heure} onChange={setHeure} placeholder="HH:MM" clavier="numbers-and-punctuation" label="Heure" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{[30, 45, 60, 90, 120].map(m => <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: duree === m }} onPress={() => setDuree(m)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: duree === m ? c.accent : c.bord, backgroundColor: duree === m ? c.accent : 'transparent' }}><T v="petit" fort couleur={duree === m ? c.surAccent : c.fort}>{m} min</T></Pressable>)}</View>
        {droits?.admin && <View style={{ gap: 6 }}>
          <T v="petit" fort>Professeur du cours</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Puce label="Moi" actif={!prof} onPress={() => setProf(null)} />
            {profs.map(x => <Puce key={x.uid} label={x.nom} actif={prof === x.uid} onPress={() => setProf(x.uid)} />)}
          </View>
          {profs.length === 0 && <T v="petit">Aucun professeur nommé : Console › Cours à distance.</T>}
        </View>}
        <T v="petit">Prix de la place : {prix ? `${prix} FCFA` : 'gratuit'} (tarif fixé par les administrateurs).</T>
        <Bouton label="Planifier et partager le code" icone="calendrier" onPress={creer} />
      </View></Carte>}
      {liste === null ? null : liste.length === 0 ? !form && <T v="petit">{droits?.peutAnimer ? 'Aucun cours prévu. Planifie-en un et partage son code.' : 'Aucun cours prévu. Entre ci-dessous le code reçu de ton professeur.'}</T> :
        liste.map(p => (
          <Carte key={p.code} plat><View style={{ padding: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ic nom="calendrier" taille={18} couleur={c.accent} /><T v="carte" style={{ flex: 1 }} numberOfLines={1}>{p.titre}</T><T v="petit">{p.inscrits}/{p.places}</T></View>
            <T v="petit">{dateHeure(p.debut)} · {p.dureeMin} min · {p.hote ? 'tu animes' : `avec ${p.hoteNom}`} · {p.prixFcfa ? `${p.prixFcfa} FCFA la place` : 'gratuit'} · code {p.code}</T>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {p.ouvert ? <Bouton label="Entrer dans la salle" icone="video" petit large={false} variante="ambre" onPress={async () => { try { const s = await entrerCoursPrevu(p.code); entrer({ id: s.id, titre: s.titre }); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
                : <T v="petit" couleur={c.discret}>La salle ouvre 15 minutes avant.</T>}
              {p.hote && <Bouton label="Partager" icone="partage" petit large={false} variante="fantome" onPress={() => partager(p)} />}
              <Bouton label={p.hote ? 'Annuler le cours' : 'Me désinscrire'} petit large={false} variante="fantome" onPress={async () => { await quitterCoursPrevu(p.code).catch(() => {}); charger(); }} />
            </View>
          </View></Carte>
        ))}
    </View>
  );
}

/** Paiement d'une place de cours (Mobile Money), au prix fixé par le tarif des administrateurs ; l'inscription suit la confirmation. */
function PaiementSeance({ cours, onFermer, onPaye }: { cours: CoursPrevu; onFermer: () => void; onPaye: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [modes, setModes] = useState<{ mode: string; operateurs: { id: string; nom: string }[] } | null>(null);
  const [op, setOp] = useState(''), [tel, setTel] = useState(''), [trans, setTrans] = useState('');
  const [pay, setPay] = useState<Paiement | null>(null);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { chargerModesPaiement().then(m => { setModes(m); setOp(m.operateurs[0]?.id ?? ''); }).catch(() => toast('Paiement indisponible pour le moment.', 'erreur')); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pay || ['confirme', 'echoue', 'refuse', 'expire'].includes(pay.statut)) { if (pay?.statut === 'confirme') { toast('Place payée : tu es inscrit.', 'succes'); onPaye(); } return; }
    const t = setInterval(() => lirePaiement(pay.id).then(setPay).catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [pay?.id, pay?.statut]); // eslint-disable-line react-hooks/exhaustive-deps
  const payer = async () => {
    const n = normaliserTelephone(tel); if (!n || !op) { toast('Numéro invalide.', 'erreur'); return; }
    setOccupe(true);
    try { setPay(await creerPaiement(`seance:${cours.code}`, op, n)); } catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); }
  };
  return (
    <Feuille visible onClose={onFermer} titre="Payer ma place">
      <T v="carte">« {cours.titre} » · {cours.prixFcfa} FCFA</T>
      <T v="petit">{dateHeure(cours.debut)} · {cours.dureeMin} min · avec {cours.hoteNom}. Prix fixé par le tarif de Nkala.</T>
      {!pay ? <View style={{ gap: 10, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>{(modes?.operateurs ?? []).map(o => <Puce key={o.id} label={o.nom} actif={op === o.id} onPress={() => setOp(o.id)} />)}</View>
        <Champ valeur={tel} onChange={setTel} placeholder="Numéro Mobile Money" clavier="phone-pad" icone="telephone" />
        <Bouton label={`Payer ${cours.prixFcfa} FCFA`} variante="ambre" charge={occupe} desactive={!tel.trim() || !op} onPress={payer} />
      </View> : <View style={{ gap: 10, marginTop: 10 }}>
        {(pay.instructions.etapes ?? []).map((e, i) => <T key={i} v="corps">{i + 1}. {e}</T>)}
        {pay.statut === 'declare' && <T v="corps">Identifiant reçu : un administrateur vérifie le paiement.</T>}
        {['echoue', 'refuse', 'expire'].includes(pay.statut) && <T v="carte" couleur={c.erreur}>Paiement {pay.statut === 'expire' ? 'expiré' : pay.statut === 'refuse' ? 'refusé' : 'échoué'}.</T>}
        {pay.statut === 'en_attente' && pay.mode !== 'api' && <>
          <Champ valeur={trans} onChange={setTrans} placeholder={pay.mode === 'simulation' ? 'Code de simulation (0000)' : 'Identifiant de la transaction (SMS)'} auto="none" />
          <Bouton label="Valider" desactive={!trans.trim()} onPress={async () => { try { if (pay.mode === 'simulation') await simulerPaiement(pay.id, trans.trim()); else await declarerPaiement(pay.id, trans.trim()); setPay(await lirePaiement(pay.id)); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
        </>}
      </View>}
    </Feuille>
  );
}
