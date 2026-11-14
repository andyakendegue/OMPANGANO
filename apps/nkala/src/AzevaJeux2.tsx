/**
 * Moteurs d'Azeva côté écran, seconde partie : mots croisés et fléchés, mémoire, syllabes, questions (quiz, phrase à trous, compter,
 * suites de formes), paires à relier, classement, suites à ordonner, rythme, zones à toucher, chemin.
 * Aucun contenu ici : tout vient de la manche servie par le serveur.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';
import {
  casesDuMot, clavierGrille, couperTrou, estJetonForme, genererGrilleMots, lireDirection, lireJeton, lireRythme, lireSuiteFormes, melanger, motDeLettres, motGrilleReussi, motsEnItems,
  nombreACompter, nouveauClasser, nouveauRelier, nouvelleMemoire, nouvellesSuites, nouvellesSyllabes, positionZone, questionItem, reponseEcriteJuste, resoudreMedia, rythmeJuste, suiteReussie,
  syllabesReussies, tracerChemin, PAS, type Direction, type Frappe, type ItemJeu, type Jeton, type QuestionItem,
} from '@nkala/noyau';
import { Cadre, Choix, Retour, SansContenu, useCompteArebours, type PropsJeu } from './AzevaCadre';
import { Bouton, Carte, Champ, Ic, T } from './kit';
import { Son } from './OnenjiLecon';
import { useTheme } from './Prefs';
import { jouerSon } from './sons';

const titre = (p: PropsJeu) => String(p.jeu.titre);
const son = (ok: boolean) => { try { jouerSon(ok ? 'succes' : 'erreur'); } catch { /* son facultatif */ } };

