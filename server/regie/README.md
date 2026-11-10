# Régie Revive : installation sur le VPS

1. DNS : enregistrement A `pub.essaka.engineering` → VPS. Ajouter `Caddyfile.snippet` au Caddyfile, puis recharger Caddy.
2. `cp .env.example .env`, renseigner `REVIVE_DB_PASSWORD` (`openssl rand -hex 24`), puis `docker compose up -d --build`.
3. Ouvrir `https://pub.essaka.engineering/` : assistant d'installation (base **PostgreSQL**, hôte `revive-db`, base et utilisateur `revive`, mot de passe du `.env`). Créer le compte administrateur.
4. Dans Revive : créer un site (« Nkala »), puis les zones de `REVIVE_ADSERVER.md` §3 et §9 (mêmes noms que les zones de l'application).
5. Brancher l'API de Nkala : dans `server/.env`, `REVIVE_URL=https://pub.essaka.engineering`, `REVIVE_USER`, `REVIVE_PASSWORD` (compte administrateur de Revive ; activer l'API XML-RPC dans les réglages). Console Nkala > Régie > Synchroniser.
6. Sauvegarde : ajouter la base `revive` et le volume `revive_images` à `server/backup/`.

Sans ces étapes, la régie **interne** de l'API fonctionne déjà (annonceurs, campagnes, créations, statistiques dans la console) ; Revive est un complément.
