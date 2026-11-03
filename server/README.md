# OMPANGANO — serveur (VPS Essaka Engineering)

PostgreSQL + Garage (stockage S3 : voix et images) + API Node.js (Fastify) + Caddy (HTTPS).
Firebase ne garde que **Hosting** et **Auth** : l'API vérifie les jetons Firebase avec les clés publiques de Google, sans clé secrète.

## Démarrer en local

```bash
cd server
cp .env.example .env              # renseigner POSTGRES_PASSWORD et GARAGE_RPC_SECRET (openssl rand -hex 32)
docker compose up -d postgres garage
./scripts/init-garage.sh          # note la clé S3 affichée dans .env (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)
docker compose up -d --build api  # applique les migrations SQL au démarrage
npx tsx scripts/set-bucket-cors.ts
curl http://localhost:3001/health
```

Sans Docker, les tests de l'API tournent avec PGlite (PostgreSQL en mémoire) : `npm install && npm test`.

## Paramètres à fournir avant le déploiement (phase 4)

| Paramètre | État |
|---|---|
| Système, RAM, Docker du VPS | à fournir |
| Domaine de l'API (`API_DOMAIN`, proposition `api.essaka.engineering`) | à confirmer |
| Domaine des fichiers (`MEDIA_DOMAIN`, proposition `media.essaka.engineering`) | à confirmer |
| Accès SSH (l'agent prépare, le propriétaire exécute s'il préfère) | à confirmer |
| Destination des sauvegardes hors VPS (`BACKUP_REMOTE`) | à fournir |

## API (préfixe `/v1`, en-tête `Authorization: Bearer <jeton Firebase>`)

