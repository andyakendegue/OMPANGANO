import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import {
  chargerMesContributions, MYENE, niveauPourXp, supprimerContribution, USER_LEVELS,
  type Contribution, type QuestionnaireItem,
} from '@nkala/noyau';
import { demanderOnglet, emettre } from './evenements';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { ConditionsModale } from './Conditions';
import Inscription from './Inscription';
import { MonCompte } from './MonCompte';
import { useVersionDonnees } from './donnees';
import { contributionsEnFile, nombreEnAttente, retirerDeLaFile } from './fileAttente';
import { couleurs, stylesDyn } from './theme';

type Section = 'apercu' | 'activite' | 'compte';
type Plage = '7d' | '30d' | 'all';

function useMesContributions() {
  const [liste, setListe] = useState<Contribution[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const version = useVersionDonnees();
  const charger = useCallback(async () => {
    // Les contributions encore sur l'appareil sont ajoutées à celles du serveur (« Sur l'appareil (envoi en attente) »).
    const locales = await contributionsEnFile();
    try {
      const serveur = await chargerMesContributions();
      const ids = new Set(serveur.map(c => c.id));
      setListe([...locales.filter(c => !ids.has(c.id)), ...serveur]); setErreur(null);
    } catch (e) {
      setListe(locales.length ? locales : null);
      setErreur((e as Error).message);
    }
  }, []);
  useEffect(() => { charger(); }, [charger, version]);
  return { liste, erreur, charger };
}

const confirmer = (m: string, ok: () => void) => {
  if (Platform.OS === 'web') { if ((globalThis as any).confirm?.(m)) ok(); return; }
  Alert.alert('Nkala', m, [{ text: 'Annuler', style: 'cancel' }, { text: 'Oui', onPress: ok }]);
};

/** Profil du contributeur : mêmes sections et mêmes textes que UserProfileView du site web. */
export function ProfilContributeur() {
  const { profil, deconnexion } = useAuth();
  const routeur = useRouter();
  const { liste, erreur, charger } = useMesContributions();
  const [section, setSection] = useState<Section>('apercu');
  const [mode, setMode] = useState<'cumule' | 'quotidien'>('cumule');
  const [plage, setPlage] = useState<Plage>('30d');
  const [favoris, setFavoris] = useState<QuestionnaireItem[]>([]);
  const [conditions, setConditions] = useState(false);
  const [filiation, setFiliation] = useState(false);
  const [parole, setParole] = useState<string | null>(null);
  const [attente, setAttente] = useState(0);
  const [nbFiches, setNbFiches] = useState(0);
  const { favori } = useAuth();
  const ids = profil?.favoriteItemIds || [];

  useEffect(() => { catalogue.parIds(ids).then(setFavoris); }, [ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { nombreEnAttente().then(setAttente); catalogue.compter().then(setNbFiches); }, [section]);

  const niveau = niveauPourXp(profil?.xp || 0);
  const total = Math.max(liste?.length ?? 0, profil?.contributionsCount ?? 0);
  const voix = Math.max(liste?.filter(c => c.audioUrl).length ?? 0, profil?.recordingsCount ?? 0);
  const accepte = !!(profil?.termsAccepted && profil?.dataUsageAccepted);

  // Série du graphique : cumul ou activité par jour, sur 7 j, 30 j ou depuis le début.
  const serie = useMemo(() => {
    const jours = new Map<string, number>();
    (liste || []).forEach(c => { const j = (c.createdAt || '').slice(0, 10); if (j) jours.set(j, (jours.get(j) || 0) + 1); });
    const aujourdhui = new Date();
    const debut = plage === 'all' ? new Date(Math.min(aujourdhui.getTime(), ...[...jours.keys()].map(j => Date.parse(j)).filter(Number.isFinite))) : new Date(aujourdhui.getTime() - ((plage === '7d' ? 7 : 30) - 1) * 86_400_000);
    const out: { jour: string; n: number; cumul: number }[] = [];
    let cumul = [...jours.entries()].filter(([j]) => Date.parse(j) < debut.setHours(0, 0, 0, 0)).reduce((a, [, n]) => a + n, 0);
    for (let d = new Date(debut); d <= aujourdhui && out.length < 400; d = new Date(d.getTime() + 86_400_000)) {
      const j = d.toISOString().slice(0, 10); const n = jours.get(j) || 0; cumul += n; out.push({ jour: j, n, cumul });
    }
    return out;
  }, [liste, plage]);
  const maxi = Math.max(1, ...serie.map(p => (mode === 'cumule' ? p.cumul : p.n)));
  const ajoutPeriode = serie.reduce((a, p) => a + p.n, 0);

  const dire = (f: QuestionnaireItem) => {
    Speech.stop();
    if (parole === f.id) { setParole(null); return; }
    setParole(f.id);
    Speech.speak(f.myeneText, { language: 'fr-FR', onDone: () => setParole(null), onStopped: () => setParole(null) });
  };
  const retirer = (c: Contribution) => confirmer('Supprimer cette contribution (et son enregistrement) ?', async () => {
    try { if (c.offlineQueued) await retirerDeLaFile(c.id); else await supprimerContribution(c.id); await charger(); } catch (e) { Alert.alert('Suppression impossible', (e as Error).message); }
  });

  if (!profil) return null;
  const statut = (c: Contribution) =>
    c.offlineQueued ? 'Sur l’appareil (envoi en attente)' : c.status === 'pending' ? 'En attente de validation'
    : c.status === 'approved' ? `Validée${c.rewardedXp ? ` · +${c.rewardedXp} XP` : ''}` : c.status === 'rejected' ? 'Refusée' : 'À revoir';

  return (
    <View style={{ gap: 12 }}>
      <View style={s.carte}>
        <View style={s.ligneH}>
          <View style={s.avatar}><Text style={s.avatarTexte}>{(profil.fullName || profil.displayName || 'U').charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.nom}>{profil.fullName || profil.displayName || 'Visiteur Nkala'}</Text>
            {profil.role === 'admin' && <Text style={s.badgeAdmin}>Aîné / Admin</Text>}
            <Text style={s.discret}>Niveau {niveau.index} : {niveau.name}</Text>
            {!!profil.contact && <Text style={s.discret}>{profil.contact}</Text>}
          </View>
        </View>
        <View style={s.pile}>
          <Pressable style={s.petit} onPress={() => emettre('guide')}><Text style={s.petitTexte}>Guide & Objectifs</Text></Pressable>
          <Pressable style={s.petit} onPress={() => setFiliation(true)}><Text style={s.petitTexte}>Modifier Généalogie</Text></Pressable>
        </View>
      </View>

      <View style={s.pile}>
        {([['apercu', 'Aperçu'], ['activite', 'Mon activité'], ['compte', 'Compte & données']] as const).map(([id, nom]) => (
          <Pressable key={id} onPress={() => setSection(id)} style={[s.onglet, section === id && s.ongletActif]}><Text style={[s.ongletTexte, section === id && { color: '#fff' }]}>{nom}</Text></Pressable>
        ))}
      </View>

      {section === 'apercu' && (
        <>
          <View style={s.carte}>
            <Text style={s.titre}>Filiation Nkala Enregistrée  Certifiée Conforme</Text>
            <Text style={s.texte}>Ethnie Myènè : {profil.tribe || 'Enenga'}</Text>
            <Text style={s.texte}>Clan Paternel : {profil.paternalClan || 'Avandji'}</Text>
            <Text style={s.texte}>Clan Maternel : {profil.maternalClan || 'Imvona'}</Text>
            <Text style={s.texte}>Village d'Origine : {profil.villageOfOrigin || 'Lambaréné'}</Text>
            <Text style={s.texte}>Lieu de Naissance : {profil.birthPlace || 'Lambaréné'}</Text>
            <Text style={s.texte}>Date de Naissance : {profil.birthDate || 'Non spécifiée'}</Text>
          </View>

          <View style={s.carte}>
            <Text style={s.titre}>Conditions & Consentement d'Utilisation des Données  <Text style={{ color: accepte ? '#86efac' : '#fca5a5', fontSize: 11 }}>{accepte ? '✓ Signé & Validé' : 'À valider'}</Text></Text>
            <Text style={s.discret}>Charte de Contribution Individuelle, Utilisation des Données et Système de Badges, Points & Récompenses Nkala (Essaka Engineering, Droit gabonais Loi n° 001/2011 & OAPI).</Text>
            {accepte && (
              <>
                <Text style={s.texte}>Statut d'engagement : Contributeur Individuel Direct</Text>
                <Text style={s.texte}>Validé le : {profil.termsAcceptedAt ? new Date(profil.termsAcceptedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Enregistré'}</Text>
                <Text style={s.texte}>Autorisations accordées : Données IA ✓ • Voix {profil.consentVoiceUsage !== false ? '✓' : 'Non'} • Image {profil.consentImageUsage ? '✓' : 'Non'}</Text>
                <Text style={s.texte}>Mention électronique : {profil.electronicSignature || `Lu et approuvé - ${profil.fullName}`}</Text>
              </>
            )}
            <Pressable style={s.petit} onPress={() => setConditions(true)}><Text style={s.petitTexte}>{accepte ? 'Relire les Conditions' : 'Lire & Accepter les Conditions'}</Text></Pressable>
          </View>

          <View style={s.grille}>
            <Stat v={profil.xp || 0} t="Points XP" c={couleurs.ambre} />
            <Stat v={total} t="Contributions" c={couleurs.terre} />
            <Stat v={voix} t="Voix données" c="#22c55e" />
          </View>

          <View style={s.carte}>
            <Text style={s.titre}>Progression des Contributions au Fil du Temps</Text>
            <Text style={s.discret}>{mode === 'cumule' ? `Évolution cumulée (${total} contribution${total > 1 ? 's' : ''} au total)` : `Activité par jour (+${ajoutPeriode} contribution${ajoutPeriode > 1 ? 's' : ''} sur la période)`}</Text>
            <View style={s.pile}>
              {([['cumule', 'Cumulé'], ['quotidien', 'Quotidien']] as const).map(([id, nom]) => <Pressable key={id} onPress={() => setMode(id)} style={[s.mini, mode === id && s.miniActif]}><Text style={[s.miniTexte, mode === id && { color: '#fff' }]}>{nom}</Text></Pressable>)}
              {([['7d', '7j'], ['30d', '30j'], ['all', 'Tout']] as const).map(([id, nom]) => <Pressable key={id} onPress={() => setPlage(id)} style={[s.mini, plage === id && s.miniActif]}><Text style={[s.miniTexte, plage === id && { color: '#fff' }]}>{nom}</Text></Pressable>)}
            </View>
            {!liste && !erreur ? <ActivityIndicator color={couleurs.ambre} /> : (
              <View style={s.barres}>{serie.map(p => (
                <View key={p.jour} style={s.colonne}><View style={[s.barre, { height: Math.max(2, ((mode === 'cumule' ? p.cumul : p.n) / maxi) * 70), backgroundColor: (mode === 'cumule' ? p.cumul : p.n) ? couleurs.ambre : couleurs.bord }]} /></View>
              ))}</View>
            )}
            {erreur && <Text style={s.erreur}>Historique indisponible : {erreur}</Text>}
          </View>
        </>
      )}

      {section === 'activite' && (
        <>
          <View style={s.carte}>
            <Text style={s.titre}>Mon Vocabulaire Myènè Favori</Text>
            <Text style={s.discret}>Vos expressions sauvegardées depuis l'onglet Explorer (disponibles hors-ligne)</Text>
            <Text style={s.texte}>{favoris.length} favori{favoris.length > 1 ? 's' : ''}</Text>
            {favoris.length === 0 && (
              <>
                <Text style={s.discret}>Vous n'avez pas encore ajouté de vocabulaire Myènè à vos favoris. Cliquez sur le bouton ⭐ Favori sur n'importe quelle fiche de l'onglet Explorer pour la retrouver ici à tout moment.</Text>
                <Pressable style={s.petit} onPress={() => { demanderOnglet('ezango'); routeur.push('/(tabs)'); }}><Text style={s.petitTexte}>Parcourir le Vocabulaire Myènè</Text></Pressable>
              </>
            )}
            {favoris.map(f => (
              <View key={f.id} style={s.element}>
                <View style={{ flex: 1 }}>
                  <Text style={s.myene}>{f.myeneText}</Text>
                  <Text style={s.texte}>« {f.frenchText} »</Text>
                  <Text style={s.discret}>Ethnie {f.dialect}</Text>
                </View>
                <Pressable onPress={() => dire(f)} hitSlop={8}><Text style={s.icone}>{parole === f.id ? '⏹' : '🔊'}</Text></Pressable>
                <Pressable onPress={() => favori(f.id)} hitSlop={8}><Text style={[s.icone, { color: couleurs.ambre }]}>★</Text></Pressable>
              </View>
            ))}
          </View>

          <View style={s.carte}>
            <Text style={s.titre}>Mes contributions ({liste?.length ?? 0})</Text>
            <Text style={s.discret}>Seules celles « en attente » peuvent être supprimées</Text>
            {!liste && !erreur && <ActivityIndicator color={couleurs.ambre} />}
            {erreur && <Text style={s.erreur}>Indisponible : {erreur}</Text>}
            {[...(liste || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 100).map(c => (
              <View key={c.id} style={s.element}>
                <View style={{ flex: 1 }}>
                  <Text style={s.texteClair} numberOfLines={1}>« {c.frenchText} »</Text>
                  <Text style={s.discret} numberOfLines={1}>{c.proposedSpelling || c.originalMyeneText} {c.audioUrl ? '· 🎙️' : ''} · {statut(c)}</Text>
                </View>
                {c.status === 'pending' && <Pressable onPress={() => retirer(c)} hitSlop={8}><Text style={s.danger}>Supprimer</Text></Pressable>}
              </View>
            ))}
          </View>
        </>
      )}

      {section === 'compte' && (
        <>
          <View style={s.carte}>
            <Text style={s.titre}>Statut & Privilèges :</Text>
            <Text style={s.discret}>Attribué par l'administration Nkala</Text>
            <Text style={s.texteClair}>{profil.role === 'admin' ? '👑 Administrateur' : profil.role === 'validator' ? '🔍 Validateur Certifié' : '✍️ Contributeur'}</Text>
          </View>
          <View style={s.carte}>
            <Text style={s.titre}>Stockage Hors-ligne & PWA :</Text>
            <Text style={s.discret}>{nbFiches.toLocaleString('fr-FR')} fiches en mémoire · {attente} contribution(s) en attente d’envoi</Text>
            <Pressable style={s.petit} onPress={() => emettre('horsligne')}><Text style={s.petitTexte}>Gérer le pack</Text></Pressable>
            <Pressable style={s.alerte} onPress={() => confirmer('Vider le cache hors-ligne ?', async () => { await catalogue.vider(); setNbFiches(0); })}><Text style={s.danger}>Vider le cache hors-ligne</Text></Pressable>
          </View>
          <MonCompte />
          <Pressable onPress={deconnexion}><Text style={s.danger}>{MYENE.KA_MENE.mot} · Se déconnecter</Text></Pressable>
        </>
      )}

      <ConditionsModale visible={conditions} onClose={() => setConditions(false)} />
      <Modal visible={filiation} animationType="slide" onRequestClose={() => setFiliation(false)}>
        <Inscription modifier onTermine={() => setFiliation(false)} />
      </Modal>
    </View>
  );
}

const Stat = ({ v, t, c }: { v: number; t: string; c: string }) => (
  <View style={s.stat}><Text style={[s.statV, { color: c }]}>{v.toLocaleString('fr-FR')}</Text><Text style={s.discret}>{t}</Text></View>
);

const s = stylesDyn(() => ({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  ligneH: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: couleurs.terre, alignItems: 'center', justifyContent: 'center' },
  avatarTexte: { color: '#fff', fontSize: 22, fontWeight: '900' },
  nom: { color: couleurs.texteClair, fontSize: 18, fontWeight: '800' },
  badgeAdmin: { color: couleurs.ambre, fontSize: 11, fontWeight: '800' },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 13 },
  texteClair: { color: couleurs.texteClair, fontSize: 14 },
  discret: { color: couleurs.discret, fontSize: 12 },
  myene: { color: couleurs.ambre, fontSize: 17, fontWeight: '800' },
  danger: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  erreur: { color: '#fca5a5', fontSize: 12 },
  onglet: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: couleurs.carte },
  ongletActif: { backgroundColor: couleurs.terre },
  ongletTexte: { color: couleurs.texte, fontSize: 13, fontWeight: '700' },
  petit: { borderColor: couleurs.ambre, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  petitTexte: { color: '#fde047', fontSize: 12, fontWeight: '800' },
  alerte: { borderColor: couleurs.bord, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  grille: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statV: { fontSize: 22, fontWeight: '900' },
  mini: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: couleurs.fond },
  miniActif: { backgroundColor: couleurs.terre },
  miniTexte: { color: couleurs.discret, fontSize: 11, fontWeight: '800' },
  barres: { flexDirection: 'row', alignItems: 'flex-end', height: 74, gap: 1 },
  colonne: { flex: 1, justifyContent: 'flex-end' },
  barre: { borderRadius: 2 },
  element: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: couleurs.fond, borderRadius: 12, padding: 10 },
  icone: { fontSize: 20, color: couleurs.texte },
}));
