# Audit de l'onglet Apprendre (Onenji) — 12 nov. 2026

Sources lues : `apps/nkala/app/(tabs)/apprendre.tsx`, `src/Onenji.tsx` (358 l.), `src/OnenjiLecon.tsx` (240 l.), `src/Bibliotheque.tsx`, `src/Progres.tsx`, `packages/noyau` (schémas, azeva.ts), `contenu/` (exemples, COLONNES.md), `NKALA_AUDIT_COMPLET.md` §3, `NKALA_PLAN_DEVELOPPEMENT.md`, maquettes du 10 nov. (écrans 31-45), note Apple « Cours et Jeux Onenji » (2023, relue ; aucune note Onenji modifiée depuis le 25 sept. 2026).
Ancienne app Onenji : `~/Projets/.onenji` ne contient que des spécifications ANAGA ; aucun code Onenji (les 4 jeux d'origine sont passés dans Azeva).

## 1. Ce qui est codé
- Accueil : reprendre la leçon, étapes de la vie (barre de progression), cours d'artisans, bandeau pub `bandeau_apprendre`, carte de l'assistant, bibliothèque, cours à distance. Mode enfant : cycles 1-2 seulement, pas d'artisans ni d'IA.
- Parcours : chemin qui serpente, leçons verrouillées dans l'ordre, contrôle de fin d'unité, certificat quand toutes les unités sont validées.
- Leçon : 7 types — `ecouter`, `dire` (enregistrement + réécoute, sans note), `ordre` (toucher les mots), `trou` (un seul trou), `saisie`, `associer`, `choix`. Pas de voix de synthèse (choix voulu). Pas de pub.
- Fin de leçon (XP, justesse, série), contrôle 5 questions / 4 justes, certificat (partage texte).
- Cours d'artisans : catalogue par métier, fiche, chapitres, lecteur avec filigrane mobile, capture d'écran bloquée, licence (T10).
- Assistant « Kak'Igonjo » : chat texte, quota du jour, compte obligatoire.
- Bibliothèque : lecteur où chaque mot se touche, « Mes mots », quiz de fin de chapitre, XP.
- Cours à distance : création/rejoindre une salle (4 max), signalisation ; caméra et micro NON branchés (react-native-webrtc absent).

## 2. Contenu réel
4 parcours (seul Ntina a du contenu), 2 unités (Saluer, Être poli), 3 leçons, 10 exercices, 2 cours d'artisans et 1 livre de démonstration. Aucun fichier audio : le bouton son s'affiche « muet ».

## 3. Écarts et manques
A. Cœur d'Onenji absent : le tuteur IA qui fait cours (explique, fait pratiquer, corrige d'après le corpus, pose les contrôles). Aujourd'hui l'IA n'est qu'un chat à côté des leçons.
B. Thèmes de la note non couverts : Ntina doit contenir nombres, formes, grandeurs, suites, temps, espace, corps humain, oui/non/pourquoi/comment, politesse, nature, pharmacopée, agriculture, environnement, valeurs par proverbes, contes, expressions. Seule la politesse existe.
C. Leçon : pas d'étape « cours » (son + élément montré avant les contrôles) ; pas de carte proverbe ni culture ; pas d'explication de grammaire ; contrôle 3 sans image et sans envoi au corpus (consentement) ; contrôle 6 limité à un trou.
D. Révision : erreurs non gardées, pas de « revoir mes erreurs », pas de répétition espacée ; « Mes mots » n'existe que dans la bibliothèque.
E. Dialecte et source : colonnes présentes mais non affichées pendant la leçon ; pas de choix de variante.
F. Structure : pas de niveau cours → modules, pas de devoir, pas de catalogue/recherche, pas de « mes certificats », certificat sans numéro ni téléchargement, pas de test de niveau, cycles 5-6 absents, parcours non proposé selon l'âge du profil.
G. Incohérences : assistant « Kak'Igonjo » dans le code, « Ozangué » dans les maquettes (écran `Ozangue`, `demanderOzangue`) ; `COLONNES.md` obsolète (ignore `trou` et `saisie`).
H. Technique : vidéo par segments et DRM partiels ; cours à distance sans média ; jamais testé sur appareil (T1).
I. Accessibilité : pas de sous-titres dans les leçons, rien de spécifique pour les malvoyants.

## 4. Décisions à prendre
1. Harmoniser 4 étapes / 6 cycles / 8 classes d'âge ; cible d'âge (3 ans ou 7 ans).
2. Cœurs dans les cours ou seulement dans Azeva.
3. Nom : mascotte Ozangué et assistant Kak'Igonjo, ou un seul nom.
4. Limites de l'IA pour les enfants ; validation des contenus (validateurs, IPN).

