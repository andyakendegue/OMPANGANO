# Audit technique et linguistique — OMPANGANO

30 octobre 2026 · code lu : `src/` (21 500 lignes), règles Firebase, `server.ts`, `vite.config.ts`, `sw.js`.

**Verdict.** Le code compile proprement (`tsc --strict` sans erreur, build Vite OK). Mais la sécurité et l'intégrité des données posent des problèmes graves, à corriger avant d'ouvrir l'app aux contributeurs de l'association. Côté langue, les 10 phrases de départ et les fiches des clans ont été inventées par l'IA. Plusieurs mots n'existent pas, et d'autres sont faux (*nkala* traduit par « crabe »).

---

## 1. Sécurité — CRITIQUE

| # | Problème | Où |
|---|---|---|
| 1.1 | **Toute personne connectée peut lire, modifier et supprimer toutes les données** (profils, contributions, items, badges…). La connexion anonyme est tentée automatiquement : n'importe qui sur Internet peut donc tout effacer. | `firestore.rules`, `database.rules.json`, `ensureFirebaseAuthSession()` |
| 1.2 | **N'importe qui peut devenir admin.** `isAdmin()` lit `users/{uid}.role`, et chaque utilisateur peut écrire ce champ lui-même. Dans la RTDB, le nœud `admins` est modifiable par tout connecté. | `firestore.rules`, `database.rules.json` |
| 1.3 | **Toute adresse e-mail qui contient « admin » donne les droits admin** (`badminton@gmail.com`, `admin.test@…`). | `checkIsAdminEmail()` (`firebase.ts`) ; création de profil dans `App.tsx` (2 endroits : `.includes('admin')`) |
| 1.4 | **Rôle et statut décidés par le navigateur.** Le profil en `localStorage` est restauré même sans session Firebase. À la fusion local/cloud, le rôle et le statut du cache local l'emportent s'il est plus récent. Un admin rétrogradé ou un compte suspendu peut donc se réactiver tout seul. | `mergeLocalAndCloudUserProfile()`, `onAuthStateChanged` (`App.tsx`) |
| 1.5 | **Données personnelles exposées.** Toute la collection `users` est lisible par tout connecté et téléchargée en entier : date et lieu de naissance, contact, clans, signature électronique, tuteur légal. Un profil fictif « Andy AKENDENGUE » est aussi codé en dur dans le bundle JS public, avec une date et un lieu de naissance. À revoir au regard de la loi gabonaise n° 001/2011 (que la charte cite elle-même). | `smartFetchCollection('users')`, `useState<UserProfile[]>` initial (`App.tsx`) |

**Esquisse de règles Firestore** (à adapter ; elle suppose que les XP soient calculés côté serveur, voir 3.3) :

```
function signedIn()  { return request.auth != null
                        && request.auth.token.firebase.sign_in_provider != 'anonymous'; }
function isAdmin()   { return signedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid)); }
function isStaff()   { return isAdmin() || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'validator'; }

match /users/{uid} {
  allow read:   if signedIn() && (request.auth.uid == uid || isStaff());
  allow create: if signedIn() && request.auth.uid == uid && request.resource.data.role == 'user';
  allow update: if isAdmin() || (signedIn() && request.auth.uid == uid
                 && !request.resource.data.diff(resource.data).affectedKeys()
                     .hasAny(['role','status','xp','badges','level','levelIndex','suspicionScore']));
}
match /admins/{id}        { allow read: if signedIn(); allow write: if false; } // géré à la main dans la console
match /items/{id}         { allow read: if signedIn(); allow write: if isAdmin(); }
match /contributions/{id} { allow read: if signedIn();
                            allow create: if signedIn() && request.resource.data.userId == request.auth.uid
                                          && request.resource.data.status == 'pending';
                            allow update: if isStaff() && resource.data.userId != request.auth.uid;
                            allow delete: if isAdmin(); }
// clans, villages, themes, badges, challenges, metrics : lecture signedIn(), écriture isAdmin()
```

Il faut faire de même pour la RTDB, ou cesser de la lire en entier côté client.

---

## 2. Intégrité des données — CRITIQUE

