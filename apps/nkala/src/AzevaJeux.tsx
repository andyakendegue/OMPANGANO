/**
 * Moteurs d'Azeva côté écran, première partie : Ogoni (feu de bois), anagrammes, mots mêlés, dictée sonore, quiz, phrases en désordre, grand jeu à dé.
 * Aucun contenu ici : chaque moteur joue la manche servie par le serveur (mots, fiches, cases) avec les réglages du niveau choisi.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  anagrammeReussie, avancerPlateau, casesEntre, clavierPendu, construireOrdre, construireQcm, genererMotsMeles, jouerLettre, lancerDe, lettres, melanger, motDeLettres,
  motTrouve, noterDictee, nouveauPendu, nouvelleAnagramme, ordreCorrect, penduGagne, penduMasque, penduPerdu, type CasePlateau, type Ligne, type Manche, type Ordre, type Qcm, type QuestionnaireItem,
  chargerClipsAudio, type ClipAudio, type MotsMeles,
} from '@nkala/noyau';
import { Bouton, Carte, Champ, Ecran, Entete, Ic, T } from './kit';
import { AideCtx, Cadre, Retour, SansContenu, useCompteArebours, type PropsJeu } from './AzevaCadre';
import { AideJeu, useAideJeu } from './AzevaAide';
export type { PropsJeu, ResultatPartie } from './AzevaCadre';
import { FeuDeBois } from './FeuDeBois';
import { Son } from './OnenjiLecon';
import { useSansPublicite } from './Pub';
import { useTheme } from './Prefs';
import { JeuSuite } from './AzevaJeux2';

const fiches = (m: Manche): QuestionnaireItem[] => m.fiches.map(f => ({ id: f.id, myeneText: f.myene, frenchText: f.francais, dialect: 'x', status: 'active' }) as unknown as QuestionnaireItem);

// ------------------------------------------------------------------ Ogoni : le feu de bois de la veillée
function Ogoni(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const mots = useMemo(() => melanger(p.manche.mots.filter(motDeLettres)).slice(0, R.questions), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [jeu, setJeu] = useState(() => (mots[0] ? nouveauPendu(mots[0], R.erreursMax) : null));
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const [fini, setFini] = useState<boolean | null>(null);
  const clavier = useMemo(() => (jeu ? clavierPendu(jeu, p.manche.mots, Math.random, 12 + Math.min(10, Math.floor(R.niveau / 80))) : []), [i]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!jeu) return <SansContenu titre={String(p.jeu.titre)} onQuitter={p.onQuitter} texte="Il faut quelques mots de 3 à 12 lettres publiés sur le serveur." />;
  const jouer = (l: string) => {
    if (fini !== null) return;
    const n = jouerLettre(jeu, l); setJeu(n);
    if (penduGagne(n)) { setFini(true); setRes(r => ({ ...r, bonnes: r.bonnes + 1, serie: r.serie + 1 })); p.onBonne(); }
    else if (penduPerdu(n)) { setFini(false); setRes(r => ({ ...r, erreurs: r.erreurs + 1, serie: 0 })); p.onErreur(); }
  };
  const suite = () => { if (i + 1 >= mots.length) return p.onFin({ ...res, secondesRestantes: 0 }); setI(i + 1); setJeu(nouveauPendu(mots[i + 1], R.erreursMax)); setFini(null); };
  const restant = jeu.erreursMax - jeu.ratees.length;
  return (
    <Cadre titre={String(p.jeu.titre)} niveau={R.titre} avancement={i / mots.length} onQuitter={p.onQuitter}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <FeuDeBois total={jeu.erreursMax} restant={restant} largeur={220} />
        <T v="petit">{restant > 0 ? `${restant} bûche${restant > 1 ? 's' : ''} : chaque lettre ratée en fait tomber une` : 'Le feu s\'est éteint.'}</T>
      </View>
      <T v="corps" style={{ textAlign: 'center' }}>{jeu.mot.francais}</T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
        {penduMasque(jeu).map((l, k) => <View key={k} style={{ width: 30, height: 42, borderBottomWidth: 3, borderBottomColor: c.accent, alignItems: 'center', justifyContent: 'flex-end' }}><T v="sousTitre">{l === '_' ? (fini === false ? lettres(jeu.mot.myene)[k] : '') : l}</T></View>)}
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
  const R = p.manche.regles;
  const mots = useMemo(() => melanger(p.manche.mots.filter(motDeLettres)).slice(0, R.questions), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [a, setA] = useState(() => (mots[0] ? nouvelleAnagramme(mots[0]) : null));
  const [choisis, setChoisis] = useState<number[]>([]);
  const [fini, setFini] = useState<boolean | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0, temps: 0 });
  const reste = useCompteArebours(R.dureeS, fini === null && !!a, () => { setFini(false); setRes(r => ({ ...r, erreurs: r.erreurs + 1, serie: 0 })); p.onErreur(); });
  if (!a) return <SansContenu titre={String(p.jeu.titre)} onQuitter={p.onQuitter} />;
  const essai = choisis.map(k => a.melange[k]);
  const verifier = (sel: number[]) => {
    const ok = anagrammeReussie({ ...a, essai: sel.map(k => a.melange[k]) });
    if (ok) { setFini(true); setRes(r => ({ ...r, bonnes: r.bonnes + 1, serie: r.serie + 1, temps: r.temps + reste })); p.onBonne(); }
  };
  const suite = () => { if (i + 1 >= mots.length) return p.onFin({ bonnes: res.bonnes, erreurs: res.erreurs, serie: res.serie, secondesRestantes: Math.round(res.temps / Math.max(1, res.bonnes)) }); setI(i + 1); setA(nouvelleAnagramme(mots[i + 1])); setChoisis([]); setFini(null); };
  const Rr = 92, n = a.melange.length;
  return (
    <Cadre titre={String(p.jeu.titre)} niveau={R.titre} avancement={i / mots.length} onQuitter={p.onQuitter} reste={fini === null && R.dureeS ? reste : undefined}>
      <T v="corps" style={{ textAlign: 'center' }}>Remets les lettres en ordre : « {a.mot.francais} »</T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap', minHeight: 52 }}>
        {essai.map((l, k) => <View key={k} style={{ width: 38, height: 46, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><T v="sousTitre" couleur={c.surAccent}>{l}</T></View>)}
      </View>
      <View style={{ width: 2 * Rr + 60, height: 2 * Rr + 60, alignSelf: 'center' }}>
        {a.melange.map((l, k) => { const ang = (k / n) * 2 * Math.PI - Math.PI / 2, on = choisis.includes(k); return (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={l} disabled={on || fini !== null} onPress={() => { const s = [...choisis, k]; setChoisis(s); if (s.length === n) verifier(s); }}
            style={{ position: 'absolute', left: Rr + 30 + Rr * Math.cos(ang) - 26, top: Rr + 30 + Rr * Math.sin(ang) - 26, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.squelette : c.carte, borderWidth: 2, borderColor: on ? c.bord : c.modules.azeva }}><T v="sousTitre">{l}</T></Pressable>); })}
      </View>
      {fini === null && <View style={{ flexDirection: 'row', gap: 10 }}><Bouton label="Effacer" variante="fantome" petit large={false} onPress={() => setChoisis([])} /><Bouton label="Annuler la dernière" variante="fantome" petit large={false} onPress={() => setChoisis(s => s.slice(0, -1))} /></View>}
      {fini === null && choisis.length === n && !anagrammeReussie({ ...a, essai }) && <T v="corps" couleur={c.erreur}>Ce n'est pas encore ça. Efface et réessaie.</T>}
      {fini !== null && <Retour ok={fini} texte={`${a.mot.myene} : ${a.mot.francais}`} onSuite={suite} libelle={i + 1 >= mots.length ? 'Terminer' : 'Suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ mots mêlés
const HUIT: [number, number][] = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
function MotsMelesJeu(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  // Niveau 1 : horizontal et vertical ; niveau 2 : diagonales ; niveau 3 et plus : mots à l'envers aussi.
  const g = useMemo<MotsMeles>(() => genererMotsMeles(melanger(p.manche.mots.filter(motDeLettres)).slice(0, R.questions), R.taille, Math.random, HUIT.slice(0, R.niveau <= 100 ? 2 : R.niveau <= 350 ? 4 : 8)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [debut, setDebut] = useState<[number, number] | null>(null);
  const [trouves, setTrouves] = useState<string[]>([]);
  const [fautes, setFautes] = useState(0);
  const reste = useCompteArebours(R.dureeS, trouves.length < g.mots.length, () => p.onFin({ bonnes: trouves.length, erreurs: fautes + (g.mots.length - trouves.length), serie: 0, secondesRestantes: 0 }));
  const cases = new Set(g.mots.filter(m => trouves.includes(m.mot)).flatMap(m => m.cases.map(x => x.join(','))));
  if (g.mots.length === 0) return <SansContenu titre={String(p.jeu.titre)} onQuitter={p.onQuitter} />;
  const toucher = (r: number, k: number) => {
    if (!debut) { setDebut([r, k]); return; }
    const sel = casesEntre(debut, [r, k]); setDebut(null);
    const m = sel && motTrouve(g, sel);
    if (m && !trouves.includes(m)) { const t = [...trouves, m]; setTrouves(t); p.onBonne(); if (t.length === g.mots.length) setTimeout(() => p.onFin({ bonnes: t.length, erreurs: fautes, serie: t.length, secondesRestantes: reste }), 600); }
    else if (sel && sel.length > 1) { setFautes(f => f + 1); }
  };
  const cote = Math.min(34, Math.floor(318 / g.taille));
  return (
    <Cadre titre={String(p.jeu.titre)} niveau={R.titre} avancement={trouves.length / g.mots.length} onQuitter={p.onQuitter} reste={R.dureeS ? reste : undefined}>
      <T v="petit">Touche la première lettre, puis la dernière lettre d'un mot.</T>
      <View style={{ alignSelf: 'center', gap: 3 }}>
        {g.grille.map((ligne, r) => <View key={r} style={{ flexDirection: 'row', gap: 3 }}>{ligne.map((l, k) => { const on = debut?.[0] === r && debut?.[1] === k, trouve = cases.has(`${r},${k}`); return (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${l}, ligne ${r + 1}, colonne ${k + 1}`} onPress={() => toucher(r, k)} style={{ width: cote, height: cote, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: trouve ? c.succes + '55' : on ? c.accent : c.carte, borderWidth: 1, borderColor: c.bord }}><T v={cote < 28 ? 'petit' : 'carte'} fort couleur={on ? c.surAccent : c.fort}>{l.toUpperCase()}</T></Pressable>); })}</View>)}
      </View>
      <View style={{ gap: 6 }}>{g.mots.map(m => <View key={m.mot} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ic nom={trouves.includes(m.mot) ? 'ok' : 'etoile'} taille={16} couleur={trouves.includes(m.mot) ? c.succes : c.discret} /><T v="corps" style={trouves.includes(m.mot) ? { textDecorationLine: 'line-through' } : null}>{trouves.includes(m.mot) || R.niveau <= 150 ? `${m.mot} · ${m.francais}` : m.francais}</T></View>)}</View>
    </Cadre>
  );
}

// ------------------------------------------------------------------ dictée sonore (voix validées de locuteurs, servies par le serveur)
function Dictee(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const [clips, setClips] = useState<ClipAudio[] | null>(null);
  const [i, setI] = useState(0);
  const [saisie, setSaisie] = useState('');
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const longueur = 8 + Math.floor(R.niveau / 25);
  useEffect(() => { chargerClipsAudio(p.dialecte, 30).then(l => setClips(l.filter(x => lettres(x.myeneText).length <= longueur).slice(0, R.questions))).catch(() => setClips([])); }, [p.dialecte]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!clips) return <Ecran><Entete titre={String(p.jeu.titre)} retour={p.onQuitter} /><T v="corps">Chargement des voix…</T></Ecran>;
  if (clips.length === 0) return <SansContenu titre={String(p.jeu.titre)} onQuitter={p.onQuitter} texte={`Il faut des enregistrements validés en ${p.dialecte} (et un compte pour les écouter). Essaie un autre jeu ou un autre dialecte.`} />;
  const clip = clips[i];
  const seuil = R.niveau > 600 ? 1 : R.niveau > 200 ? 0.92 : 0.85;
  const verifier = () => { const n = noterDictee(clip.myeneText, saisie); const ok = n.note >= seuil; setRetour({ ok, texte: `${clip.myeneText} — ${clip.frenchText}` }); setRes(r => ({ bonnes: r.bonnes + (ok ? 1 : 0), erreurs: r.erreurs + (ok ? 0 : 1), serie: ok ? r.serie + 1 : 0 })); ok ? p.onBonne() : p.onErreur(); };
  const suite = () => { if (i + 1 >= clips.length) return p.onFin({ ...res, secondesRestantes: 0 }); setI(i + 1); setSaisie(''); setRetour(null); };
  return (
    <Cadre titre={String(p.jeu.titre)} niveau={R.titre} avancement={i / clips.length} onQuitter={p.onQuitter}>
      <View style={{ alignItems: 'center', gap: 12 }}><Son audio={clip.audioUrl} auto grand /><T v="petit">Écoute, puis écris ce que tu entends.</T></View>
      <Champ valeur={saisie} onChange={setSaisie} placeholder="Écris le mot ou la phrase" onSubmit={retour ? undefined : verifier} />
      {!retour ? <Bouton label="Vérifier" desactive={!saisie.trim()} onPress={verifier} /> : <Retour ok={retour.ok} texte={retour.texte} onSuite={suite} />}
      <T v="petit" couleur={c.discret}>{R.niveau > 600 ? 'À ce niveau, chaque accent compte.' : 'Les accents comptent un peu : un accent manquant donne un demi-point.'}</T>
    </Cadre>
  );
}

// ------------------------------------------------------------------ quiz et phrases en désordre (fiches du corpus tirées par le serveur)
function QuizOrdre(p: PropsJeu & { moteur: 'qcm' | 'ordre' }) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const toutes = useMemo(() => fiches(p.manche), [p.manche]);
  const [q, setQ] = useState<{ qcm?: Qcm; ordre?: Ordre } | null>(null);
  const [n, setN] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [mots, setMots] = useState<number[]>([]);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const TOTAL = R.questions;
  const pool = useRef<QuestionnaireItem[]>(melanger(toutes));
  const reste = useCompteArebours(R.dureeS, !!q, () => p.onFin({ ...res, erreurs: res.erreurs + Math.max(0, TOTAL - n), secondesRestantes: 0 }));
  const prochaine = useCallback(() => {
    setChoisi(null); setMots([]); setRetour(null);
    for (let essai = 0; essai < 40; essai++) {
      const f = pool.current.pop(); if (!f) break;
      if (p.moteur === 'qcm') { const x = construireQcm(f, toutes, R.options); if (x) return setQ({ qcm: x }); }
      else { const x = construireOrdre(f); if (x && x.solution.length <= 4 + Math.floor(R.niveau / 150)) return setQ({ ordre: x }); }
    }
    setQ(null);
  }, [p.moteur, toutes, R.options, R.niveau]);
  useEffect(() => { prochaine(); }, [prochaine]);
  if (!q) return n > 0 ? <Ecran><Entete titre={String(p.jeu.titre)} retour={p.onQuitter} /><Bouton label="Terminer" onPress={() => p.onFin({ ...res, secondesRestantes: 0 })} /></Ecran>
    : <SansContenu titre={String(p.jeu.titre)} onQuitter={p.onQuitter} texte={`Pas assez de fiches ${p.dialecte} validées sur le serveur pour ce jeu.`} />;
  const repondre = (ok: boolean, bonne: string) => { if (retour) return; setRetour({ ok, texte: ok ? '' : `Réponse : ${bonne}` }); setRes(r => ({ bonnes: r.bonnes + (ok ? 1 : 0), erreurs: r.erreurs + (ok ? 0 : 1), serie: ok ? r.serie + 1 : 0 })); ok ? p.onBonne() : p.onErreur(); };
  const suite = () => { if (n + 1 >= TOTAL) return p.onFin({ ...res, secondesRestantes: R.dureeS ? reste : 0 }); setN(n + 1); prochaine(); };
  return (
    <Cadre titre={String(p.jeu.titre)} niveau={R.titre} avancement={n / TOTAL} onQuitter={p.onQuitter} reste={R.dureeS ? reste : undefined}>
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
function GrandJeu(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const cases = useMemo(() => [...(p.manche.cases as CasePlateau[])].sort((a, b) => a.position - b.position), [p.manche.cases]);
  const toutes = useMemo(() => fiches(p.manche), [p.manche]);
  const [etat, setEtat] = useState({ position: 0, tours: 0, fini: false, credits: 100 });
  const [de, setDe] = useState<number | null>(null);
  const [carte, setCarte] = useState<CasePlateau | null>(null);
  const [qcm, setQcm] = useState<Qcm | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0 });
  const pool = useRef(melanger(toutes));
  if (cases.length === 0) return <SansContenu titre={String(p.jeu.titre)} onQuitter={p.onQuitter} texte="Le plateau n'est pas encore publié sur le serveur (collection « plateau »)." />;
  const question = (): Qcm | null => {
    const f = pool.current.pop();
    if (f) { const x = construireQcm(f, toutes, R.options); if (x) return x; }
    // Sans fiche du corpus : question tirée des mots de la manche.
    const m = melanger(p.manche.mots)[0]; if (!m) return null;
    const faux = melanger(p.manche.mots.filter(x => x.id !== m.id && x.myene !== m.myene)).slice(0, R.options - 1).map(x => x.myene);
    if (!faux.length) return null;
    const options = melanger([m.myene, ...faux]);
    return { fiche: {} as QuestionnaireItem, enonce: m.francais, options, bonne: options.indexOf(m.myene) };
  };
  const lancer = () => {
    const d = lancerDe(); setDe(d);
    const r = avancerPlateau(etat, d, cases); setEtat(r.etat); setCarte(r.case);
    setQcm(r.case?.type === 'question' || (R.niveau > 500 && r.case?.type === 'neutre') ? question() : null);
    if (r.etat.fini) setTimeout(() => p.onFin({ bonnes: res.bonnes, erreurs: res.erreurs, serie: res.bonnes, secondesRestantes: 0 }), 1200);
  };
  const reponse = (i: number) => {
    if (!qcm) return; const ok = i === qcm.bonne;
    setRes(r => ({ bonnes: r.bonnes + (ok ? 1 : 0), erreurs: r.erreurs + (ok ? 0 : 1) }));
    // Aux niveaux élevés, une mauvaise réponse fait aussi reculer.
    setEtat(e => ({ ...e, credits: e.credits + (ok ? 10 : -5 - Math.floor(R.niveau / 100)), position: ok ? e.position : Math.max(0, e.position - Math.floor(R.niveau / 350)) }));
    ok ? p.onBonne() : p.onErreur(); setQcm(null);
  };
  const derniere = cases[cases.length - 1].position;
  return (
    <Cadre titre={String(p.jeu.titre)} niveau={R.titre} avancement={etat.position / derniere} onQuitter={p.onQuitter}>
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

/** Choisit le bon moteur pour un jeu, et lui attache sa fenêtre « Comment jouer » (ouverte à la première partie, puis par le « ? »). Aucune publicité pendant une partie. */
export function JeuRunner(p: PropsJeu) {
  useSansPublicite(true);
  const aide = useAideJeu(String(p.manche.moteur));
  return (
    <AideCtx.Provider value={{ ouvrir: aide.ouvrir, ouverte: aide.ouverte }}>
      <Moteur {...p} />
      <AideJeu jeu={p.jeu} moteur={String(p.manche.moteur)} regles={p.manche.regles} visible={aide.ouverte} onFermer={aide.fermer} />
    </AideCtx.Provider>
  );
}
function Moteur(p: PropsJeu) {
  switch (p.manche.moteur) {
    case 'ogoni':
    case 'pendu': return <Ogoni {...p} />;
    case 'anagramme': return <Anagrammes {...p} />;
    case 'mots_meles': return <MotsMelesJeu {...p} />;
    case 'dictee': return <Dictee {...p} />;
    case 'qcm': return <QuizOrdre {...p} moteur="qcm" />;
    case 'ordre': return <QuizOrdre {...p} moteur="ordre" />;
    case 'plateau': return <GrandJeu {...p} />;
    default: return <JeuSuite {...p} />;
  }
}
