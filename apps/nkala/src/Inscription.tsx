import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import {
  ajouterClan, ajouterVillage, enregistrerInscription, lireCollection, TRIBUS, validerInscription,
  type ClanRegistry, type TribeName, type VillageRegistry,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { couleurs } from './theme';

const AUTRE = '__autre__';

/** Inscription obligatoire avant toute contribution : identité, filiation (tribu, clans, village) et consentements. */
export default function Inscription() {
  const { profil, recharger, deconnexion } = useAuth();
  const [nom, setNom] = useState(profil?.fullName || profil?.displayName || '');
  const [contact, setContact] = useState(profil?.contact || profil?.phoneNumber || profil?.email || '');
  const [naissance, setNaissance] = useState(profil?.birthDate || '');
  const [lieu, setLieu] = useState(profil?.birthPlace || '');
  const [tribu, setTribu] = useState<TribeName>(profil?.tribe || 'Ôrungu');
  const [paternel, setPaternel] = useState(profil?.paternalClan || '');
  const [maternel, setMaternel] = useState(profil?.maternalClan || '');
  const [nouveauPaternel, setNouveauPaternel] = useState('');
  const [nouveauMaternel, setNouveauMaternel] = useState('');
  const [village, setVillage] = useState(profil?.villageOfOrigin || '');
  const [nouveauVillage, setNouveauVillage] = useState('');
  const [conditions, setConditions] = useState(false);
  const [donnees, setDonnees] = useState(false);
  const [voix, setVoix] = useState(true);
  const [image, setImage] = useState(false);
  const [tuteur, setTuteur] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [clans, setClans] = useState<ClanRegistry[] | null>(null);
  const [villages, setVillages] = useState<VillageRegistry[]>([]);

  useEffect(() => {
    lireCollection<ClanRegistry>('clans').then(setClans).catch(() => setClans([]));
    lireCollection<VillageRegistry>('villages').then(setVillages).catch(() => {});
  }, []);

  const clansTribu = useMemo(() => (clans || []).filter(c => c.tribe === tribu), [clans, tribu]);
  const villagesClan = useMemo(() => {
    const du = villages.filter(v => v.clan === paternel);
    return du.length ? du : villages.filter(v => v.tribe === tribu);
  }, [villages, paternel, tribu]);

  const choisirTribu = (t: TribeName) => { setTribu(t); setPaternel(''); setMaternel(''); setVillage(''); };

  const valider = async () => {
    const clanP = paternel === AUTRE ? nouveauPaternel : paternel;
    const clanM = maternel === AUTRE ? nouveauMaternel : maternel;
    const vil = village === AUTRE ? nouveauVillage : village;
    const form = { nomComplet: nom, contact, dateNaissance: naissance.trim(), lieuNaissance: lieu, tribu, clanPaternel: clanP, clanMaternel: clanM, village: vil, conditions, donnees, voix, image, tuteur };
    const e = validerInscription(form);
    if (e) { setErreur(e); return; }
    setOccupe(true); setErreur(null);
    try {
      // Les nouveaux clans et villages sont ajoutés au registre avant le profil.
      if (paternel === AUTRE) await ajouterClan(clanP, tribu);
      if (maternel === AUTRE && clanM.trim().toLowerCase() !== clanP.trim().toLowerCase()) await ajouterClan(clanM, tribu);
      if (village === AUTRE) await ajouterVillage(vil, clanP, tribu);
      await enregistrerInscription(form);
      await recharger();
    } catch (err) {
      setErreur(`Erreur d’enregistrement du profil : ${(err as Error).message || 'vérifiez votre connexion'}`);
      setOccupe(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: couleurs.fond }} contentContainerStyle={s.page}>
      <Text style={s.marque}>Bienvenue dans Nkala</Text>
      <Text style={s.sous}>Renseignez votre filiation clanique et vos origines pour accéder au corpus et contribuer.</Text>

      <View style={s.carte}>
        <Text style={s.titre}>Identité</Text>
        <TextInput style={s.champ} placeholder="Nom complet" placeholderTextColor={couleurs.discret} value={nom} onChangeText={setNom} />
        <TextInput style={s.champ} placeholder="Contact (téléphone, WhatsApp ou e-mail)" placeholderTextColor={couleurs.discret} value={contact} onChangeText={setContact} autoCapitalize="none" />
        <TextInput style={s.champ} placeholder="Date de naissance AAAA-MM-JJ" placeholderTextColor={couleurs.discret} value={naissance} onChangeText={setNaissance} autoCapitalize="none" />
        <TextInput style={s.champ} placeholder="Lieu de naissance" placeholderTextColor={couleurs.discret} value={lieu} onChangeText={setLieu} />
      </View>

      <View style={s.carte}>
        <Text style={s.titre}>Origines</Text>
        <Text style={s.etiquette}>Tribu</Text>
        <Choix valeurs={TRIBUS.map(t => [t, t])} actif={tribu} onChoix={v => choisirTribu(v as TribeName)} />
        {!clans && <ActivityIndicator color={couleurs.ambre} />}

        <Text style={s.etiquette}>Clan paternel</Text>
        <Choix valeurs={[...clansTribu.map(c => [c.name, c.name] as [string, string]), [AUTRE, '+ Autre clan']]} actif={paternel} onChoix={setPaternel} />
        {paternel === AUTRE && <TextInput style={s.champ} placeholder="Nom du clan paternel" placeholderTextColor={couleurs.discret} value={nouveauPaternel} onChangeText={setNouveauPaternel} />}

        <Text style={s.etiquette}>Clan maternel</Text>
        <Choix valeurs={[...clansTribu.map(c => [c.name, c.name] as [string, string]), [AUTRE, '+ Autre clan']]} actif={maternel} onChoix={setMaternel} />
        {maternel === AUTRE && <TextInput style={s.champ} placeholder="Nom du clan maternel" placeholderTextColor={couleurs.discret} value={nouveauMaternel} onChangeText={setNouveauMaternel} />}

        <Text style={s.etiquette}>Village d’origine</Text>
        <Choix valeurs={[...villagesClan.slice(0, 40).map(v => [v.name, v.name] as [string, string]), [AUTRE, '+ Autre village']]} actif={village} onChoix={setVillage} />
        {village === AUTRE && <TextInput style={s.champ} placeholder="Nom du village" placeholderTextColor={couleurs.discret} value={nouveauVillage} onChangeText={setNouveauVillage} />}
      </View>

      <View style={s.carte}>
        <Text style={s.titre}>Conditions et données</Text>
        <Text style={s.discret}>
          Mes textes, traductions, images et enregistrements vocaux sont collectés par Essaka Engineering pour sauvegarder les langues myènè
          et entraîner des modèles d’intelligence artificielle valorisant les langues gabonaises, notamment dans Nkala. Je reste titulaire de mes droits.
        </Text>
        <Ligne texte="J’accepte les Conditions Générales de la plateforme Nkala *" v={conditions} set={setConditions} />
        <Ligne texte="J’autorise l’utilisation de mes données pour l’entraînement des modèles d’IA *" v={donnees} set={setDonnees} />
        <Ligne texte="J’autorise l’utilisation de ma voix" v={voix} set={setVoix} />
        <Ligne texte="J’autorise l’utilisation de mes images" v={image} set={setImage} />
        <TextInput style={s.champ} placeholder="Représentant légal (si vous êtes mineur)" placeholderTextColor={couleurs.discret} value={tuteur} onChangeText={setTuteur} />
      </View>

      {erreur && <Text style={s.erreur}>{erreur}</Text>}
      <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={valider} disabled={occupe}>
        {occupe ? <ActivityIndicator color="#fff" /> : <Text style={s.boutonTexte}>Valider mon inscription</Text>}
      </Pressable>
      <Pressable onPress={deconnexion}><Text style={s.lien}>Se déconnecter</Text></Pressable>
    </ScrollView>
  );
}

function Choix({ valeurs, actif, onChoix }: { valeurs: [string, string][] | string[][]; actif: string; onChoix: (v: string) => void }) {
  return (
    <View style={s.pile}>
      {(valeurs as [string, string][]).map(([v, nom]) => (
        <Pressable key={v} onPress={() => onChoix(v)} style={[s.puce, actif === v && s.puceActive]}>
          <Text style={[s.puceTexte, actif === v && { color: '#fff', fontWeight: '700' }]}>{nom}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const Ligne = ({ texte, v, set }: { texte: string; v: boolean; set: (b: boolean) => void }) => (
  <View style={s.ligne}><Text style={[s.texte, { flex: 1 }]}>{texte}</Text><Switch value={v} onValueChange={set} trackColor={{ true: couleurs.terre }} /></View>
);

const s = StyleSheet.create({
  page: { padding: 16, gap: 14, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  marque: { color: couleurs.texteClair, fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 24 },
  sous: { color: couleurs.ambre, textAlign: 'center', fontSize: 13 },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  titre: { color: couleurs.texteClair, fontSize: 16, fontWeight: '800' },
  etiquette: { color: couleurs.texte, fontSize: 12, fontWeight: '700' },
  texte: { color: couleurs.texte, fontSize: 13 },
  discret: { color: couleurs.discret, fontSize: 12, lineHeight: 17 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 14 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 15 },
  erreur: { color: '#fca5a5', fontSize: 13 },
  lien: { color: couleurs.ambre, textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
