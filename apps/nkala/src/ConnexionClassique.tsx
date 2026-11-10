import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useAuth } from './AuthProvider';
import { BoutonGoogle } from './Google';
import { couleurs, stylesDyn } from './theme';
import { Logo, fond, useLarge } from './Fond';

/** Écran d'accès (mêmes textes que AuthGateScreen du site web). Pas de connexion anonyme. */
export function ConnexionClassique() {
  const { erreurProfil } = useAuth();
  const [erreur, setErreur] = useState<string | null>(null);
  const large = useLarge();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[{ flex: 1 }, fond]}>
      <ScrollView contentContainerStyle={[s.page, large && s.pageLarge]}>
        <View style={[s.colonne, large && s.colonneLarge]}>
        <View style={{ alignItems: 'center', marginTop: 24 }}><Logo taille={84} /></View>
        <Text style={s.marque}>Nkala <Text style={s.essaka}> ESSAKA </Text></Text>
        <Text style={s.sous}>Crowdsourcing & Sauvegarde de la Langue Myènè</Text>
        <View style={s.pile}><Text style={s.badge}>Mode Avion Prêt</Text><Text style={s.badge}>Accès Sécurisé Réservé</Text><Text style={s.badge}>Authentification Obligatoire</Text></View>
        <Text style={s.h1}>Gardons Vivante la Parole de nos Aïeux</Text>
        <Text style={s.texte}>Pour garantir l'authenticité patrimoniale des enregistrements oraux, l'ancrage tribal et généalogique des locuteurs et l'intégrité du corpus linguistique, l'accès à l'application est strictement réservé aux membres identifiés.</Text>
        <Argument t="Voix Certifiées" d="Traçabilité de chaque enregistrement vocal" />
        <Argument t="Ancrage Ethnique" d="6 ethnies Myènè, filiation et village d'origine" />
        <Argument t="Titres & Badges" d="Progression de sagesse et récompenses" />
        <Argument t="Mode Hors-Ligne" d="Collecte autonome dans les villages" />

        </View>
        <View style={[s.colonne, large && s.colonneLarge]}>
        <View style={s.carte}>
          <Text style={s.h2}>Continuer avec Google</Text>
          <Text style={s.texte}>Identifiez-vous pour accéder au studio de contribution</Text>
          <BoutonGoogle surErreur={setErreur} />
          {(erreur || erreurProfil) && <Text style={s.erreur}>{erreur || `Profil indisponible : ${erreurProfil}`}</Text>}
          <Text style={s.discret}>🔒 Authentification sécurisée par le protocole Nkala.</Text>
        </View>
        <Text style={s.discret}>Nkala • Sauvegarde et Vitalisation des Langues Myènè du Gabon</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Argument = ({ t, d }: { t: string; d: string }) => (
  <View style={s.argument}><Text style={s.argTitre}>{t}</Text><Text style={[s.discret, { textAlign: 'left' }]}>{d}</Text></View>
);

const s = stylesDyn(() => ({
  page: { padding: 20, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center', paddingBottom: 48 },
  // Grand écran : présentation à gauche, formulaire à droite
  pageLarge: { maxWidth: 1040, flexDirection: 'row', alignItems: 'center', gap: 40, padding: 32, minHeight: '100%' },
  colonne: { gap: 12 },
  colonneLarge: { flex: 1 },
  marque: { color: couleurs.texteClair, fontSize: 32, fontWeight: '900', textAlign: 'center', marginTop: 4 },
  essaka: { fontSize: 11, backgroundColor: couleurs.terre, color: '#fff' },
  sous: { color: couleurs.ambre, textAlign: 'center', fontSize: 13 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  badge: { color: couleurs.ambre, fontSize: 11, fontWeight: '700', borderColor: '#92400e', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  h1: { color: couleurs.texteClair, fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  h2: { color: couleurs.texteClair, fontSize: 18, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 13, lineHeight: 19 },
  discret: { color: couleurs.discret, fontSize: 12, textAlign: 'center' },
  argument: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, padding: 10 },
  argTitre: { color: couleurs.ambre, fontWeight: '800', fontSize: 13 },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 20, padding: 16, gap: 10, marginTop: 8 },
  onglet: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  ongletActif: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  ongletTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '700' },
  etiquette: { color: couleurs.texte, fontSize: 12, fontWeight: '700' },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  erreur: { color: '#fca5a5', fontSize: 13 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 15 },
}));
