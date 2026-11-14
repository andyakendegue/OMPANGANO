# Nkala : publier sur Google Play avec EAS

13 novembre 2026. Commandes à lancer depuis `apps/nkala/`.

## Une seule fois

1. **Se connecter à Expo** : `npx eas-cli login` (compte propriétaire du projet `62614108-…`).
2. **Variables d'environnement EAS** (les fichiers Firebase et `.env.local` ne sont pas dans git, le serveur de build ne les voit pas) :
   ```
   npx eas-cli env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_FIREBASE_API_KEY --value "<clé de .env.local>" --visibility sensitive
   ```
   Refaire pour `preview` si on veut des APK de test.
3. **Premier build** : `npx eas-cli build -p android --profile production`. À la question sur la clé de signature, répondre oui : EAS crée et garde la clé d'envoi (upload key). Le versionCode est géré par EAS (`appVersionSource: remote`) et augmente à chaque build.
4. **Connexion Google après signature** : la connexion Google vérifie l'empreinte SHA-1 de l'app. Ajouter dans Firebase (Paramètres du projet > app Android) et dans le client OAuth Android :
   - le SHA-1 de la clé EAS (`npx eas-cli credentials -p android`) ;
   - le SHA-1 de la clé de signature Google Play (Play Console > Test et publication > Intégrité de l'application), après le premier envoi.
   Sans cela, la connexion Google échoue dans l'app installée depuis le Play Store.
5. **Play Console** : créer l'application (`nkala.essaka.engineering`), remplir la fiche (`fiche_play_store.md`), puis **envoyer le premier .aab à la main** dans Test > Test fermé (Google refuse un premier envoi par API).
6. **Compte de service pour l'envoi automatique** :
   - Google Cloud Console > IAM > Comptes de service > créer, puis Clés > ajouter une clé JSON ;
   - Play Console > Utilisateurs et autorisations > inviter l'adresse du compte de service, avec les droits de publication pour Nkala ;
   - `npx eas-cli credentials -p android` > production > Google Service Account > déposer le JSON (il reste chez EAS, pas dans git).

## Testeurs

- `bash ../../server/scripts/exporter_testeurs.sh 100` (depuis `apps/nkala/`) crée `livrables/play-store/testeurs_play.csv`.
- Play Console > Test fermé > Testeurs > Créer une liste d'adresses e-mail > Importer le CSV. Seuls les comptes Google peuvent tester : les inscrits par SMS seul n'y figurent pas.
- Envoyer aux testeurs le lien d'inscription affiché sous la liste.
- Compte développeur personnel créé après novembre 2023 : Google exige **12 testeurs inscrits pendant 14 jours d'affilée** en test fermé avant de pouvoir demander l'accès à la production.

## Ensuite, à chaque version

| Besoin | Commande |
|---|---|
| Build + envoi en test fermé | `npx eas-cli build -p android --profile production --auto-submit` |
| Même chose par le workflow EAS | `npx eas-cli workflow:run .eas/workflows/publier-android.yml` |
| Envoyer un build déjà fait | `npx eas-cli submit -p android --latest` |
| Test interne (100 testeurs max, sans relecture) | `npx eas-cli submit -p android --latest --profile interne` |
| Correction JS seule, sans passer par le Play Store | `npx eas-cli update --channel production --message "…"` |

`eas update` ne touche que le JavaScript et les images : une nouvelle dépendance native ou un changement d'`app.json` demande un nouveau build. Le `runtimeVersion` suit la version de l'app (`0.1.0`) : changer `version` dans `app.json` à chaque build natif incompatible.

Pour publier automatiquement à chaque étiquette git (`v0.2.0`…), relier le dépôt GitHub au projet sur expo.dev et ajouter au workflow :
```yaml
on:
  push:
    tags: ['v*']
```
