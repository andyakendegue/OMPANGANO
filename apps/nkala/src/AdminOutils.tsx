import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  chargerUtilisateurs, csvReponses, csvUtilisateurs, doublonsParNom, etatServeur, lireCollection, nomFichierExport, supprimerElement,
  synchroniserCatalogue, toutesLesContributions, LIBELLE_STATUT,
  type ClanRegistry, type ContributionStatus, type VillageRegistry,
} from '@nkala/noyau';
import { Pilotage } from './Admin';
import { catalogue } from './catalogue';
import { partagerFichier } from './partage';
import { couleursSombres as couleurs } from './theme';

const avertir = (t: string, m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(`${t}\n${m}`) : Alert.alert(t, m));
const confirmer = (titre: string, msg: string, ok: () => void) => {
  if (Platform.OS === 'web') { if ((globalThis as any).confirm?.(`${titre}\n${msg}`)) ok(); return; }
  Alert.alert(titre, msg, [{ text: 'Annuler', style: 'cancel' }, { text: 'Confirmer', style: 'destructive', onPress: ok }]);
};

export function GroupePilotage() {
  const [r, setR] = useState<'vue' | 'export' | 'outils'>('vue');
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {([['vue', 'Vue d’ensemble'], ['export', 'Export'], ['outils', 'Outils base de données']] as const).map(([id, nom]) => (
          <Pressable key={id} onPress={() => setR(id)} style={[s.puce, r === id && s.puceActive]}><Text style={[s.puceTexte, r === id && s.puceTexteActif]}>{nom}</Text></Pressable>
        ))}
      </ScrollView>
      {r === 'vue' && <Pilotage />}
      {r === 'export' && <Export />}
      {r === 'outils' && <Outils />}
    </View>
  );
}

// ---------------------------------------------------------------- Export

const STATUTS: (ContributionStatus | 'all')[] = ['all', 'pending', 'approved', 'rejected', 'needs_revision', 'audio_approved_text_revision', 'text_approved_audio_revision'];

