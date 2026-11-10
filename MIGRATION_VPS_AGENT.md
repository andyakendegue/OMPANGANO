# Mission : migrer les données d'OMPANGANO de Firebase vers le VPS d'Essaka Engineering

> Fiche de mission pour l'agent de code (Claude Code), à exécuter dans le dossier `OMPANGANO/`.
> Rédigée le 31 octobre 2026. Lire ce fichier en entier avant de commencer.

## 0. Contexte en bref

OMPANGANO est une application web (React 19 + Vite + PWA) de crowdsourcing de la langue myènè. Les contributeurs lisent des phrases, proposent une orthographe et enregistrent leur voix. Les validateurs évaluent, et des points et badges sont attribués à la validation. L'application doit marcher **hors-ligne** : en village, sans réseau, en mode avion.

Aujourd'hui tout est sur Firebase (projet `enenga`) : Hosting, Auth, Firestore, Realtime Database (RTDB) et Storage. Le quota gratuit de Firestore (50 000 lectures par jour) est un risque réel. Le catalogue va passer d'environ 10 000 à environ 45 000 phrases (voir `data/corpus_myene/`).

**Décision du propriétaire (Capp, Essaka Engineering) :**

| Garder chez Firebase | Déplacer sur son VPS |
|---|---|
| Firebase **Hosting** (site `ompangano`) | **Base de données** |
| Firebase **Auth** (Google + e-mail/mot de passe), inchangé | **Voix** et **images** |

Firestore, la RTDB et Storage ne doivent plus être utilisés par OMPANGANO à la fin de la mission.

Avant de commencer, lire `AUDIT_OMPANGANO_2026-10-30.md` (audit + corrections déjà faites) et `src/services/userSecurity.ts` (règles métier des points).

## 1. Architecture cible

```
Navigateur (PWA, inchangée côté UI)
 ├─ Firebase Auth ──► jeton d'identité (ID token)
 ├─ HTTPS + "Authorization: Bearer <ID token>" ──► API OMPANGANO (VPS)
 │                                                 ├─ PostgreSQL
 │                                                 └─ Garage (stockage S3 : voix, images)
 └─ envoi/lecture audio direct ──► Garage, via URL présignée délivrée par l'API
```

À installer sur le VPS, avec **Docker Compose** :
- **PostgreSQL 16 ou plus récent**.
- **Garage**, stockage objet compatible S3. Ne pas utiliser MinIO : la version communautaire n'est plus distribuée en binaires depuis octobre 2025 et son dépôt est archivé.
- **API** en Node.js + TypeScript, avec Fastify ou Hono au choix de l'agent. Accès SQL via Kysely ou Drizzle avec migrations versionnées. Pas d'ORM lourd.
- **Caddy** en reverse proxy, avec HTTPS automatique.
- **Sauvegardes** : `pg_dump` quotidien + copie du bucket Garage, rotation sur 14 jours, script de restauration testé.

## 2. Paramètres à demander au propriétaire AVANT la phase 4 (déploiement)

Ne pas inventer ces valeurs. Les demander, puis les noter dans `server/.env.example` et dans le README.

1. Système du VPS (Ubuntu / Debian…), RAM, Docker déjà installé ou non.
2. Domaine de l'API, par exemple `api.essaka.engineering` (proposition), et domaine des fichiers, par exemple `media.essaka.engineering`.
3. Accès SSH : l'agent prépare les scripts, mais le propriétaire les exécute lui-même s'il préfère.
4. Destination des sauvegardes hors du VPS (autre VPS, disque…).

Les phases 1 à 3 se font en local sans ces informations, avec Docker Compose sur la machine de développement.

## 3. Règles impératives

