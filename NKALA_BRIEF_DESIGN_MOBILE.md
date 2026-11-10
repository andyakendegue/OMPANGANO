# Nkala : brief Design pour l'interface de l'application mobile

À coller dans Design. Complète `NKALA_IDENTITE_VISUELLE.md` (charte, logo, accessibilité) sans la remplacer. Les fonctions de chaque module sont dans `NKALA_PLAN_DEVELOPPEMENT.md`.

## 1. Ce qu'on demande

Imaginer l'interface complète de l'application mobile **Nkala** (iOS et Android, Expo) : un UX/UI **intuitif, ludique, vivant, coloré et joyeux**, qui donne envie de rester et de revenir chaque jour.

Écrans et modules à concevoir :
- **Ompangano** (contribuer) : accueil, enregistrer sa voix, valider, classement, badges, défis, profil.
- **Onenji / Apprendre** : cours, leçons, parcours par étapes de la vie.
- **Azeva / Jeux** : hall, jeux, défi du jour, classements, succès.
- **Ontci / Écouter** : lecteur de musique, radio, télévision.
- **Nkala / Vie citoyenne** : carte, **annuaire**, annonces, actualités.
- Transversal : inscription, connexion, navigation, états vides, chargement, hors-ligne, récompenses.

## 2. Le problème à corriger : l'app n'a pas hérité de la vie du site

Le site est chaleureux et riche ; l'app mobile en est une version **terne**. Constat relevé dans le code :

