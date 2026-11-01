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
| `POST /items/import` | admin (`{items:[…]}`, option `dryRun`) |
| `PUT /:collection/:id`, `POST /:collection/batch`, `DELETE /:collection/:id` | admin (clans et villages : création par tout connecté) |
| `POST /media/upload-url`, `GET /media/url?path=` | connecté (images : admin) |
| `GET /events` | connecté — flux SSE `change`; à lire avec `fetch` (l'en-tête Authorization est requis) |

Écarts assumés par rapport à la fiche : SQL écrit à la main (pas de Kysely/Drizzle) avec migrations `.sql` versionnées dans `migrations/` ; l'import CSV reçoit des objets JSON (le CSV est lu par le navigateur) ; l'URL audio n'est plus stockée, elle est délivrée à la demande par `/media/url` (le bucket est privé).

## Sauvegardes (chiffrées)

- `backup/backup.sh` : `pg_dump` + copie du bucket, chiffrés en AES-256 avec `/opt/ompangano/secrets/backup.key` ; rotation 14 jours dans `/opt/ompangano/backups/`. Cron quotidien à 03:15 (`/etc/cron.d/ompangano`, journal `/var/log/ompangano-backup.log`).
- **La clé `backup.key` doit aussi être gardée hors du VPS** (gestionnaire de mots de passe) : sans elle, les sauvegardes sont illisibles.
- `backup/restore.sh <dump.enc> [<media.tar.gz.enc>]` restaure dans une base `ompangano_restore` (testé le 1er novembre 2026 : comptes identiques). Mise en service à la main.
- Copie vers Firebase Storage : `backup/upload-firebase.ts` (dossier `backups-ompangano/`, fichiers chiffrés). Demande un compte de service limité à la création d'objets Storage, distinct de la clé d'administration.

## Déploiement et bascule (phase 4 — après réception des paramètres ci-dessus)

1. DNS : enregistrements A de `API_DOMAIN` et `MEDIA_DOMAIN` vers le VPS.
2. Sur le VPS (Docker requis) : copier `server/` et `shared/` et `src/types/`, créer `.env`, puis
   `docker compose --profile prod up -d --build postgres garage` → `./scripts/init-garage.sh` (noter la clé dans `.env`) →
   `docker compose --profile prod up -d --build` → `npx tsx scripts/set-bucket-cors.ts`.
3. Contrôle : `curl https://$API_DOMAIN/health`.
4. Migration à blanc (compte de service fourni par le propriétaire, hors git) :
   `npx tsx scripts/migrate-from-firebase.ts --service-account=/chemin/cle.json --dry-run`
5. Corpus (à blanc, puis réel) : `--corpus=../data/corpus_myene/corpus_myene_ANCIEN_mis_a_jour.csv,../data/corpus_myene/corpus_myene_NOUVEAU_35000.csv [--statuts=attestee]`.
6. Sauvegarde puis **test de restauration** : `./backup/backup.sh`, puis `./backup/restore.sh backups/db/<dump>` sur une base vide ; cron quotidien.
7. Bascule : annoncer une courte coupure → migration finale `--overwrite` → `VITE_API_URL=https://$API_DOMAIN npm run deploy:hosting` (depuis la racine) → vérification complète.
8. Retour arrière : `git checkout avant-migration-vps && npm run deploy:hosting`.
9. Après deux semaines stables et **avec l'accord du propriétaire** seulement : proposer de fermer les collections OMPANGANO dans les règles Firebase (attention au site `enenga`).
