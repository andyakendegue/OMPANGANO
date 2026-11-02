import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  chargerMesContributions, LIBELLE_STATUT, serieQuotidienne, supprimerContribution,
  type Contribution, type QuestionnaireItem,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { nombreEnAttente } from './fileAttente';
import { couleurs } from './theme';

const ROLES = { admin: 'Administrateur', validator: 'Validateur certifié', user: 'Contributeur' } as const;

/** Contributions de l'utilisateur, partagées entre « Aperçu » et « Mon activité ». */
function useMesContributions() {
  const [liste, setListe] = useState<Contribution[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(async () => {
    try { setListe(await chargerMesContributions()); setErreur(null); }
    catch (e) { setErreur((e as Error).message); }
  }, []);
  useEffect(() => { charger(); }, [charger]);
  return { liste, erreur, charger };
}

export function Apercu() {
  const { profil } = useAuth();
  const { liste, erreur } = useMesContributions();
  const serie = useMemo(() => serieQuotidienne(liste || [], 30), [liste]);
  const max = Math.max(1, ...serie.map(j => j.total));
  const nonVides = serie.filter(j => j.total > 0).length;
  return (
    <View style={{ gap: 12 }}>
      <View style={s.grille}>
        <Stat valeur={profil?.xp ?? 0} libelle="Points XP" couleur={couleurs.ambre} />
        <Stat valeur={Math.max(liste?.length ?? 0, profil?.contributionsCount ?? 0)} libelle="Contributions" couleur={couleurs.terre} />
        <Stat valeur={Math.max(liste?.filter(c => c.audioUrl).length ?? 0, profil?.recordingsCount ?? 0)} libelle="Voix données" couleur="#22c55e" />
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Niveau : {profil?.level || '—'}</Text>
        <Text style={s.discret}>Série en cours : {profil?.streakDays ?? 0} jour(s) · {profil?.badges?.length ?? 0} badge(s)</Text>
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>30 derniers jours</Text>
        {!liste && !erreur ? <ActivityIndicator color={couleurs.ambre} /> : (
          <>
            <View style={s.barres}>
              {serie.map(j => (
                <View key={j.jour} style={s.colonne}>
                  <View style={[s.barre, { height: Math.max(2, (j.total / max) * 70), backgroundColor: j.total ? couleurs.terre : couleurs.bord }]} />
                </View>
              ))}
            </View>
            <Text style={s.discret}>{nonVides} jour(s) actif(s) · pic : {max === 1 && !nonVides ? 0 : max} par jour</Text>
          </>
        )}
        {erreur && <Text style={s.erreur}>Historique indisponible : {erreur}</Text>}
      </View>
    </View>
  );
}

export function Activite() {
  const { profil, favori } = useAuth();
  const { liste, erreur, charger } = useMesContributions();
  const [favoris, setFavoris] = useState<QuestionnaireItem[]>([]);
  const ids = profil?.favoriteItemIds || [];

  useEffect(() => { catalogue.parIds(ids).then(setFavoris); }, [ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const retirer = (c: Contribution) => {
    const faire = async () => {
      try { await supprimerContribution(c.id); await charger(); }
      catch (e) { Alert.alert('Suppression impossible', (e as Error).message); }
    };
    if (Platform.OS === 'web') { faire(); return; }
    Alert.alert('Supprimer cette contribution ?', 'Elle est en attente de validation.', [
      { text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: faire },
    ]);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={s.carte}>
        <Text style={s.titre}>★ Mes favoris ({ids.length})</Text>
        {favoris.length === 0 && <Text style={s.discret}>Touchez l’étoile dans Ezango pour garder un mot ici.</Text>}
        {favoris.map(f => (
          <View key={f.id} style={s.ligne}>
            <View style={{ flex: 1 }}>
              <Text style={s.myene}>{f.myeneText}</Text>
              <Text style={s.texte}>{f.frenchText}</Text>
            </View>
            <Pressable onPress={() => favori(f.id)} hitSlop={10}><Text style={{ fontSize: 22, color: couleurs.ambre }}>★</Text></Pressable>
          </View>
        ))}
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Mes contributions</Text>
        {!liste && !erreur && <ActivityIndicator color={couleurs.ambre} />}
        {erreur && <Text style={s.erreur}>Indisponible : {erreur}</Text>}
        {liste?.length === 0 && <Text style={s.discret}>Pas encore de contribution.</Text>}
        {liste?.slice(0, 50).map(c => (
          <View key={c.id} style={s.ligne}>
            <View style={{ flex: 1 }}>
              <Text style={s.myene} numberOfLines={1}>{c.originalMyeneText}</Text>
              <Text style={s.discret}>{LIBELLE_STATUT[c.status] || c.status}{c.audioUrl ? ' · voix' : ''} · {(c.createdAt || '').slice(0, 10)}</Text>
            </View>
            {c.status === 'pending' && <Pressable onPress={() => retirer(c)} hitSlop={10}><Text style={s.supprimer}>Supprimer</Text></Pressable>}
          </View>
        ))}
        {(liste?.length ?? 0) > 50 && <Text style={s.discret}>50 plus récentes affichées sur {liste!.length}.</Text>}
      </View>
    </View>
  );
}

export function Compte() {
  const { profil, deconnexion } = useAuth();
  const [attente, setAttente] = useState(0);
  const [nbFiches, setNbFiches] = useState(0);
  useEffect(() => { nombreEnAttente().then(setAttente); catalogue.compter().then(setNbFiches); }, []);

  const viderCatalogue = async () => { await catalogue.vider(); setNbFiches(0); };
  const consent = !!(profil?.termsAccepted && profil?.dataUsageAccepted);

  return (
    <View style={{ gap: 12 }}>
      <View style={s.carte}>
        <Text style={s.titre}>{profil?.fullName || profil?.displayName || 'Contributeur Nkala'}</Text>
        <Text style={s.texte}>{profil?.email}</Text>
        <Text style={s.texte}>Statut : {ROLES[profil?.role || 'user']}</Text>
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Filiation</Text>
        <Text style={s.texte}>Tribu : {profil?.tribe || 'non renseignée'}</Text>
        <Text style={s.texte}>Clan paternel : {profil?.paternalClan || '—'}</Text>
        <Text style={s.texte}>Clan maternel : {profil?.maternalClan || '—'}</Text>
        <Text style={s.texte}>Village d’origine : {profil?.villageOfOrigin || '—'}</Text>
        {!profil?.registrationCompleted && <Text style={s.discret}>Le formulaire de filiation n’est pas encore disponible dans l’application mobile.</Text>}
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Conditions et données</Text>
        <Text style={consent ? s.ok : s.erreur}>{consent ? `Conditions acceptées${profil?.termsAcceptedAt ? ` le ${profil.termsAcceptedAt.slice(0, 10)}` : ''}` : 'Conditions non acceptées : acceptez-les dans Contribuer.'}</Text>
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Stockage sur l’appareil</Text>
        <Text style={s.texte}>{nbFiches.toLocaleString('fr-FR')} fiches en mémoire · {attente} contribution(s) en attente d’envoi</Text>
        <Pressable style={s.alerte} onPress={viderCatalogue}><Text style={s.alerteTexte}>Vider le catalogue local</Text></Pressable>
      </View>
      <Pressable onPress={deconnexion} style={s.sortie}><Text style={s.alerteTexte}>Se déconnecter</Text></Pressable>
    </View>
  );
}

const Stat = ({ valeur, libelle, couleur }: { valeur: number; libelle: string; couleur: string }) => (
  <View style={s.stat}><Text style={[s.statValeur, { color: couleur }]}>{valeur.toLocaleString('fr-FR')}</Text><Text style={s.discret}>{libelle}</Text></View>
);

const s = StyleSheet.create({
  grille: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statValeur: { fontSize: 22, fontWeight: '900' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 14 },
  discret: { color: couleurs.discret, fontSize: 12 },
  myene: { color: couleurs.ambre, fontSize: 16, fontWeight: '800' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopColor: couleurs.bord, borderTopWidth: StyleSheet.hairlineWidth },
  barres: { flexDirection: 'row', alignItems: 'flex-end', height: 74, gap: 2 },
  colonne: { flex: 1, justifyContent: 'flex-end' },
  barre: { borderRadius: 2 },
  supprimer: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  ok: { color: '#86efac', fontSize: 13 },
  erreur: { color: '#fca5a5', fontSize: 13 },
  alerte: { borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  alerteTexte: { color: '#fca5a5', fontWeight: '700' },
  sortie: { borderColor: '#ef4444', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
});
