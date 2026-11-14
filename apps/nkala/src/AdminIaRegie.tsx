/** Console : assistant IA (prompt système, RAG, embeddings, RunPod), régie publicitaire, notifications poussées. */
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  adminCoutsIa, adminEcrireParametre, type CoutsIa,
  adminBibliothequeEtat, adminBibliothequeImporter, adminIaActiverPrompt, adminRadioEtat, adminRadioSynchroniser, adminIaAjouterDocument, adminIaAjouterPrompt, adminIaConfig, adminIaDocuments, adminIaDossier, adminIaEtat, adminIaPrompts, adminIaRechercher, adminIaReindexer, adminIaSupprimerDocument, adminIaSynchroniserDossier, adminIaTester,
  adminPushEnvoyer, adminPushEtat, adminPushHistorique, adminRegieAjouterAnnonceur, adminRegieAjouterCampagne, adminRegieAjouterCreation, adminRegieAnnonceurs, adminRegieCampagnes, adminRegieEtat,
  adminRegieStats, adminRegieStatut, adminRegieSynchroniser, adminRunpodEtat, adminRunpodPod,
} from '@nkala/noyau';
import { Sombre } from './AdminNkala';
import { Bouton, Carte, Champ, Chargement, EtatVide, Pastille, Puce, Rangee, SectionTitre, T, useToast } from './kit';
import { useTheme } from './Prefs';

const Ligne = ({ a, b }: { a: string; b: string }) => <View style={{ flexDirection: 'row', gap: 8 }}><T v="petit" style={{ width: 110 }}>{a}</T><T v="corps" style={{ flex: 1 }}>{b}</T></View>;
const erreur = (toast: ReturnType<typeof useToast>) => (e: unknown) => toast((e as Error).message, 'erreur');

// ------------------------------------------------------------------ coûts et contexte des chats
const fcfa = (n: number, d: string) => `${(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${d}`;
const jet = (n: number) => (n || 0).toLocaleString('fr-FR');

