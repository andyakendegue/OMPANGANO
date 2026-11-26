import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { MYENE } from '@nkala/noyau';
import { useAuth } from '../src/AuthProvider';
import { ConnexionClassique } from '../src/ConnexionClassique';
import { Bouton, Ecran, Mascotte, T } from '../src/kit';
import { ThemeKey, useTheme } from '../src/Prefs';

type Vue = 'choix' | 'classique';

/** Écrans 06 et 10 : connexion Google ou accès sans compte (téléphone/SMS temporairement désactivé). */
export default function Connexion() {
  const { entrerInvite } = useAuth();
  const { c } = useTheme();
  const [vue, setVue] = useState<Vue>('choix');

  if (vue === 'classique') return <View style={{ flex: 1 }}><ThemeKey><ConnexionClassique /></ThemeKey><View style={{ position: 'absolute', top: 12, left: 12 }}><Bouton label="Retour" variante="fantome" petit large={false} icone="retour" onPress={() => setVue('choix')} /></View></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Ecran>
        <View style={{ alignItems: 'center', gap: 10, marginTop: 24 }}>
          <Mascotte taille={120} humeur="content" />
          <T v="titre" style={{ textAlign: 'center' }}>{MYENE.MBOLO.mot} !</T>
          <T v="corps" style={{ textAlign: 'center' }}>Entre dans Nkala avec ton compte Google : un seul compte, sur tous tes appareils.</T>
        </View>
        <Bouton label="Continuer avec Google" icone="profil" onPress={() => setVue('classique')} />
        <Pressable accessibilityRole="button" onPress={entrerInvite} style={{ alignItems: 'center', padding: 12 }}><T v="corps" couleur={c.accent} style={{ textDecorationLine: 'underline' }}>Essayer sans compte</T></Pressable>
        <T v="petit" style={{ textAlign: 'center' }}>Sans compte, tes leçons et tes parties restent sur ce téléphone. Pour contribuer, publier ou apparaître dans les classements, il faut un compte.</T>
      </Ecran>
    </KeyboardAvoidingView>
  );
}
