# Annonces de logement et photos 360° — ce qui est codé (14/11/2026)

Rien n'est commité, rien n'est déployé. Le dépôt contient aussi des changements d'autres sessions.

## Fichiers
**Noyau (partagé app + serveur)**
- `packages/noyau/src/logement.ts` : types, validation stricte, complétude, « Visite certifiée », position publique (décalage de 100 à 300 m si masquée), 360 (format 2:1), prix FCFA, équipements groupés.
- `packages/noyau/contenu/equipements_logement.json` : catalogue (65 équipements ; toutes les icônes existent dans Ionicons).
- `packages/noyau/src/nkalaApi.ts` : `publierLogement`, `modifierLogement`, `chargerLogements(filtres)`, `chargerAnnonce`, `demanderUrlEnvoi`.

**Serveur**
- `server/migrations/014_annonces_logement.sql` : colonnes `lat`, `lng`, `data_privee` sur `contenus`, index, tables `medias_annonces_envois` et `medias_annonces_a_effacer`.
- `server/api/src/annoncesLogement.ts` : préparation, URLs signées (6 h), requête des filtres (distance, prix, pièces, meublé, équipements, 360, vidéo, certifiées, tri, pages).
- `server/api/src/contenus.ts` : publication logement, `PUT /v1/utilisateur/annonces/:id`, `GET /pub/annonces` (filtres), `GET /pub/annonces/:id`, modération avec médias signés et position réelle, médias notés pour effacement en cas de refus, de suppression ou de remplacement.
- `server/api/src/app.ts` + `config.ts` : dossier `annonces/{uid}/{brouillon}/`, photos 15 Mo, vidéos MP4/MOV 50 Mo, 60 envois par jour.
- `server/api/src/comptes.ts` : la fusion de comptes reprend aussi `medias_annonces_envois`.
- `server/scripts/purger_medias_annonces.ts` : efface les médias marqués depuis plus de 30 jours (option `--essai`) et purge le suivi des envois après 30 jours.
- `server/api/src/demo.ts` : l'API de démonstration reçoit et sert les fichiers (`/demo-media/*`).
- `server/api/test/logement.test.ts` : 8 tests.

**Application (`apps/nkala/src/logement/`)**
- `PublierLogement.tsx` (7 étapes, brouillon enregistré sur l'appareil), `EtapeMedias.tsx`, `medias.ts` (photos en 1600 px, 360° en 4096 et 6000 px, vignettes, vidéos de 60 s et 50 Mo au plus), `fileMediasAnnonce.ts` (envoi qui reprend après une coupure de réseau).
- `ListeLogements.tsx` (filtres, rayon, tri, carte schématique), `DetailLogement.tsx` (galerie Photos · Vidéos · 360°, conditions, emplacement, alerte, Mes alertes), `Equipements.tsx`.
- `Visionneuse360.tsx`, `Panorama.tsx` (WebView, image passée en data URI), `Panorama.web.tsx` (iframe), `pannellumHtml.ts` (Pannellum 2.5.7, licence MIT, intégré à l'app sans CDN).
- `alertesProximite.ts` + `EcouteAlertes.tsx` : géorepérage, une notification par 24 h, 20 alertes au plus ; sans localisation « toujours », surveillance seulement quand l'app est ouverte.
- Branchements : `Village.tsx`, `AdminNkala.tsx` (aperçu de modération), `app/_layout.tsx`, `app.json` (plugins `expo-location` et `expo-image-picker`, **version 0.2.0**).

## Dépendances ajoutées (npx expo install)
expo-image-picker ~17.0.11, expo-image-manipulator ~14.0.8, expo-task-manager ~14.0.9, expo-video-thumbnails ~10.0.8, react-native-webview 13.15.0.
Ce sont des modules natifs : il faut **un nouveau build** (`npx expo run:android` ou `eas build`). La version passe à 0.2.0 (règle M2) : une mise à jour par `eas update` n'atteindra pas les binaires 0.1.0.

## À faire sur le VPS (avec l'accord de Capp)
1. Migration `014_annonces_logement.sql`.
2. Vérifier que le CORS du bucket autorise l'origine du site web en GET (`server/scripts/set-bucket-cors.ts`, visionneuse 360° sur le web).
3. Mettre `scripts/purger_medias_annonces.ts` dans le cron quotidien, après un essai avec `--essai`.

## Registre des traitements (règle D1) — à reporter dans le registre officiel
| Donnée | Finalité | Conservation |
|---|---|---|
| Photos, vidéos et 360° d'annonce (`annonces/{uid}/…`) | Montrer le logement | Tant que l'annonce existe ; 30 jours après un refus, une suppression ou un remplacement |
| Position du logement (`data.logement.positionPublique`, ou `data_privee.position` si masquée) | Recherche par distance, itinéraire | Comme l'annonce |
| Positions de prise de vue des médias (`data_privee.positionsMedias`) | Calcul du badge « Visite certifiée », contrôle par le modérateur | Comme l'annonce ; jamais publiques |
| `medias_annonces_envois` (compte, chemin, taille, date) | Limite de 60 envois par jour | 30 jours |
| Alertes de proximité | Notification à proximité | Sur le téléphone seulement, jamais envoyées au serveur |

## Écarts connus
- **D3** : l'API n'a pas encore de route de suppression de compte (manque antérieur à ce travail). Une fois créée, elle devra effacer les annonces, `data_privee` et les médias de la personne.
- Après une fusion de comptes, les médias restent dans le dossier de l'ancien identifiant : modifier la fiche avec ces médias serait refusé (rare : un compte téléphone fusionné avec un compte Google).
- Sur téléphone, rien n'est encore vérifié : appareil photo, envoi après une coupure de réseau, visionneuse dans la WebView, gyroscope, géorepérage. Voir `03_PLAN_DE_TEST.md` §3.
- La modification d'une annonce publiée depuis l'app n'a pas encore d'écran (la route et `modifierLogement` existent).
