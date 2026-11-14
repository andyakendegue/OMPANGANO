# Architecture, API et données — Annonces de logement

Principe : **garder** la table `contenus`, la collection `annonces`, le quota, la modération et `/pub/annonces`. Ajouter une fiche structurée `logement` validée par un module **partagé** client/serveur.

## 1. Types partagés — `packages/noyau/src/logement.ts`
```ts
export type Transaction = 'vente' | 'location' | 'colocation' | 'courte_duree';
export type TypeMedia = 'photo' | 'video' | 'pano360';

export interface MediaAnnonce {
  id: string;                    // uuid généré par le client (expo-crypto)
  type: TypeMedia;
  chemin: string;                // annonces/{uid}/{brouillonId}/{id}.jpg  (clé Garage, jamais une URL)
  cheminVignette?: string;
  cheminHd?: string;             // 360 seulement, si original > 4096 px
  piece?: string;                // id de « pieces » du catalogue
  ordre: number;
  largeur?: number; hauteur?: number; dureeS?: number; octets: number;
  capturedInApp?: boolean; capturedAt?: string; capturedLat?: number; capturedLng?: number;
  hotspots?: { cible: string; yaw: number; pitch: number; label?: string }[]; // V2
}

export interface FicheLogement {
  version: 1;
  transaction: Transaction;
  typeBien: string;                         // id de typesDeBien
  periode: 'mois' | 'jour' | 'semaine' | 'total';
  negociable?: boolean;
  pieces: { chambres?: number; salons?: number; sallesDeBain?: number; wcInterieurs?: number; wcExterieurs?: number;
            cuisine?: 'interieure' | 'exterieure' | 'americaine' | 'aucune'; surfaceHabitable?: number; surfaceTerrain?: number;
            etage?: number; niveaux?: number; meuble?: 'non' | 'partiel' | 'oui' };
  equipements: Record<string, true | number | string>;   // id du catalogue -> coché | quantité | id d'option
  conditions: { cautionMois?: number; avanceMois?: number; fraisAgence?: number; fraisVisite?: number; charges?: number;
                chargesComprises?: string[]; disponibleLe?: string; dureeMinMois?: number; animaux?: boolean };
  position: { lat: number; lng: number };   // position réelle (jamais renvoyée au public si masquee)
  masquee?: boolean;
  quartier?: string; repere?: string;
  whatsapp?: string;
  consentementOccupants: true;
  medias: MediaAnnonce[];
  brouillonId: string;
}

export function validerFicheLogement(x: unknown, uid: string): { ok: true; fiche: FicheLogement } | { ok: false; erreurs: string[] };
export function calculerCompletude(f: FicheLogement): number;               // 0-100
export function calculerCertification(f: FicheLogement): boolean;           // règle 01 §2.4 (150 m, 3 médias, ≥1 vidéo ou 360)
export function positionPublique(f: FicheLogement, id: string): { lat: number; lng: number }; // décalage déterministe ~200 m (hash de l'id) si masquee
export function estEquirectangulaire(l: number, h: number): boolean;       // 1,9 ≤ l/h ≤ 2,1
export function formaterPrix(n: number, periode?: string): string;         // « 350 000 FCFA / mois » (espace insécable)
export function distanceM(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number; // haversine (réutiliser distanceKm s'il existe déjà dans le noyau)
```
Validation stricte : ids d'équipements connus du catalogue, types de valeurs conformes (`bool`/`number`/`option`), nombres bornés (≥ 0, plafonds raisonnables), 20 photos / 3 vidéos / 10 360 au plus, chaque `chemin` doit commencer par `annonces/{uid}/{brouillonId}/`, textes tronqués comme le fait déjà `contenus.ts` (4000 car.). Lat entre -90 et 90, lng entre -180 et 180.

## 2. Catalogue
`equipements_logement.json` (fourni) : `typesDeBien`, `pieces`, `groupes[].items[]` (`type`: `bool` | `number` | `option`), `filtresCles`, `conditions`. Les icônes sont des noms **Ionicons** : vérifier chacun contre `Ionicons.glyphMap` (test) et remplacer par le plus proche si un nom n'existe pas. Le placer avec les autres JSON de contenu et l'importer dans le noyau (statique en V1 ; il pourra devenir une collection administrable plus tard via `schemas.ts`).

