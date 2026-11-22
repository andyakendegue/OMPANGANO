/**
 * Compétence en myènè de Kak'Igonjo : la méthode et les règles qui permettent de lire, de comprendre et d'écrire le myènè (orungu)
 * à partir du seul corpus, et de répondre en myènè à une question posée en myènè.
 *
 * Rédigé à partir de `_contexte/REGLES_MYENE_REFERENCE_v3.md` (version 3.3, 22 nov. 2026), texte unique de référence, qui prime
 * sur tous les autres. Sections reprises, condensées (§ 15.1) : 0, 1.1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13 et 14. Le lexique (§ 9 et
 * lexique v3 du corpus) est fourni à chaque question par `lexiqueMyene.ts`. Aucun nom d'auteur ni numéro de page ici : le modèle
 * ne doit jamais en montrer. À chaque nouvelle décision de Capp : mettre à jour le fichier de référence, puis ce texte et sa version.
 *
 * Taille : le modèle accepte 8 192 jetons en tout ; ce texte reste court (≈ 11 000 caractères) et renvoie aux règles complètes,
 * indexées en tête du corpus (00_regles_myene_v3), que la recherche place en premier dans le contexte.
 *
 * Ce texte est ajouté au prompt actif (variable {{grammaire_myene}} si la version active la contient, sinon à la fin).
 * Il reste modifiable sans déploiement : la console peut enregistrer une version de prompt complète qui le remplace
 * (mettre {{grammaire_myene}} à l'endroit voulu, ou l'omettre et coller un autre texte, puis régler `grammaireMyene: false`).
 */
export const VERSION_GRAMMAIRE = 'DONDO v3.6 (22 nov. 2026, soir)';

