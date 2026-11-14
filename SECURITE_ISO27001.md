# Sécurité de l'information : ISO/IEC 27001:2022

*Audit du 14 novembre 2026, et règles obligatoires pour tout développement futur : API, app Nkala, site OMPANGANO, serveur.*

---

## 0. Ce qui peut être certifié

ISO 27001 ne certifie pas un logiciel. Elle certifie le **système de management de la sécurité de l'information (SMSI)** d'un organisme, ici Essaka Engineering, sur un périmètre donné. Le code peut être exemplaire et l'audit échouer si l'organisation ne suit pas les clauses 4 à 10 de la norme : analyse des risques, politique, revue de direction, audit interne, etc.

Ce document couvre deux choses :
- la **partie technique** : les mesures de l'annexe A qui touchent le développement et l'exploitation (A.5.15 à A.5.18, A.5.23, A.5.34, A.8.2 à A.8.34) ;
- la liste des **documents d'organisation** à produire (§ 5). Personne ne peut les rédiger à la place de l'organisme.

**Périmètre proposé** : « Conception, développement et exploitation de la plateforme Nkala / OMPANGANO (application mobile, site, API, stockage des médias, console d'administration) par Essaka Engineering ».

### Actifs du périmètre

| Actif | Où | Données |
|---|---|---|
| API Fastify (`server/api`) | VPS, conteneur `api`, 172.17.0.1:3001 derrière Caddy | comptes, contributions, paiements, journaux |
| PostgreSQL 16 | VPS, réseau Docker interne | toutes les données personnelles |
| Garage (S3) | VPS, 3900 derrière Caddy | voix, médias, médias chiffrés HLS |
| App Nkala (Expo) | Play Store, App Store (à venir), web | jeton de session, profil en cache, file hors ligne |
| Site OMPANGANO (Vite) | Firebase Hosting `ompangano.web.app` | — |
| Sauvegardes | `/opt/ompangano/backups` (chiffrées) | copie complète de la base et des médias |
| Fournisseurs | Google (Firebase Auth, Play), Apple, Twilio Verify, Anthropic, RunPod, Expo/EAS, GitHub, hébergeur du VPS, Revive (régie), opérateurs Mobile Money | voir A.5.19 à A.5.23 |

---

## 1. Ce qui est déjà conforme (constaté le 14/11/2026)

- **Contrôle d'accès décidé par le serveur** (A.8.3) : rôle, statut, XP et badges ne sont jamais acceptés du client (`shared/userSecurity.ts`, `PROTECTED_USER_FIELDS`). Le super-administrateur exige une adresse vérifiée.
- **Authentification** (A.8.5) : jetons Firebase vérifiés par signature JWKS RS256, avec contrôle de l'émetteur, du public visé et de l'expiration (`auth.ts`). Les sessions anonymes sont refusées. Connexion par SMS via Twilio Verify, limitée à 5 envois par heure et par numéro, 20 par IP, et 8 essais en 15 min. Le code examinateur est comparé à temps constant.
- **SQL** (A.8.28) : toutes les valeurs passent en paramètres (`$1`). Les noms de tables injectés passent par des listes blanches (`isGenericTable`, `schemaDe`).
- **Chiffrement en transit** (A.8.24) : HTTPS seulement, TLS 1.3, HTTP redirigé en 308. Postgres et Garage ne sont pas exposés. Les médias protégés sont en HLS AES-128, la clé n'est livrée que contre une licence courte, et les URL S3 présignées durent 10 min (envoi) ou 2 h (lecture).
- **Webhook Mobile Money** : signature HMAC-SHA256 vérifiée à temps constant.
- **Intégrité du corpus** : les écritures périmées sont refusées et chaque modification de fiche est tracée (`item_audit`).
- **Sauvegardes** (A.8.13) : quotidiennes, chiffrées (AES-256, PBKDF2 200 000 itérations), rotation sur 14 jours (`server/backup/backup.sh`).
- **Pare-feu** (A.8.20) : ufw limité à 22, 80, 443, TURN et la plage UDP. Ollama retiré le 13/11.
- **Clés publiées** : les 4 clés Firebase présentes dans l'historique git ont été supprimées chez Google le 13/11. Les nouvelles clés sont limitées par API et par référent.

## 2. Corrections faites le 14/11/2026 (commitées et mises en ligne le 14/11)

| # | Mesure | Défaut | Correction | Fichier |
|---|---|---|---|---|
| 1 | A.8.15 | Les journaux Fastify enregistraient l'adresse complète, donc les **licences de lecture `?t=…`** et les recherches. | Les journaux ne gardent que la méthode, le chemin sans paramètres et l'IP. | `server/api/src/app.ts` (logger) |
| 2 | A.8.26 | Aucun en-tête de sécurité sur l'API. | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS 1 an. `Cache-Control: no-store` sur `/v1` et `/auth`. | `app.ts` (onSend) |
| 3 | A.8.6, A.8.20 | La limite de débit ne couvrait que `/v1`. `/pub/*` (manches de jeu, contenus), `/auth/*` et `/media/*` n'avaient aucune limite. | Toutes les routes sont limitées, sauf `/health`. | `app.ts` (rate-limit) |
| 4 | A.8.5, A.5.18 | Les sessions SMS (30 jours) **ne pouvaient pas être révoquées**, même après suppression du compte ou vol du téléphone. | Session refusée si le compte est supprimé ou si `sessionsRevoqueesAvant` est postérieure à son émission. Nouvelles routes `POST /v1/me/sessions/revoquer` et `POST /v1/admin/users/:id/sessions/revoquer`. Le client ne peut ni poser ni effacer cette date. | `app.ts`, `auth.ts`, `sms.ts` |
| 5 | A.8.15 | Les changements de rôle ou de statut (`PATCH /v1/users/:id`) et les suppressions (`DELETE /v1/:collection/:id`) **n'étaient pas journalisés**. | Inscription dans `journal_admin` : auteur, cible, champs modifiés, rôle et statut avant/après. | `app.ts` |
| 6 | A.8.24, A.8.12 | Le jeton de session SMS était **en clair dans AsyncStorage**, et `allowBackup` était actif par défaut : il partait dans les sauvegardes Google et adb. | Jeton rangé dans le trousseau iOS / Keystore Android (`expo-secure-store`, sans copie iCloud), avec migration à la première lecture. Les anciennes versions de l'app retombent proprement sur AsyncStorage. `android.allowBackup: false`. | `apps/nkala/src/coffre.ts`, `AuthProvider.tsx`, `app.json`, `package.json` |
| 7 | A.8.8 | Dépendances du serveur. | `npm audit fix` sans changement majeur. Il reste 6 failles modérées, dans des dépendances de `firebase-admin`. | `server/package-lock.json` |
| 8 | A.8.4, A.8.25 | Rien n'empêchait de commiter un secret. | `scripts/secrets_interdits.sh` + crochet `pre-commit` (`git config core.hooksPath scripts/hooks`, installé) ; `scripts/controle_securite.sh` avant chaque déploiement. | `scripts/` |

Tests : `server/api/test/securite.test.ts` (5 tests). Serveur : 171/171 ; `tsc` propre sur le serveur et l'app.
**Effet visible pour les utilisateurs** : aucun. Les sessions en cours restent valides.
**Pour le point 6, un nouveau build natif est nécessaire** : avant ce build, le jeton reste dans AsyncStorage.

## 2 bis. Écarts traités le 14/11/2026, 2e passe (commités et mis en ligne le 14/11)

| Prio | Mesure | Ce qui est fait | Fichiers |
|---|---|---|---|
| P1 | A.5.34 | **Suppression du compte** par la personne : `DELETE /v1/me`, avec confirmation « SUPPRIMER ». Le sort de chaque donnée est écrit en tête de `donnees.ts`. Voix effacées, sauf accord pour les laisser au corpus de façon anonyme. Textes anonymisés. Paiements gardés 10 ans (OHADA). Compte Nkorouna gelé ; si le solde n'est pas nul, il faut y renoncer explicitement. Les jetons émis avant la suppression sont refusés (empreinte dans `comptes_supprimes`), et une nouvelle inscription reste possible. Le super-administrateur ne peut pas se supprimer. | `server/api/src/donnees.ts`, `migrations/017_securite_donnees.sql` |
| P1 | A.5.34 | **Export** de toutes les données du compte : `GET /v1/me/donnees`, JSON avec liens audio valables 1 h, 3 exports par heure au plus. | `donnees.ts` |
| P1 | A.5.34 | **Écran « Mes données et mon compte »** dans l'onglet Profil : télécharger mes données, déconnecter tous mes appareils, supprimer mon compte (le compte Firebase aussi). **Page web publique** pour demander la suppression sans l'app : `/suppression-compte.html`, à indiquer dans la fiche Play Store. | `apps/nkala/src/MonCompte.tsx`, `packages/noyau/src/donneesPerso.ts`, `public/suppression-compte.html` |
| P1 | A.5.33, A.8.10 | **Durées de conservation** (`DUREES` dans `donnees.ts`) et **purge** au démarrage puis toutes les 24 h, tracée dans la table `purges`. IP effacées après 30 j, visites 13 mois, erreurs 90 j, essais SMS 30 j, IA 2 ans, journaux 5 ans, paiements 10 ans. | `donnees.ts`, `main.ts` |
| P1 | A.8.8 | `npm audit fix` essayé sur l'app et le site, **puis annulé** : il ne retirait aucune faille « high » et imbriquait Expo 58 sous Expo 54. Ces failles se traitent par des montées de version majeures (voir § 3), proposées par Dependabot. | — |
| P2 | A.8.24 | **Une clé par usage** (`cles.ts`, HKDF-SHA256) : sessions, médias (`MEDIA_SECRET`), licences, manches, filigrane. Les médias déjà chiffrés restent lisibles. | `server/api/src/cles.ts`, `media.ts`, `services.ts`, `azeva.ts`, `jeux.ts`, `scripts/chiffrer_media.ts` |
| P2 | A.8.5 | **Révocation générale** : « déconnecter partout » et la suppression du compte valent aussi pour les comptes Google ou e-mail. Le contrôle porte sur `auth_time` (date de connexion), qui ne change pas quand le jeton se renouvelle. | `app.ts`, `auth.ts` |
| P2 | A.8.5 | **Numéro examinateur limité dans le temps** : `REVUE_JUSQU_AU` est obligatoire, 45 jours au plus ; sans cette date, le numéro est coupé. | `sms.ts`, `docker-compose.yml` |
| P2 | A.8.5 | **Administrateurs connectés par SMS** (un seul facteur) : leurs droits d'administration ne valent que pour une connexion de moins de 12 h. | `app.ts` |
| P2 | A.8.27 | En production, `CORS_ORIGINS` exclut toute origine locale. `trustProxy` est limité à la machine et aux réseaux Docker (`TRUST_PROXY`). | `config.ts`, `app.ts`, `docker-compose.yml` |
| P2 | A.8.13 | **Sauvegardes scellées** : un HMAC-SHA256 par fichier, vérifié par `restore.sh`, qui s'arrête si le fichier a été modifié. **Témoin de copie hors site**, et message d'avertissement si `BACKUP_REMOTE` manque. **Essai de restauration mensuel** : `backup/test_restauration.sh`. | `server/backup/` |
| P3 | A.8.16 | **Alertes de sécurité** par e-mail : promotion en administrateur, suppressions, révocations, changements de statut, rafale de SMS ou de codes faux, purge en retard, copie hors site absente. | `server/backup/alertes.py` |
| P3 | A.8.25 | **Intégration continue** GitHub : secrets dans les fichiers et dans l'historique, types, tests, `npm audit`. **Dependabot** chaque semaine. | `.github/workflows/securite.yml`, `.github/dependabot.yml` |

Tests : `server/api/test/securite.test.ts` (14 tests) et `smsRevue.test.ts`. Serveur : 180/180 ; `tsc` propre sur le serveur et l'app.

### Mise en production du 14/11/2026 (accord de Capp)
- **API** : seuls mes blocs sont appliqués sur les fichiers en ligne. Le travail des autres sessions déjà en ligne est conservé, et celui qui n'y était pas (Nkorouna, annonces logement, migrations 013/014, `achats.ts`, `contenus.ts`, etc.) n'est pas parti. Migration 017 appliquée. Vérifié : santé, en-têtes, 401 sans jeton, CORS sans localhost, vraies IP dans les journaux, purge du jour, aucune erreur. Sauvegarde : `/opt/ompangano/backups/avant-securite-iso-20261114-123209` (code, `.env`, base).
- **`.env`** : `MEDIA_SECRET` = ancienne `SESSION_SECRET`, `REVUE_JUSQU_AU=2026-12-28T23:59:59Z` (changer `REVUE_CODE` ensuite), `CORS_ORIGINS` sans localhost, `BACKUP_REMOTE=sauvegarde-hors-site:`. Copie de l'ancien fichier : `.env.avant-securite-iso-*`.
- **Copie hors site** : serveur Essaka (Contabo, États-Unis), `/root/sauvegardes-ompangano`, clé SSH dédiée `/root/.ssh/sauvegarde_hors_site` limitée par `rrsync` à ce dossier (aucun shell). Seuls des fichiers déjà chiffrés et scellés y vont. Première copie : 929 Mo.
- **Essai de restauration** : cron `/etc/cron.d/ompangano`, le 1er de chaque mois à 04:30. Premier essai le 14/11 : sceau vérifié, mêmes chiffres que la base en service (105 comptes, 50 132 fiches, 89 contributions).
- **Copies faites avant une mise à jour** : gardées 30 jours au plus (`backup.sh`).
- **Veille de déploiement automatique en pause** (`/opt/ompangano/secrets/veille_en_pause`) : `main` contient maintenant du travail validé mais pas encore mis en ligne. Le prochain envoi sur `main` le mettrait en production sans accord. Pour la relancer : `rm /opt/ompangano/secrets/veille_en_pause` (et vérifier d'abord ce qu'elle déploiera).
- **Historique git réécrit** (`git filter-repo --replace-text`) : les 4 clés révoquées sont remplacées par `***CLE_REVOQUEE***` dans toutes les branches et étiquettes de GitHub. Copie complète d'avant : `DONDO/_sauvegardes_git/OMPANGANO-avant-reecriture-20261114.bundle`. GitHub peut encore servir les anciens commits par leur empreinte (caches, éventuels forks) : demande d'effacement au support GitHub si besoin.
- **Site Essaka** : pages statiques, sans compilation. https://essaka.engineering/nkala/confidentialite/ (politique de Nkala) et https://essaka.engineering/nkala/suppression-compte/ (à indiquer dans la Play Console). La politique du site vitrine (dans `site-app.jsx`) ne couvrait pas Nkala. Elle n'a pas été modifiée, car il aurait fallu recompiler `assets/app.js` ; un lien vers la page Nkala reste à y ajouter.
- **App** : mise à jour JavaScript publiée sur le canal `production`, sans build (groupe `baca1683`). Elle porte la version d'exécution **0.2.0**, car une autre session avait monté `version` (module natif WebRTC). Elle n'atteint donc pas les versions installées (0.1.0, vc3/vc4) : elle s'appliquera au prochain build 0.2.0. Les modules natifs absents des versions installées (sélecteur et retouche d'images, tâches de fond, WebView) sont maintenant chargés au premier usage (`apps/nkala/src/natif.ts`) : sur vc3/vc4, ces fonctions affichent « mettez l'application à jour » au lieu de planter. Le trousseau et `allowBackup: false` n'agiront qu'avec le prochain build.