**2.1 La RTDB écrase au lieu de fusionner.** `dualSaveRecord()` fait `setDoc(..., {merge:true})` sur Firestore mais `rtdbSet()` sur la RTDB. Toute mise à jour partielle efface donc le reste de l'enregistrement dans la RTDB. Exemples : changement de rôle `{role, updatedAt}`, statut `{status}`, `ensureAdminRoleForUser()`, rejeu de la file hors-ligne. Or le profil est lu **d'abord** dans la RTDB (`smartGetUserProfile`). L'utilisateur se retrouve avec un profil vide, et l'inscription lui est redemandée.
→ Remplacer `rtdbSet` par `rtdbUpdate` dans `dualSaveRecord` et `replayPendingOfflineAdminMutations`.

**2.2 La validation peut effacer la contribution.** Dans `handleValidateContribution` et `handleValidateGranular`, `targetUpdatedContrib` est rempli *à l'intérieur* de l'updater `setContributions(prev => …)`. React n'exécute pas forcément cet updater tout de suite, donc la variable est souvent `null`. On envoie alors seulement les champs de validation, et avec le bug 2.1 la RTDB perd le texte et l'audio de la contribution. `handleUpdateUserLevelAndBadges` (`updatedTargetUser`) suit le même schéma.
→ Calculer l'objet mis à jour depuis l'état courant *avant* d'appeler `setState`.

**2.3 L'audio est stocké en base64 dans les documents.** Si l'envoi vers Storage échoue, l'audio part en base64 dans Firestore (limite de 1 Mio par document) et dans la RTDB. Aucune règle Storage n'est déclarée dans `firebase.json`. Chaque utilisateur télécharge ensuite **toutes** les contributions avec leurs audios (lecture RTDB complète) : c'est lent et coûteux, et ça ne tiendra pas à 10 000 enregistrements.

**2.4 La synchronisation incrémentale est incomplète.** Le filtre `where('updatedAt', '>', …)` ne voit pas les contributions, qui n'ont pas de champ `updatedAt` (sur les items, il est optionnel). Les suppressions ne sont jamais propagées, et l'heure vient du client. Enfin, si le cache local contient plus de 20 éléments, le chargement complet est sauté : l'app passe directement au delta, et ce qui n'a pas d'`updatedAt` n'est jamais récupéré.

---

## 3. Bugs fonctionnels

| # | Bug | Où |
|---|---|---|
| 3.1 | **La durée audio vaut toujours 3 s.** `recorder.onstop` lit `recordingDuration` dans une closure figée à 0, puis `audioDuration \|\| 3`. | `AudioRecorder.tsx` |
| 3.2 | **Mauvais format audio sur iPhone.** Le Blob est toujours étiqueté `audio/webm` et le fichier nommé `.webm`, même quand Safari enregistre en mp4. Résultat : lecture impossible sur iOS et métadonnées fausses pour l'entraînement. → Utiliser `recorder.mimeType`. Autre point : `noiseSuppression`, `echoCancellation` et `autoGainControl` altèrent la voix brute, ce qui n'est pas souhaitable pour un corpus d'IA. | `AudioRecorder.tsx`, `App.tsx` (chemins `recordings/…webm`) |
| 3.3 | **XP non fiables.** Les XP sont donnés dès la soumission, avant validation, et ne sont jamais retirés en cas de rejet. `Math.max(local, cloud)` empêche toute correction par l'admin, et les XP sont modifiables via `localStorage`. Si les points servent au partage de revenus (charte « Points & Récompenses »), c'est une porte ouverte à la fraude. → Attribuer les XP **à la validation**, côté serveur (Cloud Function). | `CrowdsourceCard.handleSubmit`, `handleRewardEarned`, `mergeLocalAndCloudUserProfile` |
| 3.4 | **Badges incohérents.** « Passeur de 10 Mots » est donné dès la 1re contribution texte, et « Première Voix » dès l'inscription, sans aucun enregistrement. | `CrowdsourceCard.tsx`, profil initial (`App.tsx`) |
| 3.5 | **Mauvais niveau à l'inscription.** Le nouvel inscrit reçoit `xp: 150` avec le niveau 1 « Initié Curieux », alors que 150 XP correspondent au niveau 2. | profil initial (`App.tsx`) |
| 3.6 | **Défis hebdomadaires.** Les dates de début et de fin sont ignorées, et la même phrase soumise plusieurs fois compte à chaque fois. | `handleSubmitContribution` |
| 3.7 | **Le retrait du consentement est impossible.** `termsAccepted` et `dataUsageAccepted` sont fusionnés par un OU logique, donc un retrait n'est jamais enregistré (problème juridique). | `mergeLocalAndCloudUserProfile` |
| 3.8 | Un validateur peut valider ses propres contributions. | `ValidatorWorkspace.tsx` |
| 3.9 | **Connexion par e-mail.** Avec un mauvais mot de passe, l'app tente de créer un compte et affiche « e-mail déjà utilisé ». Avec une faute de frappe dans l'e-mail, elle crée un nouveau compte sans prévenir. | `signInOrRegisterWithEmail()` |
| 3.10 | `testFirestoreConnection()` renvoie toujours `true`. | `firebase.ts` |