function Export() {
  const [statut, setStatut] = useState<ContributionStatus | 'all'>('all');
  const [avecAudio, setAvecAudio] = useState<'tous' | 'voix' | 'texte'>('tous');
  const [etat, setEtat] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const lancer = async (travail: () => Promise<string>) => {
    setOccupe(true); setEtat(null);
    try { setEtat(await travail()); }
    catch (e) { avertir('Export impossible', (e as Error).message); }
    finally { setOccupe(false); }
  };

  const reponses = () => lancer(async () => {
    let l = await toutesLesContributions(statut, n => setEtat(`${n} contributions lues…`));
    if (avecAudio === 'voix') l = l.filter(c => c.audioUrl);
    if (avecAudio === 'texte') l = l.filter(c => !c.audioUrl);
    await partagerFichier(nomFichierExport('reponses', 'csv'), csvReponses(l));
    return `${l.length} réponse(s) exportée(s).`;
  });
  const utilisateurs = () => lancer(async () => {
    const l = await chargerUtilisateurs();
    await partagerFichier(nomFichierExport('utilisateurs', 'csv'), csvUtilisateurs(l));
    return `${l.length} utilisateur(s) exporté(s).`;
  });

  return (
    <View style={{ gap: 12 }}>
      <View style={s.carte}>
        <Text style={s.titre}>Réponses des contributeurs (CSV)</Text>
        <Text style={s.etiquette}>Statut</Text>
        <View style={s.pile}>
          {STATUTS.map(v => (
            <Pressable key={v} onPress={() => setStatut(v)} style={[s.puce, statut === v && s.puceActive]}>
              <Text style={[s.puceTexte, statut === v && s.puceTexteActif]}>{v === 'all' ? 'Tous' : LIBELLE_STATUT[v]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.etiquette}>Enregistrement vocal</Text>
        <View style={s.pile}>
          {([['tous', 'Tous'], ['voix', 'Avec voix'], ['texte', 'Texte seul']] as const).map(([v, nom]) => (
            <Pressable key={v} onPress={() => setAvecAudio(v)} style={[s.puce, avecAudio === v && s.puceActive]}><Text style={[s.puceTexte, avecAudio === v && s.puceTexteActif]}>{nom}</Text></Pressable>
          ))}
        </View>
        <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={reponses} disabled={occupe}><Text style={s.boutonTexte}>Exporter les réponses</Text></Pressable>
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Utilisateurs et consentements (CSV)</Text>
        <Text style={s.discret}>Données personnelles : à ne partager qu’avec les personnes habilitées.</Text>
        <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={utilisateurs} disabled={occupe}><Text style={s.boutonTexte}>Exporter les utilisateurs</Text></Pressable>
      </View>
      {occupe && <ActivityIndicator color={couleurs.ambre} />}
      {etat && <Text style={s.ok}>{etat}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------- Outils de base de données

interface Audit {
  clans: ReturnType<typeof doublonsParNom>;
  villages: ReturnType<typeof doublonsParNom>;
  fiches: { dialecte: string; texte: string; ids: string[] }[];
  nbClans: number; nbVillages: number; nbFiches: number;
}

function Outils() {
  const [serveur, setServeur] = useState<{ ok: boolean; ms: number } | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const auditer = async () => {
    setOccupe(true); setMessage(null);
    try {
      const [clans, villages] = await Promise.all([lireCollection<ClanRegistry>('clans'), lireCollection<VillageRegistry>('villages')]);
      setAudit({
        clans: doublonsParNom(clans), villages: doublonsParNom(villages), fiches: await catalogue.doublons(50),
        nbClans: clans.length, nbVillages: villages.length, nbFiches: await catalogue.compter(),
      });
    } catch (e) { avertir('Audit impossible', (e as Error).message); }
    finally { setOccupe(false); }
  };

  const retirer = (col: 'clans' | 'villages', ids: string[]) =>
    confirmer(`Supprimer ${ids.length} doublon(s) de ${col} ?`, 'Le plus ancien de chaque groupe est conservé.', async () => {
      setOccupe(true);
      try { for (const id of ids) await supprimerElement(col, id); setMessage(`${ids.length} doublon(s) de ${col} supprimé(s).`); await auditer(); }
      catch (e) { avertir('Suppression impossible', (e as Error).message); setOccupe(false); }
    });

  const resynchroniser = () => confirmer('Retélécharger le catalogue ?', 'La copie locale est vidée puis reconstruite depuis le serveur (plusieurs Mo).', async () => {
    setOccupe(true); setMessage('Téléchargement en cours…');
    await catalogue.vider();
    const r = await synchroniserCatalogue(catalogue, p => setMessage(`Téléchargement ${p.fait.toLocaleString('fr-FR')} / ${p.total.toLocaleString('fr-FR')}`));
    setMessage(r.ok ? `Catalogue rechargé : ${(await catalogue.compter()).toLocaleString('fr-FR')} fiches.` : 'Échec du téléchargement : réessayez avec une meilleure connexion.');
    setOccupe(false);
  });

  return (
    <View style={{ gap: 12 }}>
      <View style={s.carte}>
        <Text style={s.titre}>État du serveur</Text>
        {serveur && <Text style={serveur.ok ? s.ok : s.danger}>{serveur.ok ? `Serveur joignable (${serveur.ms} ms)` : 'Serveur injoignable'}</Text>}
        <Pressable style={s.bouton} onPress={async () => setServeur(await etatServeur())}><Text style={s.boutonTexte}>Tester la connexion</Text></Pressable>
      </View>

      <View style={s.carte}>
        <Text style={s.titre}>Audit des doublons</Text>
        <Text style={s.discret}>Clans et villages de même ethnie et même nom ; fiches de même dialecte et même texte (dans la copie locale). Rien n’est modifié sans votre confirmation.</Text>
        <Pressable style={s.bouton} onPress={auditer} disabled={occupe}><Text style={s.boutonTexte}>Lancer l’audit</Text></Pressable>
        {audit && (
          <View style={{ gap: 6 }}>
            <Text style={s.texte}>{audit.nbClans} clans · {audit.nbVillages} villages · {audit.nbFiches.toLocaleString('fr-FR')} fiches</Text>
            <Text style={audit.clans.aSupprimer.length ? s.danger : s.ok}>Clans en double : {audit.clans.aSupprimer.length}</Text>
            {audit.clans.groupes.slice(0, 5).map(g => <Text key={g.cle} style={s.discret}>• {g.noms[0]} ×{g.ids.length}</Text>)}
            {audit.clans.aSupprimer.length > 0 && <Pressable onPress={() => retirer('clans', audit.clans.aSupprimer)}><Text style={s.danger}>Supprimer les doublons de clans</Text></Pressable>}
            <Text style={audit.villages.aSupprimer.length ? s.danger : s.ok}>Villages en double : {audit.villages.aSupprimer.length}</Text>
            {audit.villages.groupes.slice(0, 5).map(g => <Text key={g.cle} style={s.discret}>• {g.noms[0]} ×{g.ids.length}</Text>)}
            {audit.villages.aSupprimer.length > 0 && <Pressable onPress={() => retirer('villages', audit.villages.aSupprimer)}><Text style={s.danger}>Supprimer les doublons de villages</Text></Pressable>}
            <Text style={audit.fiches.length ? s.danger : s.ok}>Fiches en double (50 premiers groupes) : {audit.fiches.length}</Text>
            {audit.fiches.slice(0, 8).map((g, i) => <Text key={i} style={s.discret} numberOfLines={1}>• {g.dialecte} · {g.texte} ×{g.ids.length}</Text>)}
            {audit.fiches.length > 0 && <Text style={s.discret}>Les fiches en double se retirent depuis Contenu, rubrique Fiches (l’import ignore déjà les doublons).</Text>}
          </View>
        )}
      </View>

      <View style={s.carte}>
        <Text style={s.titre}>Catalogue local</Text>
        <Text style={s.discret}>Si les fiches paraissent incomplètes ou obsolètes sur cet appareil, reconstruisez la copie locale.</Text>
        <Pressable style={[s.bouton, { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 }]} onPress={resynchroniser} disabled={occupe}><Text style={s.boutonTexte}>Retélécharger le catalogue</Text></Pressable>
      </View>
      {occupe && <ActivityIndicator color={couleurs.ambre} />}
      {message && <Text style={s.ok}>{message}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 13 },
  discret: { color: couleurs.discret, fontSize: 12 },
  etiquette: { color: couleurs.texte, fontSize: 12, fontWeight: '700' },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  puceTexteActif: { color: '#fff', fontWeight: '700' },
  danger: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  ok: { color: '#86efac', fontSize: 13 },
});
