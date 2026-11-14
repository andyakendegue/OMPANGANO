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
  /** Collection privée : jamais servie par la lecture publique. Le serveur n'en tire que ce qu'il faut pour une manche (jeux). */
  prive?: boolean;
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

/** Moteurs de jeu d'Azeva (un écran par moteur dans l'application ; le contenu vient toujours du serveur). */
export const MOTEURS = ['ogoni', 'pendu', 'anagramme', 'mots_meles', 'mots_croises', 'mots_fleches', 'memoire', 'syllabes', 'dictee', 'qcm', 'ordre', 'plateau',
  'quiz', 'relier', 'classer', 'sequence', 'trous', 'compter', 'rythme', 'zones', 'suites', 'chemin'] as const;
export type Moteur = typeof MOTEURS[number];

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
  { id: 'exercices', module: 'onenji', prive: true, titre: 'Exercices', description: 'Collection privée (décision de Capp, 14 nov. 2026) : l\'application ne reçoit que les exercices des leçons que le compte peut ouvrir. Une leçon suit l\'unité en 9 étapes : écouter, voir, dire, écrire, comprendre, proverbe, culture, jouer, vérifier. Plusieurs variantes d\'un même exercice se placent à la même position (colonne « ordre ») avec des dialectes différents : l\'apprenant voit celle de sa variante (ôrungu par défaut).', champs: [
    id, { nom: 'lecon_id', type: 'texte', requis: true, ref: 'lecons', aide: 'Leçon parente.' },
    { nom: 'type', type: 'choix', requis: true, choix: ['ecouter', 'associer', 'ordre', 'dire', 'choix', 'trou', 'saisie', 'cours', 'dictee', 'comprendre', 'proverbe', 'culture', 'jouer'], aide: 'Type d\'exercice : trou = mot à placer dans la phrase ; saisie = réponse à écrire ; cours = présentation avant les contrôles (non notée) ; dictee = écouter puis écrire ; comprendre = dialogue ou texte (colonne « texte ») puis question à choix ; proverbe et culture = cartes à lire (non notées) ; jouer = lien vers un jeu d\'Azeva (colonne « jeu_id »).', exemple: 'ecouter' },
    { nom: 'consigne', type: 'texte', aide: 'Consigne affichée (texte ou lue).' },
    { nom: 'mot_myene', type: 'texte', aide: 'Mot ou phrase en myènè (source obligatoire) ; pour « trou », la phrase avec ___ à la place du mot.' },
    { nom: 'mot_francais', type: 'texte', aide: 'Traduction française.' },
    { nom: 'options', type: 'liste', aide: 'Choix proposés, séparés par | (associer, choix) ou mots à remettre en ordre.' },
    { nom: 'reponse', type: 'texte', aide: 'Bonne réponse (libellé exact d\'une option, ou phrase complète pour « ordre »).' },
    { nom: 'indice', type: 'texte', aide: 'Aide affichée après une erreur.' }, image, audio,
    { nom: 'texte', type: 'long', aide: 'Texte long : explication (cours), dialogue une réplique par ligne « Nom : texte » (comprendre), sens et usage (proverbe), note (culture).' },
    { nom: 'conseil', type: 'texte', aide: 'Conseil culturel montré en bulle pendant l\'exercice.', exemple: 'C\'est la personne qui arrive qui salue la première.' },
    { nom: 'jeu_id', type: 'texte', ref: 'jeux', aide: 'Étape « jouer » : identifiant du jeu d\'Azeva proposé (tous les jeux sont gratuits).' },
    { nom: 'dialecte', type: 'texte', aide: 'Dialecte (orungu, mpongwe, galwa, nkomi, adyumba, enenga ; vide = commun à toutes les variantes).' }, source, ordre] },
  { id: 'cours_artisans', module: 'onenji', titre: 'Vidéothèque (Igolani)', description: 'Tous les cours vidéo d\'Onenji, rangés par catégorie ; les cours d\'artisans sont une catégorie (nom de collection gardé pour les données déjà importées).', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre du cours.' }, { nom: 'categorie', type: 'texte', aide: 'Catégorie de la vidéothèque (Artisans, Langue, Culture, Histoire…). Vide : « Artisans » si un artisan est indiqué.', exemple: 'Artisans' }, { nom: 'artisan', type: 'texte', aide: 'Nom de l\'artisan ou de l\'intervenant.' },
    { nom: 'metier', type: 'texte', aide: 'Métier (vin de palme, hors-bord, cuisine…).' }, { nom: 'description', type: 'long', aide: 'Description.' },
    { nom: 'video_url', type: 'url', aide: 'Vidéo ou playlist HLS (inutile si protege = oui).' },
{ nom: 'protege', type: 'booleen', aide: 'oui/non : médias chiffrés (HLS AES-128) sous media/<collection>/<id>/ ; la lecture exige une licence.' },
     { nom: 'sous_titres_url', type: 'url', aide: 'Fichier de sous-titres (.vtt).' },
    { nom: 'duree_min', type: 'entier', aide: 'Durée totale en minutes.' }, { nom: 'niveau', type: 'choix', choix: ['debutant', 'intermediaire', 'avance'], aide: 'Niveau.' },
    { ...acces, aide: 'Accès de toute la vidéo (vide = règle par défaut : 1er chapitre gratuit avec publicité, la suite au forfait, à l\'achat pour un cours d\'artisan de plus de 60 min).', exemple: '' },
    { nom: 'parcours_id', type: 'texte', ref: 'parcours', aide: 'Étape d\'Inenga à laquelle la vidéo se rattache (facultatif).' }, rangMin, plans, image, ordre, publie] },
  { id: 'chapitres', module: 'onenji', titre: 'Chapitres de cours', description: 'Chapitres d\'un cours d\'artisan.', champs: [
    id, { nom: 'cours_id', type: 'texte', requis: true, ref: 'cours_artisans', aide: 'Cours parent.' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Titre du chapitre.' }, { nom: 'debut_s', type: 'entier', aide: 'Début dans la vidéo (secondes).' },
    { nom: 'duree_s', type: 'entier', aide: 'Durée en secondes.' },
    { ...acces, aide: 'Accès de ce chapitre (vide = celui de la vidéo ; si la vidéo n\'en a pas : 1er chapitre gratuit avec publicité, la suite au forfait, à l\'achat pour un cours d\'artisan de plus de 60 min).', exemple: '' }, ordre] },
  { id: 'bibliotheque', module: 'onenji', titre: 'Bibliothèque', description: 'Livres, annales, documents libres de droits. Un livre avec des chapitres (collection « livre_chapitres ») se lit dans l\'application.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'auteur', type: 'texte', aide: 'Auteur.' },
    { nom: 'type', type: 'choix', choix: ['livre', 'annale', 'fiche', 'audio', 'autre'], aide: 'Type.' },
    { nom: 'langue', type: 'texte', aide: 'Langue.' }, { nom: 'url', type: 'url', aide: 'Fichier ou page (facultatif si les chapitres sont dans l\'application).' },
    { nom: 'resume', type: 'long', aide: 'Quatrième de couverture : quelques lignes.' }, { nom: 'categorie', type: 'texte', aide: 'Rayon : roman, conte, histoire, poésie, théâtre, sciences…', exemple: 'conte' },
    { nom: 'annee', type: 'entier', aide: 'Année de première publication.' }, { nom: 'cycle', type: 'entier', aide: 'Âge de lecture conseillé : 1 = enfant (jusqu\'à 9 ans), 2 = jeune, 3 = adulte.' },
    { nom: 'couleur', type: 'texte', aide: 'Couleur de la tranche et de la couverture #RRGGBB.', exemple: '#B84A28' },
    { nom: 'source', type: 'texte', aide: 'Origine et licence (domaine public, adresse).' }, ordre, acces, rangMin, plans, image, publie] },
  { id: 'livre_chapitres', module: 'onenji', titre: 'Chapitres de livres', description: 'Texte des livres de la bibliothèque, un chapitre par ligne (généré par l\'import de la bibliothèque).', champs: [
    id, { nom: 'livre_id', type: 'texte', requis: true, ref: 'bibliotheque', aide: 'Livre parent.' }, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre du chapitre.' },
    { nom: 'texte', type: 'long', requis: true, aide: 'Texte du chapitre (paragraphes séparés par une ligne vide).' }, ordre,
    { nom: 'glossaire', type: 'json', aide: 'Mots expliqués : [{"mot":"pirogue","sens":"barque creusée dans un tronc"}].' },
    { nom: 'questions', type: 'json', aide: 'Quiz du chapitre (sinon généré) : [{"enonce":"…","options":["a","b","c"],"bonne":0}].' }, publie] },
  { id: 'grammaire', module: 'onenji', titre: 'Fiches de grammaire', description: 'Fiches courtes (conjugaison, classes nominales, pronoms, nombres…) lisibles dans Ezango et depuis les leçons. Chaque exemple myènè porte sa source.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre de la fiche.', exemple: 'Les classes nominales' },
    { nom: 'categorie', type: 'choix', choix: ['conjugaison', 'classes_nominales', 'pronoms', 'nombres', 'phrase', 'prononciation', 'autre'], aide: 'Rubrique.', exemple: 'classes_nominales' },
    { nom: 'resume', type: 'texte', aide: 'Une phrase qui dit ce que la fiche explique.' },
    { nom: 'contenu', type: 'long', requis: true, aide: 'Explication (paragraphes séparés par une ligne vide ; un tableau en lignes « a | b | c »).' },
    { nom: 'exemples', type: 'json', aide: 'Exemples : [{"myene":"…","francais":"…","audio":"…"}].' },
    { nom: 'parcours_id', type: 'texte', ref: 'parcours', aide: 'Étape concernée (facultatif).' }, { nom: 'unite_id', type: 'texte', ref: 'unites', aide: 'Unité où la fiche est proposée (facultatif).' },
    { nom: 'dialecte', type: 'texte', aide: 'Dialecte (vide = commun).' }, { ...source, requis: true, exemple: 'Teisserès et Dubois, p. 12' }, ordre, publie] },
  { id: 'opportunites', module: 'onenji', titre: 'Opportunités pour la jeunesse', description: 'Bourses, stages, concours.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'organisme', type: 'texte', aide: 'Organisme.' },
    { nom: 'description', type: 'long', aide: 'Description.' }, { nom: 'date_limite', type: 'date', aide: 'Date limite (AAAA-MM-JJ).' }, { nom: 'lien', type: 'url', aide: 'Lien.' }, publie] },

  // ---------------------------------------------------------------- Azeva
  { id: 'salles', module: 'azeva', titre: 'Salles de jeu', description: 'Salles du hall (Mots, Corps, Maison, Nature, Nombres…).', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'titre_myene', type: 'texte', aide: 'Titre en myènè.' },
    { nom: 'description', type: 'texte', aide: 'Description courte.' }, couleur, { nom: 'icone', type: 'texte', aide: 'Nom d\'icône.' }, ordre, publie, rangMin, plans] },
  { id: 'jeux', module: 'azeva', titre: 'Jeux', description: 'Jeux du hall ; le moteur détermine le fonctionnement. Le contenu d\'une partie est tiré par le serveur à chaque manche.', champs: [
    id, { nom: 'salle_id', type: 'texte', requis: true, ref: 'salles', aide: 'Salle.' }, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' },
    { nom: 'moteur', type: 'choix', requis: true, choix: [...MOTEURS], aide: 'Moteur de jeu.', exemple: 'ogoni' },
    { nom: 'description', type: 'texte', aide: 'Description.' }, { nom: 'consigne', type: 'texte', aide: 'Consigne affichée pendant la partie.' }, couleur,
    { nom: 'icone', type: 'texte', aide: 'Nom d\'icône.' }, { nom: 'duree_s', type: 'entier', aide: 'Durée de la partie (secondes, 0 = sans limite) ; un niveau peut la remplacer.' },
    { nom: 'theme', type: 'liste', aide: 'Thèmes des « mots_jeux » utilisés, séparés par | (vide = tous).', exemple: 'corps' },
    { nom: 'banque', type: 'texte', aide: 'Identifiant de jeu dont on réutilise les « jeux_items » (vide = ceux de ce jeu).' },
    { nom: 'corpus', type: 'booleen', aide: 'oui/non : ajouter aux mots les fiches actives du corpus (un seul mot) dans le dialecte du joueur.' },
    { nom: 'scene', type: 'texte', aide: 'Moteur « zones » : dessin intégré (corps) ou image de la scène.' },
    { nom: 'niveaux', type: 'entier', aide: 'Nombre de niveaux du jeu (1000 par défaut).', exemple: '1000' },
    { nom: 'mode_enfant', type: 'booleen', aide: 'oui/non : disponible en mode enfant.' }, ordre, publie, rangMin, plans] },
  { id: 'jeux_niveaux', module: 'azeva', titre: 'Paliers des jeux', description: 'Chaque jeu a 1000 niveaux à difficulté croissante (calculée). Une ligne = un palier : « à partir du niveau X », avec sa condition d\'accès (rang du joueur, formule d\'abonnement, achat) et, si on veut, des réglages imposés. Sans ligne, huit paliers par défaut suivent les huit rangs.', champs: [
    id, { nom: 'jeu_id', type: 'texte', requis: true, ref: 'jeux', aide: 'Jeu concerné.' }, { nom: 'niveau', type: 'entier', requis: true, aide: 'Premier niveau du palier (1, 51, 151…) ; il va jusqu\'au palier suivant.', exemple: '1' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Nom du palier.', exemple: 'Éveil' }, { nom: 'description', type: 'texte', aide: 'Ce qui change à ce palier.' },
    rangMin, plans, { nom: 'produit_id', type: 'texte', ref: 'produits', aide: 'Achat qui ouvre ce palier (collection « produits ») ; une formule citée dans « plans » l\'ouvre aussi.' },
    { nom: 'questions', type: 'entier', aide: 'Imposer le nombre de mots ou de questions par manche (vide = calculé selon le niveau).' }, { nom: 'duree_s', type: 'entier', aide: 'Imposer le temps limite en secondes (0 = sans limite ; vide = calculé).' },
    { nom: 'erreurs_max', type: 'entier', aide: 'Imposer les erreurs permises (bûches du feu d\'Ogoni) ; vide = calculé (7 puis 3).' }, { nom: 'taille', type: 'entier', aide: 'Imposer la taille de la grille ; vide = calculée.' },
    { nom: 'options', type: 'entier', aide: 'Imposer le nombre de réponses proposées (2 à 6) ; vide = calculé.' }, { nom: 'contenu_niveau', type: 'entier', aide: 'Imposer la difficulté maximale des contenus tirés ; vide = calculée.' },
    { nom: 'xp_pct', type: 'entier', aide: 'Imposer l\'XP de la partie en pourcentage (100 = normal) ; vide = calculé (100 puis 300).', exemple: '100' }, publie] },
  { id: 'jeux_items', module: 'azeva', prive: true, titre: 'Contenu des jeux', description: 'Questions, paires, suites, phrases à trous… d\'un jeu. Collection privée : l\'application n\'en reçoit que le tirage d\'une manche.', champs: [
    id, { nom: 'jeu_id', type: 'texte', requis: true, ref: 'jeux', aide: 'Jeu (ou banque) auquel appartient la ligne.' },
    { nom: 'enonce', type: 'texte', requis: true, aide: 'Question, élément de gauche, phrase avec ___, élément à classer ou à ordonner, suite (rond|carre|?), nombre à compter.' },
    { nom: 'reponse', type: 'texte', requis: true, aide: 'Bonne réponse, élément de droite, catégorie, syllabes (a-kôn-dô), rythme (G-D-G), zone (tete).' },
    { nom: 'leurres', type: 'liste', aide: 'Mauvaises réponses séparées par | (sinon tirées des autres lignes du jeu).' },
    { nom: 'groupe', type: 'texte', aide: 'Série à laquelle appartient la ligne (moteur « sequence » : une série = une suite à remettre en ordre).' }, ordre,
    { nom: 'niveau', type: 'entier', aide: 'Difficulté 1 à 3.' }, { nom: 'indice', type: 'texte', aide: 'Aide ou explication montrée après la réponse.' }, image, audio,
    { nom: 'extra', type: 'json', aide: 'Réglages propres au moteur, ex. {"x":50,"y":12} (zone), {"texte":"…"} (texte à lire avant la question).' },
    { nom: 'dialecte', type: 'texte', aide: 'Dialecte (vide = tous).' }, { ...source, requis: true }, publie] },
  { id: 'mots_jeux', module: 'azeva', prive: true, titre: 'Mots des jeux', description: 'Mots des jeux de lettres (feu d\'Ogoni, anagrammes, grilles, mémoire). Collection privée : l\'application n\'en reçoit que le tirage d\'une manche.', champs: [
    id, { nom: 'myene', type: 'texte', requis: true, aide: 'Mot en myènè.' }, { nom: 'francais', type: 'texte', requis: true, aide: 'Traduction.' },
    { nom: 'theme', type: 'texte', aide: 'Thème (corps, maison, nature, nombres…).' }, { nom: 'niveau', type: 'entier', aide: 'Difficulté 1 à 3.' },
    { nom: 'dialecte', type: 'texte', aide: 'Dialecte.' }, audio, image, { ...source, requis: true }, publie] },
  { id: 'defis', module: 'azeva', titre: 'Défis', description: 'Défi du jour ou de la semaine.', champs: [
    id, { nom: 'type', type: 'choix', requis: true, choix: ['jour', 'semaine'], aide: 'Portée.' }, { nom: 'jeu_id', type: 'texte', ref: 'jeux', aide: 'Jeu concerné.' },
    { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'debut', type: 'date', aide: 'Premier jour (AAAA-MM-JJ).' },
    { nom: 'fin', type: 'date', aide: 'Dernier jour.' }, { nom: 'objectif', type: 'entier', aide: 'Objectif (points ou nombre).' }, { nom: 'xp', type: 'entier', aide: 'XP offerts.' }, publie] },
  { id: 'succes', module: 'azeva', titre: 'Succès', description: 'Succès à débloquer.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'description', type: 'texte', aide: 'Description.' },
    { nom: 'condition', type: 'choix', requis: true, choix: ['parties', 'victoires', 'serie', 'points', 'lecons', 'contributions', 'chapitres'], aide: 'Compteur observé.' },
    { nom: 'seuil', type: 'entier', requis: true, aide: 'Valeur à atteindre.' }, { nom: 'xp', type: 'entier', aide: 'XP offerts.' }, { nom: 'icone', type: 'texte', aide: 'Icône.' }, publie] },
  { id: 'avatars', module: 'azeva', titre: 'Avatars', description: 'Avatars à débloquer.', champs: [
    id, { nom: 'nom', type: 'texte', requis: true, aide: 'Nom.' }, image, { nom: 'couleur', type: 'texte', aide: 'Couleur de fond.' },
    { nom: 'rang_min', type: 'entier', aide: 'Rang minimal (1 à 8).' }, { nom: 'succes_id', type: 'texte', ref: 'succes', aide: 'Succès requis.' }, publie] },
  { id: 'plateau', module: 'azeva', prive: true, titre: 'Plateau du grand jeu', description: 'Cases du jeu de société (parcours de la vie, avec dé).', champs: [
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
  { id: 'messages', module: 'commun', titre: 'Messages et rappels doux', description: 'Textes des rappels, encouragements et phrases de Kak\'Igonjo.', champs: [
    id, { nom: 'type', type: 'choix', requis: true, choix: ['rappel', 'encouragement', 'bienvenue', 'defaite', 'victoire', 'kakigonjo', 'ozangue'], aide: 'Type.' },
    { nom: 'texte', type: 'texte', requis: true, aide: 'Texte (tutoiement sauf services citoyens). Type « kakigonjo » : message d\'accueil du chat de Kak\'Igonjo ; {prénom} est remplacé par le prénom de l\'utilisateur.', exemple: "Mbolo {prénom} ! Myè no Kak'Igonjo. Wulinya myè, de quoi as-tu besoin ?" }, { nom: 'ton', type: 'choix', choix: ['tu', 'vous'], aide: 'Tutoiement ou vouvoiement.' }, publie] },
  { id: 'plans', module: 'commun', titre: 'Formules d\'abonnement', description: 'Ce que chaque formule débloque : toute l\'application, ou seulement les contenus qui la citent (colonne « plans »).', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Nom de la formule.' }, { nom: 'description', type: 'long', aide: 'Ce qu\'elle apporte.' },
    { nom: 'tout', type: 'booleen', aide: 'oui = donne accès à tout (contenus soumis à une formule compris).' }, { nom: 'rang_min', type: 'entier', aide: 'Rang minimal conseillé (information).' },
    { nom: 'sans_pub', type: 'liste', aide: 'Parties sans publicité : « tout », ou des modules séparés par | (commun, onenji, azeva, ontci, nkala). Vide = publicité maintenue. « oui » vaut « tout ».', exemple: 'tout' }, ordre, publie] },
  { id: 'produits', module: 'commun', titre: 'Produits payants', description: 'Abonnements, achats intégrés et packs de Nkorouna (aucun prix n\'est fixé dans le code). Un produit peut se payer en FCFA (prix_fcfa), en Nkorouna (prix_nkr) ou les deux.', champs: [
    id, { nom: 'titre', type: 'texte', requis: true, aide: 'Titre.' }, { nom: 'type', type: 'choix', requis: true, choix: ['abonnement', 'achat', 'consommable', 'nkorouna'], aide: 'Type ; « nkorouna » = pack de jetons payé en FCFA.' },
    { nom: 'prix_fcfa', type: 'entier', aide: 'Prix en FCFA.' }, { nom: 'periode', type: 'choix', choix: ['mois', 'an', 'unique'], aide: 'Période.' },
    { nom: 'donne_acces', type: 'liste', aide: 'Contenus débloqués par un achat, séparés par | ; « tout » = toute l\'application.' }, { nom: 'plan_id', type: 'texte', ref: 'plans', aide: 'Formule donnée par cet abonnement (collection « plans »).' }, { nom: 'jetons_ia', type: 'entier', aide: 'Jetons IA offerts (consommable).' },
    { nom: 'nkorouna', type: 'entier', aide: 'Type « nkorouna » : nombre de Nkorouna (NKR) crédités quand le pack est payé en FCFA.', exemple: '500' }, { nom: 'prix_nkr', type: 'entier', aide: 'Prix en Nkorouna (vide = ne s\'achète pas en Nkorouna ; jamais pour un pack de Nkorouna).', exemple: '300' }, publie] },
  { id: 'pub_creations', module: 'commun', titre: 'Créations publicitaires', description: 'Publicités maison servies par la passerelle (en attendant ou à côté de Revive).', champs: [
    id, { nom: 'zone', type: 'texte', requis: true, aide: 'Zone (bandeau_accueil, recompense_coeur…).' }, { nom: 'annonceur', type: 'texte', aide: 'Annonceur.' }, { nom: 'campagne_id', type: 'texte', aide: 'Campagne de la régie (créée dans la console) ; vide = création libre.' },
    { nom: 'format', type: 'choix', choix: ['bandeau', 'natif', 'plein_ecran', 'audio', 'video'], aide: 'natif = publication sponsorisée mêlée aux listes.' }, { nom: 'cta', type: 'texte', aide: 'Texte du bouton (Découvrir, Appeler…).' },
    { nom: 'titre', type: 'texte', aide: 'Texte.' }, image, { nom: 'lien', type: 'url', aide: 'Lien au clic.' }, { nom: 'texte_alt', type: 'texte', requis: true, aide: 'Texte alternatif.' },
    { nom: 'debut', type: 'date', aide: 'Début.' }, { nom: 'fin', type: 'date', aide: 'Fin.' }, { nom: 'plafond_jour', type: 'entier', aide: 'Affichages par jour (0 = sans plafond).' }, publie] },
];

export const schemaDe = (id: string) => SCHEMAS.find(s => s.id === id);
export const COLLECTIONS = SCHEMAS.map(s => s.id);
/** Collections que la lecture publique ne sert jamais. */
export const estPrivee = (id: string) => !!schemaDe(id)?.prive;
