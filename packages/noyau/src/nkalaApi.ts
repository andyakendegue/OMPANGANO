/** Appels de l'application à l'API Nkala : connexion par SMS, progression, parties, assistant, publicité, droits, contenus d'utilisateurs, cours à distance. */
import { api } from './api';
import type { EtatContexte, ReglesContexte, TarifIa } from './jetons';
import type { ActionIa } from './actionsIa';

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
  lectures?: Record<string, { jour: string; bonnes: number; sur: number }>;
}
export interface ResultatXp { xpGagne: number; xp: number; nouveauRang: { id: string; nom: string; minXp: number; description: string } | null }
export const chargerProgression = () => api<ProgressionServeur>('GET', '/v1/progression');
export const enregistrerPrefs = (b: { prefs?: Record<string, unknown>; avatar?: string; amis?: string[] }) => api<ProgressionServeur>('PUT', '/v1/progression', b);
export const envoyerLecon = (leconId: string, bonnes: number, erreurs: number) => api<ResultatXp & { serie: number; recordSerie: number }>('POST', '/v1/progression/lecon', { leconId, bonnes, erreurs });
export const envoyerUnite = (uniteId: string, bonnes: number, sur: number) => api<ResultatXp & { valide: boolean }>('POST', '/v1/progression/unite', { uniteId, bonnes, sur });
export const envoyerPartie = (p: { jeuId: string; bonnes: number; erreurs: number; secondesRestantes?: number; serie?: number; defiId?: string; manche?: string }) =>
  api<ResultatXp & { score: number; succesDebloques: { id: string; titre: string; xp: number }[]; serie: number; defiRempli: boolean }>('POST', '/v1/jeux/partie', p);
export const envoyerChapitre = (livreId: string, chapitreId: string, bonnes: number, sur: number) =>
  api<ResultatXp & { premiereFois: boolean; succesDebloques: { id: string; titre: string; xp: number }[]; serie: number; chapitresLus: number }>('POST', '/v1/bibliotheque/chapitre', { livreId, chapitreId, bonnes, sur });
export interface LigneClassementJeux { rang: number; id: string; nom: string; tribu: string | null; points: number; parties: number; moi: boolean }
export const chargerClassementJeux = (portee: string, groupe: string, jeu?: string) =>
  api<{ classement: LigneClassementJeux[]; maPlace: number | null }>('GET', `/v1/jeux/classement?portee=${portee}&groupe=${groupe}${jeu ? `&jeu=${encodeURIComponent(jeu)}` : ''}`);
export const chargerDefiDuJour = () => api<{ jour: string; defi: { id: string; titre: string; jeu_id?: string; objectif?: number; xp?: number } | null }>('GET', '/pub/defi-du-jour');
export const ajouterAmi = (telephone: string) => api<{ ajoute: { id: string; nom: string } }>('POST', '/v1/progression/amis', { telephone });

// ------------------------------------------------------------------ assistant IA (Kak'Igonjo)
export interface ReponseIa { reponse: string; conversationId: string; usage: { entree: number; sortie: number }; simule: boolean; quota: { restantJour: number; restantMois: number; alerte: boolean } }
export const demanderKakIgonjo = (message: string, conversationId?: string, historique?: { role: 'user' | 'assistant'; content: string }[]) =>
  api<ReponseIa>('POST', '/v1/ia/message', { message, conversationId, historique });
export const consommationIa = () => api<{ consommation: { jour: number; mois: number; conversation: number }; quota: { parJour: number; parMois: number; parConversation: number } }>('GET', '/v1/ia/usage');

