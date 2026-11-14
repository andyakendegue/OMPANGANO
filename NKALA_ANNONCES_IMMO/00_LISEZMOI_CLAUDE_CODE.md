# Mission Claude Code — Annonces de logement complètes (Nkala, module Village)

> Lis ce fichier, puis 01, 02, 03 et `equipements_logement.json`, **avant** d'écrire du code.
> Demande de Capp (13/11/2026) : annonces de logement avec photos fixes, vidéos, photos 360°, fiche complète (équipements, services, conditions), géolocalisation et alertes de proximité. Objectif : **tester au plus vite sur Android**.
> Correspond à la ligne N3 « Annonces de logement » de `NKALA_PLAN_DEVELOPPEMENT.md` (et prépare N14 « géorepérage »).

## 1. L'existant (constaté le 13/11/2026 — à revérifier, le dépôt bouge vite)
- Monorepo : `apps/nkala` (Expo SDK 54, Expo Router, React Native 0.81, React Native Web), `packages/noyau` (logique partagée, client API `nkalaApi.ts`), `server/` (API Fastify + PostgreSQL 16 + Garage S3, Docker, VPS). Firebase sert **uniquement à la connexion**.
- **Ne pas** utiliser Firestore ni Firebase Storage. **Ne pas** s'inspirer du dépôt Flutter `~/Projets/nkala-app` (ancien exemple).
- Annonces actuelles :
  - Écran : `apps/nkala/src/Village.tsx` → fonctions `Annonces`, `DetailAnnonce`, `Publier` (titre, description, prix, ville, téléphone ; « Les photos arrivent bientôt »).
  - Client : `packages/noyau/src/nkalaApi.ts` → `publierContenu('annonces', …)`, `chargerAnnonces(categorie, ville)`, `mesContenus`.
  - Serveur : `server/api/src/contenus.ts` → `POST /v1/utilisateur/:collection` (quota mensuel par catégorie, statut `en_attente`, modération), `GET /pub/annonces`, `GET/POST /v1/admin/moderation…`. Stockage : table `contenus` (`collection='annonces'`, `data jsonb`, `owner_id`, `statut`, `publie`), migration `server/migrations/006_nkala.sql`.
  - Catégorie de logement : `categories_annonces` id **`logement`** (`contenu/categories_annonces.json`).
- Médias : `server/api/src/storage.ts` (interface `MediaStorage`, URL présignées Garage), `POST /v1/media/upload-url` et `GET /v1/media/url` dans `server/api/src/app.ts`, contrôle des chemins par `mediaPathError` (seuls `recordings/{uid}/…` en audio et `images/…` réservé aux admins), limite `MAX_UPLOAD_BYTES` = 15 Mo (`config.ts`).
- Interface : composants maison `apps/nkala/src/kit.tsx` (`Ecran`, `Entete`, `Bouton`, `Puce`, `Champ`, `Carte`, `Visuel`, `Feuille`, `Ic` = icônes **Ionicons** via la table `ICONES`, `useToast`…), thème `theme.ts` / `useTheme()`, pile de navigation interne `usePile()`.
- Notifications locales : `apps/nkala/src/Notifications.tsx` (`expo-notifications` ; le push iOS est retiré par `plugins/sans-push-ios.js`, les notifications **locales** restent possibles).
- Localisation : `expo-location` déjà installé (`usePosition` dans `Village.tsx`).
- File d'envoi hors ligne existante : `apps/nkala/src/fileAttente.ts` (contributions audio) — s'en inspirer pour les médias d'annonce.
- Tests serveur : `cd server && npm test` (`tsx --test api/test/*.test.ts`), test existant `annonces : quota mensuel, modération…` dans `api/test/nkala.test.ts`. Vérification de types : `npm run lint` (serveur) et `cd apps/nkala && npm run lint`.
- Lancement local : `.claude/launch.json` (`nkala-api-demo` sur 3001 + `nkala-demo` web sur 5173). Android : `cd apps/nkala && npx expo run:android` (version de développement, pas Expo Go).

## 2. Ce que le code actuel empêche (à lever)
1. `POST /v1/utilisateur/annonces` **aplatit** les données : seuls textes, nombres, booléens et listes de 10 textes passent, 20 clés au plus. Une fiche logement structurée (pièces, équipements, médias) serait **perdue**.
2. Un utilisateur ne peut **envoyer aucune image ni vidéo** (`mediaPathError` : images réservées aux admins, vidéos refusées).
3. Les médias ne sont lisibles qu'avec un compte (`/v1/media/url`), alors que les annonces se consultent **sans compte** (`/pub/annonces`).
4. Pas de coordonnées ni de filtre de distance côté serveur pour les annonces.