| | Site web (`src/index.css`, composants) | App mobile aujourd'hui (`apps/nkala/src`) |
|---|---|---|
| Fond | Motif à points terracotta/ambre, halos flous | Aplat `#170D08` sur mobile (le motif n'existe que sur le web) |
| Boutons | Dégradé terracotta 135° `#C85A32 → #B84A28 → #99381B`, ou ambre `#F59E0B → #D97706 → #B45309`, ombres, `rounded-xl` | Aplat `#27150C` avec un simple liseré, rayon 12, aucune ombre |
| Cartes | Dégradé chaud `rgba(46,26,17,.85) → rgba(28,16,11,.95)`, bord ambre translucide, rayons 16 à 24, ombres | Aplat `#27150C`, bord 1 px |
| Mouvement | Barres de son animées, transitions, confettis | Presque aucun |
| Profondeur | Verre dépoli, halos, couches | Plat |

**Consigne** : repartir **à l'identique** de l'identité du site (mêmes couleurs, mêmes dégradés, mêmes arrondis, mêmes polices), avec la même richesse de surfaces, puis aller plus loin. **Conserver tout ce qui a été ajouté dans l'app pour des parties qui n'existent pas sur le site** (Apprendre, Jeux, Écoute, validateur, administration, hors-ligne) : le restyler, pas le supprimer.

## 3. Socle visuel à reprendre du site

- **Couleurs** : fond `#170D08` (corps `#1A0F0A`), carte `#27150C`, bord `#4A2412`, terre `#C85A32`, ambre `#F59E0B`, texte `#FED7AA`, discret `#A8826D`, blanc chaud `#FDFAF7`, signaux vert `#22C55E`, rouge `#EF4444`, teal `#0D9488`.
- **Dégradés** : « terracotta » et « ambre chaud » (valeurs ci-dessus), carte chaude à bord ambre translucide (`rgba(217,119,6,.18)`).
- **Polices** : Outfit (titres, chiffres, boutons), Plus Jakarta Sans (texte).
- **Motifs** : points tissés façon pagne, bordure « kente » (terre, ambre, brun rouge).
- **Formes** : grands rayons (16 à 24 px), pastilles rondes, ombres chaudes, verre dépoli sur les barres.
- **Mouvement existant** : onde sonore (barres qui pulsent), confettis de récompense.

Contraintes de contraste : voir `NKALA_IDENTITE_VISUELLE.md` §2.2 (le texte courant ne doit pas être `#C85A32` sur carte ; foncer les boutons à `#B84A28` ou plus).

## 4. Ce qu'on veut sentir (par module)

**Principe général** : aucune liste inerte. Chaque écran a une image, une couleur, un mouvement, une récompense ou une raison de continuer.

### Accueil
- Salutation personnelle, **série de jours** (flamme/feu de veillée), objectif du jour, « reprendre là où j'en étais ».
- Carte du **défi du jour**, nouveautés, mot du jour avec son audio.
- Une seule action principale très visible.

### Apprendre (Onenji)
- Cours présentés comme un **parcours illustré** (chemin qui serpente, étapes, étapes verrouillées, trophées), pas comme un tableau. Parcours *Ntina, Ogèndo, Emeno, Ikôkô* (étapes de la vie), avec une identité colorée par étape.
- Leçon courte, **interactive** : écouter, répéter, associer image et mot, glisser-déposer, dire à voix haute. Retour immédiat (animation de réussite, son, vibration).
- Progression visible : anneaux, barre qui se remplit, niveaux, certificats, **séries**.
- Cours d'artisans en vidéo : vignettes grandes et vivantes, chapitres, reprise.
- Cycles 1-2 (jeunes enfants) : **sans lecture** : icônes, sons, couleurs vives, grands boutons.
- Assistant IA : personnage ou avatar chaleureux, bulles animées.

### Jeux (Azeva)
- **Hall façon salle de jeux vivante** : salles colorées (Mots, Corps, Maison, Nature, Nombres…), défi du jour, jeux à reprendre, classements.
- Chaque jeu : sa couleur, ses animations, ses sons, ses effets de victoire, ses cœurs et son minuteur lisibles (pendu, anagrammes, mots mêlés, dictée, jeu de société avec dé…).
- Récompenses : points, étoiles, succès, avatars à débloquer, confettis.
- **Social** : classements par ami, village, ethnie ; duels.
- Le ton est celui du **jeu joyeux**, jamais celui d'un casino (pas de machine à sous, de néon, de pression). La salle des paris est **fermée** : ne rien dessiner qui l'annonce.

### Écouter (Ontci)
- **Donner envie d'écouter** : pochettes grandes, couleur dominante tirée de la pochette, dégradés, grandes rangées horizontales (« à la une », « nouveautés », « gabonais du moment »).
- **Lecteur plein écran** vivant : pochette, onde sonore animée, paroles défilantes, gestes (glisser pour changer), mini-lecteur flottant toujours accessible.
- Radio en direct avec indicateur « EN DIRECT », télévision, playlists, téléchargements, récemment écoutés.
- Démarrage de la lecture perçu comme **instantané** (état de chargement élégant).

### Annuaire et carte (Nkala)
- **Donner envie de chercher** : barre de recherche large et engageante en haut, suggestions, recherches récentes, catégories en grandes tuiles illustrées (santé, pharmacie de garde, administration, marchés, taxis, restaurants…), « près de moi ».
- Carte vivante avec épingles colorées par catégorie, fiches qui glissent depuis le bas, appel et itinéraire en un geste.
- Résultats en cartes riches (photo, ouvert/fermé, distance, note), jamais en simple liste de texte.

### Ompangano (contribuer)
- Enregistrement : gros bouton d'enregistrement, **onde en direct**, retour sonore, encouragement.
- Récompense immédiate à chaque contribution : XP, badge, confettis, avancée vers le défi de la semaine.
- Classement, badges et rangs (« Initié Curieux » à « Sage Ancien ») mis en scène.

## 5. Moteurs de rétention à intégrer à l'interface

Série quotidienne, défi du jour, objectifs et anneaux de progression, niveaux et rangs, badges et succès à débloquer, classements, récompenses variées, rappels doux (notifications), « reprendre » partout, contenu nouveau visible, progression partagée entre modules (un seul profil, un seul XP).

Contrainte éthique : encourager sans manipuler ; pas de pression culpabilisante, pas de mécanique d'addiction, pas de publicité intrusive dans les parcours d'apprentissage ou d'enfants.

## 6. Icônes, images, illustrations

- **Jeu d'icônes sur mesure**, cohérent (même épaisseur, mêmes angles), inspiré des formes de l'identité (motifs tissés, géométrie) ; remplace les emojis actuels là où c'est possible.
- **Illustrations** pour : accueil, états vides, réussite/échec, étapes de la vie, salles de jeu, catégories de l'annuaire, onboarding.
- **Personnage ou mascotte** : proposition libre de Design (À décider : oui/non).
- **Pochettes, avatars, badges, trophées** : famille graphique unique.
- Chaque module a une **teinte d'accent** propre dans la palette chaude, tout en restant reconnaissable comme Nkala.

## 7. Mouvement et son

- Micro-animations partout (appui, apparition, réussite), ressort léger, 200 à 400 ms.
- Écrans de victoire et de passage de niveau mémorables.
- Sons et vibrations discrets, **désactivables**.
- Respect de « réduire les animations » du système.

## 8. Contraintes réelles d'usage

- **Mobile d'abord**, pouce unique, grandes zones tactiles (≥ 44 pt), navigation basse à 5 entrées maximum.
- **Hors ligne fréquent** : état visible, contenus téléchargeables, actions mises en file.
- **Plein soleil** : proposer une variante **claire** de l'interface (la version actuelle est uniquement sombre).
- **Connexions lentes et téléphones modestes** : animations légères, images adaptatives, états de chargement soignés.
- **Écriture du myènè** : polices et interlignes qui rendent ô, è, ɛ, ɔ, ṉ, ṽ sans coupure (voir `_contexte/REGLES_ENCODAGE.md`).
- **Accessibilité** : contrastes WCAG 2.1 AA, texte agrandissable, lecteurs d'écran, ne jamais transmettre une information par la seule couleur.
- Publics de 3 ans aux anciens : prévoir un mode enfant (simple, sans lecture) et un mode lisible (gros caractères).
- Vocabulaire : « ethnie » (pas « tribu »), « Autre » quand une ethnie n'est pas dans la liste.

## 9. Livrables attendus

1. Principes d'interface et **système de composants** (boutons, cartes, champs, onglets, barres, puces, fenêtres, états) en clair et en sombre.
2. **Écrans clés** de chaque module (voir §1), avec états : vide, chargement, erreur, hors ligne, réussite.
3. **Parcours** : première ouverture → inscription → première contribution/leçon/partie → retour le lendemain.
4. Lecteur audio (mini et plein écran), fiche de cours, écran de jeu type, carte et fiche annuaire.
5. **Jeu d'icônes et d'illustrations**, badges et trophées.
6. Spécifications de mouvement (durées, courbes, déclencheurs).
7. Valeurs exportables pour le code : couleurs, dégradés, rayons, ombres, espacements, tailles de texte (pour `apps/nkala/src/theme.ts`).

## 10. À décider avec Capp

Mascotte oui/non ; variante claire dès le départ ou plus tard ; teinte d'accent de chaque module ; niveau d'animation maximal accepté sur téléphones modestes ; place de la publicité récompensée dans les jeux.

### Décisions de Capp (10 nov. 2026)
- **Navigation** : Accueil · Apprendre · Jouer · Écouter · Village. Ompangano dans le menu « Plus ». Carte, Annuaire, Annonces, Actus, Commune+ deviennent les onglets internes du Village.
- **Accent d'Azeva** : jaune `#FDE047`.
- **Mascotte** : oui. Elle s'appelle **Ozangué** (« la lumière » en ôrungu) : la barre de voix du symbole, avec deux yeux. Elle guide les leçons, sert d'assistant IA et accompagne les états.
- **Thème clair** : dès la première version ; suit le réglage du téléphone.
- **Animations sur téléphones modestes** : légères (onde sonore et 20 confettis au plus ; flamme et rebonds coupés).
- **Publicité récompensée dans les jeux** : au choix du joueur, 3 par jour au plus, écran de fin de partie seulement, jamais en mode enfant ni dans une leçon.
- **Ton** : tutoiement pour l'accueil, les jeux et les enfants ; vouvoiement pour les services citoyens.
- Maquettes : canevas Design « Nkala · Toutes les vues de l'app mobile » (https://claude.ai/artifact/J6N7XQZpLjeTn54nBFfkkv), 99 écrans + 5 en version claire.
- **Rangs** (remplace « Initié Curieux » → « Sage Ancien ») : les 7 classes d'âge ôrungu du programme de formation (1er nov. 2026) : *Ekèï-kèï*, *Iwanjo* (garçon) ou *Isesa* (fille), *Olèngwani*, *Okengele*, *Onerwama*, *Onèró*, *Mbolo*. Seuils d'XP proposés : 0, 500, 1 500, 4 000, 8 000, 15 000, 30 000. *Onerwama* : définition à fournir par Capp.
- **Rangs, mise à jour** : 8 classes avec *Omwana* (dès 1 an) entre *Ekèï-kèï* et *Iwanjo*/*Isesa* ; *Onerwama* = « la tradition, avant Onèró » (Capp). Seuils d'XP proposés : 0, 200, 500, 1 500, 4 000, 8 000, 15 000, 30 000.