### Reste à faire
1. Indiquer https://essaka.engineering/nkala/suppression-compte/ et https://essaka.engineering/nkala/confidentialite/ dans la Play Console.
2. Faire valider la politique de confidentialité de Nkala, notamment l'âge de 15 ans pour l'accord parental et la liste des prestataires.
3. Nouveau build natif quand Capp le décidera.
4. Après la revue des magasins : changer `REVUE_CODE`.

## 3. Écarts restants

| Prio | Mesure | Écart | Pourquoi ce n'est pas fait |
|---|---|---|---|
| P1 | A.8.8 | Failles restantes de l'app (outils de build d'Expo) et du site (`@grpc/grpc-js` via firebase), qui ne se corrigent que par des montées de version majeures. | `npm audit fix --force` changerait Expo ou Firebase de version majeure : à faire avec un test complet avant un build. Dependabot proposera les correctifs. |
| P2 | A.8.5 | Double authentification du super-administrateur. | Se règle dans le compte Google (Sécurité > Validation en deux étapes), pas dans le code. |
| P2 | A.5.34 | Politique de confidentialité de Nkala publiée le 14/11 (essaka.engineering/nkala/confidentialite/), à faire valider. La politique du site vitrine doit y renvoyer. | Validation juridique ; lien à ajouter dans `site-app.jsx` (compilation). |
| P2 | A.5.34 | Les identifiants des comptes SMS (`tel_241…`) contiennent le numéro, et ils restent dans les paiements, le registre Nkorouna et les journaux après suppression (obligation légale, preuve). | Les remplacer casserait la chaîne de hachage du registre. À traiter par un identifiant opaque pour les nouveaux comptes (migration à décider). |
| P2 | A.8.5 | « Déconnecter partout » ne révoque pas le jeton de rafraîchissement Firebase côté Google. L'API refuse bien l'ancienne session, mais il faut se reconnecter. | Révocation chez Google : `firebase-admin` + compte de service, à décider. |