// ------------------------------------------------------------------ chats de l'assistant (contexte, excès, coût)
export interface FicheChat {
  id: string; titre: string; creeLe: string; majLe: string; messages: number; contexte: EtatContexte; jetons: { entree: number; sortie: number }; appels: number;
  /** Frais supplémentaires comptés (contexte au-delà de l'inclus). */
  frais: number; jetonsExces: number; devise: string; politique: ReglesContexte['politique'];
  /** Coût réel du modèle : présent pour les administrateurs seulement. */
  cout?: number;
}
export interface MessageChat { role: 'user' | 'assistant'; content: string; at?: string }
export interface ReponseChat {
  reponse: string; actions?: ActionIa[]; simule: boolean; sources: { titre: string; source: string | null }[]; chat: FicheChat;
  appel: { entree: number; sortie: number; jetonsExces: number; frais: number; devise: string; cout?: number; modele?: string };
  quota: { restantJour: number; restantMois: number; alerte: boolean };
}
/** Refus d'un envoi : `frais` = accord à donner, `exces` = bloqué, `plein` = plafond atteint. */
export interface RefusChat { code: 'frais' | 'exces' | 'plein'; contexte: EtatContexte; fraisEstimes: number; devise: string }
export const listerChats = () => api<{ chats: FicheChat[]; regles: ReglesContexte; devise: string; excesParMillier: number; total: { frais: number; cout?: number } }>('GET', '/v1/ia/chats');
export const creerChat = (titre?: string) => api<{ chat: FicheChat }>('POST', '/v1/ia/chats', { titre });
export const lireChat = (id: string) => api<{ chat: FicheChat; messages: MessageChat[] }>('GET', `/v1/ia/chats/${id}`);
export const renommerChat = (id: string, titre: string) => api('PATCH', `/v1/ia/chats/${id}`, { titre });
export const supprimerChat = (id: string) => api('DELETE', `/v1/ia/chats/${id}`);
/** `etat` : ce que seul le téléphone connaît (réglages, Mes mots, écran ouvert), pour la fiche de Kak'Igonjo. */
export interface EtatLocalChat { prefs?: Record<string, unknown>; mesMots?: { total: number; derniers: string[] }; ecran?: string }
export const envoyerAuChat = (id: string, message: string, accepteFrais = false, etat?: EtatLocalChat) => api<ReponseChat>('POST', `/v1/ia/chats/${id}/messages`, { message, accepteFrais, etat });
export interface CoutsIa {
  regles: ReglesContexte; tarif: TarifIa; enExces: number;
  jour: TotauxIa; mois: TotauxIa; total: TotauxIa;
  chats: { id: string; titre: string; utilisateur: string; majLe: string; contexte: EtatContexte; appels: number; cout: number; frais: number; jetonsExces: number }[];
  utilisateurs: (TotauxIa & { user_id: string })[];
}
export interface TotauxIa { entree: number; sortie: number; cout: number; jetons_exces: number; frais: number; appels: number }
export const adminCoutsIa = () => api<CoutsIa>('GET', '/v1/admin/ia/couts');

// ------------------------------------------------------------------ publicité, droits, licences
export interface CreationPub { id: string; zone: string; image: string | null; lien: string | null; titre: string | null; texte_alt: string; annonceur: string | null }
export const demanderPub = (zone: string, activite = false) => api<{ pub: CreationPub | null }>('GET', `/v1/pub?zone=${zone}${activite ? '&activite=1' : ''}`);
export const signalerPub = (type: 'affichage' | 'clic', creationId: string, zone: string) => api('POST', '/v1/pub/evenement', { type, creationId, zone });
export const reclamerRecompensePub = (creationId: string, tempsVuMs: number) => api<{ accorde: boolean; coeurs: number; restantAujourdhui: number }>('POST', '/v1/pub/recompense', { creationId, tempsVuMs });
export interface DroitsServeur { abonne: boolean; abonneJusque: number | null; achats: string[]; historique: { id: number; produit_id: string; type: string; fin: string | null; statut: string }[] }
export const chargerDroits = () => api<DroitsServeur>('GET', '/v1/droits');
export const verifierAcces = (collection: string, id: string) => api<{ autorise: boolean; avecPub: boolean; motif: string | null; niveau: string }>('POST', '/v1/acces/verifier', { collection, id });
/** Licence de lecture. `limiteS` : seconde où s'arrête la partie gratuite d'une vidéo (null = toute la vidéo). */
export const demanderLicence = (collection: string, id: string) => api<{ jeton: string; filigrane: string; expireDans: number; avecPub: boolean; limiteS?: number | null; videoUrl?: string | null; urlHls: string | null }>('POST', '/v1/lecture/licence', { collection, id });

