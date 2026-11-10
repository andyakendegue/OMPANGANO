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
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Exercices — `exercices`
Écouter-répéter, associer image et mot, remettre en ordre, dire à voix haute, choix.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `lecon_id` | texte → `lecons` | oui | Leçon parente. |
| `type` | choix (ecouter / associer / ordre / dire / choix) | oui | Type d'exercice. |
| `consigne` | texte |  | Consigne affichée (texte ou lue). |
| `mot_myene` | texte |  | Mot ou phrase en myènè (source obligatoire). |
| `mot_francais` | texte |  | Traduction française. |
| `options` | liste |  | Choix proposés, séparés par \| (associer, choix) ou mots à remettre en ordre. |
| `reponse` | texte |  | Bonne réponse (libellé exact d'une option, ou phrase complète pour « ordre »). |
| `indice` | texte |  | Aide affichée après une erreur. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `audio` | url |  | Fichier audio (adresse https ou chemin du stockage). |
| `dialecte` | texte |  | Dialecte (ôrungu, omyènè…). |
| `source` | texte |  | Source du contenu (document et page) : obligatoire pour tout mot myènè. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |

### Cours d'artisans — `cours_artisans`
Cours vidéo donnés par des artisans.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre du cours. |
| `artisan` | texte | oui | Nom de l'artisan. |
| `metier` | texte |  | Métier (vin de palme, hors-bord, cuisine…). |
| `description` | long |  | Description. |
| `video_url` | url |  | Vidéo ou playlist HLS. |
| `sous_titres_url` | url |  | Fichier de sous-titres (.vtt). |
| `duree_min` | entier |  | Durée totale en minutes. |
| `niveau` | choix (debutant / intermediaire / avance) |  | Niveau. |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Qui peut ouvrir ce contenu (libre par défaut). |
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
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |

### Bibliothèque — `bibliotheque`
Livres, annales, documents libres de droits.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `auteur` | texte |  | Auteur. |
| `type` | choix (livre / annale / fiche / audio / autre) |  | Type. |
| `langue` | texte |  | Langue. |
| `url` | url |  | Fichier ou page. |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Qui peut ouvrir ce contenu (libre par défaut). |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
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

### Jeux — `jeux`
Jeux du hall ; le moteur détermine le fonctionnement.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `salle_id` | texte → `salles` | oui | Salle. |
| `titre` | texte | oui | Titre. |
| `moteur` | choix (pendu / anagramme / mots_meles / dictee / qcm / ordre / plateau / memoire) | oui | Moteur de jeu. |
| `description` | texte |  | Description. |
| `couleur` | texte |  | Couleur d'accent #RRGGBB. |
| `duree_s` | entier |  | Durée de la partie (secondes, 0 = sans limite). |
| `mode_enfant` | booleen |  | oui/non : disponible en mode enfant. |
| `ordre` | entier |  | Position dans la liste (1, 2, 3…). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Mots des jeux — `mots_jeux`
Mots supplémentaires pour les jeux (en plus des fiches validées du corpus).

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
| `condition` | choix (parties / victoires / serie / points / lecons / contributions) | oui | Compteur observé. |
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
| `audio_url` | url |  | Flux audio (HLS) ou fichier. |
| `paroles` | long |  | Paroles (une ligne par ligne chantée). |
| `traduction` | long |  | Traduction ligne à ligne. |
| `genre` | texte |  | Genre. |
| `niveau_acces` | choix (libre / gratuit_avec_pub / abonnement / achat / essai / location / reserve) |  | Qui peut ouvrir ce contenu (libre par défaut). |
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
Textes des rappels, encouragements et phrases d'Ozangué.

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `type` | choix (rappel / encouragement / bienvenue / defaite / victoire / ozangue) | oui | Type. |
| `texte` | texte | oui | Texte (tutoiement sauf services citoyens). |
| `ton` | choix (tu / vous) |  | Tutoiement ou vouvoiement. |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Produits payants — `produits`
Abonnements et achats intégrés (aucun prix n'est fixé dans le code).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `titre` | texte | oui | Titre. |
| `type` | choix (abonnement / achat / consommable) | oui | Type. |
| `prix_fcfa` | entier |  | Prix en FCFA. |
| `periode` | choix (mois / an / unique) |  | Période. |
| `donne_acces` | liste |  | Modules ou contenus débloqués, séparés par \|. |
| `jetons_ia` | entier |  | Jetons IA offerts (consommable). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

### Créations publicitaires — `pub_creations`
Publicités maison servies par la passerelle (en attendant ou à côté de Revive).

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | texte | oui | Identifiant unique, sans espace (lettres, chiffres, tiret, souligné). |
| `zone` | texte | oui | Zone (bandeau_accueil, recompense_coeur…). |
| `annonceur` | texte |  | Annonceur. |
| `titre` | texte |  | Texte. |
| `image` | url |  | Image (adresse https ou chemin du stockage). |
| `lien` | url |  | Lien au clic. |
| `texte_alt` | texte | oui | Texte alternatif. |
| `debut` | date |  | Début. |
| `fin` | date |  | Fin. |
| `plafond_jour` | entier |  | Affichages par jour (0 = sans plafond). |
| `publie` | booleen |  | oui/non : visible dans l'application (non par défaut = brouillon). |