/** Combien coûte l'assistant : coût réel du modèle, frais d'excès comptés aux utilisateurs, chats les plus lourds ; réglages du contexte et des tarifs. */
function CoutsChats() {
  const toast = useToast(), ko = erreur(toast);
  const [d, setD] = useState<CoutsIa | null>(null);
  const [r, setR] = useState({ inclus: '', max: '', politique: 'facturer' as 'bloquer' | 'facturer' | 'suivre' });
  const [t, setT] = useState({ devise: '', entreeParMillion: '', sortieParMillion: '', cacheParMillion: '', excesParMillier: '' });
  const charger = useCallback(() => adminCoutsIa().then(x => {
    setD(x);
    setR({ inclus: String(x.regles.inclus), max: String(x.regles.max), politique: x.regles.politique });
    setT({ devise: x.tarif.devise, entreeParMillion: String(x.tarif.entreeParMillion), sortieParMillion: String(x.tarif.sortieParMillion), cacheParMillion: String(x.tarif.cacheParMillion), excesParMillier: String(x.tarif.excesParMillier) });
  }).catch(ko), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [charger]);
  if (!d) return <Chargement lignes={2} />;
  const n = (v: string) => Number(v.replace(',', '.'));
  const dev = d.tarif.devise;
  const marge = (x: { cout: number; frais: number }) => x.frais - x.cout;
  return (
    <>
      <SectionTitre titre="Coûts de l'assistant" action="Actualiser" onAction={charger} />
      <Carte plat><View style={{ padding: 14, gap: 6 }}>
        {([['Aujourd\'hui', d.jour], ['Ce mois-ci', d.mois], ['Depuis le début', d.total]] as const).map(([l, x]) => (
          <View key={l} style={{ gap: 2 }}>
            <Ligne a={l} b={`coût ${fcfa(x.cout, dev)} · frais d'excès ${fcfa(x.frais, dev)}`} />
            <T v="petit" style={{ paddingLeft: 118 }}>{x.appels} appel(s), {jet(x.entree)} jetons lus, {jet(x.sortie)} écrits, {jet(x.jetons_exces)} en excès</T>
          </View>
        ))}
        <Ligne a="Chats en excès" b={`${d.enExces} (contexte au-delà de ${jet(d.regles.inclus)} jetons)`} />
        <T v="petit">Coût = ce que le modèle nous coûte, d'après les jetons mesurés et les tarifs ci-dessous. Frais = ce qui est compté aux utilisateurs pour le contexte au-delà de l'inclus. Aucun prélèvement n'est fait : ce sont des montants calculés. Les réponses simulées ne comptent pas.</T>
      </View></Carte>

      {d.chats.length > 0 && <>
        <SectionTitre titre="Chats les plus coûteux" />
        {d.chats.slice(0, 12).map(x => (
          <Carte key={x.id} plat><View style={{ padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <T v="carte" numberOfLines={1} style={{ flex: 1 }}>{x.titre}</T>
              {x.contexte.niveau !== 'ok' && <Pastille label={x.contexte.niveau === 'plein' ? 'plein' : x.contexte.niveau === 'exces' ? 'excès' : 'alerte'} />}
            </View>
            <T v="petit">{x.utilisateur} · contexte {jet(x.contexte.jetons)} / {jet(x.contexte.inclus)} · {x.appels} appel(s)</T>
            <T v="petit">coût {fcfa(x.cout, dev)} · frais {fcfa(x.frais, dev)} · solde {fcfa(marge(x), dev)}</T>
          </View></Carte>
        ))}
      </>}

      <SectionTitre titre="Contexte des chats" />
      <T v="petit">Le contexte d'un chat est tout ce que le modèle relit à chaque message (consigne, documents du RAG, échanges). Au-delà de « inclus », le chat est en excès ; au plafond, il est plein et l'utilisateur doit en ouvrir un autre.</T>
      <Champ valeur={r.inclus} onChange={v => setR({ ...r, inclus: v.replace(/\D/g, '') })} placeholder="Jetons inclus par chat (6000)" clavier="number-pad" label="Jetons inclus par chat" />
      <Champ valeur={r.max} onChange={v => setR({ ...r, max: v.replace(/\D/g, '') })} placeholder="Plafond par chat (24000)" clavier="number-pad" label="Plafond par chat" />
      <Rangee>{([['facturer', 'Excès : frais (avec accord)'], ['bloquer', 'Excès : bloquer'], ['suivre', 'Excès : mesurer seulement']] as const).map(([v, l]) => <Puce key={v} label={l} actif={r.politique === v} onPress={() => setR({ ...r, politique: v })} />)}</Rangee>
      <Bouton label="Enregistrer le contexte" petit variante="fantome" onPress={() => adminEcrireParametre('ia_contexte', { inclus: n(r.inclus), max: n(r.max), politique: r.politique }).then(() => { toast('Contexte enregistré.', 'succes'); charger(); }).catch(ko)} />

      <SectionTitre titre="Tarifs" />
      <T v="petit">Prix du modèle par million de jetons (à reprendre de la facture RunPod ou du fournisseur), et frais comptés à l'utilisateur par millier de jetons en excès, à chaque message.</T>
      <Champ valeur={t.devise} onChange={v => setT({ ...t, devise: v.slice(0, 8) })} placeholder="Devise (FCFA)" label="Devise" />
      {([['entreeParMillion', 'Lecture : prix par million de jetons'], ['sortieParMillion', 'Écriture : prix par million de jetons'], ['cacheParMillion', 'Cache : prix par million de jetons'], ['excesParMillier', 'Frais d\'excès par millier de jetons']] as const).map(([k, l]) => (
        <Champ key={k} valeur={t[k]} onChange={v => setT({ ...t, [k]: v.replace(/[^0-9.,]/g, '') })} placeholder={l} clavier="decimal-pad" label={l} />
      ))}
      <Bouton label="Enregistrer les tarifs" petit variante="fantome" onPress={() => adminEcrireParametre('ia_tarifs', { devise: t.devise || 'FCFA', entreeParMillion: n(t.entreeParMillion), sortieParMillion: n(t.sortieParMillion), cacheParMillion: n(t.cacheParMillion), excesParMillier: n(t.excesParMillier) }).then(() => { toast('Tarifs enregistrés.', 'succes'); charger(); }).catch(ko)} />
    </>
  );
}

// ------------------------------------------------------------------ IA
export function IaAdmin() {
  const { c } = useTheme();
  const toast = useToast(), ko = erreur(toast);
  const [etat, setEtat] = useState<any>(null);
  const [prompts, setPrompts] = useState<Awaited<ReturnType<typeof adminIaPrompts>> | null>(null);
  const [biblio, setBiblio] = useState<Awaited<ReturnType<typeof adminBibliothequeEtat>> | null>(null);
  const [radio, setRadio] = useState<Awaited<ReturnType<typeof adminRadioEtat>> | null>(null);
  const [dossier, setDossier] = useState<Awaited<ReturnType<typeof adminIaDossier>> | null>(null);
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof adminIaDocuments>>>([]);
  const [rp, setRp] = useState<Awaited<ReturnType<typeof adminRunpodEtat>> | null>(null);
  const [nom, setNom] = useState(''), [contenu, setContenu] = useState('');
  const [titre, setTitre] = useState(''), [source, setSource] = useState(''), [texte, setTexte] = useState('');
  const [req, setReq] = useState(''), [res, setRes] = useState<{ titre: string; texte: string; score: number }[] | null>(null);
  const [msg, setMsg] = useState(''), [essai, setEssai] = useState<any>(null), [occupe, setOccupe] = useState(false);
  const [cfg, setCfg] = useState({ modele: '', temperature: '', maxTokens: '', topK: '', seuil: '', chunkTaille: '', chunkChevauchement: '' });
  const charger = useCallback(() => {
    adminIaEtat().then(e => { setEtat(e); setCfg({ modele: e.config.modele, temperature: String(e.config.temperature), maxTokens: String(e.config.maxTokens), topK: String(e.config.topK), seuil: String(e.config.seuil), chunkTaille: String(e.config.chunkTaille), chunkChevauchement: String(e.config.chunkChevauchement) }); }).catch(ko);
    adminIaPrompts().then(setPrompts).catch(() => {}); adminIaDocuments().then(setDocs).catch(() => {}); adminIaDossier().then(setDossier).catch(() => {}); adminRadioEtat().then(setRadio).catch(() => {}); adminBibliothequeEtat().then(setBiblio).catch(() => {}); adminRunpodEtat().then(setRp).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [charger]);
  if (!etat) return <Sombre><Chargement /></Sombre>;
  const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v.replace(',', '.'))) ? undefined : Number(v.replace(',', '.')));
  return (
    <Sombre>
      <SectionTitre titre="Fournisseurs" />
      <Carte plat><View style={{ padding: 14, gap: 6 }}>
        <Ligne a="Modèle" b={`${etat.fournisseur}${etat.fournisseur === 'simulation' ? ' (non branché)' : ''}`} />
        <Ligne a="Embeddings" b={`${etat.embedding.nom} · ${etat.embedding.modele}`} />
        <Ligne a="RunPod" b={etat.runpod.simule ? 'simulation (RUNPOD_API_KEY absente)' : 'branché'} />
        <Ligne a="RAG" b={`${etat.documents} document(s), ${etat.chunks} morceaux`} />
        <T v="petit">Les fournisseurs se règlent dans le fichier .env du serveur (IA_FOURNISSEUR, RUNPOD_*, EMBEDDING_*).</T>
      </View></Carte>

      <SectionTitre titre="Réglages" />
      {([['modele', 'Nom du modèle (vide = celui du .env)'], ['temperature', 'Température (0 à 2)'], ['maxTokens', 'Jetons de réponse au plus'], ['topK', 'Morceaux du RAG (1 à 20)'], ['seuil', 'Seuil de similarité (0 à 1)'], ['chunkTaille', 'Taille des morceaux (caractères)'], ['chunkChevauchement', 'Chevauchement']] as const).map(([k, l]) => <Champ key={k} valeur={(cfg as any)[k]} onChange={t => setCfg({ ...cfg, [k]: t })} placeholder={l} />)}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Bouton label="Enregistrer" petit large={false} onPress={() => adminIaConfig({ modele: cfg.modele, temperature: num(cfg.temperature), maxTokens: num(cfg.maxTokens), topK: num(cfg.topK), seuil: num(cfg.seuil), chunkTaille: num(cfg.chunkTaille), chunkChevauchement: num(cfg.chunkChevauchement) }).then(() => { toast('Réglages enregistrés.', 'succes'); charger(); }).catch(ko)} />
        <Bouton label={etat.config.ragActif ? 'RAG activé : couper' : 'RAG coupé : activer'} petit large={false} variante="fantome" onPress={() => adminIaConfig({ ragActif: !etat.config.ragActif }).then(charger).catch(ko)} />
      </View>

      <CoutsChats />

      <SectionTitre titre="Prompt système" />
      <T v="petit">Variable disponible : {'{{lexique}}'} (mots myènè vérifiés). Chaque enregistrement crée une version ; on peut revenir en arrière.</T>
      <Champ valeur={nom} onChange={setNom} placeholder="Nom de la version" auto="sentences" />
      <Champ valeur={contenu} onChange={setContenu} placeholder={prompts?.defaut ?? 'Prompt'} lignes={6} auto="sentences" />
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Bouton label="Enregistrer et activer" petit large={false} desactive={contenu.trim().length < 20} onPress={() => adminIaAjouterPrompt(nom || 'Version', contenu, true).then(() => { setContenu(''); setNom(''); toast('Prompt activé.', 'succes'); charger(); }).catch(ko)} />
        <Bouton label="Revenir au prompt par défaut" petit large={false} variante="fantome" onPress={() => adminIaActiverPrompt('defaut').then(() => { toast('Prompt par défaut.', 'succes'); charger(); }).catch(ko)} />
      </View>
      {(prompts?.versions ?? []).slice(0, 8).map(v => <Carte key={v.id} plat><View style={{ padding: 12, gap: 6 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T v="carte" style={{ flex: 1 }}>#{v.id} · {v.nom}</T>{v.actif ? <Pastille label="Actif" couleur={c.succes} fond={c.carte} /> : <Bouton label="Activer" petit large={false} variante="fantome" onPress={() => adminIaActiverPrompt(v.id).then(charger).catch(ko)} />}</View><T v="petit" numberOfLines={3}>{v.contenu}</T></View></Carte>)}

      <SectionTitre titre="Dossier de référence (indexation automatique)" />
      {!dossier ? <Chargement lignes={1} /> : <Carte plat><View style={{ padding: 12, gap: 6 }}>
        <T v="corps">{dossier.dossier} : {dossier.presents} fichier(s) déposé(s). Chaque nuit, le serveur lit le dossier, vectorise ce qui est nouveau ou modifié, et oublie ce qui a été retiré. Chaque question posée à l'assistant s'appuie sur ces documents.</T>
        <T v="petit">{dossier.enCours ? 'Synchronisation en cours…' : dossier.fin ? `Dernière synchronisation : ${new Date(dossier.fin).toLocaleString('fr-FR')} (${dossier.declencheur ?? '—'}) · ${dossier.ajoutes} ajouté(s), ${dossier.modifies} modifié(s), ${dossier.inchanges} inchangé(s), ${dossier.supprimes} retiré(s), ${dossier.ignores} ignoré(s) · ${dossier.morceaux} morceaux · ${dossier.embedding}` : 'Aucune synchronisation encore.'}</T>
        {dossier.erreurs.slice(0, 5).map((e, i) => <T key={i} v="petit" couleur={c.erreur}>{e.fichier} : {e.message}</T>)}
        <Bouton label={dossier.enCours ? 'En cours…' : 'Synchroniser maintenant'} petit large={false} desactive={dossier.enCours} onPress={() => adminIaSynchroniserDossier().then(() => { toast('Synchronisation lancée.', 'succes'); setTimeout(charger, 4000); setTimeout(charger, 15000); }).catch(ko)} />
      </View></Carte>}

      <SectionTitre titre="Documents du RAG" />
      <Champ valeur={titre} onChange={setTitre} placeholder="Titre du document" auto="sentences" />
      <Champ valeur={source} onChange={setSource} placeholder="Source (document et page)" auto="sentences" />
      <Champ valeur={texte} onChange={setTexte} placeholder="Texte du document (collé ici)" lignes={6} auto="sentences" />
      <Bouton label="Ajouter et indexer" petit large={false} charge={occupe} desactive={!titre.trim() || texte.trim().length < 10} onPress={async () => { setOccupe(true); try { const r = await adminIaAjouterDocument(titre, texte, source); toast(`${r.chunks} morceaux indexés.`, 'succes'); setTitre(''); setTexte(''); setSource(''); charger(); } catch (e) { ko(e); } finally { setOccupe(false); } }} />
      {docs.length === 0 ? <EtatVide icone="livre" titre="Aucun document" texte="Ajoute des textes de référence : l'assistant s'y appuiera." /> : docs.map(d => <Carte key={d.id} plat><View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1 }}><T v="carte">{d.titre}</T><T v="petit">{d.nb_chunks} morceaux · {Math.round(d.taille / 1000)} ko{d.source ? ` · ${d.source}` : ''}</T></View><Bouton label="Réindexer" petit large={false} variante="fantome" onPress={() => adminIaReindexer(d.id).then(r => { toast(`${r.chunks} morceaux.`, 'succes'); charger(); }).catch(ko)} /><Bouton label="Retirer" petit large={false} variante="fantome" onPress={() => adminIaSupprimerDocument(d.id).then(charger).catch(ko)} /></View></Carte>)}

      <SectionTitre titre="Essayer" />
      <Champ valeur={req} onChange={setReq} placeholder="Recherche dans le RAG" icone="chercher" onSubmit={() => adminIaRechercher(req).then(r => setRes(r.resultats)).catch(ko)} />
      {res && (res.length === 0 ? <T v="petit">Aucun morceau trouvé.</T> : res.map((r, i) => <T key={i} v="petit">{(r.score * 100).toFixed(0)} % · {r.titre} : {r.texte.slice(0, 140)}</T>))}
      <Champ valeur={msg} onChange={setMsg} placeholder="Message d'essai pour l'assistant" auto="sentences" />
      <Bouton label="Tester le prompt et le RAG" petit large={false} charge={occupe} desactive={!msg.trim()} onPress={async () => { setOccupe(true); try { setEssai(await adminIaTester(msg)); } catch (e) { ko(e); } finally { setOccupe(false); } }} />
      {essai && <Carte plat><View style={{ padding: 12, gap: 6 }}><T v="corps">{essai.reponse}</T><T v="petit">{essai.modele} · {essai.usage.entree} jetons entrée, {essai.usage.sortie} sortie · {essai.contexte.length} morceau(x) de contexte{essai.simule ? ' · simulation' : ''}</T></View></Carte>}

      <SectionTitre titre="Bibliothèque d'Onenji (livres déposés)" />
      {!biblio ? <Chargement lignes={1} /> : <Carte plat><View style={{ padding: 12, gap: 6 }}>
        <T v="corps">{biblio.dossier} : {biblio.presents} fichier(s) déposé(s), {biblio.importes} livre(s) publié(s). Chaque nuit à 3 h 30, les nouveaux livres sont découpés en chapitres et publiés dans Onenji ; ils alimentent aussi l'assistant.</T>
        <T v="petit">{biblio.enCours ? 'Import en cours…' : biblio.fin ? `Dernier import : ${new Date(biblio.fin).toLocaleString('fr-FR')} · ${biblio.ajoutes} ajouté(s), ${biblio.modifies} modifié(s), ${biblio.inchanges} inchangé(s) · ${biblio.chapitres} chapitres` : 'Aucun import encore.'}</T>
        {biblio.erreurs.slice(0, 5).map((e, i) => <T key={i} v="petit" couleur={c.erreur}>{e.fichier} : {e.message}</T>)}
        <Bouton label={biblio.enCours ? 'En cours…' : 'Importer maintenant'} petit large={false} desactive={biblio.enCours} onPress={() => adminBibliothequeImporter().then(() => { toast('Import lancé.', 'succes'); setTimeout(charger, 5000); setTimeout(charger, 30000); }).catch(ko)} />
      </View></Carte>}

      <SectionTitre titre="Web radio (AzuraCast)" />
      {!radio ? <Chargement lignes={1} /> : <Carte plat><View style={{ padding: 12, gap: 6 }}>
        <T v="corps">{radio.simule ? 'Mode simulation : AZURACAST_URL n\'est pas renseigné.' : `${radio.url} : ${radio.ok ? `${radio.stations} station(s) joignable(s)` : 'injoignable'}`}</T>
        {!!radio.erreur && <T v="petit" couleur={c.erreur}>{radio.erreur}</T>}
        <Bouton label="Importer les stations dans Ontci" petit large={false} desactive={radio.simule} onPress={() => adminRadioSynchroniser().then(r => { toast(`${r.crees} créée(s), ${r.maj} mise(s) à jour.`, 'succes'); charger(); }).catch(ko)} />
      </View></Carte>}

      <SectionTitre titre="RunPod" />
      {!rp ? <Chargement lignes={1} /> : <>
        {rp.simule && <T v="petit">Mode simulation : aucune clé RUNPOD_API_KEY.</T>}{!!rp.erreur && <T v="petit" couleur={c.erreur}>{rp.erreur}</T>}
        <T v="carte">Pods</T>{rp.pods.map(p => <Carte key={p.id} plat><View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ flex: 1 }}><T v="carte">{p.name ?? p.id}</T><T v="petit">{p.desiredStatus ?? p.status} {p.gpu ? `· ${p.gpu}` : ''}</T></View><Bouton label="Démarrer" petit large={false} variante="fantome" onPress={() => adminRunpodPod(p.id, 'start').then(() => { toast('Demande envoyée.', 'succes'); charger(); }).catch(ko)} /><Bouton label="Arrêter" petit large={false} variante="fantome" onPress={() => adminRunpodPod(p.id, 'stop').then(() => { toast('Demande envoyée.', 'succes'); charger(); }).catch(ko)} /></View></Carte>)}
        <T v="carte">Serverless</T>{rp.endpoints.map(e => <T key={e.id} v="petit">{e.name ?? e.id} · {e.workersMin ?? 0} à {e.workersMax ?? '?'} workers</T>)}
        <T v="carte">Volumes réseau</T>{rp.volumes.map(v => <T key={v.id} v="petit">{v.name ?? v.id} · {v.size ?? '?'} Go {v.dataCenterId ? `· ${v.dataCenterId}` : ''}</T>)}
      </>}
    </Sombre>
  );
}

