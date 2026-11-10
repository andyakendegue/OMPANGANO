# Nkala : audit complet et plan de développement (version 2, 2 nov. 2026)

Cible : une super app **Nkala** (Expo : iOS, Android, web) qui réunit, dans cet ordre de développement :

1. **Onenji** : les **cours**, donnés par un **assistant IA**, selon un cursus par étapes de la vie. Aucun jeu dedans.
2. **Azeva** : la **salle de jeux** (nouveau module). Tous les jeux y vont.
3. **Ontci** : l'écoute : musique, web radio, web TV (dont la chaîne gratuite de football), et ce qui s'y rattache directement.
4. **Nkala** : la super app citoyenne « Commune+ — Notre communauté » : carte, annonces, services de proximité, voyages, services administratifs, communauté, portefeuille, magazine, éducation (voir §6 et §6bis, qui intègrent vos notes du 2 nov.).

La partie contributeur (Ompangano : collecte, Ezango, classement, profil, administration) existe déjà ; voir `NKALA_EXPO.md` et `NKALA_ECARTS.md`.

## 0. Ce qui a été relu, et ce qui manque

**Notes Apple Notes** : lues le 2 nov. (autorisation de Capp) pour « Onenji » et « Ontci » ; analyse au §10.

**Dépôts retrouvés sur le Mac** (`~/Projets`) et relus (structure complète, puis lecture des fichiers clés : routes, modèles, règles de sécurité, dépôts de données, écrans, spécifications) :

| Dépôt | Contenu | Taille | Remote |
|---|---|---|---|
| `nkala-app` | Application Nkala (Flutter, GoRouter, Bloc, Firebase `enenga`) | 93 fichiers Dart, ≈ 15 000 lignes | `bitbucket.org/akendengue/nkala-app` |
| `stream/essaka-play` | Ontci : application d'écoute grand public (Flutter, Riverpod, Firebase `ontci-21a78`) | 168 fichiers Dart, ≈ 13 700 lignes | `bitbucket.org/akendengue/essaka-play` |
| `stream/ontci-backend` | Application des artistes (Flutter/Nylo) + Cloud Functions | 109 fichiers | `bitbucket.org/akendengue/ontci-backend` |
| `stream/firecms-ontci` | Console d'administration du catalogue (React, FireCMS) | 31 fichiers | `bitbucket.org/akendengue/firecms-ontci` |
| `stream/ontci-laravel` | Backend de confiance (Laravel) : rôles, webhook Mobile Money | 8 fichiers | — |
| `stream/azuracast` | Configuration du serveur radio/vidéo (`stream.essaka.engineering`) | 3 fichiers | — |
| `~/Projets/stream/SPECS.md`, `essaka-play/SPECS*.md`, `AUDIT-STREAMING.md`, `ARCHITECTURE.md` | Spécifications et audits d'Ontci | ≈ 900 lignes | — |

**Introuvable : le code d'Onenji.** Il n'y a **aucun dépôt Onenji ni Azeva** sur le Mac (recherche dans `~/Projets` et `~` : aucun nom, aucun remote). Onenji n'existe que comme **documents** (`~/Projets/DONDO/14_programme_et_jeux/`, `_contexte/ONENJI_THEMES.md`) et comme **quatre jeux déjà codés dans l'application Expo** (`apps/nkala/src/Onenji.tsx`). Les cinq dépôts de jeux de référence cités (`eduprog_game_math` « Itango », `FlutterQuizzApp`, `Flutter-BabyStepsQuiz`, `CrossWord-Generator`, `Hangman-Game-Flutter`) **ne sont pas clonés** : je n'ai pas pu les lire. Si vous avez un dépôt Onenji ou Azeva ailleurs (autre dossier, autre machine), dites-moi où.

**Limites de la relecture.** J'ai lu les fichiers qui portent la logique (modèles, routeurs, dépôts, règles Firestore, formulaires, pages de synthèse) mais **pas chaque ligne** des ≈ 29 000 lignes Flutter ; les écrans purement visuels sont décrits d'après leur code de haut niveau. Rien n'a été exécuté. Les points non confirmés sont marqués « à vérifier ».

## 1. Décisions déjà prises (vos consignes du 2 nov.)
- **Onenji = cours donnés par un assistant IA**, avec un cursus par étapes de la vie. Ce n'est pas un jeu.
- **Azeva = salle de jeux**, séparée d'Onenji. Onenji est émancipé de tous les jeux.
- **Ordre de développement : Onenji, Azeva, Ontci, Nkala.**
- Le verrou administrateur sur Onenji/Ontci est levé dans Expo (onglets visibles de tous).

## 2. Blocs transversaux (à traiter dans le module qui en a besoin d'abord)

| # | Bloc | Besoin | Module qui le déclenche |
|---|---|---|---|
| T1 | Test sur appareil de la partie contributeur (micro, notifications, flux temps réel, SQLite) : **jamais fait** | tout | avant Onenji |
| T2 | Navigation de la super app : onglets Contribuer / Onenji / Azeva / Écoute / Nkala (services, annonces) / Profil / Administration ; `MODULES` dans `packages/noyau/src/modules.ts` à étendre (`azeva`) | tout | Onenji |
| T3 | Interrupteurs de modules **côté serveur** (publier ou masquer sans republier l'app) | tout | Onenji |
| T4 | Connexion par **téléphone (OTP)** en plus d'e-mail et Google (Nkala et Ontci l'utilisent) ; **compte unique** | Ontci, Nkala | Ontci |
| T5 | Stockage de médias et droits par module (Garage S3 existe) | tous | Onenji (voix, images) |
| T6 | Régie publicitaire (`REVIVE_ADSERVER.md`), publicité récompensée, **registre d'emplacements dès la conception des écrans** (§10bis.1) | tous les modules | **étape 0**, puis Azeva |
| T7 | Paiements, **droits d'accès, abonnements et achats intégrés** (§10bis.2) | tous les modules | **étape 0 (modèle et `peutAcceder`)**, puis Ontci |
| T8 | Production : EAS build, comptes Apple et Google, signature, confidentialité, fiches de magasin, `eas update:configure`, OAuth Google iOS/Android | tout | dès qu'un module est prêt |
| T9 | Tests automatisés (noyau d'abord) | tout | en continu |
| T10 | **Protection des contenus audio et vidéo, niveaux 1 et 2 (DRM Nkala)** (§5.6bis) | Ontci, Onenji | Onenji (vidéo), Ontci (audio) |
| T12 | **Comptage des jetons de l'IA** (passerelle IA, quotas, journal) (§10bis.3) | Onenji, tout futur usage d'IA | Onenji (O5) |
| T11 | **Appels et cours en direct de pair à pair, chiffrés de bout en bout** (§3.5) | Onenji, Nkala (chat, appels) | Onenji |

## 3. Module 1 : Onenji (module de Nkala : cours par assistant IA, cours d'artisans en vidéo, MOOC)

**Décisions de Capp (2 nov., suite) :** Onenji est **un module de Nkala** (onglet « Apprendre » de la super app ; pas d'application séparée). Il accueille (a) les **cours de langue et de culture donnés par un assistant IA**, (b) des **cours d'artisans en vidéo**, (c) une **bibliothèque et une librairie**, (d) les **cours à distance en visioconférence**, (e) les **opportunités pour la jeunesse**. Il fonctionne comme une **plateforme de cours en ligne ouverts (MOOC)**. **Aucun jeu** : tous les jeux vont à Azeva. Les questions de rémunération, de revenus et de technique sont **retirées de cette partie** à votre demande.

**Sources.** Documents DONDO (`14_programme_et_jeux/`, `_contexte/ONENJI_THEMES.md`) et notes Apple Notes « Onenji » (voir §10).

### 3.1 Ce que disent les notes et documents
- **Sens et mission** : *Onenji* signifie « l'enseignant » en myènè. Faire passer la culture de la tradition orale à la tradition écrite ; cours, éléments didactiques, œuvres littéraires ; une offre éducative différente des programmes d'État.
- **Cibles** : jeunes et enfants de 7 à 18 ans (principale) ; jeunes adultes et adultes (secondaire) ; institutions académiques et organisations pédagogiques (intermédiaire).
- **Parcours par étapes de la vie** : quatre modules *Ntina* (3-7 ans), *Ogèndo* (7-13), *Emeno* (13-21), *Ikôkô* (21+) ; dans le programme, six cycles et sept classes d'âge ôrungu (*Ekèï-kèï* à *Mbolo*). Les thèmes de chaque module sont dans la note « Cours et Jeux Onenji » : nombres, formes, grandeurs, temps, espace, corps humain, nature (pharmacopée, agriculture, environnement), valeurs par proverbes, contes et expressions, spiritualité, activités du quotidien, hygiène, chansons, famille, artisanat, habillement, cuisine, santé, amour, droit (mariage, fiançailles, adoption, reconnaissance en paternité, décès, conseil de famille).
- **Cours d'artisans et de savoir-faire** (notes Commissions, volet Éducation) : cuisine, artisanat, art oratoire, art vestimentaire, arts musicaux, **fabrication du vin de palme**, **formation au métier de hors-bord et maintenance des moteurs hors-bord**, initiation à l'informatique et à la bureautique, cours de soutien, **numérisation de cours de tradition orale**, édition de supports de cours. Ce sont les contenus des **cours d'artisans en vidéo**.
- **Application Onenji** (Commission NTIC) : cours, opportunités pour la jeunesse, bibliothèque, librairie.
- **Règle des cours** : des cœurs par défaut, un cœur perdu à chaque mauvaise réponse, des points gagnés à chaque bonne réponse et qui rechargent les cœurs.
- **Cours audiovisuels** : un son est émis et l'élément correspondant s'affiche ; **contrôles 1 à 7** (toucher l'élément, choisir le nom d'une image, prononcer, remettre en ordre, compléter, glisser-déposer, choisir la bonne réponse). Ce sont des **vérifications de cours** : elles servent aux **contrôles de fin d'unité** d'Onenji.
- **Cours à distance** : intervenants pressentis Tonton Brice SENAH et Apé ; plan d'action avec objectifs à écrire.
- **Bibliothèque** : livres libres de droit (sources anglophones notées) ; « négocier avec Présence Africaine la mise à disposition des livres ».
- **Calendrier institutionnel** (Plan A) : **extension d'Onenji à l'international en 2029** ; **validation des contenus éducatifs** par l'Institut Pédagogique National (proposition à valider).

### 3.2 Ce qui existe dans Expo
Seulement les **4 jeux** avec cœurs et points. **Ils partent dans Azeva.** Les écrans de choix, d'ordre et d'écoute servent de base aux contrôles de fin d'unité.

### 3.3 Conception fonctionnelle d'Onenji (module de Nkala)

**Rôles** : apprenant, **créateur** (artisan, enseignant), **précepteur** (accompagnement personnalisé), **modérateur de contenu**, **validateur de langue** (locuteur), administrateur.

**Structure d'un cours** : *parcours* (cursus par étape de la vie) → *cours* → *modules* → *leçons*. Types de leçon : **vidéo** (sous-titres omyènè et français, vitesse, reprise, hors-ligne), audio, texte, contrôle, **devoir** à rendre (photo, audio ou vidéo de l'apprenant), **séance en direct**. Progression, **certificats** (attestation Essaka Engineering), questions par cours, notes et avis.

**Fonctions**
- **Accueil « Apprendre »** : « reprendre » ma leçon, mon parcours selon mon âge, cours recommandés, mes certificats.
- **Catalogue et recherche** : par étape de vie, thème, créateur, durée, langue.
- **Assistant IA enseignant** : tuteur conversationnel (texte, puis voix) qui explique, fait pratiquer, corrige selon les règles du corpus (ôrungu, corrections de Capp, source et page citées) et pose les questions de contrôle ; hors corpus, il le signale. Limites et filtrage pour les enfants à définir.
- **Cours d'artisans en vidéo** : le créateur propose un cours (vidéo, fiches, matériel), il est relu et publié ; l'apprenant le suit, s'exerce et peut rendre un devoir.
- **Studio de création** pour créateurs et administrateurs : ajout de vidéos, chapitres, sous-titres, contrôles, brouillon, relecture, publication.
- **Bibliothèque et librairie** : consultation de livres libres de droit (sources francophones et africaines à ajouter) et de livres propres au projet.
- **Opportunités pour la jeunesse** : bourses, stages, conférences, emplois (fil modéré).
- **Cours à distance** : séances en direct avec un enseignant ou un précepteur, **en pair à pair chiffré de bout en bout** (voir §3.5), avec consentement pour tout enregistrement.
- **Vidéo** : lecture **instantanée par segments** avec les mêmes principes que le lecteur audio d'Ontci (§5.6 : démarrage sur un petit segment, préchargement de la leçon suivante, cache local plafonné, plusieurs qualités pour les connexions modestes), et **protection contre la récupération du fichier** (§5.6bis).
- **Contrôles de fin d'unité** : cinq questions, réussite à quatre ; composants communs avec Azeva.
- **Accessibilité** : hors-ligne, cycles 1 et 2 sans lecture (voix et images), malvoyants, malentendants (sous-titres).
- **Données produites** : les réponses des apprenants n'entrent dans le corpus **qu'après validation par un locuteur**, avec accord.

### 3.4 Décisions pour Onenji
1. Limites de l'assistant IA envers les enfants (âge, filtrage, contenus sensibles).
2. Qui valide les contenus et les cours d'artisans (Institut Pédagogique National ? validateurs ôrungu ?) ; consentement et droit à l'image des artisans filmés.
3. Harmonisation Ntina/Ogèndo/Emeno/Ikôkô, six cycles et sept classes d'âge ; noms des niveaux ; définition d'*Onerwama*.
4. Cible d'âge : les notes disent **7 à 18 ans**, le programme part de **3 ans**.
5. Sources de livres : ajouter des bibliothèques francophones ; accord Présence Africaine.
6. Les cœurs et points restent-ils attachés aux cours (selon la note) ou à Azeva ?
7. Cours en direct : pair à pair, **groupes de 4 au maximum** (décidé) ; comment l'enseignant répartit une classe en groupes (§3.5).
8. Protection : niveaux 1 et 2 décidés ; DRM Nkala (§5.6bis) ; **budget et délai du niveau 2** (taille XL) et **demande éventuelle d'accès à Widevine et FairPlay** pour plus tard.

### 3.5 Vidéo protégée et cours en direct de pair à pair (précisions de Capp, 2 nov.)

**Vidéo : même doctrine que l'audio.** Le transcodage découpe chaque vidéo en **segments courts** à **plusieurs qualités** (comme la musique d'Ontci, §5.6) : le début démarre vite, la qualité s'adapte au réseau, la leçon suivante est préchargée, une copie plafonnée reste en cache. La **protection contre la récupération** est la même que pour l'audio : voir §5.6bis. Elle s'applique aux cours d'artisans payants et aux téléchargements hors-ligne.

