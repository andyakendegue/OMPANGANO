import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  codeDialecte, DIALECTES, TRIBUS, enregistrerElement, fichesDepuisCsv, importerFiches, lireCollection, nouvelId, nouvelleFiche,
  supprimerElement, synchroniserCatalogue, type ClanRegistry, type QuestionnaireItem, type RapportImport, type ResultatCsv,
  type ThemeDefinition, type VillageRegistry,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { couleurs } from './theme';

const avertir = (t: string, m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(`${t}\n${m}`) : Alert.alert(t, m));
const confirmer = (titre: string, msg: string, ok: () => void) => {
  if (Platform.OS === 'web') { if ((globalThis as any).confirm?.(`${titre}\n${msg}`)) ok(); return; }
  Alert.alert(titre, msg, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: ok }]);
};

type Rubrique = 'fiches' | 'themes' | 'clans' | 'import';

export function Contenu() {
  const [r, setR] = useState<Rubrique>('fiches');
  const rubriques: [Rubrique, string][] = [['fiches', 'Fiches'], ['themes', 'Thèmes'], ['clans', 'Clans & Villages'], ['import', 'Import CSV']];
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {rubriques.map(([id, nom]) => (
          <Pressable key={id} onPress={() => setR(id)} style={[s.puce, r === id && s.puceActive]}>
            <Text style={[s.puceTexte, r === id && s.puceTexteActif]}>{nom}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {r === 'fiches' && <Fiches />}
      {r === 'themes' && <Themes />}
      {r === 'clans' && <ClansVillages />}
      {r === 'import' && <ImportCsv />}
    </View>
  );
}

// ---------------------------------------------------------------- Fiches

function Fiches() {
  const { profil } = useAuth();
  const [texte, setTexte] = useState('');
  const [requete, setRequete] = useState('');
  const [liste, setListe] = useState<QuestionnaireItem[]>([]);
  const [fin, setFin] = useState(false);
  const [edition, setEdition] = useState<QuestionnaireItem | 'nouvelle' | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => { const t = setTimeout(() => setRequete(texte), 300); return () => clearTimeout(t); }, [texte]);

  const lire = useCallback(async (decalage: number) => {
    const lot = await catalogue.rechercher({ texte: requete, limite: 30, decalage });
    setListe(p => (decalage === 0 ? lot : [...p, ...lot]));
    setFin(lot.length < 30);
    setTotal(await catalogue.compter());
  }, [requete]);
  useEffect(() => { lire(0); }, [lire]);

  const sauver = async (f: QuestionnaireItem) => {
    try {
      await enregistrerElement('items', f.id, f);
      await catalogue.ecrirePage([f], [], null, null);
      setEdition(null); lire(0);
    } catch (e) { avertir('Enregistrement impossible', (e as Error).message); }
  };
  const supprimer = (f: QuestionnaireItem) => confirmer('Supprimer cette fiche ?', f.myeneText, async () => {
    try { await supprimerElement('items', f.id); await catalogue.ecrirePage([], [f.id], null, null); lire(0); }
    catch (e) { avertir('Suppression impossible', (e as Error).message); }
  });

  if (edition) {
    return <FormulaireFiche
      depart={edition === 'nouvelle' ? null : edition}
      auteur={profil?.id || 'admin'}
      surSauver={sauver}
      surAnnuler={() => setEdition(null)} />;
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={s.ligneSimple}>
        <Text style={s.discret}>{total.toLocaleString('fr-FR')} fiches en mémoire</Text>
        <Pressable style={s.petitBouton} onPress={() => setEdition('nouvelle')}><Text style={s.boutonTexte}>+ Nouvelle fiche</Text></Pressable>
      </View>
      <TextInput style={s.champ} placeholder="Chercher une fiche" placeholderTextColor={couleurs.discret} value={texte} onChangeText={setTexte} autoCapitalize="none" />
      {liste.map(f => (
        <View key={f.id} style={s.carte}>
          <Text style={s.myene}>{f.myeneText}</Text>
          <Text style={s.texteClair}>{f.frenchText}</Text>
          <Text style={s.discret}>{String(f.dialect)} · {f.theme || f.category}{f.status === 'archived' ? ' · archivée' : ''}</Text>
          <View style={s.ligneSimple}>
            <Pressable onPress={() => setEdition(f)}><Text style={s.lien}>Modifier</Text></Pressable>
            <Pressable onPress={() => supprimer(f)}><Text style={s.danger}>Supprimer</Text></Pressable>
          </View>
        </View>
      ))}
      {!fin && <Pressable onPress={() => lire(liste.length)}><Text style={s.lien}>Voir plus</Text></Pressable>}
    </View>
  );
}

function FormulaireFiche({ depart, auteur, surSauver, surAnnuler }: {
  depart: QuestionnaireItem | null; auteur: string; surSauver: (f: QuestionnaireItem) => void; surAnnuler: () => void;
}) {
  const [myene, setMyene] = useState(depart?.myeneText || '');
  const [francais, setFrancais] = useState(depart?.frenchText || '');
  const [dialecte, setDialecte] = useState(String(depart?.dialect || 'orungu'));
  const [theme, setTheme] = useState(depart?.theme || depart?.category || 'general');
  const [phon, setPhon] = useState(depart?.phoneticApi || '');
  const [notes, setNotes] = useState(depart?.contextNotes || '');
  const [archivee, setArchivee] = useState(depart?.status === 'archived');
  const valide = myene.trim() && francais.trim();

  const valider = () => {
    if (!valide) return;
    const base = depart
      ? { ...depart, myeneText: myene.trim(), frenchText: francais.trim(), dialect: dialecte, category: theme, theme, phoneticApi: phon.trim() || undefined, contextNotes: notes.trim(), updatedAt: new Date().toISOString() }
      : nouvelleFiche(auteur, { francais, myene, dialecte, theme, phonetique: phon, notes });
    surSauver({ ...base, status: archivee ? 'archived' : 'active' });
  };

  return (
    <View style={s.carte}>
      <Text style={s.titre}>{depart ? 'Modifier la fiche' : 'Nouvelle fiche'}</Text>
      <TextInput style={s.champ} placeholder="Texte myènè" placeholderTextColor={couleurs.discret} value={myene} onChangeText={setMyene} autoCorrect={false} />
      <TextInput style={s.champ} placeholder="Traduction française" placeholderTextColor={couleurs.discret} value={francais} onChangeText={setFrancais} />
      <TextInput style={s.champ} placeholder="Transcription phonétique (facultatif)" placeholderTextColor={couleurs.discret} value={phon} onChangeText={setPhon} autoCorrect={false} />
      <TextInput style={s.champ} placeholder="Thème" placeholderTextColor={couleurs.discret} value={theme} onChangeText={setTheme} autoCapitalize="none" />
      <TextInput style={s.champ} placeholder="Contexte (facultatif)" placeholderTextColor={couleurs.discret} value={notes} onChangeText={setNotes} multiline />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DIALECTES.map(d => (
          <Pressable key={d.code} onPress={() => setDialecte(d.code)} style={[s.puce, dialecte === d.code && s.puceActive]}>
            <Text style={[s.puceTexte, dialecte === d.code && s.puceTexteActif]}>{d.nom}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => setArchivee(!archivee)}><Text style={s.texte}>{archivee ? '☑' : '☐'} Archivée (retirée de la collecte)</Text></Pressable>
      <Pressable style={[s.bouton, !valide && { opacity: 0.5 }]} onPress={valider} disabled={!valide}><Text style={s.boutonTexte}>Enregistrer</Text></Pressable>
      <Pressable onPress={surAnnuler}><Text style={s.lien}>Annuler</Text></Pressable>
    </View>
  );
}

// ---------------------------------------------------------------- Thèmes

function Themes() {
  const [liste, setListe] = useState<ThemeDefinition[] | null>(null);
  const [nom, setNom] = useState('');
  const [motsCles, setMotsCles] = useState('');
  const charger = useCallback(() => lireCollection<ThemeDefinition>('themes').then(setListe).catch(e => avertir('Thèmes indisponibles', (e as Error).message)), []);
  useEffect(() => { charger(); }, [charger]);

  const ajouter = async () => {
    const n = nom.trim(); if (!n) return;
    const id = nouvelId('theme');
    try {
      await enregistrerElement('themes', id, {
        id, name: n, shortName: n.slice(0, 14), icon: '📚', description: '', color: '#c85a32', isCustom: true,
        keywords: motsCles.split(',').map(x => x.trim()).filter(Boolean), createdAt: new Date().toISOString(),
      });
      setNom(''); setMotsCles(''); charger();
    } catch (e) { avertir('Ajout impossible', (e as Error).message); }
  };

  if (!liste) return <ActivityIndicator color={couleurs.ambre} />;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.carte}>
        <Text style={s.titre}>Ajouter un thème</Text>
        <TextInput style={s.champ} placeholder="Nom du thème" placeholderTextColor={couleurs.discret} value={nom} onChangeText={setNom} />
        <TextInput style={s.champ} placeholder="Mots-clés séparés par des virgules" placeholderTextColor={couleurs.discret} value={motsCles} onChangeText={setMotsCles} autoCapitalize="none" />
        <Pressable style={[s.bouton, !nom.trim() && { opacity: 0.5 }]} onPress={ajouter} disabled={!nom.trim()}><Text style={s.boutonTexte}>Ajouter</Text></Pressable>
      </View>
      <Text style={s.discret}>{liste.length} thème(s)</Text>
      {liste.map(t => (
        <View key={t.id} style={[s.carte, s.ligneSimple]}>
          <View style={{ flex: 1 }}>
            <Text style={s.nom}>{t.icon} {t.name}</Text>
            <Text style={s.discret} numberOfLines={1}>{t.id}{t.keywords?.length ? ` · ${t.keywords.slice(0, 5).join(', ')}` : ''}</Text>
          </View>
          {t.isCustom && <Pressable onPress={() => confirmer('Supprimer ce thème ?', t.name, async () => { await supprimerElement('themes', t.id).catch(e => avertir('Suppression impossible', e.message)); charger(); })}><Text style={s.danger}>Supprimer</Text></Pressable>}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- Clans & villages

function ClansVillages() {
  const [clans, setClans] = useState<ClanRegistry[] | null>(null);
  const [villages, setVillages] = useState<VillageRegistry[] | null>(null);
  const [nomClan, setNomClan] = useState('');
  const [tribuClan, setTribuClan] = useState<string>('Ôrungu');
  const [nomVillage, setNomVillage] = useState('');
  const [clanVillage, setClanVillage] = useState('');

  const charger = useCallback(async () => {
    try { setClans(await lireCollection<ClanRegistry>('clans')); setVillages(await lireCollection<VillageRegistry>('villages')); }
    catch (e) { avertir('Registre indisponible', (e as Error).message); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const ajouterClan = async () => {
    const n = nomClan.trim(); if (!n) return;
    const tribu = tribuClan;
    const id = nouvelId('clan');
    try { await enregistrerElement('clans', id, { id, name: n, tribe: tribu, createdAt: new Date().toISOString() }); setNomClan(''); charger(); }
    catch (e) { avertir('Ajout impossible', (e as Error).message); }
  };
  const ajouterVillage = async () => {
    const n = nomVillage.trim(); if (!n) return;
    const clan = clans?.find(c => c.name.toLowerCase() === clanVillage.trim().toLowerCase());
    const id = nouvelId('village');
    try {
      await enregistrerElement('villages', id, { id, name: n, clan: clan?.name || clanVillage.trim(), clanId: clan?.id, tribe: clan?.tribe || '', createdAt: new Date().toISOString() });
      setNomVillage(''); charger();
    } catch (e) { avertir('Ajout impossible', (e as Error).message); }
  };
  const retirer = (col: 'clans' | 'villages', id: string, nom: string) =>
    confirmer('Supprimer ?', nom, async () => { await supprimerElement(col, id).catch(e => avertir('Suppression impossible', e.message)); charger(); });

  if (!clans || !villages) return <ActivityIndicator color={couleurs.ambre} />;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.carte}>
        <Text style={s.titre}>Ajouter un clan</Text>
        <TextInput style={s.champ} placeholder="Nom du clan" placeholderTextColor={couleurs.discret} value={nomClan} onChangeText={setNomClan} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRIBUS.map(t => (
            <Pressable key={t} onPress={() => setTribuClan(t)} style={[s.puce, tribuClan === t && s.puceActive]}>
              <Text style={[s.puceTexte, tribuClan === t && s.puceTexteActif]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={[s.bouton, !nomClan.trim() && { opacity: 0.5 }]} onPress={ajouterClan} disabled={!nomClan.trim()}><Text style={s.boutonTexte}>Ajouter le clan</Text></Pressable>
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Ajouter un village</Text>
        <TextInput style={s.champ} placeholder="Nom du village" placeholderTextColor={couleurs.discret} value={nomVillage} onChangeText={setNomVillage} />
        <TextInput style={s.champ} placeholder="Clan de rattachement (nom exact)" placeholderTextColor={couleurs.discret} value={clanVillage} onChangeText={setClanVillage} />
        <Pressable style={[s.bouton, !nomVillage.trim() && { opacity: 0.5 }]} onPress={ajouterVillage} disabled={!nomVillage.trim()}><Text style={s.boutonTexte}>Ajouter le village</Text></Pressable>
      </View>
      <Text style={s.titre}>Clans ({clans.length})</Text>
      {clans.slice(0, 80).map(c => (
        <View key={c.id} style={[s.carte, s.ligneSimple]}>
          <View style={{ flex: 1 }}><Text style={s.nom}>{c.name}</Text><Text style={s.discret}>{c.tribe}</Text></View>
          <Pressable onPress={() => retirer('clans', c.id, c.name)}><Text style={s.danger}>Supprimer</Text></Pressable>
        </View>
      ))}
      <Text style={s.titre}>Villages ({villages.length})</Text>
      {villages.slice(0, 80).map(v => (
        <View key={v.id} style={[s.carte, s.ligneSimple]}>
          <View style={{ flex: 1 }}><Text style={s.nom}>{v.name}</Text><Text style={s.discret}>{[v.clan, v.tribe].filter(Boolean).join(' · ')}</Text></View>
          <Pressable onPress={() => retirer('villages', v.id, v.name)}><Text style={s.danger}>Supprimer</Text></Pressable>
        </View>
      ))}
      {(clans.length > 80 || villages.length > 80) && <Text style={s.discret}>80 premiers affichés par liste.</Text>}
    </View>
  );
}

// ---------------------------------------------------------------- Import CSV

function ImportCsv() {
  const { profil } = useAuth();
  const [dialecteDefaut, setDialecteDefaut] = useState('orungu');
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [csv, setCsv] = useState<ResultatCsv | null>(null);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [texteBrut, setTexteBrut] = useState<string | null>(null);

  const analyser = useCallback(async (texte: string, dia: string) => {
    const res = fichesDepuisCsv(texte, profil?.id || 'admin', dia);
    setCsv(res); setRapport(null); setMessage(null);
    if (!res.fiches.length) { setMessage("Aucune phrase reconnue : il faut une colonne français et une colonne myènè."); return; }
    setOccupe(true);
    try { setRapport(await importerFiches(res.fiches, true)); }
    catch (e) { setMessage((e as Error).message); }
    finally { setOccupe(false); }
  }, [profil?.id]);

  const choisir = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true });
    if (r.canceled) return;
    const f = r.assets[0];
    const texte = Platform.OS === 'web'
      ? await (await fetch(f.uri)).text()
      : await FileSystem.readAsStringAsync(f.uri, { encoding: FileSystem.EncodingType.UTF8 });
    setNomFichier(f.name); setTexteBrut(texte);
    await analyser(texte, dialecteDefaut);
  };

  const confirmerImport = async () => {
    if (!csv) return;
    setOccupe(true); setMessage(null);
    try {
      const r = await importerFiches(csv.fiches, false);
      setMessage(`Import terminé : ${r.created} créées, ${r.updated} mises à jour, ${r.unchanged} déjà présentes.`);
      setCsv(null); setRapport(null);
      synchroniserCatalogue(catalogue); // relit le catalogue local en arrière-plan
    } catch (e) { setMessage((e as Error).message); }
    finally { setOccupe(false); }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={s.carte}>
        <Text style={s.titre}>Importer un fichier CSV</Text>
        <Text style={s.discret}>
          Colonnes reconnues : français, myènè, dialecte (lu ligne par ligne), thème, identifiant, phonétique, contexte. Le serveur ignore les doublons et met à jour les numéros déjà connus.
        </Text>
        <Text style={s.etiquette}>Dialecte si la colonne manque</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DIALECTES.map(d => (
            <Pressable key={d.code} onPress={() => { setDialecteDefaut(d.code); if (texteBrut) analyser(texteBrut, d.code); }} style={[s.puce, dialecteDefaut === d.code && s.puceActive]}>
              <Text style={[s.puceTexte, dialecteDefaut === d.code && s.puceTexteActif]}>{d.nom}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={s.bouton} onPress={choisir}><Text style={s.boutonTexte}>{nomFichier ? `Changer de fichier (${nomFichier})` : 'Choisir un fichier CSV'}</Text></Pressable>
      </View>

      {occupe && <ActivityIndicator color={couleurs.ambre} />}
      {csv && csv.fiches.length > 0 && (
        <View style={s.carte}>
          <Text style={s.titre}>Vérification</Text>
          <Text style={s.texte}>{csv.fiches.length.toLocaleString('fr-FR')} phrases lues{csv.ignorees ? `, ${csv.ignorees} lignes ignorées (texte manquant)` : ''}.</Text>
          <Text style={s.discret}>Colonnes : {csv.colonnes.francais} → français · {csv.colonnes.myene} → myènè · dialecte : {csv.colonnes.dialecte || `aucune (tout en ${codeDialecte(dialecteDefaut)})`}</Text>
          {csv.dialectesInconnus.length > 0 && <Text style={s.danger}>Dialectes non reconnus (remplacés par {dialecteDefaut}) : {csv.dialectesInconnus.join(', ')}</Text>}
          {rapport && <Text style={s.ok}>Le serveur créerait {rapport.created}, mettrait à jour {rapport.updated}, ignorerait {rapport.unchanged} existantes et {rapport.internalDuplicates} doublons du fichier.</Text>}
          {rapport && (rapport.created + rapport.updated) > 0 && (
            <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={confirmerImport} disabled={occupe}><Text style={s.boutonTexte}>Importer</Text></Pressable>
          )}
        </View>
      )}
      {message && <Text style={message.startsWith('Import terminé') ? s.ok : s.danger}>{message}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  nom: { color: couleurs.texteClair, fontSize: 15, fontWeight: '700' },
  texte: { color: couleurs.texte, fontSize: 14 },
  texteClair: { color: couleurs.texteClair, fontSize: 15 },
  myene: { color: couleurs.ambre, fontSize: 18, fontWeight: '800' },
  discret: { color: couleurs.discret, fontSize: 12 },
  etiquette: { color: couleurs.texte, fontSize: 12, fontWeight: '700' },
  ligneSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 14 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  petitBouton: { backgroundColor: couleurs.terre, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  puceTexteActif: { color: '#fff', fontWeight: '700' },
  lien: { color: couleurs.ambre, fontSize: 13, fontWeight: '700' },
  danger: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  ok: { color: '#86efac', fontSize: 13 },
});