## 3. Base de données — `server/migrations/012_annonces_logement.sql`
Vérifier d'abord le dernier numéro de migration (011 au 13/11). Pas de nouvelle table pour l'annonce (elle reste dans `contenus`), mais des colonnes générées pour filtrer vite :
```sql
ALTER TABLE contenus
  ADD COLUMN IF NOT EXISTS lat double precision GENERATED ALWAYS AS (NULLIF(data->'logement'->'positionPublique'->>'lat','')::double precision) STORED,
  ADD COLUMN IF NOT EXISTS lng double precision GENERATED ALWAYS AS (NULLIF(data->'logement'->'positionPublique'->>'lng','')::double precision) STORED;
CREATE INDEX IF NOT EXISTS contenus_annonces_geo_idx ON contenus (lat, lng) WHERE collection = 'annonces' AND publie AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS contenus_annonces_cat_idx ON contenus ((data->>'categorie_id'), created_at DESC) WHERE collection = 'annonces';
```
(Si les colonnes générées posent problème avec la version de PostgreSQL ou les tests en mémoire du serveur, calculer `lat/lng` à l'écriture dans le code à la place, et le noter.)
**Position réelle masquée** : si `masquee`, ne stocker dans `data.logement` que `positionPublique` ; ranger la position réelle dans `data_privee` → ajouter `ALTER TABLE contenus ADD COLUMN IF NOT EXISTS data_privee jsonb` (jamais renvoyée par les routes publiques).

## 4. Routes serveur (dans `server/api/src/contenus.ts` ou un nouveau `logement.ts` enregistré comme les autres modules)
### 4.1 Publication
`POST /v1/utilisateur/annonces` : si `categorie_id === 'logement'` **et** un objet `logement` est fourni → `validerFicheLogement(body.logement, uid)` ; en cas d'erreur 400 avec la liste. Sinon comportement actuel inchangé (annonces simples et anciens clients).
À l'enregistrement : `data = { titre, description, prix, ville, telephone, categorie_id, auteur, logement: { ...fiche sans position réelle si masquée, positionPublique, completude, certifiee, couverture } }`. `certifiee` et `completude` **recalculés par le serveur**. Vérifier que chaque média existe dans Garage (`storage.exists`) ; refuser sinon. Quota et statut `en_attente` inchangés.
`PUT /v1/utilisateur/annonces/:id` (nouveau) : modification par l'auteur → repasse en `en_attente`.

### 4.2 Lecture publique
`GET /pub/annonces` accepte en plus : `lat`, `lng`, `rayon_km` (≤ 50), `transaction`, `type`, `prix_min`, `prix_max`, `chambres_min`, `meuble`, `avec360`, `certifiee`, `equip` (liste séparée par virgules), `tri` (`recent` | `prix` | `-prix` | `distance` | `completude`), `page`, `limite` (≤ 50).
- Distance : formule haversine en SQL sur `lat/lng` (pré-filtre par boîte englobante puis calcul exact) ; renvoyer `distance_m`.
- Réponse : la fiche **avec URLs présignées** pour couverture, vignettes et médias (`storage.presignGet`, durée 6 h), jamais `data_privee`.
- `GET /pub/annonces/:id` (nouveau) : détail d'une annonce publiée (pour la notification et le partage).
- Garder `Cache-Control: public, max-age=30` mais **ne pas** mettre en cache partagé une réponse contenant la position de l'utilisateur (`lat/lng` en paramètre → `private`).

### 4.3 Médias
- Étendre `mediaPathError` : nouveau préfixe `annonces/{uid}/{brouillonId}/{fichier}` autorisé à tout utilisateur non suspendu, `brouillonId` et `fichier` en `[A-Za-z0-9._-]`.
- `POST /v1/media/upload-url` : pour ce préfixe, accepter `image/jpeg|png|webp` (≤ 15 Mo) et `video/mp4|quicktime` (≤ **50 Mo** : ajouter `MAX_UPLOAD_VIDEO_BYTES` dans `config.ts`). Limiter le nombre d'URL demandées (ex. 60 par jour et par utilisateur) pour éviter l'abus du stockage.
- Modération : `GET /v1/admin/moderation` renvoie aussi les URLs présignées des médias des annonces logement.
- Suppression : quand l'auteur supprime ou qu'un modérateur refuse, marquer les chemins pour effacement (V1 : simple journal ; effacement réel par un script ou tâche à documenter).
- CORS Garage : vérifier `server/scripts/set-bucket-cors.ts` — la visionneuse 360 web charge l'image dans WebGL, donc `GET` doit être autorisé depuis l'origine de l'app web.

## 5. Client — `packages/noyau/src/nkalaApi.ts` et `apps/nkala`
- `publierLogement(fiche, base)`, `modifierLogement(id, …)`, `chargerLogements(filtres)`, `chargerAnnonce(id)` ; garder `chargerAnnonces` pour les autres catégories.
- **File d'envoi des médias** (`apps/nkala/src/fileMediasAnnonce.ts`, sur le modèle de `fileAttente.ts`) : pour chaque média, demander l'URL (`/v1/media/upload-url`), envoyer le fichier (`expo-file-system` `uploadAsync` en natif, `fetch` + Blob sur le web), marquer envoyé ; reprise au retour du réseau (`NetInfo`) ; l'annonce n'est soumise que quand tous ses médias sont envoyés ; barre de progression globale.
- Fichiers d'écran proposés (découper `Village.tsx` plutôt que l'allonger) :
```
apps/nkala/src/logement/PublierLogement.tsx     // formulaire en étapes + brouillon
apps/nkala/src/logement/EtapeMedias.tsx         // photos, vidéos, 360, étiquettes, ordre
apps/nkala/src/logement/ListeLogements.tsx      // cartes riches + filtres + tri
apps/nkala/src/logement/DetailLogement.tsx
apps/nkala/src/logement/Visionneuse360.tsx      // natif : WebView ; web : même HTML dans un <iframe srcDoc>
apps/nkala/src/logement/pannellumHtml.ts        // HTML + JS de Pannellum embarqués (chaîne), pas de CDN
apps/nkala/src/logement/Equipements.tsx         // puces de saisie + affichage groupé
apps/nkala/src/logement/alertesProximite.ts     // géorepérage + notifications
apps/nkala/src/logement/MesAlertes.tsx
```
Dans `Village.tsx` : brancher `Annonces` → `ListeLogements` quand la catégorie est `logement`, `DetailAnnonce` → `DetailLogement` si `a.logement`, `Publier` → `PublierLogement` si catégorie `logement`. Ajouter les nouvelles icônes nécessaires à la table `ICONES` de `kit.tsx` si besoin.

