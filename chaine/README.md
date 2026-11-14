# Chaîne Nkorouna — réseau pilote (phase 1)

Blockchain indépendante pour certifier des documents et ancrer des registres (Nkala d'abord). Vision et ordre de construction : [`../NKOROUNA_BLOCKCHAIN.md`](../NKOROUNA_BLOCKCHAIN.md).

État au 14 nov. 2026 : **réseau pilote en marche sur le VPS `essaka-llm`** (4 validateurs Besu QBFT dans `/opt/nkorouna-chaine`), contrat déployé, relais en service ; Nkala y scelle son registre Nkorouna chaque jour.

## Pilote sur le VPS

- Dossier : `/opt/nkorouna-chaine` (clés générées sur le serveur, dans `reseau/`, jamais copiées ailleurs). Pile Docker `nkorouna-chaine`, 4 conteneurs `nkorouna-chaine-validateurN-1`.
- chainId 241001 ; contrat `Registre` à `0x8242b6F6040B8e747f165B747C4240F720921F4e` (bloc 16) ; administrateur et relais : adresses dans `reseau/deploiement.json` sur le serveur.
- RPC du validateur 1 sur `127.0.0.1:8545` seulement (rien d'ouvert dans le pare-feu ; accès depuis le Mac : `ssh -N -L 18545:127.0.0.1:8545 essaka-llm`).
- Ressources : environ 360 Mo par nœud (plafond 768 Mo, tas Java 384 Mo) ; Watchtower ne touche pas ces conteneurs.
- Vérifié le 14/11 : 4 validateurs, 3 pairs chacun, un bloc toutes les 2 s ; validateur 4 arrêté → la chaîne continue, relancé → il rattrape ; essai de bout en bout réussi à travers le tunnel (il a déployé un contrat jetable `0x1E52f37eCb5BE88A9569cf84Bc55CF367aCaB1EA`, sans lien avec le vrai registre).
- Limite : les 4 validateurs sont sur la même machine. C'est un pilote, pas encore une chaîne indépendante : la tolérance aux pannes ne vaut que lorsque les validateurs sont chez des hébergeurs et partenaires distincts.
- Sauvegarde : chaque nuit par `server/backup/backup.sh` (`/opt/ompangano/backups/chaine/chaine-*.tar.gz.enc`, chiffrée et scellée, copiée hors du VPS). Restauration : déchiffrer comme dans `server/backup/restore.sh` (`openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:/opt/ompangano/secrets/backup.key`), détarer dans `/opt/nkorouna-chaine` (`reseau/`, `relais.env`) et recopier `_data` dans les 4 volumes `nkorouna-chaine_donneesN`, puis `docker compose up -d`.
- Surveillance : `server/backup/alertes.py` prévient par e-mail si un conteneur de la chaîne s'arrête ou si aucun bloc n'est produit pendant 10 minutes.
- Commandes : `cd /opt/nkorouna-chaine && docker compose ps` / `docker compose logs -f validateur1` / `docker compose stop` (les données restent dans les volumes).

## Contenu

| Fichier | Rôle |
|---|---|
| `contracts/Registre.sol` | Contrat : émetteurs agréés, certification / vérification / révocation d'empreintes SHA-256, ancrage de racines de Merkle |
| `test/registre.test.cjs` | 6 tests du contrat |
| `scripts/generer-reseau.mjs` | Génère `reseau/` : 4 clés de validateurs, comptes administrateur et relais, secret du relais, genèse QBFT, liste blanche des nœuds |
| `docker-compose.yml` | 4 validateurs Besu 26.10.2 (image épinglée) sur un réseau Docker privé |
| `scripts/lancer-local.sh` | Les mêmes 4 validateurs sans Docker (Besu installé sur la machine) |
| `scripts/deployer.mjs` | Déploie `Registre` et agrée le relais comme émetteur ; écrit `reseau/deploiement.json` |
| `scripts/certifier.mjs` | Certifie (ou révoque) un fichier au nom d'un émetteur |
| `relais/relais.mjs` | Relais d'ancrage pour Nkala + lecture publique + page de vérification |
| `relais/public/index.html` | Page « Vérifier un document » (l'empreinte est calculée dans le navigateur, le fichier ne part pas) |
| `scripts/essai-bout-en-bout.mjs` | Essai complet automatique sur un nœud local |

`reseau/` contient des **clés privées** : il est ignoré par git et ne doit jamais être copié dans le dépôt ni partagé (règle S1 de `SECURITE_ISO27001.md`).

## Essayer en local (sans Besu)

```bash
npm install
npx hardhat test                      # 6 tests du contrat
node scripts/essai-bout-en-bout.mjs   # déploiement, certification, ancrage signé, refus, idempotence, page
```

## Lancer le vrai réseau Besu QBFT

```bash
node scripts/generer-reseau.mjs                 # une seule fois (--forcer pour tout régénérer : clés et chaîne perdues)
BOOTNODE=$(cat reseau/bootnodes-docker.txt) docker compose up -d      # avec Docker
# ou, sans Docker, avec Besu installé (Java 21 ou plus) :
scripts/lancer-local.sh                          # scripts/lancer-local.sh stop pour arrêter
npx hardhat compile && node scripts/deployer.mjs # RPC_URL=http://127.0.0.1:8545 par défaut
```

Contrôle : `curl -s -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"qbft_getValidatorsByBlockNumber","params":["latest"]}' http://127.0.0.1:8545` doit lister les 4 validateurs, et `eth_blockNumber` avancer toutes les 2 secondes.

Réglages du réseau : chainId 241001, un bloc toutes les 2 s, finalité immédiate, **aucun frais** (`zeroBaseFee`, `--min-gas-price=0`), seuls nos 4 nœuds peuvent se connecter (liste blanche). Le contrat est compilé en « london », comme la genèse.

## Brancher Nkala

1. Lancer le relais (clé lue dans `reseau/comptes.json` en local ; en production, variables d'environnement du serveur) :
   ```bash
   RELAIS_CLE_PRIVEE=… RELAIS_SECRET=$(cat reseau/secret-relais) CONTRAT_ADRESSE=… RPC_URL=http://127.0.0.1:8545 node relais/relais.mjs
   ```
2. Côté API de Nkala : `NKOROUNA_ANCRAGE_URL=http://127.0.0.1:8600/ancrer` et `NKOROUNA_ANCRAGE_SECRET=<le même secret>`.
3. Console > Nkorouna > « Sceller les nouveaux mouvements » (ou `POST /v1/admin/nkorouna/ancrer`, à mettre en cron quotidien). Les sceaux qui n'ont pas pu partir (relais coupé) sont republiés au passage suivant.

En développement, les configurations `nkorouna-relais` et `nkorouna-api` de `.claude/launch.json` font tout cela (le secret est lu dans `reseau/`, jamais écrit ailleurs).

## Sécurité

- Le relais est le seul à détenir la clé du compte qui écrit les ancrages ; l'API de Nkala ne la voit jamais.
- Demandes d'ancrage signées HMAC-SHA256 (comparaison à temps constant), corps limité à 4 Ko, 30 demandes par minute et par adresse IP, une transaction à la fois.
- Erreurs : `Erreur interne.` au client, aucun secret ni corps de requête dans les journaux.
- Rien de personnel sur la chaîne : uniquement des empreintes et des racines.
- En production : relais et RPC derrière un proxy HTTPS (règle C1), RPC des validateurs jamais exposé publiquement, validateurs chez des hébergeurs et partenaires distincts.
- Rotation : clé du relais → générer un compte, l'agréer (`agreerEmetteur`), retirer l'ancien (`retirerEmetteur`), changer la variable ; secret du relais → nouveau `openssl rand -hex 32` des deux côtés en même temps ; administrateur → `changerAdministrateur`.

## Reste à faire

- Relais sur le VPS derrière HTTPS, puis brancher l'API de Nkala en production (après déploiement de la migration 013 et du code Nkorouna, avec l'accord de Capp).
- Déplacer des validateurs chez des partenaires distincts.
- Cron quotidien de l'ancrage ; hébergement du relais derrière HTTPS.
- Phase 2 : certificats d'Onenji certifiés à leur création, puis un premier partenaire institutionnel.