1. **Ne pas toucher à Firebase Auth** ni au flux de connexion (`AuthGateScreen`, `AuthModal`, `signInOrRegisterWithEmail`). Les comptes existants doivent continuer à fonctionner sans réinitialisation de mot de passe.
2. **Garder la couche hors-ligne** : cache IndexedDB (`src/services/offlineStorage.ts`), file de mutations, contributions gardées sur l'appareil, service worker (`public/sw.js`, plugin dans `vite.config.ts`). Seule la source de données change.
3. **La sécurité se décide sur le serveur.** Le navigateur ne fixe jamais :
   - le rôle, le statut, les XP, les badges, les compteurs ;
   - le calcul des points.

   Reprendre exactement la logique de `src/services/userSecurity.ts` : `computeValidationReward`, `PROTECTED_USER_FIELDS`, `NEW_USER_PROTECTED_DEFAULTS`, `validationBadgesFor`. Il faut l'exécuter côté serveur, dans une transaction SQL. Idéalement, déplacer ce fichier dans un dossier partagé `shared/` importé par le front et l'API.
4. **Super-administrateur** : uniquement l'adresse exacte `andymigoumbi@gmail.com` avec `email_verified = true`. Jamais de test « l'adresse contient admin ».
5. **Ne pas casser le site `enenga`**, qui partage le même projet Firebase. Ne pas redéployer `firestore.rules`, `database.rules.json` ou `storage.rules` sans accord explicite.
6. **Langue** : écrire **Ôrungu** (avec Ô), jamais « orungu » ou « Orungu » dans le texte visible. Ne jamais inventer de mot myènè : les textes de l'interface viennent de `src/services/myeneLexique.ts`.
7. **Données personnelles** (loi gabonaise n° 001/2011) : un contributeur ne lit que son propre profil complet. Le classement public n'expose que nom affiché, photo, tribu, village, XP, niveau et compteurs.
8. Travailler sur une **branche git** `migration-vps`. Faire des commits par phase, en français. Ne jamais pousser de secrets : `.env` est déjà ignoré, il faut fournir un `.env.example`.

## 4. Phases et critères de réussite

### Phase 1 — Serveur : schéma, API, authentification

Créer `server/` avec `docker-compose.yml`, `Caddyfile`, `api/`, `migrations/`, `.env.example` et `README.md`.

**Vérification du jeton Firebase**, sans clé secrète :
- vérifier la signature avec les clés publiques Google (JWKS `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`), à mettre en cache ;
- vérifier `iss = https://securetoken.google.com/enenga`, `aud = enenga`, l'expiration, et que `sub` n'est pas vide ;
- refuser `firebase.sign_in_provider = anonymous`.

`firebase-admin` est acceptable si c'est plus simple, mais sans compte de service si possible.

**Schéma PostgreSQL** :
- **Tables** : `users`, `leaderboard` (vue ou table dérivée de `users`), `items`, `contributions`, `clans`, `villages`, `themes`, `badges`, `challenges`, `admins`, `metrics`.
- **Colonnes communes** : `id text primary key`, `data jsonb` pour les champs secondaires si utile, `created_at`, `updated_at timestamptz` (mis à jour par trigger), `deleted_at timestamptz` (suppression logique, pour propager les suppressions aux appareils hors-ligne).
- **Index** : `updated_at` sur chaque table ; `items(source_ref)` unique quand non nul ; `contributions(user_id)` ; `contributions(status)` ; `contributions(item_id)`.
- **Champs métier** : reprendre ceux de `src/types/index.ts` (`UserProfile`, `QuestionnaireItem`, `Contribution` avec `rewardedXp`, `rewardedContribution`, `rewardedRecording`, `countedChallengeIds`, `audioStoragePath`, `audioMimeType`…).

**Points d'accès de l'API** (préfixe `/v1`, JSON) :

