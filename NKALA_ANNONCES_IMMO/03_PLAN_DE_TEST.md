# Plan de test — Annonces de logement (V1)

## 1. Tests automatiques à ajouter
**Noyau** (`server/api/test/noyau.test.ts` ou un nouveau `logement.test.ts`, lancés par `cd server && npm test`) :
- `validerFicheLogement` : fiche complète valide ; équipement inconnu refusé ; valeur de mauvais type refusée ; chemin de média d'un autre utilisateur refusé ; 21 photos refusées ; lat hors bornes refusée.
- `calculerCertification` : 3 médias in-app à < 150 m dont 1 vidéo → vrai ; un média à 400 m → faux ; uniquement des photos → faux ; médias de galerie → faux.
- `calculerCompletude` : fiche minimale faible, fiche complète = 100.
- `estEquirectangulaire` : 4000×2000 vrai ; 5760×2880 vrai ; 4000×3000 faux.
- `formaterPrix(350000, 'mois')` → `350 000 FCFA / mois` (espace insécable).
- `positionPublique` : déterministe pour un même id, entre 100 et 300 m de la vraie position.
- Catalogue : ids uniques, chaque `option` a des `options`, chaque icône existe dans `Ionicons.glyphMap` (si l'import du glyphMap est impossible côté serveur, faire ce test dans l'app ou via le JSON de glyphes de `@expo/vector-icons`).

**API** (`server/api/test/nkala.test.ts`, à côté du test existant des annonces) :
- Publication logement valide → 201, `en_attente`, `certifiee`/`completude` calculés par le serveur (ignorer les valeurs envoyées par le client).
- Fiche invalide → 400 avec erreurs ; annonce simple (ancien format) → toujours acceptée.
- Média déclaré mais absent du stockage → refus.
- `upload-url` : `annonces/{uid}/…` image accepté ; vidéo 40 Mo acceptée ; vidéo 60 Mo refusée ; chemin d'un autre uid refusé ; `application/pdf` refusé.
- Après modération : `/pub/annonces?categorie=logement&lat=…&lng=…&rayon_km=2` renvoie l'annonce proche, pas la lointaine ; `distance_m` présent ; filtres `chambres_min`, `equip=groupe_electrogene`, `avec360=1` fonctionnent.
- Annonce masquée : la position réelle n'apparaît **nulle part** dans `/pub/annonces` ni `/pub/annonces/:id`.
- Le test existant « annonces : quota mensuel, modération… » passe toujours.

## 2. Test local (sans téléphone)
1. Lancer `nkala-api-demo` puis `nkala-demo` (`.claude/launch.json`) ; appliquer la migration sur la base de démo.
2. Web : Village → Annonces → Logement → Publier : remplir les 7 étapes, ajouter 2 photos et une image 4000×2000 marquée 360.
3. Recharger la page à l'étape 5 → le brouillon est retrouvé.
4. Console → modération : la fiche, les vignettes et la 360 s'affichent → Publier.
5. Déconnecté : l'annonce est visible, la 360 tourne à la souris, les équipements sont groupés, prix au bon format.
6. Le bouton d'alerte affiche « Disponible dans l'application mobile ».

## 3. Test sur Android (Capp)
Préparer : `cd apps/nkala && npx expo run:android` (téléphone branché, débogage USB) — nouvelle version de développement nécessaire à cause des modules natifs ajoutés. L'API visée doit être celle de démo locale ou un environnement de test, **pas** la production, sauf accord.

### A. Publication
1. Village → Annonces → Logement → Publier.
2. Étape 1 : Location, « Chambre-salon », titre, description.
3. Étape 2 : 1 chambre, 1 salon, 1 salle de bain, cuisine extérieure.
4. Étape 3 : gardien de nuit, groupe électrogène, forage, climatisation = 2, compteur prépayé, route latérite, inondations « parfois ».
5. Étape 4 : 80 000 FCFA / mois, caution 2 mois, avance 3 mois, frais de visite 5 000.
6. Étape 5 : 2 photos de la galerie, 1 photo **prise dans l'app** (étiquette Salon), 1 vidéo **filmée dans l'app** (< 30 s), 1 image 360 de la galerie.
7. Couper les données mobiles pendant l'envoi → la progression s'arrête ; les rétablir → l'envoi reprend sans tout recommencer.
8. Étape 6 : « Je suis sur place », quartier, repère. Étape 7 : aperçu, consentement, Envoyer.
9. Badge certifié **absent** (2 médias in-app seulement) ; ajouter une 3e photo in-app sur place → badge présent après modération.

### B. Consultation
- Onglets Photos / Vidéos / 360° ; la vidéo ne démarre pas seule ; la 360 tourne au doigt et au gyroscope ; plein écran.
- Filtres : rayon 1 km autour de moi, « avec 360° », « groupe électrogène ».
- Itinéraire ouvre Google Maps ; Appeler et WhatsApp fonctionnent.

### C. Alerte de proximité
1. Sur l'annonce : « M'alerter à proximité », 300 m ; accepter la localisation « toujours » et les notifications.
2. S'éloigner à plus de 500 m, ou simuler la position : Options pour les développeurs → « Application de position fictive » ; sur émulateur `adb emu geo fix <longitude> <latitude>` (longitude d'abord).
3. Revenir dans le rayon, app fermée → notification ; la toucher → l'annonce s'ouvre.
4. Revenir une 2e fois dans la journée → pas de nouvelle notification.
5. « Mes alertes » → désactiver → plus de notification.
6. Refuser la localisation en arrière-plan → message clair, alerte seulement app ouverte.

### D. Non-régression
- Annonce d'une autre catégorie avec l'ancien formulaire : fonctionne.
- Anciennes annonces de logement (format plat) : s'affichent sans plantage.
- Contributions audio Ompangano et leur file d'attente : inchangées.
