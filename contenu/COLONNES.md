# Colonnes des fichiers de contenu

Généré par `server/scripts/generer_contenus.ts` : ne pas modifier à la main.

## Onenji (apprendre)

### Parcours — `parcours`
Cursus par étape de la vie (Ntina, Ogèndo, Emeno, Ikôkô) ou thématique.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre en français. |
| `titre_myene` | texte |  | Titre en myènè (avec source). |
| `etape_vie` | choix (ntina / ogendo / emeno / ikoko / autre) |  | Étape de la vie. |
| `cycle` | entier |  | Cycle 1 à 6 ; 1-2 = sans lecture. |
| `description` | long |  | Présentation courte. |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |

### Unités — `unites`
Une unité regroupe des leçons ; la fin d'unité se valide à 4 réponses justes sur 5.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `parcours_id` | texte → `parcours` | oui | Parcours parent. |
| `titre` | texte | oui | Titre. |
| `titre_myene` | texte |  | Titre en myènè. |
| `description` | long |  | Description. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |

### Leçons — `lecons`
Une leçon = une suite d'exercices courts.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `unite_id` | texte → `unites` | oui | Unité parente. |
| `titre` | texte | oui | Titre. |
| `titre_myene` | texte |  | Titre en myènè. |
| `duree_min` | entier |  | Durée estimée en minutes. |
| `xp` | entier |  | XP gagnés à la fin (15 par défaut). |
| `mode` | choix (tous / enfant / adulte) |  | Public. |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Qui peut ouvrir ce contenu (libre par défaut). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Exercices — `exercices`
Collection privée (décision de Capp, 14 nov. 2026) : l'application ne reçoit que les exercices des leçons que le compte peut ouvrir. Une leçon suit l'unité en 9 étapes : écouter, voir, dire, écrire, comprendre, proverbe, culture, jouer, vérifier. Plusieurs variantes d'un même exercice se placent à la même position (colonne « ordre ») avec des dialectes différents : l'apprenant voit celle de sa variante (ôrungu par défaut).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `lecon_id` | texte → `lecons` | oui | Leçon parente. |
| `type` | choix (ecouter / associer / ordre / dire / choix / trou / saisie / cours / dictee / comprendre / proverbe / culture / jouer) | oui | Type d'exercice : trou = mot à placer dans la phrase ; saisie = réponse à écrire ; cours = présentation avant les contrôles (non notée) ; dictee = écouter puis écrire ; comprendre = dialogue ou texte (colonne « texte ») puis question à choix ; proverbe et culture = cartes à lire (non notées) ; jouer = lien vers un jeu d'Azeva (colonne « jeu_id »). |
| `consigne` | texte |  | Consigne affichée (texte ou lue). |
| `mot_myene` | texte |  | Mot ou phrase en myènè (source obligatoire) ; pour « trou », la phrase avec ___ à la place du mot. |
| `mot_francais` | texte |  | Traduction française. |
| `options` | liste |  | Choix proposés, séparés par \| (associer, choix) ou mots à remettre en ordre. |
| `reponse` | texte |  | Bonne réponse (libellé exact d'une option, ou phrase complète pour « ordre »). |
| `indice` | texte |  | Aide affichée après une erreur. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `audio` | url |  | Fichier audio (adresse https ou chemin du stockage). |
| `texte` | long |  | Texte long : explication (cours), dialogue une réplique par ligne « Nom : texte » (comprendre), sens et usage (proverbe), note (culture). |
| `conseil` | texte |  | Conseil culturel montré en bulle pendant l'exercice. |
| `jeu_id` | texte → `jeux` |  | Étape « jouer » : identifiant du jeu d'Azeva proposé (tous les jeux sont gratuits). |
| `dialecte` | texte |  | Dialecte (orungu, mpongwe, galwa, nkomi, adyumba, enenga ; vide = commun à toutes les variantes). |
| `source` | texte |  | Source du contenu (document et page) : obligatoire pour tout mot myènè. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |

### Vidéothèque (Igolani) — `cours_artisans`
Tous les cours vidéo d'Onenji, rangés par catégorie ; les cours d'artisans sont une catégorie (nom de collection gardé pour les données déjà importées).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre du cours. |
| `categorie` | texte |  | Catégorie de la vidéothèque (Artisans, Langue, Culture, Histoire…). Vide : « Artisans » si un artisan est indiqué. |
| `artisan` | texte |  | Nom de l'artisan ou de l'intervenant. |
| `metier` | texte |  | Métier (vin de palme, hors-bord, cuisine…). |
| `description` | long |  | Description. |
| `video_url` | url |  | Vidéo ou playlist HLS (inutile si protege = oui). |
| `protege` | booleen |  | oui/non : médias chiffrés (HLS AES-128) sous media/<collection>/<id>/ ; la lecture exige une licence. |
| `sous_titres_url` | url |  | Fichier de sous-titres (.vtt). |
| `duree_min` | entier |  | Durée totale en minutes. |
| `niveau` | choix (debutant / intermediaire / avance) |  | Niveau. |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Accès de toute la vidéo (vide = règle par défaut : 1er chapitre gratuit avec publicité, la suite au forfait, à l'achat pour un cours d'artisan de plus de 60 min). |
| `parcours_id` | texte → `parcours` |  | Étape d'Inenga à laquelle la vidéo se rattache (facultatif). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Chapitres de cours — `chapitres`
Chapitres d'un cours d'artisan.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `cours_id` | texte → `cours_artisans` | oui | Cours parent. |
| `titre` | texte | oui | Titre du chapitre. |
| `debut_s` | entier |  | Début dans la vidéo (secondes). |
| `duree_s` | entier |  | Durée en secondes. |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Accès de ce chapitre (vide = celui de la vidéo ; si la vidéo n'en a pas : 1er chapitre gratuit avec publicité, la suite au forfait, à l'achat pour un cours d'artisan de plus de 60 min). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |

### Bibliothèque — `bibliotheque`
Livres, annales, documents libres de droits. Un livre avec des chapitres (collection « livre_chapitres ») se lit dans l'application.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `auteur` | texte |  | Auteur. |
| `type` | choix (livre / annale / fiche / audio / autre) |  | Type. |
| `langue` | texte |  | Langue. |
| `url` | url |  | Fichier ou page (facultatif si les chapitres sont dans l'application). |
| `resume` | long |  | Quatrième de couverture : quelques lignes. |
| `categorie` | texte |  | Rayon : roman, conte, histoire, poésie, théâtre, sciences… |
| `annee` | entier |  | Année de première publication. |
| `cycle` | entier |  | Âge de lecture conseillé : 1 = enfant (jusqu'à 9 ans), 2 = jeune, 3 = adulte. |
| `couleur` | texte |  | Couleur de la tranche et de la couverture #RRGGBB. |
| `source` | texte |  | Origine et licence (domaine public, adresse). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Qui peut ouvrir ce contenu (libre par défaut). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Chapitres de livres — `livre_chapitres`
Texte des livres de la bibliothèque, un chapitre par ligne (généré par l'import de la bibliothèque).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `livre_id` | texte → `bibliotheque` | oui | Livre parent. |
| `titre` | texte | oui | Titre du chapitre. |
| `texte` | long | oui | Texte du chapitre (paragraphes séparés par une ligne vide). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `glossaire` | json |  | Mots expliqués : [{"mot":"pirogue","sens":"barque creusée dans un tronc"}]. |
| `questions` | json |  | Quiz du chapitre (sinon généré) : [{"enonce":"…","options":["a","b","c"],"bonne":0}]. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Fiches de grammaire — `grammaire`
Fiches courtes (conjugaison, classes nominales, pronoms, nombres…) lisibles dans Ezango et depuis les leçons. Chaque exemple myènè porte sa source.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre de la fiche. |
| `categorie` | choix (conjugaison / classes_nominales / pronoms / nombres / phrase / prononciation / autre) |  | Rubrique. |
| `resume` | texte |  | Une phrase qui dit ce que la fiche explique. |
| `contenu` | long | oui | Explication (paragraphes séparés par une ligne vide ; un tableau en lignes « a \| b \| c »). |
| `exemples` | json |  | Exemples : [{"myene":"…","francais":"…","audio":"…"}]. |
| `parcours_id` | texte → `parcours` |  | Étape concernée (facultatif). |
| `unite_id` | texte → `unites` |  | Unité où la fiche est proposée (facultatif). |
| `dialecte` | texte |  | Dialecte (vide = commun). |
| `source` | texte | oui | Source du contenu (document et page) : obligatoire pour tout mot myènè. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Opportunités pour la jeunesse — `opportunites`
Bourses, stages, concours.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `organisme` | texte |  | Organisme. |
| `description` | long |  | Description. |
| `date_limite` | date |  | Date limite (AAAA-MM-JJ). |
| `lien` | url |  | Lien. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

## Azeva (jouer)

### Salles de jeu — `salles`
Salles du hall (Mots, Corps, Maison, Nature, Nombres…).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `titre_myene` | texte |  | Titre en myènè. |
| `description` | texte |  | Description courte. |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `icone` | texte |  | Nom d'icône. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |

### Jeux — `jeux`
Jeux du hall ; le moteur détermine le fonctionnement. Le contenu d'une partie est tiré par le serveur à chaque manche.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `salle_id` | texte → `salles` | oui | Salle. |
| `titre` | texte | oui | Titre. |
| `moteur` | choix (ogoni / pendu / anagramme / mots_meles / mots_croises / mots_fleches / memoire / syllabes / dictee / qcm / ordre / plateau / quiz / relier / classer / sequence / trous / compter / rythme / zones / suites / chemin) | oui | Moteur de jeu. |
| `description` | texte |  | Description. |
| `consigne` | texte |  | Consigne affichée pendant la partie. |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `icone` | texte |  | Nom d'icône. |
| `duree_s` | entier |  | Durée de la partie (secondes, 0 = sans limite) ; un niveau peut la remplacer. |
| `theme` | liste |  | Thèmes des « mots_jeux » utilisés, séparés par \| (vide = tous). |
| `banque` | texte |  | Identifiant de jeu dont on réutilise les « jeux_items » (vide = ceux de ce jeu). |
| `corpus` | booleen |  | oui/non : ajouter aux mots les fiches actives du corpus (un seul mot) dans le dialecte du joueur. |
| `scene` | texte |  | Moteur « zones » : dessin intégré (corps) ou image de la scène. |
| `niveaux` | entier |  | Nombre de niveaux du jeu (1000 par défaut). |
| `mode_enfant` | booleen |  | oui/non : disponible en mode enfant. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |

### Paliers des jeux — `jeux_niveaux`
Chaque jeu a 1000 niveaux à difficulté croissante (calculée). Une ligne = un palier : « à partir du niveau X », avec sa condition d'accès (rang du joueur, formule d'abonnement, achat) et, si on veut, des réglages imposés. Sans ligne, huit paliers par défaut suivent les huit rangs.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `jeu_id` | texte → `jeux` | oui | Jeu concerné. |
| `niveau` | entier | oui | Premier niveau du palier (1, 51, 151…) ; il va jusqu'au palier suivant. |
| `titre` | texte | oui | Nom du palier. |
| `description` | texte |  | Ce qui change à ce palier. |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |
| `produit_id` | texte → `produits` |  | Achat qui ouvre ce palier (collection « produits ») ; une formule citée dans « plans » l'ouvre aussi. |
| `questions` | entier |  | Imposer le nombre de mots ou de questions par manche (vide = calculé selon le niveau). |
| `duree_s` | entier |  | Imposer le temps limite en secondes (0 = sans limite ; vide = calculé). |
| `erreurs_max` | entier |  | Imposer les erreurs permises (bûches du feu d'Ogoni) ; vide = calculé (7 puis 3). |
| `taille` | entier |  | Imposer la taille de la grille ; vide = calculée. |
| `options` | entier |  | Imposer le nombre de réponses proposées (2 à 6) ; vide = calculé. |
| `contenu_niveau` | entier |  | Imposer la difficulté maximale des contenus tirés ; vide = calculée. |
| `xp_pct` | entier |  | Imposer l'XP de la partie en pourcentage (100 = normal) ; vide = calculé (100 puis 300). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Contenu des jeux — `jeux_items`
Questions, paires, suites, phrases à trous… d'un jeu. Collection privée : l'application n'en reçoit que le tirage d'une manche.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `jeu_id` | texte → `jeux` | oui | Jeu (ou banque) auquel appartient la ligne. |
| `enonce` | texte | oui | Question, élément de gauche, phrase avec ___, élément à classer ou à ordonner, suite (rond\|carre\|?), nombre à compter. |
| `reponse` | texte | oui | Bonne réponse, élément de droite, catégorie, syllabes (a-kôn-dô), rythme (G-D-G), zone (tete). |
| `leurres` | liste |  | Mauvaises réponses séparées par \| (sinon tirées des autres lignes du jeu). |
| `groupe` | texte |  | Série à laquelle appartient la ligne (moteur « sequence » : une série = une suite à remettre en ordre). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `niveau` | entier |  | Difficulté 1 à 3. |
| `indice` | texte |  | Aide ou explication montrée après la réponse. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `audio` | url |  | Fichier audio (adresse https ou chemin du stockage). |
| `extra` | json |  | Réglages propres au moteur, ex. {"x":50,"y":12} (zone), {"texte":"…"} (texte à lire avant la question). |
| `dialecte` | texte |  | Dialecte (vide = tous). |
| `source` | texte | oui | Source du contenu (document et page) : obligatoire pour tout mot myènè. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Mots des jeux — `mots_jeux`
Mots des jeux de lettres (feu d'Ogoni, anagrammes, grilles, mémoire). Collection privée : l'application n'en reçoit que le tirage d'une manche.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `myene` | texte | oui | Mot en myènè. |
| `francais` | texte | oui | Traduction. |
| `theme` | texte |  | Thème (corps, maison, nature, nombres…). |
| `niveau` | entier |  | Difficulté 1 à 3. |
| `dialecte` | texte |  | Dialecte. |
| `audio` | url |  | Fichier audio (adresse https ou chemin du stockage). |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `source` | texte | oui | Source du contenu (document et page) : obligatoire pour tout mot myènè. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Défis — `defis`
Défi du jour ou de la semaine.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `type` | choix (jour / semaine) | oui | Portée. |
| `jeu_id` | texte → `jeux` |  | Jeu concerné. |
| `titre` | texte | oui | Titre. |
| `debut` | date |  | Premier jour (AAAA-MM-JJ). |
| `fin` | date |  | Dernier jour. |
| `objectif` | entier |  | Objectif (points ou nombre). |
| `xp` | entier |  | XP offerts. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Succès — `succes`
Succès à débloquer.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `description` | texte |  | Description. |
| `condition` | choix (parties / victoires / serie / points / lecons / contributions / chapitres) | oui | Compteur observé. |
| `seuil` | entier | oui | Valeur à atteindre. |
| `xp` | entier |  | XP offerts. |
| `icone` | texte |  | Icône. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Avatars — `avatars`
Avatars à débloquer.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `nom` | texte | oui | Nom. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `couleur` | texte |  | Couleur de fond. |
| `rang_min` | entier |  | Rang minimal (1 à 8). |
| `succes_id` | texte → `succes` |  | Succès requis. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Plateau du grand jeu — `plateau`
Cases du jeu de société (parcours de la vie, avec dé).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `position` | entier | oui | Numéro de case. |
| `type` | choix (neutre / question / bonus / recul / proverbe / arrivee) | oui | Type de case. |
| `texte` | texte |  | Texte de la case. |
| `effet` | entier |  | Cases à avancer (+) ou reculer (−). |
| `mot_id` | texte → `mots_jeux` |  | Mot de la question. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

## Ontci (écouter)

### Artistes — `artistes`
Artistes du catalogue.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `nom` | texte | oui | Nom. |
| `bio` | long |  | Biographie. |
| `pays` | texte |  | Pays. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Albums — `albums`
Albums et singles.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `artiste_id` | texte → `artistes` | oui | Artiste. |
| `titre` | texte | oui | Titre. |
| `annee` | entier |  | Année. |
| `genre` | texte |  | Genre. |
| `pochette` | url |  | Image (adresse https ou chemin du stockage). |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `a_la_une` | booleen |  | oui/non : en tête de l'accueil. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |

### Titres — `titres`
Pistes audio.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `album_id` | texte → `albums` | oui | Album. |
| `artiste_id` | texte → `artistes` |  | Artiste (si différent de l'album). |
| `titre` | texte | oui | Titre. |
| `piste` | entier |  | Numéro de piste. |
| `duree_s` | entier |  | Durée en secondes. |
| `audio_url` | url |  | Flux audio (HLS) ou fichier (inutile si protege = oui). |
| `protege` | booleen |  | oui/non : médias chiffrés (HLS AES-128) sous media/<collection>/<id>/ ; la lecture exige une licence. |
| `paroles` | long |  | Paroles (une ligne par ligne chantée). |
| `traduction` | long |  | Traduction ligne à ligne. |
| `genre` | texte |  | Genre. |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Qui peut ouvrir ce contenu (libre par défaut). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Radios — `radios`
Webradios en direct.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `nom` | texte | oui | Nom. |
| `flux_url` | url | oui | Flux direct. |
| `description` | texte |  | Description. |
| `programme` | json |  | Programme : [{"heure":"06:00","titre":"…"}]. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |

### Chaînes de télévision — `chaines_tv`
Web TV en direct.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `nom` | texte | oui | Nom. |
| `flux_url` | url | oui | Flux direct HLS. |
| `description` | texte |  | Description. |
| `guide` | json |  | Guide : [{"heure":"20:00","titre":"…"}]. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Qui peut ouvrir ce contenu (libre par défaut). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Listes éditoriales — `playlists`
Listes proposées par l'équipe.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `description` | texte |  | Description. |
| `titres_ids` | liste → `titres` |  | Identifiants de titres séparés par \|. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |

### Genres — `genres`
Genres musicaux (tuiles de recherche).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |

## Nkala (village)

### Catégories de l'annuaire — `categories_lieux`
Tuiles de l'annuaire (santé, pharmacie, marchés…).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `icone` | texte |  | Icône. |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Lieux de l'annuaire — `lieux`
Commerces, services, administrations, pharmacies…

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `categorie_id` | texte → `categories_lieux` | oui | Catégorie. |
| `nom` | texte | oui | Nom. |
| `description` | long |  | Description. |
| `adresse` | texte |  | Adresse. |
| `quartier` | texte |  | Quartier. |
| `ville` | texte |  | Ville. |
| `latitude` | nombre |  | Latitude (décimal). |
| `longitude` | nombre |  | Longitude (décimal). |
| `telephone` | texte |  | Téléphone (+241…). |
| `whatsapp` | texte |  | WhatsApp. |
| `horaires` | texte |  | Ex. lun-sam 08:00-18:00. |
| `note` | nombre |  | Note de 0 à 5. |
| `verifie` | booleen |  | oui/non : vérifié par l'équipe. |
| `tags` | liste |  | Mots-clés séparés par \|. |
| `photo` | url |  | Image (adresse https ou chemin du stockage). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Pharmacies de garde — `gardes`
Planning des gardes.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `lieu_id` | texte → `lieux` | oui | Pharmacie. |
| `debut` | date | oui | Premier jour de garde. |
| `fin` | date | oui | Dernier jour. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Actualités — `actualites`
Actualités locales et alertes.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `resume` | texte |  | Résumé. |
| `corps` | long |  | Texte. |
| `categorie` | choix (actu / alerte / sante / culture / sport) |  | Catégorie. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `date` | date |  | Date. |
| `source` | texte |  | Média ou source. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Magazine — `magazine`
Recettes, portraits, conseils, reportages.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `rubrique` | choix (recette / portrait / conseil / reportage / education) | oui | Rubrique. |
| `titre` | texte | oui | Titre. |
| `resume` | texte |  | Résumé. |
| `corps` | long |  | Texte. |
| `auteur` | texte |  | Auteur. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `date` | date |  | Date. |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Qui peut ouvrir ce contenu (libre par défaut). |
| `rang_min` | entier |  | Rang minimal pour y accéder (1 = tous, jusqu'à 8 : voir la collection « rangs »). |
| `plans` | liste → `plans` |  | Formules d'abonnement qui y donnent accès, séparées par \| (vide = aucune contrainte de formule). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Services — `services`
Services du village, ouverts ou à venir.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `description` | texte |  | Description. |
| `icone` | texte |  | Icône. |
| `etat` | choix (ouvert / bientot) | oui | État. |
| `cible` | texte |  | Écran visé (taxi, signaler, commune…). |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Catégories d'annonces — `categories_annonces`
Logement, auto, emploi, divers…

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `icone` | texte |  | Icône. |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `quota_gratuit` | entier |  | Annonces gratuites par mois. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Sondages et idées — `sondages`
Questions de la commune.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `question` | texte | oui | Question. |
| `options` | liste | oui | Réponses séparées par \|. |
| `debut` | date |  | Début. |
| `fin` | date |  | Fin. |
| `commune` | texte |  | Commune. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

## Commun

### Rangs — `rangs`
Classes d'âge ôrungu : paliers d'XP.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `nom` | texte | oui | Nom du rang. |
| `min_xp` | entier | oui | XP minimal. |
| `description` | texte |  | Définition. |
| `source` | texte |  | Source. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |

### Messages et rappels doux — `messages`
Textes des rappels, encouragements et phrases de Kak'Igonjo.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `type` | choix (rappel / encouragement / bienvenue / defaite / victoire / kakigonjo / ozangue) | oui | Type. |
| `texte` | texte | oui | Texte (tutoiement sauf services citoyens). Type « kakigonjo » : message d'accueil du chat de Kak'Igonjo ; {prénom} est remplacé par le prénom de l'utilisateur. |
| `ton` | choix (tu / vous) |  | Tutoiement ou vouvoiement. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Formules d'abonnement — `plans`
Ce que chaque formule débloque : toute l'application, ou seulement les contenus qui la citent (colonne « plans »).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Nom de la formule. |
| `description` | long |  | Ce qu'elle apporte. |
| `tout` | booleen |  | oui = donne accès à tout (contenus soumis à une formule compris). |
| `rang_min` | entier |  | Rang minimal conseillé (information). |
| `sans_pub` | liste |  | Parties sans publicité : « tout », ou des modules séparés par \| (commun, onenji, azeva, ontci, nkala). Vide = publicité maintenue. « oui » vaut « tout ». |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Produits payants — `produits`
Abonnements, achats intégrés et packs de Nkorouna (aucun prix n'est fixé dans le code). Un produit peut se payer en FCFA (prix_fcfa), en Nkorouna (prix_nkr) ou les deux.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `type` | choix (abonnement / achat / consommable / nkorouna) | oui | Type ; « nkorouna » = pack de jetons payé en FCFA. |
| `prix_fcfa` | entier |  | Prix en FCFA. |
| `periode` | choix (mois / an / unique) |  | Période. |
| `donne_acces` | liste |  | Contenus débloqués par un achat, séparés par \| ; « tout » = toute l'application. |
| `plan_id` | texte → `plans` |  | Formule donnée par cet abonnement (collection « plans »). |
| `jetons_ia` | entier |  | Jetons IA offerts (consommable). |
| `nkorouna` | entier |  | Type « nkorouna » : nombre de Nkorouna (NKR) crédités quand le pack est payé en FCFA. |
| `prix_nkr` | entier |  | Prix en Nkorouna (vide = ne s'achète pas en Nkorouna ; jamais pour un pack de Nkorouna). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Créations publicitaires — `pub_creations`
Publicités maison servies par la passerelle (en attendant ou à côté de Revive).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `zone` | texte | oui | Zone (bandeau_accueil, recompense_coeur…). |
| `annonceur` | texte |  | Annonceur. |
| `campagne_id` | texte |  | Campagne de la régie (créée dans la console) ; vide = création libre. |
| `format` | choix (bandeau / natif / plein_ecran / audio / video) |  | natif = publication sponsorisée mêlée aux listes. |
| `cta` | texte |  | Texte du bouton (Découvrir, Appeler…). |
| `titre` | texte |  | Texte. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `lien` | url |  | Lien au clic. |
| `texte_alt` | texte | oui | Texte alternatif. |
| `debut` | date |  | Début. |
| `fin` | date |  | Fin. |
| `plafond_jour` | entier |  | Affichages par jour (0 = sans plafond). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