| Méthode et chemin | Droits | Rôle |
|---|---|---|
| `GET /me` | connecté | Profil ; le crée avec les valeurs initiales s'il n'existe pas ; le super-admin reçoit `role=admin` |
| `PATCH /me` | connecté | Champs non protégés uniquement ; les champs protégés envoyés sont **ignorés** |
| `GET /sync/:collection?since=<iso>&limit=` | connecté | Modifications depuis `since` (y compris `deleted_at`), paginées, triées par `updated_at` |
| `GET /leaderboard` | connecté | Classement public |
| `GET /users`, `PATCH /users/:id` | admin (validateur en lecture) | Gestion ; rôle et statut réservés à l'admin |
| `POST /contributions` | connecté, non suspendu, consentement accepté | Création toujours `pending`, `userId` = jeton |
| `DELETE /contributions/:id` | auteur si `pending`, ou admin | Retire les points si déjà attribués, supprime l'audio |
| `POST /contributions/:id/validate` | validateur ou admin, jamais sur ses propres contributions | Transaction : contribution + récompenses du contributeur + compteur du validateur |
| `POST /items/import` | admin | Import CSV, logique de `deduplicateParsedCsvItems` : même numéro = mise à jour, sinon création, sans doublon |
| CRUD `items`, `clans`, `villages`, `themes`, `badges`, `challenges` | admin (création de clan/village : connecté) | Mêmes droits que `firestore.rules` actuel |
| `POST /media/upload-url` | connecté | URL présignée PUT vers `recordings/{uid}/…` ou `images/…` (admin) ; types `audio/*` ou `image/*` seulement, 15 Mo maximum, validité 10 min |
| `GET /media/url?path=` | connecté | URL présignée GET |
| `GET /events` | connecté | Server-Sent Events : signal léger « collection X modifiée à T », qui remplace `metrics/catalog_versions` |

**Robustesse** : limitation de débit par utilisateur, CORS limité aux domaines du site (`ompangano.web.app`, domaine personnalisé, `localhost` en dev), journaux sans données personnelles, endpoint `/health`.

**Critères** :
- `docker compose up` lance tout en local.
- Les tests de l'API passent. Ils reprennent les cas de `tests/rules.test.mjs`, transposés :
  - un contributeur ne peut pas se donner le rôle admin ni changer ses XP ;
  - une adresse comme `badminton.admin@…` n'est pas admin ;
  - personne ne valide sa propre contribution ;
  - un renvoi de validation ne compte pas deux fois ;
  - un rejet après approbation retire les points ;
  - l'envoi audio hors de son dossier est refusé, ainsi que l'envoi d'un fichier non audio.

### Phase 2 — Front : remplacer Firestore, RTDB et Storage

Créer `src/data/api.ts`, un client qui ajoute le jeton via `auth.currentUser.getIdToken()` et le rafraîchit en cas de 401. Réécrire `src/firebase.ts` en **façade** qui garde les mêmes noms exportés (`dualSaveRecord`, `dualBatchSaveRecords`, `dualDeleteRecord`, `smartFetchCollection`, `smartGetUserProfile`, `subscribeToCatalogSignals`, `replayPendingOfflineAdminMutations`, `bumpCatalogVersion`…). Ainsi `App.tsx` et les composants changent le moins possible. Garder dans `firebase.ts` l'initialisation Firebase **Auth** seulement.

À remplacer aussi :
- `App.tsx` utilise directement `runTransaction` de Firestore et `rtdbUpdate` dans `applyValidationWithRewards` et `handleDeleteContribution`. Les remplacer par `POST /contributions/:id/validate` et `DELETE /contributions/:id`. Le calcul des points ne se fait plus dans le navigateur.
- `src/services/audioUpload.ts` : passer par `POST /media/upload-url` puis un `PUT` direct. Garder la logique « si l'envoi échoue, la contribution reste sur l'appareil ».

Synchronisation :
- au premier lancement, téléchargement complet paginé ;
- ensuite, uniquement `since=<dernière synchro>` ;
- appliquer `deleted_at` en retirant l'élément du cache local.

Supprimer tout ce qui concerne le quota Firestore (« Bouclier Spark », `isFirestoreQuotaExhausted`…) une fois inutile.

