# Spécification fonctionnelle — Annonces de logement (V1)

S'applique quand `categorie_id == 'logement'`. Les autres catégories gardent le formulaire simple actuel de `Village.tsx`.

## 1. Publier : formulaire en étapes
Barre de progression, bouton Retour/Suivant, **brouillon enregistré localement** (AsyncStorage) à chaque étape : rien n'est perdu en cas de coupure, de fermeture de l'app ou de passage par la connexion.

| Étape | Contenu |
|---|---|
| 1. Le bien | Transaction (vente, location, colocation, courte durée), type de bien (`typesDeBien` du catalogue), titre, description |
| 2. Pièces | Chambres, salons, salles de bain, WC intérieurs / extérieurs, cuisine (intérieure, extérieure, américaine, aucune), surface habitable et du terrain (m²), étage / nombre de niveaux, meublé (non, partiellement, oui) |
| 3. Équipements et services | Groupes du catalogue en puces (`Puce`) à cocher avec icônes ; certains éléments demandent un nombre (climatiseurs, places de parking, caméras) ou un choix (compteur prépayé…) |
| 4. Conditions | Prix ou loyer (FCFA) et période, négociable, charges et ce qu'elles comprennent, caution (mois), avance (mois), frais d'agence, frais de visite, disponible le, durée minimale, animaux acceptés |
| 5. Médias | Photos, vidéos, 360° (§2) |
| 6. Emplacement | Position (bouton « Je suis sur place » + déplacement du repère sur la carte existante ; à défaut, saisie lat/long par appui long), ville, quartier, repère (« derrière la pharmacie X »), option « Masquer l'emplacement exact » |
| 7. Contact et aperçu | Téléphone, WhatsApp (case « même numéro »), aperçu identique à la page détail, case de consentement des occupants, **Envoyer pour relecture** |

Obligatoires : transaction, type de bien, titre, prix/loyer, au moins 1 photo, position, téléphone, consentement. Un **indice de complétude** (0-100) s'affiche pendant la saisie et sert au tri.
Le quota mensuel de la catégorie (`quota_gratuit`) reste appliqué ; l'afficher dès l'étape 1.

## 2. Médias
### 2.1 Photos fixes
- Appareil photo **ou** galerie (`expo-image-picker`), jusqu'à **20**.
- Avant envoi : redimensionner à 1600 px de large max, JPEG qualité 0,8 (`expo-image-manipulator`) ; créer une **vignette** 400 px.
- Étiquette de pièce par photo (liste `pieces` du catalogue). Réordonner (flèches suffisent en V1) ; la première = couverture.

### 2.2 Vidéos
- Appareil **ou** galerie, jusqu'à **3**, **60 s** et **50 Mo** max chacune (refus clair au-delà ; `videoMaxDuration` du sélecteur).
- Vignette de la vidéo (`expo-video-thumbnails` si compatible SDK 54, sinon icône lecture).
- Lecture avec `expo-video` (déjà installé), **jamais automatique**.