---

## 4. Règles obligatoires pour les développements futurs

Elles s'appliquent à toute personne et à tout agent (Claude ou autre) qui modifie `OMPANGANO/`. **Une règle non tenue bloque la livraison.** Toute exception est écrite dans `_contexte/JOURNAL.md` avec sa raison et son échéance.

### S. Secrets (A.5.17, A.8.4, A.8.24)
- **S1.** Aucun secret dans le dépôt : clés, mots de passe, jetons, `google-services.json`, `GoogleService-Info.plist`, `.env`, keystores. Ils vont dans les variables d'environnement du VPS, les secrets EAS ou des fichiers ignorés par git. Le crochet `pre-commit` le vérifie ; on ne le contourne jamais (`--no-verify` interdit).
- **S2.** Un secret publié, même une minute, est **révoqué puis remplacé**. Le supprimer du dépôt ne suffit pas.
- **S3.** Un secret par usage : pas de réutilisation d'un même secret pour signer des sessions et chiffrer des données. Les nouveaux secrets se génèrent avec `openssl rand -hex 32`.
- **S4.** Une clé d'API côté client (Firebase, Google) est toujours **limitée** par API et par application ou référent.
- **S5.** Aucun secret, jeton, code SMS ou numéro complet dans les journaux, les messages d'erreur, les captures ou les réponses de l'API.

