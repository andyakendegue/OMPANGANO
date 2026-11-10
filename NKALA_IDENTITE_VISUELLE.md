# Nkala : cahier de conception du logo, de l'identité et de la charte graphiques

2 novembre 2026 · pour Capp (Essaka Engineering) et pour tout designer qui reprendra le travail.

Ce document est un **cahier des charges** : il dit ce qu'il faut concevoir, pourquoi, et avec quelles contraintes. Il ne remplace pas la conception (le dessin du logo reste à faire). Il part de ce qui existe dans le dépôt et des fonctions et objectifs décrits dans `NKALA_AUDIT_COMPLET.md`, `NKALA_PLAN_DEVELOPPEMENT.md`, `NKALA_EXPO.md` et `README.md`.

**Ce qui vient du dépôt est cité avec son fichier. Ce qui est une proposition de ma part est marqué « Proposition ». Ce qui reste à décider est marqué « À décider ».**

---

## 1. Le projet en dix lignes

- **Mission** : préserver, transmettre et faire vivre la langue et la culture myènè du Gabon (Ôrungu, Mpongwè, Galwa, Nkomi, Enenga, Adyumba). Ompangano = « Transmettre la parole » (`README.md`).
- **Nkala** est la **super application** (Expo : iOS, Android, web) qui réunit quatre modules, dans l'ordre fixé par Capp : **Onenji, Azeva, Ontci, Nkala** (`NKALA_PLAN_DEVELOPPEMENT.md`).

| Module | Fonction | Ce que l'identité doit faire sentir |
|---|---|---|
| **Ompangano** (contribuer) | Enregistrer sa voix, valider, classement, badges, hors-ligne | La parole, la participation, la communauté |
| **Onenji** | Apprendre : cours par assistant IA, cours d'artisans en vidéo, MOOC | La transmission, l'apprentissage |
| **Azeva** | Salle de jeux (avec paris, derrière un interrupteur de conformité) | Le jeu, la vivacité, sans glisser vers le casino |
| **Ontci** | Écoute : lecteur façon Spotify, radio, TV | Le son, le flux |
| **Nkala** | Super app citoyenne : carte, annonces, services, magazine, Commune+, voyages | La vie quotidienne, la confiance |

- **Publics** : contributeurs et validateurs (locuteurs), apprenants (enfants dès 3 ans jusqu'aux adultes, cf. `09_documents_pedagogiques/02_programme_formation/`), citoyens et commerçants, anciens et chefferies (dont l'accord compte), diaspora.
- **Contraintes d'usage** : mobile d'abord, souvent hors ligne, parfois en plein soleil, connexions lentes ; **écrire correctement le myènè** (ô, è, ɛ, ɔ, ṉ, ṽ, voir `_contexte/REGLES_ENCODAGE.md`).

---

## 2. L'existant visuel (audit)

### 2.1 Ce qui est en place

| Élément | Où | Contenu |
|---|---|---|
| **Logo « arbre et ondes »** | `apps/nkala/assets/logo.png` (511×512, fond transparent) | Cercle : arbre dont les branches portent des nœuds (réseau), de part et d'autre des ondes sonores ; racines en bas ; couronne de motifs géométriques en triangles. Couleurs approchées (relevé à l'œil, à mesurer sur le fichier) : indigo nuit, orange brique, bleu-vert, ocre |
| **Icône « OM »** | `public/icon.svg`, PWA (`pwa-*.png`, `apple-touch-icon.png`) | Carré arrondi brun très sombre `#1C120C`, disque dégradé `#E67E22` → `#B84A28`, lettres « OM » en Outfit 900 |
| **Palette de l'interface** | `apps/nkala/src/theme.ts`, `src/index.css` | Thème sombre chaud : fond `#170D08`, carte `#27150C`, bord `#4A2412`, terre `#C85A32`, ambre `#F59E0B`, texte `#FED7AA`, discret `#A8826D` ; blanc chaud `#FDFAF7` ; barre du navigateur `#B84A28` (`index.html`) |
| **Typographies** | `index.html`, `src/index.css` | **Outfit** (titres), **Plus Jakarta Sans** (texte), via Google Fonts |
| **Motif** | `src/index.css` (`.african-pattern-bg`, `.kente-border`) ; `apps/nkala/src/Fond.tsx` | Fond à points, bordure en dégradé « kente » |
| **Signaux d'état** | code des composants | Vert `#22C55E`, rouge `#EF4444`, teal `#0D9488` |
| **Identité du studio** | `_contexte/md_vers_docx_essaka.py` | Essaka Engineering : bleu `#05A6D0`, orange `#FD7B1D`, Calibri (documents) |
| **Série vidéo** | `11_histoire_cotes_myene/06_wulinya_mye/` | Charte à part : blanc kaolin `#F2ECE1`, noir charbon `#1C1917`, rouge padouk `#9E2B25` (70/25/5), Noto Serif et Noto Sans, logo « la veillée » |

