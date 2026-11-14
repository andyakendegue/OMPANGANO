/** Console d'administration de Nkala : contenus (import/export JSON et CSV), supervision, interrupteurs, modération des habitants, droits payants, journal. */
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  adminAccorderDroit, adminNkorouna, adminAjusterNkr, adminAnnulerNkr, adminGelerNkr, adminAncrerNkr, cleNkr, adminExemples, adminImporterExemples, adminSupprimerExemples, adminPaiements, adminValiderPaiement, adminRefuserPaiement, adminAnnulerDroit, adminCollections, adminDecider, adminDroits, adminEcrireParametre, adminExporter, adminImporter, adminImports, adminJournal, adminLignes, adminModeration,
  adminParametres, adminSeries, adminSupprimerLigne, adminSupervision, chargerModules, modeleCsv, SCHEMAS, schemaDe, type InfoCollection, type RapportServeur,
} from '@nkala/noyau';
import { Bouton, Carte, Champ, Chargement, EtatVide, Ic, Pastille, Puce, Rangee, SectionTitre, T, useConfirmer, useToast } from './kit';
import { ThemeSombre, useTheme } from './Prefs';
import { sombre } from './theme';
import { VueLogement, type AnnonceVue } from './logement/DetailLogement';

export const Sombre = ({ children }: { children: React.ReactNode }) => <ThemeSombre><View style={{ gap: 14 }}>{children}</View></ThemeSombre>;

function telecharger(nom: string, texte: string, mime: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([texte], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = nom; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  } else Share.share({ title: nom, message: texte }).catch(() => {});
}

