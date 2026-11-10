/**
 * Schémas des contenus pilotés par fichiers JSON ou CSV (jeux, cours, catalogue Ontci, annuaire…).
 * Un schéma décrit les colonnes attendues ; il sert à valider les imports (application, API, console
 * d'administration), à générer les modèles CSV et à documenter les formats (contenu/LISEZMOI.md).
 */
export type TypeChamp = 'texte' | 'long' | 'entier' | 'nombre' | 'booleen' | 'liste' | 'date' | 'url' | 'choix' | 'json';

export interface Champ {
  nom: string;
  type: TypeChamp;
  requis?: boolean;
  /** Valeurs permises (type « choix »). */
  choix?: string[];
  /** Collection référencée (l'identifiant doit exister, vérifié à l'import quand elle est présente). */
  ref?: string;
  aide: string;
  exemple?: string;
}

export type ModuleContenu = 'onenji' | 'azeva' | 'ontci' | 'nkala' | 'commun';

export interface SchemaContenu {
  id: string;
  module: ModuleContenu;
  titre: string;
  description: string;
  champs: Champ[];
}

const id: Champ = { nom: 'id', type: 'texte', requis: true, aide: 'Identifiant unique, sans espace (lettres, chiffres, tiret, souligné).', exemple: 'ntina-01' };
const publie: Champ = { nom: 'publie', type: 'booleen', aide: 'oui/non : visible dans l\'application (non par défaut = brouillon).', exemple: 'oui' };
const ordre: Champ = { nom: 'ordre', type: 'entier', aide: 'Position dans la liste (1, 2, 3…).', exemple: '1' };
const acces: Champ = { nom: 'niveau_acces', type: 'choix', choix: ['libre', 'gratuit_avec_pub', 'abonnement', 'achat', 'essai', 'location', 'reserve'], aide: 'Qui peut ouvrir ce contenu (libre par défaut).', exemple: 'libre' };
const rangMin: Champ = { nom: 'rang_min', type: 'entier', aide: 'Rang minimal pour y accéder (1 = tous, jusqu\'à 8 : voir la collection « rangs »).', exemple: '1' };
const plans: Champ = { nom: 'plans', type: 'liste', ref: 'plans', aide: 'Formules d\'abonnement qui y donnent accès, séparées par | (vide = aucune contrainte de formule).' };
const image: Champ = { nom: 'image', type: 'url', aide: 'Image (adresse https ou chemin du stockage).' };
const audio: Champ = { nom: 'audio', type: 'url', aide: 'Fichier audio (adresse https ou chemin du stockage).' };
const couleur: Champ = { nom: 'couleur', type: 'texte', aide: 'Couleur d\'accent #RRGGBB.', exemple: '#F59E0B' };
const source: Champ = { nom: 'source', type: 'texte', aide: 'Source du contenu (document et page) : obligatoire pour tout mot myènè.', exemple: '[LEC] Bonjour' };

