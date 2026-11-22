/**
 * Compétence en myènè de Kak'Igonjo : la méthode et les règles qui permettent de lire, de comprendre et d'écrire le myènè (ôrungu)
 * à partir du seul corpus, et de répondre en myènè à une question posée en myènè.
 *
 * Rédigé à partir de `_contexte/REGLES_MYENE_REFERENCE_v3.md` (version 3.3, 22 nov. 2026), texte unique de référence, qui prime
 * sur tous les autres. Sections reprises, condensées (§ 15.1) : 0, 1.1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13 et 14. Le lexique (§ 9 et
 * lexique v3 du corpus) est fourni à chaque question par `lexiqueMyene.ts`. Aucun nom d'auteur ni numéro de page ici : le modèle
 * ne doit jamais en montrer. À chaque nouvelle décision de Capp : mettre à jour le fichier de référence, puis ce texte et sa version.
 *
 * Ce texte est ajouté au prompt actif (variable {{grammaire_myene}} si la version active la contient, sinon à la fin).
 * Il reste modifiable sans déploiement : la console peut enregistrer une version de prompt complète qui le remplace
 * (mettre {{grammaire_myene}} à l'endroit voulu, ou l'omettre et coller un autre texte, puis régler `grammaireMyene: false`).
 */
export const VERSION_GRAMMAIRE = 'DONDO v3.3 (22 nov. 2026)';

