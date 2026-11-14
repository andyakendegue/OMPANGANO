/**
 * Mes données et mon compte (SECURITE_ISO27001.md, P1 ; exigé par Google Play et l'App Store) :
 * télécharger mes données, déconnecter tous mes appareils, supprimer mon compte.
 */
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { deleteUser } from 'firebase/auth';
import { ApiError, exporterMesDonnees, revoquerMesSessions, supprimerMonCompte } from '@nkala/noyau';
import { auth } from './firebase';
import { useAuth } from './AuthProvider';
import { partagerFichier } from './partage';
import { Bouton } from './kit';
import { couleurs } from './theme';

const message = (m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(m) : Alert.alert('Nkala', m));

export function MonCompte() {
  const { deconnexion } = useAuth();
  const s = styles();
  const [charge, setCharge] = useState<'' | 'export' | 'sessions' | 'suppression'>('');
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [garderVoix, setGarderVoix] = useState(false);
  const [soldeNkr, setSoldeNkr] = useState<string | null>(null);

  const exporter = async () => {
    setCharge('export');
    try {
      const d = await exporterMesDonnees();
      await partagerFichier('mes-donnees-nkala.json', JSON.stringify(d, null, 2), 'application/json');
    } catch (e) { message((e as Error).message); } finally { setCharge(''); }
  };

  const deconnecterPartout = async () => {
    setCharge('sessions');
    try { await revoquerMesSessions(); await deconnexion(); message('Tous vos appareils sont déconnectés.'); }
    catch (e) { message((e as Error).message); } finally { setCharge(''); }
  };

  const supprimer = async () => {
    setCharge('suppression');
    try {
      await supprimerMonCompte({ garderEnregistrements: garderVoix, abandonnerSoldeNkorouna: soldeNkr !== null });
      // Compte Google / e-mail chez Firebase : effacé aussi quand c'est possible (sinon la connexion recrée un compte vide)
      if (auth.currentUser) await deleteUser(auth.currentUser).catch(() => {});
      setOuvert(false);
      await deconnexion();
      message('Votre compte et vos données ont été supprimés.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setSoldeNkr(e.message);
      else message((e as Error).message);
    } finally { setCharge(''); }
  };

  return (
    <View style={s.carte}>
      <Text style={s.titre}>Mes données et mon compte</Text>
      <Text style={s.discret}>Vous pouvez à tout moment récupérer une copie de vos données ou supprimer votre compte.</Text>
      <Bouton label="Télécharger mes données" icone="download-outline" variante="fantome" charge={charge === 'export'} onPress={exporter} />
      <Bouton label="Déconnecter tous mes appareils" icone="log-out-outline" variante="fantome" charge={charge === 'sessions'} onPress={deconnecterPartout} />
      <Pressable accessibilityRole="button" onPress={() => { setSaisie(''); setSoldeNkr(null); setOuvert(true); }} style={s.lienDanger}>
        <Text style={s.danger}>Supprimer mon compte</Text>
      </Pressable>

      <Modal visible={ouvert} animationType="slide" transparent onRequestClose={() => setOuvert(false)}>
        <View style={s.fond}>
          <ScrollView contentContainerStyle={s.boite}>
            <Text style={s.titre}>Supprimer définitivement mon compte</Text>
            <Text style={s.texte}>Seront effacés : votre profil, votre e-mail et votre numéro, votre progression, vos scores, vos discussions avec Kak'Igonjo, vos certificats et vos accès payants en cours.</Text>
            <Text style={s.texte}>Les phrases que vous avez proposées restent dans le corpus, sans votre nom. Les paiements sont gardés 10 ans (obligation comptable), sans lien avec un profil.</Text>
            <View style={s.ligne}>
              <Switch value={garderVoix} onValueChange={setGarderVoix} accessibilityLabel="Laisser mes enregistrements au corpus, anonymes" />
              <Text style={[s.texte, { flex: 1 }]}>Laisser mes enregistrements de voix au corpus, de façon anonyme (sinon ils sont effacés).</Text>
            </View>
            {soldeNkr && <Text style={s.danger}>{soldeNkr} En confirmant à nouveau, vous renoncez à ce solde.</Text>}
            <Text style={s.texte}>Pour confirmer, écrivez SUPPRIMER :</Text>
            <TextInput value={saisie} onChangeText={setSaisie} autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Écrire SUPPRIMER pour confirmer" style={s.champ} placeholder="SUPPRIMER" placeholderTextColor="#8a7a70" />
            <Bouton label="Supprimer mon compte" desactive={saisie.trim().toUpperCase() !== 'SUPPRIMER'} charge={charge === 'suppression'} onPress={supprimer} />
            <Bouton label="Annuler" variante="fantome" onPress={() => setOuvert(false)} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Couleurs lues à chaque rendu : elles suivent le thème clair ou sombre
const styles = () => StyleSheet.create({
  carte: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  titre: { fontSize: 16, fontWeight: '700', color: couleurs.texte },
  discret: { fontSize: 13, color: couleurs.discret },
  texte: { fontSize: 14, color: couleurs.texte, lineHeight: 20 },
  danger: { color: '#E5484D', fontWeight: '600' },
  lienDanger: { paddingVertical: 8 },
  fond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  boite: { gap: 12, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: couleurs.fond },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  champ: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 12, color: couleurs.texte, fontSize: 16 },
});
