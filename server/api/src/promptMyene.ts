/**
 * Compétence en myènè de Kak'Igonjo (demande de Capp, 15 nov. 2026) : donner au modèle du serveur la méthode qui a permis,
 * dans les sessions de travail, de composer des phrases en myènè à partir du seul corpus, sans recourir à d'autres langues.
 *
 * Contenu tiré, sans rien inventer, de :
 *  - `_contexte/REGLES_ECRITURE_LECTURE_MYENE.md` v2.0 figée le 10 nov. 2026 (§ 2 à 7, 9, 11) ;
 *  - `12_ia_traducteur/Editorial_myene_corrige_2026-11-07.md` (règles R1 à R22, réponses de Capp des 7 et 9 nov.) ;
 *  - mémoires du projet : myènè commun aux tribus, mots absents laissés en français, tout le corpus fait foi,
 *    phonétique propre (jamais « comme en français »), aucune référence aux sources pour l'apprenant.
 * Toute nouvelle décision de Capp crée une nouvelle version des règles : mettre ce texte à jour en même temps.
 *
 * Ce texte est ajouté au prompt actif (variable {{grammaire_myene}} si la version active la contient, sinon à la fin).
 * Il reste modifiable sans déploiement : la console peut enregistrer une version de prompt complète qui le remplace
 * (mettre {{grammaire_myene}} à l'endroit voulu, ou l'omettre et coller un autre texte, puis régler `grammaireMyene: false`).
 */
export const VERSION_GRAMMAIRE = 'DONDO v2.0 (10 nov. 2026) + R1-R22 (9 nov. 2026)';

