/** Appels de l'application à l'API Nkala : connexion par SMS, progression, parties, assistant, publicité, droits, contenus d'utilisateurs, cours à distance. */
import { api } from './api';

// ------------------------------------------------------------------ connexion par SMS (Twilio côté serveur)
let sessionSms: string | null = null;
export const definirSessionSms = (j: string | null) => { sessionSms = j; };
export const jetonSessionSms = () => sessionSms;
export const envoyerCodeSms = (telephone: string) => api<{ envoye: boolean; telephone: string }>('POST', '/auth/sms/envoyer', { telephone });
export const verifierCodeSms = (telephone: string, code: string) => api<{ jeton: string; uid: string; telephone: string }>('POST', '/auth/sms/verifier', { telephone, code });

// ------------------------------------------------------------------ progression et jeux
export interface ProgressionServeur {
  leconsTerminees: Record<string, { justesse: number; le: string }>; unitesValidees: string[]; xp: number; serie: number; recordSerie: number;
  derniereActivite: string | null; jours: string[]; parties: number; victoires: number; points: number; succes: string[]; avatar?: string; defisFaits: Record<string, string>; amis: string[]; contributions?: number;
  prefs?: Record<string, unknown>;
}
export interface ResultatXp { xpGagne: number; xp: number; nouveauRang: { id: string; nom: string; minXp: number; description: string } | null }
export const chargerProgression = () => api<ProgressionServeur>('GET', '/v1/progression');
export const enregistrerPrefs = (b: { prefs?: Record<string, unknown>; avatar?: string; amis?: string[] }) => api<ProgressionServeur>('PUT', '/v1/progression', b);
export const envoyerLecon = (leconId: string, bonnes: number, erreurs: number) => api<ResultatXp & { serie: number; recordSerie: number }>('POST', '/v1/progression/lecon', { leconId, bonnes, erreurs });
export const envoyerUnite = (uniteId: string, bonnes: number, sur: number) => api<ResultatXp & { valide: boolean }>('POST', '/v1/progression/unite', { uniteId, bonnes, sur });
export const envoyerPartie = (p: { jeuId: string; bonnes: number; erreurs: number; secondesRestantes?: number; serie?: number; defiId?: string }) =>
  api<ResultatXp & { score: number; succesDebloques: { id: string; titre: string; xp: number }[]; serie: number; defiRempli: boolean }>('POST', '/v1/jeux/partie', p);
export interface LigneClassementJeux { rang: number; id: string; nom: string; tribu: string | null; points: number; parties: number; moi: boolean }
export const chargerClassementJeux = (portee: string, groupe: string, jeu?: string) =>
  api<{ classement: LigneClassementJeux[]; maPlace: number | null }>('GET', `/v1/jeux/classement?portee=${portee}&groupe=${groupe}${jeu ? `&jeu=${encodeURIComponent(jeu)}` : ''}`);
export const chargerDefiDuJour = () => api<{ jour: string; defi: { id: string; titre: string; jeu_id?: string; objectif?: number; xp?: number } | null }>('GET', '/pub/defi-du-jour');
export const ajouterAmi = (telephone: string) => api<{ ajoute: { id: string; nom: string } }>('POST', '/v1/progression/amis', { telephone });

// ------------------------------------------------------------------ assistant IA (Ozangué)
export interface ReponseIa { reponse: string; conversationId: string; usage: { entree: number; sortie: number }; simule: boolean; quota: { restantJour: number; restantMois: number; alerte: boolean } }
export const demanderOzangue = (message: string, conversationId?: string, historique?: { role: 'user' | 'assistant'; content: string }[]) =>
  api<ReponseIa>('POST', '/v1/ia/message', { message, conversationId, historique });
export const consommationIa = () => api<{ consommation: { jour: number; mois: number; conversation: number }; quota: { parJour: number; parMois: number; parConversation: number } }>('GET', '/v1/ia/usage');