// ------------------------------------------------------------------ régie
export function RegieAdmin() {
  const { c } = useTheme();
  const toast = useToast(), ko = erreur(toast);
  const [etat, setEtat] = useState<any>(null);
  const [an, setAn] = useState<any[]>([]), [ca, setCa] = useState<any[]>([]), [st, setSt] = useState<any[]>([]);
  const [nomAn, setNomAn] = useState('');
  const [f, setF] = useState({ annonceur_id: '', nom: '', debut: '', fin: '', plafond_jour: '' });
  const [cr, setCr] = useState({ campagne_id: '', zone: 'annonce_dans_liste', titre: '', annonceur: '', image: '', lien: '', cta: 'Découvrir', texte_alt: '' });
  const charger = useCallback(() => { adminRegieEtat().then(setEtat).catch(ko); adminRegieAnnonceurs().then(setAn).catch(() => {}); adminRegieCampagnes().then(setCa).catch(() => {}); adminRegieStats(7).then(setSt).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [charger]);
  const ZONES = ['annonce_dans_liste', 'annonce_en_tete', 'bandeau_accueil', 'bandeau_apprendre', 'bandeau_catalogue', 'bandeau_resultats', 'bandeau_lecteur', 'carte_partenaire', 'recompense_coeur'];
  return (
    <Sombre>
      <Carte plat><View style={{ padding: 14, gap: 4 }}><T v="carte">Régie : {etat?.mode ?? '…'}</T>{etat?.revive && <T v="petit">{etat.revive.simule ? 'Revive non branché (REVIVE_URL, REVIVE_USER)' : etat.revive.ok ? 'Revive joignable' : `Revive : ${etat.revive.erreur}`}</T>}<T v="petit">Les publicités s'affichent dans les listes avec la mention « Publicité », jamais pour un enfant, un abonné ni pendant une leçon.</T>
        <Bouton label="Synchroniser avec Revive" petit large={false} variante="fantome" onPress={() => adminRegieSynchroniser().then(r => toast(`${r.annonceurs} annonceur(s), ${r.campagnes} campagne(s), ${r.creations} création(s)${r.simule ? ' (simulation)' : ''}.`, r.erreurs?.length ? 'erreur' : 'succes')).catch(ko)} /></View></Carte>
      <SectionTitre titre="Annonceurs" />
      <Champ valeur={nomAn} onChange={setNomAn} placeholder="Nom de l'annonceur" auto="sentences" />
      <Bouton label="Ajouter" petit large={false} desactive={!nomAn.trim()} onPress={() => adminRegieAjouterAnnonceur(nomAn).then(() => { setNomAn(''); charger(); }).catch(ko)} />
      <Rangee>{an.map(a => <Puce key={a.id} label={a.nom} actif={f.annonceur_id === a.id} onPress={() => setF({ ...f, annonceur_id: a.id })} />)}</Rangee>
      <SectionTitre titre="Campagnes" />
      <Champ valeur={f.nom} onChange={t => setF({ ...f, nom: t })} placeholder="Nom de la campagne" auto="sentences" />
      <Champ valeur={f.debut} onChange={t => setF({ ...f, debut: t })} placeholder="Début (AAAA-MM-JJ)" /><Champ valeur={f.fin} onChange={t => setF({ ...f, fin: t })} placeholder="Fin (AAAA-MM-JJ)" />
      <Champ valeur={f.plafond_jour} onChange={t => setF({ ...f, plafond_jour: t.replace(/\D/g, '') })} placeholder="Plafond d'affichages par jour (0 = aucun)" clavier="number-pad" />
      <Bouton label="Créer la campagne" petit large={false} desactive={!f.annonceur_id || !f.nom.trim()} onPress={() => adminRegieAjouterCampagne({ ...f, plafond_jour: Number(f.plafond_jour) || 0 }).then(() => { setF({ ...f, nom: '' }); charger(); }).catch(ko)} />
      {ca.map(k => <Carte key={k.id} plat><View style={{ padding: 12, gap: 6 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><T v="carte" style={{ flex: 1 }}>{k.nom} · {k.annonceur_nom}</T><Pastille label={k.statut} couleur={k.statut === 'active' ? c.succes : c.discret} fond={c.carte} /></View><T v="petit">{k.affichages} affichages · {k.clics} clics{k.affichages ? ` · ${((k.clics / k.affichages) * 100).toFixed(1)} %` : ''}</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{['active', 'pause', 'terminee'].map(s => <Bouton key={s} label={s} petit large={false} variante={k.statut === s ? 'ambre' : 'fantome'} onPress={() => adminRegieStatut(k.id, s).then(charger).catch(ko)} />)}<Bouton label="Créer une pub ici" petit large={false} variante="fantome" onPress={() => setCr({ ...cr, campagne_id: k.id, annonceur: k.annonceur_nom })} /></View></View></Carte>)}
      <SectionTitre titre="Nouvelle création" />
      <T v="petit">Campagne : {cr.campagne_id || 'choisis « Créer une pub ici »'}</T>
      <Rangee>{ZONES.map(z => <Puce key={z} label={z} actif={cr.zone === z} onPress={() => setCr({ ...cr, zone: z })} />)}</Rangee>
      {([['titre', 'Texte de la publication'], ['image', 'Adresse de l\'image (https)'], ['lien', 'Lien au clic (https)'], ['cta', 'Texte du bouton'], ['texte_alt', 'Texte alternatif (obligatoire)']] as const).map(([k, l]) => <Champ key={k} valeur={(cr as any)[k]} onChange={t => setCr({ ...cr, [k]: t })} placeholder={l} auto="sentences" />)}
      <Bouton label="Publier la création" petit large={false} desactive={!cr.campagne_id || !cr.texte_alt.trim()} onPress={() => adminRegieAjouterCreation({ ...cr, format: cr.zone === 'annonce_dans_liste' ? 'natif' : 'bandeau' }).then(() => { toast('Création enregistrée.', 'succes'); setCr({ ...cr, titre: '', image: '', lien: '', texte_alt: '' }); }).catch(ko)} />
      <SectionTitre titre="Statistiques (7 jours)" />
      {st.length === 0 ? <T v="petit">Aucun affichage.</T> : st.slice(0, 15).map((s, i) => <T key={i} v="petit">{s.zone} · {s.creation_id ?? '—'} : {s.affichages} aff. · {s.clics} clics · {s.recompenses} récomp. · {s.personnes} pers.</T>)}
    </Sombre>
  );
}

// ------------------------------------------------------------------ notifications
export function PushAdmin() {
  const toast = useToast(), ko = erreur(toast);
  const [etat, setEtat] = useState<{ fournisseur: string; jetons: number } | null>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [titre, setTitre] = useState(''), [corps, setCorps] = useState(''), [cible, setCible] = useState<'tous' | 'tribu' | 'role'>('tous'), [valeur, setValeur] = useState('');
  const charger = useCallback(() => { adminPushEtat().then(setEtat).catch(ko); adminPushHistorique().then(setHist).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [charger]);
  return (
    <Sombre>
      <T v="petit">Fournisseur : {etat?.fournisseur ?? '…'} · {etat?.jetons ?? 0} appareil(s) enregistré(s). Un jeton n'existe qu'après autorisation sur l'appareil, avec un compte et un projet EAS.</T>
      <Champ valeur={titre} onChange={setTitre} placeholder="Titre (80 caractères)" auto="sentences" maxLength={80} />
      <Champ valeur={corps} onChange={setCorps} placeholder="Message (300 caractères)" lignes={3} auto="sentences" maxLength={300} />
      <Rangee>{([['tous', 'Tout le monde'], ['tribu', 'Une ethnie'], ['role', 'Un rôle']] as const).map(([k, l]) => <Puce key={k} label={l} actif={cible === k} onPress={() => setCible(k)} />)}</Rangee>
      {cible !== 'tous' && <Champ valeur={valeur} onChange={setValeur} placeholder={cible === 'tribu' ? 'Ethnie (ex. Ôrungu)' : 'Rôle : user, validator, admin'} auto="sentences" />}
      <Bouton label="Envoyer" icone="envoyer" desactive={!titre.trim() || !corps.trim()} onPress={() => adminPushEnvoyer(titre, corps, cible === 'tous' ? { tous: true } : cible === 'tribu' ? { tribu: valeur } : { role: valeur }).then(r => { toast(`${r.envoyes}/${r.destinataires} envoyé(s)${r.simule ? ' (simulation)' : ''}.`, 'succes'); setTitre(''); setCorps(''); charger(); }).catch(ko)} />
      <SectionTitre titre="Historique" />
      {hist.map(h => <T key={h.id} v="petit">{new Date(h.at).toLocaleString('fr-FR')} · {h.titre} · {h.ok}/{h.nb}{h.simule ? ' (simulé)' : ''}</T>)}
    </Sombre>
  );
}