/** Image d'un contenu : adresse https ou chemin du stockage. */
function Illustration({ uri, taille = 140 }: { uri?: string | null; taille?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { setUrl(null); if (!uri) return; if (/^https?:\/\//.test(uri)) setUrl(uri); else resoudreMedia(uri).then(setUrl).catch(() => {}); }, [uri]);
  if (!uri || !url) return null;
  return <Image source={{ uri: url }} style={{ width: taille, height: taille, borderRadius: 20, alignSelf: 'center' }} resizeMode="cover" accessibilityIgnoresInvertColors />;
}

// ------------------------------------------------------------------ mots croisés et mots fléchés
function Grille(p: PropsJeu & { fleches: boolean }) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const g = useMemo(() => {
    const mots = p.manche.mots.filter(motDeLettres);
    let meilleur = genererGrilleMots(mots, R.taille, R.questions, Math.random, p.fleches);
    for (let i = 0; i < 12 && meilleur.mots.length < Math.min(R.questions, mots.length); i++) { const x = genererGrilleMots(mots, R.taille, R.questions, Math.random, p.fleches); if (x.mots.length > meilleur.mots.length) meilleur = x; }
    return meilleur;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const clavier = useMemo(() => clavierGrille(g, p.manche.mots, Math.random, Math.min(8, 2 + Math.floor(R.niveau / 60))), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [actif, setActif] = useState(0);
  const [pos, setPos] = useState(0);
  const [faits, setFaits] = useState<number[]>([]);
  const [fautes, setFautes] = useState(0);
  const fin = (bonnes: number, reste = 0) => p.onFin({ bonnes, erreurs: fautes + (g.mots.length - bonnes), serie: bonnes, secondesRestantes: reste });
  const reste = useCompteArebours(R.dureeS, faits.length < g.mots.length && g.mots.length > 0, () => fin(faits.length));
  if (g.mots.length < 2) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} texte="Il faut des mots qui se croisent, publiés sur le serveur pour ce thème." />;
  const mot = g.mots[actif], cm = casesDuMot(mot);
  const choisir = (i: number) => { setActif(i); const libre = casesDuMot(g.mots[i]).findIndex(([r, k]) => !saisie[`${r},${k}`]); setPos(libre < 0 ? 0 : libre); };
  const ecrire = (l: string) => {
    if (faits.includes(actif)) return;
    const [r, k] = cm[pos]; const s = { ...saisie, [`${r},${k}`]: l }; setSaisie(s);
    const plein = cm.every(([a, b]) => s[`${a},${b}`]);
    if (plein) {
      // Un mot terminé peut en terminer d'autres (lettres croisées) : on revérifie toute la grille.
      const ok = g.mots.map((m, i) => (motGrilleReussi(m, s) ? i : -1)).filter(i => i >= 0);
      if (ok.includes(actif)) { son(true); p.onBonne(); setFaits(ok); if (ok.length === g.mots.length) { setTimeout(() => fin(ok.length, reste), 700); return; } const suivant = g.mots.findIndex((_, i) => !ok.includes(i)); if (suivant >= 0) { setActif(suivant); setPos(Math.max(0, casesDuMot(g.mots[suivant]).findIndex(([a, b]) => !s[`${a},${b}`]))); } }
      else { son(false); setFautes(f => f + 1); if (fautes + 1 >= R.erreursMax * 2) p.onErreur(); }
    } else setPos(Math.min(cm.length - 1, pos + 1));
  };
  const effacer = () => { if (faits.includes(actif)) return; const i = saisie[cm[pos].join(',')] ? pos : Math.max(0, pos - 1); const [r, k] = cm[i]; const croise = g.mots.some((m, j) => j !== actif && faits.includes(j) && casesDuMot(m).some(([a, b]) => a === r && b === k)); if (!croise) { const s = { ...saisie }; delete s[`${r},${k}`]; setSaisie(s); } setPos(i); };
  const cote = Math.min(34, Math.floor(318 / g.taille));
  const lignes = g.cases.map((l, r) => l.some(x => x !== null) || g.mots.some(m => m.def?.[0] === r));
  const defs = new Map(g.mots.filter(m => m.def).map((m, i) => [m.def!.join(','), i]));
  const numeros = new Map(g.mots.map((m, i) => [`${m.r},${m.c}`, i]));
  return (
    <Cadre titre={titre(p)} niveau={R.titre} avancement={faits.length / g.mots.length} onQuitter={p.onQuitter} reste={R.dureeS ? reste : undefined}>
      <View style={{ alignSelf: 'center', gap: 2 }}>
        {g.cases.map((ligne, r) => lignes[r] && <View key={r} style={{ flexDirection: 'row', gap: 2 }}>{ligne.map((l, k) => {
          const cle = `${r},${k}`, idx = cm.findIndex(([a, b]) => a === r && b === k), dansActif = idx >= 0, def = defs.get(cle);
          if (l === null) {
            if (def === undefined) return <View key={k} style={{ width: cote, height: cote }} />;
            const m = g.mots[def];
            return <Pressable key={k} accessibilityRole="button" accessibilityLabel={`Définition : ${m.francais}`} onPress={() => choisir(def)} style={{ width: cote, height: cote, borderRadius: 6, backgroundColor: def === actif ? c.accent : c.fort, alignItems: 'center', justifyContent: 'center' }}><T v="petit" fort couleur={def === actif ? c.surAccent : c.fond}>{m.sens === 'h' ? '→' : '↓'}</T></Pressable>;
          }
          const fait = g.mots.some((m, i) => faits.includes(i) && casesDuMot(m).some(([a, b]) => a === r && b === k));
          const num = numeros.get(cle);
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`Case ligne ${r + 1}, colonne ${k + 1}${saisie[cle] ? `, ${saisie[cle]}` : ', vide'}`} onPress={() => { if (dansActif) setPos(idx); else { const i = g.mots.findIndex(m => casesDuMot(m).some(([a, b]) => a === r && b === k)); if (i >= 0) choisir(i); } }}
              style={{ width: cote, height: cote, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: fait ? c.succes + '55' : dansActif ? c.modules.azeva + '55' : c.carte, borderWidth: dansActif && idx === pos && !fait ? 2.5 : 1, borderColor: dansActif && idx === pos && !fait ? c.accent : c.bord }}>
              {!p.fleches && num !== undefined && <T v="petit" style={{ position: 'absolute', top: 0, left: 2, fontSize: 8, lineHeight: 10 }} couleur={c.discret}>{num + 1}</T>}
              <T v={cote < 28 ? 'petit' : 'carte'} fort>{(saisie[cle] ?? '').toUpperCase()}</T>
            </Pressable>
          );
        })}</View>)}
      </View>
      <Carte plat style={{ padding: 12, gap: 2 }}><T v="petit" couleur={c.discret}>{p.fleches ? '' : `${actif + 1}. `}{mot.sens === 'h' ? 'Horizontal' : 'Vertical'} · {mot.lettres.length} lettres</T><T v="corps" fort>{mot.francais}</T></Carte>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {clavier.map(l => <Pressable key={l} accessibilityRole="button" accessibilityLabel={l} onPress={() => ecrire(l)} style={{ minWidth: 38, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}><T v="carte">{l}</T></Pressable>)}
        <Pressable accessibilityRole="button" accessibilityLabel="Effacer une lettre" onPress={effacer} style={{ minWidth: 52, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.squelette }}><T v="carte">⌫</T></Pressable>
      </View>
      {!p.fleches && <View style={{ gap: 4 }}>{g.mots.map((m, i) => <Pressable key={i} accessibilityRole="button" onPress={() => choisir(i)} style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}><T v="petit" fort style={{ width: 22 }} couleur={faits.includes(i) ? c.succes : c.fort}>{i + 1}</T><T v="petit" style={[{ flex: 1 }, faits.includes(i) ? { textDecorationLine: 'line-through' } : null]}>{m.sens === 'h' ? '→' : '↓'} {m.francais}</T></Pressable>)}</View>}
    </Cadre>
  );
}

// ------------------------------------------------------------------ mémoire
function Memoire(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const cartes = useMemo(() => nouvelleMemoire(p.manche.mots, Math.min(R.questions, 8)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const paires = cartes.length / 2;
  const [ouvertes, setOuvertes] = useState<number[]>([]);
  const [trouvees, setTrouvees] = useState<string[]>([]);
  const [fautes, setFautes] = useState(0);
  const [serie, setSerie] = useState(0);
  const bloque = useRef(false);
  const reste = useCompteArebours(R.dureeS, trouvees.length < paires && paires > 0, () => p.onFin({ bonnes: trouvees.length, erreurs: paires - trouvees.length, serie: 0, secondesRestantes: 0 }));
  if (paires < 2) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const retourner = (i: number) => {
    if (bloque.current || ouvertes.includes(i) || trouvees.includes(cartes[i].cle)) return;
    const o = [...ouvertes, i]; setOuvertes(o);
    if (o.length < 2) return;
    const [a, b] = o.map(k => cartes[k]);
    if (a.cle === b.cle) { son(true); p.onBonne(); const t = [...trouvees, a.cle]; setTrouvees(t); setOuvertes([]); setSerie(s => s + 1); if (t.length === paires) setTimeout(() => p.onFin({ bonnes: t.length, erreurs: Math.floor(fautes / 2), serie: serie + 1, secondesRestantes: reste }), 700); }
    else { bloque.current = true; const f = fautes + 1; setFautes(f); setSerie(0); if (f % R.erreursMax === 0) p.onErreur(); setTimeout(() => { setOuvertes([]); bloque.current = false; }, Math.max(450, 1100 - R.niveau)); }
  };
  const colonnes = cartes.length <= 8 ? 2 : cartes.length <= 12 ? 3 : 4;
  return (
    <Cadre titre={titre(p)} niveau={R.titre} avancement={trouvees.length / paires} onQuitter={p.onQuitter} reste={R.dureeS ? reste : undefined}>
      <T v="petit">{trouvees.length} paire{trouvees.length > 1 ? 's' : ''} sur {paires} · {fautes} essai{fautes > 1 ? 's' : ''} raté{fautes > 1 ? 's' : ''}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {cartes.map((k, i) => { const vue = ouvertes.includes(i), ok = trouvees.includes(k.cle); return (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={vue || ok ? k.texte : `Carte ${i + 1}, retournée`} onPress={() => retourner(i)}
            style={{ width: `${Math.floor(100 / colonnes) - 3}%`, minHeight: 78, borderRadius: 14, padding: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? c.succes + '44' : vue ? c.carte : p.couleur, borderWidth: 2, borderColor: ok ? c.succes : vue ? c.accent : 'transparent' }}>
            {vue || ok ? <T v={k.face === 'myene' ? 'carte' : 'petit'} fort style={{ textAlign: 'center', fontStyle: k.face === 'myene' ? 'italic' : 'normal' }}>{k.texte}</T> : <Ic nom="etoile" taille={24} couleur="#170D08" />}
          </Pressable>); })}
      </View>
    </Cadre>
  );
}

// ------------------------------------------------------------------ boucle de questions : sert aux moteurs à une question à la fois
function useQuestions<Q>(p: PropsJeu, construire: (i: ItemJeu) => Q | null) {
  const R = p.manche.regles;
  const liste = useMemo(() => { const out: Q[] = []; for (const i of melanger(p.manche.items)) { const q = construire(i); if (q) out.push(q); if (out.length >= R.questions) break; } return out; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [n, setN] = useState(0);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const resRef = useRef(res); resRef.current = res;
  const reste = useCompteArebours(R.dureeS, liste.length > 0 && n < liste.length, () => p.onFin({ ...resRef.current, erreurs: resRef.current.erreurs + Math.max(0, liste.length - n - (retour ? 1 : 0)), secondesRestantes: 0 }));
  const noter = (ok: boolean, texte = '') => { if (retour) return; son(ok); setRetour({ ok, texte }); setRes(r => ({ bonnes: r.bonnes + (ok ? 1 : 0), erreurs: r.erreurs + (ok ? 0 : 1), serie: ok ? r.serie + 1 : 0 })); ok ? p.onBonne() : p.onErreur(); };
  const suite = () => { if (n + 1 >= liste.length) return p.onFin({ ...resRef.current, secondesRestantes: R.dureeS ? reste : 0 }); setN(n + 1); setRetour(null); };
  return { R, liste, n, q: liste[n] as Q | undefined, retour, noter, suite, reste, dernier: n + 1 >= liste.length };
}

// ------------------------------------------------------------------ formes (suites, options dessinées)
const TEINTES: Record<string, string> = { rouge: '#D9482B', jaune: '#F5B301', bleu: '#2F7FD1', vert: '#1F9D76', noir: '#2B1D16', blanc: '#FDFAF7', orange: '#F97316' };
function Forme({ j, taille = 40 }: { j: Jeton; taille?: number }) {
  const { c } = useTheme();
  if (j.inconnu) return <View style={{ width: taille, height: taille, borderRadius: 10, borderWidth: 2.5, borderStyle: 'dashed', borderColor: c.fort, alignItems: 'center', justifyContent: 'center' }}><T v="carte">?</T></View>;
  const k = j.taille === 'petit' ? 0.55 : j.taille === 'grand' ? 1 : 0.8, f = TEINTES[j.couleur ?? ''] ?? '#C85A32', s = j.couleur === 'blanc' ? c.fort : 'none';
  const m = 50 - 46 * k, M = 50 + 46 * k;
  return (
    <Svg width={taille} height={taille} viewBox="0 0 100 100" accessibilityLabel={`${j.forme}${j.couleur ? ' ' + j.couleur : ''}${j.taille ? ' ' + j.taille : ''}`}>
      {j.forme === 'rond' && <Circle cx={50} cy={50} r={46 * k} fill={f} stroke={s} strokeWidth={3} />}
      {j.forme === 'carre' && <Rect x={m} y={m} width={M - m} height={M - m} rx={6} fill={f} stroke={s} strokeWidth={3} />}
      {j.forme === 'triangle' && <Polygon points={`50,${m} ${M},${M} ${m},${M}`} fill={f} stroke={s} strokeWidth={3} />}
      {j.forme === 'losange' && <Polygon points={`50,${m} ${M},50 50,${M} ${m},50`} fill={f} stroke={s} strokeWidth={3} />}
      {j.forme === 'etoile' && <Polygon points={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 20 : 46) * k; return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`; }).join(' ')} fill={f} stroke={s} strokeWidth={3} />}
      {j.forme === 'croix' && <Path d={`M ${50 - 13 * k} ${m} h ${26 * k} v ${33 * k} h ${33 * k} v ${26 * k} h ${-33 * k} v ${33 * k} h ${-26 * k} v ${-33 * k} h ${-33 * k} v ${-26 * k} h ${33 * k} Z`} fill={f} stroke={s} strokeWidth={3} />}
    </Svg>
  );
}

/** Noisettes à compter : disposées en désordre maîtrisé, toujours bien séparées. */
function Noisettes({ n }: { n: number }) {
  const places = useMemo(() => melanger(Array.from({ length: 20 }, (_, i) => i)).slice(0, n).sort((a, b) => a - b), [n]);
  return (
    <View accessibilityLabel="Des noisettes à compter" accessible style={{ alignSelf: 'center', width: 5 * 54, flexDirection: 'row', flexWrap: 'wrap' }}>
      {Array.from({ length: 20 }, (_, i) => (
        <View key={i} style={{ width: 54, height: 50, alignItems: 'center', justifyContent: 'center' }}>
          {places.includes(i) && <Svg width={40} height={44} viewBox="0 0 40 44" style={{ transform: [{ rotate: `${(i * 37) % 40 - 20}deg` }] }}><Ellipse cx={20} cy={25} rx={15} ry={17} fill="#8B4A22" /><Path d="M6 20 Q20 2 34 20 Q20 14 6 20 Z" fill="#5A2C10" /><Ellipse cx={14} cy={24} rx={3.5} ry={6} fill="#B9713C" opacity={0.7} /><Path d="M20 4 v-3" stroke="#5A2C10" strokeWidth={2.5} strokeLinecap="round" /></Svg>}
        </View>
      ))}
    </View>
  );
}

// ------------------------------------------------------------------ quiz, phrase à trous, compter, suites de formes
function Questions(p: PropsJeu & { genre: 'quiz' | 'trous' | 'compter' | 'suites' }) {
  const { c } = useTheme();
  const k = useQuestions<QuestionItem>(p, i => (p.genre === 'compter' && nombreACompter(i) === null ? null : questionItem(i, p.manche.items, p.manche.regles.options)));
  const [choisi, setChoisi] = useState<number | null>(null);
  const [texte, setTexte] = useState('');
  useEffect(() => { setChoisi(null); setTexte(''); }, [k.n]);
  const q = k.q;
  if (!q) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const it = q.item, trou = couperTrou(it.enonce);
  // Phrase à trous, aux niveaux élevés : la réponse s'écrit (contrôle 5) au lieu de se choisir (contrôle 6).
  const ecrire = p.genre === 'trous' && it.extra?.saisie !== false && k.R.niveau > 500;
  const repondre = (i: number) => { if (k.retour) return; setChoisi(i); k.noter(i === q.bonne, it.indice || (i === q.bonne ? '' : `Réponse : ${it.reponse}`)); };
  return (
    <Cadre titre={titre(p)} niveau={k.R.titre} avancement={k.n / k.liste.length} onQuitter={p.onQuitter} reste={k.R.dureeS ? k.reste : undefined}>
      {!!p.jeu.consigne && <T v="petit">{String(p.jeu.consigne)}</T>}
      {!!it.extra?.texte && <Carte plat style={{ padding: 14 }}><T v="corps">{String(it.extra.texte)}</T></Carte>}
      <Illustration uri={it.image} />
      {!!it.audio && <View style={{ alignItems: 'center' }}><Son audio={it.audio} auto grand /></View>}
      {p.genre === 'compter' && <Noisettes n={nombreACompter(it) ?? 1} />}
      {p.genre === 'suites' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' }}>{lireSuiteFormes(it.enonce).map((j, i) => <Forme key={i} j={k.retour && j.inconnu ? lireJeton(it.reponse) : j} taille={46} />)}</View>}
      {p.genre === 'trous' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          {!!trou.avant && <T v="sousTitre" style={{ fontStyle: 'italic' }}>{trou.avant}</T>}
          <View style={{ minWidth: 86, minHeight: 44, paddingHorizontal: 10, borderRadius: 10, borderBottomWidth: 3, borderColor: k.retour ? (k.retour.ok ? c.succes : c.erreur) : c.accent, backgroundColor: k.retour ? (k.retour.ok ? c.succes + '33' : c.erreur + '22') : c.squelette, alignItems: 'center', justifyContent: 'center' }}><T v="sousTitre" style={{ fontStyle: 'italic' }}>{k.retour ? it.reponse : choisi !== null ? q.options[choisi] : ''}</T></View>
          {!!trou.apres && <T v="sousTitre" style={{ fontStyle: 'italic' }}>{trou.apres}</T>}
        </View>
      )}
      {p.genre === 'quiz' && <T v="sousTitre">{it.enonce}</T>}
      {ecrire ? (!k.retour && <><Champ valeur={texte} onChange={setTexte} placeholder="Écris le mot qui manque" onSubmit={() => texte.trim() && k.noter(reponseEcriteJuste(it.reponse, texte), it.indice || `Réponse : ${it.reponse}`)} /><Bouton label="Vérifier" desactive={!texte.trim()} onPress={() => k.noter(reponseEcriteJuste(it.reponse, texte), it.indice || `Réponse : ${it.reponse}`)} /></>)
        : <View style={p.genre === 'suites' || p.genre === 'trous' ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' } : { gap: 10 }}>
          {q.options.map((o, i) => { const etat = k.retour ? (i === q.bonne ? 'ok' : choisi === i ? 'ko' : 'neutre') : 'neutre'; return (
            <Choix key={i} label={o} etat={etat} desactive={!!k.retour} onPress={() => repondre(i)}>{p.genre === 'suites' && estJetonForme(o) ? <Forme j={lireJeton(o)} taille={52} /> : undefined}</Choix>); })}
        </View>}
      {k.retour && <Retour ok={k.retour.ok} texte={k.retour.texte} onSuite={k.suite} libelle={k.dernier ? 'Terminer' : 'Suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ syllabes
function SyllabesJeu(p: PropsJeu) {
  const { c } = useTheme();
  const k = useQuestions(p, i => nouvellesSyllabes(i, p.manche.items, Math.random, Math.min(5, 1 + Math.floor(p.manche.regles.niveau / 150))));
  const [essai, setEssai] = useState<number[]>([]);
  useEffect(() => { setEssai([]); }, [k.n]);
  const q = k.q;
  if (!q) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const verifier = () => k.noter(syllabesReussies(q, essai.map(i => q.morceaux[i])), `${q.solution.join('-')} : ${q.item.enonce}`);
  return (
    <Cadre titre={titre(p)} niveau={k.R.titre} avancement={k.n / k.liste.length} onQuitter={p.onQuitter} reste={k.R.dureeS ? k.reste : undefined}>
      <T v="sousTitre" style={{ textAlign: 'center' }}>{q.item.enonce}</T>
      <Illustration uri={q.item.image} />
      <Carte plat style={{ minHeight: 64, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
        {essai.length === 0 && <T v="petit">Touche les syllabes dans l'ordre</T>}
        {essai.map((i, j) => <Pressable key={j} disabled={!!k.retour} accessibilityRole="button" onPress={() => setEssai(e => e.filter((_, x) => x !== j))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: c.accent }}><T v="sousTitre" couleur={c.surAccent}>{q.morceaux[i]}</T></Pressable>)}
      </Carte>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {q.morceaux.map((m, i) => !essai.includes(i) && <Pressable key={i} disabled={!!k.retour} accessibilityRole="button" accessibilityLabel={m} onPress={() => setEssai(e => [...e, i])} style={{ minWidth: 56, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.carte, borderWidth: 2, borderColor: c.modules.azeva }}><T v="sousTitre">{m}</T></Pressable>)}
      </View>
      {!k.retour ? <Bouton label="Vérifier" desactive={essai.length < 2} onPress={verifier} /> : <Retour ok={k.retour.ok} texte={k.retour.texte} onSuite={k.suite} libelle={k.dernier ? 'Terminer' : 'Suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ relier (deux colonnes)
function RelierJeu(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const source = p.manche.items.length >= 2 ? p.manche.items : motsEnItems(p.manche.mots);
  const manches = useMemo(() => { const parManche = Math.min(5, Math.max(3, R.questions)); const tout = melanger(source); const out = []; for (let i = 0; i < tout.length && out.length < Math.max(1, Math.ceil(R.questions / parManche)); i += parManche) { const x = nouveauRelier(tout.slice(i, i + parManche), parManche); if (x.gauche.length >= 2) out.push(x); } return out; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const total = manches.reduce((n, m) => n + m.gauche.length, 0);
  const [m, setM] = useState(0);
  const [gauche, setGauche] = useState<string | null>(null);
  const [faits, setFaits] = useState<string[]>([]);
  const [faux, setFaux] = useState<string | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const reste = useCompteArebours(R.dureeS, total > 0 && res.bonnes < total, () => p.onFin({ ...res, erreurs: res.erreurs + (total - res.bonnes), secondesRestantes: 0 }));
  if (!manches.length) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const jeu = manches[m];
  const droite = (id: string) => {
    if (!gauche || faits.includes(id)) return;
    if (id === gauche) {
      son(true); p.onBonne(); const f = [...faits, id]; setFaits(f); setGauche(null); const r = { ...res, bonnes: res.bonnes + 1, serie: res.serie + 1 }; setRes(r);
      if (f.length === jeu.gauche.length) setTimeout(() => { if (m + 1 >= manches.length) p.onFin({ ...r, secondesRestantes: R.dureeS ? reste : 0 }); else { setM(m + 1); setFaits([]); } }, 600);
    } else { son(false); p.onErreur(); setFaux(id); setRes(r => ({ ...r, erreurs: r.erreurs + 1, serie: 0 })); setTimeout(() => setFaux(null), 600); }
  };
  const tuile = (id: string, texte: string, cote: 'g' | 'd') => { const fait = faits.includes(id), on = cote === 'g' && gauche === id, ko = cote === 'd' && faux === id; return (
    <Pressable key={cote + id} accessibilityRole="button" accessibilityLabel={`${texte}${fait ? ', relié' : ''}`} disabled={fait} onPress={() => (cote === 'g' ? setGauche(id) : droite(id))}
      style={{ minHeight: 56, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 2, backgroundColor: fait ? c.succes + '33' : ko ? c.erreur + '33' : on ? c.modules.azeva + '55' : c.carte, borderColor: fait ? c.succes : ko ? c.erreur : on ? c.accent : c.bord }}>
      <T v="corps" fort style={{ textAlign: 'center', fontStyle: cote === 'g' ? 'italic' : 'normal' }}>{texte}</T></Pressable>); };
  return (
    <Cadre titre={titre(p)} niveau={R.titre} avancement={res.bonnes / total} onQuitter={p.onQuitter} reste={R.dureeS ? reste : undefined}>
      <T v="petit">{gauche ? 'Touche maintenant ce qui va avec.' : 'Touche un élément de gauche.'}</T>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 10 }}>{jeu.gauche.map(g => tuile(g.id, g.texte, 'g'))}</View>
        <View style={{ flex: 1, gap: 10 }}>{jeu.droite.map(d => tuile(d.id, d.texte, 'd'))}</View>
      </View>
    </Cadre>
  );
}

// ------------------------------------------------------------------ classer
function ClasserJeu(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const jeu = useMemo(() => nouveauClasser(p.manche.items, R.questions), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [n, setN] = useState(0);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const [marque, setMarque] = useState<{ cat: string; ok: boolean } | null>(null);
  const [ranges, setRanges] = useState<Record<string, string[]>>({});
  const reste = useCompteArebours(R.dureeS, jeu.elements.length > 0 && n < jeu.elements.length, () => p.onFin({ ...res, erreurs: res.erreurs + (jeu.elements.length - n), secondesRestantes: 0 }));
  if (jeu.categories.length < 2 || !jeu.elements.length) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const e = jeu.elements[n];
  const ranger = (cat: string) => {
    if (marque || !e) return;
    const ok = cat === e.reponse; son(ok); ok ? p.onBonne() : p.onErreur();
    const r = { bonnes: res.bonnes + (ok ? 1 : 0), erreurs: res.erreurs + (ok ? 0 : 1), serie: ok ? res.serie + 1 : 0 }; setRes(r);
    setMarque({ cat: ok ? cat : e.reponse, ok }); setRanges(x => ({ ...x, [e.reponse]: [...(x[e.reponse] ?? []), e.enonce] }));
    setTimeout(() => { setMarque(null); if (n + 1 >= jeu.elements.length) p.onFin({ ...r, secondesRestantes: R.dureeS ? reste : 0 }); else setN(n + 1); }, ok ? 550 : 1300);
  };
  return (
    <Cadre titre={titre(p)} niveau={R.titre} avancement={n / jeu.elements.length} onQuitter={p.onQuitter} reste={R.dureeS ? reste : undefined}>
      <View style={{ alignItems: 'center', gap: 4, minHeight: 86, justifyContent: 'center' }}>
        {e && <><View style={{ paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16, backgroundColor: p.couleur }}><T v="titre" couleur="#170D08" style={{ fontStyle: 'italic' }}>{e.enonce}</T></View>
          {marque && !!e.indice && <T v="petit">{e.indice}</T>}</>}
      </View>
      <T v="petit" style={{ textAlign: 'center' }}>Où va ce mot ?</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {jeu.categories.map(cat => { const m = marque?.cat === cat; return (
          <Pressable key={cat} accessibilityRole="button" accessibilityLabel={`Ranger dans ${cat}`} onPress={() => ranger(cat)} style={{ flexGrow: 1, flexBasis: '45%', minHeight: 110, borderRadius: 18, padding: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: m ? (marque!.ok ? c.succes : c.erreur) : c.bord, backgroundColor: m ? (marque!.ok ? c.succes + '33' : c.erreur + '22') : c.carte, gap: 4 }}>
            <T v="carte" style={{ textAlign: 'center' }}>{cat}</T>
            <T v="petit" style={{ textAlign: 'center', fontStyle: 'italic' }} numberOfLines={3}>{(ranges[cat] ?? []).join(' · ')}</T>
          </Pressable>); })}
      </View>
    </Cadre>
  );
}

// ------------------------------------------------------------------ suites à remettre en ordre
function SequenceJeu(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const suites = useMemo(() => nouvellesSuites(p.manche.items, R.questions), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [n, setN] = useState(0);
  const [ordre, setOrdre] = useState<string[]>([]);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const reste = useCompteArebours(R.dureeS, suites.length > 0 && n < suites.length, () => p.onFin({ ...res, erreurs: res.erreurs + (suites.length - n), secondesRestantes: 0 }));
  if (!suites.length) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const s = suites[n];
  const verifier = () => { const ok = suiteReussie(s, ordre); son(ok); ok ? p.onBonne() : p.onErreur(); setRes(r => ({ bonnes: r.bonnes + (ok ? 1 : 0), erreurs: r.erreurs + (ok ? 0 : 1), serie: ok ? r.serie + 1 : 0 })); setRetour({ ok, texte: s.solution.map(x => x.enonce).join(' → ') }); };
  const suite = () => { if (n + 1 >= suites.length) return p.onFin({ ...res, secondesRestantes: R.dureeS ? reste : 0 }); setN(n + 1); setOrdre([]); setRetour(null); };
  return (
    <Cadre titre={titre(p)} niveau={R.titre} avancement={n / suites.length} onQuitter={p.onQuitter} reste={R.dureeS ? reste : undefined}>
      <T v="sousTitre">{s.titre}</T>
      <Carte plat style={{ minHeight: 70, padding: 10, gap: 6 }}>
        {ordre.length === 0 && <T v="petit">Touche les éléments du premier au dernier</T>}
        {ordre.map((id, i) => <Pressable key={id} disabled={!!retour} accessibilityRole="button" onPress={() => setOrdre(o => o.filter(x => x !== id))} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: c.accent }}><T v="carte" couleur={c.surAccent}>{i + 1}</T><T v="corps" fort couleur={c.surAccent} style={{ flex: 1 }}>{s.solution.find(x => x.id === id)?.enonce}</T></Pressable>)}
      </Carte>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {s.melange.map(x => !ordre.includes(x.id) && <Pressable key={x.id} disabled={!!retour} accessibilityRole="button" onPress={() => setOrdre(o => [...o, x.id])} style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: c.carte, borderWidth: 1.5, borderColor: c.bord }}><T v="corps" fort>{x.enonce}</T></Pressable>)}
      </View>
      {!retour ? <Bouton label="Vérifier" desactive={ordre.length < s.solution.length} onPress={verifier} /> : <Retour ok={retour.ok} texte={retour.texte} onSuite={suite} libelle={n + 1 >= suites.length ? 'Terminer' : 'Suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ rythme (tambours)
const TAMBOURS: Record<Frappe, { nom: string; peau: string; fut: string; taille: number }> = {
  G: { nom: 'Tambour grave', peau: '#E7C9A0', fut: '#7A3D1A', taille: 96 }, D: { nom: 'Tambour aigu', peau: '#F3DFC1', fut: '#C85A32', taille: 78 },
  C: { nom: 'Claquement de mains', peau: '#FDE047', fut: '#B45309', taille: 66 }, B: { nom: 'Bois frappé', peau: '#B9713C', fut: '#4A230E', taille: 66 },
};
function RythmeJeu(p: PropsJeu) {
  const { c } = useTheme();
  const k = useQuestions(p, i => { const r = lireRythme(i.reponse); return r.length >= 2 ? { item: i, rythme: r } : null; });
  const [allume, setAllume] = useState<Frappe | null>(null);
  const [joue, setJoue] = useState<Frappe[]>([]);
  const [phase, setPhase] = useState<'ecoute' | 'joue'>('ecoute');
  const minuteries = useRef<ReturnType<typeof setTimeout>[]>([]);
  const q = k.q;
  const demo = () => {
    if (!q) return; minuteries.current.forEach(clearTimeout); minuteries.current = []; setPhase('ecoute'); setJoue([]);
    const pas = Math.max(320, 620 - k.R.niveau * 0.3);
    q.rythme.forEach((f, i) => { minuteries.current.push(setTimeout(() => setAllume(f), 400 + i * pas), setTimeout(() => setAllume(null), 400 + i * pas + pas * 0.55)); });
    minuteries.current.push(setTimeout(() => setPhase('joue'), 400 + q.rythme.length * pas));
  };
  useEffect(() => { demo(); return () => minuteries.current.forEach(clearTimeout); }, [k.n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!q) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const frapper = (f: Frappe) => {
    if (phase !== 'joue' || k.retour) return;
    setAllume(f); setTimeout(() => setAllume(null), 160);
    const j = [...joue, f]; setJoue(j);
    if (j[j.length - 1] !== q.rythme[j.length - 1]) k.noter(false, 'Ce n\'était pas ce tambour. Réécoute bien l\'ordre.');
    else if (j.length === q.rythme.length) k.noter(rythmeJuste(q.rythme, j), '');
  };
  const presents = (['G', 'D', 'C', 'B'] as Frappe[]).filter(f => k.liste.some(x => x.rythme.includes(f)));
  return (
    <Cadre titre={titre(p)} niveau={k.R.titre} avancement={k.n / k.liste.length} onQuitter={p.onQuitter}>
      <T v="sousTitre" style={{ textAlign: 'center' }}>{phase === 'ecoute' ? 'Regarde et écoute…' : 'À toi : rejoue le rythme'}</T>
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>{q.rythme.map((_, i) => <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: i < joue.length ? (joue[i] === q.rythme[i] ? c.succes : c.erreur) : c.squelette }} />)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'center', alignItems: 'flex-end', minHeight: 130 }}>
        {presents.map(f => { const t = TAMBOURS[f], on = allume === f; return (
          <Pressable key={f} accessibilityRole="button" accessibilityLabel={t.nom} onPress={() => frapper(f)} style={{ alignItems: 'center', transform: [{ scale: on ? 1.12 : 1 }] }}>
            <Svg width={t.taille} height={t.taille * 1.15} viewBox="0 0 100 115">
              <Path d="M12 30 L22 104 Q50 114 78 104 L88 30 Z" fill={t.fut} /><Path d="M20 52 L80 52 M24 78 L76 78" stroke="#00000033" strokeWidth={4} />
              <Ellipse cx={50} cy={30} rx={40} ry={16} fill={on ? '#FDE047' : t.peau} stroke={t.fut} strokeWidth={5} />
            </Svg>
            <T v="petit" fort>{t.nom.replace('Tambour ', '').replace(' de mains', '').replace(' frappé', '')}</T>
          </Pressable>); })}
      </View>
      {!k.retour ? <Bouton label="Réécouter" variante="fantome" icone="haut_parleur" onPress={demo} /> : <Retour ok={k.retour.ok} texte={k.retour.texte} onSuite={k.suite} libelle={k.dernier ? 'Terminer' : 'Suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ zones : le corps humain (dessin intégré) ou une image
export function Corps({ largeur }: { largeur: number }) {
  const peau = '#8B5A3C', ombre = '#6E4329', pagne = '#FDFAF7', bord = '#C85A32';
  return (
    <Svg width={largeur} height={largeur * 2} viewBox="0 0 100 200">
      {/* jambes et pieds */}
      <Path d="M37 104 L39 186 L46 186 L50 118 L54 186 L61 186 L63 104 Z" fill={peau} />
      <Ellipse cx={58} cy={142} rx={5} ry={5.5} fill={ombre} opacity={0.5} /><Ellipse cx={42} cy={142} rx={5} ry={5.5} fill={ombre} opacity={0.5} />
      <Path d="M33 192 Q33 185 40 185 L46 186 Q47 192 44 194 L35 194 Z" fill={peau} /><Path d="M67 192 Q67 185 60 185 L54 186 Q53 192 56 194 L65 194 Z" fill={peau} />
      {/* bras et mains */}
      <Path d="M32 51 Q24 54 24 66 L20 104 L26 105 L32 70 Z" fill={peau} /><Path d="M68 51 Q76 54 76 66 L80 104 L74 105 L68 70 Z" fill={peau} />
      <Ellipse cx={22} cy={110} rx={4.5} ry={6.5} fill={peau} /><Ellipse cx={78} cy={110} rx={4.5} ry={6.5} fill={peau} />
      <Path d="M77 114 L78 121 M80 113 L82 119 M75 114 L75 120" stroke={peau} strokeWidth={1.8} strokeLinecap="round" /><Path d="M23 114 L22 121 M20 113 L18 119 M25 114 L25 120" stroke={peau} strokeWidth={1.8} strokeLinecap="round" />
      {/* buste */}
      <Path d="M32 50 Q50 44 68 50 L66 80 L63 104 L37 104 L34 80 Z" fill={peau} />
      <Path d="M40 62 Q45 66 50 62 Q55 66 60 62" stroke={ombre} strokeWidth={1.2} fill="none" opacity={0.7} /><Circle cx={50} cy={93} r={1.4} fill={ombre} />
      {/* pagne blanc bordé de rouge */}
      <Path d="M35 98 L65 98 L67 128 L33 128 Z" fill={pagne} stroke="#D8CFC6" strokeWidth={0.8} /><Path d="M33 125 L67 125 L67 128 L33 128 Z" fill={bord} />
      {/* cou, tête, visage */}
      <Rect x={45.5} y={36} width={9} height={11} rx={3} fill={peau} />
      <Ellipse cx={38.8} cy={22} rx={2.6} ry={4} fill={peau} /><Ellipse cx={61.2} cy={22} rx={2.6} ry={4} fill={peau} />
      <Ellipse cx={50} cy={22} rx={11.5} ry={14.5} fill={peau} />
      <Path d="M38.5 18 Q39 6 50 6 Q61 6 61.5 18 Q56 11 50 11 Q44 11 38.5 18 Z" fill="#1F1410" />
      <Ellipse cx={45.5} cy={21} rx={1.9} ry={1.3} fill="#FDFAF7" /><Ellipse cx={54.5} cy={21} rx={1.9} ry={1.3} fill="#FDFAF7" /><Circle cx={45.5} cy={21} r={0.9} fill="#1F1410" /><Circle cx={54.5} cy={21} r={0.9} fill="#1F1410" />
      <Path d="M50 22 L48.6 26.5 L51.4 26.5" stroke={ombre} strokeWidth={1} fill="none" strokeLinejoin="round" /><Path d="M46 30.5 Q50 33 54 30.5" stroke="#5A2414" strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
function ZonesJeu(p: PropsJeu) {
  const { c } = useTheme();
  const k = useQuestions<QuestionItem>(p, i => (positionZone(i) ? questionItem(i, p.manche.items.filter(x => positionZone(x)), p.manche.regles.options) : null));
  const [touche, setTouche] = useState<string | null>(null);
  useEffect(() => { setTouche(null); }, [k.n]);
  const [sceneUrl, setSceneUrl] = useState<string | null>(null);
  const scene = String(p.jeu.scene || 'corps');
  useEffect(() => { if (scene !== 'corps') (/^https?:\/\//.test(scene) ? Promise.resolve(scene) : resoudreMedia(scene)).then(setSceneUrl).catch(() => {}); }, [scene]);
  const q = k.q;
  if (!q) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const L = 190, H = scene === 'corps' ? L * 2 : L * 1.3;
  // Un rond par réponse proposée : la bonne zone et des leurres.
  const cibles = q.options.map(o => p.manche.items.find(x => x.reponse === o)).filter((x): x is ItemJeu => !!x).map(x => ({ zone: x.reponse, pos: positionZone(x)! }));
  const toucher = (zone: string) => { if (k.retour) return; setTouche(zone); const ok = zone === q.item.reponse; k.noter(ok, `${q.item.enonce} : ${q.item.indice ?? q.item.reponse}`); };
  return (
    <Cadre titre={titre(p)} niveau={k.R.titre} avancement={k.n / k.liste.length} onQuitter={p.onQuitter} reste={k.R.dureeS ? k.reste : undefined}>
      <View style={{ alignItems: 'center', gap: 6 }}><T v="titre" style={{ fontStyle: 'italic' }}>{q.item.enonce}</T>{!!q.item.audio && <Son audio={q.item.audio} auto />}<T v="petit">{String(p.jeu.consigne || 'Touche le bon rond')}</T></View>
      <View style={{ width: L, height: H, alignSelf: 'center' }}>
        {scene === 'corps' ? <Corps largeur={L} /> : sceneUrl ? <Image source={{ uri: sceneUrl }} style={{ width: L, height: H, borderRadius: 16 }} resizeMode="contain" /> : null}
        {cibles.map(z => { const bon = z.zone === q.item.reponse, etat = k.retour ? (bon ? 'ok' : touche === z.zone ? 'ko' : 'n') : 'n'; return (
          <Pressable key={z.zone} accessibilityRole="button" accessibilityLabel={`Zone : ${z.zone}`} hitSlop={6} onPress={() => toucher(z.zone)}
            style={{ position: 'absolute', left: (z.pos.x / 100) * L - 15, top: (z.pos.y / 100) * H - 15, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: etat === 'ok' ? c.succes : etat === 'ko' ? c.erreur : c.modules.azeva, backgroundColor: etat === 'ok' ? c.succes + '99' : etat === 'ko' ? c.erreur + '99' : c.modules.azeva + '55' }} />); })}
      </View>
      {k.retour && <Retour ok={k.retour.ok} texte={k.retour.texte} onSuite={k.suite} libelle={k.dernier ? 'Terminer' : 'Suivant'} />}
    </Cadre>
  );
}

// ------------------------------------------------------------------ chemin : guider le personnage
const FLECHES: Record<Direction, string> = { haut: '↑', bas: '↓', gauche: '←', droite: '→' };
function CheminJeu(p: PropsJeu) {
  const { c } = useTheme();
  const R = p.manche.regles;
  const mots = useMemo(() => { const m = new Map<Direction, ItemJeu[]>(); for (const i of p.manche.items) { const d = lireDirection(i.reponse); if (d) m.set(d, [...(m.get(d) ?? []), i]); } return m; }, [p.manche.items]);
  const taille = 5;
  const trace = useMemo(() => tracerChemin(taille, R.questions, [...mots.keys()]), []); // eslint-disable-line react-hooks/exhaustive-deps
  const etapes = useMemo(() => trace.chemin.map(d => melanger(mots.get(d) ?? [])[0]), [trace]); // eslint-disable-line react-hooks/exhaustive-deps
  const [n, setN] = useState(0);
  const [pos, setPos] = useState(trace.depart);
  const [res, setRes] = useState({ bonnes: 0, erreurs: 0, serie: 0 });
  const [faux, setFaux] = useState<Direction | null>(null);
  const reste = useCompteArebours(R.dureeS, n < trace.chemin.length && trace.chemin.length > 0, () => p.onFin({ ...res, erreurs: res.erreurs + (trace.chemin.length - n), secondesRestantes: 0 }));
  if (mots.size < 2 || trace.chemin.length === 0) return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} />;
  const aller = (d: Direction) => {
    if (n >= trace.chemin.length || faux) return;
    if (d === trace.chemin[n]) { son(true); p.onBonne(); const np: [number, number] = [pos[0] + PAS[d][0], pos[1] + PAS[d][1]]; setPos(np); const r = { ...res, bonnes: res.bonnes + 1, serie: res.serie + 1 }; setRes(r); setN(n + 1); if (n + 1 >= trace.chemin.length) setTimeout(() => p.onFin({ ...r, secondesRestantes: R.dureeS ? reste : 0 }), 800); }
    else { son(false); p.onErreur(); setRes(r => ({ ...r, erreurs: r.erreurs + 1, serie: 0 })); setFaux(d); setTimeout(() => setFaux(null), 700); }
  };
  const mot = etapes[n];
  return (
    <Cadre titre={titre(p)} niveau={R.titre} avancement={n / trace.chemin.length} onQuitter={p.onQuitter} reste={R.dureeS ? reste : undefined}>
      <View style={{ alignItems: 'center', minHeight: 56 }}>{mot ? <><T v="titre" style={{ fontStyle: 'italic' }}>{mot.enonce}</T>{R.niveau <= 30 && !!mot.indice && <T v="petit">{mot.indice}</T>}</> : <T v="sousTitre">Arrivé à la maison !</T>}</View>
      <View style={{ alignSelf: 'center', gap: 3 }}>
        {Array.from({ length: taille }, (_, r) => <View key={r} style={{ flexDirection: 'row', gap: 3 }}>{Array.from({ length: taille }, (_, k) => { const ici = pos[0] === r && pos[1] === k, but = trace.arrivee[0] === r && trace.arrivee[1] === k; return (
          <View key={k} style={{ width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: ici ? p.couleur : but ? c.succes + '33' : c.carte, borderWidth: 1, borderColor: c.bord }}>
            {ici ? <Ic nom="profil" taille={26} couleur="#170D08" /> : but ? <Ic nom="maison" taille={24} couleur={c.succes} /> : null}</View>); })}</View>)}
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        {(['haut'] as Direction[]).concat([]).map(d => <Fleche key={d} d={d} faux={faux} onPress={aller} />)}
        <View style={{ flexDirection: 'row', gap: 60 }}><Fleche d="gauche" faux={faux} onPress={aller} /><Fleche d="droite" faux={faux} onPress={aller} /></View>
        <Fleche d="bas" faux={faux} onPress={aller} />
      </View>
    </Cadre>
  );
}
function Fleche({ d, faux, onPress }: { d: Direction; faux: Direction | null; onPress: (d: Direction) => void }) {
  const { c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Aller vers ${d === 'haut' ? 'le haut' : d === 'bas' ? 'le bas' : 'la ' + d}`} onPress={() => onPress(d)} style={{ width: 60, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: faux === d ? c.erreur + '44' : c.carte, borderWidth: 2, borderColor: faux === d ? c.erreur : c.modules.azeva }}><T v="titre">{FLECHES[d]}</T></Pressable>;
}

/** Moteurs de la seconde partie. */
export function JeuSuite(p: PropsJeu) {
  switch (p.manche.moteur) {
    case 'mots_croises': return <Grille {...p} fleches={false} />;
    case 'mots_fleches': return <Grille {...p} fleches />;
    case 'memoire': return <Memoire {...p} />;
    case 'syllabes': return <SyllabesJeu {...p} />;
    case 'quiz': return <Questions {...p} genre="quiz" />;
    case 'trous': return <Questions {...p} genre="trous" />;
    case 'compter': return <Questions {...p} genre="compter" />;
    case 'suites': return <Questions {...p} genre="suites" />;
    case 'relier': return <RelierJeu {...p} />;
    case 'classer': return <ClasserJeu {...p} />;
    case 'sequence': return <SequenceJeu {...p} />;
    case 'rythme': return <RythmeJeu {...p} />;
    case 'zones': return <ZonesJeu {...p} />;
    case 'chemin': return <CheminJeu {...p} />;
    default: return <SansContenu titre={titre(p)} onQuitter={p.onQuitter} texte="Ce type de jeu demande une version plus récente de l'application." />;
  }
}
