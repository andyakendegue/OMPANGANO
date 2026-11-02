# Nkala (Expo) — ce qui n'est PAS développé

Établi le 2 novembre 2026, avant la fusion de `expo-nkala` dans `main`. Mesure des textes : `node apps/nkala/scripts/comparer-textes-web-expo.cjs [--detail]` (309 textes fixes sur 320 du site web reproduits, 97 %). Les textes longs (conditions, guide, FAQ, tribus) sont **générés depuis le code du site web** par les scripts de `apps/nkala/scripts/` : relancez-les après toute modification des textes du site.

## Règles de visibilité appliquées dans l'application Expo
- Contributeur : Contribuer (fiche, Ezango, classement), Profil.
- Validateur : idem + sous-onglet « Validation » (il valide ; il n'est pas administrateur).
- Administrateur : en plus, onglets **Administration** et **Apprendre** (Onenji). Les futures parties Ontci (écoute) et annonces/Nkala suivront la même règle (`MODULES` dans `packages/noyau/src/modules.ts`).
- Le serveur reste seul juge des droits (les écrans ne sont qu'une commodité).

## A. Partie contributeur : état après la mise à niveau complète (2 nov. 2026, branche `contributeur-complet`)
Le site web n'a pas été modifié (même code ; seuls les noms hachés des fichiers générés peuvent varier d'une compilation à l'autre). Textes : **309 / 320 reproduits (97 %)** ; les 11 restants sont des artefacts de composition (marque « Nkala » + « ESSAKA » en deux éléments, « Tribu » + nom) ou des mots propres au navigateur remplacés volontairement (« Notifications Push du Navigateur », « IndexedDB ») ou la fenêtre de connexion en double (`AuthModal`), inutile puisque l'écran d'accès précède toute l'application.

**Reproduit depuis la liste précédente des écarts :** boutons « Simuler montée en rang (+XP) » / « Réinitialiser » (simulation locale, rien n'est écrit) ; confettis à l'envoi ; forme d'onde en direct de l'enregistreur (niveau micro) ; podium et transitions de rang animées avec indicateurs « ▲ +N rangs / +N XP » ; « Variante Tribu X », tribus supplémentaires d'une fiche et « Autre tournure / Sens secondaire » dans Ezango (via la nouvelle route `GET /v1/items/annotations`, limitée aux contributions **validées** et sans identité : plus strict que le site web, qui lit toutes les contributions) ; fiches de secours du site (10 fiches) avant le premier téléchargement, avec tribus et compteurs ; flux de modifications du serveur (`/v1/events`) + relecture au retour du réseau, au retour dans l'application et toutes les minutes ; indicateurs « Téléchargement x / y » et « N restants » dans l'en-tête ; favoris gardés hors-ligne et renvoyés ensuite ; contributions encore sur l'appareil visibles et supprimables dans « Mes contributions » ; copie locale des clans, villages, thèmes, défis, badges, classement et de l'historique pour l'usage hors-ligne ; bannière « Mise à jour disponible » (EAS Update) ; bouton « Installer l'App » (version web d'Expo uniquement).

**Reste :**
1. **À déployer sur le VPS** : la route `GET /v1/items/annotations` (45 tests verts) ; sans elle Ezango n'affiche simplement pas les variantes ni les nuances.
2. **Google mobile** : inactif tant que les identifiants OAuth iOS/Android ne sont pas créés (`NKALA_EXPO.md`).
3. **Mises à jour de code** : la bannière ne fonctionnera qu'après `eas update:configure` (adresse de mise à jour du projet EAS) ; `runtimeVersion` est déjà réglé.
4. **Valeurs factices du web volontairement non reprises** : date de naissance « 1995-05-15 », lieu « Lambaréné » et tribu « Enenga » pré-remplis dans l'inscription.
5. **Mutations d'administration hors-ligne** (file « admin » du web) : non reprises (partie administration, pas contributeur).
6. **Non testé sur appareil** : aucune fonction n'a été exécutée sur iPhone/Android/simulateur ; en particulier le flux temps réel (`expo/fetch` en continu), les notifications, le micro et les mises à jour de code. La logique pure (cache hors-ligne, annotations, lecture du flux) est testée.

## B. Nkala existant (`~/Projets/nkala-app`, Flutter, ≈ 13 000 lignes) : rien n'est porté, sauf l'idée d'ensemble
- **Annonces** (19 fichiers) : catégories et sous-catégories, création d'annonce, sélection de lieu sur carte, liste, détail, cartes d'annonce, dépôt (repository) Firestore/web.
- **Authentification** : connexion par **numéro de téléphone** (OTP), inscription, complétion de profil, bloc d'authentification, **Facebook** (dépendance présente).
- **Carte des services** (`map`) : points de service, catégories de services, géolocalisation, tuiles OpenStreetMap.
- **Emplois** (`jobs`) : liste, détail, offres (dépôt factice dans le code actuel).
- **Bibliothèque** (`library`) : liste, détail, éléments (dépôt factice).
- **Actualités** (`news`) : liste, détail, cartes.
- **Médias** (`media`) : **télévision** et **radio** web (lecteur vidéo, flux radio).
- **Communications pair-à-pair** (`p2p_comms`) : **chat** et **appels** (WebRTC / peerdart).
- **Profil**, **catégories de services**, **hub communautaire**, **écran d'accueil / navigation principale**, **splash et onboarding**.
- Socle technique : **GraphQL**, URL **blockchain** (RPC), notifications locales, injection de dépendances, thème.

## C. Ontci / Essaka Play (`~/Projets/stream/essaka-play`, Flutter, ≈ 13 700 lignes) : rien n'est porté
- **Écoute** : accueil, découverte, musique, **lecteur audio complet** (lecture en arrière-plan, lecteur flottant, aléatoire, répétition, barre de progression, titre/pochette courants), liste de lecture, **téléchargements** hors-ligne.
- **Catalogue** : artistes (fiche, biographie), albums (liste, détail), discographie, détail d'un titre, genres, tags, liens, « récemment écoutés ».
- **Compte** : connexion par **téléphone** (OTP), inscription/profil, abonnement et **carte de paiement** (modèles), onboarding.
- **Autres modules** : **télévision** (lecteur), **web flux** (radio), **actualités**, **statistiques** (graphiques), **pronostics** (matchs de football), **logements** (liste, détail, formulaire), **commune** (annuaire/carte, actualités locales, bibliothèque, idées, emplois, profil, formulaires de lieu, d'emploi, d'idée).
- **Évolutions spécifiées non réalisées** (`SPECS.md`) : téléchargements chiffrés, playlists partageables et collaboratives, etc.
- **Autres applications de l'écosystème** : `ontci-backend` (application des artistes, B2B), `firecms-ontci` (support interne), `ontci-laravel`, `azuracast` : non traités.
- **Régie publicitaire** : `REVIVE_ADSERVER.md` décrit l'installation et la passerelle ; **rien n'est installé ni codé** (ni zones, ni passerelle API, ni publicité récompensée).

## D. Onenji (spécifications `14_programme_et_jeux/`) : 4 jeux sur ≈ 60
Développés (réservés aux administrateurs) : « Choisis la bonne phrase » (contrôle 7), « Remets les mots dans l'ordre » (contrôle 4), « Écoute et choisis » (contrôle 1), « Écoute et remets en ordre » (dictée sonore). Règle des cœurs et des points (chiffres provisoires).
Non développé :
- **Contrôles 2, 3, 5, 6** (image → nom, prononcer devant une image, remplir une case, glisser-déposer) : exigent des images liées aux fiches et la capture de réponses.
- **Jeux de mots** : mots mêlés, mots fléchés, mots croisés, pendu, anagrammes, syllabes, mot-image, singulier/pluriel (classes), mots jumeaux (homonymes), familles de mots.
- **Corps humain** : touche ta tête, habille le squelette, puzzle du corps, Jacques a dit, comptine, chez le guérisseur. **Objets du quotidien, environnement, compter, société, oralité** : catalogue étendu entier.
- **Grand jeu de société** (dé, crédits, étapes par classes d'âge), **modules Ntina / Ogèndo / Emeno / Ikôkô** et **six cycles** (aucun découpage des fiches par âge ni par thème), **cours payants / crédits**, **publicité récompensée**, **visioconférence**.
- **Production de données** : les réponses des joueurs ne sont pas envoyées au corpus ; pas de statut « validé par un locuteur » sur les fiches (les jeux utilisent toutes les fiches actives alors que le document exige des données validées).
- Jeux de référence (Itango, quiz, mots croisés, pendu) : non repris.

## E. Technique restant
Construction EAS (`eas build`) non lancée ; icônes, écran de démarrage, identité visuelle (logo, polices) et ressources `assets/aistudio/` du site web non reprises dans l'application ; comptes Apple Developer / Google Play, clés de signature, politique de confidentialité et fiches de magasin à fournir ; tests automatisés de l'application Expo absents (seuls des tests de logique ponctuels ont été faits, hors dépôt).