### 2.3 Photos 360°
- V1 = **import** d'images équirectangulaires (caméra 360 type Insta360 / Ricoh Theta, ou mode panorama/Photo Sphere d'un téléphone).
- Détection : rapport largeur/hauteur entre 1,9 et 2,1 → proposer « C'est une photo 360° ? » ; si l'utilisateur confirme, type `pano360`, sinon photo normale.
- Redimensionner à **6000 px** de large max (4096 recommandé pour les petits téléphones : prévoir les deux tailles, `url` 4096 et `urlHd` 6000 si l'original est plus grand) ; vignette 400 px. Une étiquette de pièce par 360.
- **Visionneuse** (écran plein) : rotation au doigt, zoom, gyroscope activable, passer à la 360 suivante. Voir 02 §6 pour la technique (WebView + Pannellum embarqué, sans CDN).

### 2.4 Métadonnées et « Visite certifiée »
Pour chaque média pris **avec l'appareil photo depuis l'app** (pas la galerie) : `capturedInApp: true`, `capturedAt`, `capturedLat`, `capturedLng` (position lue au moment de la prise).
`certifiee = true` si au moins 3 médias `capturedInApp`, dont au moins 1 vidéo ou 1 360, tous à moins de **150 m** de la position de l'annonce. Calcul dans `packages/noyau/src/logement.ts`, appelé par le client (affichage) **et refait par le serveur** à l'enregistrement (le client ne décide pas seul). Badge « Visite certifiée » avec une explication au toucher. C'est déclaratif (une position peut être falsifiée) : le dire dans l'explication et le montrer au modérateur.

## 3. Liste et filtres (section Annonces du Village)
- Quand la puce « Logement » est active : cartes riches (vignette de couverture, prix, type, chambres, quartier, distance, badges 360 / vidéo / certifiée).
- Filtres (feuille `Feuille`) : transaction, type de bien, prix min/max, chambres min, meublé, quartier/ville, **rayon autour de moi** (1, 3, 5, 10 km), équipements clés (`filtresCles` du catalogue), « avec 360° », « certifiées seulement ».
- Tri : récentes, prix croissant/décroissant, distance, complétude.
- Bouton « Voir sur la carte » : réutiliser la carte schématique existante du Village (`Carte2`) avec les annonces en épingles.

## 4. Page détail
1. Galerie : onglets **Photos · Vidéos · 360°** (masquer un onglet vide), compteur, plein écran.
2. Prix (`350 000 FCFA / mois`), badges : type, meublé, négociable, certifiée.
3. Résumé des pièces en icônes.
4. **Équipements et services** groupés comme le catalogue, avec icônes ; seulement ce qui est coché ; valeurs affichées (« Climatisation · 3 », « Compteur : prépayé »).
5. Conditions (caution, avance, frais d'agence, frais de visite, charges).
6. Accès et environnement (route, saison des pluies, **inondations**, services proches).
7. Emplacement : quartier, repère, distance, bouton **Itinéraire** (ouvre Plans / Google Maps comme le fait déjà le Village). Si l'emplacement est masqué : cercle approximatif, pas de point exact.
8. **« M'alerter quand je passe à proximité »** (cloche) + choix du rayon.
9. Appeler, WhatsApp (`https://wa.me/241…`), Partager (`partage.ts`), Signaler (existant).

## 5. Alertes de proximité
- Activation depuis la page détail ; rayon par défaut **300 m** (100, 300, 500, 1000).
- « Mes alertes » dans le Village (ou Profil) : liste, désactiver, supprimer.
- Notification : « Vous êtes à proximité : Villa 3 chambres, Balise — 350 000 FCFA/mois ». Toucher → ouvre l'annonce (lien `nkala://…` ou navigation interne, selon ce que l'app gère déjà pour les notifications).
- Une notification par annonce toutes les **24 h** au plus ; **20 alertes actives** au plus (limite iOS des zones surveillées ; Android en accepte 100).
- Explication avant la demande de localisation « toujours » ; si refusée, l'alerte ne marche qu'app ouverte et on le dit.
- Web : fonction non disponible → message « Disponible dans l'application mobile ».
- V1 : alertes stockées **sur l'appareil uniquement** (pas de position de l'utilisateur envoyée au serveur).

## 6. Modération (console)
Dans « Annonces et signalements » : afficher la fiche complète, les vignettes, la lecture des vidéos et des 360, le badge certifié et l'écart de position des médias, avant **Publier / Refuser** (motif). Les médias d'une annonce refusée ou supprimée sont effacés de Garage après 30 jours (tâche à documenter, pas obligatoire ce soir).

## 7. Préparé pour la V2 (ne pas coder ce soir)
- Capture 360 guidée dans l'app (gyroscope + cibles, 20-30 photos) et assemblage OpenCV/Hugin sur le VPS ; découpage en tuiles multi-résolution.
- Visite virtuelle : points cliquables entre les 360 (`hotspots` déjà prévus dans le modèle).
- Vues 360 depuis la rue (accès au logement), cartographie des quartiers par contributions récompensées (lien AMPANGANO).
- Floutage automatique visages/plaques ; alertes de zone (« nouvelle annonce dans ce quartier ») ; synchronisation des alertes entre appareils.
- Carte routière (MapLibre ou `react-native-maps`, voir `SERVICES_A_CONNECTER.md` §7).