**Visioconférence sans serveur, de pair à pair, chiffrée de bout en bout, en UDP : oui, en grande partie, avec trois précisions.**
- **Ce qui est vrai** : la technologie **WebRTC** fait exactement cela : le flux audio et vidéo circule **directement d'un appareil à l'autre**, en **UDP** par défaut, chiffré (DTLS-SRTP) entre les deux appareils. Entre deux participants, personne d'autre ne peut le lire. C'est aussi ce qu'utilisait l'application Nkala en Flutter (appels pair à pair).
- **« Sans serveur » : pas tout à fait.** Il faut quand même : (1) un **petit serveur de signalisation** pour que les deux appareils s'échangent leurs coordonnées au début (notre API peut le faire, il ne voit jamais le contenu) ; (2) un **serveur STUN** (simple, léger) pour que chaque appareil découvre son adresse publique ; (3) un **relais TURN** quand la connexion directe est impossible (cas fréquent derrière le NAT des opérateurs mobiles) : il relaie des paquets **déjà chiffrés** qu'il ne peut pas déchiffrer, mais il consomme de la bande passante. Sans TURN, une partie des appels échoueront.
- **Groupes : 4 personnes au maximum** (décision de Capp, pour un meilleur suivi). C'est aussi la limite raisonnable du pair à pair (chaque participant envoie son flux à tous les autres) : **aucun serveur de distribution n'est nécessaire**. Une classe plus grande se divise en **plusieurs groupes de 4**, l'enseignant passant de l'un à l'autre ; la limite est **appliquée par le serveur de signalisation** (la 5e personne est refusée).
- **Chiffrement vraiment de bout en bout** : afficher un **code de sécurité** que les deux personnes comparent (ou une vérification du compte) pour qu'un serveur de signalisation malveillant ne puisse pas s'interposer.
- **Enregistrement** : impossible côté serveur en pair à pair ; chaque participant enregistrerait lui-même (avec consentement).
- **Mise en œuvre** : `react-native-webrtc` (exige une **version de développement**, pas Expo Go) ; vérifié aussi pour le chat et les appels de Nkala (N12).

### 3.6 Éléments techniques d'Onenji (socle déjà établi ; ceux des notes sont écartés)
Rétablis après votre précision : ils relèvent du socle technique de Nkala, pas des notes.
- **Vidéo** : stockage objet existant (Garage S3), **transcodage en segments à plusieurs qualités** (ffmpeg, format de diffusion par segments), lecture par `expo-video`, téléchargement hors-ligne chiffré ; protection selon §5.6bis.
- **Appels** : `react-native-webrtc` (version de développement), signalisation par l'API existante, **limite de 4 participants par groupe** (§3.5).
- **Protection** : modules natifs de déchiffrement et serveur de licences (DRM Nkala, §5.6bis).
- **Données serveur à créer** : `courses`, `course_modules`, `lessons`, `enrollments`, `lesson_progress`, `quiz_attempts`, `certificates`, `course_reviews`, `creators`, `live_sessions`, `preceptor_bookings`, `books`, `opportunities` ; routes et droits par rôle ; interrupteur de module (T3).
- **Retirés** : les outils cités dans les notes (LiveKit, `flutter_webrtc`, Firebase, TensorFlow, développeurs Flutter) et tout ce qui concerne rémunération et revenus.

## 4. Module 2 : Azeva (salle de jeux)

**Source :** `14_programme_et_jeux/02_jeux_application_NKALA.md` (catalogue), `03_note_Jeux_Capp_originale.md`, `01_programme_*.md` (« Catalogue des jeux »), `essaka-play` (pronostics, `SPECS-COMMUNE.md` §0 et §7), les 4 jeux déjà codés.

### 4.1 Règles qui s'imposent
- **Conformité (SPECS-COMMUNE §0 et §9)** : les **paris sont prévus (décision du 2 nov.)** ; la salle des paris est **développée mais fermée** (`gamesRealMoney: false`) tant que le **dossier de cinq pièces** (avis d'avocat gabonais, agrément, jeu responsable, vérification d'identité et anti-blanchiment, éligibilité des magasins) n'est pas réuni : voir §4.6. Les **crédits de jeu** restent fictifs, non convertibles, non transférables (`gameCredits`) ; les pronostics gratuits restent sans mise ; jeu-concours gratuit : règlement public.
- **Règle des cœurs et des points** ; cœurs rechargés par le temps et par publicité récompensée (T6).
- Les jeux **lisent le corpus validé**, jamais de listes en dur ; chaque jeu produit ou valide des données (tableau de la note de Capp).

### 4.2 Inventaire des jeux (≈ 60)
**Déjà codés (4, à déplacer depuis Onenji)** : choisis la bonne phrase (contrôle 7), remets les mots en ordre (contrôle 4), écoute et choisis (contrôle 1), écoute et remets en ordre (variante).

