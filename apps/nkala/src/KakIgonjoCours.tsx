/**
 * Kak'Igonjo pendant un cours d'Onenji : il explique une erreur, répond aux questions sur l'exercice en cours,
 * et fait pratiquer les mots de la leçon dans une petite conversation à la fin. Même passerelle et mêmes quotas que le chat.
 * Pas d'IA en mode enfant (limites à fixer, NKALA_AUDIT_COMPLET.md §3.4).
 */
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { demanderKakIgonjo, fonctionActive, type Exercice } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { Bouton, Champ, Feuille, Mascotte, T } from './kit';
import { usePrefs, useTheme } from './Prefs';

type Bulle = { role: 'user' | 'assistant'; content: string };

/** Décrit un exercice pour le modèle, avec sa source (le modèle ne doit pas inventer de mots). */
export function decrireExercice(ex: Exercice, donnee?: string | null): string {
  const l = [
    `Exercice (${ex.type}) : ${ex.consigne ?? ''}`.trim(),
    ex.mot_myene ? `Myènè : ${ex.mot_myene}` : '', ex.mot_francais ? `Français : ${ex.mot_francais}` : '', ex.texte ? `Texte : ${ex.texte.slice(0, 800)}` : '',
    ex.reponse ? `Bonne réponse : ${ex.reponse}` : '', donnee ? `Réponse de l'apprenant : ${donnee}` : '',
    ex.dialecte ? `Dialecte : ${ex.dialecte}` : '', ex.source ? `Source : ${ex.source}` : '', ex.indice ? `Indice prévu : ${ex.indice}` : '',
  ];
  return l.filter(Boolean).join('\n');
}

/** L'IA est-elle utilisable ici ? */
export function useIaCours(): { ok: boolean; raison?: string } {
  const { profil } = useAuth();
  const { prefs } = usePrefs();
  if (prefs.mode === 'enfant') return { ok: false, raison: 'enfant' };
  if (!fonctionActive('assistantIA')) return { ok: false, raison: 'Kak\'Igonjo arrive bientôt dans les cours.' };
  if (!profil) return { ok: false, raison: 'Connecte-toi pour parler à Kak\'Igonjo.' };
  return { ok: true };
}

/** Feuille de dialogue avec Kak'Igonjo : la première question part toute seule (consigne invisible + texte affiché). */
export function KakIgonjoFeuille({ visible, onClose, titre, consigne, affiche }: { visible: boolean; onClose: () => void; titre: string; consigne: string; affiche: string }) {
  const { c } = useTheme();
  const ia = useIaCours();
  const [bulles, setBulles] = useState<Bulle[]>([]);
  const [hist, setHist] = useState<Bulle[]>([]);
  const [conv, setConv] = useState<string | undefined>();
  const [texte, setTexte] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const lance = useRef<string | null>(null);
  const envoyer = async (message: string, montre: string) => {
    setErreur(null); setOccupe(true);
    setBulles(b => [...b, { role: 'user', content: montre }]);
    try {
      const r = await demanderKakIgonjo(message, conv, hist);
      setConv(r.conversationId);
      setHist(h => [...h, { role: 'user', content: message }, { role: 'assistant', content: r.reponse }]);
      setBulles(b => [...b, { role: 'assistant', content: r.reponse }]);
    } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };
  useEffect(() => {
    if (!visible || !ia.ok || lance.current === consigne) return;
    lance.current = consigne; setBulles([]); setHist([]); setConv(undefined);
    envoyer(consigne, affiche);
  }, [visible, consigne]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Feuille visible={visible} onClose={onClose} titre={titre}>
      {!ia.ok ? <View style={{ alignItems: 'center', gap: 10 }}><Mascotte taille={80} humeur="dort" /><T v="corps" style={{ textAlign: 'center' }}>{ia.raison}</T></View> : <>
        {bulles.map((b, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, justifyContent: b.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {b.role === 'assistant' && <Mascotte taille={34} humeur="parle" />}
            <View style={{ maxWidth: '84%', padding: 12, borderRadius: 16, backgroundColor: b.role === 'user' ? c.accent : c.carte, borderWidth: b.role === 'user' ? 0 : 1, borderColor: c.bord }}>
              <T v="corps" couleur={b.role === 'user' ? c.surAccent : c.texte}>{b.content}</T>
            </View>
          </View>
        ))}
        {occupe && <T v="petit">Kak'Igonjo réfléchit…</T>}
        {!!erreur && <T v="corps" couleur={c.erreur} accessibilityRole="alert">{erreur}</T>}
        <Champ valeur={texte} onChange={setTexte} placeholder="Réponds ou pose une question…" auto="sentences" maxLength={1000} onSubmit={() => { const m = texte.trim(); if (m && !occupe) { setTexte(''); envoyer(m, m); } }} />
        <Bouton label="Envoyer" icone="envoyer" petit charge={occupe} desactive={!texte.trim()} onPress={() => { const m = texte.trim(); if (m) { setTexte(''); envoyer(m, m); } }} />
        <T v="petit">Kak'Igonjo s'appuie sur les mots vérifiés de la leçon et cite sa source. S'il ne sait pas, il le dit.</T>
      </>}
    </Feuille>
  );
}

/** Consignes envoyées au modèle (le serveur ajoute la personnalité de Kak'Igonjo et le corpus). */
export const consignes = {
  expliquer: (lecon: string, ex: Exercice, donnee?: string | null) =>
    `Je suis dans la leçon « ${lecon} » d'Onenji et je me suis trompé. Explique-moi simplement pourquoi, en deux ou trois phrases, puis donne-moi un moyen de m'en souvenir. N'utilise que les mots ci-dessous et dis d'où ils viennent.\n${decrireExercice(ex, donnee)}`,
  question: (lecon: string, ex: Exercice) =>
    `Je suis dans la leçon « ${lecon} » d'Onenji, sur cet exercice. Aide-moi à le comprendre sans me donner la réponse tout de suite : pose-moi une question pour me mettre sur la voie.\n${decrireExercice(ex)}`,
  pratiquer: (lecon: string, exercices: Exercice[]) => {
    const mots = exercices.filter(e => e.mot_myene).slice(0, 12).map(e => `- ${e.mot_myene}${e.mot_francais ? ` = ${e.mot_francais}` : ''}${e.source ? ` (${e.source})` : ''}`).join('\n');
    return `Je viens de terminer la leçon « ${lecon} » d'Onenji. Fais-moi pratiquer ces mots dans une petite scène de la vie au village : pose une seule question à la fois, attends ma réponse, corrige-moi avec bienveillance, trois échanges au plus, puis dis-moi ce que je dois retenir. N'utilise que ces mots myènè :\n${mots}`;
  },
};