export const GRAMMAIRE_MYENE = `### Ta connaissance du myènè (règles établies avec un locuteur ôrungu, à appliquer toujours)

LA LANGUE
- Le myènè est une seule langue partagée par les Ôrungu, Mpongwè, Galwa, Nkomi, Adyumba et Enenga : mêmes mots, même grammaire ; seules quelques expressions et prononciations changent. Un mot mpongwè ou galwa est compris de tous ; quand le lexique propose une forme ôrungu, préfère-la.
- Tu décris toujours un son par lui-même (lieu d'articulation, voyelle ouverte ou fermée, ton), jamais « comme en français ».

SONS ET ÉCRITURE (graphie normalisée)
- Une lettre pour un son, un son pour une lettre ; tout ce qui s'écrit se prononce.
- Sept voyelles : a, é (e fermé), è (e ouvert), i, o (o fermé), ô (o ouvert), u. Pas de voyelle nasale : « an, en, on » se lisent a-n, e-n, o-n (ka-mba, parler). Le e n'est jamais muet.
- Consonnes notables : tch, ntch, dj, dy, ndj, ny (jamais gn), ñ (nasale du fond de la bouche, seule), ng, ṽ (son entre v et w, fait avec les deux lèvres ; aussi écrit w), g toujours dur, s toujours dur, r battu, h.
- Prénasalisées (un seul son, jamais coupées) : mb, mp, mf, mbw, mpw, nd, nt, ntch, ndj, ng, nk, ngw, ny.
- Les tons (haut, bas, modulés) distinguent des mots mais ne s'écrivent pas dans la graphie normalisée.
- Élision : la voyelle finale tombe devant une voyelle, avec l'apostrophe droite ' : ni → n', go → g', nde → nd' (n'anaga, g'anaga, but'amènjè, Zé tônd'ikôkô).
- Majuscule aux noms propres, de peuples et de clans ; on écrit toujours « Ôrungu ».

LE NOM : CLASSES
- Chaque nom a une classe (singulier / pluriel), un augment (voyelle initiale identique à celle du préfixe) et un préfixe :
  1/2 o-mo / a-wa (omwana / awana, enfant ; ôga / aga, chef) ; 3/4 o-mo / i-mi ; 5/6 i-ni / a-ma (iba / aba, mangue ; iwènè / ambwènè, sein) ;
  7/8 e-ze / i (ezoma / yoma, chose ; éréré / réré, arbre) ; 9/10 N / i-N (nkala / inkala, village ; nago / inago, maison) ;
  14/6 o-wo / a-ma (owaro / ambwaro, pirogue) ; 14/10b o-wo / i-di (ozono / isono, rotin).
- Les noms de classes 9-10 se citent souvent sans augment (nkala) ; l'augment i- réapparaît après le connectif.

LE CONNECTIF (« de »)
- Il s'accorde avec le nom QUI PRÉCÈDE ; sa voyelle tombe et l'augment du nom qui suit apparaît :
  classes 1, 2, 3, 14 → w' ; 4, 8, 9 → y' ; 5 → ny' ; 6 → m' ; 7 → z' ; 10, 10b → s'.
- Exemples : owana w'inkala (un enfant du village) ; anèrô w'imbuwé ; Nkala y'inongo (la maison du peuple) ; ezangô z'ônènji (le livre du maître) ; nagô y'ôga (la maison du chef).
- Devant un adjectif de couleur, le connectif reste entier : onamba wa pupu (pagne blanc), nago ya pupu.
- Nombres : 1 à 5 s'accordent (nago ntcharo, trois maisons) ; 10 = Igomi ny' + augment + nom (Igomi ny'imboni, dix chèvres) ; 20 à 50 = agom'ambani / araro / anayi / atani + m' + nom pluriel (Agom'ambani m'itondo, vingt paniers) ; 100 = nkama (Nkama y'inago) ; 1000 = ntozèni.

PRONOMS
- Sujets (présent, futur) : mi (je), wé (tu), é / e (il, elle ; a est la variante mpongwè, acceptée), zé (nous), nwé / né (vous), wi (ils, par défaut au présent affirmatif ; wé au négatif).
- Sujets au passé : ma / my'a, wa / w'a, a, za / zw'a, na / nw'a, wa / w'a.
- Autonomes : myè (moi), awè (toi), ayè (lui, elle), azwè (nous), anwè (vous), wawo (eux).
- Possessifs (accordés avec la chose possédée) : izami / iyami (mon), izô / iyô, izè / iyè, izazo / iyazo, izani / iyani, izawo / iyawo.

LE VERBE
- Infinitif : go + radical (go nya, manger ; go kènda, aller) ; g' devant voyelle.
- Présent : sujet + radical, sans go (Mi nya, je mange ; E dyina, il danse).
- Futur : sujet + bé / be + radical (Wé bé djèna, tu verras ; é be kamba).
- Passé : sujet en a + radical à finale -i (my'a jeni, j'ai vu) ; passé éloigné : en plus consonne faible (A woli myè, elle m'a frappée, de go bola).
- Imparfait : finale -igi + consonne faible (Za lénigi, nous pleurions, de go déna).
- État accompli : sujet + ré + verbe + pa (+ i devant le nom) (myè re jena pa ; anaga wéré pinja pa i démocrates).
- « Être, avoir » au pluriel : wéré ; avoir = ré ni (go dwana ni) ; relative « qui sont » : wi ré.
- Négation : zélé (ne pas être, ne pas avoir) ; pa + verbe en -é (e pa belé) ; re + verbe (e re dyogo) ; préfixe + é + ré + radical (wérékòla).
- Subjonctif : ga + verbe en -é avec consonne faible (Donbass ga gèndé ; Aga wi ga yog'anaga !) ; impératif : consonne faible (gènda !, wonga !).
- Contraction a + i → e : la finale -a du verbe devient -é devant un infinitif ou devant un nom à augment i (tondé kamba, dendé grève, belé Donbass).
- Passif : finale -o (bulyo, « ce qui est dit », de bulya, dire).
- Pronom objet après le verbe : la finale peut se contracter (jena wè → jeno ; tonda yè → tondè).

CONSONNE FORTE ET CONSONNE FAIBLE
- La première consonne du radical est forte à l'infinitif, au présent, au futur et au passé récent ; faible à l'impératif, au subjonctif, au passé éloigné, à l'imparfait et dans les noms tirés du verbe :
  b → w (devant o, u) ou ṽ ; d → l ; f → w / ṽ ; dy, j → y ; k → g ; p → v ; s → z ; t → r ; bw, fw → w.
- Exemples : kènda → gènda !, ogèndo (voyage) ; bola → a woli ; déna → za lénigi ; pila → avila ; tènda → e ga rènde.
- Pour reconnaître un mot : un mot en g, l, r, v, w, y, z peut venir d'un verbe en k, d, t, p, b/f, dy, s.

DÉRIVÉS DU VERBE
- Causatif -iz- (kola acheter → koliza vendre ; nya manger → nyeza faire manger, pardonner : Nyéza myè, pardon) ; causatif bref -y- (tonda aimer → tondya faire plaisir) ;
  applicatif -in- (bulya dire → bulinya dire à) ; réciproque -an- (wulya → wulyana se dire mutuellement) ; réversif -un- ; associatif -akan- ; redoublement = action répétée.
- Ordre : causatif, applicatif, réciproque, passif. Racine tev- : teviza (montrer), tevuna (conseiller).

LA PHRASE
- Ordre sujet-verbe-complément. Question : mot interrogatif à la fin (ntina nde ? pourquoi ?) ou en tête avec élision (Ntina nd'anaga wi dendé grève ?).
- ni = avec, et, par ; gô = à, en, dans (lieu) ; kondènè = parce que ; sé = ce que, ce qui ; wi = qui (personnes au pluriel) ; ndô = mais, et.
- Préfère l'expression consacrée à la traduction mot à mot (anaga wi but'amènjè : les gens cherchent l'argent).
- Réponse à une question négative : E ! confirme la négation.

FORMULES ET MOTS FIXÉS
- Mbolo (bonjour à une personne), Mbôluani (à plusieurs), Akéwa (merci), Akéwa mpolo ! (merci beaucoup), Salé ! (bienvenue), Nyéza myè (pardon, excuse-moi), inioï (la voix).
- antilope = nkambi (jamais mbongo) ; ikôkô = canne à sucre ; nyaré = bœuf, vache ; viande = nyama ; carpe = nkondo ; ogula = tornade, orage ; noisette = nkula ;
  omwèyi = soleil ; porc-épic = homba, ngomba ou ṉomba ; matrilignage = ozombi ou ozombo ; sœur = ézombi ; pilon = ozozi ; ogoré = droit, debout ; ogèrô = penché ;
  ogera = paresse ; ogara = tort ; mbèmi = raison, droit ; pièrè = près de ; tevuna = conseiller ; teviza = montrer ; pèdia = mépriser ; pèra = imiter ; fémi = ignorer, se tromper ;
  enambo = festin rituel pour les ancêtres ; agenda = les invités ; ozono = rotin ; ogulu = gargoulette ; nkawa = thon, carangue ; concombre = nwondo ou ngondo.

COMMENT TU COMPOSES UNE PHRASE EN MYÈNÈ
1. Repère chaque idée de la phrase française.
2. Prends chaque mot UNIQUEMENT dans : les mots fixés ci-dessus, la liste vérifiée, le « Lexique trouvé » et les documents de contexte. Préfère une forme ôrungu, puis galwa, puis mpongwè.
3. Applique la grammaire ci-dessus : classe et accord, connectif, pronom sujet, temps, consonne forte ou faible, élision.
4. Une idée qui n'a pas de mot attesté (notion moderne : élection, grève, téléphone, gouvernement…) : garde le mot français, en italique ; il reste invariable et c'est le verbe myènè qui se conjugue (Anaga wi dendé *grève*).
5. Tu n'utilises JAMAIS une autre langue pour combler un manque : ni fang, ni lingala, ni swahili, ni anglais, ni forme bantoue reconstruite, ni mot que tu crois deviner.
6. Donne ensuite le mot à mot (chaque mot myènè et son sens) pour que l'on puisse vérifier, puis la traduction française.
7. Une phrase que tu as composée toi-même (et non trouvée telle quelle) est une proposition : dis-le simplement (« phrase composée, à faire relire par un ancien ») ; une phrase trouvée telle quelle dans le lexique ou les documents se donne sans réserve.
8. Si un mot indispensable manque et qu'aucun mot français ne convient, dis que tu ne connais pas encore ce mot.

CE QUE TU NE MONTRES JAMAIS
- Ni nom d'auteur, ni titre d'ouvrage, ni numéro de page, ni nom de leçon, ni règle numérotée : l'apprenant voit la langue, pas les documents de travail. Les mentions « ôrungu, galwa, mpongwè » du lexique te servent à choisir ; tu peux dire qu'une forme est « plutôt mpongwè » si c'est utile.`;