**Contrôles audiovisuels à faire** : 2 image → nom ; 3 prononcer devant une image (nouvelles voix pour l'ASR/TTS) ; 5 remplir une case ; 6 glisser-déposer. Ils exigent des **images liées aux fiches** et l'envoi des réponses au corpus. *(Les mêmes formats serviront aux « vérifications » des cours d'Onenji : à partager comme composants.)*

**Jeux de mots (11)** : mots fléchés, mots croisés, mots mêlés, pendu, anagrammes, syllabes, mot-image, dictée sonore, singulier/pluriel (classes), mots jumeaux, familles de mots.
**Corps humain (6)** : touche ta tête, habille le squelette, puzzle du corps, Jacques a dit, le corps en chanson, chez le guérisseur.
**Objets du quotidien (7)** : la maison du village, range la case, le marché, qu'est-ce qui manque, à quoi ça sert, hier et aujourd'hui, l'artisan.
**Environnement (8)** : cri des animaux, mangrove, pêche, jardin, forêt et savane, lire le ciel, l'île qui s'en va, pharmacopée (savoir réservé exclu).
**Compter, mesurer, se repérer (11)** : compte avec moi, marché aux nombres, panier de noisettes, partage du poisson, plus grand/plus petit, suites, formes, quelle heure, calendrier, gauche/droite, la carte.
**Famille, société, histoire (6)** : arbre du clan, classes d'âge, qui fait quoi au village, salue comme il faut, la frise, la devise.
**Valeurs, oralité, arts (10)** : tô/tôngè, complète le proverbe, le sens caché, raconte la suite, la veillée, chanson des dix oiseaux (accord mandji.net), le rythme, habille-toi, la cuisine (accord mandji.net), le palabre.
**Jeux du catalogue du programme (14)** : recoupent la liste ci-dessus (imagier sonore, memory des animaux, course des verbes, ne pas confondre, le village, la côte myènè…) ; à dédoublonner.
**Grand jeu de société** : dé, crédits fictifs, parcours de l'enfance à l'âge adulte ; il **utilise les mini-jeux comme modules**.
**Venant d'Ontci** : pronostics de football (page existante dans `essaka-play`, données API foot), jeux gratuits et jeu-concours gratuit (`SPECS-COMMUNE` §7, **à faire même dans Flutter**).

### 4.3 Conception d'Azeva (la meilleure salle de jeux possible)

**Choix de conception (c'est ma décision, comme demandé).** Azeva est une **salle de jeux** au sens littéral : un hall d'accueil d'où l'on entre dans des **salles thématiques**, avec un joueur reconnaissable, des défis qui reviennent, des classements sociaux et des jeux courts jouables en une main. L'objectif : *jouable en 10 secondes, facile pour un enfant, assez riche pour un adulte, et qui enseigne vraiment la langue*.

**Principes d'ergonomie et d'UX**
1. **Trois touches pour jouer** : ouvrir Azeva, toucher « Jouer maintenant » (ou « Reprendre »), la manche commence. Pas de menu profond.
2. **Un hall qui propose, pas qui noie** : en haut le **défi du jour** et « reprendre » ; puis les **salles** en grandes tuiles illustrées ; puis « pour toi » (selon l'âge et le niveau). Recherche et filtres (âge, thème, durée, solo ou à plusieurs) en deuxième plan.
3. **Pouces d'abord** : cibles tactiles larges, actions principales en bas de l'écran, une main suffit ; glisser-déposer avec aimantation ; retour haptique et sons (réglables).
4. **Sans lecture** pour les petits : consignes **lues à voix haute**, pictogrammes, boutons énormes ; mode enfant sans publicité ni achat, sans classement public.
5. **Réussite immédiate** : le premier jeu est un essai de 30 secondes sans inscription ; la difficulté **s'adapte** (monte après trois réussites, descend après deux échecs).
6. **Retour clair** : bonne réponse = animation et son courts ; mauvaise = la bonne réponse est **montrée et dite** (le jeu enseigne), jamais de punition sèche.
7. **Engagement sain** : séries de jours (« flammes ») et défi du jour, **mais** rappels de pause, limite de durée réglable (parents), aucune mécanique de dépendance ni pression d'achat envers les enfants. *(La note de 2022 voulait des jeux « simples et addictifs » : je ne retiens que « simples et motivants ».)*
8. **Hors-ligne** : les jeux de mots et de mémoire tournent sans réseau avec le catalogue local ; scores synchronisés ensuite.
9. **Accessibilité** : contraste élevé, grandes polices, audio pour chaque mot, sous-titres, jamais d'information portée par la seule couleur.
10. **Identité** : univers visuel Nkala (fond à points, terracotta et ambre), illustrations du village, avatars tirés des classes d'âge ôrungu.

**Structure de la salle**
- **Hall** : défi du jour, reprendre, salles, classement du jour, amis en ligne.
- **Salles** : *Mots* (mots mêlés, fléchés, croisés, pendu, anagrammes, syllabes, dictée), *Images et mémoire* (mot-image, mémory, « montrer où se trouve le mot cité »), *Corps humain*, *Maison et objets*, *Nature et animaux*, *Nombres et formes*, *Société et histoire* (arbre du clan, classes d'âge, salue comme il faut), *Oralité* (devinettes tô/tôngè, proverbes, contes, rythme), *Grand jeu de société* (parcours de l'enfance à l'âge adulte avec dé), *Quiz musicaux* (en lien avec Ontci : « quiz musicaux avec bonus d'écoute », note Ontci Interfaces), *Pronostics* (football gratuit).
- **Modes** : solo ; **duel asynchrone** (on lance un défi à un ami, il répond quand il veut) ; **salon en direct** (2 à 6 joueurs, code de salle, WebSocket) ; **tournoi du village ou de la tribu** hebdomadaire.
- **Progression** : niveaux, **étoiles** par jeu, **succès** (badges), collection d'**avatars** et de décors débloqués, journal « mes mots appris » (réutilisé par Onenji pour réviser).
- **Classements** : amis, village, tribu, général ; saison mensuelle remise à zéro (récompenses non monétaires).
- **Économie** : **crédits de jeu fictifs** (non convertibles, non transférables, solde séparé du portefeuille) gagnés en jouant, par défis et par publicité récompensée ; cœurs rechargés par le temps ; **abonnement Azeva+** facultatif (sans publicité, salles supplémentaires). **Les paris d'argent réel sont une salle à part** (§4.6).
- **Parents et enseignants** : tableau de bord (temps joué, mots appris), classes avec code, devoirs de jeu.

**Architecture technique**
- **Interface de jeu commune** (`packages/azeva`) : chaque jeu est un module qui déclare `{ id, salle, ages, themes, modes, dureeMoyenne }` et fournit `creerManche(contexte)`, `valider(reponse)`, `scoreAttendu`, `donneesProduites()`. Le moteur gère cœurs, points, minuteur, sons, haptique, reprise, accessibilité ; les jeux ne font que leur règle.
- **Bibliothèques** : `react-native-reanimated` et `react-native-gesture-handler` (glisser-déposer, animations), `expo-haptics`, `expo-audio`, `expo-speech`, `expo-sqlite` pour le catalogue local.
- **Sources de contenu** : uniquement le corpus validé (fiches, audios, images) ; **aucune liste en dur**.
- **Serveur** : tables `game_catalog`, `game_sessions`, `game_results`, `game_credits_ledger` (journal ajout seul), `daily_challenges`, `leaderboards`, `achievements`, `game_rooms`, `game_answers` (statut `a_valider`) ; **le score est calculé côté serveur** (anti-triche) ; salons par WebSocket (le serveur a déjà le flux SSE `/v1/events`) ; interrupteurs de salles et de jeux (T3).
- **Données** : chaque manche peut produire des réponses étiquetées (`a_valider`, puis validées par un locuteur) comme le prévoit la note « Jeux » de Capp.

### 4.4 À développer (hors paris : voir §4.6)
Coquille et hall ; moteur et interface de jeu ; les 4 jeux repris ; envoi des réponses au corpus ; jeux de mots puis jeux illustrés ; défis du jour, classements, succès ; duel asynchrone puis salons en direct ; publicité récompensée (T6) ; grand jeu de société ; tableau de bord parents (voir §7).

### 4.5 Décisions pour Azeva
1. **Conformité des paris** : décidés le 2 nov. ; développement complet derrière interrupteur, ouverture seulement avec les cinq pièces du dossier (§4.6) ; **choix du premier format** (duel de compétence recommandé).
2. Limites de durée et mode enfant : valeurs par défaut.
3. Dépôts de référence : **seuls ceux sous licence MIT** (`Flutter-BabyStepsQuiz`, `Hangman-Game-Flutter`) sont réutilisables ; les autres servent d'inspiration ; ils sont tous en Flutter.
4. Accords de droits (mandji.net : chanson des dix oiseaux, recettes).
5. Calendrier : sources Hombouhiry p. 116-173 manquantes.
6. Récompenses de saison : lots non monétaires offerts par des sponsors ? règlement public.

### 4.6 Les paris dans Azeva (décision de Capp, 2 nov. 2026 : « on fera aussi des paris »)

**Ce qui change.** Azeva comprend désormais une **salle des paris** (jeux avec mise d'argent réel). Je la conçois et la développe **complètement, derrière un interrupteur serveur** (`gamesRealMoney`, par pays et par version de l'application). Je ne l'**ouvre au public** que lorsque les **cinq pièces du dossier** de `SPECS-COMMUNE.md` §9 sont réunies : (1) avis écrit d'un avocat gabonais sur la qualification de chaque jeu ; (2) agrément ou convention avec l'autorité compétente ou un opérateur agréé ; (3) politique de jeu responsable (plafonds, auto-exclusion, majorité 18 ans, vérification d'âge) ; (4) vérification d'identité et lutte contre le blanchiment sur Mobile Money ; (5) éligibilité des magasins d'applications (preuve de licence exigée par Google Play et l'App Store). Ce n'est pas un avis juridique : je n'ai pas vérifié le droit gabonais.

**Séparation stricte** : la salle des paris est **distincte** des salles d'apprentissage. Le **mode enfant** n'y donne **aucun accès** ; l'entrée exige 18 ans vérifiés. Les **crédits de jeu fictifs** ne se convertissent jamais en argent et ne servent jamais à parier ; le **portefeuille d'argent réel** est un compte séparé.

**Formats de paris prévus** (du plus simple au plus risqué)
1. **Duel de compétence entre joueurs** (mots, mémoire, calcul) : deux joueurs mettent la même somme, le meilleur emporte la cagnotte moins une commission affichée. Le résultat dépend de l'habileté, non du hasard.
2. **Pronostics à mise** (football) : cagnotte partagée entre les bons pronostics.
3. **Jeux de hasard** (dés, garâme) contre la maison ou entre joueurs : tirage **vérifiable** (graine engagée avant, révélée après, tirage côté serveur).
4. **Tombola mensuelle** à billets payants : tirage public horodaté.

**Garde-fous obligatoires (jeu responsable)**
- Majorité vérifiée avant l'accès ; **plafonds de dépôt, de mise et de perte** (jour, semaine, mois) fixés par le joueur et par la plateforme ; **délai de réflexion** à l'augmentation d'un plafond ; **pause** et **auto-exclusion** (durée choisie, irréversible pendant la période) ; **rappel de durée et de dépenses** ; relevé complet des mises et des gains ; aucun crédit avancé ; aucune publicité des paris dans les salles d'apprentissage ni vers des mineurs ; lien vers des aides.
- **Équité** : le serveur seul décide du résultat ; journal inaltérable ; détection de fraude (collusion, comptes multiples) ; règles et probabilités publiées avant de jouer ; procédure de réclamation.
- **Argent** : portefeuille séparé, **fonds des joueurs distincts des fonds de la société**, journal comptable en partie double (ajout seul), opérations **idempotentes**, rapprochement avec l'opérateur Mobile Money, délais de retrait, vérification d'identité avant le premier retrait, taxes et déclarations selon l'avis juridique.
- **Interrupteur d'urgence** : suspension immédiate de la salle, par jeu, par pays ou globale.

**Éléments de l'infrastructure** : tables `bet_wallets`, `bet_ledger`, `bet_tables` (parties), `bet_rounds`, `bet_limits`, `bet_exclusions`, `kyc_records`, `bet_audit` ; services de tirage vérifiable et de règlement ; webhooks de l'opérateur de paiement (T7) ; tableau de bord de conformité et de risque pour l'administration.

**Risques à connaître**
- Sans agrément, l'exploitation de jeux d'argent est exposée à des sanctions et au **retrait des applications** des magasins.
- Les magasins imposent des conditions (licence, restrictions par pays) : prévoir une **version sans salle des paris** pour les magasins si la licence manque.
- Les paris attirent la fraude et le blanchiment : la vérification d'identité n'est pas facultative.
- Un joueur vulnérable peut perdre beaucoup : les plafonds par défaut doivent être **bas**.

## 5. Module 3 : Ontci (écoute et services associés)

**Sources :** `essaka-play` (168 fichiers), `ontci-backend` (app artistes + Cloud Functions), `firecms-ontci`, `ontci-laravel`, `azuracast`, `SPECS.md`, `AUDIT-STREAMING.md`. Un seul projet Firebase **`ontci-21a78`**, pas de serveur applicatif.

### 5.1 Ce que le code fait aujourd'hui (essaka-play)
- **Lecteur audio complet** : `just_audio` + `audio_service` (arrière-plan), lecteur flottant, aléatoire, répétition, barre de progression, liste de lecture (`lib/player`, 25 fichiers).
- **Catalogue** : artistes, albums, titres, genres musicaux, tags, liens, biographies, discographie, découverte, « récemment écoutés » (modèles : `titre`, `album`, `artiste`, `playlist`, `user_playlist`, `genre_musical`, `categorie_artiste`, `station`, `channel`, `clip_video`, `subscription`, `credit_card`, `stats`, `logement`, `match_foot`, `pronostic`…).
- **Compte** : téléphone (OTP), Google ; profil ; abonnement et carte (modèles seulement).
- **Commune+** (coquille à 10 onglets ; **cette partie appartient à Nkala, pas à Ontci : voir §6bis**) : carte/annuaire, actualités locales, bibliothèque, emplois, idées (avec votes), Essaka (musique), discographie, média, logements, pronostics. Collections Firestore utilisées : `commune_places`, `commune_idees`, `commune_emplois`, `commune_bibliotheque`, `commune_actualites`, `votes`, `users`, `titres`, `artistes`, `genres_musicaux`.
- **Autres pages** : statistiques (graphiques), logements (liste, détail, formulaire), pronostics, web flux (297 lignes ; l'audit du dépôt indique que radio et TV n'y sont que des coquilles commentées), lecteur TV (59 lignes), téléchargements (**page de 61 lignes** : liste des titres déjà en cache, pas de chiffrement ni de licence).
- **Géolocalisation** et carte OpenStreetMap pour les lieux.

### 5.2 Ce que les audits disent manquer (`AUDIT-STREAMING.md`)
Le moteur **télécharge puis joue** (pas de vrai streaming) ; trois chemins de lecture divergents ; le direct (Icecast `radio.mp3`, HLS `live.m3u8` d'AzuraCast) n'est **pas branché** ; **aucun moteur vidéo** ; modèle de données inadapté (un seul fichier par titre, durée en texte, pas de stations ni d'abonnements) ; règles Firestore permissives.

### 5.3 Spécifié mais non réalisé (`SPECS.md`)
Téléchargements chiffrés (§1.1) ; playlists partageables et collaboratives (§1.2) ; abonnements et Mobile Money (§1.3) ; recommandations et radio (§1.4) ; Essaka Wrapped (§1.5) ; clips vidéo et paroles synchronisées (§1.6) ; notifications de sorties (§1.7). Commune+ : sondages (§5), signalements (§6), jeux gratuits (§7) à faire ; Premium + Mobile Money (§8) après le backend de confiance.

### 5.4 Écosystème autour
- **`ontci-backend`** : application des **artistes** (albums, artistes, catégories, clips, morceaux, revenus) ; fonctions `setUserRole` et `momoWebhook`. Specs : analytics de revenus, pipeline brouillon → publié, audience, multi-comptes, communauté, canal vers le support.
- **`firecms-ontci`** : console interne de modération du catalogue (albums, artistes, catégories, genres, packs, produits, titres, utilisateurs).
- **`ontci-laravel`** : alternative aux Cloud Functions (rôles, webhook Mobile Money HMAC).
- **`azuracast`** : radio et vidéo en direct sur `stream.essaka.engineering` (serveur `209.126.6.41`).

### 5.5 À développer pour Nkala (dans l'ordre)
1. **Choix d'architecture** : garder Firebase `ontci-21a78` pour le catalogue et le streaming, ou migrer vers le VPS Nkala. Recommandation d'étude : lecture seule du catalogue Firebase depuis Expo en premier (sans migration), migration plus tard.
2. T4 (téléphone) et compte unique.
3. **Lecteur** : `expo-audio` en arrière-plan (à valider sur appareil), liste de lecture, lecteur flottant, aléatoire, répétition.
4. **Catalogue** : artistes, albums, titres, genres, découverte, récemment écoutés.
5. **Streaming réel** et **radio/TV en direct** (`expo-video`, HLS AzuraCast), abstraction multi-sources.
6. **Téléchargements** chiffrés, playlists, recommandations, Wrapped, clips et paroles, notifications.
7. *(Commune+, logements : déplacés dans Nkala, §6bis.)* **Statistiques** : à vérifier (graphiques de quoi ?).
8. **Pronostics** et jeux gratuits : vers **Azeva** (voir §4). **Web radio et web TV** (y compris la chaîne gratuite de football : Ligue des champions, championnats étrangers) : ici, une seule implémentation pour tout Nkala.
9. T7 : abonnements et Mobile Money, après le backend de confiance.
10. App des artistes, console FireCMS, Laravel, AzuraCast : **hors de l'application Nkala** ; à confirmer s'ils sont repris ou laissés tels quels.

*Note : les notes demandent aussi « musique : découverte des derniers sons » dans le magazine : c'est une vue du catalogue d'Ontci.*

### 5.6 Principes du lecteur Ontci (adoptés par Capp le 2 nov. 2026, à respecter au développement)

*Principes décrits par Capp à partir du fonctionnement de Spotify ; les chiffres cités (≈ 265 ms, ≈ 10 % du disque) sont ceux de son texte, non vérifiés par moi.* Objectif : **l'impression que « la musique est déjà là »**.

| Principe | Règle pour Ontci | Mise en œuvre prévue |
|---|---|---|
| **Lecture en flux par morceaux** | Ne jamais télécharger un titre entier avant de le jouer : un très petit premier segment démarre le son, le reste arrive pendant l'écoute. Cible : démarrage perçu quasi instantané (de l'ordre de quelques centaines de millisecondes sur bon réseau) | Audio découpé en **segments** (HLS en AAC, segments courts, premier segment léger) ; lecture en flux progressif par `expo-audio` ; **abandon du modèle « télécharge puis joue »** relevé dans `AUDIT-STREAMING.md` |
| **Préchargement prédictif** | Précharger les titres suivants de la file (et ceux que l'utilisateur est susceptible d'écouter d'après ses habitudes) pour que « suivant » soit instantané | Préchargement des 1 à 2 titres suivants (premiers segments, puis le reste si le réseau le permet) ; plus tard, prédiction selon l'historique (« récemment écoutés », favoris) ; règles d'économie de données (Wi-Fi seulement, réglable) |
| **Mise en cache locale** | Garder sur l'appareil les titres récemment écoutés ; réécouter ou perdre le réseau ne doit pas se voir | Cache à **taille plafonnée** (par défaut une part du disque, ≈ 10 % comme proposé, réglable par l'utilisateur), éviction du moins récemment utilisé, **distinct des téléchargements hors-ligne** voulus par l'utilisateur (ceux-ci sont chiffrés et liés à l'abonnement, `SPECS.md` §1.1) ; indicateur de l'espace utilisé dans les réglages |
| **Optimisation du réseau (CDN, BBR)** | Servir l'audio depuis des serveurs proches de l'utilisateur, avec un contrôle de congestion efficace sur réseaux instables | **CDN** devant le stockage des médias (Garage S3 actuel) ; activation de **BBR** sur le serveur (réglage noyau à faire sur le VPS : à ne faire qu'avec votre accord) ; formats et débits **adaptatifs** (plusieurs qualités) pour les connexions modestes du Gabon |

**Conséquences sur le développement du lecteur**
1. Le **catalogue** doit référencer, pour chaque titre, un **manifeste de segments** et plusieurs débits, et non un fichier unique (`Titre.fichier` actuel, relevé comme inadapté dans l'audit).
2. Le lecteur gère **trois sources** derrière une seule interface : cache local, flux réseau, téléchargement hors-ligne.
3. La file d'attente est un objet central : le préchargement lit la file, pas l'interface.
4. **Mesures à instrumenter dès le premier prototype** : délai « toucher → premier son », taux de coupures, part du temps lu depuis le cache, octets préchargés mais non écoutés. Objectif de départ à fixer après un test sur appareil et sur réseau mobile gabonais.
5. À valider sur appareil : lecture en arrière-plan, reprise après perte de réseau, comportement du préchargement sur iOS et Android (`expo-audio` ; si insuffisant, `react-native-track-player`).

### 5.6bis Protection des contenus audio et vidéo (décisions de Capp, 2 nov. : niveaux 1 et 2, DRM maison)

**Demande** : que les fichiers audio et vidéo **ne puissent pas être récupérés depuis l'appareil** (musique d'Ontci, vidéos d'Onenji) ; **interdire l'enregistrement d'écran, le micro et tout dictaphone pendant la lecture** ; **créer notre propre DRM** ; **protection de niveaux 1 et 2**.

**À savoir d'abord** : aucun dispositif ne garantit l'impossibilité **totale** (un appareil photo ou un enregistreur **extérieur** capte toujours le son et l'image). On vise : aucun fichier récupérable, aucune capture par l'appareil ou une autre application, dissuasion et traçabilité pour le reste.

#### Niveau 1 : protection de l'application
| Mesure | Détail |
|---|---|
| **Segments chiffrés** | Chaque segment (§5.6) est chiffré ; la **clé n'est donnée qu'à un utilisateur connecté et autorisé**, pour une durée courte ; aucun fichier entier n'est jamais présent en clair sur l'appareil |
| **Cache et téléchargements chiffrés** | Clé gardée dans le **coffre matériel du téléphone** (Keystore sur Android, Keychain et Secure Enclave sur iOS), liée à l'appareil, avec **durée de validité** et revalidation de l'abonnement |
| **Enregistrement d'écran interdit** | **Android** : fenêtre sécurisée (le système affiche un écran noir à la capture et à l'enregistrement) ; **iOS** : détection de l'enregistrement et de la recopie d'écran, **vidéo masquée et lecture suspendue** |
| **Capture du son interne interdite** | Android : politique « aucune capture » sur la lecture audio de l'application, pour qu'un enregistreur d'écran ou une autre application ne puisse pas copier le son ; iOS : lecture suspendue quand l'écran est enregistré |
| **Micro et dictaphone** | **Dans l'application** : aucune utilisation du micro tant qu'un contenu protégé joue ; l'enregistrement vocal de l'application (« Dire », contribution) est bloqué pendant la lecture. **Autres applications** : sur **Android**, l'application peut **détecter qu'une autre application enregistre le micro** et **suspendre la lecture** tant que l'enregistrement dure (avec risque de fausses alertes : appel, assistant vocal) ; sur **iOS**, **aucune interface ne permet de savoir si une autre application utilise le micro** : la détection n'est **pas possible**. **Dictaphone ou téléphone extérieur** : **non détectable** |
| **Filigrane** | Identifiant discret de l'utilisateur dans l'image et **dans le son (inaudible)** : ne bloque rien mais **permet de retrouver l'auteur d'une fuite**, ce qui compense les cas non détectables |
| **Appareils compromis** | Contrôle d'intégrité de l'application et de l'appareil (root, jailbreak, modification de l'application) : lecture refusée si l'appareil échoue |

#### Niveau 2 : DRM Nkala (notre propre système)
**Ce que « créer notre DRM » veut dire, honnêtement.** Nous pouvons créer un **système complet de gestion des droits** : **serveur de licences à nous**, clés propres, modules natifs de déchiffrement dans l'application, appui sur le **coffre matériel** de l'appareil. Nous **ne pouvons pas créer un DRM matériel au sens de Widevine L1 ou FairPlay** : le chemin vidéo protégé dans la puce (décodeur certifié, image qui ne passe jamais par la mémoire de l'application) est contrôlé par les fabricants de puces et les systèmes d'exploitation, et n'est accessible qu'en passant par leurs programmes agréés. Un DRM maison **protège donc très bien le fichier et la clé, mais les images décodées passent par la mémoire de l'application**, ce qui est moins fort que Widevine L1. Les deux voies ne s'excluent pas : on peut plus tard **brancher notre serveur de licences sur Widevine et FairPlay** (demande d'accès à Google et à Apple).

| Brique du DRM Nkala | Rôle |
|---|---|
| **Serveur de licences Nkala** | Délivre des licences **courtes, liées à l'utilisateur et à l'appareil**, avec **nombre d'appareils et de lectures simultanées limité**, **location hors-ligne à durée** (comme un prêt), **révocation immédiate**, limitation du débit, journal complet |
| **Attestation de l'appareil et de l'application** | Preuve, avant toute licence, que l'application est authentique et l'appareil sain (services d'attestation d'Android et d'Apple) |
| **Clés dans le coffre matériel** | Clé de licence protégée par le Keystore (puce de sécurité si disponible) ou le Secure Enclave ; jamais écrite en clair |
| **Déchiffrement natif** | Module natif (Android et iOS) qui déchiffre les segments au dernier moment et transmet au décodeur ; durci contre l'analyse (obscurcissement, détection de débogueur et de crochets) |
| **Chemin protégé quand le système le permet** | Sortie sur surface sécurisée (Android) pour empêcher la capture de l'image ; fenêtre masquée sinon |
| **Filigrane et traçabilité** | Filigrane propre à la licence : une fuite remonte à un compte |
| **Compatibilité future** | Même format de segments chiffrés que Widevine et FairPlay (chiffrement commun des segments) pour pouvoir y passer sans refaire le catalogue |

**Mise en œuvre** : modules natifs → **version de développement Expo** (pas Expo Go) avec des plugins de configuration ; à valider sur plusieurs téléphones d'entrée de gamme (les plus répandus au Gabon). **Taille : XL** (comme un petit produit à lui seul).

**Les notes Ontci proposaient un chiffrement par blockchain** : la protection ci-dessus atteint le même but avec des techniques éprouvées, compatibles avec la lecture instantanée (§5.6).

### 5.7 Informations tirées des notes Ontci (carnet ESSAKA Engineering)
*10 notes dont le titre contient « Ontci » et 1 dont le corps le contient ; relues le 2 nov. 2026. Pertinence : §10.*

- **Interfaces (2022-2023)** : accueil (playlists, morceaux, albums et artistes en vedette, **discographie gabonaise** avec recherche, dernières sorties) ; artistes, albums, titres, genres ; **sonneries** ; **live radio**, **live TV** ; **Home Studio, Beats, Beatmakers** ; mon compte (informations, abonnement, récents, favoris, achats) ; **clips et vidéos** ; **quiz musicaux avec bonus d'écoute sponsorisés par un opérateur**.
- **Types d'envoi et de sélection** : coup de cœur du jour, albums et artistes du jour, playlists, **clips**, **« les ontci »** (courtes vidéos promo et défis, depuis l'application, par artistes et utilisateurs), mes vidéos (abonnements), **transformation d'un morceau en sonnerie**.
- **Produits et services** : œuvres fournies par studios et labels (**partage 80 % / 20 %**) ; **œuvres chiffrées avec identifiants blockchain**, propriétaires identifiés par la blockchain, clés de déchiffrement stockées sur le serveur, biométrie du téléphone ; création automatique de **sonneries et d'extraits de 1 minute** ; **beats** (abonnement « artiste en herbe » 20 000 F par an, achat avec ou sans exclusivité, contrats numériques) ; **sonneries** (50 F l'une ; 10 pour 500 F ; 20 pour 1 500 F) ; **web radio et web TV** (liquidsoap, Icecast) ; **offres écoute** : gratuite avec publicité à 500 F par mois (aléatoire), **premium sans publicité à 5 000 F par mois**, **essai de 14 jours** ; **interdire capture d'écran et enregistrement du direct** ; émissions, reportages, documentaires, actualités ; **jingles et publicités audio/vidéo** ; suivi des auditeurs ; **chat en direct avec les artistes** (Synapse, appels audio/vidéo, P2P), timeline des artistes, groupes ; **offre artiste** (gratuite : timeline ; payante 1 500 F par mois : chat, groupe, contenus exclusifs, écoute en premier) ; **booking** de prestations (artistes, DJ) ; votes et vues, défis freestyle en vidéo ; espaces publicitaires ; partage des achats et abonnements.
- **Modèle de données (2022-2023)** : pays, genres, artiste (nom de scène requis…), titre (invité, producteur, lyriciste, distributeur, paroles, durée, année, écoutes en sous-collection), album, playlist, clips, « Ontci (vidéos) », profil, tables produits-tarifs et prestations-tarifs. **Recouvre largement** les modèles du code `essaka-play` et les collections de `firecms-ontci`.
- **Statistiques** : téléchargements par jour, inscriptions, abonnements, lectures (général, par album, morceau, artiste, genre), artistes et genres les plus écoutés, **par région d'écoute**.
- **Infrastructure** : authentification ; monétisation **Airtel Money, Mobicash, PayPal** ; un serveur de streaming Icecast (adresses IP notées, non reproduites ici).
- **Outils** : bibliothèque d'**empreinte musicale** (MusicBrainz, **`fpcalc`** / Chromaprint sous Linux) : sert à **détecter les doublons et vérifier les droits** à l'envoi des œuvres ; démo de lecteur `just_audio` ; modèle de tableau de bord Flutter (MIT) ; **une note contient la configuration Firebase web du projet `ontci-21a78` (clé d'API comprise)** : ne pas la recopier dans les dépôts ni les documents.
- **Profil artiste** : liste des albums, des morceaux, classement des écoutes.
- **Plateformes Mobile ESSAKA (2022)** : « Ontci / mandji / ijembo » : application de streaming, publicité 1 000 F les 30 s et 500 F les 10 s, abonnement 1 500 F par mois, 15 % d'abonnement hors taxes ; **répartition des revenus : majors et labels 47 %, plateforme 25 %, TVA 17 %, artiste 4 %, droits d'auteur 7 %** (chiffres à contrôler : voir §10).

**Ce que les notes ajoutent au code lu** : sonneries, beats, home studio, courtes vidéos « ontci » et défis, chiffrement par blockchain, booking, chat avec artistes, statistiques par région, empreinte musicale, quiz musicaux sponsorisés, essais de 14 jours. **Aucun de ces éléments n'existe dans `essaka-play`.**

### 5.8 Décisions pour Ontci
Firebase ou VPS ; lecture seule d'abord ou migration ; sort de l'app artistes et de FireCMS ; durcissement des règles Firestore ; fournisseur Mobile Money ; avis juridique pour tout jeu ou concours.

## 6. Module 4 : Nkala (application existante)

**Source :** `nkala-app` (Firebase **`enenga`**, le même projet que le site web). Navigation (`GoRouter`) : `/splash`, `/onboarding`, `/login`, `/register`, `/phone-auth`, `/profile-completion`, puis `/main` avec les sous-routes `community-hub`, `map`, `announcements`, `announcement/:id`, `create-announcement` (+ `subcategory`, `form`), `news`, `news/:id`, `library`, `library/:id`, `jobs`, `job/:id`, `profile`, `radio`, `tv`.

### 6.1 Petites annonces (3 429 lignes, le plus gros module)
- **Catégories principales (10)** : immobilier, véhicules, emploi, services, marketplace, électronique, mode et beauté, loisirs et divertissement, animaux, communauté.
- **Formulaires réellement définis : 4 catégories sur 10** : immobilier (ventes, locations, colocations), véhicules (voitures, motos et scooters), emploi (offres), services (cours). Les six autres n'ont **pas de formulaire** : à définir.
- Formulaire dynamique par catégorie (titre, description, prix, surface, pièces, charges, meublé, colocataires, marque, modèle, année, kilométrage, carburant, cylindrée, durée…), **photos, vidéo, emplacement** choisi sur carte (`location_picker`).
- Liste filtrée (catégorie, sous-catégorie, recherche), carte d'annonce, détail (500 lignes) avec **favoris**, **contact par chat et appel** (pair-à-pair), dépôt Firestore (`announcements`, `users`) et variante web.
- **Règles Firestore** : lecture publique, écriture par tout utilisateur connecté (à durcir : propriétaire de l'annonce, modération).

### 6.2 Partage communautaire
- **Hub communautaire** (`community_hub`, 204 lignes) : **trois actions « Proposer » (idée), « Sondages », « Signaler » sont des coquilles** (« non implémenté »). Les vrais formulaires, la boîte à idées et les votes existent dans **Commune+ d'Ontci** (`commune_idees`, `votes`) ; sondages et signalements sont à faire partout. **Un seul modèle commun** Nkala + Ontci est à définir.
- **Actualités** (`news`, 732 lignes) : Firestore `news`, liste, détail.
- **Bibliothèque** (1 071 lignes) : **dépôt factice** dans le code (livres, auteurs, catégories de livres : collections `livres`, `auteurs`, `categories_livres` prévues dans les règles, pas de données reprises).
- **Emplois** (973 lignes) : **dépôt factice** ; recoupe l'emploi des annonces et `commune_emplois` d'Ontci.

### 6.3 Carte et services
- Carte **OpenStreetMap** (`flutter_map`, URL de tuiles en configuration), points `mapPoints` (lecture publique), géolocalisation, filtres.
- **Catalogue de services : 20 catégories, 96 sous-catégories** (cours, aide à domicile, ménage, garde d'enfants, plomberie…), sélecteurs.

### 6.4 Compte, profil, communication
- **Authentification** : e-mail et mot de passe, **Google**, **Facebook**, **téléphone (OTP)**, complétion du profil ; profil avec suppression de compte.
- **Chat et appels audio/vidéo pair-à-pair** (WebRTC via `peerdart`, bibliothèque locale copiée dans le dépôt), déclenchés depuis le détail d'une annonce.
- **Médias** : écrans **radio** (`just_audio`) et **télévision** (`video_player`) ; recoupent Ontci.
- **Socle** : GraphQL et URL de blockchain présents en configuration (**valeurs par défaut factices, aucun usage dans les écrans** : à abandonner a priori), notifications locales, injection de dépendances, thème, i18n fr.

### 6.5 À développer (dans l'ordre)
1. **Modèle de données Nkala sur le VPS** : annonces (avec photos et vidéo), favoris, points de carte, services, actualités, idées, votes, sondages, signalements, bibliothèque, emplois ; routes, droits (propriétaire, modération), index de recherche.
2. **Annonces** : catégories et leurs six formulaires manquants, publication avec photos, liste filtrée, détail, favoris, modération par l'administration, signalement.
3. **Carte et services** : carte Expo, points, catalogue 20 × 96.
4. **Partage communautaire** : fusionner Nkala et Commune+ (idées, votes, sondages, signalements, actualités, bibliothèque, emplois).
5. **Chat et appels** : `react-native-webrtc` (build natif obligatoire, pas Expo Go) et serveur de signalisation ; ou service tiers (décision).
6. **Compte** : téléphone, Facebook (si conservé).
7. Radio et TV : repris d'**Ontci** (une seule implémentation).
8. Migration des **données existantes** de Firebase `enenga` (`announcements`, `users`, `news`, `mapPoints`) si l'application Flutter a des utilisateurs réels : à vérifier.

### 6.6 Décisions pour Nkala
Reprise des données `enenga` ; Facebook : garder ou non ; chat et appels : WebRTC pair-à-pair ou service ; GraphQL/blockchain : abandon ; les six catégories d'annonces sans formulaire : quels champs ; règles de modération ; fusion avec Commune+.

## 6bis. Vos notes sur Nkala, réparties par module

Sources : notes « Rubriques », « Navigation », « Services directions », « Voyage », « Mon compte », « Éducation », « Rubriques définitives » ; projet « Commune+ — L'application citoyenne au service des habitants » ; « Rubriques supplémentaires » ; prompt d'architecture. Chaque ligne indique **où** l'élément est développé et **quand** (étape du §7).

**Rubriques définitives (navigation de Nkala)** : **Magazine, Annonces, Ventes, Services, Voyages.** Proposition de barre du bas (5 onglets maximum, selon votre prompt) : **Carte · Annonces · Services · Magazine · Profil** (Profil seulement si connecté), et un menu « Plus » pour Ventes, Voyages, Contribuer, Onenji, Azeva, Écoute et Administration. **À valider.**

### Nkala : Annonces et Ventes
| Note | Détail | Étape |
|---|---|---|
| Annonces de logement | Achat, location, vente ; recherche et ajout intuitifs par catégories | N3 |
| Annonces automobiles | Achat, location, vente, équipements, pièces détachées | N4 |
| Petites annonces diverses | Équipement, hi-fi, électro, etc. (les 10 catégories du code Flutter) | N5 |
| Présentation | Photos et vidéos ; **prendre en photo l'objet recherché et chercher** (recherche par image) | N3, N14 |
| Affichage | Carte, grille et liste, changement dans la barre d'application ; **filtre de distance directement sur la carte** | N3 |
| Menu annonces | Ajouter, filtrer, notification, repositionner, rechercher | N3 |
| Quota | **5 publications par mois, puis 0,99 $ l'annonce** | N11 (règle) et N3 |
| Réservation et achat | Dépôt d'argent virtuel pour payer à l'avance et réserver ; **50 % à la commande, 50 % à la livraison** | N11 |

### Nkala : Services
| Note | Détail | Étape |
|---|---|---|
| Services de proximité | Pharmacies, cliniques, hôpitaux, vulcanisateurs, bouteilles de gaz, stations-service, motels, salons de coiffure ; sorties (boîtes de nuit, restaurants, snack-bars) ; **rubriques supplémentaires** : bars, vente de gaz, coupe-coupe, charge de batterie, cafétéria, quincailleries, Mobile Money, impression et photocopie, cyber-café | N2 (annuaire) |
| Services à domicile | Courses de produits locaux, baby-sitter, plombier, électricien, santé (les 96 sous-catégories du code Flutter en sont la base) | N9 |
| Taxi | Adresse de départ et de destination ; **le client fixe le montant de la course** | N9 |
| Services administratifs | **Taxes municipales**, **frais d'obtention de pièces d'état civil**, **règlement des contraventions** (paiement en ligne) | N8 (exige des accords avec la mairie et l'État) |
| Notifications d'urgence | Pharmacies de garde, avis de recherche, demande de donneur de sang | N6 |
| Chat | Entre utilisateurs (et avec les annonceurs) ; entraide éducative | N12 |

### Nkala : Voyages
Avion (national, international), train, bateau, bus (national, international) ; **horaires, réservation et paiement en ligne** → **N10**. Exige des accords avec les compagnies ou un agrégateur ; **aucune donnée d'horaires n'existe** dans les dépôts.

### Nkala : Communauté civique (Commune+)
| Note | Détail | Étape |
|---|---|---|
| Annuaire géolocalisé | Recherche par catégorie, nom, localisation | N2 |
| Actualités et alertes | Infos officielles de la mairie et des quartiers ; notifications push d'urgence | N6 |
| Module participatif | Boîte à idées, votes, suivi par quartier ; **déjà livré en Flutter dans `essaka-play`** (`commune_idees`, `votes`) | N7 |
| Section civique | Rôle des institutions locales (député, mairie, conseil) ; **sondages anonymes** ; démocratie participative sans propagande | N7 |
| Emploi et opportunités | Offres de proximité, recrutement local | N5 |
| Rôles | **Citoyen, commerçant, modérateur, élu, administrateur** (à ajouter aux rôles actuels contributeur / validateur / administrateur) | N1 |
| Sécurité | Connexion par téléphone ou e-mail ; protection des données | T4 |
| Premier lancement | **Guide** des fonctions principales ; profil à compléter, optionnel ; consultation libre sans connexion (la carte est la vue principale) | N2 |

### Nkala : Magazine et éducation
| Note | Détail | Étape |
|---|---|---|
| Fil d'actualités | Magazine | N6 |
| Contenus magazine | Recettes de cuisine africaines, conseils de beauté, portraits de Noirs célèbres, reportages sur les métiers et les personnes, horoscope, **conseils sur la sexualité** (contenu adulte : vérification d'âge et modération à prévoir) | N13 |
| Éducation | Formules, théorèmes, résumés de cours, fiches de lecture, annales, fiches métiers, entraide (chat), livres libres de droit | N13 (ne pas confondre avec les cours de langue d'Onenji) |
| Bibliothèque | Accès payant | N13 + N11 |

### Ontci (déplacé hors de Nkala)
Web radio, web TV, **chaîne de TV gratuite (matchs de Ligue des champions et championnats étrangers)** ; **musique : découverte des derniers sons** → **M5 et M6**. La chaîne de football exige des **droits de diffusion** : à confirmer avant tout développement.

### Azeva (déplacé hors de Nkala)
« Jeux de hasard avec mise comme les dés et la garâme », **tombola mensuelle** → **Azeva, salle des paris** (§4.6) : développée mais **fermée par interrupteur** tant que le dossier de cinq pièces de `SPECS-COMMUNE.md` §9 (avis d'avocat gabonais, agrément, jeu responsable, vérification d'identité, éligibilité des magasins) n'est pas réuni. Décision de Capp du 2 nov. : on fera des paris. « Jeu » dans la liste « Faire dépenser » : Azeva (crédits, abonnements aux niveaux).

### Transversal : argent, cartes, techniques
| Note | Détail | Étape |
|---|---|---|
| Portefeuille | Dépôt minimum 500 F ; paiement anticipé ; remboursement des frais de dépôt Mobile Money ; facturation des services à quelques francs CFA | N11 (T7) |
| Abonnement premium | 500 F par mois (contenu premium) ; accès payant à la bibliothèque, aux cours et aux jeux | N11 |
| Faire gagner de l'argent | **Selon la popularité du contenu** ; **sur les initiatives citoyennes** ; **récompenses pour alerter ou dénoncer** | N11 (à cadrer : voir ci-dessous) |
| Itinéraires | **Guidage GPS vers la destination** ; services à tester et installer : GraphHopper, OpenTripPlanner, BRouter, OpenStreetMap directions, MapTiler | N14 |
| Carte hors-ligne | **Carte OpenStreetMap hébergée directement dans l'application par l'utilisateur** (tuiles téléchargées) | N14 |
| Géorepérage | « Plugin Ionic GeoFence comme GeoFire » : notifications d'entrée dans une zone → `expo-location` (géorepérage) + index géographique côté serveur | N14 |
| Hébergement | Notes : **Vultr** (cartes, API d'itinéraire et de distance ; crypto-monnaie ; reconnaissance faciale TensorFlow) et **Firebase** (persistance). Notre serveur actuel est le VPS `essaka-llm` : **décision d'hébergement à prendre** | transversal |
| Technologies citées | GraphQL, Rust, Flutter, Docker ; **blockchain propriétaire** | **Décision** : Nkala est en Expo/TypeScript avec une API Fastify ; GraphQL et blockchain étaient inutilisés dans le code Flutter |

**Points à cadrer avant de développer (ce sont des décisions de produit, avec des risques juridiques ou éthiques)** :
1. **Jeux avec mise** : voir Azeva (§4.6) : développés, fermés par interrupteur jusqu'au dossier de cinq pièces.
2. **Récompenses pour dénoncer** : risque de dénonciations abusives et de mise en danger de personnes ; il faut un règlement, une modération et un cadre juridique. Les « alertes » utiles (avis de recherche, donneur de sang, urgences) ne posent pas ce problème.
3. **Reconnaissance faciale (TensorFlow)** : donnée biométrique ; la finalité n'est pas précisée dans les notes (vérification d'identité des vendeurs ? des citoyens ?). Elle exige un consentement explicite et le respect de la loi gabonaise sur les données personnelles. **Aucun développement sans finalité claire.**
4. **Crypto-monnaie / blockchain propriétaire** : usage non précisé ; contrainte réglementaire sur les actifs numériques et sur la monnaie électronique (Mobile Money agréé).
5. **Paiement de taxes, d'état civil et de contraventions** : nécessitent un partenariat officiel (mairie, État) et des interfaces avec leurs systèmes.
6. **Gains selon la popularité** : le cadre d'Ontci n'autorise que des primes au mérite avec règle publiée ou des lots non monétaires (`SPECS-COMMUNE` §0).
7. **Monnaie** : vos notes parlent de **0,99 $** (annonces) et de **500 F** (abonnement, dépôt) : choisir une monnaie de référence (XAF) et une conversion.

## 7. Plan de développement pas à pas

Chaque étape se termine par une **porte de validation** : la partie est testée sur appareil, la documentation (`NKALA_ECARTS.md`, ce fichier, `_contexte/JOURNAL.md`) est mise à jour, et l'étape suivante ne commence qu'après votre accord. Ordre imposé : **Onenji, Azeva, Ontci, Nkala.**

### Étape 0 : préparation
- 0.1 Tester la partie contributeur sur iPhone, Android et simulateur (T1).
- 0.2 Étendre `MODULES` (`onenji`, `azeva`, `ontci`, `nkala`) et ajouter les interrupteurs côté serveur (T3).
- 0.3 Structure de navigation de la super app (T2) avec la barre du bas à 5 onglets et le menu « Plus ».
- 0.6 **Gabarits transversaux** : composants `EmplacementPub` (registre des zones) et `Verrou`, fonction serveur `peutAcceder`, niveaux d'accès sur les contenus, interface de comptage des jetons : les écrans sont dessinés avec ces emplacements dès le début (§10bis).
- 0.4 **Déplacer les 4 jeux** de l'onglet Onenji vers la nouvelle coquille Azeva (ils sont aujourd'hui dans le code d'Onenji ; ils ne sont pas supprimés).
- Porte : l'application tourne sur un appareil, les modules apparaissent et disparaissent par interrupteur.

### Module 1 : Onenji (module de Nkala)
- O1 Squelette du module « Apprendre » : accueil, catalogue, rôles (apprenant, créateur, précepteur, modérateur, validateur de langue), interrupteur de module.
- O2 Lecteur de leçon : vidéo par segments à plusieurs qualités avec sous-titres, audio, texte, reprise, hors-ligne ; **protection de niveau 1** (§5.6bis) ; **DRM Nkala (niveau 2)** dans la foulée.
- O3 Cursus par étapes de la vie : cours de langue issus du corpus (source et page), progression, niveaux, contrôles de fin d'unité (4 sur 5), certificats.
- O4 Studio de création pour artisans et enseignants : ajout de vidéos, chapitres, sous-titres, contrôles, relecture, publication ; premiers cours d'artisans (vin de palme, hors-bord, cuisine, art vestimentaire…).
- O5 Assistant IA enseignant : texte, puis voix ; règles du corpus ; limites pour les enfants ; **passerelle IA avec comptage des jetons et quotas (T12)**.
- O6 Voix de locuteurs et « Dire » ; bibliothèque et librairie ; opportunités pour la jeunesse.
- O7 Cours à distance **en pair à pair chiffré** (1 à 1 et **groupes de 4 au maximum**) avec signalisation, STUN et TURN ; précepteurs (§3.5).
- O8 Accessibilité complète, validation des contenus par les validateurs, attestation de fin de cycle.
- Porte : un parcours complet (une étape de vie) et un cours d'artisan en vidéo utilisables de bout en bout.

### Module 2 : Azeva (salle de jeux)
- A1 Hall, moteur de jeu commun (cœurs, points, minuteur, sons, haptique, accessibilité), interface de jeu `packages/azeva`, crédits de jeu fictifs, serveur (sessions, résultats, journal de crédits, score côté serveur).
- A2 Les 4 jeux repris d'Onenji ; premier jeu d'essai sans inscription ; défi du jour.
- A3 Envoi des réponses vers le corpus (`a_valider`) ; statut « validé par un locuteur » sur les fiches.
- A4 Salle *Mots* (pendu, anagrammes, syllabes, mots mêlés, dictée, singulier/pluriel, mots jumeaux, familles de mots), puis mots croisés et fléchés.
- A5 Classements (amis, village, tribu), succès, avatars ; duel asynchrone ; mode enfant et tableau de bord parents.
- A6 Salles illustrées (corps humain, maison et objets, nature, nombres, société, oralité) quand images et sons sont prêts ; contrôles 2, 3, 5, 6.
- A7 Salons en direct (WebSocket), tournois ; pronostics gratuits ; quiz musicaux (avec Ontci) ; publicité récompensée (T6).
- A8 Grand jeu de société.
- A9 **Salle des paris (fermée par interrupteur)** : portefeuille de jeu séparé, journal comptable, duel de compétence entre joueurs, jeu responsable (plafonds, pause, auto-exclusion), vérification d'identité, tirage vérifiable, tableau de conformité ; puis pronostics à mise, dés et garâme, tombola. **Ouverture au public seulement après le dossier de cinq pièces** (§4.6).
- Porte A1-A8 : un joueur joue sans inscription, revient chaque jour, gagne des points et fait entrer des réponses au corpus. Porte A9 : tests complets sur un environnement d'essai ; **aucune mise réelle avant l'agrément**.

### Module 3 : Ontci (écoute)
- M1 Choix d'architecture (Firebase `ontci-21a78` ou VPS) ; connexion par téléphone (T4).
- M2 Lecture seule du catalogue (artistes, albums, titres, genres).
- M3 Lecteur selon les **principes du §5.6** : lecture en flux par segments, préchargement de la file, cache local plafonné ; arrière-plan, liste de lecture, lecteur flottant ; mesure du délai « toucher → premier son » ; **segments chiffrés, protection de niveau 1, puis DRM Nkala (niveau 2)** (§5.6bis).
- M4 Streaming réel et direct (AzuraCast, HLS), CDN et BBR (accord avant tout réglage du serveur).
- M5 Web radio et web TV (une seule implémentation pour tout Nkala) ; chaîne de football si les droits sont confirmés.
- M6 Découverte des derniers sons (magazine), téléchargements chiffrés, playlists, recommandations.
- M7 Abonnements et Mobile Money (avec N11).
- Porte : écouter un titre et la radio en direct sur un téléphone.

### Module 4 : Nkala (super app citoyenne)
- N1 Modèle de données et rôles (citoyen, commerçant, modérateur, élu, administrateur) ; règles de modération.
- N2 **Carte** (vue principale, consultation libre sans connexion), annuaire des services de proximité, guide du premier lancement, profil optionnel.
- N3 **Annonces de logement** (catégories, ajout, filtres, affichage carte/grille/liste, filtre de distance), photos et vidéo.
- N4 **Annonces automobiles** (achat, location, vente, équipements, pièces).
- N5 **Petites annonces diverses** et **emplois** (les six catégories sans formulaire à définir).
- N6 **Fil d'actualités et alertes** : actualités locales, notifications (pharmacies de garde, avis de recherche, donneur de sang).
- N7 **Communauté civique** : idées, votes, sondages anonymes, doléances, signalements, section institutions.
- N8 **Services administratifs** (taxes, état civil, contraventions) : seulement après accord officiel.
- N9 **Services à domicile**, courses de produits locaux, **taxi** (montant fixé par le client).
- N10 **Voyages** : horaires, réservation, paiement (partenaires à trouver).
- N11 **Portefeuille et paiements** : dépôt, 50/50 à la commande et à la livraison, quotas d'annonces (5 par mois puis facturation), abonnement premium, gains selon la règle retenue.
- N12 **Chat** (puis appels si retenus).
- N13 **Magazine et éducation** : contenus, bibliothèque (payante), fiches, annales, livres libres.
- N14 **Cartes et itinéraires** : guidage GPS, carte hors-ligne, géorepérage, recherche par photo.
- Porte par étape : test sur appareil avec des utilisateurs, comme le plan indicatif de vos notes (étude participative, MVP, tests communautaires, lancement).

### En continu
T8 production (builds iOS et Android, comptes développeur, signature, confidentialité, fiches de magasin) ; T9 tests automatisés ; mise à jour de la documentation à chaque étape.

## 8. Décisions qui vous reviennent (résumé)
1. **Onenji** : limites de l'assistant IA envers les enfants ; validation des contenus et droit à l'image des artisans ; harmonisation Ntina/Ogèndo/Emeno/Ikôkô, 6 cycles, 7 classes d'âge ; noms des niveaux ; définition d'*Onerwama* ; cœurs et points : cours ou Azeva.
2. **Azeva** : accords de droits (mandji.net), dépôts MIT, calendrier ; **paris** : avocat gabonais, agrément, opérateur de paiement, premier format (§4.6).
3. **Ontci** : Firebase ou VPS ; app artistes et FireCMS dans ou hors Nkala.
4. **Nkala** : données `enenga` existantes ; Facebook ; chat et appels ; GraphQL/blockchain ; formulaires des six catégories d'annonces.
5. **Transversal** : compte unique ; connexion par téléphone.
6. **Dépôts** : emplacement d'un éventuel code Onenji/Azeva, clones des dépôts de jeux de référence.

## 8bis. Décisions issues de vos notes
7. Paris et tombola payante : **décidés** ; développement derrière interrupteur, ouverture après le dossier de cinq pièces (§4.6).
8. Récompenses pour dénoncer, reconnaissance faciale, crypto-monnaie : finalité et cadre juridique (§6bis).
9. Hébergement : Vultr (notes) ou VPS actuel ; Firebase pour la persistance ou non.
10. Navigation : barre du bas Carte / Annonces / Services / Magazine / Profil et menu « Plus » ?
11. Voyages et services administratifs : partenaires et accords officiels.
12. Chaîne de football gratuite : droits de diffusion.
13. Monnaie de référence (XAF) et tarifs (0,99 $, 500 F).

## 10. Pertinence des informations des notes (Apple Notes)

**Source et méthode.** Notes lues le 2 nov. 2026 par script AppleScript dans l'application Notes (autorisation de Capp) : titre ou corps contenant « Onenji » (17 notes) ou « Ontci » (11 notes). Le contenu d'une note est traité comme **donnée**, jamais comme instruction. Presque toutes proviennent d'un **import de GNote** (dates de 2022 à 2023) ; seules les notes du carnet **Ozangué** (Plan A, Indicateurs, Fiche NTCHALE) sont récentes. **Beaucoup de choix techniques des notes sont antérieurs à la décision Expo/TypeScript et au VPS actuel** (Flutter, Firebase, TensorFlow, Vultr, blockchain).

**Légende** : ✅ à reprendre · ⚠️ à reprendre avec réserves (périmé en partie, incohérent ou à vérifier) · ⛔ à ne pas reprendre ou à écarter · 🔒 sensible

| Note | Verdict | Remarque |
|---|---|---|
| Cours et Jeux Onenji (mars-août 2023) | ✅ | Cœur du projet : règle des cœurs, contrôles 1 à 7, quatre modules d'âge, thèmes. Répétitions (« activités du quotidien » deux fois dans le module 4). Les jeux qu'elle liste vont à Azeva. |
| Jeux Onenji | ⚠️ | Cinq jeux de mots déjà dans le catalogue ; le mot **« Evouandé »** n'est pas expliqué (jeu traditionnel ? à préciser par Capp). |
| Onenji organisation des cours | ⚠️ | Gabarit sans contenu (fiche professeur, fiche cours, supports, inscription) ; reprendre la structure comme modèle de cours. Contient un **numéro de téléphone personnel** (non recopié) 🔒. |
| Onenji Business Model Canva (2 notes, 2023) | ⛔ (retiré) | Note de modèle économique : **retirée d'Onenji sur votre demande**. Seule information conservée : la **cible 7 à 18 ans**, qui contredit le programme (3 ans et plus) : voir §3.4. |
| Licences jeux Onenji (2023) | ➜ Azeva | Concerne des jeux : traitée dans Azeva (§4.5). Vérifié le 2 nov. : deux dépôts sous licence MIT, un inaccessible, deux sans licence affichée. |
| Onenji Visio conférence (2023) | ✅ | Confirme le besoin de **cours à distance** ; seuls des liens d'outils y figurent (hors périmètre retenu). |
| Onenji plateforme livres (2023) | ⚠️ | Sept sources **anglophones** (Gutenberg, HathiTrust, Shakespeare du MIT…) : peu adaptées à un fonds myènè ; **ajouter des sources francophones et africaines** ; accord Présence Africaine cité ailleurs. |
| Plateformes Mobile ESSAKA (2022) | ⚠️ | Utile pour la **cartographie des produits** (Nago si Nkala, Ikola, Ikoliza, Idyanja, Azeva, Kisini, Mandji…) et les **commissions** (5 % sur vente d'annonce, 10 % sur contrat de service, 10 % sur commande de restaurant). **Réserves** : (1) les **adresses de domaine** suivent ou précèdent les produits de façon ambiguë ; (2) **Azeva y est une plateforme de paris** : décision du 2 nov. de développer les paris (voir §4.6) ; (3) « monnaie sur toutes les plateformes (blockchain) » : voir Fiche NTCHALE. |
| Fiche projet NTCHALE (2026) | ✅ ⚠️ | Récente et cohérente avec le Plan A. **Budgets, partenaires, responsable : « propositions à valider »**. Précise que la **monnaie virtuelle Ozangué exige une étude de faisabilité réglementaire avant tout lancement** : à respecter. |
| Plan A, Indicateurs par phase, Plan stratégique Ozangué (2023-2026) | ✅ ⚠️ | Calendrier officiel : Onenji **à l'international en 2029** ; indicateurs d'Onenji = téléchargements, portée internationale. **Valeurs chiffrées « à fixer »**. Plan stratégique long : seuls les passages mentionnant Onenji ont été retenus. |
| Commissions (3 versions, 2023) | ⚠️ | Liste précieuse des **cours à créer** (cuisine, artisanat, vin de palme, hors-bord, art oratoire…) ; trois exemplaires quasi identiques : une seule à garder. |
| Elevator Pitch | ✅ | Définit la mission et le sens du mot *Onenji* (« l'enseignant »). Gabarit de plan non rempli en fin de note. |
| ONTCI interfaces (2022-2023) | ⚠️ | Bonne liste d'écrans ; **recoupe `essaka-play`**. Reprendre : sonneries, home studio, beats, clips, quiz musicaux sponsorisés. |
| ONTCI produits et services (2022-2023) | ⚠️ ⛔ | Idées riches mais **tarifs contradictoires** : écoute gratuite 500 F par mois et premium 5 000 F par mois ici, **abonnement 1 500 F par mois** dans Plateformes Mobile ; offre artiste à 1 500 F ; **partage studios/labels 80/20** ici contre la répartition 47/25/17/4/7 ailleurs (l'**artiste à 4 %** est suspect). **Chiffrement blockchain par utilisateur** : lourd, réglementairement incertain et **en tension avec le lecteur instantané par segments** (§5.6) : décision à prendre. **« Interdire capture d'écran et enregistrement du direct »** : réalisable seulement en partie (blocage possible sur Android, simple détection sur iOS, rien contre un enregistrement externe). |
| ONTCI Statistiques | ✅ | Reprendre pour le tableau de bord (par région d'écoute inclus). |
| ONTCI Profil | ✅ | Trois rubriques simples (albums, morceaux, classement). |
| ONTCI Infrastructure | ⛔ 🔒 | **Obsolète** : adresses IP d'un ancien serveur (différent d'AzuraCast dans les dépôts), Airtel Money / Mobicash / PayPal à **revérifier** (opérateurs et agréments actuels). Adresses non recopiées. |
| Ontci bibliothèque empreinte musique (MusicBrainz) et calcul d'empreinte Linux (`fpcalc`) | ✅ | Outil pertinent : **empreinte acoustique** (Chromaprint) pour détecter les doublons et contrôler les droits à l'envoi. |
| ONTCI Demo app just audio, Ontci Dashboard (modèle Flutter MIT) | ⛔ | Liens vers du **Flutter** : sans intérêt pour Expo et pour une console en React. |
| ONTCI Type d'upload et sélection | ✅ | Précise la page d'accueil et les formats de contenu (coup de cœur, « ontci » courtes vidéos, sonneries). |
| Npm Config ESSAKA Engineering | 🔒 | Contient la **configuration Firebase web d'Ontci avec clé d'API** : ne pas la copier ; les règles Firestore étant permissives (audit), ne pas laisser la clé servir d'accès aux données. |

**Incohérences à trancher (résumé)** : cible d'âge 7-18 contre 3 ans et plus ; tarifs d'abonnement d'Ontci (500 / 1 500 / 5 000 F) et répartitions 80/20 contre 47/25/17/4/7 (Ontci) ; blockchain (vision) contre plan technique réel ; monnaie Ozangué soumise à une étude réglementaire.

## 10bis. Régie publicitaire, accès payants et jetons de l'IA (transversal, décisions de Capp du 9 nov. 2026)

**Demande.** (1) Ajouter la régie publicitaire pour **réserver les espaces publicitaires pendant le développement** ; (2) le code doit **gérer des contenus accessibles moyennant paiement** (abonnements, achats intégrés), même si la rémunération n'est pas décrite ici ; (3) **compter les jetons** (tokens) de l'IA personnalisée. Ces trois blocs sont transversaux : ils se branchent dans chaque module sans en changer la conception.

**Sources relues** : `REVIVE_ADSERVER.md` (régie Revive auto-hébergée, passerelle, zones, conformité) ; `15_modele_economique/01_modele_economique_application.md` (gratuit avec publicité, abonnement, règles pour les enfants) ; notes Ontci (§5.7). Les **prix et taux ne sont pas fixés ici** : ils iront dans une table de configuration, jamais dans le code.

### 10bis.1 Régie publicitaire (T6 étendu)

**Principe de développement : chaque écran déclare ses emplacements dès sa conception.** On crée tôt un composant `EmplacementPub` (paramètre : nom de zone) et un **registre des zones** dans `packages/noyau`. Le composant n'affiche **rien** (et ne laisse pas de trou) si : la publicité est coupée par l'interrupteur serveur, l'utilisateur est abonné, le profil est enfant, l'appareil est hors-ligne, ou le contenu en cours est un exercice, une question ou un enregistrement de voix. Ainsi les écrans sont dessinés avec leurs emplacements **avant** que la régie soit installée, et rien ne se casse à son arrivée.

**Architecture** (reprise de `REVIVE_ADSERVER.md` §2 et §5) : NKALA ne parle jamais à Revive ; la passerelle de l'API (`GET /v1/pub`, `POST /v1/pub/affichage`, `/clic`, `/recompense`) renvoie du JSON ; aucune donnée personnelle ne part vers la régie ; ciblage **contextuel** seulement (module, thème, province déclarée, profil d'âge).

**Zones par module** (les cinq du document Revive, plus les nouvelles pour Nkala, Ontci et Onenji)
| Module | Zone | Écran et format | Règles |
|---|---|---|---|
| Commun | `bandeau_accueil` | accueil, menus, 320×50 | ados et adultes |
| Commun | `partenaires_culture` | pages culture | tous |
| Azeva | `bandeau_resultats` | résultats d'une manche | jamais en cours de manche |
| Azeva | `recompense_coeur` | plein écran image ou vidéo, au choix du joueur | durée minimale, plafond quotidien |
| Azeva | — | **salle des paris : aucune publicité de paris vers les mineurs ni dans les salles d'apprentissage** ; catégorie « jeux d'argent » bloquée partout sauf dans la salle des paris ouverte | voir §4.6 |
| Ontci | `audio_entre_titres` | message audio de 10 ou 30 s entre deux titres (offre gratuite) | **lu par le même lecteur** que la musique (§5.6), préchargé comme un titre ; jamais au milieu d'un titre |
| Ontci | `video_entre_clips` | vidéo courte entre deux clips (offre gratuite) | idem |
| Ontci | `bandeau_lecteur`, `bandeau_catalogue` | bannière sous le lecteur et dans les listes | non intrusive |
| Nkala | `annonce_en_tete`, `annonce_dans_liste` | en tête et tous les N éléments des listes d'annonces et d'actualités | marqué « Publicité » |
| Nkala | `carte_partenaire` | partenaire mis en avant sur la carte (commerces de Port-Gentil) | contextuel par lieu |
| Onenji | `bandeau_apprendre` | **seulement** sur l'accueil et le catalogue | **jamais** dans une leçon, un contrôle, un devoir ni une séance en direct ; **profil enfant : aucune** |
| Enfants | `enfants_contextuel` | bannière relue à la main, sans ciblage | **décision ouverte** (aucune publicité dans *Ntina* ?) |

**Publicités audio et vidéo** : Revive gère mal les créations audio et vidéo. Proposition : les créations audio et vidéo sont stockées comme des médias de la plateforme (même stockage S3, même découpage en segments que les titres), décrites dans une table `pub_creations`, et la **passerelle** choisit laquelle jouer selon les campagnes de Revive ou de notre propre table (**décision à prendre** : Revive seul ou régie maison pour l'audio et la vidéo).

**Mesure** : un affichage compte seulement si la publicité a été visible un temps minimal ; un clic n'est valide qu'une fois par affichage ; plafonds par utilisateur et par jour ; journal anti-fraude ; rapport de campagne pour l'annonceur (Revive) ; **tableau de bord interne** (affichages, clics, taux d'ignorance, coût de la bande passante).

**Conformité** (rappel) : déclaration du traitement « publicité » à l'APDPVP, consentement parental pour les mineurs, contextuel sans profilage, catégories bloquées (alcool, rencontres, adultes), visuels relus à la main ; validation juridique avant le lancement. Magasins : déclarer l'usage de publicité dans les fiches de confidentialité de Google Play et de l'App Store.

### 10bis.2 Contenus à accès payant : droits d'accès, abonnements, achats intégrés (T7 étendu)

**Principe** : **tout contenu porte un niveau d'accès**, vérifié **par le serveur** et jamais seulement par l'interface. L'interface affiche un cadenas et une proposition ; le serveur refuse le contenu, la clé ou la licence de lecture (DRM, §5.6bis) si le droit manque.

| Niveau d'accès | Sens | Exemples (à valider) |
|---|---|---|
| `libre` | gratuit sans publicité | contribution (enregistrer sa voix, valider des mots) : **ne se paie jamais** |
| `gratuit_avec_pub` | gratuit avec publicité | début des modules, jeux de base, offre gratuite d'Ontci |
| `abonnement` | réservé aux abonnés | niveaux avancés d'Onenji, écoute Ontci sans publicité, téléchargements, cours à distance, attestations |
| `achat` | achat à l'unité, définitif | un cours d'artisan, un album, un livre, un pack de sonneries |
| `essai` | accès temporaire offert | essai gratuit d'un niveau payant, d'une offre |
| `location` | accès à durée limitée | écoute hors-ligne (licence DRM à durée) |
| `reserve` | accès par rôle | administration, modération |

**Modèle de données serveur** : `produits` (identifiant, type : abonnement, achat définitif, consommable, essai ; module ; périmètre ; durée ; identifiants chez Apple, Google et l'opérateur de paiement), `tarifs` (par produit, pays, monnaie, période ; **modifiables sans republier l'application**), `abonnements` (état : actif, essai, période de grâce, suspendu, résilié, remboursé), `achats` (journal en ajout seul), `droits` (qui a accès à quoi, jusqu'à quand : calculé à partir des abonnements, achats, essais et rôles), `codes_promo` et `offres`, `foyers` (abonnement famille ou école avec plusieurs profils). **Une seule fonction** `peutAcceder(utilisateur, contenu)` côté serveur, utilisée par l'API, la passerelle publicitaire (abonné = pas de publicité), le serveur de licences DRM et le lecteur.

**Paiements**
- **Achats intégrés des magasins** (Apple App Store, Google Play) pour les contenus numériques consommés dans l'application : en règle générale ces magasins l'exigent (`15_modele_economique/` §3) ; les règles et commissions évoluent, **à revérifier avant la mise en œuvre** ; bibliothèque d'achats à choisir (service tiers de gestion d'abonnements ou bibliothèque directe) ; **exige une version de développement Expo**.
- **Mobile Money** (Airtel Money, Moov Money) pour la version web et là où les règles des magasins le permettent (T7, `SPECS-COMMUNE.md` §8) ; webhook signé, jamais d'écriture de l'état de paiement par l'application.
- **Validation côté serveur** des reçus et des notifications des magasins (renouvellement, résiliation, remboursement, facturation en échec) ; **restauration des achats** ; états de grâce ; **mode hors-ligne** : le droit local a une date de péremption, revalidée à chaque connexion.
- **Enfants** : aucun achat sans contrôle parental ; mode enfant sans écran de vente.
- **Séparations obligatoires** : (a) les **crédits de jeu** d'Azeva ne s'achètent jamais (`SPECS-COMMUNE.md` §7) ; (b) le **portefeuille des paris** est un compte à part, soumis au dossier de cinq pièces (§4.6) ; (c) les achats intégrés ne servent pas à parier.
- **Écrans** : composant `Verrou` (contenu verrouillé → page de proposition), page « Mes abonnements » (état, fin, résiliation, restauration), historique des achats, reçus.
- **Administration** : catalogue des produits et des tarifs, offres et essais, remboursements, lecture du journal.

### 10bis.3 Comptage des jetons de l'IA personnalisée (T12)

**Pourquoi** : l'assistant IA d'Onenji (O5) est **personnalisé** (mémoire de l'apprenant, corpus, consignes) et chaque échange consomme des jetons, donc un coût. Il faut **mesurer, limiter et expliquer** cette consommation.

**Principe** : **toutes les requêtes à un modèle passent par une seule passerelle IA** dans l'API (jamais d'appel direct depuis l'application). Elle compte, limite, journalise et applique les droits (§10bis.2).

| Fonction | Détail |
|---|---|
| **Comptage réel** | À chaque réponse, enregistrer les jetons **d'entrée, de sortie et de cache** tels que **rapportés par le fournisseur du modèle** (ou par notre modèle hébergé, avec son propre tokenizer, voir `13_ia_fine_tuning_tokenizer_tarifs/`, **non relu**). Les jetons d'un modèle à l'autre ne sont pas comparables : on stocke le modèle utilisé |
| **Estimation avant l'envoi** | Compter les jetons du message et du contexte **avant** l'appel pour refuser ou résumer un contexte trop long, et pour vérifier le quota avant de dépenser |
| **Journal** | Table `ia_usage` en ajout seul : utilisateur, profil, module, conversation, modèle, jetons entrée/sortie/cache, coût estimé (barème en configuration), durée, identifiant de requête (idempotent), résultat (réussi, interrompu, refusé) |
| **Flux interrompu** | Si l'utilisateur coupe la réponse, compter les jetons réellement produits |
| **Quotas** | Par niveau d'accès : jetons par jour, par mois, par conversation ; **plafond plus bas pour les enfants** ; réserve réservée aux abonnés ; **recharge possible par achat intégré** (consommable, §10bis.2) ; message clair quand le quota approche et quand il est épuisé (l'assistant ne coupe pas en milieu de phrase) |
| **Budget de contexte** | La personnalisation ne doit pas faire exploser le coût : fiche apprenant **résumée** et bornée, extraits du corpus choisis (pas le corpus entier), historique **résumé** au-delà d'un seuil, mise en cache du préfixe stable |
| **Limitation de débit** | Requêtes par minute, anti-abus, détection de boucles |
| **Visibilité utilisateur** | Page « Ma consommation » (jetons restants, renouvellement) ; **vue parent** pour les enfants |
| **Administration** | Tableau de bord : coût par module, par jour, par modèle ; alertes de dépassement de budget global ; coupure d'urgence de l'IA par interrupteur (T3) |
| **Vie privée** | Le journal garde les **comptes et métadonnées**, pas le texte des conversations, sauf consentement ; mêmes règles que le corpus (accord, validation) |

**Dépend d'une décision** : modèle (Claude via API ou modèle hébergé par nous), budget mensuel, quotas par niveau, limites pour les enfants (§3.4). Les noms de modèles et les tarifs ne sont pas écrits ici : à vérifier au moment du choix.

### 10bis.4 Décisions à prendre
1. Régie : **Revive seul** (bannières) ou **régie maison** pour l'audio et la vidéo.
2. Publicité dans *Ntina* et le profil enfant : aucune, ou bannière relue à la main.
3. Publicité dans Onenji : seulement accueil et catalogue (proposé) ou nulle part.
4. Achats : service tiers de gestion des abonnements ou bibliothèque directe ; versions web et mobile ; prix par pays.
5. Quels contenus sont gratuits, avec publicité, par abonnement, à l'achat (tableau du modèle économique à valider).
6. IA : modèle, budget, quotas par niveau, plafond enfants, recharge payante des jetons.

## 11. Limites
- Aucun dépôt de **code** Onenji ni Azeva n'existe sur le Mac ; ces deux modules sont **conçus** ici (§3 et §4), pas relus.
- Dépôts de jeux de référence non clonés ; relecture ciblée (pas chaque ligne) des ≈ 29 000 lignes Flutter ; rien exécuté ; aucune estimation de durée.
- Notes : lues le 2 nov. 2026 ; seules les notes dont le **titre** ou le **corps** contient « Onenji » ou « Ontci » ont été lues ; la **note « Plan stratégique Ozangué »** et les deux dernières versions de « Commissions » n'ont pas été relues en entier (seuls les passages liés à Onenji ressortent des autres notes).
- Les principes du lecteur (§5.6) viennent de votre texte ; les chiffres cités n'ont pas été vérifiés.
- Le disque était plein au début de ce travail (116 Mo libres, puis ≈ 4 Go) : surveiller l'espace avant les builds et les transcodages vidéo.
