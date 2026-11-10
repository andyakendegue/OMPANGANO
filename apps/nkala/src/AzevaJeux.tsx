/** Moteurs d'Azeva côté écran : pendu, anagrammes, mots mêlés, dictée sonore, quiz, phrases en désordre, grand jeu à dé. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  anagrammeReussie, avancerPlateau, casesEntre, clavierPendu, construireOrdre, construireQcm, genererMotsMeles, jouerLettre, jouable, lancerDe, lettres, melanger, motDeLettres,
  motTrouve, noterDictee, nouveauPendu, nouvelleAnagramme, ordreCorrect, penduGagne, penduMasque, penduPerdu, type CasePlateau, type Ligne, type MotJeu, type Ordre, type Qcm, type QuestionnaireItem,
  chargerClipsAudio, type ClipAudio, type MotsMeles,
} from '@nkala/noyau';
import { Bouton, Carte, Champ, Ecran, Entete, EtatVide, Flamme, Ic, Onde, T, Barre } from './kit';
import { Son } from './OnenjiLecon';
import { useSansPublicite } from './Pub';
import { usePrefs, useTheme } from './Prefs';

export interface ResultatPartie { bonnes: number; erreurs: number; secondesRestantes: number; serie: number }
export interface PropsJeu {
  jeu: Ligne; mots: MotJeu[]; fiches: QuestionnaireItem[]; dialecte: string; couleur: string;
  onFin: (r: ResultatPartie) => void; onQuitter: () => void; onBonne: () => void; onErreur: () => void; coeurs: number;
}

function useCompteArebours(secondes: number, actif: boolean, onFin: () => void) {
  const [reste, setReste] = useState(secondes);
  const fin = useRef(onFin); fin.current = onFin;
  useEffect(() => { setReste(secondes); }, [secondes]);
  useEffect(() => {
    if (!actif || secondes <= 0) return;
    const t = setInterval(() => setReste(r => { if (r <= 1) { clearInterval(t); setTimeout(() => fin.current(), 0); return 0; } return r - 1; }), 1000);
    return () => clearInterval(t);
  }, [actif, secondes]);
  return reste;
}

function Cadre({ titre, avancement, onQuitter, reste, children }: { titre: string; avancement: number; onQuitter: () => void; reste?: number; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Ecran bas={30}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter la partie" hitSlop={10} onPress={onQuitter}><Ic nom="fermer" taille={26} /></Pressable>
        <View style={{ flex: 1 }}><Barre valeur={avancement} couleur={c.modules.azeva} /></View>
        {reste !== undefined && reste > 0 && <T v="carte" couleur={reste <= 10 ? c.erreur : c.fort} accessibilityLabel={`${reste} secondes`}>{reste} s</T>}
      </View>
      <T v="libelle">{titre}</T>
      {children}
    </Ecran>
  );
}

const Retour = ({ ok, texte, onSuite, libelle = 'Suivant' }: { ok: boolean; texte: string; onSuite: () => void; libelle?: string }) => {
  const { c } = useTheme();
  return (<Carte style={{ padding: 16, gap: 10, borderColor: ok ? c.succes : c.erreur }}><T v="sousTitre" couleur={ok ? c.succes : c.erreur} accessibilityRole="alert">{ok ? 'Akéwa ! Bien joué.' : 'Pas cette fois.'}</T><T v="corps">{texte}</T><Bouton label={libelle} variante="ambre" onPress={onSuite} /></Carte>);
};

// ------------------------------------------------------------------ pendu : le feu de veillée
function Pendu(p: PropsJeu) {
  const { c } = useTheme();
  const mots = useMemo(() => melanger(p.mots.filter(motDeLettres)).slice(0, 3), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [jeu, setJeu] = useState(() => (mots[0] ? nouveauPendu(mots[0]) : null));
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const [fini, setFini] = useState<boolean | null>(null);
  const clavier = useMemo(() => (jeu ? clavierPendu(jeu, p.mots) : []), [i]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!jeu) return <Ecran><Entete titre="Le pendu" retour={p.onQuitter} /><EtatVide mascotte titre="Pas assez de mots" texte="Il faut quelques mots de 3 à 12 lettres. Ajoute-en dans la console." /></Ecran>;
  const jouer = (l: string) => {
    if (fini !== null) return;
    const n = jouerLettre(jeu, l); setJeu(n);
    if (penduGagne(n)) { setFini(true); setRes(r => ({ ...r, bonnes: r.bonnes + 1, serie: r.serie + 1 })); p.onBonne(); }
    else if (penduPerdu(n)) { setFini(false); setRes(r => ({ ...r, erreurs: r.erreurs + 1, serie: 0 })); p.onErreur(); }
  };
  const suite = () => { if (i + 1 >= mots.length) return p.onFin({ ...res, secondesRestantes: 0 }); setI(i + 1); setJeu(nouveauPendu(mots[i + 1])); setFini(null); };
  const restant = jeu.erreursMax - jeu.ratees.length;
  return (
    <Cadre titre="Le pendu" avancement={i / mots.length} onQuitter={p.onQuitter}>
      <View style={{ alignItems: 'center', gap: 6 }}><Flamme taille={28 + restant * 10} eteinte={restant <= 0} /><T v="petit">{restant} essai{restant > 1 ? 's' : ''} avant que le feu s'éteigne</T></View>
      <T v="corps" style={{ textAlign: 'center' }}>{jeu.mot.francais}</T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
        {penduMasque(jeu).map((l, k) => <View key={k} style={{ width: 34, height: 44, borderBottomWidth: 3, borderBottomColor: c.accent, alignItems: 'center', justifyContent: 'flex-end' }}><T v="sousTitre">{l === '_' ? '' : l}</T></View>)}
      </View>
      {fini === null ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {clavier.map(l => { const t = jeu.trouvees.includes(l), r = jeu.ratees.includes(l); return (
            <Pressable key={l} accessibilityRole="button" accessibilityLabel={l} disabled={t || r} onPress={() => jouer(l)} style={{ minWidth: 44, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t ? c.succes + '44' : r ? c.erreur + '33' : c.carte, borderWidth: 1, borderColor: c.bord, opacity: r ? 0.5 : 1 }}><T v="carte">{l}</T></Pressable>); })}
        </View>
      ) : <Retour ok={fini} texte={`${jeu.mot.myene} : ${jeu.mot.francais}`} onSuite={suite} libelle={i + 1 >= mots.length ? 'Terminer' : 'Mot suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ anagrammes : lettres en cercle
function Anagrammes(p: PropsJeu) {
  const { c } = useTheme();
  const mots = useMemo(() => melanger(p.mots.filter(motDeLettres)).slice(0, 3), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [a, setA] = useState(() => (mots[0] ? nouvelleAnagramme(mots[0]) : null));
  const [choisis, setChoisis] = useState<number[]>([]);
  const [fini, setFini] = useState<boolean | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0, temps: 0 });
  const limite = Number(p.jeu.duree_s) || 60;
  const reste = useCompteArebours(limite, fini === null, () => { setFini(false); setRes(r => ({ ...r, erreurs: r.erreurs + 1, serie: 0 })); p.onErreur(); });
  if (!a) return <Ecran><Entete titre="Anagrammes" retour={p.onQuitter} /><EtatVide mascotte titre="Pas assez de mots" /></Ecran>;
  const essai = choisis.map(k => a.melange[k]);
  const verifier = (sel: number[]) => {
    const ok = anagrammeReussie({ ...a, essai: sel.map(k => a.melange[k]) });
    if (ok) { setFini(true); setRes(r => ({ ...r, bonnes: r.bonnes + 1, serie: r.serie + 1, temps: r.temps + reste })); p.onBonne(); }
  };
  const suite = () => { if (i + 1 >= mots.length) return p.onFin({ bonnes: res.bonnes, erreurs: res.erreurs, serie: res.serie, secondesRestantes: Math.round(res.temps / Math.max(1, res.bonnes)) }); setI(i + 1); setA(nouvelleAnagramme(mots[i + 1])); setChoisis([]); setFini(null); };
  const R = 92, n = a.melange.length;
  return (
    <Cadre titre="Anagrammes" avancement={i / mots.length} onQuitter={p.onQuitter} reste={fini === null ? reste : undefined}>
      <T v="corps" style={{ textAlign: 'center' }}>Remets les lettres en ordre : « {a.mot.francais} »</T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap', minHeight: 52 }}>
        {essai.map((l, k) => <View key={k} style={{ width: 38, height: 46, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><T v="sousTitre" couleur={c.surAccent}>{l}</T></View>)}
      </View>
      <View style={{ width: 2 * R + 60, height: 2 * R + 60, alignSelf: 'center' }}>
        {a.melange.map((l, k) => { const ang = (k / n) * 2 * Math.PI - Math.PI / 2, on = choisis.includes(k); return (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={l} disabled={on || fini !== null} onPress={() => { const s = [...choisis, k]; setChoisis(s); if (s.length === n) verifier(s); }}
            style={{ position: 'absolute', left: R + 30 + R * Math.cos(ang) - 26, top: R + 30 + R * Math.sin(ang) - 26, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.squelette : c.carte, borderWidth: 2, borderColor: on ? c.bord : c.modules.azeva }}><T v="sousTitre">{l}</T></Pressable>); })}
      </View>
      {fini === null && <View style={{ flexDirection: 'row', gap: 10 }}><Bouton label="Effacer" variante="fantome" petit large={false} onPress={() => setChoisis([])} /><Bouton label="Annuler la dernière" variante="fantome" petit large={false} onPress={() => setChoisis(s => s.slice(0, -1))} /></View>}
      {fini === null && choisis.length === n && !anagrammeReussie({ ...a, essai }) && <T v="corps" couleur={c.erreur}>Ce n'est pas encore ça. Efface et réessaie.</T>}
      {fini !== null && <Retour ok={fini} texte={`${a.mot.myene} : ${a.mot.francais}`} onSuite={suite} libelle={i + 1 >= mots.length ? 'Terminer' : 'Suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ mots mêlés
function MotsMelesJeu(p: PropsJeu) {
  const { c } = useTheme();
  const g = useMemo<MotsMeles>(() => genererMotsMeles(p.mots.filter(motDeLettres), 9), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [debut, setDebut] = useState<[number, number] | null>(null);
  const [trouves, setTrouves] = useState<string[]>([]);
  const [fautes, setFautes] = useState(0);
  const limite = Number(p.jeu.duree_s) || 0;
  const reste = useCompteArebours(limite, trouves.length < g.mots.length, () => p.onFin({ bonnes: trouves.length, erreurs: fautes, serie: 0, secondesRestantes: 0 }));
  const cases = new Set(g.mots.filter(m => trouves.includes(m.mot)).flatMap(m => m.cases.map(x => x.join(','))));
  if (g.mots.length === 0) return <Ecran><Entete titre="Mots mêlés" retour={p.onQuitter} /><EtatVide mascotte titre="Pas assez de mots" /></Ecran>;
  const toucher = (r: number, k: number) => {
    if (!debut) { setDebut([r, k]); return; }
    const sel = casesEntre(debut, [r, k]); setDebut(null);
    const m = sel && motTrouve(g, sel);
    if (m && !trouves.includes(m)) { const t = [...trouves, m]; setTrouves(t); p.onBonne(); if (t.length === g.mots.length) setTimeout(() => p.onFin({ bonnes: t.length, erreurs: fautes, serie: t.length, secondesRestantes: reste }), 600); }
    else if (sel && sel.length > 1) { setFautes(f => f + 1); }
  };
  return (
    <Cadre titre="Mots mêlés" avancement={trouves.length / g.mots.length} onQuitter={p.onQuitter} reste={limite ? reste : undefined}>
      <T v="petit">Touche la première lettre, puis la dernière lettre d'un mot.</T>
      <View style={{ alignSelf: 'center', gap: 3 }}>
        {g.grille.map((ligne, r) => <View key={r} style={{ flexDirection: 'row', gap: 3 }}>{ligne.map((l, k) => { const on = debut?.[0] === r && debut?.[1] === k, trouve = cases.has(`${r},${k}`); return (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${l}, ligne ${r + 1}, colonne ${k + 1}`} onPress={() => toucher(r, k)} style={{ width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: trouve ? c.succes + '55' : on ? c.accent : c.carte, borderWidth: 1, borderColor: c.bord }}><T v="carte" couleur={on ? c.surAccent : c.fort}>{l.toUpperCase()}</T></Pressable>); })}</View>)}
      </View>
      <View style={{ gap: 6 }}>{g.mots.map(m => <View key={m.mot} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ic nom={trouves.includes(m.mot) ? 'ok' : 'etoile'} taille={16} couleur={trouves.includes(m.mot) ? c.succes : c.discret} /><T v="corps" style={trouves.includes(m.mot) ? { textDecorationLine: 'line-through' } : null}>{trouves.includes(m.mot) ? m.mot : m.francais}</T></View>)}</View>
    </Cadre>
  );
}

// ------------------------------------------------------------------ dictée sonore
function Dictee(p: PropsJeu) {
  const { c } = useTheme();
  const [clips, setClips] = useState<ClipAudio[] | null>(null);
  const [i, setI] = useState(0);
  const [saisie, setSaisie] = useState('');
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  useEffect(() => { chargerClipsAudio(p.dialecte, 12).then(l => setClips(l.filter(x => lettres(x.myeneText).length <= 14).slice(0, 5))).catch(() => setClips([])); }, [p.dialecte]);
  if (!clips) return <Ecran><Entete titre="Dictée sonore" retour={p.onQuitter} /><T v="corps">Chargement des voix…</T></Ecran>;
  if (clips.length === 0) return <Ecran><Entete titre="Dictée sonore" retour={p.onQuitter} /><EtatVide mascotte titre="Pas encore de voix" texte={`Il faut des enregistrements validés en ${p.dialecte}. Essaie un autre jeu ou un autre dialecte.`} /></Ecran>;
  const clip = clips[i];
  const verifier = () => { const n = noterDictee(clip.myeneText, saisie); const ok = n.note >= 0.85; setRetour({ ok, texte: `${clip.myeneText} — ${clip.frenchText}` }); setRes(r => ({ bonnes: r.bonnes + (ok ? 1 : 0), erreurs: r.erreurs + (ok ? 0 : 1), serie: ok ? r.serie + 1 : 0 })); ok ? p.onBonne() : p.onErreur(); };
  const suite = () => { if (i + 1 >= clips.length) return p.onFin({ ...res, secondesRestantes: 0 }); setI(i + 1); setSaisie(''); setRetour(null); };
  return (
    <Cadre titre="Dictée sonore" avancement={i / clips.length} onQuitter={p.onQuitter}>
      <View style={{ alignItems: 'center', gap: 12 }}><Son audio={clip.audioUrl} auto grand /><T v="petit">Écoute, puis écris ce que tu entends.</T></View>
      <Champ valeur={saisie} onChange={setSaisie} placeholder="Écris le mot ou la phrase" onSubmit={retour ? undefined : verifier} />
      {!retour ? <Bouton label="Vérifier" desactive={!saisie.trim()} onPress={verifier} /> : <Retour ok={retour.ok} texte={retour.texte} onSuite={suite} />}
      <T v="petit" couleur={c.discret}>Les accents comptent un peu : un accent manquant donne un demi-point.</T>
    </Cadre>
  );
}

// ------------------------------------------------------------------ quiz et phrases en désordre (fiches du corpus)
function QuizOrdre(p: PropsJeu & { moteur: 'qcm' | 'ordre' }) {
  const { c } = useTheme();
  const [q, setQ] = useState<{ qcm?: Qcm; ordre?: Ordre } | null>(null);
  const [n, setN] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [mots, setMots] = useState<number[]>([]);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const TOTAL = 5;
  const pool = useRef<QuestionnaireItem[]>(melanger(p.fiches.filter(jouable)));
  const prochaine = useCallback(() => {
    setChoisi(null); setMots([]); setRetour(null);
    for (let essai = 0; essai < 30; essai++) {
      const f = pool.current.pop(); if (!f) break;
      if (p.moteur === 'qcm') { const x = construireQcm(f, pool.current.length ? pool.current : p.fiches); if (x) return setQ({ qcm: x }); }
      else { const x = construireOrdre(f); if (x) return setQ({ ordre: x }); }
    }
    setQ(null);
  }, [p.moteur, p.fiches]);
  useEffect(() => { prochaine(); }, [prochaine]);
  if (!q) return <Ecran><Entete titre="Jeu" retour={p.onQuitter} /><EtatVide mascotte titre="Pas assez de fiches" texte={`Pas assez de fiches ${p.dialecte} pour ce jeu. Télécharge le catalogue depuis le mode hors ligne.`} /></Ecran>;
  const repondre = (ok: boolean, bonne: string) => { if (retour) return; setRetour({ ok, texte: ok ? '' : `Réponse : ${bonne}` }); setRes(r => ({ bonnes: r.bonnes + (ok ? 1 : 0), erreurs: r.erreurs + (ok ? 0 : 1), serie: ok ? r.serie + 1 : 0 })); ok ? p.onBonne() : p.onErreur(); };
  const suite = () => { if (n + 1 >= TOTAL) return p.onFin({ ...res, secondesRestantes: 0 }); setN(n + 1); prochaine(); };
  return (
    <Cadre titre={p.moteur === 'qcm' ? 'Quiz des mots' : 'Phrases en désordre'} avancement={n / TOTAL} onQuitter={p.onQuitter}>
      {q.qcm && <>
        <T v="sousTitre">{q.qcm.enonce}</T>
        {q.qcm.options.map((o, i) => { const bon = i === q.qcm!.bonne; return (
          <Pressable key={i} accessibilityRole="button" disabled={!!retour} onPress={() => { setChoisi(i); repondre(bon, q.qcm!.options[q.qcm!.bonne]); }} style={{ minHeight: 56, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 2, backgroundColor: retour && bon ? c.succes + '33' : retour && choisi === i ? c.erreur + '33' : c.carte, borderColor: retour && bon ? c.succes : retour && choisi === i ? c.erreur : c.bord }}><T v="corps" fort>{o}</T></Pressable>); })}
      </>}
      {q.ordre && <>
        <T v="sousTitre">{q.ordre.enonce}</T>
        <Carte plat style={{ minHeight: 70, padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{mots.map((idx, k) => <Pressable key={k} disabled={!!retour} onPress={() => setMots(m => m.filter((_, j) => j !== k))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: c.accent }}><T v="corps" couleur={c.surAccent}>{q.ordre!.mots[idx]}</T></Pressable>)}</Carte>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{q.ordre.mots.map((m, idx) => !mots.includes(idx) && <Pressable key={idx} disabled={!!retour} onPress={() => setMots(a => [...a, idx])} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}><T v="corps">{m}</T></Pressable>)}</View>
        {!retour && mots.length === q.ordre.mots.length && <Bouton label="Vérifier" onPress={() => repondre(ordreCorrect(mots.map(i => q.ordre!.mots[i]), q.ordre!), q.ordre!.solution.join(' '))} />}
      </>}
      {retour && <Retour ok={retour.ok} texte={retour.texte} onSuite={suite} libelle={n + 1 >= TOTAL ? 'Terminer' : 'Suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ le grand jeu : plateau et dé (crédits de jeu fictifs, jamais achetables)
function GrandJeu(p: PropsJeu & { cases: CasePlateau[] }) {
  const { c } = useTheme();
  const cases = useMemo(() => [...p.cases].sort((a, b) => a.position - b.position), [p.cases]);
  const [etat, setEtat] = useState({ position: 0, tours: 0, fini: false, credits: 100 });
  const [de, setDe] = useState<number | null>(null);
  const [carte, setCarte] = useState<CasePlateau | null>(null);
  const [qcm, setQcm] = useState<Qcm | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0 });
  const pool = useRef(melanger(p.fiches.filter(jouable)));
  if (cases.length === 0) return <Ecran><Entete titre="Le grand jeu" retour={p.onQuitter} /><EtatVide mascotte titre="Plateau en préparation" texte="Ajoute les cases du plateau dans la console (collection « plateau »)." /></Ecran>;
  const lancer = () => {
    const d = lancerDe(); setDe(d);
    const r = avancerPlateau(etat, d, cases); setEtat(r.etat); setCarte(r.case);
    if (r.case?.type === 'question') { const f = pool.current.pop(); const q = f ? construireQcm(f, pool.current.length ? pool.current : p.fiches) : null; setQcm(q); }
    else setQcm(null);
    if (r.etat.fini) setTimeout(() => p.onFin({ bonnes: res.bonnes, erreurs: res.erreurs, serie: res.bonnes, secondesRestantes: 0 }), 1200);
  };
  const reponse = (i: number) => { if (!qcm) return; const ok = i === qcm.bonne; setRes(r => ({ bonnes: r.bonnes + (ok ? 1 : 0), erreurs: r.erreurs + (ok ? 0 : 1) })); setEtat(e => ({ ...e, credits: e.credits + (ok ? 10 : -5) })); ok ? p.onBonne() : p.onErreur(); setQcm(null); };
  const derniere = cases[cases.length - 1].position;
  return (
    <Cadre titre="Le grand jeu" avancement={etat.position / derniere} onQuitter={p.onQuitter}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="corps">Case {etat.position} / {derniere}</T><T v="corps" couleur={c.accent}>{etat.credits} crédits de jeu</T></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {cases.map(k => <View key={k.position} accessibilityLabel={`Case ${k.position}, ${k.type}`} style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: etat.position === k.position ? c.modules.azeva : c.carte, borderWidth: 1, borderColor: c.bord }}><T v="petit" couleur={etat.position === k.position ? '#170D08' : c.fort}>{k.type === 'arrivee' ? '★' : k.type === 'question' ? '?' : k.type === 'bonus' ? '+' : k.type === 'recul' ? '−' : k.type === 'proverbe' ? '“' : k.position}</T></View>)}
      </View>
      {de !== null && <View style={{ alignItems: 'center' }}><View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: c.fort, alignItems: 'center', justifyContent: 'center' }}><T v="titre" couleur={c.fond}>{de}</T></View></View>}
      {carte?.texte ? <Carte style={{ padding: 14 }}><T v="corps">{carte.texte}</T></Carte> : null}
      {qcm && <><T v="sousTitre">{qcm.enonce}</T>{qcm.options.map((o, i) => <Pressable key={i} accessibilityRole="button" onPress={() => reponse(i)} style={{ minHeight: 52, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}><T v="corps" fort>{o}</T></Pressable>)}</>}
      {!qcm && !etat.fini && <Bouton label="Lancer le dé" icone="de" variante="ambre" onPress={lancer} />}
      {etat.fini && <T v="sousTitre" style={{ textAlign: 'center' }}>Tu es arrivé !</T>}
      <T v="petit">Les crédits de jeu sont fictifs : ils ne s'achètent pas et ne valent rien en argent.</T>
    </Cadre>
  );
}

/** Choisit le bon moteur pour un jeu. Aucune publicité pendant une partie. */
export function JeuRunner(p: PropsJeu & { cases: CasePlateau[] }) {
  useSansPublicite(true);
  const { prefs } = usePrefs();
  void prefs;
  switch (p.jeu.moteur) {
    case 'pendu': return <Pendu {...p} />;
    case 'anagramme': return <Anagrammes {...p} />;
    case 'mots_meles': return <MotsMelesJeu {...p} />;
    case 'dictee': return <Dictee {...p} />;
    case 'qcm': return <QuizOrdre {...p} moteur="qcm" />;
    case 'ordre': return <QuizOrdre {...p} moteur="ordre" />;
    case 'plateau': return <GrandJeu {...p} />;
    default: return <Ecran><Entete titre={String(p.jeu.titre)} retour={p.onQuitter} /><EtatVide mascotte titre="Bientôt" texte="Ce jeu arrive prochainement." /></Ecran>;
  }
}
void Onde;
