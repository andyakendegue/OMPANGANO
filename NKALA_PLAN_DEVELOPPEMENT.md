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
| O1-O5, O8 Onenji | **Fait** : parcours, unités, leçons interactives, contrôle 4/5, certificat, mode enfant, cours d'artisans (vidéo, chapitres, filigrane), Kak'Igonjo (quotas de jetons ; ex-Ozangué) |
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

## Décision du 15 novembre 2026 : vidéos en streaming, masterclass (ajout)

Plus de vente des vidéos à l'unité : Igolani et les cours d'artisans en streaming par abonnement (Premium ouvre tout) ; seuls les cours avec les professeurs sont payants (masterclass) ; fonds des créateurs au prorata des minutes regardées ; moteur de calcul des reversements (contributeur spécial, créateurs, professeurs, associations), taux en base et définition confidentielle hors dépôt (`DONDO/15_modele_economique/05_calcul_des_reversements.md`). **Tâche détaillée, prête à lancer dans une autre session : `NKALA_AUDIT_APPRENDRE_2026-11-12.md` §18.**

## Décisions du 22 novembre 2026 : cursus v3, voix, reconnaissance des sons, accord des parents, gratuité (ajout)

Source : audit `../14_programme_et_jeux/05_audit_cursus_v3_Rekanga.md`, règles `../_contexte/REGLES_V3_complement_2026-11-22.md`, consigne de travail `../14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md`.

**Cursus Onênji** : conversion en graphie v3 (Rékanga) et enrichissement selon les lots de la consigne ; import des cours en production à la fin de chaque lot, pour que Capp teste et critique (accord de Capp du 22 nov.).

**Reconnaissance des sons (correction des audios des enfants)** — validé par Capp :
1. Relancer la tâche ZIPA interrompue (Capp), insérer ses résultats dans le corpus et l'évaluer sur des audios ôrungu.
2. Phase 1 : la machine compare la prononciation de l'élève à la prononciation attendue du mot et donne une note **indicative** ; un **modérateur** décide. Jamais d'échec sur la seule note de la machine.
3. Phase 2 : chaque audio corrigé par le modérateur devient une donnée d'entraînement ; affinage du modèle sur l'ôrungu et les voix d'enfants dès que le volume suffit (à mesurer).
4. Une partie des exercices « Dire juste » devient « dire » (l'élève s'enregistre), corrigée par un modérateur.

**Phrases du corpus** : mettre à jour les 50 125 phrases en v3 (décisions du 22 nov.) ; classer les phrases selon les sons qu'elles contiennent pour **prioriser** leur correction et leur enregistrement dans Ompangano (sons rares ou difficiles d'abord : *ngh*, *c*, *j*, *ê*, *ô*, *b* et *d* « avalés », tons) ; affiner ensuite avec la collecte Ompangano.

**Voix** — validé par Capp :
- Des voix d'adultes guident les enfants.
- Les mots de Ntina (≈ 400) sont enregistrés par une vraie voix. **Planning** : liste des mots et des sons à enregistrer, enregistrement, **vérification que tout y est** (chaque mot, chaque son), puis ajout dans l'application.
- Kokoro-82M (en production) dit le reste ; la fonction qui prépare la prononciation (`apiDepuisGraphie`) passe en graphie v3.
- Entraînement d'une voix ôrungu : constituer un **jeu de phrases et de textes** couvrant tous les sons, assez long pour atteindre les heures d'enregistrement requises, enregistré par une seule voix.

**Accord des parents** : un formulaire d'accord existe à l'inscription. Vérifier qu'il couvre la conservation des voix des mineurs et leur usage pour entraîner les modèles, avec l'accord d'un parent ; l'ajuster si besoin.

**Gratuit et payant** — validé par Capp :
- Gratuit : tout Ntina, l'alphabet et la lecture, tous les cours d'Ogêndo, d'Emênô et d'Ikôkô, la contribution, une correction de prononciation de base.
- Payant : cours avec professeur (masterclass, cours à distance, ateliers ; 80 % au professeur) ; Igôlani (vidéos, par abonnement) ; Kak'Igonjo au-delà d'un quota gratuit et examen avec un locuteur ; attestation officielle de niveau ; licences pour écoles et associations ; services aux entreprises de la grille tarifaire.
- Mode enfant : pas de publicité, aucun achat sans contrôle parental. Abonnements : Mobile Money sur la version web.

## Décision du 28 novembre 2026 : paiements locaux sur le web, paiements des magasins sur mobile (ajout)

Sources : `../Nkala-AirtelMoney-Api/AUDIT_2026-11-28.md` (§ 5, voie A retenue), `../_contexte/JOURNAL.md` (entrées du 28 nov.). Remplace la ligne « E3 Mobile Money : paiement web et là où permis » : le paiement local n'est plus proposé dans les applications iOS et Android, dans aucun pays.