// ------------------------------------------------------------------ publicité, droits, licences
export interface CreationPub { id: string; zone: string; image: string | null; lien: string | null; titre: string | null; texte_alt: string; annonceur: string | null }
export const demanderPub = (zone: string, activite = false) => api<{ pub: CreationPub | null }>('GET', `/v1/pub?zone=${zone}${activite ? '&activite=1' : ''}`);
export const signalerPub = (type: 'affichage' | 'clic', creationId: string, zone: string) => api('POST', '/v1/pub/evenement', { type, creationId, zone });
export const reclamerRecompensePub = (creationId: string, tempsVuMs: number) => api<{ accorde: boolean; coeurs: number; restantAujourdhui: number }>('POST', '/v1/pub/recompense', { creationId, tempsVuMs });
export interface DroitsServeur { abonne: boolean; abonneJusque: number | null; achats: string[]; historique: { id: number; produit_id: string; type: string; fin: string | null; statut: string }[] }
export const chargerDroits = () => api<DroitsServeur>('GET', '/v1/droits');
export const verifierAcces = (collection: string, id: string) => api<{ autorise: boolean; avecPub: boolean; motif: string | null; niveau: string }>('POST', '/v1/acces/verifier', { collection, id });
export const demanderLicence = (collection: string, id: string) => api<{ jeton: string; filigrane: string; expireDans: number; avecPub: boolean; urlHls: string | null }>('POST', '/v1/lecture/licence', { collection, id });

// ------------------------------------------------------------------ contenus d'utilisateurs, annonces, sondages
export type CollectionUtilisateur = 'annonces' | 'signalements' | 'idees' | 'taxi_demandes' | 'avis';
export const publierContenu = (collection: CollectionUtilisateur, data: Record<string, unknown>) => api<{ id: string; statut: string }>('POST', `/v1/utilisateur/${collection}`, data);
export const mesContenus = (collection: CollectionUtilisateur) => api<Record<string, any>[]>('GET', `/v1/utilisateur/${collection}`);
export const supprimerContenu = (collection: CollectionUtilisateur, id: string) => api('DELETE', `/v1/utilisateur/${collection}/${id}`);
export const chargerAnnonces = (categorie?: string, ville?: string) => api<Record<string, any>[]>('GET', `/pub/annonces?${new URLSearchParams({ ...(categorie ? { categorie } : {}), ...(ville ? { ville } : {}) })}`);
export const voterSondage = (id: string, choix: string) => api<{ resultats: Record<string, number>; total: number }>('POST', `/v1/sondages/${id}/voter`, { choix });
export const resultatsSondage = (id: string) => api<{ resultats: Record<string, number>; total: number }>('GET', `/pub/sondages/${id}/resultats`);

// ------------------------------------------------------------------ cours à distance (signalisation ; les flux audio/vidéo passent par WebRTC de pair à pair)
export interface MembreAppel { uid: string; nom: string; hote: boolean }
export const creerSalle = (titre: string) => api<{ id: string; titre: string; maxGroupe: number }>('POST', '/v1/appels', { titre });
export const rejoindreSalle = (id: string) => api<{ id: string; titre: string; membres: MembreAppel[] }>('POST', `/v1/appels/${id}/rejoindre`);
export const lireSalle = (id: string, depuis: number) => api<{ membres: MembreAppel[]; signaux: { n: number; de: string; data: unknown }[]; dernier: number }>('GET', `/v1/appels/${id}?depuis=${depuis}`);
export const envoyerSignal = (id: string, a: string, data: unknown) => api('POST', `/v1/appels/${id}/signal`, { a, data });
export const quitterSalle = (id: string) => api('POST', `/v1/appels/${id}/quitter`);
export const serveursIce = () => api<{ iceServers: unknown[]; maxGroupe: number }>('GET', '/v1/appels/ice');

