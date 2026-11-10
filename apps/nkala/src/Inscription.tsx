import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import {
  ajouterClan, ajouterVillage, enregistrerInscription, JE_NE_SAIS_PAS, lireCollection, MYENE, MYENE_TRIBES, validerInscription,
  type ClanRegistry, type TribeName, type VillageRegistry,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { ConditionsModale } from './Conditions';
import { couleurs, stylesDyn } from './theme';
import { Logo, fond } from './Fond';

const NP = JE_NE_SAIS_PAS;
type TribuParent = TribeName | typeof JE_NE_SAIS_PAS;

/** Inscription obligatoire (identique à OnboardingModal du site web) : identité, filiation, village, consentements. */
export default function Inscription({ modifier, onTermine }: { modifier?: boolean; onTermine?: () => void } = {}) {
  const { profil, recharger, deconnexion } = useAuth();
  const [nom, setNom] = useState(profil?.fullName || profil?.displayName || '');
  const [contact, setContact] = useState(profil?.contact || profil?.phoneNumber || profil?.email || '');
  const [naissance, setNaissance] = useState(profil?.birthDate || '');
  const [lieu, setLieu] = useState(profil?.birthPlace || '');
  const [tribu, setTribu] = useState<TribeName>(profil?.tribe || 'Ôrungu');

  const [tribuPere, setTribuPere] = useState<TribuParent>(tribu);
  const [paternel, setPaternel] = useState(profil?.paternalClan || '');
  const [nouveauP, setNouveauP] = useState(false);
  const [nomNouveauP, setNomNouveauP] = useState('');
  const [tribuNouveauP, setTribuNouveauP] = useState<TribeName>(tribu);

  const [tribuMere, setTribuMere] = useState<TribuParent>(tribu);
  const [maternel, setMaternel] = useState(profil?.maternalClan || '');
  const [nouveauM, setNouveauM] = useState(false);
  const [nomNouveauM, setNomNouveauM] = useState('');
  const [tribuNouveauM, setTribuNouveauM] = useState<TribeName>(tribu);

  const [village, setVillage] = useState(profil?.villageOfOrigin || '');
  const [nouveauV, setNouveauV] = useState(false);
  const [nomNouveauV, setNomNouveauV] = useState('');
  const [clanNouveauV, setClanNouveauV] = useState('');

  const [conditions, setConditions] = useState(profil?.termsAccepted ?? false);
  const [donnees, setDonnees] = useState(profil?.dataUsageAccepted ?? false);
  const [voix, setVoix] = useState(profil?.consentVoiceUsage ?? true);
  const [image, setImage] = useState(profil?.consentImageUsage ?? false);
  const [tuteur, setTuteur] = useState(profil?.legalGuardianName || '');
  const [lireConditions, setLireConditions] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [clans, setClans] = useState<ClanRegistry[] | null>(null);
  const [villages, setVillages] = useState<VillageRegistry[]>([]);

  useEffect(() => {
    lireCollection<ClanRegistry>('clans').then(setClans).catch(() => setClans([]));
    lireCollection<VillageRegistry>('villages').then(setVillages).catch(() => {});
  }, []);

  // Comme sur le site web : la tribu principale propose la même tribu pour les deux parents.
  const choisirTribu = (t: TribeName) => { setTribu(t); setTribuPere(t); setTribuMere(t); setTribuNouveauP(t); setTribuNouveauM(t); };

  const clansPere = useMemo(() => (clans || []).filter(c => c.tribe === tribuPere), [clans, tribuPere]);
  const clansMere = useMemo(() => (clans || []).filter(c => c.tribe === tribuMere), [clans, tribuMere]);
  const villagesClan = useMemo(() => (paternel && paternel !== NP ? villages.filter(v => v.clan === paternel) : villages), [villages, paternel]);

  const valider = async () => {
    setErreur(null);
    const clanP = nouveauP ? nomNouveauP.trim() : paternel;
    const clanM = nouveauM ? nomNouveauM.trim() : maternel;
    const vil = nouveauV ? nomNouveauV.trim() : village;
    if (nouveauP && !clanP) return setErreur('Veuillez saisir le nom du nouveau clan paternel.');
    if (nouveauM && !clanM) return setErreur('Veuillez saisir le nom du nouveau clan maternel.');
    if (nouveauV && !vil) return setErreur('Veuillez saisir le nom du nouveau village d’origine.');
    const form = { nomComplet: nom, contact, dateNaissance: naissance.trim(), lieuNaissance: lieu, tribu, clanPaternel: clanP, clanMaternel: clanM, village: vil, conditions, donnees, voix, image, tuteur };
    const e = validerInscription(form);
    if (e) return setErreur(e);
    setOccupe(true);
    try {
      // Les nouveaux clans et villages sont ajoutés au registre avant le profil.
      if (nouveauP) await ajouterClan(clanP, tribuNouveauP);
      if (nouveauM && clanM.toLowerCase() !== clanP.toLowerCase()) await ajouterClan(clanM, tribuNouveauM);
      if (nouveauV) {
        const cible = clanNouveauV || clanP || 'Non rattaché';
        const clanObj = (clans || []).find(c => c.name === cible);
        await ajouterVillage(vil, cible, clanObj?.tribe || tribu);
      }
      await enregistrerInscription(form);
      await recharger();
      setOccupe(false);
      onTermine?.();
    } catch (err) {
      setErreur('Erreur enregistrement profil: ' + ((err as Error).message || 'Vérifiez votre connexion'));
      setOccupe(false);
    }
  };

  return (
    <ScrollView style={fond} contentContainerStyle={s.page}>
      <View style={{ alignItems: 'center' }}><Logo taille={64} /></View>
      <Text style={s.sur}>Enregistrement Obligatoire • Protocole Nkala</Text>
      <Text style={s.marque}>{MYENE.SALE.mot} ! Bienvenue dans Nkala</Text>
      <Text style={s.sous}>« Nkala » sauvegarde et transmet la langue Myènè ; sa première brique, Ompangano, est le programme participatif de collecte. Renseignez votre filiation clanique et vos origines territoriales pour accéder au corpus et contribuer.</Text>

      <View style={s.carte}>
        <Text style={s.titre}>1. Identité Civile & Contact</Text>
        <Text style={s.etiquette}>Nom Complet & Prénoms *</Text>
        <TextInput style={s.champ} value={nom} onChangeText={setNom} />
        <Text style={s.etiquette}>Contact (Tél / WhatsApp) *</Text>
        <TextInput style={s.champ} value={contact} onChangeText={setContact} autoCapitalize="none" />
        <Text style={s.etiquette}>Date de Naissance *</Text>
        <TextInput style={s.champ} value={naissance} onChangeText={setNaissance} placeholder="AAAA-MM-JJ" placeholderTextColor={couleurs.discret} autoCapitalize="none" />
        <Text style={s.etiquette}>Lieu de Naissance *</Text>
        <TextInput style={s.champ} value={lieu} onChangeText={setLieu} />
      </View>

      <View style={s.carte}>
        <Text style={s.titre}>2. Filiation Généalogique & Origines</Text>
        <Text style={s.etiquette}>Votre Ethnie Myènè Principale *</Text>
        <Choix valeurs={MYENE_TRIBES.map(t => [t, t])} actif={tribu} onChoix={v => choisirTribu(v as TribeName)} />
        {!clans && <ActivityIndicator color={couleurs.ambre} />}

        <Bloc
          titre="Clan Paternel (rattaché à une ethnie) *" nouveau={nouveauP} setNouveau={setNouveauP}
          libTribu="Ethnie du père :" tribuListe={tribuPere} setTribuListe={t => { setTribuPere(t); setPaternel(t === NP ? NP : ''); }}
          libClan="Clan paternel disponible :" clans={clansPere} valeur={paternel} setValeur={setPaternel}
          nom={nomNouveauP} setNom={setNomNouveauP} tribuNouveau={tribuNouveauP} setTribuNouveau={setTribuNouveauP} />

        <Bloc
          titre="Clan Maternel (rattaché à une ethnie) *" nouveau={nouveauM} setNouveau={setNouveauM}
          libTribu="Ethnie de la mère :" tribuListe={tribuMere} setTribuListe={t => { setTribuMere(t); setMaternel(t === NP ? NP : ''); }}
          libClan="Clan maternel disponible :" clans={clansMere} valeur={maternel} setValeur={setMaternel}
          nom={nomNouveauM} setNom={setNomNouveauM} tribuNouveau={tribuNouveauM} setTribuNouveau={setTribuNouveauM} />

        <View style={s.ligneH}>
          <Text style={s.etiquette}>Village d'Origine (rattaché à un clan) *</Text>
          <Pressable onPress={() => setNouveauV(!nouveauV)}><Text style={s.lien}>{nouveauV ? 'Choisir existant' : 'Créer nouveau village'}</Text></Pressable>
        </View>
        {nouveauV ? (
          <View style={{ gap: 8 }}>
            <Text style={s.etiquette}>Nom du village :</Text>
            <TextInput style={s.champ} value={nomNouveauV} onChangeText={setNomNouveauV} />
            <Text style={s.etiquette}>Clan de rattachement :</Text>
            <Choix
              valeurs={[['Non rattaché', 'Non rattaché / À définir'], ...(paternel && paternel !== NP && !(clans || []).some(c => c.name === paternel) ? [[paternel, `Clan ${paternel} (${tribuPere})`] as [string, string]] : []), ...(clans || []).slice(0, 60).map(c => [c.name, `Clan ${c.name} (${c.tribe})`] as [string, string])]}
              actif={clanNouveauV || paternel || 'Non rattaché'} onChoix={setClanNouveauV} />
          </View>
        ) : (
          <>
            <Text style={s.discret}>-- Sélectionnez votre village d’origine --</Text>
            <Choix valeurs={[...villagesClan.slice(0, 60).map(v => [v.name, `${v.name} (Clan: ${v.clan || 'Non rattaché'}, Ethnie: ${v.tribe})`] as [string, string]), [NP, 'Je ne sais pas']]} actif={village} onChoix={setVillage} />
            {villagesClan.length === 0 && <Text style={s.discret}>Aucun village n'est encore enregistré pour cette sélection. Vous pouvez choisir « Je ne sais pas » ou cliquer sur « Créer nouveau village ».</Text>}
          </>
        )}
      </View>

      <View style={s.carte}>
        <Text style={s.titre}>3. Conditions de la Plateforme & Utilisation des Données</Text>
        <Pressable onPress={() => setLireConditions(true)}><Text style={s.lien}>Lire les Conditions & Système de Badges/Points</Text></Pressable>
        <Text style={s.etiquette}>Synthèse du Consentement du Contributeur Individuel (Essaka Engineering) :</Text>
        <Text style={s.discret}>
          (1) Mes textes, traductions, images et enregistrements vocaux sont collectés par Essaka Engineering (Port-Gentil, Gabon, RCCM RG/POG 2022 A 1290) dans le cadre du programme participatif Nkala. (2) Ils servent à entraîner et améliorer des modèles d'intelligence artificielle valorisant les langues gabonaises, utilisés notamment dans l'application Nkala. (3) Ma participation individuelle est valorisée par un système de Points d'Expérience (XP), de Rangs culturels, de Badges et de Défis pouvant donner lieu à des récompenses en fonction de mes accomplissements validés. (4) Je dispose d'un droit d'accès, de correction, de suppression (sous 60 jours) et de retrait (Loi n° 001/2011 & CNPDCP). (5) Je participe librement et conserve mes droits d'auteur (OAPI Accord de Bangui Annexe VII).
        </Text>
        <Text style={s.etiquette}>Pour un contributeur mineur (Nom & qualité du parent ou représentant légal – facultatif si majeur) :</Text>
        <TextInput style={s.champ} value={tuteur} onChangeText={setTuteur} />
        <Ligne texte="J'accepte les Conditions Générales de la plateforme Nkala applicables aux contributeurs individuels. *" v={conditions} set={setConditions} />
        <Ligne texte="Je valide l'utilisation de mes données personnelles et linguistiques pour l'entraînement des Modèles IA d'Essaka Engineering et l'attribution de mes points, badges et récompenses d'accomplissement. *" v={donnees} set={setDonnees} />
        <Ligne texte="J'autorise l'usage de ma voix (enregistrements audio)" v={voix} set={setVoix} />
        <Ligne texte="J'autorise l'usage de mon image (facultatif)" v={image} set={setImage} />
      </View>
      <ConditionsModale visible={lireConditions} onClose={() => setLireConditions(false)} />

      {erreur && <Text style={s.erreur}>{erreur}</Text>}
      <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={valider} disabled={occupe}>
        {occupe ? <><ActivityIndicator color="#fff" /><Text style={s.boutonTexte}>Validation de la filiation & du consentement...</Text></>
          : <Text style={s.boutonTexte}>Valider mon Enregistrement, mes Conditions & Accéder au Programme ✨</Text>}
      </Pressable>
      {modifier
        ? <Pressable onPress={onTermine}><Text style={s.lien}>Annuler</Text></Pressable>
        : <Pressable onPress={deconnexion}><Text style={s.lien}>Se déconnecter</Text></Pressable>}
    </ScrollView>
  );
}

function Bloc(p: {
  titre: string; nouveau: boolean; setNouveau: (b: boolean) => void; libTribu: string; tribuListe: TribuParent; setTribuListe: (t: TribuParent) => void;
  libClan: string; clans: ClanRegistry[]; valeur: string; setValeur: (v: string) => void; nom: string; setNom: (v: string) => void; tribuNouveau: TribeName; setTribuNouveau: (t: TribeName) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={s.ligneH}>
        <Text style={s.etiquette}>{p.titre}</Text>
        <Pressable onPress={() => p.setNouveau(!p.nouveau)}><Text style={s.lien}>{p.nouveau ? 'Choisir existant' : 'Créer nouveau clan'}</Text></Pressable>
      </View>
      {p.nouveau ? (
        <>
          <Text style={s.etiquette}>Ethnie de rattachement :</Text>
          <Choix valeurs={MYENE_TRIBES.map(t => [t, t])} actif={p.tribuNouveau} onChoix={v => p.setTribuNouveau(v as TribeName)} />
          <Text style={s.etiquette}>Nom du nouveau clan :</Text>
          <TextInput style={s.champ} value={p.nom} onChangeText={p.setNom} />
        </>
      ) : (
        <>
          <Text style={s.etiquette}>{p.libTribu}</Text>
          <Choix valeurs={[...MYENE_TRIBES.map(t => [t, t]), [NP, 'Autre']]} actif={p.tribuListe} onChoix={v => p.setTribuListe(v as TribuParent)} />
          {p.tribuListe === NP ? <Text style={s.discret}>Autre ethnie (par exemple un seul parent myènè) : le clan est enregistré « Je ne sais pas », réponse valide.</Text> : <>
          <Text style={s.etiquette}>{p.libClan}</Text>
          <Text style={s.discret}>-- Sélectionnez le clan ({p.tribuListe}) --</Text>
          <Choix valeurs={[...p.clans.map(c => [c.name, `Clan ${c.name} (Ethnie: ${c.tribe})`] as [string, string]), [NP, 'Je ne sais pas']]} actif={p.valeur} onChoix={p.setValeur} />
          {p.clans.length === 0 && <Text style={s.discret}>Les clans {p.tribuListe} sont en cours de validation orthographique. Vous pouvez choisir « Je ne sais pas » ou cliquer sur « Créer nouveau clan ».</Text>}
          </>}
        </>
      )}
    </View>
  );
}

function Choix({ valeurs, actif, onChoix }: { valeurs: string[][]; actif: string; onChoix: (v: string) => void }) {
  return (
    <View style={s.pile}>
      {valeurs.map(([v, nom]) => (
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

const s = stylesDyn(() => ({
  page: { padding: 16, gap: 14, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  sur: { color: couleurs.ambre, textAlign: 'center', fontSize: 11, fontWeight: '800', marginTop: 24 },
  marque: { color: couleurs.texteClair, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  sous: { color: couleurs.texte, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  titre: { color: couleurs.texteClair, fontSize: 16, fontWeight: '800' },
  etiquette: { color: couleurs.texte, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  texte: { color: couleurs.texte, fontSize: 13 },
  discret: { color: couleurs.discret, fontSize: 12, lineHeight: 17 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ligneH: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 14 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center', flexShrink: 1 },
  erreur: { color: '#fca5a5', fontSize: 13 },
  lien: { color: couleurs.ambre, textAlign: 'center', fontSize: 12, fontWeight: '700' },
}));