export const SCHEMAS: SchemaContenu[] = [
  // ---------------------------------------------------------------- Onenji
  { id: 'parcours', module: 'onenji', titre: 'Parcours', description: 'Cursus par étape de la vie (Ntina, Ogèndo, Emeno, Ikôkô) ou thématique.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre en français.', exemple: 'Ntina' },
    { nom: 'titre_myene', type: 'texte', aide: 'Titre en myènè (avec source).' },
    { nom: 'etape_vie', type: 'choix', choix: ['ntina', 'ogendo', 'emeno', 'ikoko', 'autre'], aide: 'Étape de la vie.', exemple: 'ntina' },
    { nom: 'cycle', type: 'entier', aide: 'Cycle 1 à 6 ; 1-2 = sans lecture.', exemple: '1' },
    { nom: 'description', type: 'long', aide: 'Présentation courte.' }, couleur, image, ordre, publie, rangMin, plans] },
  { id: 'unites', module: 'onenji', titre: 'Unités', description: 'Une unité regroupe des leçons ; la fin d\'unité se valide à 4 réponses justes sur 5.', champs: [
    id, { nom: 'parcours_id', type: 'texte', requis: true, ref: 'parcours', aide: 'Parcours parent.' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'titre_myene', type: 'texte', aide: 'Titre en myènè.' },
    { nom: 'description', type: 'long', aide: 'Description.' }, ordre, publie, rangMin, plans] },
  { id: 'lecons', module: 'onenji', titre: 'Leçons', description: 'Une leçon = une suite d\'exercices courts.', champs: [
    id, { nom: 'unite_id', type: 'texte', requis: true, ref: 'unites', aide: 'Unité parente.' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'titre_myene', type: 'texte', aide: 'Titre en myènè.' },
    { nom: 'duree_min', type: 'entier', aide: 'Durée estimée en minutes.', exemple: '5' },
    { nom: 'xp', type: 'entier', aide: 'XP gagnés à la fin (15 par défaut).', exemple: '15' },
    { nom: 'mode', type: 'choix', choix: ['tous', 'enfant', 'adulte'], aide: 'Public.', exemple: 'tous' }, acces, rangMin, plans, ordre, publie] },
  { id: 'exercices', module: 'onenji', titre: 'Exercices', description: 'Écouter-répéter, associer image et mot, remettre en ordre, dire à voix haute, choix.', champs: [
    id, { nom: 'lecon_id', type: 'texte', requis: true, ref: 'lecons', aide: 'Leçon parente.' },
    { nom: 'type', type: 'choix', requis: true, choix: ['ecouter', 'associer', 'ordre', 'dire', 'choix'], aide: 'Type d\'exercice.', exemple: 'ecouter' },
    { nom: 'consigne', type: 'texte', aide: 'Consigne affichée (texte ou lue).' },
    { nom: 'mot_myene', type: 'texte', aide: 'Mot ou phrase en myènè (source obligatoire).' },
    { nom: 'mot_francais', type: 'texte', aide: 'Traduction française.' },
    { nom: 'options', type: 'liste', aide: 'Choix proposés, séparés par | (associer, choix) ou mots à remettre en ordre.' },
    { nom: 'reponse', type: 'texte', aide: 'Bonne réponse (libellé exact d\'une option, ou phrase complète pour « ordre »).' },
    { nom: 'indice', type: 'texte', aide: 'Aide affichée après une erreur.' }, image, audio,
    { nom: 'dialecte', type: 'texte', aide: 'Dialecte (ôrungu, omyènè…).' }, source, ordre] },
  { id: 'cours_artisans', module: 'onenji', titre: 'Cours d\'artisans', description: 'Cours vidéo donnés par des artisans.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre du cours.' }, { nom: 'artisan', type: 'texte', requis: true, aide: 'Nom de l\'artisan.' },
    { nom: 'metier', type: 'texte', aide: 'Métier (vin de palme, hors-bord, cuisine…).' }, { nom: 'description', type: 'long', aide: 'Description.' },
    { nom: 'video_url', type: 'url', aide: 'Vidéo ou playlist HLS (inutile si protege = oui).' },
{ nom: 'protege', type: 'booleen', aide: 'oui/non : médias chiffrés (HLS AES-128) sous media/<collection>/<id>/ ; la lecture exige une licence.' },
     { nom: 'sous_titres_url', type: 'url', aide: 'Fichier de sous-titres (.vtt).' },
    { nom: 'duree_min', type: 'entier', aide: 'Durée totale en minutes.' }, { nom: 'niveau', type: 'choix', choix: ['debutant', 'intermediaire', 'avance'], aide: 'Niveau.' },
    acces, rangMin, plans, image, ordre, publie] },
  { id: 'chapitres', module: 'onenji', titre: 'Chapitres de cours', description: 'Chapitres d\'un cours d\'artisan.', champs: [
    id, { nom: 'cours_id', type: 'texte', requis: true, ref: 'cours_artisans', aide: 'Cours parent.' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Titre du chapitre.' }, { nom: 'debut_s', type: 'entier', aide: 'Début dans la vidéo (secondes).' },
    { nom: 'duree_s', type: 'entier', aide: 'Durée en secondes.' }, ordre] },
  { id: 'bibliotheque', module: 'onenji', titre: 'Bibliothèque', description: 'Livres, annales, documents libres de droits.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'auteur', type: 'texte', aide: 'Auteur.' },
    { nom: 'type', type: 'choix', choix: ['livre', 'annale', 'fiche', 'audio', 'autre'], aide: 'Type.' },
    { nom: 'langue', type: 'texte', aide: 'Langue.' }, { nom: 'url', type: 'url', aide: 'Fichier ou page.' }, acces, rangMin, plans, image, publie] },
  { id: 'opportunites', module: 'onenji', titre: 'Opportunités pour la jeunesse', description: 'Bourses, stages, concours.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'organisme', type: 'texte', aide: 'Organisme.' },
    { nom: 'description', type: 'long', aide: 'Description.' }, { nom: 'date_limite', type: 'date', aide: 'Date limite (AAAA-MM-JJ).' }, { nom: 'lien', type: 'url', aide: 'Lien.' }, publie] },

  // ---------------------------------------------------------------- Azeva
  { id: 'salles', module: 'azeva', titre: 'Salles de jeu', description: 'Salles du hall (Mots, Corps, Maison, Nature, Nombres…).', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'titre_myene', type: 'texte', aide: 'Titre en myènè.' },
    { nom: 'description', type: 'texte', aide: 'Description courte.' }, couleur, { nom: 'icone', type: 'texte', aide: 'Nom d\'icône.' }, ordre, publie, rangMin, plans] },
  { id: 'jeux', module: 'azeva', titre: 'Jeux', description: 'Jeux du hall ; le moteur détermine le fonctionnement.', champs: [
    id, { nom: 'salle_id', type: 'texte', requis: true, ref: 'salles', aide: 'Salle.' }, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' },
    { nom: 'moteur', type: 'choix', requis: true, choix: ['pendu', 'anagramme', 'mots_meles', 'dictee', 'qcm', 'ordre', 'plateau', 'memoire'], aide: 'Moteur de jeu.', exemple: 'pendu' },
    { nom: 'description', type: 'texte', aide: 'Description.' }, couleur, { nom: 'duree_s', type: 'entier', aide: 'Durée de la partie (secondes, 0 = sans limite).' },
    { nom: 'mode_enfant', type: 'booleen', aide: 'oui/non : disponible en mode enfant.' }, ordre, publie, rangMin, plans] },
  { id: 'mots_jeux', module: 'azeva', titre: 'Mots des jeux', description: 'Mots supplémentaires pour les jeux (en plus des fiches validées du corpus).', champs: [
    id, { nom: 'myene', type: 'texte', requis: true, aide: 'Mot en myènè.' }, { nom: 'francais', type: 'texte', requis: true, aide: 'Traduction.' },
    { nom: 'theme', type: 'texte', aide: 'Thème (corps, maison, nature, nombres…).' }, { nom: 'niveau', type: 'entier', aide: 'Difficulté 1 à 3.' },
    { nom: 'dialecte', type: 'texte', aide: 'Dialecte.' }, audio, image, { ...source, requis: true }, publie] },
  { id: 'defis', module: 'azeva', titre: 'Défis', description: 'Défi du jour ou de la semaine.', champs: [
    id, { nom: 'type', type: 'choix', requis: true, choix: ['jour', 'semaine'], aide: 'Portée.' }, { nom: 'jeu_id', type: 'texte', ref: 'jeux', aide: 'Jeu concerné.' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'debut', type: 'date', aide: 'Premier jour (AAAA-MM-JJ).' },
    { nom: 'fin', type: 'date', aide: 'Dernier jour.' }, { nom: 'objectif', type: 'entier', aide: 'Objectif (points ou nombre).' }, { nom: 'xp', type: 'entier', aide: 'XP offerts.' }, publie] },
  { id: 'succes', module: 'azeva', titre: 'Succès', description: 'Succès à débloquer.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'description', type: 'texte', aide: 'Description.' },
    { nom: 'condition', type: 'choix', requis: true, choix: ['parties', 'victoires', 'serie', 'points', 'lecons', 'contributions'], aide: 'Compteur observé.' },
    { nom: 'seuil', type: 'entier', requis: true, aide: 'Valeur à atteindre.' }, { nom: 'xp', type: 'entier', aide: 'XP offerts.' }, { nom: 'icone', type: 'texte', aide: 'Icône.' }, publie] },
  { id: 'avatars', module: 'azeva', titre: 'Avatars', description: 'Avatars à débloquer.', champs: [
    id, { nom: 'nom', type: 'texte', requis: true, aide: 'Nom.' }, image, { nom: 'couleur', type: 'texte', aide: 'Couleur de fond.' },
    { nom: 'rang_min', type: 'entier', aide: 'Rang minimal (1 à 8).' }, { nom: 'succes_id', type: 'texte', ref: 'succes', aide: 'Succès requis.' }, publie] },
  { id: 'plateau', module: 'azeva', titre: 'Plateau du grand jeu', description: 'Cases du jeu de société (parcours de la vie, avec dé).', champs: [
    id, { nom: 'position', type: 'entier', requis: true, aide: 'Numéro de case.' },
    { nom: 'type', type: 'choix', requis: true, choix: ['neutre', 'question', 'bonus', 'recul', 'proverbe', 'arrivee'], aide: 'Type de case.' },
    { nom: 'texte', type: 'texte', aide: 'Texte de la case.' }, { nom: 'effet', type: 'entier', aide: 'Cases à avancer (+) ou reculer (−).' }, { nom: 'mot_id', type: 'texte', ref: 'mots_jeux', aide: 'Mot de la question.' }, publie] },

  // ---------------------------------------------------------------- Ontci
  { id: 'artistes', module: 'ontci', titre: 'Artistes', description: 'Artistes du catalogue.', champs: [
    id, { nom: 'nom', type: 'texte', requis: true, aide: 'Nom.' }, { nom: 'bio', type: 'long', aide: 'Biographie.' }, { nom: 'pays', type: 'texte', aide: 'Pays.' }, image, publie] },
  { id: 'albums', module: 'ontci', titre: 'Albums', description: 'Albums et singles.', champs: [
    id, { nom: 'artiste_id', type: 'texte', requis: true, ref: 'artistes', aide: 'Artiste.' }, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' },
    { nom: 'annee', type: 'entier', aide: 'Année.' }, { nom: 'genre', type: 'texte', aide: 'Genre.' }, { ...image, nom: 'pochette' }, couleur,
    { nom: 'a_la_une', type: 'booleen', aide: 'oui/non : en tête de l\'accueil.' }, publie, rangMin, plans] },
  { id: 'titres', module: 'ontci', titre: 'Titres', description: 'Pistes audio.', champs: [
    id, { nom: 'album_id', type: 'texte', requis: true, ref: 'albums', aide: 'Album.' }, { nom: 'artiste_id', type: 'texte', ref: 'artistes', aide: 'Artiste (si différent de l\'album).' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'piste', type: 'entier', aide: 'Numéro de piste.' }, { nom: 'duree_s', type: 'entier', aide: 'Durée en secondes.' },
    { nom: 'audio_url', type: 'url', aide: 'Flux audio (HLS) ou fichier (inutile si protege = oui).' },
{ nom: 'protege', type: 'booleen', aide: 'oui/non : médias chiffrés (HLS AES-128) sous media/<collection>/<id>/ ; la lecture exige une licence.' },
     { nom: 'paroles', type: 'long', aide: 'Paroles (une ligne par ligne chantée).' },
    { nom: 'traduction', type: 'long', aide: 'Traduction ligne à ligne.' }, { nom: 'genre', type: 'texte', aide: 'Genre.' }, acces, rangMin, plans, publie] },
  { id: 'radios', module: 'ontci', titre: 'Radios', description: 'Webradios en direct.', champs: [
    id, { nom: 'nom', type: 'texte', requis: true, aide: 'Nom.' }, { nom: 'flux_url', type: 'url', requis: true, aide: 'Flux direct.' },
    { nom: 'description', type: 'texte', aide: 'Description.' }, { nom: 'programme', type: 'json', aide: 'Programme : [{"heure":"06:00","titre":"…"}].' }, image, couleur, ordre, publie, rangMin, plans] },
  { id: 'chaines_tv', module: 'ontci', titre: 'Chaînes de télévision', description: 'Web TV en direct.', champs: [
    id, { nom: 'nom', type: 'texte', requis: true, aide: 'Nom.' }, { nom: 'flux_url', type: 'url', requis: true, aide: 'Flux direct HLS.' },
    { nom: 'description', type: 'texte', aide: 'Description.' }, { nom: 'guide', type: 'json', aide: 'Guide : [{"heure":"20:00","titre":"…"}].' }, image, acces, rangMin, plans, ordre, publie] },
  { id: 'playlists', module: 'ontci', titre: 'Listes éditoriales', description: 'Listes proposées par l\'équipe.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'description', type: 'texte', aide: 'Description.' },
    { nom: 'titres_ids', type: 'liste', ref: 'titres', aide: 'Identifiants de titres séparés par |.' }, image, couleur, publie, rangMin, plans] },
  { id: 'genres', module: 'ontci', titre: 'Genres', description: 'Genres musicaux (tuiles de recherche).', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, couleur, image, ordre] },

  // ---------------------------------------------------------------- Nkala (village)
  { id: 'categories_lieux', module: 'nkala', titre: 'Catégories de l\'annuaire', description: 'Tuiles de l\'annuaire (santé, pharmacie, marchés…).', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'icone', type: 'texte', aide: 'Icône.' }, couleur, image, ordre, publie] },
  { id: 'lieux', module: 'nkala', titre: 'Lieux de l\'annuaire', description: 'Commerces, services, administrations, pharmacies…', champs: [
    id, { nom: 'categorie_id', type: 'texte', requis: true, ref: 'categories_lieux', aide: 'Catégorie.' }, { nom: 'nom', type: 'texte', requis: true, aide: 'Nom.' },
    { nom: 'description', type: 'long', aide: 'Description.' }, { nom: 'adresse', type: 'texte', aide: 'Adresse.' }, { nom: 'quartier', type: 'texte', aide: 'Quartier.' },
    { nom: 'ville', type: 'texte', aide: 'Ville.', exemple: 'Port-Gentil' }, { nom: 'latitude', type: 'nombre', aide: 'Latitude (décimal).' }, { nom: 'longitude', type: 'nombre', aide: 'Longitude (décimal).' },
    { nom: 'telephone', type: 'texte', aide: 'Téléphone (+241…).' }, { nom: 'whatsapp', type: 'texte', aide: 'WhatsApp.' }, { nom: 'horaires', type: 'texte', aide: 'Ex. lun-sam 08:00-18:00.' },
    { nom: 'note', type: 'nombre', aide: 'Note de 0 à 5.' }, { nom: 'verifie', type: 'booleen', aide: 'oui/non : vérifié par l\'équipe.' }, { nom: 'tags', type: 'liste', aide: 'Mots-clés séparés par |.' }, { ...image, nom: 'photo' }, publie] },
  { id: 'gardes', module: 'nkala', titre: 'Pharmacies de garde', description: 'Planning des gardes.', champs: [
    id, { nom: 'lieu_id', type: 'texte', requis: true, ref: 'lieux', aide: 'Pharmacie.' }, { nom: 'debut', type: 'date', requis: true, aide: 'Premier jour de garde.' }, { nom: 'fin', type: 'date', requis: true, aide: 'Dernier jour.' }, publie] },
  { id: 'actualites', module: 'nkala', titre: 'Actualités', description: 'Actualités locales et alertes.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'resume', type: 'texte', aide: 'Résumé.' }, { nom: 'corps', type: 'long', aide: 'Texte.' },
    { nom: 'categorie', type: 'choix', choix: ['actu', 'alerte', 'sante', 'culture', 'sport'], aide: 'Catégorie.' }, image, { nom: 'date', type: 'date', aide: 'Date.' }, { nom: 'source', type: 'texte', aide: 'Média ou source.' }, publie] },
  { id: 'magazine', module: 'nkala', titre: 'Magazine', description: 'Recettes, portraits, conseils, reportages.', champs: [
    id, { nom: 'rubrique', type: 'choix', requis: true, choix: ['recette', 'portrait', 'conseil', 'reportage', 'education'], aide: 'Rubrique.' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'resume', type: 'texte', aide: 'Résumé.' }, { nom: 'corps', type: 'long', aide: 'Texte.' },
    { nom: 'auteur', type: 'texte', aide: 'Auteur.' }, image, { nom: 'date', type: 'date', aide: 'Date.' }, acces, rangMin, plans, publie] },
  { id: 'services', module: 'nkala', titre: 'Services', description: 'Services du village, ouverts ou à venir.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'description', type: 'texte', aide: 'Description.' }, { nom: 'icone', type: 'texte', aide: 'Icône.' },
    { nom: 'etat', type: 'choix', requis: true, choix: ['ouvert', 'bientot'], aide: 'État.' }, { nom: 'cible', type: 'texte', aide: 'Écran visé (taxi, signaler, commune…).' }, ordre, publie] },
  { id: 'categories_annonces', module: 'nkala', titre: 'Catégories d\'annonces', description: 'Logement, auto, emploi, divers…', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'icone', type: 'texte', aide: 'Icône.' }, couleur, { nom: 'quota_gratuit', type: 'entier', aide: 'Annonces gratuites par mois.' }, ordre, publie] },
  { id: 'sondages', module: 'nkala', titre: 'Sondages et idées', description: 'Questions de la commune.', champs: [
    id, { nom: 'question', type: 'texte', requis: true, aide: 'Question.' }, { nom: 'options', type: 'liste', requis: true, aide: 'Réponses séparées par |.' },
    { nom: 'debut', type: 'date', aide: 'Début.' }, { nom: 'fin', type: 'date', aide: 'Fin.' }, { nom: 'commune', type: 'texte', aide: 'Commune.' }, publie] },

  // ---------------------------------------------------------------- commun
  { id: 'rangs', module: 'commun', titre: 'Rangs', description: 'Classes d\'âge ôrungu : paliers d\'XP.', champs: [
    id, { nom: 'nom', type: 'texte', requis: true, aide: 'Nom du rang.' }, { nom: 'min_xp', type: 'entier', requis: true, aide: 'XP minimal.' },
    { nom: 'description', type: 'texte', aide: 'Définition.' }, { nom: 'source', type: 'texte', aide: 'Source.' }, ordre] },
  { id: 'messages', module: 'commun', titre: 'Messages et rappels doux', description: 'Textes des rappels, encouragements et phrases d\'Ozangué.', champs: [
    id, { nom: 'type', type: 'choix', requis: true, choix: ['rappel', 'encouragement', 'bienvenue', 'defaite', 'victoire', 'ozangue'], aide: 'Type.' },
    { nom: 'texte', type: 'texte', requis: true, aide: 'Texte (tutoiement sauf services citoyens).' }, { nom: 'ton', type: 'choix', choix: ['tu', 'vous'], aide: 'Tutoiement ou vouvoiement.' }, publie] },
  { id: 'plans', module: 'commun', titre: 'Formules d\'abonnement', description: 'Ce que chaque formule débloque : toute l\'application, ou seulement les contenus qui la citent (colonne « plans »).', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Nom de la formule.' }, { nom: 'description', type: 'long', aide: 'Ce qu\'elle apporte.' },
    { nom: 'tout', type: 'booleen', aide: 'oui = donne accès à tout (contenus soumis à une formule compris).' }, { nom: 'rang_min', type: 'entier', aide: 'Rang minimal conseillé (information).' },
    { nom: 'sans_pub', type: 'booleen', aide: 'oui = plus de publicité.' }, ordre, publie] },
  { id: 'produits', module: 'commun', titre: 'Produits payants', description: 'Abonnements et achats intégrés (aucun prix n\'est fixé dans le code).', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'type', type: 'choix', requis: true, choix: ['abonnement', 'achat', 'consommable'], aide: 'Type.' },
    { nom: 'prix_fcfa', type: 'entier', aide: 'Prix en FCFA.' }, { nom: 'periode', type: 'choix', choix: ['mois', 'an', 'unique'], aide: 'Période.' },
    { nom: 'donne_acces', type: 'liste', aide: 'Contenus débloqués par un achat, séparés par | ; « tout » = toute l\'application.' }, { nom: 'plan_id', type: 'texte', ref: 'plans', aide: 'Formule donnée par cet abonnement (collection « plans »).' }, { nom: 'jetons_ia', type: 'entier', aide: 'Jetons IA offerts (consommable).' }, publie] },
  { id: 'pub_creations', module: 'commun', titre: 'Créations publicitaires', description: 'Publicités maison servies par la passerelle (en attendant ou à côté de Revive).', champs: [
    id, { nom: 'zone', type: 'texte', requis: true, aide: 'Zone (bandeau_accueil, recompense_coeur…).' }, { nom: 'annonceur', type: 'texte', aide: 'Annonceur.' }, { nom: 'campagne_id', type: 'texte', aide: 'Campagne de la régie (créée dans la console) ; vide = création libre.' },
    { nom: 'format', type: 'choix', choix: ['bandeau', 'natif', 'plein_ecran', 'audio', 'video'], aide: 'natif = publication sponsorisée mêlée aux listes.' }, { nom: 'cta', type: 'texte', aide: 'Texte du bouton (Découvrir, Appeler…).' },
    { nom: 'titre', type: 'texte', aide: 'Texte.' }, image, { nom: 'lien', type: 'url', aide: 'Lien au clic.' }, { nom: 'texte_alt', type: 'texte', requis: true, aide: 'Texte alternatif.' },
    { nom: 'debut', type: 'date', aide: 'Début.' }, { nom: 'fin', type: 'date', aide: 'Fin.' }, { nom: 'plafond_jour', type: 'entier', aide: 'Affichages par jour (0 = sans plafond).' }, publie] },
];

export const schemaDe = (id: string) => SCHEMAS.find(s => s.id === id);
export const COLLECTIONS = SCHEMAS.map(s => s.id);