// ------------------------------------------------------------------ administration (console)
export interface InfoCollection { collection: string; titre: string; module: string; description: string; total: number; publies: number; maj: string | null }
export interface RapportServeur { collection: string; total: number; valides: number; erreurs: { ligne: number; champ?: string; message: string }[]; avertissements: { ligne: number; champ?: string; message: string }[]; mode: string; ecrit: number; supprimes: number; bloque: boolean; ecritureFaite: boolean }
export const adminCollections = () => api<InfoCollection[]>('GET', '/v1/admin/contenus');
export const adminLignes = (collection: string, page = 1, q = '') => api<{ items: Record<string, any>[]; total: number; page: number; pages: number }>('GET', `/v1/admin/contenus/${collection}?page=${page}&limit=50${q ? `&q=${encodeURIComponent(q)}` : ''}`);
export const adminImporter = (collection: string, texte: string, mode: 'verifier' | 'ajouter' | 'remplacer', partiel = false) => api<RapportServeur>('POST', `/v1/admin/contenus/${collection}/import`, { texte, mode, partiel });
export const adminExporter = (collection: string, format: 'csv' | 'json') => api<any>('GET', `/v1/admin/contenus/${collection}/export?format=${format}`);
export const adminModifierLigne = (collection: string, id: string, data: Record<string, unknown>) => api('PUT', `/v1/admin/contenus/${collection}/${id}`, data);
export const adminSupprimerLigne = (collection: string, id: string) => api('DELETE', `/v1/admin/contenus/${collection}/${id}`);
export const adminImports = () => api<{ id: number; collection: string; par: string; format: string; mode: string; total: number; valides: number; erreurs: number; at: string }[]>('GET', '/v1/admin/imports');
export const adminParametres = () => api<{ parametres: Record<string, any>; effectif: { modules: Record<string, boolean>; fonctions: Record<string, boolean> } }>('GET', '/v1/admin/parametres');
export const adminEcrireParametre = (cle: string, valeur: unknown) => api('PUT', `/v1/admin/parametres/${cle}`, { valeur });
export const adminSupervision = () => api<Record<string, any>>('GET', '/v1/admin/supervision');
export const adminSeries = (jours = 14) => api<Record<string, any>>('GET', `/v1/admin/supervision/series?jours=${jours}`);
export const adminModeration = (collection?: string) => api<Record<string, any>[]>('GET', `/v1/admin/moderation${collection ? `?collection=${collection}` : ''}`);
export const adminDecider = (collection: string, id: string, decision: 'publier' | 'refuser', motif?: string) => api('POST', `/v1/admin/moderation/${collection}/${id}`, { decision, motif });
export const adminJournal = () => api<{ id: number; par: string; action: string; cible: string | null; at: string }[]>('GET', '/v1/admin/journal');
export const adminDroits = (userId?: string) => api<Record<string, any>[]>('GET', `/v1/admin/droits${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);
export const adminAccorderDroit = (b: { userId: string; type: string; jours?: number; contenuId?: string; produitId?: string }) => api('POST', '/v1/admin/droits', b);
export const adminAnnulerDroit = (id: number) => api('DELETE', `/v1/admin/droits/${id}`);

// ------------------------------------------------------------------ duels asynchrones
export interface Duel { id: string; seed: string; createur: string; scores: Record<string, number>; noms: Record<string, string>; termine: boolean }
export const creerDuel = () => api<{ id: string; seed: string }>('POST', '/v1/duels');
export const lireDuel = (id: string) => api<Duel>('GET', `/v1/duels/${encodeURIComponent(id)}`);
export const jouerDuel = (id: string, score: number) => api<Duel>('POST', `/v1/duels/${encodeURIComponent(id)}/jouer`, { score });

// ------------------------------------------------------------------ publicités dans les listes, boutique, notifications
export const demanderFilPub = (zone: string, n = 3) => api<{ pubs: import('./fil').PubFil[] }>('GET', `/v1/pub/fil?zone=${zone}&n=${n}`);
export interface Produit { id: string; titre: string; type: 'abonnement' | 'achat' | 'consommable'; prix_fcfa?: number; periode?: string; donne_acces?: string[] }
export const chargerProduits = () => api<{ mode: 'simulation' | 'magasins'; produits: Produit[] }>('GET', '/pub/produits');
export const envoyerRecu = (magasin: string, produitId: string, recu: string) => api<{ ok: boolean; produitId: string; type: string }>('POST', '/v1/achats/recu', { magasin, produitId, recu });
export const enregistrerJetonPush = (jeton: string, plateforme: string) => api('POST', '/v1/push/jeton', { jeton, plateforme });
// administration : IA, RAG, RunPod, régie, notifications
export const adminIaEtat = () => api<any>('GET', '/v1/admin/ia/etat');
export const adminIaConfig = (c: Record<string, unknown>) => api<any>('PUT', '/v1/admin/ia/config', c);
export const adminIaPrompts = () => api<{ defaut: string; versions: { id: number; nom: string; contenu: string; actif: boolean; created_at: string }[] }>('GET', '/v1/admin/ia/prompts');
export const adminIaAjouterPrompt = (nom: string, contenu: string, activer: boolean) => api('POST', '/v1/admin/ia/prompts', { nom, contenu, activer });
export const adminIaActiverPrompt = (id: number | 'defaut') => (id === 'defaut' ? api('POST', '/v1/admin/ia/prompts/defaut') : api('POST', `/v1/admin/ia/prompts/${id}/activer`));
export const adminIaDocuments = () => api<{ id: string; titre: string; source: string | null; actif: boolean; nb_chunks: number; taille: number }[]>('GET', '/v1/admin/ia/documents');
export const adminIaAjouterDocument = (titre: string, texte: string, source?: string) => api<{ id: string; chunks: number }>('POST', '/v1/admin/ia/documents', { titre, texte, source });
export const adminIaSupprimerDocument = (id: string) => api('DELETE', `/v1/admin/ia/documents/${id}`);
export const adminIaReindexer = (id: string) => api<{ chunks: number }>('POST', `/v1/admin/ia/documents/${id}/reindexer`);
export const adminIaRechercher = (requete: string) => api<{ resultats: { titre: string; texte: string; score: number }[] }>('POST', '/v1/admin/ia/rag/rechercher', { requete });
export const adminIaTester = (message: string, enfant = false) => api<{ reponse: string; usage: UsageJetonsApi; modele: string; simule: boolean; contexte: { titre: string; score: number }[]; systeme: string }>('POST', '/v1/admin/ia/tester', { message, enfant });
export interface UsageJetonsApi { entree: number; sortie: number }
export const adminRunpodEtat = () => api<{ simule: boolean; pods: any[]; endpoints: any[]; volumes: any[]; erreur?: string }>('GET', '/v1/admin/runpod/etat');
export const adminRunpodPod = (id: string, action: 'start' | 'stop' | 'restart') => api('POST', `/v1/admin/runpod/pods/${encodeURIComponent(id)}/${action}`);
export const adminRegieEtat = () => api<{ mode: string; revive: { simule: boolean; ok: boolean; erreur?: string } }>('GET', '/v1/admin/regie/etat');
export const adminRegieAnnonceurs = () => api<any[]>('GET', '/v1/admin/regie/annonceurs');
export const adminRegieAjouterAnnonceur = (nom: string, contact?: string) => api('POST', '/v1/admin/regie/annonceurs', { nom, contact });
export const adminRegieCampagnes = () => api<any[]>('GET', '/v1/admin/regie/campagnes');
export const adminRegieAjouterCampagne = (c: Record<string, unknown>) => api('POST', '/v1/admin/regie/campagnes', c);
export const adminRegieStatut = (id: string, statut: string) => api('POST', `/v1/admin/regie/campagnes/${id}/statut`, { statut });
export const adminRegieAjouterCreation = (c: Record<string, unknown>) => api('POST', '/v1/admin/regie/creations', c);
export const adminRegieStats = (jours = 7) => api<any[]>('GET', `/v1/admin/regie/stats?jours=${jours}`);
export const adminRegieSynchroniser = () => api<any>('POST', '/v1/admin/regie/revive/synchroniser');
export const adminPushEnvoyer = (titre: string, corps: string, cible: Record<string, unknown>) => api<{ destinataires: number; envoyes: number; simule: boolean }>('POST', '/v1/admin/push/envoyer', { titre, corps, cible });
export const adminPushHistorique = () => api<any[]>('GET', '/v1/admin/push/historique');
export const adminPushEtat = () => api<{ fournisseur: string; jetons: number }>('GET', '/v1/admin/push/etat');