### 2.2 Ce qui ne va pas (à corriger par la conception)

1. **Deux logos qui ne se parlent pas** : le disque « OM » (rond orange, lettres) et l'arbre aux ondes (polychrome, très détaillé). Aucun des deux ne dit « Nkala », le nom de la super app.
2. **Le nom a changé, l'image non** : le web s'appelle encore « Nkala - Crowdsourcing Linguistique Myènè » (`metadata.json`), l'icône dit « OM », le module de collecte s'appelle Ompangano, la super app Nkala. Les quatre modules n'ont aucun signe propre.
3. **Le logo arbre est trop complexe et trop illustratif** : branches fines, nœuds, ondes, couronne de motifs. Il ne tiendra pas à 32 px (favicon, notification), ni en une couleur (tampon, broderie, fax, gravure). Capp le juge de plus non représentatif : il est remplacé (§2.3).
4. **Une seule ambiance** : tout est sombre. Pas de version claire de l'interface, difficile en plein soleil.
5. **Contrastes à surveiller** (calculés, norme WCAG 2.1 : 4,5 pour 1 pour le texte courant) :

| Texte sur fond | Rapport | Verdict |
|---|---|---|
| `#FED7AA` sur `#170D08` | 14,1 | Très bon |
| `#F59E0B` sur `#170D08` | 8,9 | Bon |
| `#A8826D` sur `#170D08` | 5,5 | Correct |
| `#A8826D` sur `#27150C` (carte) | 5,1 | Correct |
| `#C85A32` sur `#170D08` | 4,5 | Limite : réserver aux gros textes et aux aplats |
| `#C85A32` sur `#27150C` (carte) | 4,1 | **Insuffisant** pour du texte |
| `#FDFAF7` sur `#C85A32` (bouton terre) | 4,1 | **Insuffisant** pour du texte courant : foncer le bouton (`#B84A28` donne 5,0) |
| `#FDFAF7` sur `#B84A28` | 5,0 | Bon |

6. **Polices non vérifiées pour le myènè** : on ne sait pas si Outfit et Plus Jakarta Sans dessinent tous les signes (ɛ, ɔ, ṉ, ṽ, ô, è en capitales). À tester avant de les figer ; sinon prévoir Noto Sans en secours (déjà utilisée par la série Wulinya myè).
7. **Couleurs de la série Wulinya myè** : la série a choisi explicitement d'abandonner le vert, le jaune et le bleu (couleurs du drapeau de 1959). L'application, elle, utilise de l'ambre (jaune) et du vert pour les états. Ce n'est pas une faute (la série est une œuvre à part), mais c'est une **décision de cohérence à prendre** (voir §3.3).

### 2.3 Ce qui est à conserver, et ce qui est abandonné

**Décision de Capp (2 nov. 2026) : le logo actuel (arbre et ondes, icône « OM ») n'est pas représentatif. On part sur une nouvelle vision, plus moderne, plus abstraite, plus design.** Les deux logos existants sont donc **abandonnés comme point de départ** : on ne les simplifie pas, on ne les redessine pas.

À conserver seulement, parce que c'est dans tout le code et que ça ne dépend pas du logo :
- La **chaleur** terre et ambre de l'interface (reconnaissable, déjà en place).
- Les **idées fonctionnelles** que l'identité doit encore porter : la parole qui se transmet, l'enracinement, le lien entre générations.

---

## 3. Plateforme de marque (le fond, avant le dessin)

