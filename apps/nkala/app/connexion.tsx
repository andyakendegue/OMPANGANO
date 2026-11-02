import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../src/AuthProvider';
import { couleurs } from '../src/theme';

export default function Connexion() {
  const { connexion, erreurProfil } = useAuth();
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [creer, setCreer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = async () => {
    if (!email.trim() || mdp.length < 6) { setErreur('Adresse e-mail et mot de passe (6 caractères minimum) requis.'); return; }
    setOccupe(true); setErreur(null);
    try { await connexion(email, mdp, creer); }
    catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.page}>
      <Text style={s.marque}>Nkala</Text>
      <Text style={s.sous}>Sauvegarde et transmission des langues myènè</Text>
      <View style={s.carte}>
        <TextInput style={s.champ} placeholder="Adresse e-mail" placeholderTextColor={couleurs.discret}
          autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
        <TextInput style={s.champ} placeholder="Mot de passe" placeholderTextColor={couleurs.discret}
          secureTextEntry autoComplete={creer ? 'new-password' : 'current-password'} value={mdp} onChangeText={setMdp} onSubmitEditing={valider} />
        {(erreur || erreurProfil) && <Text style={s.erreur}>{erreur || `Profil indisponible : ${erreurProfil}`}</Text>}
        <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={valider} disabled={occupe}>
          {occupe ? <ActivityIndicator color="#fff" /> : <Text style={s.boutonTexte}>{creer ? 'Créer mon compte' : 'Se connecter'}</Text>}
        </Pressable>
        <Pressable onPress={() => { setCreer(!creer); setErreur(null); }}>
          <Text style={s.lien}>{creer ? 'J’ai déjà un compte' : 'Créer un compte'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond, justifyContent: 'center', padding: 20 },
  marque: { color: couleurs.texteClair, fontSize: 34, fontWeight: '900', textAlign: 'center' },
  sous: { color: couleurs.ambre, textAlign: 'center', marginBottom: 24, fontSize: 13 },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 20, padding: 16, gap: 12, maxWidth: 420, width: '100%', alignSelf: 'center' },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  erreur: { color: '#fca5a5', fontSize: 13 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 15 },
  lien: { color: couleurs.ambre, textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