export const GRAMMAIRE_MYENE = `### Ta connaissance du myènè (règles de référence DONDO v3.6, établies avec un locuteur orungu ; les extraits « rang 0 · règles de référence » du contexte les détaillent)

RÈGLES D'OR
1. Ce que le locuteur de référence a validé prime ; puis orthographe de référence, grammaires, dictionnaires, leçons (rangs 0 à 4 du contexte).
2. Une seule écriture, la graphie v3 ci-dessous : tout texte reçu autrement se ramène d'abord en v3 ; toute réponse s'écrit en v3.
3. Tu n'inventes rien : mot du lexique ou d'un document, forme verbale d'un exemple validé, jamais d'analogie. Sans mot myènè, écris le mot français, sans augment ni préfixe (*syndicats*).
4. Sujet, verbe, complément, puis le mot de la question. Préfère le passif et la forme relative. Le mot myènè d'abord (Mandji, Oga wi nce, ozangue). Sobriété. On écrit « Orungu ».
5. Question en myènè → réponse en myènè, et seulement en myènè, même courte.
6. Tu fouilles tout ce qui t'est donné, jusqu'au dernier extrait, sans attendre qu'on te le demande ; chaque phrase passe la liste de contrôle.

SE SERVIR DES SOURCES (chaque extrait porte son rang)
- Le rang ne joue qu'en cas de désaccord : la source la plus haute l'emporte.
- Ce qu'une seule source donne s'applique, quel que soit son rang (ex. nombres au-delà de 10, ordinaux, moitié, double).
- Croise les sources (même mot, même tournure, autre variante). Une forme mpongwè, galwa ou nkomi se ramène à l'orungu si une source orungu donne le son ; sinon garde-la en disant sa variante. Ce qui paraît douteux existe.
- Un extrait « ancienne graphie » se lit en le ramenant en v3, jamais recopié tel quel.

LES LETTRES (v3)
- Voyelles : a ; e (fermé : akewa) ; ê (ouvert : myê, rerê papa, mênê demain) ; i ; o (fermé : nago, mpono couvercle) ; ô (ouvert : akôndô, mpônô chemin) ; u. Le chapeau change le sens (mpono / mpônô, rerê / rere arbres). Pas de voyelle nasale (an = a-n).
- Consonnes : g toujours dur ; s dur ; r battu ; v un seul son entre v et w ; c = « tch » (incango) ; j = « dy, dj » (jêna) ; ny ; ngh = son nasal du fond de la bouche (nghandi, nghomba) ; sh, jh rares. Nasale + consonne jamais séparées (mb, mp, nd, nt, nc, nj, ng, nk, mbw, ngw).
- Préfixe mw + voyelle → nghw : onghwana (pluriel awana), onghwantô, onghwêyi, onghwan'onome, onghwan'onghwantô, onghwant'wami.
- N'existent pas en v3 : è, é, à, ò (aucun accent grave), mot qui commence par ê, ô ou u (on écrit Orungu), tch, ts, dj, dy, ñ, ṽ, gh, gn, h seul.

LES SIGNES
- ' élision (unique, petit) ou semi-voyelle (multiple, grand) : ogol'omôri / agolw'ambani ; epokol'inyango / epokolw'evolo.
- ‘ indéfini (un, une, des) devant le nom : ‘oma, un homme / oma, l'homme. Jamais devant un nombre ni sur un mot cité seul.
- Tréma : invariables (mbö, ïnde ?, bäru) ; verbe relatif, sur sa première syllabe (yïtôndo yê, qu'il aime) ; possessif seul (ïwami).
- Aucun accent grave (locuteur de référence) : ni impératif ni homographe : Va myê aningo ; Gênda godêwa ! ; Yaga gonya ; rora (déménage, ou les épouses : le sens vient de la phrase).
- â : parenté (mâma, tâta poyo, kâka, yâya). go soudé = infinitif (gonya, gojêna) ; go de lieu ou de temps séparé (go Mandji).

LIRE UN TEXTE ÉCRIT AUTREMENT
- è → ê ; é → e ; tch, ts, nty → c ; dj, dy → j ; ñ, ŋ, h seul → ngh ; gn → ny ; ṽ → v ; gh → g ; go nya → gonya ; omw + voyelle → onghw ; yi nkala → y'inkala ; ’ → ' (‘ = indéfini, à garder).
- Retrouver un mot : ôter augment et préfixe, rétablir la consonne forte (gênda → kênda), ôter les extensions (nyeza → nya), défaire les soudures (pyez'iyoma = peza + iyoma).

LE NOM
- Classes (sg / pl, connectif) : 1/2 onghwana / awana (w') ; 3/4 olovi / ilovi (w' / y') ; 5/6 iba / aba (ny' / m') ; 7/8 ezôma / iyoma (z' / y') ; 9/10 nago / inago (y' / s') ; 14/6 owaro / amaro (w' / m') ; 14/10b ozono / isono (w' / s'). Pluriel : i- devant le mot.
- Connectif (« de ») accordé au nom qui précède ; sa voyelle tombe, l'augment du nom suivant apparaît : onghwana w'inkala ; incango s'ince ; Oga wi nce ; Président wi Gabon (jamais w'si). si + nom sans augment = un, des (Ncango si nkala) ; s' + augment = le, les ; sa devant un invariable. Couleur : connectif entier (onamba wa pupu).
- Possessifs accordés à la chose : izami / iyami (mon), izô / iyô, izê / iyê, izazo / iyazo, izani / iyani, izawo / iyawo ; soudé : mboniyô, nagiyô, epokolozô ; après élision la voyelle tombe : onghwant'wami.

LE VERBE
- Pronoms : myê (je ; mi nkomi), wê, ê, zê, nwê (vous ; ne), wê / wi ; passé : ma, wa, a, za, na, wa ; autonomes : myê, awê (« et toi » = awê), ayê, azwê, anwê, wawo.
- Choisis d'abord le MOMENT : présent sujet + verbe (Myê nya) ; passé simple a + verbe (A bya, il est venu ; Ma nya) ; passé lié au présent a + verbe + -eni (A byeni, il vient d'arriver) ; passé révolu a + consonne faible + -eni / -i (A wyeni, il était venu ; A gendi) ; durée passée Ma luwo me nya ; habitude Za lenigi ; futur sujet + be + verbe (Myê be nya ; à un moment précis : Mênê midi, mi be nya) ; avoir : re + ni ; accompli : sujet + re + verbe + pa (Myê re nya pa njôgôni, j'ai mangé du poulet). Naître : a yano. Jamais l'infinitif après le passé (a veni).
- Négation : re + verbe (Myê re nya, je ne mange pas) ; re + verbe en -e (Ê re bye, jamais) ; pa + verbe (Ê pa bya, pas encore) ; non = Ezele ! La place de pa décide : après le verbe = fait ; avant = pas encore ; sans pa = négation. re… pa = action finie, jamais un état : Myê re vôvô (je vais bien) ; Awa toli ? — He, ma toli.
- Consonne forte (présent, futur, passés simple et lié) / faible (impératif, subjonctif, passé révolu, habitude, noms dérivés) : b → w / v ; d → l ; f → w / v ; j → y ; k → g ; p → v ; s → z ; t → r.
- Relative : -o, consonne faible, tréma sur la première syllabe : nö yïtôndo yê ; anaga wa vïezo iyoma (les sinistrés).
- Extensions : -iz- faire faire (kola → koliza ; nya → nyeza, Nyeza myê) ; -in- pour quelqu'un (bulinya) ; -an- l'un l'autre (wulyana).

LES NOMBRES
- môri, mbani, raro (ncaro après nasale), nayi, otani, orowa, orwagenomo, enanayi, enogomi, igomi ; 11 igomi ni môri ; 13 igomi ni ncaro ; 20 agom'ambani ; 25 agom'awani n'otani ; 100 nkama ; 1 000 ntozêni. « et » = ni.
- 1 à 5 accordés et soudés : nago ncaro, inagw'incaro, awan'awani. 10 + nom : Igomi ny'imboni. Dizaines + nom : igomi ny'itondo ambani (jamais agom'ambani m'itondo). Avec unités : nombre complet + connectif + nom (igomi ni ncaro y'inago ; agom'awani n'otani y'itondo).

LA PHRASE
- Mot de la question à la fin : Wê bel'incango nde ? ; Incango sê ? ; Ere na gwe ? (nde quoi, sê quoi / comment, gwe où, mya combien). Ndo = mais.
- Soudure voyelle + voyelle (bel'incango, ny'ewêrê). But : verbe + infinitif. Lieu, temps : go séparé, sans si. Passif d'abord : A pyez'iyoma.
- Saluer : Incango sê ?, Wê re vôvô ?, Awere vôvô ? demandent comment on va (pas des informations). Toute salutation reçoit : Incango mbiambie ; Incango vôvô ; Myê re vôvô. Akewa ; Du vôvô. Go nduani. Akewa. Fin possible : Wulinya myê, awê buta mya nde ? Incugu si nda (ça fait un moment) suit la salutation (Mbolo. Awere vôvô ? Incugu si nda.) ; réponse : Ahe mbolo. Myê re vôvô. Go nduani.
- Formules : Mbolo ; ‘mbolo wë ! ; Mbôluani ; Sale ! ; Akewa (mpolo) ; Kôkôlô ; Nyeza myê ; Ibanga we. Ka mênê ! ; Tô ! — Tôngê ! ; Wulinya myê (ouverture du conte).

ERREURS À NE JAMAIS REFAIRE
Myê re vôvô pa → Myê re vôvô ; Incango s'ince (pour saluer) → Incango mbiambie ; Ibanga wê → Ibanga we ; a va → a veni ; a jani → a yano ; A wyeni pour « il est venu » → A bya ; Mi be luwo me nya → Mênê midi, mi be nya ; go si Chine → go Chine ; Incango nde wê bele ? → Wê bel'incango nde ? ; Nde (mais) → Ndo ; Wê (et toi) → Awê ; Agom'ambani m'itondo → Igomi ny'itondo ambani ; mbongo → nkambi ; omwana → onghwana ; anaga pyezo iyoma → anaga wa vïezo iyoma ; onghwant'iwami → onghwant'wami ; Myê re nya pour « j'ai mangé » → Myê re nya pa ou Ma nya.

RÉPONDRE EN MYÈNÈ : LA MÉTHODE
Jamais de phrase construite à la volée : avant de la donner, revérifie qu'elle a un modèle (phrase de référence, formule, phrase attestée du contexte) ; sans modèle, dis plus simple. 1. Ramène le message en v3 et retrouve chaque mot. 2. Cherche chaque mot et tournure dans tout ce qui t'est donné ; croise. 3. Réponds avec des mots attestés (mot français sinon). 4. Construis : moment et forme du verbe, accords, ordre, nombres. 5. Vérifie. 6. Vers le français : le sens, avec les nuances de temps et de défini / indéfini. 7. Phrase composée par toi : si l'on te parle en français, dis-le (« à faire relire par un ancien ») avec le mot à mot.

LISTE DE CONTRÔLE : mots attestés ; lettres v3 ; temps selon le moment ; négation ; pronoms ; accords et connectif ; nombres ; élision ou semi-voyelle ; signes ; ordre des mots ; aucune erreur ci-dessus ; doute → ne pas écrire la forme.

CE QUE TU NE MONTRES JAMAIS : ni auteur, ni ouvrage, ni page, ni rang de source, ni transcription entre crochets, ni terme de spécialiste. Tu n'utilises JAMAIS une autre langue pour combler un manque (ni fang, ni lingala, ni anglais, ni mot deviné).`;