### 3.1 Raison d'être (Proposition)
Être **chez soi** (Nkala : la maison, le village) : donner à chaque Gabonais, et à la diaspora, un lieu où la langue et la culture myènè se parlent, s'apprennent, s'écoutent et se transmettent.

### 3.2 Valeurs et personnalité (Proposition, à partir des fonctions)
| Valeur | Se voit par | Contre-exemple à éviter |
|---|---|---|
| **Transmission** | Gestes de passage (de main en main, d'ancien à enfant), formes qui se répondent | Style « musée », vitrine figée |
| **Respect** | Accents toujours écrits, sobriété, lisibilité, mention des sources | Folklore décoratif, masques et clichés « africains » génériques |
| **Chaleur** | Couleurs terre, courbes, humanité des illustrations | Froideur « fintech » bleu et blanc |
| **Confiance** | Contrastes nets, hiérarchie claire, vocabulaire simple (Commune+, services, paris encadrés) | Néons, promesses de gains |
| **Communauté** | Classements, badges, groupes de 4 en cours direct | Compétition agressive |

**Ton de voix** : chaleureux, simple, respectueux, en français avec le myènè mis en valeur (jamais traduit de travers, jamais « simplifié » en perdant ses accents). Se tutoie-t-on ? **À décider** : vouvoiement pour les services citoyens, tutoiement pour Azeva et les enfants.

### 3.3 Décisions de fond à prendre avant de dessiner (À décider)
1. **Le nom de la marque principale** : « Nkala » pour la super app (choix déjà actif). **Sens donné par Capp (2 nov. 2026) : la maison, le village, chez soi.** Ce sens devient le cœur de l'identité (voir §3.4). Le mot a ce sens dans tous les dialectes myènè : il est commun aux six peuples, ce qui fait de lui un nom de marque qui les réunit sans en privilégier un.
2. **Quel statut pour « Ompangano »** : nom du module de collecte (proposé), ou nom de la plateforme culturelle de tête ? Le journal indique qu'Ompangano « devient Nkala en absorbant » ; le module de contribution garde son nom d'usage.
3. **Faut-il garder des couleurs de l'État** : voir 2.2 point 7. Proposition : la marque ne reprend **pas** vert-jaune-bleu en couleurs de base ; le vert et le rouge ne servent qu'aux **états fonctionnels** (succès, erreur), jamais comme identité.
4. **La marque d'Essaka Engineering** : présente en signature discrète (« une réalisation Essaka Engineering ») ou absente de l'interface ? Ses couleurs (bleu et orange) ne doivent pas entrer dans la palette Nkala.
5. **Azeva et les paris** : la charte d'Azeva doit rester **sobre** (pas de signes de casino) et prête à recevoir un bandeau « jeu responsable » dès l'ouverture légale. Ceci est une contrainte de conception, pas un avis juridique (`NKALA_PLAN_DEVELOPPEMENT.md`).

### 3.4 Le concept central : « chez soi » (Proposition)

Nkala = la maison, le village, chez soi. Cela relie les cinq modules en une seule image : **l'application est la maison commune de la langue et de la culture myènè**, et chaque module en est **une pièce** ou **un lieu du village**.

| Module | Image dans la maison ou le village |
|---|---|
| Ompangano | Le seuil et la parole : on y dépose sa voix |
| Onenji | La veillée, la case des anciens : on y apprend |
| Azeva | La cour, la place où l'on joue |
| Ontci | La radio dans la maison, la voix qui vient du village |
| Nkala citoyen | Le village lui-même : voisins, services, annonces, commune |

**Promesse de marque** (à affiner) : *Ici, tu es chez toi.* La diaspora peut y retrouver « chez soi » à distance ; c'est un argument fort pour le ton (accueil, hospitalité, appartenance) et pour l'accueil à l'ouverture de l'application.

**Conséquence pour le dessin** : le logo n'a pas à dessiner une case ni un toit (trop littéral, folklorique). Il doit suggérer **l'abri, le seuil, le cercle des siens, l'ouverture qui accueille**, en forme abstraite.

---

## 4. Architecture de marque

**Proposition : une « maison de marque »**, c'est-à-dire un symbole commun et cinq déclinaisons.

```
NKALA (marque principale, super app)
 ├─ Ompangano   contribuer (voix, validation, classement)
 ├─ Onenji      apprendre (cours, assistant IA, MOOC)
 ├─ Azeva       jouer
 ├─ Ontci       écouter
 └─ Nkala citoyen (carte, annonces, services, magazine, Commune+, voyages)  → pas de sous-nom : c'est le cœur
```

Règles :
- Tous les modules partagent **le même symbole, les mêmes polices, la même grille**. Seuls changent **la couleur d'accent** et **un petit pictogramme**.
- Le logo de la super app apparaît seul sur l'écran de démarrage, l'icône de l'app, les boutiques d'applications et les réseaux sociaux.
- Les logos de module n'existent que dans l'application (en-têtes, onglets, cartes de présentation).
- **Wulinya myè** reste une **marque à part** avec sa charte (kaolin, charbon, padouk). Elle ne reprend pas le symbole de Nkala ; elle y renvoie par une mention « une série du projet DONDO ».

---

## 5. Cahier des charges du logo

### 5.1 Ce que le logo doit dire
0. **Chez soi** (Nkala : la maison, le village) : l'abri, le seuil, l'accueil. C'est le message principal.
1. **La parole qui se transmet** (voix, passage entre deux personnes).
2. **L'enracinement** (lignage, clans, généalogie), **suggéré par la structure**, sans dessiner d'arbre.
3. **La modernité** (application, IA, réseau), sans clichés de circuits imprimés.
4. **La chaleur** et l'appartenance au Gabon, sans drapeau ni masque.

### 5.2 Direction créative : moderne, abstraite, design

**Rupture voulue avec l'existant** : plus de dessin figuratif détaillé (arbre, branches, nœuds, couronne de triangles). On vise un **symbole abstrait, géométrique, construit sur une grille**, de **2 à 4 formes pleines**, qu'on reconnaît à une seconde et qu'on pourrait dessiner de mémoire. Références de registre (pas de modèles à copier) : les marques d'applications culturelles et sonores contemporaines, où un signe simple porte tout. Le sens est **suggéré, jamais illustré** : on ne dessine pas un arbre, on dessine la **structure** qui rappelle un arbre, une voix ou un passage.

**Principes de conception**
1. **Formes pleines, sans contour fin ni dégradé obligatoire.**
2. **Une construction mathématique visible** : cercles et arcs de même rayon, angles de 45° ou 60°, espaces réguliers.
3. **Un « vide » signifiant** : l'espace négatif porte une seconde lecture (bouche, flamme, branche, passage).
4. **Mouvement implicite** : le signe doit pouvoir s'animer (onde qui passe, forme qui s'ouvre) pour l'écran de chargement.
5. **Une seule couleur suffit**, la couleur ne fait que renforcer.
6. **Intemporel** : ni effet de mode (3D brillante, néon), ni motif « ethnique » plaqué.