## 3. Périmètre de cette mission (V1)
Détail dans `01_SPEC_fonctionnelle.md` ; contrats techniques dans `02_architecture_api_donnees.md`.
1. Fiche logement complète (type de bien, pièces, équipements et services du catalogue, conditions, accès et risques, emplacement).
2. Médias : photos fixes multiples (appareil ou galerie, étiquette de pièce), vidéos (appareil ou galerie), photos 360° (import d'images équirectangulaires 2:1) avec visionneuse immersive.
3. Envoi des médias vers Garage par URL présignées, avec file d'attente et reprise hors ligne.
4. Liste avec filtres (dont distance) et page détail riche.
5. Alertes de proximité par géorepérage (`expo-location` + `expo-task-manager`) et notification locale.
6. Badge « Visite certifiée ».
7. Modération : la console voit les médias avant de publier.
Hors V1 (préparer sans coder) : capture 360 guidée dans l'app avec assemblage sur le VPS, vues 360 depuis la rue, floutage automatique, alertes de zone.

## 4. Ordre d'exécution
1. `git status` : le dépôt contient des modifications **non commitées de Capp** (Village, Accueil, etc.). Ne pas les écraser, ne pas les committer avec ton travail ; si un fichier que tu dois modifier est déjà modifié, travaille par-dessus sans perdre ses changements.
2. Créer la branche `feat/annonces-logement`.
3. Noyau : types + validateur partagé `packages/noyau/src/logement.ts` + catalogue (copier `equipements_logement.json` vers `contenu/equipements_logement.json` ou `packages/noyau/contenu/`, selon la convention des autres JSON) → tests → commit.
4. Serveur : migration `012_annonces_logement.sql`, routes (02 §3-§5), médias `annonces/…`, tests → commit.
5. Client API (`nkalaApi.ts`) + file d'envoi des médias → commit.
6. Écrans : formulaire en étapes, liste/filtres, détail, visionneuse 360 → commit.
7. Alertes de proximité + configuration `app.json` → commit.
8. Console de modération : aperçu des médias et de la fiche → commit.
9. `npm test` (serveur), `npm run lint` (serveur et app) sans nouvelle erreur.
10. Lancer en local (démo API + web) et vérifier le parcours ; puis `npx expo run:android` et donner à Capp les étapes de 03.

## 5. Contraintes
- Interface en français, **vouvoiement** dans les annonces (service citoyen). Monnaie **FCFA**, format `350 000 FCFA` (espace insécable, sans décimales).
- Respecter `NKALA_IDENTITE_VISUELLE.md` et le thème clair/sombre existant ; réutiliser `kit.tsx`, ne pas créer un second système de composants.
- Téléphones modestes, réseau instable : compression des photos, vignettes, chargement progressif, pas de lecture vidéo automatique, envois reprenables.
- Un seul code pour web et mobile ; ce qui est impossible sur le web (géorepérage, appareil photo natif) se dégrade proprement avec un message.
- Toute nouvelle dépendance : `npx expo install <paquet>` (versions compatibles SDK 54). Les modules natifs imposent une nouvelle version de développement : le signaler à Capp.
- **Ne rien déployer sur le VPS**, ne pas lancer la migration en production, ne pas pousser sur un dépôt distant sans accord de Capp.
- Données personnelles : loi gabonaise n°025/2023 (APDPVP), déjà citée dans `NKALA_EXPO.md` et `REVIVE_ADSERVER.md`.

## 6. Terminé quand
- Les 4 blocages du §2 sont levés, les anciennes annonces (format plat) s'affichent toujours, le test existant passe.
- En local : créer une annonce logement complète avec photos, une vidéo et une 360 → la modérer dans la console → elle apparaît publiquement sans compte, avec médias, équipements groupés, carte et filtres.
- Sur Android : alerte de proximité activée, position simulée dans le rayon → notification reçue, toucher ouvre l'annonce.
- Nouveaux tests verts, `lint` sans nouvelle erreur.
- Récapitulatif final : fichiers modifiés, dépendances ajoutées (versions), migration à lancer sur le VPS, points restants.
