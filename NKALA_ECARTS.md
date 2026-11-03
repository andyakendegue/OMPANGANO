# Nkala (Expo) — ce qui n'est PAS développé

Établi le 2 novembre 2026, avant la fusion de `expo-nkala` dans `main`. Mesure des textes : `node apps/nkala/scripts/comparer-textes-web-expo.cjs [--detail]` (309 textes fixes sur 320 du site web reproduits, 97 %). Les textes longs (conditions, guide, FAQ, tribus) sont **générés depuis le code du site web** par les scripts de `apps/nkala/scripts/` : relancez-les après toute modification des textes du site.

## Règles de visibilité appliquées dans l'application Expo
- Contributeur : Contribuer (fiche, Ezango, classement), Profil.
- Validateur : idem + sous-onglet « Validation » (il valide ; il n'est pas administrateur).
- Administrateur : en plus, onglet **Administration**.
- **Modifié le 2 nov. 2026 (demande de Capp)** : les onglets **Apprendre** (Onenji) et **Écoute** (Ontci, page « pas encore porté ») sont visibles de tout utilisateur connecté ; le verrou administrateur ne subsiste que pour l'Administration. Audit complet des modules restants : `NKALA_AUDIT_COMPLET.md`.
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
Développés (visibles de tous les utilisateurs connectés) : « Choisis la bonne phrase » (contrôle 7), « Remets les mots dans l'ordre » (contrôle 4), « Écoute et choisis » (contrôle 1), « Écoute et remets en ordre » (dictée sonore). Règle des cœurs et des points (chiffres provisoires).
Non développé :
- **Contrôles 2, 3, 5, 6** (image → nom, prononcer devant une image, remplir une case, glisser-déposer) : exigent des images liées aux fiches et la capture de réponses.
- **Jeux de mots** : mots mêlés, mots fléchés, mots croisés, pendu, anagrammes, syllabes, mot-image, singulier/pluriel (classes), mots jumeaux (homonymes), familles de mots.
- **Corps humain** : touche ta tête, habille le squelette, puzzle du corps, Jacques a dit, comptine, chez le guérisseur. **Objets du quotidien, environnement, compter, société, oralité** : catalogue étendu entier.
- **Grand jeu de société** (dé, crédits, étapes par classes d'âge), **modules Ntina / Ogèndo / Emeno / Ikôkô** et **six cycles** (aucun découpage des fiches par âge ni par thème), **cours payants / crédits**, **publicité récompensée**, **visioconférence**.
- **Production de données** : les réponses des joueurs ne sont pas envoyées au corpus ; pas de statut « validé par un locuteur » sur les fiches (les jeux utilisent toutes les fiches actives alors que le document exige des données validées).
- Jeux de référence (Itango, quiz, mots croisés, pendu) : non repris.

## E. Technique restant

Erreurs rencontrées et reproduction dans Expo : voir `NKALA_ERREURS.md`.

Construction EAS (`eas build`) non lancée ; icônes, écran de démarrage, identité visuelle (logo, polices) et ressources `assets/aistudio/` du site web non reprises dans l'application ; comptes Apple Developer / Google Play, clés de signature, politique de confidentialité et fiches de magasin à fournir ; tests automatisés de l'application Expo absents (seuls des tests de logique ponctuels ont été faits, hors dépôt).

## D. Évolutions du site web à reporter dans l'application Expo (demandées par Capp le 2 nov. 2026, soir)
Toutes ces évolutions sont **déployées sur le site web et sur l'API** (migration `003_statistiques_visites.sql`, 58 tests verts) mais **pas encore reprises dans `apps/nkala`**. Le serveur est déjà prêt pour Expo.

1. **Une fiche déjà enregistrée ne l'est plus jamais** (quel que soit le statut, refusée comprise) : « Suivante/Précédente » les sautent, la première fiche proposée est la première non traitée, l'envoi d'une fiche déjà enregistrée est refusé. Ezango ne montre plus les fiches enregistrées par l'utilisateur ; le Profil les range dans **« Mes fiches enregistrées »** (statut : en attente, validée, refusée).
2. **Plus de reprise de fiche** : les statuts `needs_revision`, `audio_approved_text_revision`, `text_approved_audio_revision` ne sont plus produits par les écrans ; la validation n'a que deux issues (validée / refusée, définitive). Le libellé « À revoir » est supprimé.
3. **Validation réservée aux administrateurs** (écran web : onglet Validation visible des seuls admins). **Contredit la règle Expo « validateur = + Validation »** : à changer dans `MODULES` et les onglets. Côté serveur, le rôle validateur reste accepté (règles non durcies, à faire avec un redéploiement de l'API).
4. **Ordre des fiches par rareté** : les moins répondues d'abord, les répondues en dernier (couverture rapide de la langue). Route `GET /v1/items/ordre` (identifiants triés, tous contributeurs) ; repli sur les contributions connues si le serveur est injoignable. **Premier téléchargement** dans le même ordre : `GET /v1/sync/items?order=rarete&offset=N` (renvoie `nextOffset` et `deltaCursor`, curseur à enregistrer à la fin pour les synchronisations suivantes ; reprise par la position). Limite serveur : 6 téléchargements complets par compte et par jour.
5. **Statistiques de fréquentation** : collecte publique `POST /pub/collect` (session, visiteur anonyme, onglet consulté, appareil, durée active, signal de vie toutes les 30 s) ; IP et pays déduits par le serveur ; lecture `GET /v1/admin/analytics?days=` (admin) ; écran « Administration > Pilotage > Fréquentation ». Expo : envoyer les mêmes événements (type d'appareil, système, version de l'application, écran, durée), avec un identifiant de visiteur conservé après la déconnexion.
6. **Déconnexion = purge totale** : catalogue, caches, file hors-ligne, profil, préférences, clé de chiffrement ; seul l'identifiant anonyme de visiteur est gardé ; avertissement si des envois ne sont pas encore partis ; la connexion suivante retélécharge tout.
7. **Après connexion, l'interface attend la fin du premier téléchargement** du catalogue (écran de préparation avec progression) ; levé si hors-ligne ou en cas d'échec réseau.
8. **Cache local chiffré** (AES-GCM 256, clé de l'appareil non exportable, supprimée à la déconnexion) : fiches et texte de recherche ; seuls l'identifiant, le dialecte et le thème restent en clair. Expo : clé dans le trousseau (`expo-secure-store`), base chiffrée équivalente. Non chiffrés côté web : profil mis en cache et file hors-ligne (purgés à la déconnexion).
9. **Mise à jour automatique** : alerte toujours visible (« va se mettre à jour automatiquement dans N s, l'écran se coupera quelques secondes »), téléchargement en arrière-plan avec progression, **non bloquant** ; en cas de coupure, la fenêtre disparaît et la mise à jour reprend plus tard ; vérification et tentative **au plus toutes les 5 minutes** ; pas de rechargement pendant un enregistrement vocal ou le premier chargement ; « Plus tard » repousse de 5 minutes. Expo : même comportement avec EAS Update (`expo-updates`).
10. **Protection contre la copie (web seulement)** : clic droit, copie, sélection, impression, raccourcis d'inspection bloqués ; écran masqué si l'inspecteur est ouvert (ordinateur) ; verrou de domaine ; en-têtes de sécurité ; administrateurs exemptés. Dissuasion seulement. Expo : sans objet, hors limite de téléchargement du corpus (point 4) et chiffrement (point 8).
11. **Marque** : la pastille « ESSAKA » après « Nkala » est supprimée (barre du haut et écran d'accès du site). Expo n'en avait pas (le script de comparaison de textes comptait « Nkala » + « ESSAKA » comme artefact : mesure à relancer). Les mentions juridiques « Essaka Engineering » (conditions, charte) sont conservées.
12. **Carte de contribution remise à zéro à chaque fiche** (choix, textes saisis, enregistrement), et lecture audio coupée en changeant de fiche.
13. **Connexion par Google uniquement** : la connexion e-mail / mot de passe est retirée du site (écran d'accès et fenêtre de connexion). Expo (`apps/nkala/app/connexion.tsx`, `Inscription.tsx`) propose encore « Email & Mot de passe » : à retirer. Les comptes créés par e-mail ne peuvent plus se connecter sur le site.
14. **Filiation obligatoire** (clan paternel, clan maternel, village d'origine) avec l'option **« Je ne sais pas »** dans les trois listes (réponse valide) ; la fenêtre d'inscription se rouvre tant que la filiation est vide (valeurs vides : `''`, « Non précisé », « Non rattaché », « À définir »). Fichier `src/services/filiation.ts`. À reproduire dans Expo (`Inscription.tsx`).
15. **Courriels aux utilisateurs depuis noreply@** : bienvenue (objectifs + guide pratique) et rappel de filiation (3 rappels au plus, espacés de 7 jours), envoyés par `server/backup/courriels.py` (cron toutes les 10 min, table `user_mails`). Indépendant du client : Expo n'a rien à faire, sauf proposer « Je ne sais pas » (point 14).
16. **Déconnexion** : envoie d'abord ce qui attend, relit la vraie file, et n'efface qu'après confirmation s'il reste des envois.