**Décisions de Capp**
- **Voie A** : Airtel Money, Moov Money et BambooPay sont intégrés directement dans l'API de Nkala, comme des fournisseurs interchangeables. Le dépôt `Nkala-AirtelMoney-Api` (maquette, 6 failles critiques) n'est ni déployé ni repris.
- **Applications iOS et Android** : on paie seulement avec les paiements des magasins (achats intégrés Apple et Google).
- **Site web** (version web de Nkala) : paiements locaux (Airtel Money, Moov Money, BambooPay, et le mode manuel actuel).

**Règles des magasins à respecter (vérifiées le 28 nov. 2026, à revérifier avant chaque soumission)**
- L'application mobile ne montre **ni bouton, ni lien, ni phrase** qui mène au site ou à un autre moyen de paiement, même si le magasin ne propose pas Mobile Money (Apple 3.1.1 et 3.1.3 ; règles de paiement de Google Play). Pas non plus de notification push qui invite à payer sur le site.
- Ce qui a été payé sur le site **s'ouvre dans l'application** (droits gardés sur le serveur ; Apple 3.1.3(b)) : l'application n'en parle pas, elle lit simplement les droits à la connexion. Les packs de Nkoruna achetés sur le site ne sont permis que s'ils existent **aussi** en achat intégré.
- Inviter à souscrire **hors de l'application** est permis : SMS, e-mail, WhatsApp, réseaux sociaux, affiches avec QR code, site. Seulement avec le consentement enregistré de la personne (règles D1 à D3 de `SECURITE_ISO27001.md`).
- **Exceptions, à confirmer service par service** : les biens et services physiques du Village (taxi, bouteilles de gaz, factures SEEG, paiements administratifs, commandes à 50 % et 50 %) ne passent pas par les achats intégrés ; Mobile Money y reste permis dans l'application (Apple 3.1.5(a) ; biens physiques chez Google). Un cours en direct **d'une personne à une autre** peut aussi être payé autrement (Apple 3.1.3(d)) ; les cours à distance à plusieurs (jusqu'à 4) passent par les achats intégrés.

**Étapes (taille relative)**
| # | Étape | Livrable |
|---|---|---|
| P0 | Mise en conformité immédiate (S) | **Avant la prochaine soumission aux magasins** : retirer de l'application mobile le paiement Mobile Money (`Boutique.tsx`, `CoursDistance.tsx` « PaiementPlace », `annonces/PaiementAnnonce.tsx`), la phrase iPhone « rendez-vous sur ompangano.web.app » (`Boutique.tsx`), et « Achète des Nkoruna en FCFA (Mobile Money) » (`Nkorouna.tsx`). Garder ces parcours sur le web (`Platform.OS === 'web'`). La version Android 0.3.0 vc14 (piste alpha) les contient encore |
| P1 | Couche « fournisseurs » côté serveur (M) | `server/api/src/paiements/` : une interface commune (demander un paiement, lire son état, lire un rappel) et un module par fournisseur : `manuel`, `simulation`, `airtel`, `moov`, `bamboopay`. Colonne `fournisseur` dans `paiements` (migration numérotée). Fournisseur de chaque opérateur choisi dans la console (aucun nom ni prix en dur). `mobilemoney.ts` devient le routeur de ces modules |
| P2 | Rappels des fournisseurs (S) | `POST /pay/webhook/:fournisseur`, signature vérifiée **sur le corps brut** (corrige le défaut actuel de `mobilemoney.ts`, qui signe `JSON.stringify(req.body)`). Un rappel ne fait que déclencher une lecture de l'état chez le fournisseur : l'état lu fait foi. Déduplication par identifiant du fournisseur ; états ordonnés (`en_attente` → `confirme` ou `echoue` seulement). L'ancien `/pay/webhook` reste en place pendant la transition |
| P3 | Client Airtel Money (M) | Jeton OAuth2 mis en cache, encaissement, état, remboursement ; en-têtes pays `GA` et devise `XAF` ; format du numéro, signature des rappels et limites à confirmer dans la documentation Airtel Gabon ; délais et reprises (`appelHttp.ts`). Décaissements (reversements) plus tard, avec le code PIN chiffré |
| P4 | Moov Money (M) | Même interface ; opérateur, agrégateur ou BambooPay à choisir |
| P5 | BambooPay (M) | **En attente de la documentation de l'API marchande** de Bamboo Microfinance (Capp y est client entreprise). Questions : opérateurs couverts (Airtel, Moov, cartes ?), demande de paiement, état, rappels et signature, remboursements, bac à sable, frais, délai de reversement. Attention : docs.bamboopayment.com est Bamboo Payment (Amérique latine), une autre société |
| P6 | Expiration et suivi (S) | Tâche régulière : relire l'état des paiements en attente chez leur fournisseur, expirer à 24 h, relancer les rappels manqués |
| P7 | Page de paiement du site (M) | Boutique de la version web : formules, packs de Nkoruna, crédits d'annonce, places de cours ; choix de l'opérateur, numéro, suivi de l'état ; référence `NK-…` comme clé d'idempotence |
| P8 | Achats intégrés dans l'application (L) | Bibliothèque `expo-iap` ou `react-native-iap` (version de développement, pas Expo Go). Identifiants Apple et Google de chaque produit rangés dans la collection `produits` (modifiables dans la console). Compte lié à l'achat : `appAccountToken` (Apple) et `obfuscatedAccountId` (Google), dérivés de l'identifiant de l'utilisateur. Bouton « Restaurer mes achats ». Consommables (Nkoruna, crédits d'annonce) consommés après l'accord du serveur |
| P9 | Vérification des achats côté serveur (L) | `verifierRecu` dans `achats.ts` : Apple App Store Server API (transactions signées JWS, chaîne vérifiée jusqu'à l'autorité racine d'Apple) ; Google Play Developer API (`purchases.subscriptionsv2`, `purchases.products`) et **accusé de réception sous 3 jours** (sinon Google rembourse). Notifications serveur : App Store Server Notifications V2 et Google Real-time Developer Notifications (Pub/Sub) pour les renouvellements, résiliations et remboursements, qui mettent à jour `droits.fin` |
| P10 | Un seul abonnement à la fois (S) | Abonnement actif par un magasin : le site refuse d'en vendre un second et dit où le gérer ; abonnement actif payé sur le site : l'application n'en vend pas d'autre. Renouvellement sur le site : un paiement Mobile Money vaut 31 jours, rappel par SMS ou e-mail avant la fin (avec consentement) |
| P11 | Console (M) | Correspondance produits ↔ identifiants des magasins ; fournisseur par opérateur ; liste des paiements avec leur source (Apple, Google, Airtel, Moov, BambooPay, manuel) ; remboursements ; consentements aux invitations |
| P12 | Invitations hors de l'application (S) | Campagnes SMS et e-mail vers la boutique du site, envoyées seulement aux personnes qui ont accepté ; désinscription en un clic |
| P13 | Tests et sécurité (M) | Tests : chaque fournisseur contre un faux serveur, rappels (corps brut, rejeu, ordre des états), idempotence, faux reçus Apple et Google. Lire `SECURITE_ISO27001.md` § 4 avant de coder ; numéros masqués dans les journaux ; durée de conservation des numéros ; `controle_securite.sh` avant le déploiement |

**Prérequis (Capp)**
- Compte Apple Developer payé (toujours non payé) et contrat « Paid Apps » signé dans App Store Connect ; produits créés (abonnements Oma, Inina, Anyambiè, packs de Nkoruna, crédits d'annonce).
- Profil de paiement Google Play et produits créés dans la Play Console. **À vérifier** : le pays de l'entreprise (Gabon) est-il accepté comme compte marchand par Apple et par Google ? Google propose-t-il au Gabon le paiement par la facture de l'opérateur (Airtel) ?
- Accès au portail développeur Airtel (identifiants client, clé de signature des rappels, clé publique RSA pour le PIN) et documentation de l'API pour le Gabon.
- Documentation de l'API marchande BambooPay.

**Décisions encore ouvertes**
- Prix sur mobile : identiques au site, ou majorés pour couvrir la commission des magasins (15 % pour les petites entreprises, 30 % sinon) ? Les prix des magasins sont fixés par paliers en FCFA.
- Nkoruna : un seul portefeuille pour le numérique (achats intégrés) et pour les services physiques du Village (Mobile Money), ou deux soldes séparés ?
- Liste des services du Village traités comme physiques (Mobile Money permis dans l'application).

**P0 fait le 28 nov. 2026** : `apps/nkala/src/paiementLocal.ts` (`PAIEMENT_LOCAL` = version web seulement). Dans les applications mobiles : plus de prix en FCFA, de packs de Nkoruna à acheter ni de parcours Mobile Money (boutique, place de cours, annonce supplémentaire) ; phrase iPhone « rendez-vous sur ompangano.web.app » retirée (l'iPhone affiche maintenant la même boutique qu'Android) ; texte neutre « L'achat dans l'application arrive bientôt. » à la place des boutons. Le paiement en Nkoruna reste possible partout. La version web est inchangée. Il faut une mise à jour (`eas update` ou nouvelle version) pour que les applications installées en profitent. Point ouvert : dépenser dans l'application des Nkoruna achetés sur le site n'est permis par Apple que si les packs existent aussi en achat intégré (P8).