## 6. Visionneuse 360
- Bibliothèque : **Pannellum** (MIT, autonome, WebGL) embarquée dans l'app (copier `pannellum.js` / `.css` dans une chaîne ou un asset ; vérifier la licence et la dernière version). Alternative acceptable : Photo Sphere Viewer (MIT, plus lourd). Pas de CDN (hors ligne, réseau filtré).
- Natif : `react-native-webview` (`npx expo install react-native-webview`). Pour éviter les soucis CORS/WebGL, **télécharger l'image** dans le cache (`expo-file-system`) et la passer en `file://` avec `allowFileAccess` (Android) / `allowingReadAccessToURL` (iOS) ; repli : data URI base64 pour les images ≤ 4096 px.
- Web : `<iframe srcDoc>` avec le même HTML et l'URL présignée (CORS du bucket).
- Gyroscope : option `orientationOnByDefault: false` + bouton ; sur iOS 13+, la demande de permission d'orientation se fait par un geste utilisateur dans la page.
- Messages WebView → RN : `chargee`, `erreur` ; afficher la vignette floue tant que l'image complète n'est pas chargée.

## 7. Alertes de proximité
- Dépendances : `expo-task-manager` (`npx expo install expo-task-manager`) ; `expo-location` est déjà là.
- `app.json` : ajouter le plugin
```json
["expo-location", {
  "locationAlwaysAndWhenInUsePermission": "Nkala utilise votre position, même en arrière-plan, pour vous prévenir quand vous passez près d'un logement que vous suivez.",
  "locationWhenInUsePermission": "Nkala utilise votre position pour afficher les logements et services proches de vous.",
  "isAndroidBackgroundLocationEnabled": true
}]
```
  et vérifier que `expo-notifications` reste fonctionnel avec `plugins/sans-push-ios.js` (notifications **locales** uniquement).
- `alertesProximite.ts` : `TaskManager.defineTask('nkala-geofence', …)` au **niveau module** et importé tôt (dans `app/_layout.tsx`), `Location.startGeofencingAsync('nkala-geofence', regions)` avec `{ identifier: annonceId, latitude, longitude, radius, notifyOnEnter: true, notifyOnExit: false }`. À l'entrée : lire AsyncStorage, appliquer la règle des 24 h, `Notifications.scheduleNotificationAsync({ content: { title, body, data: { annonceId } }, trigger: null })`.
- Toucher la notification : écouteur `addNotificationResponseReceivedListener` → ouvrir le détail (`chargerAnnonce(id)` puis navigation vers le Village/annonce).
- Stockage local `nkala_alertes_logement` : `{ annonceId, titre, prixLabel, lat, lng, rayonM, actif, dernierEnvoi }[]` ; réenregistrer toutes les zones au démarrage de l'app.
- Position publique de l'annonce seulement (si masquée, le rayon minimum devient 300 m).
- Web : `Platform.OS === 'web'` → bouton désactivé avec explication.
- Nécessite une **nouvelle version de développement** (`npx expo run:android` ou `eas build --profile development`).

## 8. Dépendances attendues
`expo-image-picker`, `expo-image-manipulator`, `expo-task-manager`, `react-native-webview`, et si compatibles SDK 54 : `expo-video-thumbnails`. Toutes par `npx expo install`. Mettre à jour `app.json` (plugins `expo-image-picker` avec textes de permission caméra/photos en français, `expo-location`).