// ------------------------------------------------------------------ contenus
function Collection({ info, retour }: { info: InfoCollection; retour: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const schema = schemaDe(info.collection)!;
  const [dialogue, confirmer] = useConfirmer();
  const [texte, setTexte] = useState('');
  const [nom, setNom] = useState('');
  const [rapport, setRapport] = useState<RapportServeur | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [lignes, setLignes] = useState<{ items: Record<string, any>[]; total: number; page: number; pages: number } | null>(null);
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState('');
  const [voirChamps, setVoirChamps] = useState(false);
  const charger = useCallback(() => adminLignes(info.collection, page, recherche).then(setLignes).catch(e => toast((e as Error).message, 'erreur')), [info.collection, page, recherche, toast]);
  useEffect(() => { charger(); }, [charger]);

  const choisir = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/json', 'text/plain', 'text/comma-separated-values', '*/*'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0]; setNom(a.name);
      setTexte(await (await fetch(a.uri)).text()); setRapport(null);
    } catch (e) { toast((e as Error).message, 'erreur'); }
  };
  const lancer = async (mode: 'verifier' | 'ajouter' | 'remplacer', partiel = false) => {
    if (!texte.trim()) { toast('Choisis un fichier ou colle le contenu.', 'info'); return; }
    setOccupe(true);
    try { const r = await adminImporter(info.collection, texte, mode, partiel); setRapport(r); if (r.ecritureFaite) { toast(`${r.ecrit} ligne(s) enregistrée(s)${r.supprimes ? `, ${r.supprimes} retirée(s)` : ''}.`, 'succes'); charger(); } else if (mode !== 'verifier') toast('Rien n\'a été écrit : corrige les erreurs ou importe seulement les lignes valides.', 'erreur'); }
    catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); }
  };
  return (
    <Sombre>
      {dialogue}
      <Bouton label="Toutes les collections" icone="retour" variante="fantome" petit large={false} onPress={retour} />
      <T v="sousTitre">{info.titre}</T><T v="petit">{info.description} · {info.total} ligne(s), {info.publies} publiée(s)</T>
      <Carte plat><View style={{ padding: 14, gap: 10 }}>
        <T v="carte">1. Récupérer le modèle</T>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Bouton label="Modèle CSV" icone="telecharger" petit large={false} variante="fantome" onPress={() => telecharger(`${info.collection}.csv`, modeleCsv(schema), 'text/csv;charset=utf-8')} />
          <Bouton label={voirChamps ? 'Masquer les colonnes' : 'Voir les colonnes'} petit large={false} variante="fantome" onPress={() => setVoirChamps(!voirChamps)} />
        </View>
        {voirChamps && schema.champs.map(ch => <View key={ch.nom} style={{ flexDirection: 'row', gap: 8 }}><T v="carte" style={{ width: 130 }}>{ch.nom}{ch.requis ? ' *' : ''}</T><T v="petit" style={{ flex: 1 }}>{ch.type}{ch.choix ? ` (${ch.choix.join(', ')})` : ''} — {ch.aide}</T></View>)}
      </View></Carte>
      <Carte plat><View style={{ padding: 14, gap: 10 }}>
        <T v="carte">2. Importer (CSV ou JSON)</T>
        <Bouton label={nom ? `Fichier : ${nom}` : 'Choisir un fichier'} icone="fichier" petit variante="fantome" onPress={choisir} />
        <Champ valeur={texte} onChange={t => { setTexte(t); setRapport(null); }} placeholder="…ou colle le contenu ici (la première ligne = noms des colonnes)" lignes={5} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Bouton label="Vérifier" petit large={false} variante="ambre" charge={occupe} onPress={() => lancer('verifier')} />
          <Bouton label="Ajouter / mettre à jour" petit large={false} onPress={() => lancer('ajouter')} desactive={occupe} />
          <Bouton label="Remplacer tout" petit large={false} variante="fantome" onPress={() => lancer('remplacer')} desactive={occupe} />
        </View>
        {rapport && <View style={{ gap: 6 }}>
          <T v="carte" couleur={rapport.erreurs.length ? c.erreur : c.succes}>{rapport.valides} ligne(s) valide(s) sur {rapport.total} · {rapport.erreurs.length} erreur(s) · {rapport.avertissements.length} avertissement(s)</T>
          {rapport.erreurs.slice(0, 20).map((e, i) => <T key={i} v="petit" couleur={c.erreur}>Ligne {e.ligne}{e.champ ? ` · ${e.champ}` : ''} : {e.message}</T>)}
          {rapport.avertissements.slice(0, 10).map((e, i) => <T key={'a' + i} v="petit" couleur={c.accent}>Ligne {e.ligne}{e.champ ? ` · ${e.champ}` : ''} : {e.message}</T>)}
          {rapport.erreurs.length > 0 && rapport.valides > 0 && <Bouton label={`Importer seulement les ${rapport.valides} lignes valides`} petit variante="fantome" onPress={() => lancer('ajouter', true)} />}
        </View>}
      </View></Carte>
      <Carte plat><View style={{ padding: 14, gap: 10 }}>
        <T v="carte">3. Exporter</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Bouton label="CSV" icone="telecharger" petit large={false} variante="fantome" onPress={async () => { try { telecharger(`${info.collection}.csv`, await adminExporter(info.collection, 'csv'), 'text/csv;charset=utf-8'); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
          <Bouton label="JSON" icone="telecharger" petit large={false} variante="fantome" onPress={async () => { try { telecharger(`${info.collection}.json`, JSON.stringify(await adminExporter(info.collection, 'json'), null, 1), 'application/json'); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
        </View>
      </View></Carte>
      <SectionTitre titre="Lignes en ligne" />
      <Champ valeur={recherche} onChange={t => { setRecherche(t); setPage(1); }} placeholder="Filtrer" icone="chercher" />
      {!lignes ? <Chargement lignes={2} /> : lignes.items.length === 0 ? <EtatVide icone="dossier" titre="Aucune ligne" texte="Importe un fichier pour commencer." /> : lignes.items.map(l => (
        <Carte key={l.id} plat><View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><T v="carte" numberOfLines={1}>{l.titre ?? l.nom ?? l.myene ?? l.question ?? l.id}</T><T v="petit" numberOfLines={1}>{l.id}</T></View>
          <Pastille label={l.publie ? 'Publié' : 'Brouillon'} couleur={l.publie ? c.succes : c.discret} fond={c.carte} />
          <Pressable accessibilityRole="button" accessibilityLabel="Supprimer" hitSlop={8} onPress={() => confirmer({ titre: 'Supprimer cette ligne ?', texte: `« ${l.titre ?? l.nom ?? l.id} » ne sera plus visible dans l'application.`, action: 'Supprimer', onOk: async () => { try { await adminSupprimerLigne(info.collection, l.id); charger(); } catch (e) { toast((e as Error).message, 'erreur'); } } })}><Ic nom="supprimer" taille={18} couleur={c.erreur} /></Pressable>
        </View></Carte>))}
      {lignes && lignes.pages > 1 && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}><Bouton label="Précédent" petit large={false} variante="fantome" desactive={page <= 1} onPress={() => setPage(page - 1)} /><T v="petit">{page} / {lignes.pages}</T><Bouton label="Suivant" petit large={false} variante="fantome" desactive={page >= lignes.pages} onPress={() => setPage(page + 1)} /></View>}
    </Sombre>
  );
}

export function ContenusAdmin() {
  const toast = useToast();
  const [liste, setListe] = useState<InfoCollection[] | null>(null);
  const [sel, setSel] = useState<InfoCollection | null>(null);
  const [mod, setMod] = useState<string>('tous');
  const [historique, setHistorique] = useState<Awaited<ReturnType<typeof adminImports>>>([]);
  const [ex, setEx] = useState<{ presents: number; disponibles: boolean } | null>(null);
  const [dialogueEx, confirmerEx] = useConfirmer();
  const charger = useCallback(() => { adminCollections().then(setListe).catch(e => toast((e as Error).message, 'erreur')); adminImports().then(setHistorique).catch(() => {}); adminExemples().then(setEx).catch(() => {}); }, [toast]);
  useEffect(() => { charger(); }, [charger]);
  if (sel) return <Collection info={liste?.find(x => x.collection === sel.collection) ?? sel} retour={() => { setSel(null); charger(); }} />;
  const modules = ['tous', ...new Set(SCHEMAS.map(s => s.module))];
  return (
    <Sombre>
      <T v="petit">Tous les jeux, cours, catalogues et listes se remplissent avec des fichiers CSV ou JSON. Choisis une collection, récupère son modèle, remplis-le, puis importe-le.</T>
      {ex && <Carte plat><View style={{ padding: 14, gap: 8 }}>
        {dialogueEx}
        <T v="carte">Contenus d'exemple : {ex.presents} ligne(s) en ligne</T>
        <T v="petit">Ils servent à essayer l'application. Supprime-les quand tes vrais contenus sont importés ; tu peux les réimporter à tout moment.</T>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Bouton label="Importer les exemples" petit large={false} variante="fantome" desactive={!ex.disponibles} onPress={() => adminImporterExemples().then(r => { toast(`${r.lignes} ligne(s) importée(s).`, 'succes'); charger(); }).catch(e => toast((e as Error).message, 'erreur'))} />
          <Bouton label="Supprimer tous les exemples" petit large={false} variante="fantome" desactive={ex.presents === 0} onPress={() => confirmerEx({ titre: 'Supprimer les contenus d\'exemple ?', texte: `${ex.presents} ligne(s) marquées « exemple » seront supprimées. Tes propres contenus ne sont pas touchés.`, action: 'Supprimer les exemples', onOk: () => adminSupprimerExemples().then(r => { toast(`${r.supprimes} ligne(s) supprimée(s).`, 'succes'); charger(); }).catch(e => toast((e as Error).message, 'erreur')) })} />
        </View>
      </View></Carte>}
      <Rangee>{modules.map(m => <Puce key={m} label={m} actif={mod === m} onPress={() => setMod(m)} />)}</Rangee>
      {!liste ? <Chargement /> : liste.filter(i => mod === 'tous' || i.module === mod).map(i => (
        <Carte key={i.collection} onPress={() => setSel(i)} label={i.titre}><View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><T v="carte">{i.titre}</T><T v="petit" numberOfLines={1}>{i.module} · {i.collection}</T></View>
          <Pastille label={`${i.publies}/${i.total}`} /><Ic nom="suivant" taille={18} />
        </View></Carte>))}
      {historique.length > 0 && <><SectionTitre titre="Derniers imports" />{historique.slice(0, 8).map(h => <T key={h.id} v="petit">{new Date(h.at).toLocaleString('fr-FR')} · {h.collection} · {h.mode} · {h.valides}/{h.total}{h.erreurs ? ` · ${h.erreurs} erreurs` : ''}</T>)}</>}
    </Sombre>
  );
}

// ------------------------------------------------------------------ supervision
const Metrique = ({ titre, valeur, sous }: { titre: string; valeur: string | number; sous?: string }) => { const { c } = useTheme(); return <Carte style={{ flexGrow: 1, flexBasis: '45%', padding: 14, gap: 2 }}><T v="titre" couleur={c.accent}>{valeur}</T><T v="carte">{titre}</T>{!!sous && <T v="petit">{sous}</T>}</Carte>; };
const Barres = ({ titre, donnees }: { titre: string; donnees: { jour: string; n: number }[] }) => {
  const { c } = useTheme(); const max = Math.max(1, ...donnees.map(d => d.n));
  return <Carte plat><View style={{ padding: 14, gap: 8 }}><T v="carte">{titre}</T><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 70 }}>{donnees.map(d => <View key={d.jour} accessibilityLabel={`${d.jour} : ${d.n}`} style={{ flex: 1, height: Math.max(2, (d.n / max) * 70), borderRadius: 3, backgroundColor: c.accent }} />)}</View><T v="petit">{donnees[0]?.jour} → {donnees[donnees.length - 1]?.jour}</T></View></Carte>;
};

export function SupervisionAdmin() {
  const { c } = useTheme();
  const [s, setS] = useState<Record<string, any> | null>(null);
  const [series, setSeries] = useState<Record<string, any> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const charger = useCallback(() => { setErr(null); adminSupervision().then(setS).catch(e => setErr((e as Error).message)); adminSeries(14).then(setSeries).catch(() => {}); }, []);
  useEffect(() => { charger(); const t = setInterval(charger, 60_000); return () => clearInterval(t); }, [charger]);
  if (err) return <Sombre><EtatVide icone="alerte" titre="Supervision indisponible" texte={err} action="Réessayer" onAction={charger} /></Sombre>;
  if (!s) return <Sombre><Chargement /></Sombre>;
  const b = s.branchements ?? {};
  return (
    <Sombre>
      <SectionTitre titre="Branchements" />
      <Carte plat><View style={{ padding: 14, gap: 8 }}>{[['twilio', 'SMS (Twilio Verify)'], ['ia', 'Assistant IA (clé du modèle)'], ['revive', 'Régie publicitaire (Revive)'], ['turn', 'Relais d\'appels (TURN)'], ['stockage', 'Stockage des médias']].map(([k, l]) => <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: b[k] ? c.succes : c.erreur }} /><T v="corps" style={{ flex: 1 }}>{l}</T><T v="petit">{b[k] ? 'branché' : 'à connecter'}</T></View>)}</View></Carte>
      <SectionTitre titre="Utilisateurs" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Metrique titre="Comptes" valeur={s.utilisateurs?.total ?? 0} sous={`${s.utilisateurs?.par_sms ?? 0} par SMS`} /><Metrique titre="Nouveaux (7 j)" valeur={s.utilisateurs?.nouveaux7 ?? 0} /><Metrique titre="Actifs (7 j)" valeur={s.utilisateurs?.actifs7 ?? 0} /><Metrique titre="Apprenants (7 j)" valeur={s.apprentissage?.apprenants_7j ?? 0} /><Metrique titre="Abonnés" valeur={s.abonnes ?? 0} />
      </View>
      {series && <><Barres titre="Inscriptions par jour" donnees={series.inscriptions} /><Barres titre="Parties par jour" donnees={series.parties} /></>}
      <SectionTitre titre="Assistant IA" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Metrique titre="Jetons aujourd'hui" valeur={(s.ia?.jetons_jour ?? 0).toLocaleString('fr-FR')} /><Metrique titre="Jetons (7 j)" valeur={(s.ia?.jetons_7j ?? 0).toLocaleString('fr-FR')} /><Metrique titre="Jetons ce mois" valeur={(s.ia?.jetons_mois ?? 0).toLocaleString('fr-FR')} /><Metrique titre="Requêtes (7 j)" valeur={s.ia?.requetes_7j ?? 0} sous={`${s.ia?.utilisateurs_7j ?? 0} utilisateurs`} /></View>
      {series && <Barres titre="Jetons par jour" donnees={series.jetons} />}
      <SectionTitre titre="Jeux (7 j)" />
      {(s.jeux ?? []).length === 0 ? <T v="petit">Aucune partie.</T> : s.jeux.map((j: any) => <T key={j.jeu_id} v="corps">{j.jeu_id} : {j.parties} parties · {j.joueurs} joueurs · score moyen {j.moyenne}</T>)}
      <SectionTitre titre="Publicité (7 j)" />
      <T v="petit">Taux de clic : {s.pub?.ctr ?? 0} %</T>
      {(s.pub?.zones ?? []).map((z: any) => <T key={z.zone} v="corps">{z.zone} : {z.affichages} affichages · {z.clics} clics · {z.recompenses} récompenses</T>)}
      {series && <Barres titre="Affichages par jour" donnees={series.affichages} />}
      <SectionTitre titre="Connexions par SMS (24 h)" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Metrique titre="Codes envoyés" valeur={s.sms?.envois ?? 0} /><Metrique titre="Vérifiés" valeur={s.sms?.verifs_ok ?? 0} /><Metrique titre="Refusés" valeur={s.sms?.verifs_ko ?? 0} /></View>
      <SectionTitre titre="Erreurs (24 h)" />
      {(s.erreurs24h ?? []).length === 0 ? <T v="petit" couleur={c.succes}>Aucune erreur.</T> : s.erreurs24h.map((e: any, i: number) => <T key={i} v="petit" couleur={c.erreur}>{e.n} × {String(e.message).slice(0, 140)}</T>)}
      {(s.moderationEnAttente ?? []).length > 0 && <><SectionTitre titre="À modérer" />{s.moderationEnAttente.map((m: any) => <T key={m.collection} v="corps">{m.collection} : {m.n}</T>)}</>}
      <Bouton label="Actualiser" icone="stats" variante="fantome" petit large={false} onPress={charger} />
    </Sombre>
  );
}

// ------------------------------------------------------------------ interrupteurs et quotas
export function InterrupteursAdmin() {
  const { c } = useTheme();
  const toast = useToast();
  const [eff, setEff] = useState<{ modules: Record<string, boolean>; fonctions: Record<string, boolean> } | null>(null);
  const [p, setP] = useState<Record<string, any>>({});
  const [q, setQ] = useState({ parJour: '', parMois: '', parConversation: '' });
  const [pl, setPl] = useState({ recompensesParJour: '', parCreationJour: '' });
  const charger = useCallback(() => adminParametres().then(r => { setEff(r.effectif); setP(r.parametres); setQ({ parJour: String(r.parametres.ia_quotas?.parJour ?? ''), parMois: String(r.parametres.ia_quotas?.parMois ?? ''), parConversation: String(r.parametres.ia_quotas?.parConversation ?? '') }); setPl({ recompensesParJour: String(r.parametres.pub_plafonds?.recompensesParJour ?? ''), parCreationJour: String(r.parametres.pub_plafonds?.parCreationJour ?? '') }); }).catch(e => toast((e as Error).message, 'erreur')), [toast]);
  useEffect(() => { charger(); }, [charger]);
  const basculer = async (cle: 'modules' | 'fonctions', id: string, v: boolean) => { try { await adminEcrireParametre(cle, { ...(p[cle] ?? {}), ...(eff?.[cle] ?? {}), [id]: v }); toast('Enregistré.', 'succes'); charger(); void chargerModules(); } catch (e) { toast((e as Error).message, 'erreur'); } };
  const nombres = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && Number(v) >= 0).map(([k, v]) => [k, Number(v)]));
  if (!eff) return <Sombre><Chargement /></Sombre>;
  const Ligne = ({ cle, id, label, fige }: { cle: 'modules' | 'fonctions'; id: string; label: string; fige?: string }) => (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: !!eff[cle][id], disabled: !!fige }} disabled={!!fige} onPress={() => basculer(cle, id, !eff[cle][id])} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: sombre.carte, borderWidth: 1, borderColor: sombre.bord, opacity: fige ? 0.6 : 1 }}>
      <View style={{ flex: 1 }}><T v="carte">{label}</T>{!!fige && <T v="petit">{fige}</T>}</View>
      <View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: eff[cle][id] ? sombre.succes : sombre.squelette, justifyContent: 'center', paddingHorizontal: 3 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FDFAF7', alignSelf: eff[cle][id] ? 'flex-end' : 'flex-start' }} /></View>
    </Pressable>
  );
  // Trois positions par module : ouvert à tous, réservé aux administrateurs (essai), fermé.
  type Mode = 'tous' | 'admins' | 'ferme';
  const modeDe = (id: string): Mode => eff.modules[id] ? 'tous' : p.modules_admin?.[id] ? 'admins' : 'ferme';
  const choisirMode = async (id: string, m: Mode) => {
    try {
      // Fermé ou réservé : `modules` passe à false explicitement, pour qu'une variable du serveur ne le rouvre pas au public.
      await adminEcrireParametre('modules', { ...(p.modules ?? {}), ...eff.modules, [id]: m === 'tous' });
      await adminEcrireParametre('modules_admin', { ...(p.modules_admin ?? {}), [id]: m === 'admins' });
      toast('Enregistré.', 'succes'); charger(); void chargerModules();
    } catch (e) { toast((e as Error).message, 'erreur'); }
  };
  const LigneModule = ({ id, label }: { id: string; label: string }) => {
    const m = modeDe(id);
    return (
      <View style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: sombre.carte, borderWidth: 1, borderColor: sombre.bord }}>
        <T v="carte">{label}</T>
        <Rangee>{([['tous', 'Tous'], ['admins', 'Admins'], ['ferme', 'Fermé']] as const).map(([k, l]) => <Puce key={k} label={l} actif={m === k} onPress={() => { if (m !== k) void choisirMode(id, k); }} />)}</Rangee>
      </View>
    );
  };
  return (
    <Sombre>
      <T v="petit">Ces interrupteurs s'appliquent tout de suite sur cet appareil, et sur les autres à leur prochain retour dans l'application, sans nouvelle version.</T>
      <SectionTitre titre="Modules" />
      <T v="petit">« Admins » : l'onglet reste caché au public mais s'affiche, marqué ADMIN, pour les administrateurs connectés, le temps de tester.</T>
      {[['ompangano', 'Ompangano (contribuer)'], ['onenji', 'Onenji (apprendre)'], ['azeva', 'Azeva (jouer)'], ['ontci', 'Ontci (écouter)'], ['nkala', 'Nkala (village)']].map(([id, l]) => <LigneModule key={id} id={id} label={l} />)}
      <SectionTitre titre="Fonctions" />
      {[['publicite', 'Publicité'], ['achats', 'Achats et abonnements'], ['assistantIA', "Assistant Kak'Igonjo"]].map(([id, l]) => <Ligne key={id} cle="fonctions" id={id} label={l} />)}
      <Ligne cle="fonctions" id="salleParis" label="Salle des paris" fige="Fermée : le dossier juridique de cinq pièces n'est pas réuni." />
      <SectionTitre titre="Quotas de l'assistant (jetons)" />
      {([['parJour', 'Par jour'], ['parMois', 'Par mois'], ['parConversation', 'Par conversation']] as const).map(([k, l]) => <Champ key={k} valeur={q[k]} onChange={t => setQ({ ...q, [k]: t.replace(/\D/g, '') })} placeholder={`${l} (adulte ; enfants : ¼, abonnés : ×4)`} clavier="number-pad" />)}
      <Bouton label="Enregistrer les quotas" petit variante="fantome" onPress={async () => { try { await adminEcrireParametre('ia_quotas', nombres(q)); toast('Quotas enregistrés.', 'succes'); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
      <SectionTitre titre="Plafonds publicitaires" />
      <Champ valeur={pl.recompensesParJour} onChange={t => setPl({ ...pl, recompensesParJour: t.replace(/\D/g, '') })} placeholder="Annonces récompensées par jour et par joueur (3)" clavier="number-pad" />
      <Champ valeur={pl.parCreationJour} onChange={t => setPl({ ...pl, parCreationJour: t.replace(/\D/g, '') })} placeholder="Affichages par création et par jour (0 = sans plafond)" clavier="number-pad" />
      <Bouton label="Enregistrer les plafonds" petit variante="fantome" onPress={async () => { try { await adminEcrireParametre('pub_plafonds', nombres(pl)); toast('Plafonds enregistrés.', 'succes'); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
    </Sombre>
  );
}

// ------------------------------------------------------------------ modération des habitants
export function ModerationHabitants() {
  const { c } = useTheme();
  const toast = useToast();
  const [liste, setListe] = useState<Record<string, any>[] | null>(null);
  const charger = useCallback(() => adminModeration().then(setListe).catch(e => toast((e as Error).message, 'erreur')), [toast]);
  useEffect(() => { charger(); }, [charger]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [motif, setMotif] = useState('');
  const decider = async (x: Record<string, any>, d: 'publier' | 'refuser') => { try { await adminDecider(x.collection, x.id, d, d === 'refuser' && motif.trim() ? motif.trim() : undefined); setMotif(''); charger(); } catch (e) { toast((e as Error).message, 'erreur'); } };
  return (
    <Sombre>
      <T v="petit">Annonces, signalements, idées et avis envoyés par les habitants : rien n'est visible avant ta décision.</T>
      {!liste ? <Chargement /> : liste.length === 0 ? <EtatVide icone="bouclier" titre="Rien à modérer" /> : liste.map(x => (
        <Carte key={x.collection + x.id} plat><View style={{ padding: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}><Pastille label={x.collection} /><T v="petit">{x.auteur}</T></View>
          <T v="carte">{x.titre ?? x.description}</T>{!!x.description && x.titre && <T v="petit">{x.description}</T>}
          {x.prix ? <T v="petit" couleur={c.accent}>{x.prix} FCFA</T> : null}
          {x.logement && <>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pastille label={`${(x.logement.medias ?? []).length} médias`} />
              <Pastille label={`Complétude ${x.logement.completude ?? 0}`} />
              {x.logement.certifiee ? <Pastille label="Visite certifiée" couleur={c.succes} /> : <Pastille label="Non certifiée" />}
              {x.logement.ecartMediasM !== null && x.logement.ecartMediasM !== undefined && <Pastille label={`Écart des médias pris sur place : ${x.logement.ecartMediasM} m`} couleur={x.logement.ecartMediasM > 150 ? c.erreur : c.texte} />}
              {x.logement.masquee && <Pastille label="Emplacement masqué" />}
            </View>
            {x.logement.positionReelle && <T v="petit">Position réelle (modérateurs seulement) : {x.logement.positionReelle.lat.toFixed(5)}, {x.logement.positionReelle.lng.toFixed(5)}</T>}
            <T v="petit">La certification est déclarative : une position de téléphone peut être falsifiée. Vérifiez la cohérence des photos.</T>
            <Bouton label={ouvert === x.id ? 'Masquer la fiche' : 'Voir la fiche, les photos, vidéos et 360°'} petit variante="fantome" onPress={() => setOuvert(ouvert === x.id ? null : x.id)} />
            {ouvert === x.id && <View style={{ gap: 12 }}><VueLogement a={x as AnnonceVue} /><T v="petit">Téléphone : {x.telephone || '—'}{x.logement.whatsapp ? ` · WhatsApp : ${x.logement.whatsapp}` : ''}</T></View>}
          </>}
          {ouvert === x.id && <Champ valeur={motif} onChange={setMotif} placeholder="Motif du refus (facultatif, visible de l'auteur)" />}
          <View style={{ flexDirection: 'row', gap: 10 }}><Bouton label="Publier" petit large={false} onPress={() => decider(x, 'publier')} /><Bouton label="Refuser" petit large={false} variante="fantome" onPress={() => decider(x, 'refuser')} /></View>
        </View></Carte>))}
    </Sombre>
  );
}

// ------------------------------------------------------------------ droits payants
export function DroitsAdmin() {
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('abonnement');
  const [jours, setJours] = useState('30');
  const [contenu, setContenu] = useState('');
  const [liste, setListe] = useState<Record<string, any>[]>([]);
  const charger = useCallback(() => adminDroits(userId.trim() || undefined).then(setListe).catch(() => {}), [userId]);
  useEffect(() => { charger(); }, [charger]);
  return (
    <Sombre>
      <T v="petit">En attendant les achats intégrés des magasins, tu peux accorder un abonnement, un achat, un essai ou une location à un compte (par exemple un numéro : tel_241…).</T>
      <Champ valeur={userId} onChange={setUserId} placeholder="Identifiant du compte (tel_241… ou identifiant Firebase)" />
      <Rangee>{['abonnement', 'achat', 'essai', 'location'].map(t => <Puce key={t} label={t} actif={type === t} onPress={() => setType(t)} />)}</Rangee>
      {type !== 'abonnement' && <Champ valeur={contenu} onChange={setContenu} placeholder="Identifiant du contenu (ex. c1)" />}
      <Champ valeur={jours} onChange={t => setJours(t.replace(/\D/g, ''))} placeholder="Durée en jours (vide = sans fin)" clavier="number-pad" />
      <Bouton label="Accorder" desactive={!userId.trim()} onPress={async () => { try { await adminAccorderDroit({ userId: userId.trim(), type, jours: Number(jours) || undefined, contenuId: contenu || undefined }); toast('Droit accordé.', 'succes'); charger(); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
      {liste.map(d => <Carte key={d.id} plat><View style={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}><View style={{ flex: 1 }}><T v="carte">{d.type} · {d.user_id}</T><T v="petit">{d.contenu_id ?? ''} {d.fin ? `jusqu'au ${new Date(d.fin).toLocaleDateString('fr-FR')}` : 'sans fin'} · {d.source} · {d.statut}</T></View>{d.statut === 'actif' && <Bouton label="Annuler" petit large={false} variante="fantome" onPress={async () => { await adminAnnulerDroit(d.id).catch(() => {}); charger(); }} />}</View></Carte>)}
    </Sombre>
  );
}

// ------------------------------------------------------------------ journal
export function JournalAdmin() {
  const [l, setL] = useState<Awaited<ReturnType<typeof adminJournal>> | null>(null);
  useEffect(() => { adminJournal().then(setL).catch(() => setL([])); }, []);
  return <Sombre>{!l ? <Chargement /> : l.length === 0 ? <EtatVide icone="fichier" titre="Journal vide" /> : l.map(x => <T key={x.id} v="petit">{new Date(x.at).toLocaleString('fr-FR')} · {x.par.slice(0, 14)} · {x.action}{x.cible ? ` · ${x.cible}` : ''}</T>)}</Sombre>;
}

// ------------------------------------------------------------------ paiements Mobile Money
export function PaiementsAdmin() {
  const { c } = useTheme();
  const toast = useToast();
  const [statut, setStatut] = useState<string>('declare');
  const [liste, setListe] = useState<Awaited<ReturnType<typeof adminPaiements>> | null>(null);
  const charger = useCallback(() => adminPaiements(statut === 'tous' ? undefined : statut).then(setListe).catch(e => toast((e as Error).message, 'erreur')), [statut, toast]);
  useEffect(() => { charger(); }, [charger]);
  return (
    <Sombre>
      <T v="petit">Paiements Airtel Money et Moov Money. En mode manuel, vérifie sur le compte marchand que la transaction et le montant correspondent, puis valide : l'abonnement ou l'achat est accordé aussitôt.</T>
      <Rangee>{['declare', 'en_attente', 'confirme', 'refuse', 'expire', 'tous'].map(s => <Puce key={s} label={s} actif={statut === s} onPress={() => setStatut(s)} />)}</Rangee>
      {!liste ? <Chargement /> : liste.length === 0 ? <EtatVide icone="piece" titre="Aucun paiement" /> : liste.map(p => (
        <Carte key={p.id} plat><View style={{ padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T v="carte" style={{ flex: 1 }}>{p.montant.toLocaleString('fr-FR')} FCFA · {p.operateur} · {p.produitId}</T><Pastille label={p.statut} couleur={p.statut === 'confirme' ? c.succes : c.accent} fond={c.carte} /></View>
          <T v="petit">{p.nom ?? p.userId} · {p.telephone} · réf. {p.reference}{p.transaction ? ` · transaction ${p.transaction}` : ''}</T>
          {(p.statut === 'declare' || p.statut === 'en_attente') && <View style={{ flexDirection: 'row', gap: 8 }}><Bouton label="Valider" petit large={false} onPress={() => adminValiderPaiement(p.id).then(() => { toast('Paiement validé, droit accordé.', 'succes'); charger(); }).catch(e => toast((e as Error).message, 'erreur'))} /><Bouton label="Refuser" petit large={false} variante="fantome" onPress={() => adminRefuserPaiement(p.id).then(charger).catch(e => toast((e as Error).message, 'erreur'))} /></View>}
        </View></Carte>))}
    </Sombre>
  );
}

// ------------------------------------------------------------------ Nkorouna (NKR)
export function NkorounaAdmin() {
  const { c } = useTheme();
  const toast = useToast();
  const [d, setD] = useState<Awaited<ReturnType<typeof adminNkorouna>> | null>(null);
  const [uid, setUid] = useState(''), [montant, setMontant] = useState(''), [motif, setMotif] = useState('');
  const charger = useCallback(() => adminNkorouna().then(setD).catch(e => toast((e as Error).message, 'erreur')), [toast]);
  useEffect(() => { charger(); }, [charger]);
  const err = (e: unknown) => toast((e as Error).message, 'erreur');
  const ajuster = () => {
    const n = Number(montant);
    if (!uid.trim() || !Number.isInteger(n) || n === 0 || motif.trim().length < 3) { toast('Utilisateur, montant entier (négatif pour retirer) et motif attendus.', 'erreur'); return; }
    adminAjusterNkr(uid.trim(), n, motif.trim(), cleNkr()).then(r => { toast(`Fait. Nouveau solde : ${r.solde} NKR.`, 'succes'); setMontant(''); setMotif(''); charger(); }).catch(err);
  };
  return (
    <Sombre>
      <T v="petit">Registre du Nkorouna : chaque mouvement est scellé au précédent ; la vérification relit tout le registre (chaîne, soldes, somme nulle, sceaux). Une erreur se corrige par une annulation, jamais en base.</T>
      {!d ? <Chargement /> : <>
        <Carte plat><View style={{ padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <T v="carte" style={{ flex: 1 }}>Vérification : {d.verification.mouvements} mouvements</T>
            <Pastille label={d.verification.ok ? 'intègre' : 'ANOMALIE'} couleur={d.verification.ok ? c.succes : c.erreur} fond={c.carte} />
          </View>
          {d.verification.erreurs.slice(0, 10).map((e, i) => <T key={i} v="petit" couleur={c.erreur}>{e}</T>)}
          <Bouton label="Sceller les nouveaux mouvements (racine de Merkle)" petit onPress={() => adminAncrerNkr().then(r => { toast(r.rien ? 'Rien de nouveau à sceller.' : `Sceau ${r.de}–${r.jusqua} : ${r.racine?.slice(0, 16)}… (${r.reseau})`, 'succes'); charger(); }).catch(err)} />
        </View></Carte>
        <Carte plat><View style={{ padding: 12, gap: 8 }}>
          <T v="carte">Offrir ou retirer des Nkorouna</T>
          <Champ valeur={uid} onChange={setUid} placeholder="Identifiant de l'utilisateur" />
          <Champ valeur={montant} onChange={setMontant} placeholder="Montant (ex. 100, ou -50 pour retirer)" clavier="numbers-and-punctuation" />
          <Champ valeur={motif} onChange={setMotif} placeholder="Motif (inscrit au journal)" />
          <Bouton label="Valider" petit onPress={ajuster} />
        </View></Carte>
        <T v="carte">Comptes</T>
        {d.comptes.map(k => (
          <View key={k.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <T v="petit" style={{ flex: 1 }} numberOfLines={1}>{k.nom ?? k.id} · {k.solde.toLocaleString('fr-FR')} NKR{k.gele ? ' · gelé' : ''}</T>
            {k.user_id && <Bouton label={k.gele ? 'Dégeler' : 'Geler'} petit large={false} variante="fantome" onPress={() => adminGelerNkr(k.user_id!, !k.gele).then(charger).catch(err)} />}
          </View>))}
        <T v="carte">Derniers mouvements</T>
        {d.mouvements.map(m => (
          <Carte key={m.id} plat><View style={{ padding: 10, gap: 4 }}>
            <T v="petit">#{m.rang} · {new Date(m.created_at).toLocaleString('fr-FR')} · {m.nature} · {m.montant.toLocaleString('fr-FR')} NKR</T>
            <T v="petit">{m.debit} → {m.credit} · par {m.par.slice(0, 16)}</T>
            {m.nature !== 'annulation' && <Bouton label="Annuler (contre-écriture)" petit large={false} variante="fantome" onPress={() => adminAnnulerNkr(m.id, 'Annulé depuis la console').then(() => { toast('Mouvement annulé.', 'succes'); charger(); }).catch(err)} />}
          </View></Carte>))}
      </>}
    </Sombre>
  );
}
