# Nkala (Expo) — ce qui n'est PAS développé

Établi le 2 novembre 2026, avant la fusion de `expo-nkala` dans `main`. Mesure des textes : `node apps/nkala/scripts/comparer-textes-web-expo.cjs [--detail]` (305 textes fixes sur 320 du site web reproduits, 95 %). Les textes longs (conditions, guide, FAQ, tribus) sont **générés depuis le code du site web** par les scripts de `apps/nkala/scripts/` : relancez-les après toute modification des textes du site.

## Règles de visibilité appliquées dans l'application Expo
- Contributeur : Contribuer (fiche, Ezango, classement), Profil.
- Validateur : idem + sous-onglet « Validation » (il valide ; il n'est pas administrateur).
- Administrateur : en plus, onglets **Administration** et **Apprendre** (Onenji). Les futures parties Ontci (écoute) et annonces/Nkala suivront la même règle (`MODULES` dans `packages/noyau/src/modules.ts`).
- Le serveur reste seul juge des droits (les écrans ne sont qu'une commodité).

## A. Partie contributeur : écarts avec le site web
Le site web n'a pas été modifié (son bundle principal est identique octet pour octet avant/après fusion). Dans Expo, il manque :
1. **Boutons « Simuler montée en rang (+XP) » et « Réinitialiser »** du classement (outils de démonstration qui simulent des points) : volontairement non repris.
2. **Animations** : confettis à l'envoi, transitions de rang, podium animé, forme d'onde en direct de l'enregistreur (niveau sonore).
3. **Ezango** : « Variante Tribu X » d'une même phrase dans une autre tribu ; encadré « autre tournure / sens secondaire » tiré des contributions d'autrui (non exposé par l'API pour des raisons de confidentialité).
4. **Premier lancement hors-ligne** : le web affiche les 10 fiches du seed intégré en attendant le téléchargement ; Expo affiche « Premier téléchargement du catalogue… » (aucune fiche sans réseau tant que le pack n'est pas chargé une fois).
5. **Flux temps réel** (`/v1/events`) : Expo relit au retour du réseau et au retour dans l'application, pas en continu toutes les minutes ; pas d'indicateur de progression d'envoi (« N restants ») dans l'en-tête.
6. **Favoris hors-ligne** : mis en file par le web ; dans Expo ils exigent le réseau (annulés si le serveur ne répond pas).
7. **Mutations d'administration hors-ligne** (file « admin » du web) : non reprises.
8. **Bannière « Mise à jour disponible »** et **bouton d'installation PWA** : sans objet sur mobile (mises à jour par les magasins / `expo-updates` à configurer).
9. **Fenêtre de connexion** (`AuthModal`) : remplacée par l'écran d'accès unique ; connexion par **téléphone** (Flutter) non reprise ; **Google mobile** inactif tant que les identifiants OAuth iOS/Android ne sont pas créés (voir `NKALA_EXPO.md`).
10. **Notifications** : adaptées au mobile (autorisation, rappel quotidien) ; libellés « du navigateur » / IndexedDB remplacés ; pas de notifications push serveur (FCM).
11. **Administration** : pas d'écran « Hébergement et domaine », ni d'assainissement destructif de la base, de re-seed, ni de synchronisation Firebase (liés au seed Firebase d'origine).
12. **Valeurs par défaut du web non reprises volontairement** : date de naissance « 1995-05-15 », lieu « Lambaréné » et tribu « Enenga » pré-remplis dans l'inscription (données factices) ; clans/villages d'exemple de la fiche de profil (« Avandji », « Imvona ») conservés comme textes de repli seulement.
13. **Non testé sur appareil** : aucune de ces fonctions n'a été exécutée sur iPhone/Android/simulateur (seulement compilées et exportées).

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