// ------------------------------------------------------------------ certificats d'Onenji (numérotés, vérifiables)
export interface CertificatOnenji { numero: string; nom: string; titre: string; parcoursId: string; le: string }
export const obtenirCertificat = (parcoursId: string) => api<CertificatOnenji>('POST', '/v1/onenji/certificats', { parcoursId });
export const mesCertificats = () => api<CertificatOnenji[]>('GET', '/v1/onenji/certificats');
export const verifierCertificat = (numero: string) => api<{ valide: boolean; numero: string; nom: string; titre: string; le: string }>('GET', `/pub/certificats/${encodeURIComponent(numero)}`);

// ------------------------------------------------------------------ contenus d'utilisateurs, annonces, sondages
export type CollectionUtilisateur = 'annonces' | 'signalements' | 'idees' | 'taxi_demandes' | 'avis';
export const publierContenu = (collection: CollectionUtilisateur, data: Record<string, unknown>) => api<{ id: string; statut: string }>('POST', `/v1/utilisateur/${collection}`, data);
export const mesContenus = (collection: CollectionUtilisateur) => api<Record<string, any>[]>('GET', `/v1/utilisateur/${collection}`);
export const supprimerContenu = (collection: CollectionUtilisateur, id: string) => api('DELETE', `/v1/utilisateur/${collection}/${id}`);
export const chargerAnnonces = (categorie?: string, ville?: string) => api<Record<string, any>[]>('GET', `/pub/annonces?${new URLSearchParams({ ...(categorie ? { categorie } : {}), ...(ville ? { ville } : {}) })}`);

// ------------------------------------------------------------------ annonces de logement (fiche structurée, médias, distance)
export interface FiltresLogement {
  ville?: string; quartier?: string; transaction?: string; type?: string; prix_min?: number; prix_max?: number; chambres_min?: number; meuble?: string;
  avec360?: boolean; avecVideo?: boolean; certifiee?: boolean; equip?: string[]; lat?: number; lng?: number; rayon_km?: number;
  tri?: 'recent' | 'prix' | '-prix' | 'distance' | 'completude'; page?: number; limite?: number;
}
/** Base commune (titre, description, prix, ville, téléphone) + fiche logement validée par le serveur. */
export interface BaseAnnonceLogement { titre: string; description?: string; prix: number; ville?: string; telephone: string }
export const publierLogement = (base: BaseAnnonceLogement, logement: unknown) => api<Record<string, any>>('POST', '/v1/utilisateur/annonces', { ...base, categorie_id: 'logement', logement });
export const modifierLogement = (id: string, base: Partial<BaseAnnonceLogement>, logement?: unknown) => api<Record<string, any>>('PUT', `/v1/utilisateur/annonces/${encodeURIComponent(id)}`, { ...base, ...(logement ? { logement } : {}) });
export function chargerLogements(f: FiltresLogement = {}) {
  const q = new URLSearchParams({ categorie: 'logement' });
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    q.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v));
  }
  return api<Record<string, any>[]>('GET', `/pub/annonces?${q}`);
}
export const chargerAnnonce = (id: string) => api<Record<string, any>>('GET', `/pub/annonces/${encodeURIComponent(id)}`);
/** URL d'envoi d'un média d'annonce (annonces/{uid}/{brouillonId}/{fichier}). */
export const demanderUrlEnvoi = (path: string, contentType: string, size: number) =>
  api<{ uploadUrl: string; headers: Record<string, string> }>('POST', '/v1/media/upload-url', { path, contentType, size });
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
/** Planning des cours à distance : un cours prévu a un code, une heure, une durée et au plus 4 inscrits (hôte compris). */
export interface CoursPrevu { prixFcfa: number; code: string; titre: string; debut: string; dureeMin: number; hote: boolean; hoteNom: string; inscrits: number; inscrit: boolean; places: number; ouvert: boolean }
export const planifierCours = (titre: string, debut: string, dureeMin: number, professeurId?: string) => api<CoursPrevu>('POST', '/v1/appels/planning', { titre, debut, dureeMin, professeurId });
/** Ce que le compte peut faire dans les cours à distance, et le tarif générique fixé par les administrateurs. */
export const moiCoursDistance = () => api<{ peutAnimer: boolean; admin: boolean; professeur: boolean; tarif: import('./coursDistance').TarifCoursDistance; inclus: boolean }>('GET', '/v1/appels/moi');
export const adminProfesseurs = () => api<{ uid: string; nom: string; email: string | null; depuis: string }[]>('GET', '/v1/admin/professeurs');
export const adminNommerProfesseur = (userId: string) => api('POST', '/v1/admin/professeurs', { userId });
export const adminRetirerProfesseur = (uid: string) => api('DELETE', `/v1/admin/professeurs/${encodeURIComponent(uid)}`);
export const mesCoursPrevus = () => api<CoursPrevu[]>('GET', '/v1/appels/planning');
export const lireCoursPrevu = (code: string) => api<CoursPrevu>('GET', `/v1/appels/planning/${encodeURIComponent(code)}`);
export const inscrireCoursPrevu = (code: string) => api<CoursPrevu>('POST', `/v1/appels/planning/${encodeURIComponent(code)}/inscrire`);
export const quitterCoursPrevu = (code: string) => api('POST', `/v1/appels/planning/${encodeURIComponent(code)}/desinscrire`);
export const entrerCoursPrevu = (code: string) => api<{ id: string; titre: string; membres: MembreAppel[] }>('POST', `/v1/appels/planning/${encodeURIComponent(code)}/entrer`);

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
export interface Produit { id: string; titre: string; type: 'abonnement' | 'achat' | 'consommable' | 'nkorouna'; prix_fcfa?: number; periode?: string; donne_acces?: string[]; nkorouna?: number; prix_nkr?: number }
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
export interface EtatDossierRag { dossier: string; enCours: boolean; debut?: string; fin?: string; declencheur?: string; presents: number; fichiers: number; ajoutes: number; modifies: number; inchanges: number; supprimes: number; ignores: number; morceaux: number; erreurs: { fichier: string; message: string }[]; embedding: string }
export const adminIaDossier = () => api<EtatDossierRag>('GET', '/v1/admin/ia/dossier');
export const adminIaSynchroniserDossier = () => api<{ ok: boolean }>('POST', '/v1/admin/ia/dossier/synchroniser', {});
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
export const chargerProfilAcces = () => api<{ rang: number; plans: string[]; tout: boolean; abonneJusque: number | null }>('GET', '/v1/droits/acces');

