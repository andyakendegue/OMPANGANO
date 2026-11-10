import { Chargement } from './Chargement';
import { lancerSynchro } from './synchro';
import { useCatalogueEnChargement } from './syncEtat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import {
  chargerAnnotations, chargerThemes, indexerAnnotations, INFO_TRIBUS, lireCollection, MYENE_TRIBES, tribuDuDialecte, tribusDeLaFiche,
  type Annotation, type QuestionnaireItem, type ThemeDefinition, type VillageRegistry,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { useVersionDonnees } from './donnees';
import { couleurs, stylesDyn } from './theme';

const PAGE = 40; // même taille de page que le site web

const LEGACY: Record<string, string> = {
  salutations: '👋 Salutations', fleuve_peche: '🛶 Fleuve & Pêche', nature_faune: '🐆 Faune & Lacs',
  vie_quotidienne: '🏡 Vie au Village', famille_communaute: '👨‍👩‍👧‍👦 Famille', proverbes_contes: '📜 Proverbes',
};

/** « Mémoire & Vocabulaire Myènè » : mêmes filtres (tribu, thème, favoris), mêmes textes et même pagination que le site web. */
export function Ezango({ onContribuer }: { onContribuer?: (id: string) => void } = {}) {
  const { profil, favori } = useAuth();
  const routeur = useRouter();
  const favoris = profil?.favoriteItemIds || [];
  const [texte, setTexte] = useState('');
  const [requete, setRequete] = useState('');
  const [tribu, setTribu] = useState('all');
  const [theme, setTheme] = useState('all');
  const [seulementFavoris, setSeulementFavoris] = useState(false);
  const [page, setPage] = useState(1);
  const [fiches, setFiches] = useState<QuestionnaireItem[]>([]);
  const [total, setTotal] = useState(0);
  const enChargement = useCatalogueEnChargement();
  // Même si Ezango s'ouvre en premier, la synchronisation (une seule à la fois) démarre et lève l'état « Chargement »
  useEffect(() => { lancerSynchro(); }, []);
  const [charge, setCharge] = useState(true);
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [villages, setVillages] = useState<VillageRegistry[]>([]);
  const [compteursDialectes, setCompteursDialectes] = useState<Record<string, number>>({});
  const [compteursThemes, setCompteursThemes] = useState<Record<string, number>>({});
  const [parole, setParole] = useState<string | null>(null);
  const generation = useRef(0);
  const vDonnees = useVersionDonnees();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [dialectesFiches, setDialectesFiches] = useState<Record<string, string>>({});

  useEffect(() => { chargerAnnotations().then(setAnnotations).catch(() => {}); }, [vDonnees]);
  useEffect(() => { chargerThemes().then(setThemes).catch(() => {}); lireCollection<VillageRegistry>('villages').then(setVillages).catch(() => {}); catalogue.compteursDialectes().then(setCompteursDialectes); }, []);
  useEffect(() => { const t = setTimeout(() => { setRequete(texte); setPage(1); }, 300); return () => clearTimeout(t); }, [texte]);

  const index = useMemo(() => indexerAnnotations(annotations, id => dialectesFiches[id]), [annotations, dialectesFiches]);
  // Les fiches qui ont reçu des annotations (peu nombreuses) sont lues pour connaître leur dialecte d'origine.
  useEffect(() => {
    const ids = [...new Set(annotations.map(a => a.itemId))];
    if (ids.length === 0) return;
    catalogue.parIds(ids).then(l => setDialectesFiches(Object.fromEntries(l.map(f => [f.id, String(f.dialect)]))));
  }, [annotations]);
  const supplementaires = useCallback((t: string) => (t === 'all' ? new Set<string>() : index.fichesSupplementaires.get(t.normalize('NFC').toLowerCase().trim()) || new Set<string>()), [index]);

  const dialectesDeTribu = useCallback((t: string) => (t === 'all' ? undefined : Object.keys(compteursDialectes).filter(d => tribuDuDialecte(d) === t)), [compteursDialectes]);
  const compteTribu = (t: string) => Object.entries(compteursDialectes).filter(([d]) => tribuDuDialecte(d) === t).reduce((a, [, n]) => a + n, 0) + supplementaires(t).size;
  const totalFiches = Object.values(compteursDialectes).reduce((a, b) => a + b, 0);

  useEffect(() => { catalogue.compteursThemes(dialectesDeTribu(tribu)).then(setCompteursThemes); }, [tribu, dialectesDeTribu]);

  const lire = useCallback(async () => {
    const g = ++generation.current;
    setCharge(true);
    let lot: QuestionnaireItem[]; let n: number;
    if (seulementFavoris) {
      const tous = (await catalogue.parIds(favoris)).filter(f =>
        (tribu === 'all' || tribuDuDialecte(String(f.dialect)) === tribu) && (theme === 'all' || (f.category || f.theme || 'general') === theme) &&
        (!requete || `${f.frenchText} ${f.myeneText} ${f.contextNotes}`.toLowerCase().includes(requete.toLowerCase())));
      n = tous.length; lot = tous.slice((page - 1) * PAGE, page * PAGE);
    } else {
      const base = { texte: requete, categorie: theme === 'all' ? null : theme, dialectes: dialectesDeTribu(tribu) };
      const premieres = tribu !== 'all' && !base.dialectes?.length ? 0 : await catalogue.compterRecherche(base);
      // Fiches d'autres dialectes validées pour cette tribu par une contribution : ajoutées après les fiches de la tribu.
      const extraIds = tribu === 'all' ? [] : [...supplementaires(tribu)];
      const extras = (await catalogue.parIds(extraIds)).filter(f =>
        (theme === 'all' || (f.category || f.theme || 'general') === theme) &&
        (!requete || `${f.frenchText} ${f.myeneText} ${f.contextNotes}`.toLowerCase().includes(requete.toLowerCase())) &&
        tribuDuDialecte(String(f.dialect)) !== tribu);
      n = premieres + extras.length;
      const debut = (page - 1) * PAGE;
      const dePremieres = debut < premieres ? await catalogue.rechercher({ ...base, limite: PAGE, decalage: debut }) : [];
      lot = [...dePremieres, ...extras.slice(Math.max(0, debut - premieres), Math.max(0, debut - premieres) + (PAGE - dePremieres.length))];
    }
    if (g !== generation.current) return;
    setFiches(lot); setTotal(n); setCharge(false);
  }, [requete, tribu, theme, page, seulementFavoris, favoris.length, dialectesDeTribu, supplementaires, vDonnees]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { lire(); }, [lire]);

  const categories = useMemo(() => {
    const somme = Object.values(compteursThemes).reduce((a, b) => a + b, 0);
    const liste: { id: string; label: string }[] = [{ id: 'all', label: `Tous les thèmes (${somme})` }];
    const vus = new Set(['all']);
    for (const th of themes) { vus.add(th.id); liste.push({ id: th.id, label: `${th.icon} ${th.shortName || th.name} (${compteursThemes[th.id] || 0})` }); }
    for (const [k, c] of Object.entries(compteursThemes)) if (!vus.has(k) && c > 0) liste.push({ id: k, label: `${LEGACY[k] || k} (${c})` });
    return liste;
  }, [themes, compteursThemes]);

  const info = tribu !== 'all' ? INFO_TRIBUS[tribu] : undefined;
  const villagesTribu = useMemo(() => villages.filter(v => v.tribe === tribu).map(v => v.name), [villages, tribu]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const pageSure = Math.min(page, pages);

  const dire = (f: QuestionnaireItem) => { Speech.stop(); if (parole === f.id) { setParole(null); return; } setParole(f.id); Speech.speak(f.myeneText, { language: 'fr-FR', onDone: () => setParole(null), onStopped: () => setParole(null) }); };
  const aller = (id: string) => { if (onContribuer) onContribuer(id); else routeur.push('/(tabs)'); };
  const choisirTribu = (t: string) => { setTribu(t); setTheme('all'); setPage(1); };

  return (
    <View style={{ gap: 10 }}>
      <Text style={s.titre}>Mémoire & Vocabulaire Myènè</Text>
      <Text style={s.texte}>Explorez les expressions du corpus classées par Ethnie Myènè et par Thème culturel</Text>
      <View style={s.ligne}>
        <Pressable onPress={() => { setSeulementFavoris(!seulementFavoris); setPage(1); }} style={[s.petit, seulementFavoris && s.petitActif]}><Text style={[s.petitTexte, seulementFavoris && { color: '#180d07' }]}>★ Mes Favoris ({favoris.length})</Text></Pressable>
        <Text style={s.discret}>{charge || (enChargement && total === 0) ? 'Chargement…' : `${total} résultat(s)`}</Text>
      </View>

      {enChargement && total === 0 && <Chargement compact />}
      <TextInput style={s.champ} placeholder="Chercher un mot (français ou myènè)" placeholderTextColor={couleurs.discret} value={texte} onChangeText={setTexte} autoCorrect={false} autoCapitalize="none" />

      <Text style={s.etiquette}>Filtrer par Ethnie :</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable onPress={() => choisirTribu('all')} style={[s.puce, tribu === 'all' && s.puceActive]}><Text style={[s.puceTexte, tribu === 'all' && s.actif]}>🌍 Toutes les 6 ethnies Myènè ({enChargement && totalFiches === 0 ? '…' : totalFiches} fiches)</Text></Pressable>
        {MYENE_TRIBES.map(t => (
          <Pressable key={t} onPress={() => choisirTribu(t)} style={[s.puce, tribu === t && s.puceActive]}>
            <Text style={[s.puceTexte, tribu === t && s.actif]}>{profil?.tribe === t ? '⭐ ' : '🌍 '}{t} ({compteTribu(t)})</Text>
          </Pressable>
        ))}
      </ScrollView>

      {info ? (
        <View style={s.carte}>
          <Text style={s.titreP}>Ethnie {info.tribe}  ·  Variété dialectale : {info.tribe} • {total} question(s) associée(s)</Text>
          <Text style={s.motto}>{info.mottoOrSymbol}</Text>
          <Text style={s.etiquette}>Spécificités Orthographiques & Tonales</Text><Text style={s.texte}>{info.orthographicAndTonalTraits}</Text>
          <Text style={s.etiquette}>Histoire & Tradition Orale</Text><Text style={s.texte}>{info.historicalOrigins}</Text>
          <Text style={s.etiquette}>Aire Géographique</Text><Text style={s.texte}>{info.geographicalZone}</Text>
          {villagesTribu.length > 0 && <Text style={s.discret}>Villages enregistrés : {villagesTribu.slice(0, 20).map(v => `📍 ${v}`).join('  ')}</Text>}
          <Pressable onPress={() => choisirTribu('all')}><Text style={s.lien}>Toutes les ethnies</Text></Pressable>
        </View>
      ) : (
        <Text style={s.discret}>En langue Myènè, les différences orthographiques et tonales concernent uniquement les 6 Ethnies (Mpongwè, Adyumba, Enenga, Nkomi, Galoa, Ôrungu) et non les clans. Sélectionnez une ethnie pour explorer ses expressions et ses particularités linguistiques.</Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {categories.map(c => (
          <Pressable key={c.id} onPress={() => { setTheme(c.id); setPage(1); }} style={[s.puce, theme === c.id && s.puceActive]}><Text style={[s.puceTexte, theme === c.id && s.actif]}>{c.label}</Text></Pressable>
        ))}
      </ScrollView>

      {charge && <ActivityIndicator color={couleurs.ambre} />}
      {!charge && fiches.length === 0 && (
        <View style={s.carte}>
          <Text style={{ fontSize: 28, textAlign: 'center' }}>{seulementFavoris ? '⭐' : '🌍'}</Text>
          <Text style={s.titreP}>{seulementFavoris ? 'Aucun vocabulaire favori pour ces critères' : 'Aucune expression trouvée pour ces critères'}</Text>
          <Text style={s.texte}>{seulementFavoris
            ? "Cliquez sur l'étoile « Favori » sur les cartes du vocabulaire pour sauvegarder vos expressions Myènè préférées et les retrouver ici ainsi que dans votre Profil."
            : `Aucun mot ne correspond simultanément à votre recherche et aux filtres sélectionnés (${tribu !== 'all' ? `Ethnie ${tribu}` : 'Toutes les ethnies'}).`}</Text>
          <Pressable style={s.petit} onPress={() => { setTexte(''); setTribu('all'); setTheme('all'); setSeulementFavoris(false); setPage(1); }}><Text style={s.petitTexte}>Afficher tout le vocabulaire</Text></Pressable>
        </View>
      )}

      {fiches.map(f => {
        const aime = favoris.includes(f.id);
        const annotsFiche = index.parFiche.get(f.id) || [];
        const { tribus: tribusFiche, variantes } = tribusDeLaFiche(f, annotsFiche);
        const variante = tribu !== 'all' ? variantes.get(tribu.normalize('NFC').toLowerCase().trim()) : undefined;
        const nuance = annotsFiche.find(a => a.frenchMeaning || a.secondaryMeaning);
        return (
          <View key={f.id} style={[s.carte, aime && { borderColor: couleurs.ambre }]}>
            {!!f.imageUrl && <Image source={{ uri: f.imageUrl }} style={s.image} accessibilityLabel={f.frenchText} />}
            <View style={s.ligne}>
              <View style={[s.pile, { flex: 1 }]}>
                {tribusFiche.map(t => (
                  <Pressable key={t} onPress={() => choisirTribu(t)} accessibilityLabel={`Filtrer par l’ethnie ${t}`}>
                    <Text style={[s.badge, (tribu === t || profil?.tribe === t) && s.badgeOr]}>🌍 Ethnie {t}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.discret}>{f.difficulty}</Text>
              <Pressable onPress={() => favori(f.id)} hitSlop={10} accessibilityLabel={aime ? 'Retirer des favoris' : 'Ajouter aux favoris'}><Text style={{ fontSize: 24, color: aime ? couleurs.ambre : couleurs.discret }}>{aime ? '★' : '☆'}</Text></Pressable>
            </View>
            <Text style={s.francais}>« {f.frenchText} »</Text>
            <Text style={s.discret}>Ethnie {tribuDuDialecte(String(f.dialect))} · {f.recordingsCount || 0} voix enregistrées</Text>
            <Text style={s.myene}>{f.myeneText}</Text>
            {!!f.phoneticApi && <Text style={s.discret}>[{f.phoneticApi}]</Text>}
            {!!variante && variante !== f.myeneText && <Text style={s.variante}>Variante Ethnie {tribu} : <Text style={{ fontWeight: '900' }}>{variante}</Text></Text>}
            {!!nuance && (
              <View style={{ gap: 2 }}>
                {!!nuance.frenchMeaning && <Text style={s.nuance}>💡 Autre tournure / sens : <Text style={{ fontWeight: '900' }}>« {nuance.frenchMeaning} »</Text></Text>}
                {!!nuance.secondaryMeaning && <Text style={s.nuance}>🌿 Sens secondaire : {nuance.secondaryMeaning}</Text>}
              </View>
            )}
            <View style={s.ligne}>
              <Pressable onPress={() => dire(f)} accessibilityLabel="Écouter la prononciation"><Text style={s.petitTexte}>{parole === f.id ? '⏹ Écouter la prononciation' : '🔊 Écouter la prononciation'}</Text></Pressable>
              <Pressable onPress={() => favori(f.id)} style={[s.petit, aime && s.petitFav]}><Text style={s.petitTexte}>{aime ? '★ Favori' : '☆ Favori'}</Text></Pressable>
            </View>
            <Pressable style={s.bouton} onPress={() => aller(f.id)}><Text style={s.boutonTexte}>🎙️ Enregistrer ma voix</Text></Pressable>
          </View>
        );
      })}

      {pages > 1 && (
        <View style={s.ligne}>
          <Pressable disabled={pageSure <= 1} onPress={() => setPage(p => Math.max(1, p - 1))} style={[s.petit, pageSure <= 1 && { opacity: 0.4 }]}><Text style={s.petitTexte}>‹ Précédent</Text></Pressable>
          <Text style={s.discret}>Page {pageSure} sur {pages} ({total} fiches)</Text>
          <Pressable disabled={pageSure >= pages} onPress={() => setPage(p => Math.min(pages, p + 1))} style={[s.petit, pageSure >= pages && { opacity: 0.4 }]}><Text style={s.petitTexte}>Suivant ›</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const s = stylesDyn(() => ({
  titre: { color: couleurs.texteClair, fontSize: 20, fontWeight: '900' },
  titreP: { color: couleurs.texteClair, fontSize: 14, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 13, lineHeight: 19 },
  discret: { color: couleurs.discret, fontSize: 12 },
  etiquette: { color: couleurs.ambre, fontSize: 12, fontWeight: '800' },
  motto: { color: couleurs.ambre, fontSize: 13, fontStyle: 'italic' },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  champ: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 15 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  actif: { color: '#fff', fontWeight: '800' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  image: { width: '100%', height: 150, borderRadius: 12 },
  badge: { color: couleurs.ambre, fontSize: 11, fontWeight: '800', borderColor: couleurs.bord, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  badgeOr: { backgroundColor: couleurs.ambre, color: '#180d07', borderColor: couleurs.ambre },
  francais: { color: '#fff', fontSize: 17, fontWeight: '800' },
  myene: { color: couleurs.ambre, fontSize: 20, fontWeight: '900' },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  variante: { color: couleurs.ambre, fontSize: 12 },
  nuance: { color: '#a7f3d0', fontSize: 12 },
  petit: { borderColor: couleurs.bord, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  petitActif: { backgroundColor: couleurs.ambre, borderColor: couleurs.ambre },
  petitFav: { backgroundColor: '#f59e0b33', borderColor: couleurs.ambre },
  petitTexte: { color: '#fde047', fontSize: 12, fontWeight: '800' },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 14 },
  lien: { color: couleurs.ambre, fontSize: 12, fontWeight: '700' },
}));