### A. Authentification et droits (A.5.15, A.5.18, A.8.2, A.8.3, A.8.5)
- **A1.** Toute route `/v1/*` exige un jeton (crochet global). Une route publique va sous `/pub/` et ne renvoie **aucune donnée personnelle**.
- **A2.** Les droits sont décidés par le serveur (`acteur()` / `loadActor`). Jamais sur la foi d'un champ envoyé par le client (rôle, prix, XP, propriétaire, statut).
- **A3.** Chaque route d'administration vérifie `isAdmin` ou `isStaff` dès sa première ligne, et un test prouve le refus 403 pour un simple utilisateur.
- **A4.** Toute lecture ou écriture d'un objet appartenant à quelqu'un vérifie le propriétaire (`user_id = acteur`), sans quoi n'importe qui peut lire l'objet d'un autre en changeant son identifiant (IDOR).
- **A5.** Une session doit pouvoir être révoquée. Un nouveau type de jeton porte `iat` et passe par le contrôle de révocation.
- **A6.** Toute route qui envoie un SMS ou un e-mail, consomme de l'IA ou crée un paiement a sa propre limite (par compte et par IP), en plus de la limite globale.
- **A7.** Le principe du moindre privilège s'applique aussi aux comptes techniques : utilisateur Postgres de l'API, clés S3, jetons des fournisseurs.