// ------------------------------------------------------------------ Nkorouna (NKR) : jeton acheté en FCFA, dépensé dans l'app
export interface MouvementNkr { id: string; nature: 'achat' | 'depense' | 'transfert' | 'bonus' | 'correction' | 'annulation'; montant: number; meta: Record<string, unknown>; le: string; hash: string }
export interface PortefeuilleNkr { nom: string; symbole: string; solde: number; gele: boolean; transferts: boolean; mouvements: MouvementNkr[] }
export interface EtatPublicNkr { nom: string; symbole: string; enCirculation: number; emisContreFcfa: number; offerts: number; depenses: number; transferts: boolean; chaine: { mouvements: number; derniereEmpreinte: string }; ancrages: { id: number; de: number; jusqua: number; racine: string; reseau: string; transaction: string | null; le: string }[] }
export interface VerificationNkr { ok: boolean; mouvements: number; erreurs: string[] }
/** Clé d'idempotence : un double toucher ou une reprise réseau avec la même clé ne débite qu'une fois. */
export const cleNkr = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
export const chargerPortefeuilleNkr = () => api<PortefeuilleNkr>('GET', '/v1/nkorouna');
export const chargerEtatNkr = () => api<EtatPublicNkr>('GET', '/pub/nkorouna');
export const depenserNkr = (produitId: string, cle: string) => api<{ ok: boolean; deja: boolean; mouvement: string; solde: number }>('POST', '/v1/nkorouna/depenser', { produitId, cle });
export const transfererNkr = (vers: string, montant: number, cle: string) => api<{ ok: boolean; solde: number }>('POST', '/v1/nkorouna/transferer', { vers, montant, cle });
export const adminNkorouna = () => api<{ verification: VerificationNkr; comptes: { id: string; user_id: string | null; solde: number; gele: boolean; nom: string | null }[]; mouvements: { rang: number; id: string; nature: string; debit: string; credit: string; montant: number; par: string; created_at: string; meta: Record<string, unknown> }[] }>('GET', '/v1/admin/nkorouna');
export const adminAjusterNkr = (userId: string, montant: number, motif: string, cle: string) => api<{ ok: boolean; solde: number }>('POST', '/v1/admin/nkorouna/ajuster', { userId, montant, motif, cle });
export const adminAnnulerNkr = (id: string, motif: string) => api('POST', `/v1/admin/nkorouna/annuler/${id}`, { motif });
export const adminGelerNkr = (userId: string, gele: boolean) => api('POST', '/v1/admin/nkorouna/geler', { userId, gele });
export const adminAncrerNkr = () => api<{ ok: boolean; rien?: boolean; racine?: string; de?: number; jusqua?: number; reseau?: string; transaction?: string | null }>('POST', '/v1/admin/nkorouna/ancrer');

