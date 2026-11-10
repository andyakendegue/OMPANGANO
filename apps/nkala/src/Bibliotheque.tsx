/**
 * Bibliothèque virtuelle d'Onenji : étagère par rayons, fiche de livre, lecteur de chapitres où chaque mot se touche (glossaire, « Mes mots »,
 * explication par Ozangué), mini-quiz « complète le texte » en fin de chapitre, XP la première fois, série quotidienne et succès.
 * Les livres viennent des collections « bibliotheque » et « livre_chapitres » (import de /opt/bibliotheque ou fichiers CSV/JSON).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { demanderOzangue, fonctionActive, minutesDeLecture, quizLecture, type Ligne, type NiveauAcces, type QuestionLecture } from '@nkala/noyau';
import { Anneau, Barre, Bouton, Carte, Champ, Chargement, Ecran, Entete, EtatVide, Ic, Mascotte, Pastille, Puce, Rangee, SectionTitre, T, useToast } from './kit';
import { usePile } from './Pile';
import { usePrefs, useTheme } from './Prefs';
import { useProgres } from './Progres';
import { polices } from './theme';
import { useContenus } from './useContenu';
import { Verrou } from './Verrou';

type E = { t: 'etagere' } | { t: 'livre'; id: string } | { t: 'lire'; livreId: string; idx: number } | { t: 'mots' };
interface Mot { mot: string; sens: string; livre: string; le: number }
interface Reglages { position: Record<string, number>; mots: Mot[]; taille: number; dernier?: string }
const CLE = 'nkala.lecture.v1';
const VIDE: Reglages = { position: {}, mots: [], taille: 17 };
const num = (v: unknown) => Number(v) || 0;

function useLecture() {
  const [r, setR] = useState<Reglages>(VIDE);
  useEffect(() => { AsyncStorage.getItem(CLE).then(b => { if (b) setR({ ...VIDE, ...JSON.parse(b) }); }).catch(() => {}); }, []);
  const regler = useCallback((p: Partial<Reglages> | ((a: Reglages) => Partial<Reglages>)) => setR(a => { const n = { ...a, ...(typeof p === 'function' ? p(a) : p) }; AsyncStorage.setItem(CLE, JSON.stringify(n)).catch(() => {}); return n; }), []);
  return { r, regler };
}

type Livre = Ligne & { titre: string };
type Chap = Ligne & { titre: string; texte: string; livre_id: string };

export function Bibliotheque({ retour }: { retour: () => void }) {
  const pile = usePile<E>({ t: 'etagere' });
  const { res, chargement } = useContenus(['bibliotheque', 'livre_chapitres', 'opportunites']);
  const { prefs } = usePrefs();
  const { r, regler } = useLecture();
  const D = useMemo(() => {
    const chap = [...(res.livre_chapitres ?? [])].sort((a, b) => num(a.ordre) - num(b.ordre)) as unknown as Chap[];
    const parLivre = new Map<string, Chap[]>();
    for (const c of chap) parLivre.set(c.livre_id, [...(parLivre.get(c.livre_id) ?? []), c]);
    const tous = [...(res.bibliotheque ?? [])].sort((a, b) => num(a.ordre) - num(b.ordre)) as unknown as Livre[];
    const adapte = (l: Livre) => prefs.mode !== 'enfant' || !num(l.cycle) || num(l.cycle) <= 2;
    return { livres: tous.filter(l => parLivre.has(l.id) && adapte(l)), documents: tous.filter(l => !parLivre.has(l.id) && l.url), parLivre, opp: res.opportunites ?? [] };
  }, [res, prefs.mode]);
  const e = pile.ecran;
  if (chargement) return <Ecran><Chargement /></Ecran>;
  switch (e.t) {
    case 'livre': { const l = D.livres.find(x => x.id === e.id); return l ? <FicheLivre l={l} chap={D.parLivre.get(l.id) ?? []} pile={pile} r={r} /> : <Ecran><Entete titre="Livre" retour={pile.retour} /><EtatVide icone="livre" titre="Livre introuvable" /></Ecran>; }
    case 'lire': { const l = D.livres.find(x => x.id === e.livreId); return l ? <Lecteur l={l} chap={D.parLivre.get(l.id) ?? []} idx={e.idx} pile={pile} r={r} regler={regler} /> : null; }
    case 'mots': return <MesMots r={r} regler={regler} retour={pile.retour} />;
    default: return <Etagere D={D} pile={pile} r={r} retour={retour} />;
  }
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
function Etagere({ D, pile, r, retour }: { D: { livres: Livre[]; documents: Livre[]; parLivre: Map<string, Chap[]>; opp: Ligne[] }; pile: ReturnType<typeof usePile<E>>; r: Reglages; retour: () => void }) {
  const { c } = useTheme();
  const { donnees } = useProgres();
  const [q, setQ] = useState(''); const [rayon, setRayon] = useState('');
  const lectures = donnees.lectures;
  const lus = Object.keys(lectures ?? {}).length;
  const rayons = [...new Set(D.livres.map(l => (l.categorie as string) || 'livres'))];
  const visibles = D.livres.filter(l => (!rayon || ((l.categorie as string) || 'livres') === rayon) && (!q.trim() || `${l.titre} ${l.auteur ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));
  const encours = r.dernier ? D.livres.find(l => l.id === r.dernier) : undefined;
  const pe = encours ? progressionLivre(encours, D.parLivre.get(encours.id) ?? [], lectures) : null;
  const objectif = (() => { const auj = new Date().toISOString().slice(0, 10); return Object.values(lectures ?? {}).some(x => x.jour === auj); })();
  return (
    <Ecran bas={40}>
      <Entete titre="Bibliothèque" sous="Lis, touche les mots, gagne de l'XP" retour={retour} droite={<Pastille label={`${lus} chapitre${lus > 1 ? 's' : ''} lu${lus > 1 ? 's' : ''}`} couleur={c.accent} fond={c.carte} />} />
      <Carte plat><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <Mascotte taille={52} humeur={objectif ? 'content' : 'parle'} />
        <View style={{ flex: 1 }}><T v="carte">{objectif ? 'Défi du jour réussi' : 'Défi du jour : lis un chapitre'}</T><T v="petit">{objectif ? 'Ta série continue. Reviens demain !' : 'Un chapitre terminé aujourd\'hui entretient ta série et rapporte de l\'XP.'}</T></View>
        {objectif && <Ic nom="ok" taille={26} couleur={c.succes} />}
      </View></Carte>
      {encours && pe && <Carte onPress={() => pile.pousser({ t: 'lire', livreId: encours.id, idx: r.position[encours.id] ?? pe.prochain })} accent={encours.couleur as string} label={`Reprendre ${encours.titre}`}>
        <View style={{ flexDirection: 'row', gap: 14, padding: 14, alignItems: 'center' }}>
          <Couverture l={encours} w={58} h={82} />
          <View style={{ flex: 1, gap: 6 }}><T v="libelle">Reprendre ma lecture</T><T v="carte" numberOfLines={2}>{encours.titre}</T><Barre valeur={pe.part} /><T v="petit">{pe.faits} / {pe.total} chapitres</T></View>
          <Ic nom="suivant" taille={18} couleur={c.discret} />
        </View>
      </Carte>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Carte onPress={() => pile.pousser({ t: 'mots' })} plat style={{ flex: 1 }} label="Mes mots"><View style={{ padding: 14, gap: 4 }}><Ic nom="livre" taille={22} couleur={c.accent} /><T v="carte">Mes mots</T><T v="petit">{r.mots.length} collectés</T></View></Carte>
        <Carte plat style={{ flex: 1 }}><View style={{ padding: 14, gap: 4 }}><Ic nom="etoile" taille={22} couleur={c.accent} /><T v="carte">{D.livres.length} livre{D.livres.length > 1 ? 's' : ''}</T><T v="petit">{D.livres.reduce((n, l) => n + (D.parLivre.get(l.id)?.length ?? 0), 0)} chapitres</T></View></Carte>
      </View>
      {D.livres.length > 3 && <Champ valeur={q} onChange={setQ} placeholder="Chercher un titre ou un auteur" icone="chercher" auto="none" />}
      {rayons.length > 1 && <Rangee><Puce label="Tous" actif={!rayon} onPress={() => setRayon('')} />{rayons.map(x => <Puce key={x} label={x} actif={rayon === x} onPress={() => setRayon(x)} />)}</Rangee>}
      {D.livres.length === 0 ? <EtatVide mascotte titre="Les rayons se remplissent" texte="Les livres libres de droits arrivent bientôt." /> : visibles.length === 0 ? <EtatVide icone="chercher" titre="Rien trouvé" texte="Essaie un autre mot." /> :
        (rayon || q.trim() ? [[rayon || 'Résultats', visibles] as const] : rayons.map(x => [x, visibles.filter(l => ((l.categorie as string) || 'livres') === x)] as const)).map(([nom, liste]) => liste.length > 0 && (
          <View key={nom} style={{ gap: 10 }}>
            <SectionTitre titre={nom.charAt(0).toUpperCase() + nom.slice(1)} />
            <View style={{ borderBottomWidth: 6, borderBottomColor: c.bord, borderRadius: 3, paddingBottom: 10 }}>
              <Rangee espace={14}>{liste.map(l => { const p = progressionLivre(l, D.parLivre.get(l.id) ?? [], lectures); return (
                <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={`${l.titre}, ${(l.auteur as string) ?? ''}`} onPress={() => pile.pousser({ t: 'livre', id: l.id })} style={{ width: 112, gap: 6 }}>
                  <Couverture l={l} />{p.faits > 0 && <Barre valeur={p.part} hauteur={5} />}
                  <T v="petit" numberOfLines={2} style={{ textAlign: 'center' }}>{p.faits === p.total && p.total > 0 ? '★ ' : ''}{l.titre}</T>
                </Pressable>); })}</Rangee>
            </View>
          </View>))}
      {D.documents.length > 0 && <><SectionTitre titre="Documents à ouvrir" />{D.documents.map(b => <Carte key={b.id} plat onPress={() => b.url && Linking.openURL(b.url as string).catch(() => {})} label={b.titre}><View style={{ padding: 14, gap: 4 }}><T v="carte">{b.titre}</T><T v="petit">{[b.auteur, b.type, b.langue].filter(Boolean).join(' · ')}</T></View></Carte>)}</>}
      {D.opp.length > 0 && <><SectionTitre titre="Opportunités pour la jeunesse" />{D.opp.map(o => <Carte key={o.id} plat onPress={() => o.lien && Linking.openURL(o.lien as string).catch(() => {})} label={o.titre}><View style={{ padding: 14, gap: 4 }}><T v="carte">{o.titre}</T><T v="petit">{[o.organisme, o.date_limite].filter(Boolean).join(' · ')}</T></View></Carte>)}</>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ fiche d'un livre
function FicheLivre({ l, chap, pile, r }: { l: Livre; chap: Chap[]; pile: ReturnType<typeof usePile<E>>; r: Reglages }) {
  const { c } = useTheme();
  const { donnees } = useProgres();
  const p = progressionLivre(l, chap, donnees.lectures);
  const reprise = r.position[l.id] ?? p.prochain;
  const minutes = num(l.minutes) || Math.round(chap.reduce((n, x) => n + minutesDeLecture(x.texte), 0));
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
      <Verrou contenu={{ id: l.id, acces: ((l.niveau_acces as NiveauAcces) || 'libre'), roles: ['admin', 'validator'] }} regle={l as unknown as Record<string, any>}>
        <Bouton label={p.faits === 0 && !r.position[l.id] ? 'Commencer la lecture' : p.faits === p.total ? 'Relire depuis le début' : 'Reprendre la lecture'} icone="livre" variante="ambre" onPress={() => pile.pousser({ t: 'lire', livreId: l.id, idx: p.faits === p.total ? 0 : reprise })} />
        <SectionTitre titre="Chapitres" />
        {chap.map((x, i) => { const res = donnees.lectures?.[x.id]; return (
          <Carte key={x.id} plat onPress={() => pile.pousser({ t: 'lire', livreId: l.id, idx: i })} label={x.titre}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: res ? c.succes : c.fond2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.bord }}>{res ? <Ic nom="ok" taille={18} couleur="#FFF" /> : <T v="petit">{i + 1}</T>}</View>
              <View style={{ flex: 1 }}><T v="carte" numberOfLines={2}>{x.titre}</T><T v="petit">{minutesDeLecture(x.texte)} min{res && res.sur > 0 ? ` · quiz ${res.bonnes}/${res.sur}` : ''}</T></View>
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

function Lecteur({ l, chap, idx, pile, r, regler }: { l: Livre; chap: Chap[]; idx: number; pile: ReturnType<typeof usePile<E>>; r: Reglages; regler: (p: Partial<Reglages> | ((a: Reglages) => Partial<Reglages>)) => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { lireChapitre, donnees } = useProgres();
  const ch = chap[Math.min(Math.max(idx, 0), chap.length - 1)];
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
    try { const rep = await demanderOzangue(`Explique en une ou deux phrases simples le mot « ${sel.mot} » dans cette phrase : « ${sel.phrase} »`); setExplication(rep.reponse); }
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
            {!sel.sens && !explication && fonctionActive('assistantIA') && <Bouton label="Demander à Ozangué" petit large={false} variante="fantome" onPress={expliquer} />}
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
      <Entete titre="Mes mots" sous={`${r.mots.length} mot${r.mots.length > 1 ? 's' : ''} gardés en lisant`} retour={retour} />
      {r.mots.length === 0 ? <EtatVide mascotte titre="Aucun mot pour l'instant" texte="Pendant la lecture, touche un mot puis « Garder ce mot »." /> : <>
        <Rangee><Puce label="Récents" actif={!ordre} onPress={() => setOrdre(false)} /><Puce label="A → Z" actif={ordre} onPress={() => setOrdre(true)} /></Rangee>
        {liste.map(m => <Carte key={m.mot + m.le} plat><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
          <View style={{ flex: 1 }}><T v="carte">{m.mot}</T>{!!m.sens && <T v="corps">{m.sens}</T>}<T v="petit">{m.livre}</T></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${m.mot}`} hitSlop={10} onPress={() => regler({ mots: r.mots.filter(x => x !== m) })}><Ic nom="fermer" taille={20} couleur={c.discret} /></Pressable>
        </View></Carte>)}
      </>}
    </Ecran>
  );
}