### D. Données personnelles (A.5.33, A.5.34, A.8.10, A.8.11, A.8.12)
- **D1.** Une nouvelle donnée personnelle (table, colonne ou champ JSON) n'est ajoutée qu'avec sa **finalité** et sa **durée de conservation**, inscrites dans le registre (§ 5) et appliquées par la purge.
- **D2.** On collecte le minimum : pas d'IP en clair au-delà de 30 jours, pas de géolocalisation précise, pas de contacts du téléphone sans besoin écrit.
- **D3.** Toute nouvelle donnée personnelle est couverte par la suppression de compte et par l'export.
- **D4.** Mineurs : le consentement parental est vérifié côté serveur. Aucune publicité ciblée, aucune donnée transmise à un tiers.
- **D5.** Pas de données réelles dans les tests, les captures ou les exemples (`contenu/exemples/`). On utilise des données inventées et marquées comme telles.
- **D6.** Les envois de fichiers sont limités en taille et en type (`MAX_UPLOAD_BYTES`), contrôlés côté serveur, et toujours servis par des URL présignées courtes.

### J. Journalisation et surveillance (A.8.15, A.8.16, A.8.17)
- **J1.** Toute action d'administration (rôle, statut, suppression, droits, paiement manuel, publication, réglage) est inscrite dans `journal_admin` par `journaliser(q, par, action, cible, detail)`, **dans la même transaction**.
- **J2.** Les journaux ne contiennent ni jeton, ni paramètre d'adresse, ni corps de requête, ni code. Ils sont horodatés en UTC par l'horloge du serveur.
- **J3.** Les journaux ne sont pas modifiables par l'API : on n'y fait que des insertions. Leur conservation est d'au moins 1 an pour `journal_admin` et `item_audit`.
- **J4.** Une erreur 500 renvoie toujours `Erreur interne.` au client. Le détail va dans `app_errors`, jamais dans la réponse.