## 5. Ordre proposé
1) Décisions §4. 2) Modèle de leçon complet (étape cours, proverbe, culture, dialecte/source affichés). 3) Révision des erreurs + « Mes mots » nourri par les leçons. 4) Unité Ntina complète avec audios enregistrés. 5) Tuteur IA dans la leçon. 6) Cycles adultes et test de niveau.

---

# Mise à jour du 13 nov. 2026 — décisions de Capp et audit complété

## 6. Décisions de Capp (13 nov.)
- Les 4 étapes (Ntina, Ogèndo, Emeno, Ikôkô) restent telles quelles ; les 8 classes d'âge restent les rangs.
- Les cœurs sont pour les jeux seulement. **Tous les jeux sont gratuits ; seuls les cours sont payants.**
- **La mascotte est Kak'Igonjo** (plus Ozangué), partout.
- **Test de niveau obligatoire** avant de commencer les cours.
- L'espace Apprendre est réorganisé en **3 onglets placés en haut, juste sous la recherche** :
  - **Inenga** : les cours par étapes + les cours à distance (4 personnes au plus) ;
  - **Igolani** : la vidéothèque (tous les cours vidéo ; les artisans ne sont qu'une catégorie) ;
  - **Izango** : la bibliothèque.

## 7. Fait le 13 nov. : Kak'Igonjo partout (code, non commité, non déployé)
- `src/KakIgonjo.tsx` (nouveau) : dessin du vieux sage, sorti d'`Assistant.tsx`.
- `kit.tsx` : `Mascotte` dessine désormais Kak'Igonjo (13 écrans : leçons, fins, états vides, connexion…) ; l'humeur règle mouvement et opacité.
- Textes et noms : `demanderOzangue` → `demanderKakIgonjo` (noyau, Onenji, Bibliothèque), écran `kakigonjo`, « Kak'Igonjo va dormir » (fin du temps enfant), commentaires, exemple `messages.json`, schéma `messages` (type `kakigonjo` ; `ozangue` gardé seulement pour les lignes déjà importées), `COLONNES.md`, démo radio et nom du pod simulé côté serveur.
- Vérifié : `tsc` de l'app sans erreur. Restent hors code : maquettes du 10 nov., `NKALA_BRIEF_DESIGN_MOBILE.md` §10 et la mémoire du projet, qui disent encore « Ozangué ».

## 8. Propositions de la première analyse, oubliées dans la deuxième (rien de cela n'existe dans le code)
1. Étapes de leçon manquantes du programme (unité en 9 étapes : écouter, voir, dire, écrire, comprendre, proverbe, culture, jouer, vérifier) : **écrire / dictée**, **comprendre** (petit dialogue ou texte), **proverbe**, **culture**, et **jouer** = lien vers un jeu gratuit d'Azeva sur les mots de l'unité.
2. **Fiches de grammaire** (conjugaisons, classes nominales, d'après Teisserès-Dubois et Ambouroue) et **carnet de mots / lexique** dans Apprendre.
3. **Choix de la variante** (ôrungu par défaut, autres étiquetées).
4. **Note de prononciation** : pas de modèle de reconnaissance vocale ; garder la réécoute comparée et ajouter l'avis d'un locuteur (validation), le score automatique viendra plus tard.
5. **Contenu réel** : enregistrer les audios ; remplacer les cours d'artisans inventés.
6. **Accessibilité** (malvoyants, malentendants : sous-titres dans les leçons) et **téléchargement hors ligne des leçons** (seul Ontci télécharge aujourd'hui).
7. **Règles à dessiner** : consentement avant de verser sa voix au corpus ; limites de l'IA pour les enfants ; accord des détenteurs pour le savoir initiatique.
8. **Rédiger une unité complète** (Ntina · Saluer) avec ses audios pour éprouver les 9 étapes.
9. Éléments des maquettes absents du code : écoute lente 0,7×, dialecte et source affichés, conseil culturel en bulle (« c'est la personne visitée qui salue la première »), « Revoir mes erreurs », certificat numéroté et téléchargeable, carte « unité suivante ».
- Rectification : le cadenas des contenus payants existe déjà (`Verrou.tsx`, niveaux d'accès par leçon) ; il reste à décider ce qui est gratuit dans les cours.

## 9. Conséquences des décisions sur l'existant
- **Azeva** a des paliers payants (rang, formule, achat ; `server/api/src/azeva.ts`, journal du 12 nov.) et la grille tarifaire compte « 10 parties de jeu à 100 F » : à retirer pour que **tous les jeux soient gratuits**. Les jeux restent financés par la pub (récompensée au choix, 3 par jour) ?
- La règle des cœurs reste dans `noyau/azeva.ts` ; rien à retirer d'Onenji (aucun cœur dans les leçons).
- Nom proche : **Izango** (bibliothèque) et **Ezango** (écran existant de la partie contributeur, `src/Ezango.tsx`) : vérifier qu'ils ne se confondent pas dans l'app.

## 10. Nouvelle organisation proposée
En-tête « Apprendre » → recherche → onglets **Inenga · Igolani · Izango** (barre fixe, l'onglet choisi est gardé).
- **Inenga** : (1) test de niveau si jamais passé ; (2) « reprendre ma leçon » ; (3) mon étape conseillée puis les 4 étapes ; (4) révision des erreurs ; (5) cours à distance (salle de 4, code, planning).
- **Igolani** : catégories (artisans, langue, culture, histoire…), fiche à chapitres, reprise, lecteur protégé ; un cours vidéo peut être rattaché à une étape.
- **Izango** : la bibliothèque actuelle (étagères, lecteur à mots touchables, « Mes mots », quiz).
- Kak'Igonjo reste le chat flottant accessible partout (la grande carte de l'accueil disparaît).
- **Test de niveau** (proposition) : gratuit, 10 à 15 questions de difficulté croissante (écoute et choix, image et nom, phrase à remettre en ordre), arrêt après 3 erreurs de suite ; résultat = étape et unité de départ, unités antérieures marquées « acquises » mais rouvrables ; repassable une fois par mois ; mode enfant : l'âge du profil propose l'étape, le test reste court et sans lecture.

---

# Mise à jour du 13 nov. 2026 (nuit) — décisions et code

## 11. Nouvelles décisions de Capp
- Kak'Igonjo remplace Ozangué **partout**, y compris maquettes et brief design.
- Un **dictionnaire interactif**.
- **Jeux** : plus rien de payant ; on garde la publicité sponsorisée entre les écrans et les bannières.
- **Publicité coupée sur tout ou partie de l'application selon le forfait.**
- **Partie contributeur** : dans la barre du bas, avec les mêmes règles que les autres boutons ; son écran de fiches s'appelle **Ikamba** (au lieu d'Ezango).
- **Ezango** (et non Izango, qui en est le pluriel) = la bibliothèque d'Onenji.
- **Accès aux cours** : test de niveau et première unité de chaque étape gratuits ; le reste payant, ou débloqué par un forfait.
- Test de niveau : validé tel que proposé (§10).
- L'IA doit aider à suivre les cours, de façon interactive.
- **À décider** : vidéos de la vidéothèque gratuites, payantes ou au forfait.

## 12. Fait (code, non commité, non déployé ; `tsc` de l'app sans erreur ; 136 tests serveur et noyau réussis, dont 7 nouveaux `server/api/test/testNiveau.test.ts`)
- **Barre du bas** : Accueil · Apprendre · Jouer · Écouter · Village · **Contribuer** · Moi. Contribuer suit l'interrupteur `ompangano` (barre, `_layout.tsx`, redirection si coupé) ; retiré du menu « Moi ».
- **Ikamba** : libellés de la partie contributeur (`Contribuer.tsx`) ; identifiants internes `ezango` inchangés.
- **Apprendre** (`Onenji.tsx`) : en-tête avec recherche, puis onglets **Inenga · Igolani · Ezango** (le dernier choisi est gardé).
  - *Inenga* : carte « test de niveau » tant qu'il n'est pas passé, reprise, étapes avec « Ton point de départ », **Revoir mes erreurs**, repasser le test (1 fois par mois), cours à distance à 4.
  - *Igolani* : vidéothèque par catégorie (colonne `categorie` ajoutée à `cours_artisans` ; « Artisans » par défaut quand un artisan est indiqué).
  - *Ezango* : la bibliothèque + **Dictionnaire** (myènè ⇄ français sur le catalogue local, écoute, « Mes mots », explication par Kak'Igonjo).
- **Test de niveau** (`noyau/lecons.ts` : `composerTestNiveau`, `testTermine`, `placementTest`, `etapeParAge` ; écran `TestNiveau`) : obligatoire avant la première leçon ; 3 questions notées par étape, 15 au plus, arrêt à 3 erreurs de suite ; enfant : étape selon l'âge. Résultat gardé sur l'appareil (`OnenjiEtat.ts`).
- **Accès des leçons** (`accesLecon`) : `niveau_acces` de la leçon s'il est rempli ; sinon 1re unité de chaque étape libre, le reste `abonnement` ; une formule citée dans `plans` ouvre aussi. Pastilles « Départ » et « Forfait » sur le parcours.
- **Kak'Igonjo dans les cours** (`KakIgonjoCours.tsx`) : bouton « Aide » sur chaque exercice (il met sur la voie sans donner la réponse) ; après une erreur, « Kak'Igonjo t'explique pourquoi ? » ; en fin de leçon, « Pratiquer avec Kak'Igonjo » (petite scène au village avec les mots de la leçon, 3 échanges). Pas d'IA en mode enfant.
- **Révision** : chaque mauvaise réponse ajoute l'exercice à revoir, une bonne réponse l'efface.
- **Jeux gratuits** (`noyau/difficulte.ts`, `JEUX_GRATUITS = true`) : formules et achats des jeux et paliers ignorés, seuls rang et progression comptent ; boutons « Voir les formules » retirés d'Azeva. Nouvelles zones `bandeau_jeux` (salle de jeux) et `interstitiel_jeux` (`PubEntreEcrans` en fin de partie : au plus toutes les 3 parties et 3 minutes, fermeture après 5 s).
- **Publicité selon le forfait** : colonne `sans_pub` des formules = « tout » ou liste de modules ; `modulesSansPub` + `zoneAffichable` ; un ancien abonnement sans formule garde « aucune publicité ».
- Kak'Igonjo : `NKALA_BRIEF_DESIGN_MOBILE.md` §10, `NKALA_PLAN_DEVELOPPEMENT.md`, `SERVICES_A_CONNECTER.md` ; `messages.json` (exemples et noyau). `contenu/` régénéré (`generer_contenus.ts`).

## 13. Reste
- **Maquettes du 10 nov.** : remplacer la mascotte (dessin et nom) sur les planches de l'artefact « Nkala · Toutes les vues ».
- Vérifier sur téléphone ; déployer le serveur (jeux gratuits côté API) après accord.
- Dictionnaire : n'afficher que les fiches validées quand le statut existera ; aujourd'hui il dépend du catalogue téléchargé par Contribuer.
- Décision : accès aux vidéos d'Igolani.

## 14. Décision du 13 nov. 2026 (0 h 53) : accès aux vidéos d'Igolani
Validée par Capp : réglage vidéo par vidéo (colonne `niveau_acces`). Règle par défaut :
- **premier chapitre gratuit avec publicité** ;
- **la suite au forfait** (une formule citée dans `plans` l'ouvre) ;
- **cours d'artisans longs à l'achat**.

## 15. Note de méthode (Capp, 13 nov. 2026)
Capp n'avait pas demandé de coder : les décisions doivent être consignées dans les fichiers, et c'est Claude Code qui exécute, pour éviter les incohérences. Le code écrit dans la nuit du 13 nov. (§12) n'est ni commité ni déployé ; son sort (garder comme base ou annuler) est à décider par Capp avant toute exécution.

## 16. Décision du 13 nov. 2026 (0 h 56) : sort du code de la nuit
Capp garde les fichiers modifiés (§12) tels quels ; ils seront vérifiés plus tard par Claude Code, en les comparant aux décisions §6 à §14, avant tout commit ou déploiement.

## 17. Décisions du 14 nov. 2026 et partie des cours codée
- **Fait (code)** : unité en 9 étapes (types cours, dictee, comprendre, proverbe, culture, jouer ; colonnes texte, conseil, jeu_id), dialecte et source affichés, écoute lente 0,7×, variante (ôrungu par défaut), Mes mots nourri par les leçons, unité suivante, fiches de grammaire (collection `grammaire`), hors ligne par unité, certificats numérotés et vérifiables, règle d'accès des vidéos (§14), cours à distance avec caméra et micro (WebRTC, maillage de 4) et **planning des cours** (code d'inscription, salle ouverte 15 min avant, 4 inscrits au plus).
- **Décisions de Capp (14 nov.)** :
  - **Vidéos d'Igolani : compte obligatoire.** L'adresse de la vidéo ne sort plus de la lecture publique ; elle arrive avec la licence (partie gratuite limitée par le serveur, `limiteS`).
  - **Exercices des leçons payantes : servis après droit.** Collection `exercices` privée ; `/pub/onenji/exercices` (sans compte : leçons gratuites) et `/v1/onenji/exercices` (avec compte : aussi celles du forfait ou achetées ; le personnel reçoit tout).
  - **Serveur déployé** le 14 nov. (≈ 2 h) ; **build natif** laissé à Capp.
- **Reste** : publier la mise à jour JavaScript (les versions actuelles lisent encore `/pub/contenus/exercices`, désormais refusé : elles retombent sur les exercices d'exemple livrés avec l'app) ; nouveau build natif pour la caméra et le micro ; zone Revive `video_igolani` ; essai d'un vrai appel à plusieurs sur appareils.