| Chemin | Droits |
|---|---|
| `GET/PATCH /me` | connecté (champs protégés ignorés) |
| `GET /sync/:collection?since=<curseur>&limit=` | connecté (`users` : validateur/admin) — renvoie `records`, `cursor`, `hasMore`; `deletedAt` signale une suppression |
| `GET /leaderboard` | connecté |
| `GET /users`, `GET /users/:id`, `PATCH /users/:id` | staff (lecture) / admin (écriture) |
| `POST /contributions`, `PATCH`, `DELETE /contributions/:id` | auteur (en attente) / admin |
| `POST /contributions/:id/validate` | validateur ou admin, jamais sur ses propres contributions |
| `POST /items/import` | admin (`{items:[…]}`, option `dryRun`) — les phrases écartées sont ignorées (`refused`) |
| `GET/POST /admin/phrases-ecartees`, `DELETE /admin/phrases-ecartees/:key`, `GET /admin/audit-fiches` | admin (protection du corpus, voir ci-dessous) |
| `PUT /:collection/:id`, `POST /:collection/batch`, `DELETE /:collection/:id` | admin (clans et villages : création par tout connecté) |
| `POST /media/upload-url`, `GET /media/url?path=` | connecté (images : admin) |
| `GET /events` | connecté — flux SSE `change`; à lire avec `fetch` (l'en-tête Authorization est requis) |

Écarts assumés par rapport à la fiche : SQL écrit à la main (pas de Kysely/Drizzle) avec migrations `.sql` versionnées dans `migrations/` ; l'import CSV reçoit des objets JSON (le CSV est lu par le navigateur) ; l'URL audio n'est plus stockée, elle est délivrée à la demande par `/media/url` (le bucket est privé).

## Protection du corpus contre les écrasements (2 nov. 2026)

Cause d'un incident : la file de modifications hors-ligne d'un navigateur d'administrateur est rejouée automatiquement et le serveur appliquait « la dernière écriture reçue » ; d'anciens textes remplaçaient ainsi les textes corrigés. Garde-fous (`api/src/protection.ts`, migration `002_protection_fiches.sql`) :

1. **Écriture périmée refusée** : sur `PUT /v1/:collection/:id` (réponse **409**) et `POST /v1/:collection/batch` (fiche ignorée, comptée dans `skipped`), si la date `updatedAt` portée par l'écriture précède la dernière modification enregistrée (suppression comprise). Pour les **fiches (`items`)**, une écriture **sans date valide** sur une fiche déjà présente est aussi refusée ; les autres collections acceptent encore l'absence de date. Tout client doit donc envoyer `updatedAt`. L'import `POST /v1/items/import` n'est pas concerné.
2. **Phrases écartées** (table `rejected_phrases`) : jamais acceptées par `PUT` (**422**), lot ou import (`refused` dans le rapport). Liste initiale créée au démarrage : « Irende si bendi go nongo » et les anciens textes IA des phrases de départ. Gestion : `GET/POST /v1/admin/phrases-ecartees`, `DELETE /v1/admin/phrases-ecartees/:key` (administrateurs) ; le `GET` indique aussi les fiches de la base qui portent déjà une phrase écartée.
3. **Phrases de départ** : au démarrage, une phrase de départ (`system_ompangano`) qui porte encore son ancien texte IA est remplacée par le texte corrigé (le CSV ne peut pas modifier ces fiches). Données générées depuis le site : `npx tsx scripts/generer-seed-serveur.mts` ; un test vérifie qu'il n'y a pas d'écart avec `src/services/seedData.ts`.
4. **Journal** (table `item_audit`, `GET /v1/admin/audit-fiches?item=&action=&limit=`) : créations, modifications, corrections du seed, écritures périmées et phrases refusées, avec l'auteur (uid), l'origine (`put`/`batch`/`import`/`serveur`), les anciens et nouveaux textes et les dates.

**Mise en service** : le redémarrage de l'API applique la migration 002, crée la liste initiale et corrige les phrases de départ (opérations sur la base, à faire avec accord). Avant de réimporter un CSV : vider la file hors-ligne des navigateurs d'administrateurs (clé `nkala_offline_admin_mutations`).

## Sauvegardes (chiffrées)

- `backup/backup.sh` : `pg_dump` + copie du bucket, chiffrés en AES-256 avec `/opt/ompangano/secrets/backup.key` ; rotation 14 jours dans `/opt/ompangano/backups/`. Cron quotidien à 03:15 (`/etc/cron.d/ompangano`, journal `/var/log/ompangano-backup.log`).
- **La clé `backup.key` doit aussi être gardée hors du VPS** (gestionnaire de mots de passe) : sans elle, les sauvegardes sont illisibles.
- `backup/restore.sh <dump.enc> [<media.tar.gz.enc>]` restaure dans une base `ompangano_restore` (testé le 1er novembre 2026 : comptes identiques). Mise en service à la main.
- Copie vers Firebase Storage : `backup/upload-firebase.ts` (dossier `backups-ompangano/`, fichiers chiffrés). Demande un compte de service limité à la création d'objets Storage, distinct de la clé d'administration. **Non utilisable tant que le projet `enenga` est sur le plan gratuit** : Google refuse l'envoi (« billing account … disabled », bucket `enenga.appspot.com`, essai du 1er novembre 2026). Il faudrait passer en Blaze, ou choisir une autre destination (autre serveur via `BACKUP_REMOTE`, Google Drive avec rclone…).

## Déploiement et bascule (phase 4 — après réception des paramètres ci-dessus)

1. DNS : enregistrements A de `API_DOMAIN` et `MEDIA_DOMAIN` vers le VPS.
2. Sur le VPS (Docker requis) : copier `server/` et `shared/` et `src/types/`, créer `.env`, puis
   `docker compose --profile prod up -d --build postgres garage` → `./scripts/init-garage.sh` (noter la clé dans `.env`) →
   `docker compose --profile prod up -d --build` → `npx tsx scripts/set-bucket-cors.ts`.
3. Contrôle : `curl https://$API_DOMAIN/health`.
4. Migration à blanc (compte de service fourni par le propriétaire, hors git) :
   `npx tsx scripts/migrate-from-firebase.ts --service-account=/chemin/cle.json --dry-run`
5. Corpus (à blanc, puis réel) : **utiliser les fichiers FINAUX** de `07_donnees/OMPANGANO/final/` (`corpus_myene_ANCIEN_FINAL_10000.csv`, `corpus_myene_NOUVEAU_FINAL_40125.csv`) : `--corpus=<chemin>/corpus_myene_ANCIEN_FINAL_10000.csv,<chemin>/corpus_myene_NOUVEAU_FINAL_40125.csv [--statuts=attestee]`. Les fichiers de `OMPANGANO/data/corpus_myene/` datent du 30 octobre et contiennent des phrases rejetées depuis (voir `data/corpus_myene/LIRE_AVANT_IMPORT.md`). Pour l'import depuis l'administration du site : `final/IMPORT_1_ancien_FINAL_10000.csv` et `final/IMPORT_2_nouveau_FINAL_40125.csv`.
6. Sauvegarde puis **test de restauration** : `./backup/backup.sh`, puis `./backup/restore.sh backups/db/<dump>` sur une base vide ; cron quotidien.
7. Bascule : annoncer une courte coupure → migration finale `--overwrite` → `VITE_API_URL=https://$API_DOMAIN npm run deploy:hosting` (depuis la racine) → vérification complète.
8. Retour arrière : `git checkout avant-migration-vps && npm run deploy:hosting`.
9. Après deux semaines stables et **avec l'accord du propriétaire** seulement : proposer de fermer les collections OMPANGANO dans les règles Firebase (attention au site `enenga`).


## Alertes par e-mail
`backup/alertes.py` (Python 3, aucune dépendance) prévient par e-mail, avec la config SMTP de `mail-backup.py` (`/opt/ompangano/secrets/smtp.env`) : panne ou rétablissement de l'API, conteneurs arrêtés, erreurs du serveur et des navigateurs (table `app_errors`, regroupées), disque > 85 %, sauvegarde de plus de 36 h. Au plus 6 e-mails par heure.
Installation : `chmod +x backup/alertes.py`, puis dans `/etc/cron.d/ompangano` : `*/5 * * * * root /opt/ompangano/server/backup/alertes.py >> /var/log/ompangano-alertes.log 2>&1`.
Essais : `backup/alertes.py --test` (envoie un e-mail d'essai), `backup/alertes.py --dry-run` (affiche sans envoyer).

## Courriels aux utilisateurs (noreply@)
`backup/courriels.py` envoie le courriel de **bienvenue** (objectifs du projet + guide pratique) et le **rappel de filiation** (3 au plus, espacés de 7 jours). Il utilise `/opt/ompangano/secrets/noreply.env` (chmod 600) : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM="Nkala <noreply@essaka.engineering>"`. Le compte SMTP doit avoir le droit d'écrire depuis noreply@ (le compte de sauvegarde ne l'a pas : « Sender address rejected: not owned by user »). Sans ce fichier, rien n'est envoyé.
Cron : `*/10 * * * * root /opt/ompangano/server/backup/courriels.py >> /var/log/ompangano-courriels.log 2>&1`. Essais : `--apercu bienvenue|filiation`, `--dry-run`, `--test adresse`.
