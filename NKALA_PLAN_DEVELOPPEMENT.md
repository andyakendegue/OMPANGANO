# Nkala : plan de développement (2 nov. 2026)

Super app **Nkala** (Expo : iOS, Android, web). Ordre fixé par Capp : **Onenji, Azeva, Ontci, Nkala**. Détail, sources et décisions : `NKALA_AUDIT_COMPLET.md` (les renvois § sont à ce fichier).

**Règles du plan**
- Chaque étape finit par une **porte** : test sur appareil, documentation à jour (`NKALA_ECARTS.md`, `NKALA_AUDIT_COMPLET.md`, `_contexte/JOURNAL.md`), votre accord avant la suite.
- **Taille** : S (quelques écrans), M (un module simple), L (un module complet), XL (plusieurs mois de travail d'une personne) : indicateur relatif, **pas une durée**.
- Un module qui n'est pas terminé reste **masqué par interrupteur serveur**, sans bloquer les autres.
- Les parties contributeur (Ompangano) et administration existent déjà et **ne doivent pas régresser**.

## Décisions déjà prises
- Onenji = **module de Nkala** (onglet « Apprendre »), cours par assistant IA + cours d'artisans en vidéo + plateforme de cours ouverts. **Aucun jeu**. Rémunération, revenus et questions techniques retirés de sa conception.
- Azeva = salle de jeux **inventée de zéro** (conception au §4.3). **Avec des paris**, développés derrière un interrupteur et ouverts seulement après le dossier de cinq pièces (§4.6).
- Ontci = lecteur à la Spotify (§5.6). Nkala = super app citoyenne (§6, §6bis).
- Le verrou administrateur est levé dans Expo : Apprendre et Écoute visibles de tous ; Administration reste réservée.

## Étape 0 : préparation (taille M) — état au 9 nov. 2026
| # | Tâche | État |
|---|---|---|
| 0.1 | Tester la partie contributeur sur iPhone, Android et simulateur (micro, notifications, flux temps réel, hors-ligne, SQLite) | **À faire : jamais fait** ; nécessite un appareil ou un simulateur |
| 0.2 | Registre de modules et interrupteurs **côté serveur** | **Fait** : `packages/noyau/src/modules.ts` (6 modules + 4 fonctions : publicité, achats, assistant IA, salle des paris) ; route `GET /v1/modules` pilotée par `MODULES_ACTIFS` et `FONCTIONS_ACTIVES` (variables du serveur : un changement demande un redémarrage de l'API, pas une nouvelle version de l'application) ; la route n'ouvre **jamais** la salle des paris |
| 0.3 | Navigation de la super app (5 onglets + menu « Plus ») | **Partiel** : onglet Azeva ajouté, onglets masqués par interrupteur ; la barre à 5 onglets et le menu « Plus » restent à faire (dépend de Nkala N2) |
| 0.4 | Déplacer les 4 jeux d'Onenji vers Azeva | **Fait** : `Onenji.tsx` → `Azeva.tsx`, `onenji.ts` → `azeva.ts` (historique git conservé, clés de stockage inchangées : la progression des joueurs est gardée) ; l'onglet Apprendre est une coquille « bientôt » |
| 0.5 | Rôles (créateur, précepteur, citoyen, commerçant, modérateur, élu) | **À faire** : touche le serveur et les règles de droits |
| 0.6 | Gabarits transversaux | **Fait** : `acces.ts` (`peutAcceder`, 7 niveaux d'accès), `publicite.ts` (13 zones, `zoneAffichable`, `profilAgeDepuis`), `jetons.ts` (quotas, estimation), composants `EmplacementPub`, `useSansPublicite`, `Verrou`, `useDroits` (abonnement : toujours « non abonné » jusqu'aux étapes E) |
| **Porte** | | Types sans erreur (`tsc`), 69 tests de l'API et du noyau réussis. **Non vérifié sur appareil ni dans le navigateur** : les modifications d'écran n'ont pas été lancées |

## Module 1 : Onenji (taille XL)
Prérequis : décisions §3.4 (limites de l'IA pour les enfants, validation des contenus, harmonisation des cycles, cible d'âge).

| # | Étape | Livrable |
|---|---|---|
| O1 | Squelette du module « Apprendre » | Accueil, catalogue, rôles, interrupteur (M) |
| O2 | Lecteur de leçon | Vidéo **par segments, plusieurs qualités**, sous-titres omyènè et français, audio, texte, reprise, hors-ligne ; **protection niveau 1** (segments chiffrés, clés par utilisateur, coffre sécurisé, **enregistrement d'écran, son interne et micro bloqués pendant la lecture dans les limites du système**, filigrane) puis **DRM Nkala niveau 2** (XL) |
| O3 | Cursus par étapes de la vie | Parcours *Ntina*, *Ogèndo*, *Emeno*, *Ikôkô* (et classes d'âge) ; cours de langue tirés du corpus avec source et page ; progression, niveaux, contrôles de fin d'unité (4 sur 5), certificats (L) |
| O4 | Studio de création | Pour artisans et enseignants : ajout de vidéos, chapitres, sous-titres, contrôles, relecture, publication ; **premiers cours d'artisans** (vin de palme, hors-bord, cuisine, art vestimentaire…) (L) |
| O5 | Assistant IA enseignant | Texte puis voix ; règles du corpus (ôrungu, corrections de Capp) ; limites pour les enfants ; **passerelle IA avec comptage des jetons et quotas (J1 à J3)** (L) |
| O6 | Voix, bibliothèque, opportunités | Enregistrements de locuteurs, « Dire » ; bibliothèque et librairie ; opportunités pour la jeunesse (L) |
| O7 | Cours à distance | Appels **de pair à pair chiffrés de bout en bout** (WebRTC, UDP) : signalisation, STUN, relais TURN ; 1 à 1 et **groupes de 4 au maximum** (limite appliquée par le serveur) ; une classe se divise en plusieurs groupes ; pas de serveur de distribution ; précepteurs (L) |
| O8 | Accessibilité et attestation | Cycles 1-2 sans lecture, sous-titres, validation des contenus par les validateurs, attestation de fin de cycle (M) |
| **Porte** | | Un parcours complet (une étape de vie) et un cours d'artisan en vidéo utilisables de bout en bout |

## Module 2 : Azeva (taille XL)
Prérequis : composants de contrôle d'Onenji (O3) pour les réutiliser ; images et sons du corpus pour les jeux illustrés.

| # | Étape | Livrable |
|---|---|---|
| A1 | Hall et moteur de jeu | Hall (défi du jour, reprendre, salles), moteur commun (cœurs, points, minuteur, sons, haptique, accessibilité), crédits fictifs, serveur de scores (score calculé côté serveur) (L) |
| A2 | Premiers jeux | Les 4 jeux repris ; jeu d'essai sans inscription ; défi du jour (M) |
| A3 | Corpus | Envoi des réponses (`à valider`), statut « validé par un locuteur » sur les fiches (M) |
| A4 | Salle *Mots* | Pendu, anagrammes, syllabes, mots mêlés, dictée, singulier/pluriel, mots jumeaux, familles de mots ; puis mots croisés et fléchés (L) |
| A5 | Social et progression | Classements (amis, village, tribu), succès, avatars ; duel asynchrone ; mode enfant et tableau de bord parents (L) |
| A6 | Salles illustrées | Corps humain, maison et objets, nature, nombres, société, oralité ; contrôles 2, 3, 5, 6 (XL, dépend des images et sons) |
| A7 | Direct | Salons en direct, tournois ; pronostics gratuits ; quiz musicaux (avec Ontci) ; publicité récompensée (L) |
| A8 | Grand jeu de société | Parcours de l'enfance à l'âge adulte avec dé (L) |
| A9 | **Salle des paris** (fermée) | Portefeuille de jeu séparé, journal comptable, duel de compétence entre joueurs, jeu responsable (plafonds, pause, auto-exclusion), vérification d'identité, tirage vérifiable, tableau de conformité ; puis pronostics à mise, dés et garâme, tombola (XL) |
| **Porte A1-A8** | | Un joueur joue sans inscription, revient chaque jour, gagne des points et fait entrer des réponses au corpus |
| **Porte A9** | | Tests complets sur un **environnement d'essai** ; **aucune mise réelle avant** les cinq pièces : avis d'avocat gabonais, agrément, jeu responsable, vérification d'identité et anti-blanchiment, éligibilité des magasins. Prévoir une **version des magasins sans salle des paris** si la licence manque |

## Module 3 : Ontci (taille XL)
Prérequis : décisions §5.8 (Firebase ou VPS, sort de l'app artistes et de FireCMS, chiffrement par utilisateur ou non).

| # | Étape | Livrable |
|---|---|---|
| M1 | Architecture et compte | Choix Firebase `ontci-21a78` ou VPS ; connexion par téléphone (T4) ; compte unique (M) |
| M2 | Catalogue | Lecture seule d'abord : artistes, albums, titres, genres, discographie gabonaise, découverte, récemment écoutés (L) |
| M3 | **Lecteur instantané** (§5.6) | Lecture en flux par segments, préchargement des titres suivants, cache local plafonné, arrière-plan, liste de lecture, lecteur flottant ; **segments chiffrés, protection de niveau 1 puis DRM Nkala niveau 2** (§5.6bis) ; **mesure du délai « toucher → premier son »** (XL) |
| M4 | Streaming et direct | Plusieurs débits, direct AzuraCast, CDN ; BBR sur le serveur **avec votre accord** (L) |
| M5 | Radio et télévision | Web radio, web TV (une seule implémentation pour tout Nkala) ; chaîne de football si les droits sont confirmés (L) |
| M6 | Fonctions d'écoute | Téléchargements chiffrés, playlists partageables, recommandations, Wrapped, clips et paroles, sonneries, courtes vidéos « ontci » (XL) |
| M7 | Abonnements | Offres, essais, Mobile Money (avec N11) (L) |
| **Porte** | | Écouter un titre en moins d'une seconde et la radio en direct sur un téléphone, réseau mobile compris |

## Module 4 : Nkala (taille XL)
Prérequis : décisions §6.6 et §8bis (données `enenga` existantes, Facebook, chat, partenaires, monnaie).

| # | Étape | Livrable |
|---|---|---|
| N1 | Modèle de données et rôles | Citoyen, commerçant, modérateur, élu, administrateur ; modération (L) |
| N2 | **Carte** et annuaire | Vue principale, consultation libre sans connexion, services de proximité, guide du premier lancement, profil optionnel (L) |
| N3 | Annonces de logement | Catégories, ajout, filtres, carte/grille/liste, filtre de distance, photos et vidéo (L) |
| N4 | Annonces automobiles | Achat, location, vente, équipements, pièces (M) |
| N5 | Petites annonces diverses et emplois | Les six catégories sans formulaire ; offres d'emploi locales (M) |
| N6 | Fil d'actualités et alertes | Actualités locales, notifications : pharmacies de garde, avis de recherche, donneur de sang (M) |
| N7 | Communauté civique | Idées, votes, sondages anonymes, doléances, signalements, institutions (M) |
| N8 | Services administratifs | Taxes, état civil, contraventions : **seulement après accord officiel** (L) |
| N9 | Services à domicile, courses, taxi | Montant de la course fixé par le client (L) |
| N10 | Voyages | Horaires, réservation, paiement : partenaires à trouver (XL) |
| N11 | Portefeuille et paiements | Dépôt, 50 % à la commande et 50 % à la livraison, quotas d'annonces, abonnement premium (partagé avec M7 et A9) (L) |
| N12 | Chat | Puis appels si retenus (L) |
| N13 | Magazine et éducation | Recettes, conseils, portraits, reportages, fiches, annales, livres libres ; contenu adulte avec vérification d'âge (L) |
| N14 | Cartes et itinéraires | Guidage GPS, carte hors-ligne, géorepérage, recherche par photo (L) |
| **Porte par étape** | | Test sur appareil avec des utilisateurs réels (étude participative, version minimale, tests communautaires, lancement) |

## Protection des contenus et appels de pair à pair (transversal)
- **T10** : protection audio et vidéo **niveaux 1 et 2**. Niveau 1 : segments chiffrés, clé par utilisateur, coffre matériel, enregistrement d'écran et son interne bloqués, micro et dictaphone de l'application coupés pendant la lecture, détection d'un enregistrement du micro par une autre application sur Android seulement, filigrane (visible et inaudible). Niveau 2 : **DRM Nkala** (serveur de licences, attestation, clés dans le coffre matériel, déchiffrement natif, révocation), taille XL ; un DRM matériel au sens Widevine L1 n'est pas réalisable par nous (§5.6bis). Un enregistreur ou un téléphone **extérieur** reste impossible à bloquer.
- **T11** : appels de pair à pair chiffrés de bout en bout (WebRTC), commun à Onenji (O7) et au chat de Nkala (N12) ; **groupes de 4 au maximum** ; signalisation, STUN, TURN ; `react-native-webrtc` exige une version de développement ; §3.5.

## Régie publicitaire, accès payants, jetons de l'IA (transversal ; détail : `NKALA_AUDIT_COMPLET.md` §10bis)

**Régie publicitaire (T6)**
| # | Étape | Livrable |
|---|---|---|
| R0 | **Dès l'étape 0** | Registre des zones et composant `EmplacementPub` (rien d'affiché si coupé, abonné, enfant, hors-ligne ou exercice en cours) ; **chaque nouvel écran déclare ses emplacements** |
| R1 | Revive sur le VPS | Projet Docker `regie`, base PostgreSQL séparée, sauvegarde, maintenance horaire (`REVIVE_ADSERVER.md` §4) (M) |
| R2 | Passerelle de l'API | `GET /v1/pub`, affichage, clic, récompense ; cache court ; aucune donnée personnelle (M) |
| R3 | Zones par module | Commun, Azeva (récompense, résultats), Ontci (audio et vidéo entre titres), Nkala (listes, carte), Onenji (accueil et catalogue seulement) ; enfants selon décision (M) |
| R4 | Audio et vidéo publicitaires | Création stockée comme un média, lue par le lecteur d'Ontci ; choix Revive ou régie maison (L) |
| R5 | Mesure et tableau de bord | Affichage valide, plafonds, anti-fraude, rapport annonceur (M) |
| R6 | Conformité | Déclaration APDPVP, validation juridique, fiches des magasins (S) |

**Accès payants et achats intégrés (T7)**
| # | Étape | Livrable |
|---|---|---|
| E1 | **Dès l'étape 0** | Niveaux d'accès sur les contenus, `peutAcceder` côté serveur, composant `Verrou`, tables `produits`, `tarifs`, `abonnements`, `achats`, `droits` (M) |
| E2 | Achats intégrés des magasins | Abonnements et achats, validation des reçus et notifications serveur, restauration, hors-ligne avec péremption ; version de développement requise (L) |
| E3 | Mobile Money | Paiement web et là où permis ; webhook signé (L, partagé avec M7 et N11) |
| E4 | Écrans et administration | Mes abonnements, historique, essais, offres, remboursements, contrôle parental (M) |

**Jetons de l'IA (T12)**
| # | Étape | Livrable |
|---|---|---|
| J1 | Passerelle IA | Tous les appels de modèle passent par l'API ; comptage réel (entrée, sortie, cache) et estimation avant envoi ; journal `ia_usage` (M) |
| J2 | Quotas | Par niveau d'accès, par jour/mois/conversation ; plafond enfants ; recharge par achat consommable ; budget de contexte (résumés, cache) (M) |
| J3 | Visibilité | « Ma consommation », vue parent, tableau de bord des coûts, alertes, coupure d'urgence (M) |

**Décisions ouvertes** : Revive seul ou régie maison pour l'audio et la vidéo ; publicité dans *Ntina* et dans Onenji ; service d'abonnements ou bibliothèque directe ; contenus gratuits ou payants ; modèle d'IA, budget et quotas.

## En continu
- **Production** : builds iOS et Android, comptes développeur Apple et Google, signature, politique de confidentialité, fiches de magasin, mises à jour de code.
- **Tests automatisés** : le noyau d'abord (cache, synchronisation, file d'attente), puis les modules.
- **Sécurité et données** : revue des droits à chaque module ; sauvegardes avant toute modification de la base de production.
- **Espace disque** : le disque du Mac était plein (116 Mo libres) en début de travail ; prévoir de l'espace pour les builds et les vidéos.

## Ce qui est déjà fait (avant l'étape 0)
Partie contributeur complète (collecte, Ezango, classement, profil, inscription, administration, temps réel, hors-ligne), parité à 97 % des textes avec le site web ; protection du corpus côté serveur ; correctifs de synchronisation et état de chargement ; Expo web avec logo, fond à points et mise en page adaptable ; documentation (`NKALA_ECARTS.md`, `NKALA_ERREURS.md`, `NKALA_AUDIT_COMPLET.md`).

## Décisions encore ouvertes (résumé)
Onenji : limites de l'IA pour les enfants, validation des contenus, harmonisation des cycles, cible d'âge. Azeva : premier format de pari, avocat et agrément, opérateur de paiement. Ontci : Firebase ou VPS, chiffrement, app artistes. Nkala : données `enenga` existantes, Facebook, chat, partenaires (taxes, voyages), monnaie. Transversal : compte unique, connexion par téléphone, hébergement. Liste complète : `NKALA_AUDIT_COMPLET.md` §8 et §8bis.


## État au 10 novembre 2026 : tout le plan est codé (ajout, rien n'est supprimé plus haut)
Décision de Capp : plus de travail par étapes ; tout est codé, les services en ligne se branchent à la fin (`SERVICES_A_CONNECTER.md`).

| Bloc | État |
|---|---|
| 0.3 Navigation | **Fait** : 5 onglets (Accueil, Apprendre, Jouer, Écouter, Village) + menu « Plus » ; mini-lecteur flottant |
| 0.5 Rôles | Inchangé (utilisateur, validateur, administrateur) ; modérateur = staff ; les autres rôles (créateur, précepteur…) restent à définir |
| O1-O5, O8 Onenji | **Fait** : parcours, unités, leçons interactives, contrôle 4/5, certificat, mode enfant, cours d'artisans (vidéo, chapitres, filigrane), Ozangué (quotas de jetons) |
| O6 Voix, bibliothèque | Bibliothèque et opportunités faites ; enregistrement de locuteurs : écran « Dire » fait, serveur de locuteurs non fait |
| O7 Cours à distance | Salles, 4 au plus (serveur), signalisation faite ; caméra et micro : WebRTC natif à brancher |
| A1-A5, A7-A8 Azeva | **Fait** : hall, salles, pendu, anagrammes, mots mêlés, dictée, quiz, phrases, grand jeu à dé, défi du jour, cœurs, annonce récompensée (3 par jour), classements, duels, collection, espace parents |
| A6 Salles illustrées | Structure faite (collections `salles`, `jeux`, `mots_jeux`) ; images et sons à fournir |
| A9 Salle des paris | **Fermée**, aucun code d'ouverture |
| M1-M5 Ontci | **Fait** : catalogue, lecteur à file d'attente avec préchargement, paroles, radio, télévision, favoris, récents |
| M3 Chiffrement des segments, M6 téléchargements, M7 abonnements | Licence courte et filigrane faits ; segments chiffrés et téléchargements à brancher ; abonnements accordés à la main en attendant E2 |
| N1-N7, N9, N13 Nkala | **Fait** : annuaire, carte schématique, fiches, pharmacies de garde, annonces (quota, modération), actualités, Commune+ (sondages, idées), signalements, taxi (prix du client), magazine, services |
| N8, N10, N11, N12, N14 | À venir (accord officiel, partenaires, portefeuille, chat, itinéraires dans l'application) ; services marqués « Bientôt » |
| T6 R2-R3 Publicité | Passerelle et plafonds faits ; Revive à brancher |
| T7 E1, E4 Droits | Faits (accès, administration) ; E2 et E3 à brancher |
| T12 J1-J3 Jetons | Faits (passerelle, quotas, supervision) ; clé du modèle à fournir |
| Contenus | 34 collections importables en CSV ou JSON ; `contenu/LISEZMOI.md` |
| Console | Supervision, Contenus, Interrupteurs, Annonces et signalements, Abonnements, Journal |

**Vérifié** : `tsc` sans erreur (application et serveur) ; 94 tests de l'API et du noyau réussis ; application web lancée (entrée, accueil, Apprendre avec une leçon, Jouer avec le pendu, Écouter, Village, réglages, thème clair). **Non vérifié** : iOS et Android, sons, micro, caméra, flux réels, déploiement sur le VPS (migration `006_nkala.sql`).
