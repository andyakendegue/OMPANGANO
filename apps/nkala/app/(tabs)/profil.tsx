import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/AuthProvider';
import { Bientot, Section } from '../../src/Section';
import { couleurs } from '../../src/theme';

function Compte() {
  const { profil, deconnexion } = useAuth();
  return (
    <View style={{ gap: 12 }}>
      <View style={s.carte}>
        <Text style={s.nom}>{profil?.fullName || profil?.displayName || 'Contributeur Nkala'}</Text>
        <Text style={s.info}>{profil?.email}</Text>
        <Text style={s.info}>Rôle : {profil?.role === 'admin' ? 'Administrateur' : profil?.role === 'validator' ? 'Validateur certifié' : 'Contributeur'}</Text>
      </View>
      <Bientot texte="Filiation, consentement, stockage hors-ligne : à porter depuis UserProfileView.tsx." />
      <Pressable onPress={deconnexion} style={s.sortie}><Text style={s.sortieTexte}>Se déconnecter</Text></Pressable>
    </View>
  );
}

export default function Profil() {
  const { profil } = useAuth();
  return (
    <Section titre="Profil" onglets={[
      { id: 'apercu', label: 'Aperçu', contenu: <Bientot texte={`${profil?.xp ?? 0} XP · ${profil?.contributionsCount ?? 0} contributions. Courbe : à porter depuis UserProfileView.tsx.`} /> },
      { id: 'activite', label: 'Mon activité', contenu: <Bientot texte="Favoris et mes contributions." /> },
      { id: 'compte', label: 'Compte & données', contenu: <Compte /> },
    ]} />
  );
}

const s = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  nom: { color: couleurs.texteClair, fontSize: 17, fontWeight: '800' },
  info: { color: couleurs.texte, fontSize: 13 },
  sortie: { borderColor: '#ef4444', borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  sortieTexte: { color: '#fca5a5', fontWeight: '700' },
});