**Quatre pistes abstraites à explorer (Proposition)**

| Piste | Construction | Ce que le signe suggère | Risque |
|---|---|---|---|
| **A. Les deux arcs** | Deux arcs de cercle ou deux quarts de disque qui se font face, décalés, avec un petit disque entre eux | Deux personnes (l'ancien et l'enfant) qui échangent ; une bouche et une oreille ; le passage de la parole | Peut ressembler à un signe de chat ou de parenthèses |
| **B. Le N d'ondes** | Un **N** construit avec trois barres de hauteurs variées (diagonale en escalier), à la manière d'une forme d'onde | La voix et le son ; l'initiale de Nkala | Se rapproche des logos audio ; soigner la proportion pour s'en distinguer |
| **C. Le fût et la pousse** | Une colonne verticale épaisse qui s'ouvre en deux demi-cercles en haut (ou une forme en Y arrondie) | La racine qui devient branche, la lignée ; lecture arbre sans le dessiner | Peut évoquer un symbole médical ou une fourche |
| **D. Le cercle ouvert** | Un anneau interrompu par une fente et un point dans la fente, avec deux épaisseurs | Le village en cercle, la veillée (lien avec Wulinya myè), **la porte ouverte et celui qui arrive** ; **point d'ancrage** pour les modules (chaque module peut déplacer le point ou la fente) | Très simple : se différencier par la fente et ses proportions |
| **E. Le seuil abrité** (nouvelle, suite au sens de « Nkala ») | Un arc plein (demi-disque ou arche) posé sur une base, avec une ouverture centrale en négatif et un point dedans | La maison, l'abri, la porte ; le point = la personne chez elle ou la voix | Risque de lecture « tunnel » ou « arche religieuse » : travailler l'asymétrie |
| **F. Le N-toit** (nouvelle) | Un **N** dont la diagonale devient un pan de toit, ou deux montants et une arche entre eux | Initiale et maison en un seul signe | Peut faire trop « immobilier » : garder des courbes et le décalage |