### C. Cryptographie (A.8.24)
- **C1.** Transport : HTTPS / TLS 1.2 minimum (1.3 de préférence) partout, y compris entre services hors du réseau Docker. Aucune adresse `http://` en production.
- **C2.** Seulement des primitives reconnues, prises dans `node:crypto` ou `jose` : AES-GCM, HMAC-SHA256, HKDF, Ed25519/RS256, `timingSafeEqual` pour comparer des secrets. Pas d'algorithme maison, pas de MD5 ni de SHA-1 pour la sécurité.
- **C3.** Sur le téléphone, tout secret (jeton, clé) passe par `src/coffre.ts` (trousseau / Keystore), jamais directement par AsyncStorage.
- **C4.** Chaque clé a une procédure de rotation écrite avant sa mise en service.

### API et code (A.8.25, A.8.26, A.8.28)
- **API1.** Toute entrée est validée côté serveur : type, longueur et liste blanche. Les identifiants sont contrôlés par expression régulière (`ID_RE`).
- **API2.** SQL : uniquement des requêtes paramétrées. Un nom de table ou de colonne dynamique passe obligatoirement par une liste blanche.
- **API3.** Pas de `eval`, de `new Function` ni de `child_process` alimentés par une entrée utilisateur. Une adresse sortante (`fetch`) construite à partir d'une entrée passe par une liste blanche de domaines, contre la falsification de requête côté serveur (SSRF).
- **API4.** Toute nouvelle route a des tests : cas nominal, refus 401 (sans jeton), refus 403 (mauvais rôle) et entrée invalide 400.
- **API5.** Les en-têtes de sécurité et la limite de débit restent globaux. Toute exception est justifiée en commentaire.

### M. Application mobile et site (A.8.26)
- **M1.** `android.allowBackup` reste `false`. Pas de `usesCleartextTraffic`, pas de `NSAllowsArbitraryLoads`.
- **M2.** Un nouveau module natif impose de **monter `version`** dans `app.json` (politique `runtimeVersion: appVersion`). Sinon, une mise à jour `eas update` atteint des binaires qui n'ont pas le module et plante. À défaut, le chargement passe par `requireOptionalNativeModule`, comme dans `coffre.ts`.
- **M3.** Aucun texte de l'app ne promet une sécurité qui n'existe pas (exemple : « chiffré de bout en bout »).
- **M4.** Les permissions (caméra, micro, position, contacts) sont demandées au moment de l'usage, avec leur raison, et retirées si elles ne servent plus.

