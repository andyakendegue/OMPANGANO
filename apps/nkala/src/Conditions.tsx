import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { TEXTES_CONDITIONS, VERSION_CONDITIONS } from '@nkala/noyau';
import { api } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { BlocsTexte, EcranModal } from './ui';
import { couleurs, stylesDyn } from './theme';

type Onglet = 'consentement' | 'conditions' | 'recompenses_badges';
const ONGLETS: [Onglet, string][] = [
  ['consentement', '1. Mon Consentement Individuel'], ['conditions', '2. Conditions Générales (Art. 1–12)'], ['recompenses_badges', '3. Badges, Points & Récompenses'],
];

/** Conditions de la plateforme et consentement du contributeur (textes du site web, mêmes contrôles et mêmes messages). */
export function ConditionsModale({ visible, rappel, onClose }: { visible: boolean; rappel?: boolean; onClose: () => void }) {
  const { profil, recharger } = useAuth();
  const [onglet, setOnglet] = useState<Onglet>('consentement');
  const [conditions, setConditions] = useState(false);
  const [donnees, setDonnees] = useState(false);
  const [voix, setVoix] = useState(true);
  const [image, setImage] = useState(false);
  const [tuteur, setTuteur] = useState('');
  const [signature, setSignature] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const nom = profil?.fullName || profil?.displayName || 'Contributeur';
  useEffect(() => {
    if (!visible) return;
    setConditions(profil?.termsAccepted ?? false); setDonnees(profil?.dataUsageAccepted ?? false);
    setVoix(profil?.consentVoiceUsage ?? true); setImage(profil?.consentImageUsage ?? false);
    setTuteur(profil?.legalGuardianName || ''); setSignature(profil?.electronicSignature || `Lu et approuvé - ${nom}`);
    setErreur(null); setOnglet('consentement');
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = TEXTES_CONDITIONS.consentement;
  const vars = { userName: nom, userBirthDate: profil?.birthDate || '—', userBirthPlace: profil?.birthPlace || '—' };

  const valider = async () => {
    setErreur(null);
    if (!conditions) return setErreur('Vous devez accepter les Conditions Générales de Contribution Individuelle de la plateforme Nkala.');
    if (!donnees) return setErreur("Vous devez valider l'autorisation d'utilisation de vos données pour pouvoir contribuer sur la plateforme.");
    if (!signature.trim()) return setErreur('Veuillez renseigner votre mention de validation électronique (« Lu et approuvé » suivi de votre nom).');
    setOccupe(true);
    try {
      await api('PATCH', '/v1/me', {
        termsAccepted: true, dataUsageAccepted: true, consentVoiceUsage: voix, consentImageUsage: image,
        partnerAssociation: 'Contributeur Individuel', electronicSignature: signature.trim(),
        legalGuardianName: tuteur.trim() || undefined, termsAcceptedAt: new Date().toISOString(), termsVersion: VERSION_CONDITIONS,
      });
      await recharger();
      onClose();
    } catch (e) {
      setErreur("Erreur lors de l'enregistrement de votre consentement : " + ((e as Error).message || 'Veuillez réessayer.'));
    } finally { setOccupe(false); }
  };

  return (
    <EcranModal visible={visible}
      titre={rappel ? `Rappel : Validation des Conditions & Utilisation de vos Données (${nom})` : 'Conditions de la Plateforme & Consentement du Contributeur Individuel'}
      sousTitre="Droit Gabonais • Loi n° 001/2011 (CNPDCP) & OAPI" onClose={onClose}>
      {rappel && (
        <Text style={s.p}>
          Votre profil {nom} est déjà enregistré sur Nkala. Avant de poursuivre vos contributions vocales et linguistiques, veuillez prendre connaissance et valider électroniquement les Conditions Générales de Contribution Individuelle ainsi que l'autorisation d'utilisation de vos données et le fonctionnement du système de points, badges et récompenses d'accomplissement.
        </Text>
      )}
      <View style={s.onglets}>
        {ONGLETS.map(([id, nomOnglet]) => (
          <Pressable key={id} onPress={() => setOnglet(id)} style={[s.onglet, onglet === id && s.ongletActif]}><Text style={[s.ongletTexte, onglet === id && { color: '#fff' }]}>{nomOnglet}</Text></Pressable>
        ))}
      </View>
      {erreur && <Text style={s.erreur}>{erreur}</Text>}

      {onglet === 'consentement' ? (
        <View style={{ gap: 12 }}>
          <BlocsTexte blocs={t.slice(0, 7)} vars={vars} />
          <Text style={s.etiquette}>{t[7].texte}</Text>
          <TextInput style={s.champ} value={tuteur} onChangeText={setTuteur} placeholder="Nom & qualité du représentant légal" placeholderTextColor={couleurs.discret} />
          <Text style={s.h}>{t[8].texte}</Text>
          <Ligne texte={t[9].texte} v={conditions} set={setConditions} />
          <Ligne texte={t[10].texte} v={donnees} set={setDonnees} />
          <Ligne texte={t[11].texte} v={voix} set={setVoix} />
          <Ligne texte={t[12].texte} v={image} set={setImage} />
          <Text style={s.etiquette}>{t[13].texte}</Text>
          <TextInput style={s.champ} value={signature} onChangeText={setSignature} placeholderTextColor={couleurs.discret} />
          <Text style={s.discret}>{t[14].texte} · Date : {new Date().toLocaleDateString('fr-FR')} · {t[16].texte}</Text>
          <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={valider} disabled={occupe}>
            {occupe ? <><ActivityIndicator color="#fff" /><Text style={s.boutonTexte}>Enregistrement de votre consentement...</Text></>
              : <Text style={s.boutonTexte}>Signer & Valider mes Conditions et l'Utilisation de mes Données</Text>}
          </Pressable>
        </View>
      ) : (
        <BlocsTexte blocs={TEXTES_CONDITIONS[onglet]} vars={vars} onBouton={() => setOnglet('consentement')} />
      )}
    </EcranModal>
  );
}

const Ligne = ({ texte, v, set }: { texte: string; v: boolean; set: (b: boolean) => void }) => (
  <View style={s.ligne}><Text style={[s.p, { flex: 1 }]}>{texte}</Text><Switch value={v} onValueChange={set} trackColor={{ true: couleurs.terre }} /></View>
);

const s = stylesDyn(() => ({
  p: { color: couleurs.texte, fontSize: 14, lineHeight: 21 },
  h: { color: couleurs.texteClair, fontSize: 16, fontWeight: '800', marginTop: 6 },
  etiquette: { color: couleurs.ambre, fontSize: 13, fontWeight: '700' },
  discret: { color: couleurs.discret, fontSize: 12 },
  onglets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  onglet: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1 },
  ongletActif: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  ongletTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '700' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  champ: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 14 },
  erreur: { color: '#fca5a5', fontSize: 13 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center', flexShrink: 1 },
}));
