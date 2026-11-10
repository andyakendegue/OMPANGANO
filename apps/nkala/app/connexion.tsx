import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { afficherTelephone, envoyerCodeSms, MYENE, normaliserTelephone } from '@nkala/noyau';
import { useAuth } from '../src/AuthProvider';
import { ConnexionClassique } from '../src/ConnexionClassique';
import { Bouton, Champ, Entete, Ecran, Mascotte, T, useToast } from '../src/kit';
import { useTheme } from '../src/Prefs';

type Vue = 'choix' | 'tel' | 'code' | 'classique';

/** Écrans 06, 07 et 10 : téléphone (compte unique par numéro, code SMS envoyé par Twilio), retour d'un membre, essai sans compte. */
export default function Connexion() {
  const { connexionSms, entrerInvite } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const [vue, setVue] = useState<Vue>('choix');
  const [saisie, setSaisie] = useState('');
  const [tel, setTel] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [attente, setAttente] = useState(0);

  useEffect(() => { if (attente <= 0) return; const t = setTimeout(() => setAttente(a => a - 1), 1000); return () => clearTimeout(t); }, [attente]);

  const envoyer = async () => {
    const n = normaliserTelephone(saisie);
    if (!n) { setErreur('Ce numéro ne semble pas valide. Exemple : 06 12 34 56.'); return; }
    setOccupe(true); setErreur(null);
    try { await envoyerCodeSms(n); setTel(n); setVue('code'); setCode(''); setAttente(30); }
    catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };
  const verifier = async () => {
    if (!tel || code.length < 4) return;
    setOccupe(true); setErreur(null);
    try { await connexionSms(tel, code); }
    catch (e) { setErreur((e as Error).message); setOccupe(false); }
  };

  if (vue === 'classique') return <View style={{ flex: 1 }}><ConnexionClassique /><View style={{ position: 'absolute', top: 12, left: 12 }}><Bouton label="Retour" variante="fantome" petit large={false} icone="retour" onPress={() => setVue('choix')} /></View></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Ecran>
        {vue === 'choix' && <>
          <View style={{ alignItems: 'center', gap: 10, marginTop: 24 }}>
            <Mascotte taille={120} humeur="content" />
            <T v="titre" style={{ textAlign: 'center' }}>{MYENE.MBOLO.mot} !</T>
            <T v="corps" style={{ textAlign: 'center' }}>Entre dans Nkala avec ton numéro de téléphone : un seul compte, sur tous tes appareils.</T>
          </View>
          <Bouton label="Continuer avec mon téléphone" icone="telephone" onPress={() => setVue('tel')} />
          <Bouton label="Continuer avec Google" variante="fantome" icone="profil" onPress={() => setVue('classique')} />
          <Pressable accessibilityRole="button" onPress={entrerInvite} style={{ alignItems: 'center', padding: 12 }}><T v="corps" couleur={c.accent} style={{ textDecorationLine: 'underline' }}>Essayer sans compte</T></Pressable>
          <T v="petit" style={{ textAlign: 'center' }}>Sans compte, tes leçons et tes parties restent sur ce téléphone. Pour contribuer, publier ou apparaître dans les classements, il faut un compte.</T>
        </>}
        {vue === 'tel' && <>
          <Entete titre="Ton numéro" sous="On t'envoie un code par SMS" retour={() => { setVue('choix'); setErreur(null); }} />
          <T v="corps">Un numéro = un compte. Si tu as déjà un compte, tu le retrouveras.</T>
          <Champ valeur={saisie} onChange={setSaisie} placeholder="06 12 34 56" icone="telephone" clavier="phone-pad" focus onSubmit={envoyer} label="Numéro de téléphone" />
          <T v="petit">Indicatif +241 (Gabon) ajouté automatiquement. Pour un autre pays, commence par + et l'indicatif.</T>
          {!!erreur && <T v="corps" couleur={c.erreur} accessibilityRole="alert">{erreur}</T>}
          <Bouton label="Recevoir le code" charge={occupe} onPress={envoyer} />
        </>}
        {vue === 'code' && <>
          <Entete titre="Code reçu par SMS" sous={tel ? afficherTelephone(tel) : ''} retour={() => { setVue('tel'); setErreur(null); }} />
          <Champ valeur={code} onChange={t => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="6 chiffres" icone="verrou" clavier="number-pad" focus onSubmit={verifier} label="Code à 6 chiffres" />
          {!!erreur && <T v="corps" couleur={c.erreur} accessibilityRole="alert">{erreur}</T>}
          <Bouton label="Valider" charge={occupe} desactive={code.length < 4} onPress={verifier} />
          <Bouton label={attente > 0 ? `Renvoyer le code (${attente} s)` : 'Renvoyer le code'} variante="fantome" desactive={attente > 0 || occupe} onPress={async () => { try { await envoyerCodeSms(tel!); setAttente(30); toast('Code renvoyé.', 'succes'); } catch (e) { setErreur((e as Error).message); } }} />
        </>}
      </Ecran>
    </KeyboardAvoidingView>
  );
}
