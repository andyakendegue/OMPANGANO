# Nkala : services en ligne à connecter à la fin

Tout le code de l'application et de l'administration est écrit et testé **sans** ces services : chacun a un mode de repli (simulation, vide ou « à connecter »). La console d'administration (Supervision > Branchements) indique en vert ce qui est branché. Mettre à jour : ajouter, ne rien supprimer.

## 1. Connexion par SMS : Twilio (remplace Firebase pour le téléphone)
- Créer un compte Twilio, puis un **service Verify** (langue française, canal SMS). Noter : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID`.
- Les mettre dans `server/.env`, puis `docker compose up -d --build api`.
- Vérifier que Twilio livre les SMS vers le Gabon (indicatif +241, opérateurs Airtel et Moov) ; prévoir un identifiant d'expéditeur si l'opérateur l'exige.
- Code : `server/api/src/sms.ts` (Twilio Verify par `fetch`, sans bibliothèque), routes `POST /auth/sms/envoyer` et `/auth/sms/verifier` (`supervision.ts`). Limites : 5 envois par heure et par numéro, 20 par adresse IP, 8 essais par quart d'heure.
- Pour essayer **avant** Twilio : `SMS_FOURNISSEUR=simulation` (jamais en production) accepte le code `000000`.
- Le numéro gabonais est stocké au format `+241 0X XX XX XX` (8 chiffres, 0 initial gardé). **À vérifier avec un vrai numéro** au premier essai Twilio.
- Google et e-mail/mot de passe restent sur Firebase Auth.

## 2. Assistant Ozangué : modèle de langage
- Clé d'API dans `ANTHROPIC_API_KEY`, modèle dans `IA_MODELE` (par défaut `claude-haiku-5-5`). Sans clé : réponse simulée, le comptage des jetons et les quotas fonctionnent quand même.
- Ouvrir la fonction « Assistant Ozangué » dans la console (Interrupteurs). Régler les quotas (jour, mois, conversation ; enfants ¼, abonnés ×4).
- Règle du prompt : n'écrire en myènè que les mots de `lexique.ts` (source vérifiable). À enrichir avec les mots validés.

## 3. Régie publicitaire : Revive Adserver
- Installation : `REVIVE_ADSERVER.md` §4. En attendant, la passerelle sert les **créations maison** de la collection `pub_creations` (import CSV). `REVIVE_URL` renseigné = indicateur « branché » ; l'appel à Revive reste à écrire dans `server/api/src/services.ts` (`GET /v1/pub`).
- Ouvrir la fonction « Publicité ». Règles déjà appliquées côté serveur : jamais pour un enfant, un abonné, une activité en cours ; annonce récompensée 3 par jour.

## 4. Cours à distance : relais d'appels
- STUN public par défaut. Pour les réseaux mobiles fermés : installer **coturn** sur le VPS, puis `TURN_URLS` et `TURN_SECRET` (identifiants temporaires calculés par l'API).
- Côté application : la **caméra et le micro** demandent `react-native-webrtc` (version de développement native, pas Expo Go). Le code de salle, les groupes de 4 au plus et la signalisation sont faits ; le pont WebRTC se branche dans `Onenji.tsx` (`ClasseDistance`, repère « r.signaux »).

## 5. Achats et abonnements
- Tables, droits et vérification d'accès faits (`droits`, `/v1/acces/verifier`). Reste : reçus Apple et Google (`POST /v1/achats/recu`, étape E2), Mobile Money (E3, avec webhook signé), prix dans la collection `produits`. Comptes développeur Apple et Google nécessaires.
- En attendant : accorder un abonnement à la main (console > Abonnements).

## 6. Protection des contenus (audio et vidéo)
- Niveau 1 prêt : licence courte et filigrane (`POST /v1/lecture/licence`), enregistrement d'écran interdit pendant la lecture d'un contenu protégé (`expo-screen-capture`). À brancher : **segments HLS chiffrés** et clés par utilisateur sur le serveur de médias, détection d'enregistrement du micro (Android).
- Niveau 2 (DRM Nkala) : étape T10, à concevoir avec le serveur de médias.

## 7. Carte et itinéraires
- La carte actuelle est schématique (épingles placées par latitude et longitude). Brancher une carte routière (OpenStreetMap avec MapLibre ou `react-native-maps`) demande une version de développement ; l'itinéraire ouvre déjà Plans ou Google Maps.

## 8. Médias (images, audio, vidéo)
- Le stockage Garage/S3 existe. Les colonnes `image`, `audio`, `video_url`, `audio_url`, `pochette` des fichiers CSV acceptent une adresse https ou un chemin du stockage.

## 9. Notifications
- Rappels doux et alertes (pharmacie de garde) : planification locale (`expo-notifications`) à brancher sur l'heure choisie ; notifications poussées : projet Firebase Cloud Messaging et identifiants APNs.

## 10. Production
- `SESSION_SECRET` obligatoire. Build iOS et Android (`eas build`), fiches des magasins, politique de confidentialité (mentionner Twilio, le modèle de langage, la régie), déclaration APDPVP.
- **Salle des paris** : fermée, aucun code d'ouverture. Dossier de cinq pièces d'abord (`NKALA_AUDIT_COMPLET.md` §4.6).


## Mise à jour du 10 nov. 2026 (soir) : tout est piloté par le fichier `server/.env`
Chaque branchement a une variable ; vide = simulation (rien ne casse). Liste complète et commentée : `server/.env.example`. L'état de chaque branchement est lisible dans la console (Supervision > Branchements, Assistant IA, Régie pub, Notifications).

| Service | Variables | Simulation quand vide | Reste à faire |
|---|---|---|---|
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID` ; `SMS_FOURNISSEUR=simulation` (code 000000, hors production) | oui | Créer le service Verify ; tester un numéro gabonais |
| Administrateurs | `ADMIN_TELEPHONES=+241…` (numéros séparés par des virgules) | — | Mettre votre numéro |
| Assistant | `IA_FOURNISSEUR` (anthropic, runpod, openai), `ANTHROPIC_API_KEY`, `RUNPOD_API_KEY` + `RUNPOD_LLM_ENDPOINT` (serverless vLLM) ou `RUNPOD_LLM_URL` (pod), `IA_MODELE`, `IA_BASE_URL`, `IA_API_KEY` | oui | Créer l'endpoint RunPod ; choisir le modèle |
| Embeddings (RAG) | `EMBEDDING_FOURNISSEUR`, `RUNPOD_EMBED_ENDPOINT` ou `RUNPOD_EMBED_URL`, `EMBEDDING_MODELE`, `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY` | oui (vecteurs de 128 dimensions simulés) | Déployer un modèle d'embeddings (par ex. BGE-M3) sur RunPod, puis **réindexer** les documents |
| Gestion RunPod | `RUNPOD_API_KEY`, `RUNPOD_REST_URL` | oui (pods fictifs) | Vérifier les routes REST avec votre compte (`server/api/src/runpod.ts`, une seule fonction `appel`) |
| Régie | `REVIVE_URL`, `REVIVE_USER`, `REVIVE_PASSWORD` | oui (régie interne seule) | Installer Revive : `server/regie/README.md` (Docker absent du Mac : à faire sur le VPS) |
| Notifications | `PUSH_FOURNISSEUR`, `EXPO_ACCESS_TOKEN` | `simulation` | Projet EAS (`eas init`) pour obtenir des jetons ; APNs pour iOS |
| Achats | `ACHATS_FOURNISSEUR=simulation` ; `APPLE_*`, `GOOGLE_*` | oui | Écrire la vérification des reçus (`server/api/src/achats.ts`, `verifierRecu`) ; module d'achats natif (`react-native-iap` ou RevenueCat) dans une version de développement |
| Médias chiffrés | `SESSION_SECRET` (clé dérivée), `PUBLIC_API_URL` | — | Conditionner chaque média : `scripts/chiffrer_media.ts` ; colonne `protege = oui` |
| Relais d'appels | `TURN_URLS`, `TURN_SECRET`, `STUN_URLS` | STUN public | coturn sur le VPS ; `react-native-webrtc` |

**Déployé le 10 nov. 2026** sur `essaka-llm` (migrations 006 et 007 appliquées, sauvegarde `backups/db-avant-nkala-20261110-063950.sql.gz` et `backups/server-avant-nkala-20261110-063950`). `SESSION_SECRET` et `MODULES_ACTIFS` ajoutés au `.env` du VPS. Retour arrière : restaurer `backups/server-avant-nkala-…` et relancer `docker compose up -d --build --no-deps api` (les nouvelles tables restent, sans effet).

**Lancer en démonstration** : `./lancer.sh` (API locale + application web) ou `./lancer.sh ios`. Connexion : numéro libre et code `000000` ; administrateur : `+24100000001`.