---

## 4. Qualité et maintenance

- `App.tsx` fait 2 900 lignes et `AdminDashboard.tsx` 2 200 : à découper (hooks `useAuth`, `useContributions`, etc.).
- Le code contient 76 variables ou imports inutilisés. Les dépendances `@google/genai`, `dotenv` et `motion` ne servent à rien (restes d'AI Studio, comme `.env.example` avec `GEMINI_API_KEY` et le nom de paquet `react-example`).
- Le bundle est unique : 2,1 Mo (605 Ko gzip). Le code admin est chargé pour tout le monde → `React.lazy`.
- `server.ts` relance `vite build` à chaque démarrage, et `npm run dev` n'a pas de rechargement à chaud.
- Le code contient 23 `alert()` / `confirm()`.
- **Restes de l'ancien projet « enenga »** : IDs `nkala-enenga-…`, base IndexedDB `nkala_enenga_offline_db`. Surtout, **tout nouvel inscrit a la tribu Enenga par défaut**, et les contributions synchronisées prennent la variante `enenga` par défaut.
- **Noms incohérents** : « OMPAGANO » apparaît 135 fois, « OMPANGANO » 9 fois et « AMPANGANO » une fois (contrat). L'en-tête et l'écran de connexion affichent « NKALA APP », alors que NKALA est l'application commerciale. On trouve aussi Galoa/galwa et Adyumba/Ajumba.
- Le nom « Andy AKENDENGUE » est codé en dur (validateur par défaut, profil fictif), alors que le contrat écrit AKENDEGUE.

---

## 5. Langue — termes non myènè

Vérifiés contre le corpus DONDO : Leçons omyènè (Hombouhiry), dictionnaire de Raponda-Walker (RW), thèse d'Ambouroué (2007).

### 5.1 Les 10 phrases de départ (`INITIAL_ENENGA_ITEMS`)

| Phrase de l'app | Problème | Ce que disent les sources |
|---|---|---|
| *Mbolo vana* — « Bonjour à tous » | *vana* introuvable | À plusieurs : **Mboloani** (RW p. 284) ; ôrungu **[mbolwanè]** (Ambouroué) |
| *Na vevi* — « Merci » | introuvable | **Akéwa** (Leçons) ; RW : *finiz'akewa*, remercier |
| *Irende si bendi go nongo y'omvwa* — pirogue | *irende*, *omvwa* introuvables | Pirogue : **owaro** (Leçons, RW) |
| *Nkala y'inongo* — « crabe royal (Nkala) » | **Faux** : la note sur le crabe est inventée | **Nkala = le village** (Leçons ; RW). Le nom de l'app NKALA veut dire « village ». |
| *Nguwu e pembi go mpyo* — hippopotame au crépuscule | *nguwu* correct ; *mpyo* = chaleur, pas crépuscule ; *pembi* introuvable | RW : *Mpyo*, chaleur |
| *Nkombi yi bendi go mpounga polo* — soleil sur la forêt | *ompunga* = vent, pas forêt | Soleil : **omwèyi** (Leçons) / *nkombe* (RW) ; forêt : **iga**, *ig'ivolo* grande forêt (RW) |
| *Oza w'omvwa go nago yâwé* — paix | seul *nago* (maison) existe | Paix : *ntche yi re duvó*, *ntche y'apóni*, « le pays est en paix » (RW) |
| *Wana wa tongi inyege yi dyosi* — poisson fumé | *inyege*, *dyosi* introuvables | Enfants : **awana** ; poisson fumé : **ewèrè ézômô** (Leçons) |
| *O noki w'abami a za dova go nongo* — « proverbe fondamental » | Proverbe inventé ; *onoki* veut même dire **menteur** (Leçons) | Vrai proverbe au même sens : **« Oghèningo a ghèndi règhô kôndènè éré dèng'oma wi tévuna yè »**, le fleuve a fait des détours faute de guide (Leçons) |
| *Ngoma yi kengi vana g'ezango* — danse rituelle | *ezango* = livre, école, loi (RW), pas danse | Tam-tam : **ngôma** ; danser : **go dyina** (Leçons) |

Les notes de contexte et les dialectes attribués (orungu, mpongwe, galoa…) sont aussi arbitraires.
→ **Archiver ces 10 items** depuis l'administration et les remplacer par des phrases tirées des Leçons. Ne pas changer leur texte en gardant le même ID : les contributions déjà liées deviendraient incohérentes.

### 5.2 Les 21 clans ôrungu (`INITIAL_CLANS`)

Les noms sont plausibles, mais **les descriptions sont inventées** : « Re-Nkombe », une lignée « matrilinéaire et patrilinéaire », les « généalogies familiales (Ompangano) ». Or *ompangano* veut dire promesse ou contrat (RW). Le corpus contient les vraies devises (*kombo*), dans *Mbuwé ni kombo géré ng'oyènè* :
- Avandji et Abulya : *« Avandji n'Abulyé, ignèmbwè imbani imo ! »*
- Anôri : cri de guerre *« Anôri ! »* (interdit de l'hippopotame)
- Ayandji : *« Omwo-Nyadji, itowa ! »*
- Agéndjé : *« Agéndjé kombarè »*

→ Remplacer par ces devises ; laisser vide quand on n'a pas de source.

### 5.3 À vérifier par toi

- `TRIBAL_DIALECT_INFO` : les souverains « Agamwinboni, Rogombé, Ndombi » et les « traits tonals » de chaque dialecte n'ont aucune source.
- Thèmes : la plupart des mots viennent des Leçons (owaro, olôwisi, ewèrè, ikôndô, kisini, epokolo, swaka, okwara, egwa, ampanga = lois). En revanche, « porcs-épics (ngomba) » devrait être **homba** (Leçons). *Ozono* (rotin), *ogulu* (gargoulette), *énambo* et *agènda* (accueil) sont introuvables.
- Le nom de l'app : **Ompangano** = « promesse, engagement, accord, contrat, vœu » (RW). Le nom convient très bien à une plateforme de contribution sous contrat, mais il s'écrit avec un **n** : « OMPAGANO » est une faute.

---

## 6. Modifications déjà faites (langue)

- **Nouveau fichier `src/services/myeneLexique.ts`** : tous les mots myènè de l'interface, chacun avec sa source. Règle : aucun mot sans source.
- Écran de succès : « Na vevi ! » → « **Akéwa ! Vabwè !** Merci pour votre contribution ! »
- Notification de contribution : « **Akéwa !** Contribution enregistrée ».
- Exemple de saisie : « Mbolo vana » → « **Mboloani** ».
- Bienvenue : « **Osale !** » (salut au visiteur, RW) dans l'inscription, le guide visuel et la notification de filiation.
- Défi réussi : « **Vabwè !** » ; consentement : « **Akéwa**, [nom] ! » ; synchro réussie : « **Mbiambié !** »
- Message d'erreur de soumission : « **Nyéza myè…** » (excuse-moi).
- « Tribu Orungu » → « Tribu **Ôrungu** » ; le profil affichait le code brut « orungu » et affiche maintenant le nom de la tribu.

`tsc` et le build passent après ces changements.

### Autres mots proposés (non appliqués, à valider)

| Endroit | Proposition | Source |
|---|---|---|
| Déconnexion | « **Ibanga wé. Ka mènè !** » (au revoir) | Leçons |
| Bouton pour inviter à contribuer | « **Yaga !** » (viens) | Leçons |
| Onglet Vocabulaire | « **Ezango** » (livre) | RW |
| Badge « Première Voix » | « **Inoï** » (voix) | RW |
| Badge « Maître du Verbe » | « **Ekafè** » (talent de bien dire) | RW |
| Badge « Oreille de l'Aîné » | « **Onèrô** » (aîné, responsable) | Leçons, RW |
| Badge de courage | « **Mbagara** » (brave) | RW |

---

## 7. Ordre de correction recommandé

1. Règles Firestore et RTDB, puis suppression de `.includes('admin')` (1.1–1.3).
2. `rtdbSet` → `rtdbUpdate`, et correction de l'updater de validation (2.1–2.2).
3. Rôle, statut et consentement décidés par le serveur, plus le profil fictif retiré du bundle (1.4, 1.5, 3.7).
4. XP attribués à la validation, côté serveur (3.3, 3.4).
5. Audio : Storage + règles, vrai type MIME, vraie durée (2.3, 3.1, 3.2).
6. Nettoyage linguistique : archivage des 10 items et des descriptions de clans inventées (section 5).

---

# Corrections appliquées (30 octobre 2026, 2ᵉ passe)

Toutes les propositions ont été validées. Elles ont été appliquées dans l'ordre de la section 7. `tsc` et le build passent. Des tests de la logique de récompense et d'import CSV ont été écrits et passent (16 sur 16).

## 1. Sécurité
- **Nouvelles règles** `firestore.rules`, `database.rules.json` et `storage.rules` :
  - les sessions anonymes sont refusées partout ;
  - le rôle, le statut, les XP, les badges et les compteurs sont protégés ;
  - les validateurs n'écrivent que les récompenses, et seuls les administrateurs gèrent le reste.
- **Admin :** seule l'adresse exacte `andymigoumbi@gmail.com` (vérifiée) est super-admin. La règle « l'adresse contient admin » est supprimée partout.
- **Profils privés :** un contributeur ne lit que son propre profil. Le classement passe par une collection publique `leaderboard`, sans date de naissance, contact ni clans. Ses chiffres sont vérifiés par les règles par rapport au profil.
- **Pas de session anonyme** créée automatiquement par l'application.

## 2. Données
- La RTDB est mise à jour par **fusion** (`update`) et non plus par écrasement (`set`).
- **Validation :** l'objet est calculé avant `setState`, puis enregistré par une **transaction Firestore** (contribution et profil du contributeur ensemble).
- **Synchronisation :** les raccourcis qui marquaient une collection comme synchronisée sans l'avoir lue sont supprimés.

## 3. Rôle, statut, consentement
- Les champs protégés viennent **toujours** du cloud, jamais du cache local. Le profil local n'est restauré qu'hors-ligne.
- Le **consentement** suit la version la plus récente : un retrait est donc pris en compte.
- Le profil fictif « Andy AKENDENGUE » (date et lieu de naissance) est retiré du code.
- Un compte **suspendu** ne peut plus contribuer.

## 4. Points et badges
- Les XP, badges, compteurs et défis sont attribués **à la validation**, une seule fois par contribution. Si la contribution est ensuite refusée ou supprimée, ses points sont retirés.
- Les défis respectent leurs dates de début et de fin. **Attention :** les défis de départ ont expiré le 26 octobre ; il faut les réactiver avec de nouvelles dates depuis l'administration.
- Un nouvel inscrit commence à 0 XP, sans badge. « Passeur de 10 Mots » demande désormais vraiment 10 contributions validées.
- Un validateur ne voit pas ses propres contributions et ne peut pas les valider.

## 5. Audio
- Les enregistrements sont envoyés dans Storage (`recordings/{uid}/…`), jamais en base64 dans la base. Si l'envoi échoue, l'enregistrement reste sur l'appareil et part plus tard.
- Le **vrai format** est utilisé (mp4 sur iPhone) avec la **vraie durée**, limitée à 60 s.
- La voix est enregistrée **brute** (sans filtre de bruit ni de gain).
- Le visualiseur de l'enregistrement s'anime de nouveau (il restait figé).

## 6. Langue
- **Les 10 phrases de départ sont remplacées :**

  | Phrase myènè | Traduction | Source |
  |---|---|---|
  | Mbôluani | Bonjour à tous | Validée |
  | Akéwa | Merci | Validée |
  | Owaro-mfélo, ré nyènyo ngôri. | Dans la pirogue d'autrui, ne prends pas tes aises | Leçons |
  | Nkala y'inongo | La maison du peuple | Validée |
  | Nyam'okwéndé ré nôg'ogoni. | L'animal qui a une queue ne traverse pas le feu | Leçons |
  | Owendja wa jédji, gnino mbé ya simbi. | Le jour s'est levé, le cauchemar s'est arrêté | Leçons |
  | Mbuwé a zé n'igholo. | Le clan n'a pas de prix | Leçons |
  | Ewèrè ézômô | Le poisson fumé | Leçons |
  | Oghèningo a ghèndi règhô kôndènè éré dèng'oma wi tévuna yè | Le fleuve a fait des détours faute de guide | Leçons |
  | Yaga go dyina ! | Viens danser ! | Leçons |

  La base est corrigée automatiquement à la prochaine connexion d'un administrateur. Les faux compteurs (« 14 contributions ») sont remis à 0.
- **Clans :** seules les devises du corpus sont gardées (Abulya, Avanji, Anori, Ayanji, Agenje). Toutes les autres descriptions sont vidées. La base est mise à jour à la connexion d'un admin.
- **Interface :**
  - « Akéwa Mpolo ! Merci pour votre contribution ! » ;
  - « Salé ! » pour la bienvenue ;
  - « Mbiambié ! » pour les réussites ;
  - « Nyéza myè… » pour les erreurs ;
  - « Ibanga wé. Ka mènè ! » à la déconnexion ;
  - « Yaga ! » pour inviter à contribuer ;
  - l'onglet « Ezango » remplace « Vocabulaire ».
- **Badges :**
  - Inioï · Première Voix ;
  - Ekafè · Maître du Verbe ;
  - Onèrô · Oreille de l'Aîné ;
  - Mbagara · Pisteur de la Savane (aucun badge n'était lié au courage ; celui-ci était le plus proche).
- **Autres corrections de langue :**
  - la FAQ donnait « Mbemba / Ikaka » pour le clan ; elle dit maintenant « mbuwé », et « ozombi » pour le lignage ;
  - les exemples de clans fictifs sont remplacés ;
  - le modèle CSV ne contient plus de phrases ni de transcriptions inventées.
- **Nom :** « OMPAGANO » devient **OMPANGANO** dans tout le texte visible. Les clés techniques internes (caches, stockage local) sont gardées pour ne pas effacer les données des utilisateurs. « NKALA APP » est retiré de l'interface de collecte.
- **Ôrungu :** tous les codes bruts « orungu » affichés sont remplacés par le nom de la tribu, Ôrungu.

## Ajouts demandés
- **Suppression de contributions :**
  - le contributeur supprime ses contributions **en attente** depuis « Mon profil » (nouvelle liste « Mes contributions ») ;
  - l'administrateur supprime une réponse, ou **toutes les réponses affichées** selon les filtres (double confirmation) ;
  - l'audio est supprimé de Storage, et les points éventuels sont retirés.
- **Import CSV avec numérotation :**
  - une phrase dont le numéro (colonne ID, ex. `ORU_0001`) existe déjà est **mise à jour** si son texte a changé, et ignorée sinon ;
  - les contributions déjà liées restent attachées ;
  - l'écran d'import affiche « Nouvelles », « Mises à jour (même n°) » et « Déjà en base, inchangées ».

## Autres corrections
- **Connexion par e-mail :** il faut cocher « Je crée un nouveau compte ». Un mauvais mot de passe ou une faute de frappe ne crée plus de compte, et les messages d'erreur sont clairs.
- **Démarrage :** l'espace validateur et l'administration sont chargés à la demande.
- **Dépendances :** `@google/genai`, `dotenv` et `motion` sont supprimées.

## À faire avant la mise en ligne
1. `npm install`, car `package.json` a changé.
2. **Base Realtime partagée avec enenga :** vérifier dans la console Firebase qu'aucun autre nœud qu'`auteurs`, `categories_livres`, `livres`, `mapPoints` et `announcements` n'est utilisé par enenga. Sinon, l'ajouter dans `database.rules.json` : tout nœud non listé est désormais fermé.
3. **Tester les règles sur le Mac :**
   ```
   npm i -g firebase-tools
   npm run test:rules
   ```
   Je n'ai pas pu lancer l'émulateur ici : son téléchargement est bloqué par le réseau.
4. **Déployer :**
   ```
   npm run deploy:rules
   npm run deploy:hosting
   ```
5. Se connecter une fois en admin pour appliquer automatiquement les corrections de phrases, de clans et de badges en base, et reconstruire le classement (bouton de synchronisation cloud).
6. Donner de nouvelles dates aux défis hebdomadaires.
