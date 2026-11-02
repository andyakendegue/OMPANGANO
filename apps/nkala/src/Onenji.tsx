import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  appliquerTemps, attenteCoeur, bonneReponse, construireOrdre, construireQcm, DIALECTES, etatInitial, jouable, mauvaiseReponse,
  ordreCorrect, peutJouer, REGLES, type EtatJeu, type Ordre, type Qcm,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { couleurs } from './theme';

type Jeu = 'qcm' | 'ordre';
type Question = { jeu: 'qcm'; q: Qcm } | { jeu: 'ordre'; q: Ordre };

const JEUX: [Jeu, string, string][] = [
  ['qcm', 'Choisis la bonne phrase', 'Une phrase en français : trouve sa traduction en myènè (contrôle 7).'],
  ['ordre', 'Remets les mots dans l’ordre', 'Reconstitue la phrase myènè à partir des mots mélangés (contrôle 4).'],
];

/** Onenji : cours par le jeu avec cœurs et points. Les phrases viennent du catalogue de Nkala, jamais d'une liste en dur. */
export function Onenji() {
  const { profil } = useAuth();
  const cle = `nkala_onenji_${profil?.id || 'anon'}`;
  const [etat, setEtat] = useState<EtatJeu | null>(null);
  const [dialecte, setDialecte] = useState('orungu');
  const [jeu, setJeu] = useState<Jeu | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [retour, setRetour] = useState<{ ok: boolean; bonne: string } | null>(null);
  const [choisis, setChoisis] = useState<number[]>([]);
  const [manque, setManque] = useState(false);
  const [choixQcm, setChoixQcm] = useState<number | null>(null);
  const [serie, setSerie] = useState({ bonnes: 0, total: 0 });
  const [, tic] = useState(0);
  const pool = useRef<Awaited<ReturnType<typeof catalogue.aleatoires>>>([]);

  useEffect(() => {
    AsyncStorage.getItem(cle).then(v => setEtat(appliquerTemps(v ? JSON.parse(v) : etatInitial()))).catch(() => setEtat(etatInitial()));
  }, [cle]);
  useEffect(() => { if (etat) AsyncStorage.setItem(cle, JSON.stringify(etat)).catch(() => {}); }, [etat, cle]);
  // Rafraîchit le décompte avant le prochain cœur.
  useEffect(() => { const t = setInterval(() => { setEtat(e => (e ? appliquerTemps(e) : e)); tic(n => n + 1); }, 15_000); return () => clearInterval(t); }, []);

  const suivante = useCallback(async (j: Jeu, d: string) => {
    setRetour(null); setChoisis([]); setManque(false); setChoixQcm(null);
    for (let essai = 0; essai < 6; essai++) {
      if (pool.current.length < 12) pool.current = (await catalogue.aleatoires(d, 60)).filter(jouable);
      const fiche = pool.current.pop();
      if (!fiche) break;
      if (j === 'qcm') { const q = construireQcm(fiche, pool.current.length ? pool.current : await catalogue.aleatoires(d, 40)); if (q) return setQuestion({ jeu: 'qcm', q }); }
      else { const q = construireOrdre(fiche); if (q) return setQuestion({ jeu: 'ordre', q }); }
    }
    setQuestion(null); setManque(true);
  }, []);

  const demarrer = (j: Jeu) => { setJeu(j); setSerie({ bonnes: 0, total: 0 }); pool.current = []; suivante(j, dialecte); };
  const quitter = () => { setJeu(null); setQuestion(null); setRetour(null); };

  const repondre = (ok: boolean, bonne: string) => {
    if (!etat || retour) return;
    setRetour({ ok, bonne });
    setSerie(s => ({ bonnes: s.bonnes + (ok ? 1 : 0), total: s.total + 1 }));
    setEtat(ok ? bonneReponse(etat) : mauvaiseReponse(etat));
  };

  if (!etat) return <ActivityIndicator color={couleurs.ambre} />;
  const attente = attenteCoeur(etat);

  const entete = (
    <View style={s.entete}>
      <Text style={s.coeurs}>{'♥'.repeat(etat.coeurs)}<Text style={{ color: couleurs.bord }}>{'♥'.repeat(REGLES.coeursMax - etat.coeurs)}</Text></Text>
      <Text style={s.points}>{etat.points} pts</Text>
    </View>
  );

  // Plus de cœurs : attendre ou gagner des points (publicité récompensée : plus tard, voir modèle économique)
  if (!peutJouer(etat)) {
    return (
      <View style={{ gap: 12 }}>
        {entete}
        <View style={s.carte}>
          <Text style={s.titre}>Plus de cœurs</Text>
          <Text style={s.texte}>Un cœur revient dans {Math.ceil((attente ?? 0) / 60_000)} min (un cœur toutes les {REGLES.minutesParCoeur} min).</Text>
          {jeu && <Pressable onPress={quitter}><Text style={s.lien}>Retour aux jeux</Text></Pressable>}
        </View>
      </View>
    );
  }

  if (!jeu) {
    return (
      <View style={{ gap: 12 }}>
        {entete}
        <Text style={s.discret}>Chaque mauvaise réponse retire un cœur ; {REGLES.pointsParBonneReponse} points par bonne réponse, {REGLES.pointsParCoeur} points rendent un cœur. {attente !== null ? `Prochain cœur dans ${Math.ceil(attente / 60_000)} min.` : ''}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DIALECTES.map(d => (
            <Pressable key={d.code} onPress={() => setDialecte(d.code)} style={[s.puce, dialecte === d.code && s.puceActive]}>
              <Text style={[s.puceTexte, dialecte === d.code && { color: '#fff', fontWeight: '700' }]}>{d.nom}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {JEUX.map(([id, nom, desc]) => (
          <Pressable key={id} style={s.carte} onPress={() => demarrer(id)}>
            <Text style={s.titre}>{nom}</Text>
            <Text style={s.discret}>{desc}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {entete}
      <View style={s.ligneSimple}>
        <Text style={s.discret}>{serie.bonnes} / {serie.total} réussies</Text>
        <Pressable onPress={quitter}><Text style={s.lien}>Terminer</Text></Pressable>
      </View>

      {manque && (
        <View style={s.carte}>
          <Text style={s.texte}>Pas assez de fiches {dialecte} pour ce jeu. Ouvrez Contribuer pour télécharger le catalogue, ou choisissez un autre dialecte.</Text>
        </View>
      )}

      {question?.jeu === 'qcm' && (
        <View style={s.carte}>
          <Text style={s.enonce}>{question.q.enonce}</Text>
          {question.q.options.map((o, i) => {
            const bon = i === question.q.bonne;
            return (
              <Pressable key={i} disabled={!!retour} onPress={() => { setChoixQcm(i); repondre(bon, question.q.options[question.q.bonne]); }}
                style={[s.option, !!retour && bon && s.optionBonne, !!retour && !bon && choixQcm === i && s.optionFausse]}>
                <Text style={s.optionTexte}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {question?.jeu === 'ordre' && (
        <View style={s.carte}>
          <Text style={s.enonce}>{question.q.enonce}</Text>
          <View style={s.reponse}>
            {choisis.length === 0 && <Text style={s.discret}>Touche les mots dans l’ordre…</Text>}
            {choisis.map((idx, k) => (
              <Pressable key={k} disabled={!!retour} onPress={() => setChoisis(c => c.filter((_, j) => j !== k))} style={s.mot}><Text style={s.motTexte}>{question.q.mots[idx]}</Text></Pressable>
            ))}
          </View>
          <View style={s.reponse}>
            {question.q.mots.map((m, idx) => (choisis.includes(idx) ? null : (
              <Pressable key={idx} disabled={!!retour} onPress={() => setChoisis(c => [...c, idx])} style={s.mot}><Text style={s.motTexte}>{m}</Text></Pressable>
            )))}
          </View>
          {!retour && choisis.length === question.q.mots.length && (
            <Pressable style={s.bouton} onPress={() => repondre(ordreCorrect(choisis.map(i => question.q.mots[i]), question.q), question.q.solution.join(' '))}>
              <Text style={s.boutonTexte}>Vérifier</Text>
            </Pressable>
          )}
        </View>
      )}

      {retour && (
        <View style={[s.carte, { borderColor: retour.ok ? '#22c55e' : '#ef4444' }]}>
          <Text style={retour.ok ? s.ok : s.faux}>{retour.ok ? `Bravo ! +${REGLES.pointsParBonneReponse} points` : 'Pas tout à fait. −1 cœur'}</Text>
          {!retour.ok && <Text style={s.texte}>Réponse : {retour.bonne}</Text>}
          {peutJouer(etat) ? (
            <Pressable style={s.bouton} onPress={() => suivante(jeu, dialecte)}><Text style={s.boutonTexte}>Question suivante</Text></Pressable>
          ) : <Text style={s.discret}>Plus de cœurs : reviens un peu plus tard.</Text>}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coeurs: { color: '#ef4444', fontSize: 24, letterSpacing: 2 },
  points: { color: couleurs.ambre, fontSize: 18, fontWeight: '900' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  titre: { color: couleurs.texteClair, fontSize: 16, fontWeight: '800' },
  enonce: { color: couleurs.texteClair, fontSize: 19, fontWeight: '700' },
  texte: { color: couleurs.texte, fontSize: 14 },
  discret: { color: couleurs.discret, fontSize: 12 },
  ligneSimple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  option: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, padding: 14 },
  optionBonne: { borderColor: '#22c55e', backgroundColor: '#052e16' },
  optionFausse: { borderColor: '#ef4444', backgroundColor: '#450a0a' },
  optionTexte: { color: couleurs.ambre, fontSize: 17, fontWeight: '700' },
  reponse: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 48, padding: 8, backgroundColor: couleurs.fond, borderRadius: 12, borderColor: couleurs.bord, borderWidth: 1 },
  mot: { backgroundColor: couleurs.carte, borderColor: couleurs.terre, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  motTexte: { color: couleurs.ambre, fontSize: 16, fontWeight: '700' },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 14 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.carte },
  puceActive: { backgroundColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  lien: { color: couleurs.ambre, fontSize: 13, fontWeight: '700' },
  ok: { color: '#86efac', fontSize: 16, fontWeight: '800' },
  faux: { color: '#fca5a5', fontSize: 16, fontWeight: '800' },
});