`package.json` : retirer les scripts `deploy:rules` et `test:rules` Firebase, garder `deploy:hosting`. Le paquet `firebase` reste, pour Auth seulement. Vérifier que le bundle ne contient plus Firestore, RTDB ni Storage.

**Critères** :
- `npm run lint` et `npm run build` passent.
- En local, contre l'API Docker : connexion, contribution avec voix, validation, points, classement, suppression et import CSV fonctionnent.
- En **mode avion** : on contribue et on enregistre ; au retour du réseau, tout part sans doublon.

### Phase 3 — Script de migration des données existantes

Écrire `server/scripts/migrate-from-firebase.ts`, avec le SDK Admin et un compte de service fourni par le propriétaire au moment de l'exécution, jamais enregistré dans git. Le script doit :
1. Lire Firestore **et** RTDB pour chaque collection OMPANGANO. Fusionner en prenant la version au `updatedAt` le plus récent, Firestore étant prioritaire à égalité.
2. Copier les fichiers Storage de `recordings/` vers Garage (même chemin), puis réécrire `audioUrl` et `audioStoragePath`. Les contributions anciennes qui ont l'audio en base64 dans le document : décoder et envoyer le fichier dans Garage.
3. Être **idempotent** (relançable), avec un mode `--dry-run` et un rapport (compte par collection, erreurs).
4. Ne rien supprimer côté Firebase.

Charger ensuite le corpus `data/corpus_myene/corpus_myene_ANCIEN_mis_a_jour.csv` (ITEM_xxxx) et `corpus_myene_NOUVEAU_35000.csv` (NEW_xxxxx) via la logique d'import par numéro (`source_ref`). Ces fichiers ont des colonnes supplémentaires (`provenance`, `source_page`, `statut`…) à conserver dans `data jsonb`. **Demander au propriétaire** s'il faut importer toutes les phrases ou seulement le statut `attestee` dans un premier temps.

**Critères** : un essai à blanc puis une migration complète sur la base locale, avec des comptes identiques à Firebase dans le rapport.

### Phase 4 — Déploiement et bascule

Seulement après avoir reçu les paramètres de la section 2.

1. Script `server/deploy.sh` ou procédure pas à pas dans `server/README.md`. Il couvre : installation de Docker si besoin, `docker compose up -d`, DNS (enregistrement A vers le VPS), HTTPS par Caddy, création du bucket Garage et de ses clés, migrations SQL.
2. Sauvegardes automatiques (cron) et **test de restauration**.
3. Bascule :
   1. annoncer une courte coupure ;
   2. migration finale ;
   3. `npm run deploy:hosting` avec `VITE_API_URL` pointant vers le VPS ;
   4. vérification complète.
4. Retour arrière documenté : redéployer la version Firebase précédente (tag git `avant-migration-vps`), puisque Firebase n'a pas été vidé.
5. Après deux semaines stables, et **seulement avec accord du propriétaire** : proposer de fermer les collections OMPANGANO dans les règles Firebase. Attention au site `enenga`.

## 5. Ce que l'agent doit livrer

- Branche `migration-vps` avec commits par phase.
- `server/` complet : Compose, Caddyfile, API, migrations, scripts, `.env.example`, README en français.
- Front adapté (`src/data/api.ts`, `src/firebase.ts` réduit à Auth + façade, `audioUpload.ts`).
- Tests de l'API et rapport de migration à blanc.
- Une section « Migration VPS » ajoutée à `AUDIT_OMPANGANO_2026-10-30.md` : ce qui a changé, comment déployer, comment revenir en arrière.

## 6. Quand s'arrêter et demander

- Il manque un paramètre de la section 2.
- Une action toucherait au site `enenga`, aux règles Firebase déployées ou supprimerait des données Firebase.
- Un choix de produit n'est pas tranché ici (par exemple quelles phrases du corpus importer).
- Un test de sécurité de la phase 1 échoue et la correction changerait une règle métier de `userSecurity.ts`.