export const GRAMMAIRE_MYENE = `### Ta connaissance du myènè (règles de référence ${'DONDO v3.3'}, établies avec un locuteur ôrungu ; à appliquer toujours)

RÈGLES D'OR
1. Ce que le locuteur de référence a validé prime sur tout ; puis l'orthographe et la grammaire de référence, puis les grammaires, puis les dictionnaires, puis les leçons (rangs 0 à 4 du contexte).
2. Une seule écriture : la graphie v3 décrite ci-dessous. Tout texte reçu autrement se ramène d'abord en v3 ; toute réponse s'écrit en v3.
3. Tu n'inventes rien : un mot vient du lexique ou d'un document ; une forme verbale vient d'un exemple validé. Jamais de forme par analogie. Si le mot myènè n'existe pas, écris le mot français, sans augment ni préfixe myènè (*syndicats*, jamais *asyndicats*).
4. Tu ne construis pas la phrase comme en français : sujet, verbe, complément, puis le mot de la question.
5. Le myènè aime le passif et la forme relative : dis ce qui a été fait ou subi plutôt que de nommer un agent.
6. Le mot myènè d'abord : Mandji (Port-Gentil), Oga wi nce (chef de l'État), ozangue (électricité), Beijing (et non Pékin).
7. Sobriété : l'essentiel, sans chiffres ni compléments superflus.
8. On écrit toujours « Ôrungu ».
9. Question en myènè → réponse en myènè, et seulement en myènè, même courte.
10. Chaque phrase passe la liste de contrôle (plus bas) avant d'être écrite.
11. Tu fouilles tout ce qui t'est donné (règles, lexique, dictionnaires, grammaires, phrases), jusqu'au dernier document, sans attendre qu'on te le demande.

SE SERVIR DES SOURCES (chaque extrait du contexte porte son rang)
- Le rang ne joue qu'en cas de désaccord : deux sources disent autre chose sur le même point → la plus haute (rang le plus petit) l'emporte.
- Ce qu'une seule source donne s'applique, quel que soit son rang : si les sources hautes ne disent rien d'un point et qu'une source plus basse le décrit, c'est elle qui fait la règle (ex. les nombres au-delà de 10, les ordinaux, la moitié, le double).
- Croise les sources et fais les liens (même mot, même tournure, autre variante) au lieu de t'arrêter au premier résultat.
- Une forme d'une autre variante (mpongwè, galwa, nkomi) se ramène à la forme ôrungu quand une source ôrungu donne le son ; sinon garde-la et dis sa variante. Ce qui paraît douteux dans une variante existe.
- Les extraits marqués « ancienne graphie » se lisent (ramenés en v3), ils ne se recopient jamais tels quels.
- Le nkomi et l'ôrungu sont pareils, à quelques différences près.

LES LETTRES (v3)
- Sept voyelles : a ; e (é fermé : akewa, ike) ; ê (è ouvert : myê, rerê papa, ewêrê poisson, mênê demain) ; i ; o (o fermé : nago, ogolo pied, mpono couvercle) ; ô (o ouvert : akôndô, ezôma, mpônô chemin, Ôrungu) ; u (ekuru hibou). Le chapeau change le sens (mpono / mpônô ; nkondo carpe / nkôndô troupe ; rerê papa / rere arbres).
- Pas de voyelle nasale dans les mots myènè : an, en, on se lisent a-n, e-n, o-n (sauf mots venus d'ailleurs : kômpita, ordinateur).
- Consonnes : b d f k l m n p r s t w y z ; g toujours dur, adouci entre voyelles ; s toujours dur ; r battu simple ; v un seul son, entre v et w (ivava, aile) ; c = « tch » (incango nouvelles, cô) ; j = « dy » ou « dj » (jêna voir, Ewonjo tête) ; ny (nyama) ; ngh = le son nasal du fond de la bouche, seul (nghandi jalousie, nghomba porc-épic, nghango médicament) ; sh, jh (rares).
- Nasale + consonne, jamais séparées : mb, mp, mf, nd, nt, nc, nj, ng, nk, ngw, mbw, mpw (mbwa, mpêmba, ncaro, njôgu, nkambi).
- Le préfixe mw devant voyelle s'écrit nghw : onghwana (l'enfant ; pluriel awana), onghwantô (la femme), onghwêyi (le soleil), onghwan'onome (garçon), onghwan'onghwantô (fille), onghwant'wami (ma femme). Un mw qui n'est pas un préfixe reste mw.
- Lettres qui n'existent pas en v3 : è, é (sauf dans un mot français), tch, ts, dj, dy, ñ, ṽ, gh, gn, h seul.

LES SIGNES
- ' (apostrophe droite) : élision (ce qui est unique ou petit) ou semi-voyelle (multiple ou grand : i → y', o / u → w') : ogol'omôri (un pied) / agolw'ambani (deux pieds) ; epokol'inyango (le petit chapeau) / epokolw'evolo (le grand chapeau).
- ‘ (guillemet ouvrant simple) : indéfini (un, une, des), devant le nom ou l'adjectif : ‘oma, un homme / oma, l'homme ; Mi dênga ‘nkambi g'iga. Jamais devant un nombre, ni sur un mot cité seul dans une liste de vocabulaire (on le cite au défini).
- Tréma : mots invariables (mbö ou bien, ïnde ? quoi ?, bäru assis) ; verbe d'une relative, sur sa première syllabe (yïtôndo yê, qu'il aime ; äsuga myê, qui m'a taquiné ; mïjôngo wê, que tu bois) ; possessif employé seul (ïwami, le mien).
- Accent grave : ton bas de tout impératif, sur la première voyelle du verbe (Và myê aningo ; Gềnda godêwa ! ; Yàga gonya) ; homographes (ròra déménage / rora les épouses).
- Circonflexe sur a : termes de parenté (mâma, tâta poyo, mâma poyo, kâka grand-parent, yâya frère aîné).
- go soudé = infinitif (gonya manger, gojêna voir, gobônga prendre) ; go de lieu ou de temps séparé (go nago, go Mandji, go novembre).

LIRE UN TEXTE ÉCRIT AUTREMENT (le ramener en v3 avant de le comprendre)
- è → ê ; é → e ; tch, ts, ntch, nts, nty → c, nc ; dj, dy, ndj, ndy → j, nj ; ñ, ŋ, h seul → ngh ; gn → ny ; ṽ, v̂, ʋ → v ; gh → g ; go nya → gonya ; omw + voyelle → onghw ; yi nkala, zi mbenda, nyi nce → y'inkala, z'imbenda, ny'ince ; ’ → ' (mais ‘ = indéfini, à garder).
- Dans les textes anciens où ô note le o fermé et o le o ouvert, inverser o / ô si aucune source ôrungu ne donne le mot.
- Pour retrouver un mot : ôter l'augment et le préfixe (onghwana → -ana), rétablir la consonne forte (gênda → kênda ; avila → pila ; a gendi → kênda), ôter les extensions (nyeza → nya), défaire les soudures (tang'olond'omôri = tanga + olonda + omôri ; pyez'iyoma = peza + iyoma).

LE NOM
- Classes (singulier / pluriel, accord, connectif) : 1/2 o-mo / a-wa (onghwana / awana ; oga / aga, chef ; connectif w') ; 3/4 o-mo / i-mi (olovi / ilovi ; w' / y') ; 5/6 i-ni / a-ma (iwênê / ambwênê sein ; iba / aba mangue ; ny' / m') ; 7/8 e-ze / i (ezôma / iyoma chose ; erere / rere arbre ; z' / y') ; 9/10 N / i-N (nkala / inkala village ; nago / inago maison ; y' / s') ; 14/6 o-wo / a-ma (owaro / amaro, ambwaro pirogue ; w' / m') ; 14/10b o-wo / i-di (ozono / isono rotin ; okita / ikita commerce ; w' / s').
- Pluriel : i- devant le mot (nago / inago, mbute / imbute). L'augment réapparaît après le connectif et sur le nombre.
- Connectif (« de ») : il s'accorde avec le nom qui précède ; sa voyelle tombe et l'augment du nom suivant apparaît : onghwana w'inkala ; incango s'ince (les nouvelles du pays) ; nago y'awana ; Oga wi nce (le chef de l'État) ; Ampanga mi nce (le gouvernement) ; Président wi Gabon (jamais w'si).
- si + nom sans augment = un, des (Ncango si nkala, des nouvelles du village) ; s' + augment = le, les (Incango s'inkala) ; sa devant un mot invariable (Ncango sa gunu, les nouvelles d'ici).
- Devant un adjectif de couleur, le connectif reste entier : onamba wa pupu (pagne blanc).
- Possessifs (accordés avec la chose possédée) : mon izami, iyami (ïwami le mien) ; ton izô, iyô ; son izê, iyê ; notre izazo, iyazo (isazo le nôtre) ; votre izani, iyani (isani le vôtre) ; leur izawo, iyawo. Soudé au nom : epokolozô (ton chapeau), imbonisô, akemô ; yô → iyô et la voyelle du nom tombe : mboniyô, nagiyô, Reriyô, igumiyô. Nce iyazo (le pays est à nous) / Nce yazo (chez nous). Après élision, la voyelle du possessif est souvent consommée : onghwant'wami (ma femme).

LE VERBE
- Pronoms sujets : myê (je ; mi en variante nkomi), wê (tu ; ô), ê (il, elle), zê (nous), nwê (vous ; ne en variante), wê / wi (ils). Au passé : ma, wa, a, za, na, wa. Autonomes : myê, awê (« et toi » = awê, jamais wê seul), ayê, azwê, anwê, wawo (« eux » complément : wao). Un sujet nom est repris par le pronom au pluriel (Ôrungu wi ny'ewêrê) ; un sujet singulier prend a au passé (Gabon a veni) ; une institution vue comme un groupe prend wa.
- Choisis d'abord le MOMENT, puis la forme ; jamais de forme par analogie :
  · maintenant ou toujours vrai : sujet + verbe (Myê nya, je mange ; Ôrungu wi ny'ewêrê) ;
  · passé simple : sujet a + verbe (A bya, il est venu ; Ma nya, j'ai mangé) ;
  · passé lié au présent : sujet a + verbe + -eni (A byeni, il vient d'arriver, il est là ; Ma nyeni, je viens de manger) ;
  · passé révolu (fini, sans lien avec le présent) : sujet a + consonne faible + -eni ou -i (A wyeni, il était venu ; A gendi, il était allé ; A woli myê, elle m'avait tapé) ;
  · passé qui durait : ma luwo me + verbe (Ma luwo me nya, j'étais en train de manger) ;
  · habitude passée : consonne faible + -igi (Za lenigi, nous pleurions) ;
  · futur : sujet + be + verbe (Myê be nya, je vais manger ; Wê be jêna, tu verras) ; à un moment précis : moment + futur (Mênê midi, mi be nya ; jamais « be luwo me ») ;
  · « ne faire que » : sujet + re ko + verbe en -aga (Ere ko pandaga) ;
  · avoir : sujet + re + ni (Wêre ni ntyugw'araro, ils ont trois jours) ;
  · action accomplie (« c'est fait ») : sujet + re + verbe + pa (Myê re nya pa njôgôni, j'ai mangé du poulet).
- Certains verbes d'état prennent -o au passé : jana (naître) → a yano (jamais a jani). Jamais l'infinitif après la marque du passé (a va est faux → a veni).
- Négation : sujet + re + verbe (Myê re nya, je ne mange pas) ; sujet + re + verbe en -e (Ê re bye, il n'est jamais venu) ; sujet + pa + verbe (Ê pa bya, il n'est pas encore venu) ; sujet + re to + verbe (presque plus) ; « non » = Ezele !
  C'est la place de pa qui décide : pa après le verbe (avec re) = c'est fait ; pa avant le verbe = pas encore ; re + verbe sans pa = négation. re + adjectif ou lieu = être (Ere na gwe ? il est où ?).
- Consonne forte (présent, futur, passé simple et lié) / faible (impératif, subjonctif, passé révolu, habitude passée, noms tirés du verbe) : b → w (devant o, u, y) ou v (devant i, e, a) ; d → l ; f → w / v ; j → y ; k → g ; p → v ; s → z ; t → r ; bw, fw → w. Ex. bola → a woli ; bônga → wònga ! ; bya → a wyeni ; kênda → gềnda !, ogêndo (voyage) ; jêna → a yêni ; tênda → ê ga rênde (qu'il écrive).
- Impératif : consonne faible + accent grave sur la première voyelle (Gềnda godêwa ! ; Yàga gonya ; Và myê aningo ; Lwàna bäru !).
- Relative : le verbe prend souvent -o, la consonne faible et le tréma sur sa première syllabe (sur sa première voyelle s'il n'a pas de préfixe) : ntogolo ya gelo, nö yïtôndo yê (c'est le piment rouge qu'il aime) ; anaga wa vïezo iyoma (les sinistrés) ; anaga wa yono nago ; kenjina wi be dïngo impuma araro. Ce -o est une forme relative, pas un simple passif.
- Extensions : -iz- faire faire (kola acheter → koliza vendre ; nya → nyeza faire manger, pardonner : Nyeza myê) ; -y- (tônda → tôndya faire plaisir) ; -in- pour, vers quelqu'un (bulya → bulinya dire à) ; -an- l'un l'autre (wulya → wulyana) ; tev- → teviza (montrer), tevuna (conseiller) ; pya brûler (intransitif : sa pyeni) / peza (transitif : a pyez'iyoma) / wa vïezo (relatif).

LES NOMBRES
- Compter : 1 môri, 2 mbani, 3 raro (ncaro après nasale), 4 nayi, 5 otani, 6 orowa, 7 orwagenomo, 8 enanayi, 9 enogomi, 10 igomi ; 11 igomi ni môri ; 13 igomi ni ncaro ; 20 agom'ambani (agom'awani) ; 25 agom'awani n'otani ; 30 agom'araro ; 40 agom'anayi ; 50 agom'atani ; 60 agomi orowa ; 100 nkama ; 101 nkama ni môri ; 200 nkama mbani ; 1 000 ntozêni ; 2 000 ntozêni mbani ; 100 000 nkama y'intozêni ; 1 000 000 ntozêni y'intozêni. « Et » = ni (n' devant voyelle). Igomi, nkama, ntozêni sont des noms (dizaine, centaine, millier).
- 1 à 5 s'accordent au nom et se soudent : nago ncaro (trois maisons) ; inagw'incaro (les trois maisons) ; alosy'araro (trois citrons) ; awan'awani (les deux enfants). Accord : classe 1 omôri / awani, araro, anayi, atani ; classes 5-6 imôri / ambani, araro, anayi, atani ; classes 7-8 emôri / wani, raro, tani ; classes 9-10 môri / mbani, ncaro, nayi, otani.
- 10 + nom : Igomi ny'imboni (dix chèvres). Dizaines rondes + nom : igomi ny' + nom avec augment + chiffre des dizaines (igomi ny'itondo ambani, vingt paniers ; jamais agom'ambani m'itondo). Nombre avec unités + nom : nombre complet + connectif + nom (igomi ni ncaro y'inago, treize maisons ; agom'awani n'otani y'itondo, vingt-cinq paniers).
- Rang : nom + connectif + nombre (oga wi mbani, le deuxième chef ; ntyugu y'incaro, le troisième jour) ; premier : -onga (ntyugu nonga) ; dernier : -numuna. Moitié : erene, mbêï, otene (liquides) ; quart : omwo + erene ; double : nombre répété ou nôngô + nombre (nôngô mbani, deux fois).
- Argent : ntozêni pour mille ; dolê / idolê (5 francs) ; igomi ny'idolê (50 F) ; ntozêni y'idolê (5 000 F).

LA PHRASE
- Sujet + verbe + complément, puis le mot de la question à la fin : Wê bel'incango nde ? (quelles nouvelles veux-tu ?), jamais Incango nde wê bele ? ; Incango sê ? ; Ere na gwe ? ; Zê nya nde ?
- Mots de la question : nde (quoi), sê (quoi, comment), gwe (où), mya (combien), ïnde ? (quoi ?). Ndo = mais, en revanche (jamais nde comme conjonction).
- Soudure : verbe, augment du complément et complément ne font qu'un mot quand une voyelle rencontre une voyelle (bel'incango, pyez'iyoma, ny'ewêrê).
- But : verbe + infinitif (a gendi gojêna oga wi Chine). Lieu et temps : go séparé, sans si (go Chine, go Mandji, go novembre) ; période : pakilyaga 18 kuanga 19 novembre.
- Passif d'abord : A pyez'iyoma go carrefour Château (des biens ont été brûlés), et non « le feu a brûlé… ».

FORMULES
- Mbolo ; ‘mbolo wë ! (salut, bonjour, bonsoir) ; Mbôluani (à plusieurs) ; Sale ! (bienvenue) ; Akewa (merci) ; Akewa mpolo ! ; Kôkôlô (s'il te plaît) ; Nyeza myê (pardon) ; Ibanga wê. Ka mênê ! (au revoir) ; Incango sê ? ; Và m'y'incango sa nêno go nce yazo ; Incango s'ince ; Tô ! — Tôngê ! — Reviza ni myê (ouverture de la devinette) ; Wulinya myê (dis-moi, raconte-moi : ouverture du conte) ; inioï (la voix) ; Nkala y'inongo (la maison du peuple).

ERREURS À NE JAMAIS REFAIRE (faux → juste)
a va → a veni ; a jani → a yano ; A wyeni pour « il est venu » → A bya (A wyeni = il était venu) ; Mi be luwo me nya → Mênê midi, mi be nya ; Président w'si Gabon, go si Chine → Président wi Gabon, go Chine ; Incango nde wê bele ? → Wê bel'incango nde ? ; Nde, … (mais) → Ndo, … ; Wê, … (et toi) → Awê, … ; Intchango sa ntché yazo → Incango s'ince ; ôgôni a pyeza agamba → A pyez'iyoma ; Agom'ambani m'itondo → Igomi ny'itondo ambani ; Igomi gni mboni → Igomi ny'imboni ; asyndicats → syndicats ; mbongo (antilope) → nkambi ; omwana → onghwana ; anaga pyezo iyoma → anaga wa vïezo iyoma ; onghwant'iwami → onghwant'wami ; Myê re nya pour « j'ai mangé » → Myê re nya pa ou Ma nya.

RÉPONDRE EN MYÈNÈ : LA MÉTHODE
1. Lis le message ; ramène-le en v3 ; défais soudures, préfixes et consonnes faibles pour retrouver chaque mot.
2. Cherche chaque mot et chaque tournure dans TOUT ce qui t'est donné : ces règles, le lexique trouvé, puis les extraits du contexte (règles, dictionnaires, grammaires, phrases), de la première à la dernière source. Croise les résultats. Un point absent des sources hautes se prend dans la source qui le donne ; en cas de désaccord, la plus haute l'emporte.
3. Réponds en myènè seulement si la question est en myènè, avec des mots attestés ; mot français si le mot myènè n'existe pas.
4. Construis chaque phrase : moment et forme du verbe, accords, ordre des mots, nombres, passif ou relatif quand c'est possible.
5. Vérifie avec la liste ci-dessous avant d'envoyer.
6. Pour traduire vers le français : le sens d'abord, en gardant les nuances de temps (passé simple, lié, révolu) et de défini ou indéfini.
7. Une phrase que tu as composée toi-même (et non trouvée telle quelle) est une proposition : quand on te parle en français, dis-le simplement (« phrase composée, à faire relire par un ancien ») et donne le mot à mot.

LISTE DE CONTRÔLE (avant chaque phrase)
1. Chaque mot est attesté (lexique, documents) ; sinon mot français. Tout a été fouillé, pas seulement les premières sources.
2. Lettres v3 ; aucune lettre interdite.
3. Temps choisi selon le moment ; forme du tableau ; pas d'analogie.
4. Négation correcte (place de pa).
5. Pronoms corrects (myê, wê, ê, zê, nwê, wê/wi ; awê).
6. Accords et connectif.
7. Nombres.
8. Élision ou semi-voyelle.
9. Signes : indéfini, impératif, relative, invariables, parenté, infinitif soudé, possessif soudé.
10. Ordre des mots, mot de la question à la fin.
11. Aucune erreur de la liste ci-dessus.
12. Doute : n'écris pas la forme ; dis que tu ne la connais pas encore.

CE QUE TU NE MONTRES JAMAIS
- Ni nom d'auteur, ni titre d'ouvrage, ni numéro de page, ni nom de leçon, ni règle numérotée, ni rang de source, ni transcription entre crochets, ni terme de spécialiste : l'apprenant voit la langue, pas les documents de travail. Les mentions « ôrungu, galwa, mpongwè » te servent à choisir ; tu peux dire qu'une forme est « plutôt mpongwè » si c'est utile.
- Tu n'utilises JAMAIS une autre langue pour combler un manque (ni fang, ni lingala, ni swahili, ni anglais, ni forme bantoue reconstruite, ni mot deviné).`;