### F. Dépendances et fournisseurs (A.5.19 à A.5.23, A.8.8)
- **F1.** `npm audit --omit=dev` : aucune faille high ou critical dans les dépendances de production du serveur. Pour l'app et le site, elles sont traitées avant chaque build publié.
- **F2.** Les lockfiles sont versionnés. Une nouvelle dépendance doit être maintenue (publication de moins d'un an), avoir une licence compatible et répondre à un besoin réel. Les images Docker sont épinglées sur une version.
- **F3.** Un nouveau fournisseur qui reçoit des données personnelles (IA, SMS, paiement, analytique) est ajouté au registre des fournisseurs (§ 5) avec les données envoyées, le pays et le contrat ou les conditions. Un texte de corpus ou une donnée d'utilisateur n'est jamais envoyé à une IA tierce sans que ce soit prévu dans la politique de confidentialité.

### P. Mise en production (A.8.9, A.8.31, A.8.32, A.8.33)
- **P1.** Avant **chaque** déploiement (serveur, site, `eas update`, build) : `scripts/controle_securite.sh` réussi (s'il échoue, on ne déploie pas), comparaison de la production avec le commit juste avant de copier (s'arrêter au moindre écart), sauvegarde datée dans `/opt/ompangano/backups/avant-…`, **accord explicite de Capp**.
- **P2.** Développement, démonstration (`npm run demo`, PGlite) et production restent séparés. Pas de données de production en local. `SMS_FOURNISSEUR=simulation` est impossible en production (déjà codé).
- **P3.** Les migrations SQL sont numérotées, ne s'appliquent que vers l'avant, sont testées sur PGlite et ont une sauvegarde juste avant.
- **P4.** Chaque déploiement est noté dans `_contexte/JOURNAL.md` : ce qui a changé, la sauvegarde, ce qui a été vérifié et ce qui ne l'a pas été.

### I. Incidents (A.5.24 à A.5.28)
- **I1.** Un incident soupçonné (secret publié, accès anormal, fuite, compte compromis) se signale immédiatement à Capp, puis se traite dans cet ordre : contenir (révoquer clés et sessions), conserver les preuves (journaux, copies), corriger, informer les personnes touchées si leurs données sont en cause, écrire un compte rendu dans le journal.
- **I2.** Une revue du code touchant à la sécurité (authentification, droits, paiements, cryptographie, données personnelles) est faite avant la fusion (`/code-review` ou relecture humaine), et son résultat est noté.

---

## 5. Documents d'organisation à produire pour la certification

À rédiger et tenir à jour par Essaka Engineering. Les modèles peuvent être préparés sur demande.

1. **Périmètre du SMSI** (clause 4.3) et contexte : parties intéressées, obligations légales (loi gabonaise n° 001/2011, règles des magasins, cadre CEMAC pour les paiements et le Nkorouna).
2. **Politique de sécurité de l'information** (5.2), signée par la direction.
3. **Méthode d'analyse des risques** (6.1.2), **registre des risques** et **plan de traitement** (6.1.3, 8.2, 8.3).
4. **Déclaration d'applicabilité (SoA)** : les 93 mesures de l'annexe A, appliquées ou exclues avec justification. Les § 1 à 4 de ce document en fournissent la partie technique.
5. **Objectifs de sécurité** mesurables (6.2), par exemple : zéro secret publié, correctif d'une faille critique sous 7 jours, essai de restauration mensuel.
6. **Inventaire des actifs** (A.5.9) et **registre des traitements de données personnelles** (A.5.34).
7. **Registre des fournisseurs** et de leurs engagements (A.5.19 à A.5.22) : Google, Apple, Twilio, Anthropic, RunPod, Expo, GitHub, hébergeur, opérateurs Mobile Money.
8. **Procédures** : gestion des accès (arrivée, départ, revue trimestrielle des administrateurs), gestion des incidents, sauvegarde et restauration, continuité d'activité (A.5.29, A.5.30), gestion des changements.
9. **Preuves de compétence et de sensibilisation** (7.2, 7.3) pour chaque personne ayant accès à la production.
10. **Programme et rapports d'audit interne** (9.2), **revue de direction** (9.3), **registre des non-conformités et actions correctives** (10.2).

Parcours habituel : SMSI en fonctionnement pendant au moins 3 mois avec ses preuves, puis audit interne, revue de direction, audit de certification en 2 étapes par un organisme accrédité, et enfin audits de surveillance annuels.

---

## 6. Commandes

```bash
# Avant chaque commit (automatique, crochet installé) : secrets dans les fichiers indexés
scripts/secrets_interdits.sh
# Tout le dépôt
scripts/secrets_interdits.sh --tout
# Avant chaque déploiement : secrets, types, tests, dépendances
scripts/controle_securite.sh
# Réinstaller le crochet sur un nouveau poste
git config core.hooksPath scripts/hooks
```