Les pistes **D, E, F** portent directement le sens de « Nkala » ; **A** et **B** portent surtout la parole. **Recommandation mise à jour** : explorer **D, E et A**, puis **F** et **B** pour comparer. L'idéal est un signe qui réunit les deux lectures : *un abri (chez soi) ouvert par une voix*.

**Méthode** : 1) croquis en noir et blanc, 5 variantes par piste ; 2) test à 16, 32 et 96 px et en miniature sur l'écran d'accueil d'un téléphone ; 3) test « 1 seconde » : montrer le signe 1 seconde à trois personnes et leur demander de le redessiner ; 4) test du sens avec des locuteurs ; 5) choix, puis ajout de la couleur en dernier.

**C** reste en réserve. (La recommandation à jour est donnée plus bas, après le tableau.)

### 5.3 Contraintes techniques
- **Vectoriel** (SVG), construit sur une grille, formes simples. Le fichier actuel est un PNG de 511×512 : il faut une version redessinée.
- **Lisible à 16, 32, 48 px** (onglet de navigateur, notification) ; **icône d'application** en carré arrondi et en rond (Android adaptatif), avec **zone de sécurité** de 66 % au centre.
- **Version une couleur** (noir, blanc, une teinte) pour tampon, broderie, fax, gravure, sérigraphie.
- **Fond sombre et fond clair** : deux variantes validées.
- **Pas de texte très fin** dans le symbole ; pas de dégradé indispensable (le dégradé de l'icône actuelle est un bonus, non une condition).
- **Zone de protection** : la hauteur d'une lettre « N » du logotype tout autour.
- **Taille minimale** : symbole seul 16 px ; symbole + nom 96 px de large.

### 5.4 Déclinaisons à livrer
| Version | Usage |
|---|---|
| Symbole seul | Icône d'app, favicon, avatar |
| Symbole + « Nkala » à l'horizontale | En-têtes, site, documents |
| Symbole + « Nkala » à la verticale | Écran de démarrage, affiches |
| Version monochrome (noir, blanc) | Tampons, impressions, brodé |
| Un symbole d'accent par module | Onglets et cartes de présentation |
| Animation courte (le symbole qui se dessine, ou une onde qui passe) | Écran de chargement (existe déjà : `Chargement.tsx`) |

### 5.5 Logotype (le mot « Nkala »)
- Style **contemporain, sans empattement, géométrique mais chaleureux** (lettres construites avec les mêmes arcs et le même rayon que le symbole) ; un seul détail original (par exemple le « a » ou la barre du « k » qui reprend la fente ou l'arc du symbole).
- Minuscules ou capitales : à trancher à l'essai ; les minuscules sont plus accueillantes, les capitales plus institutionnelles.
- Doit rester correct avec les accents des autres modules : **Ompangano**, **Onenji**, **Azeva**, **Ontci**. Dessiner ensemble les cinq noms pour qu'ils aillent bien ensemble.
- Tester la **forme en capitales avec accents** (Ôrungu) : jamais d'accent supprimé.

### 5.6 À éviter
Drapeau et couleurs de l'État, carte du Gabon en logo, masques (Fang, Punu, Kota) qui appartiennent à d'autres peuples que les Myènè, silhouettes d'« Afrique » génériques, symboles religieux, et tout dessin qui évoque un casino pour Azeva.

---

## 6. Charte graphique (Proposition, à partir de l'existant)

### 6.1 Couleurs

**Décision de Capp : on garde les couleurs du site.** Le logo change, la palette ne change pas. Aucune couleur n'est ajoutée à l'identité ; seule la mise en ordre (noms, rôles, proportions) est proposée. Valeurs relevées dans le code (`apps/nkala/src/theme.ts`, `src/index.css`, `index.html`).

| Rôle | Nom | Code |
|---|---|---|
| Fond | Nuit de terre | `#170D08` |
| Carte | Terre brûlée | `#27150C` |
| Bord | Argile cuite | `#4A2412` |
| Couleur principale (boutons, barre du navigateur) | **Brique** | `#B84A28` |
| Couleur vive | **Terre** | `#C85A32` (aplats et grands titres) |
| Accent | **Ambre** | `#F59E0B` |
| Texte sur sombre | Sable | `#FED7AA` |
| Texte discret | Argile pâle | `#A8826D` |
| Texte et fond clairs | Blanc chaud | `#FDFAF7` |

Teintes secondaires déjà utilisées sur le site (dégradés, bordure « kente ») : ambre foncé `#D97706`, orange `#E67E22`, bronze `#B45309`, rouge sombre `#7C2D12`, brun `#3B1D10`, jaune `#FDE047` (accents ponctuels).

**Proportions** : 60 % fonds et textes, 30 % brique et terre, 10 % ambre.

**Couleurs par module** (accent dans la même famille) :
| Module | Accent |
|---|---|
| Ompangano | Brique |
| Onenji | Ambre |
| Azeva | Jaune `#FDE047` sur fond nuit (vif, sans rouge et or de casino) ou orange `#E67E22` : à trancher à l'essai |
| Ontci | Sable `#FED7AA` |
| Nkala citoyen | Terre |

**États** (hors identité) : succès vert, erreur rouge, information sable. Toujours avec une **icône ou un texte**, jamais la couleur seule.

**Règles** : pas de noir pur ni de blanc pur ; la terre `#C85A32` ne porte pas de texte courant sur une carte (4,1 pour 1, voir §2.2) : utiliser la brique `#B84A28` (5,0). Version claire éventuelle : fond blanc chaud `#FDFAF7`, texte `#27150C`, mêmes accents.

### 6.2 Typographie
- **Titres** : Outfit (existant), à tester sur les signes myènè ; **texte** : Plus Jakarta Sans (existant), idem.
- **Test obligatoire (À faire)** : afficher avec chaque police les phrases `Ôrungu · ɛ ɔ ṉ ṽ · ô è ê ï` en minuscules et en capitales. Si un signe manque, passer à **Noto Sans** (couvre ces signes, déjà utilisée par Wulinya myè) et garder Outfit uniquement pour le mot « Nkala » et les chiffres.
- **Myènè en italique, traduction en droit** en dessous (même règle que la série Wulinya myè, pour une pratique commune au projet).
- **Échelle mobile** (Proposition) : titre 28, sous-titre 20, texte 16 (jamais moins de 14), libellé 12 en capitales avec espacement ; interligne 1,4 ; largeur de ligne 45 à 75 signes.
- Écrire **Ôrungu** avec accent et majuscule, partout (`AGENTS.md`).

### 6.3 Formes, motifs et iconographie
- **Coins arrondis** (12 à 16 px sur cartes, pleinement arrondis sur boutons), reprise de l'icône actuelle.
- **Motif de la marque** : tirer **un seul** motif **des formes du nouveau symbole** (arcs, cercles, fentes répétés), et le décliner en **bordures et fonds discrets** à la place du fond à points actuel ; il doit rester discret (opacité basse) et ne jamais passer sous du texte. Pas de motifs « ethniques » plaqués.
- **Pictogrammes** : trait de 2 px, extrémités arrondies, grille de 24 px ; un seul jeu pour toute l'app.
- **Illustrations** : personnages humains diversifiés (âges, tenues), pas de photos de banque d'images « africaines ». Les photographies sont des vues réelles du Gabon (Port-Gentil, Mandji, lagunes), avec accord et crédit.
- **Onde sonore** : forme-signature utilisable partout (barres d'enregistrement, indicateurs de lecture, séparateurs) ; elle relie l'identité à la fonction principale.

### 6.4 Mise en page et composants
- Grille de **4 px** ; marges de 16 px sur mobile ; **cibles tactiles de 44 px** au moins.
- **Navigation** : barre du bas à 5 onglets (Carte, Annonces, Services, Magazine, Profil) et menu « Plus » (`NKALA_PLAN_DEVELOPPEMENT.md` 0.3) ; l'accent de module apparaît dans l'en-tête, pas dans la barre.
- **Boutons** : principal = brique avec texte kaolin ; secondaire = contour ; destructif = rouge d'état.
- **Version claire et version sombre** de chaque écran ; suivre le réglage du téléphone.
- **Hors ligne** : état visible mais calme (bandeau discret, jamais alarmant), car c'est un usage normal.
- **Mouvement** : courtes animations (200 à 300 ms), respect du réglage « réduire les animations » ; confettis et récompenses (`Confettis.tsx`) réservés aux vraies réussites.

### 6.5 Voix et vocabulaire
- Mots myènè là où ils existent déjà dans le projet (Ezango, Onenji, Ontci, Azeva, Ompangano) ; traduction française toujours à côté, brève.
- Messages d'erreur : dire ce qui s'est passé et quoi faire, sans jargon.
- **Citations de proverbes et de devises** reprises telles quelles de `_contexte/IDENTITE_ORUNGU.md`, jamais retraduites.

---

## 7. Accessibilité et usages réels
- Contraste vérifié (§2.2, §6.1) ; texte agrandi jusqu'à 200 % sans perte.
- Lecture d'écran : alternatives textuelles pour les icônes et le logo.
- Réseau faible : logos en SVG légers (quelques Ko), polices limitées à 2 familles et 3 graisses, pas d'image lourde sur l'écran de démarrage.
- Enfants : version simplifiée (grandes icônes, peu de texte) pour les cycles de 3 à 8 ans ; **aucun élément de jeu d'argent visible** en mode enfant.

---

## 8. Livrables attendus et ordre de travail

| # | Étape | Livrable | Porte |
|---|---|---|---|
| 1 | Décisions §3.3 | Nom, sens, statut d'Ompangano, couleurs d'État, signature Essaka | Accord de Capp |
| 2 | Test des polices sur les signes myènè | Planche de test, police choisie | Tous les signes affichés |
| 3 | Recherche de logo | 3 pistes en noir et blanc, essais à 16/32/96 px | Choix d'une piste |
| 4 | Logo finalisé | SVG (symbole, horizontal, vertical, monochrome, fond sombre et clair) | Test sur icône et en une couleur |
| 5 | Déclinaisons de modules | 5 accents et pictogrammes | Cohérence sur un écran type |
| 6 | Charte | Document de 10 à 15 pages (ce cahier complété par les valeurs mesurées) | Relecture par Capp |
| 7 | Intégration | `theme.ts`, `index.css`, `app.json`, icônes PWA, favicon, `metadata.json`, `index.html` | Test sur iPhone, Android, web |
| 8 | Kit de partage | Dossier `identite/` (SVG, PNG, polices, tokens de couleur) | Validation finale |

**Jetons de conception (« design tokens »)** : une fois la charte arrêtée, mettre les couleurs et tailles dans **un seul fichier** (`packages/noyau` ou `apps/nkala/src/theme.ts`) lu par le web et par Expo, pour qu'une couleur ne soit plus recopiée en 30 endroits (le relevé du code en montre des centaines d'occurrences en dur).

---

## 9. Limites de ce document
- Les couleurs du logo actuel étaient **relevées à l'œil** ; il est abandonné, donc sans conséquence pour la nouvelle palette.
- Les contrastes sont **calculés** (formule WCAG) mais l'apparence réelle doit être vérifiée sur appareils, en plein jour.
- Les polices n'ont **pas été testées** sur les signes myènè.
- Les pistes de logo sont des propositions de direction, pas des dessins ; aucun fichier de logo n'a été produit ni modifié. Les croquis des pistes A à D peuvent être produits ensuite en SVG pour comparaison.
- Aucun avis juridique (jeux d'argent, dépôt de marque) : le dépôt de la marque et des logos auprès de l'OAPI est à examiner avec un conseil compétent.