// ------------------------------------------------------------------ paiements Mobile Money
export interface Paiement { id: string; reference: string; produitId: string; montant: number; operateur: string; statut: 'en_attente' | 'declare' | 'confirme' | 'echoue' | 'refuse' | 'expire'; mode: 'manuel' | 'api' | 'simulation'; instructions: { numero?: string; etapes?: string[]; montant?: number; reference?: string } }
export const chargerModesPaiement = () => api<{ mode: string; operateurs: { id: string; nom: string }[] }>('GET', '/pub/paiements/modes');
export const creerPaiement = (produitId: string, operateur: string, telephone: string) => api<Paiement>('POST', '/v1/paiements', { produitId, operateur, telephone });
export const lirePaiement = (id: string) => api<Paiement>('GET', `/v1/paiements/${id}`);
export const declarerPaiement = (id: string, transaction: string) => api<{ statut: string }>('POST', `/v1/paiements/${id}/declarer`, { transaction });
export const simulerPaiement = (id: string, code: string) => api<{ statut: string }>('POST', `/v1/paiements/${id}/simuler`, { code });
export const adminPaiements = (statut?: string) => api<(Paiement & { userId: string; nom: string | null; telephone: string; transaction: string | null })[]>('GET', `/v1/admin/paiements${statut ? `?statut=${statut}` : ''}`);
export const adminValiderPaiement = (id: string) => api('POST', `/v1/admin/paiements/${id}/valider`);
export const adminRefuserPaiement = (id: string, note?: string) => api('POST', `/v1/admin/paiements/${id}/refuser`, { note });
export const adminExemples = () => api<{ presents: number; disponibles: boolean }>('GET', '/v1/admin/exemples');
export const adminImporterExemples = () => api<{ collections: number; lignes: number }>('POST', '/v1/admin/exemples/importer');
export const adminSupprimerExemples = () => api<{ supprimes: number }>('DELETE', '/v1/admin/exemples');

// ------------------------------------------------------------------ un seul compte par personne
export const envoyerCodeLien = (telephone: string) => api<{ envoye: boolean; telephone: string }>('POST', '/v1/me/telephone/envoyer', { telephone });
export const verifierCodeLien = (telephone: string, code: string) => api<{ lie: boolean; telephone: string; fusion: boolean; xpReverse: number }>('POST', '/v1/me/telephone/verifier', { telephone, code });

// ------------------------------------------------------------------ radio (AzuraCast)
export interface StationDirect { id: string; nom: string; flux: string; hls: string | null; titre: string; artiste: string; pochette: string | null; auditeurs: number; enDirect: boolean }
export const radioDirect = () => api<{ stations: StationDirect[]; simule: boolean }>('GET', '/v1/radio/direct');
export const adminRadioEtat = () => api<{ url: string | null; simule: boolean; ok: boolean; stations: number; erreur?: string; serveur: unknown }>('GET', '/v1/admin/radio/etat');
export const adminRadioSynchroniser = () => api<{ crees: number; maj: number }>('POST', '/v1/admin/radio/synchroniser', {});

// ------------------------------------------------------------------ bibliothèque d'Onenji (import des livres déposés sur le serveur)
export interface EtatBibliotheque { dossier: string; enCours: boolean; fin?: string; presents: number; importes: number; livres: number; ajoutes: number; modifies: number; inchanges: number; chapitres: number; erreurs: { fichier: string; message: string }[] }
export const adminBibliothequeEtat = () => api<EtatBibliotheque>('GET', '/v1/admin/bibliotheque/etat');
export const adminBibliothequeImporter = () => api<{ ok: boolean }>('POST', '/v1/admin/bibliotheque/importer', {});
