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
curl http://localhost:3000/health
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

## Sauvegardes

`backup/backup.sh` (cron quotidien) : `pg_dump` + copie du bucket, rotation 14 jours, copie hors VPS si `BACKUP_REMOTE` est défini.
`backup/restore.sh <dump> [<media.tar.gz>]` restaure dans une base `ompangano_restore` (le basculement reste manuel).
