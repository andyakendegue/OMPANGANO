// FICHIER GÉNÉRÉ par apps/nkala/scripts/extraire-faq-web.mts depuis src/components/ContributionFaqSection.tsx — ne pas modifier à la main.
export type CategorieFaq = 'tribus_vs_clans' | 'orthographe_tons' | 'sens_francais' | 'audio_voix' | 'validation_xp' | 'hors_ligne';
export interface EntreeFaq {
  id: string; question: string; shortSummary: string; answerParagraphs: string[];
  examples?: { label: string; detail: string }[]; category: CategorieFaq; tags: string[]; isImportantRule?: boolean;
}
export const CATEGORIES_FAQ: { id: 'all' | CategorieFaq; label: string }[] = [
  {
    "id": "all",
    "label": "Toutes les règles"
  },
  {
    "id": "tribus_vs_clans",
    "label": "Tribus vs Clans (Règle d’Or)"
  },
  {
    "id": "orthographe_tons",
    "label": "Orthographe & Tons (Étape 1)"
  },
  {
    "id": "sens_francais",
    "label": "Sens Français & Nuances (Étape 2)"
  },
  {
    "id": "audio_voix",
    "label": "Enregistrement Vocal (Étape 3)"
  },
  {
    "id": "validation_xp",
    "label": "Validation & Points XP"
  },
  {
    "id": "hors_ligne",
    "label": "Mode Hors-Ligne"
  }
];
export const FAQ_CONTRIBUTION: EntreeFaq[] = [
  {
    "id": "faq-tribus-vs-clans-regle-fondamentale",
    "question": "Pourquoi les questions et les variantes orthographiques ou tonales sont-elles classées par Tribu et jamais par Clan ?",
    "shortSummary": "Règle linguistique fondamentale : en langue Omyènè, les différences d’orthographe, de vocabulaire et de tonalité existent uniquement entre les 6 Tribus (Mpongwè, Adyumba, Enenga, Nkomi, Galoa, Ôrungu) et non entre les Clans.",
    "answerParagraphs": [
      "En linguistique Myènè (Omyènè), il ne faut jamais confondre la Tribu (sous-groupe dialectal et géographique) et le Clan (« mbuwé » : lignée exogamique issue d’un ancêtre commun ; le lignage se dit « ozombi »).",
      "Les différences orthographiques, phonétiques et tonales ne concernent que les 6 Tribus Myènè : Mpongwè, Adyumba, Enenga, Nkomi, Galoa et Ôrungu. Deux personnes appartenant à deux clans différents (par exemple Abulya et Agenje chez les Ôrungu) parlent exactement la même variété tribale Ôrungu, avec la même grammaire, la même orthographe et les mêmes tons.",
      "C’est pourquoi toutes les questions du corpus Nkala sont filtrées et catégorisées par Tribu (et par Thème culturel : pêche, faune, vie quotidienne, proverbes...), et jamais dans des « catégories claniques ». Votre clan dans votre profil sert uniquement à préserver la mémoire généalogique et coutumière."
    ],
    "examples": [
      {
        "label": "Différence entre Tribus (Dialectes)",
        "detail": "Certaines consonnes ou inflexions tonales varient selon que l’on s’exprime en Mpongwè (Estuaire), en Ôrungu (Delta/Port-Gentil), en Nkomi (Fernan-Vaz) ou en Enenga / Galoa (Moyen-Ogooué et Lacs)."
      },
      {
        "label": "Unité linguistique des Clans au sein d’une Tribu",
        "detail": "Les 21 clans Ôrungu (Abulya, Agalikewa, Agenje, Ajena, Aziza...) partagent tous la même langue Ôrungu sans différence orthographique ni tonale entre clans."
      }
    ],
    "category": "tribus_vs_clans",
    "tags": [
      "tribu",
      "clan",
      "dialecte",
      "orthographe",
      "ton",
      "tonalité",
      "orungu",
      "enenga",
      "mpongwe",
      "galoa",
      "nkomi",
      "adyumba",
      "filtre",
      "catégorie"
    ],
    "isImportantRule": true
  },
  {
    "id": "faq-etape-1-orthographe-tribale",
    "question": "Étape 1 : Comment valider l’orthographe Myènè ou proposer la variante de ma Tribu ?",
    "shortSummary": "Vérifiez si l’écriture affichée correspond à l’usage de votre tribu. Si votre tribu l’écrit ou le prononce différemment, cliquez sur « Proposer ma variante » et sélectionnez votre Tribu.",
    "answerParagraphs": [
      "Lorsque vous consultez une fiche sur la page principale, observez attentivement la phrase en Myènè et l’étiquette de la Tribu affichée en haut de la carte.",
      "Si l’orthographe proposée est exacte dans votre tribu, laissez sélectionné « Oui, l’orthographe est exacte ».",
      "Si vous constatez une faute de frappe, une voyelle mal accentuée (`è`, `ô`) ou si votre Tribu emploie une tournure ou une graphie différente, sélectionnez « Non, proposer ma variante », saisissez votre orthographe corrigée et choisissez la Tribu correspondante (Ôrungu, Enenga, Mpongwè, Galoa, Nkomi ou Adyumba)."
    ],
    "examples": [
      {
        "label": "Voyelles ouvertes et nasales en Myènè",
        "detail": "Utilisez « è » (e ouvert) et « ô » (o ouvert) pour distinguer les timbres vocaliques, ainsi que les groupes nasaux « mb », « nd », « ng », « ny », « mp », « nt », « nk »."
      },
      {
        "label": "Élision vocalique courante",
        "detail": "En Myènè parlé comme écrit, la rencontre de deux voyelles entraîne souvent une élision marquée par l’apostrophe : ex. « Nyam’okwéndé » (l’animal qui a une queue), « Mbya y’omôri » (le bien d’autrui), « Nkala y’inongo » (la maison du peuple)."
      }
    ],
    "category": "orthographe_tons",
    "tags": [
      "orthographe",
      "écriture",
      "variante",
      "étape 1",
      "alphabet",
      "voyelle",
      "accent",
      "élision",
      "apostrophe",
      "correction"
    ]
  },
  {
    "id": "faq-tons-et-prononciation-myene",
    "question": "Comment gérer les différences tonales et phonétiques entre les 6 Tribus Myènè ?",
    "shortSummary": "Le Myènè est une langue tonale (ton haut, ton bas, ton modulé). Le sens d’un mot peut changer selon la hauteur de la voix et la mélodie propre à chaque tribu.",
    "answerParagraphs": [
      "En Omyènè, deux mots peuvent s’écrire avec les mêmes lettres mais avoir deux sens différents selon que les syllabes portent un ton haut, un ton bas ou un ton descendant.",
      "De plus, la mélodie de la phrase (intonation finale et attaque consonantique) présente de subtiles variations entre les tribus maritimes/lagunaires (Mpongwè, Ôrungu, Nkomi) et les tribus fluviales/lacustres (Enenga, Galoa, Adyumba).",
      "Si la fiche affiche une transcription phonétique (API) ou si vous souhaitez signaler une nuance tonale propre à votre tribu, mentionnez-le dans le champ commentaire culturel et surtout faites-le entendre clairement lors de votre enregistrement vocal à l’Étape 3."
    ],
    "examples": [
      {
        "label": "Pourquoi l’audio complète l’écrit",
        "detail": "L’orthographe courante ne note pas toujours tous les tons sur chaque voyelle : c’est votre enregistrement vocal (Étape 3) rattaché à votre Tribu qui transmet à l’IA la hauteur tonale exacte."
      }
    ],
    "category": "orthographe_tons",
    "tags": [
      "ton",
      "tonalité",
      "phonétique",
      "api",
      "mélodie",
      "prononciation",
      "hauteur",
      "accentuation",
      "syllabe"
    ]
  },
  {
    "id": "faq-etape-2-signification-francaise",
    "question": "Étape 2 : Que faire si la traduction française proposée est inexacte, trop littérale ou incomplète ?",
    "shortSummary": "Avant même d’enregistrer votre voix, vous pouvez corriger le sens français, proposer une meilleure tournure ou ajouter un sens secondaire / métaphorique.",
    "answerParagraphs": [
      "Il arrive qu’une traduction française dans le corpus soit approximative, trop calquée mot à mot, ou qu’elle oublie le sens profond d’une expression idiomatique Myènè.",
      "Dans l’Étape 2 (« Signification française du texte Myènè »), vous disposez de 4 choix précis :",
      "1. « Sens français exact » : la traduction française correspond parfaitement au texte Myènè.",
      "2. « Signification plus exacte » : la traduction affichée est erronée ou imprécise ; vous indiquez la vraie signification.",
      "3. « Autre tournure française » : le sens est juste, mais vous proposez une formulation française plus naturelle ou élégante.",
      "4. « Sens secondaire / littéral / figuré » : très utile pour les proverbes et images poétiques où le Myènè possède à la fois un sens littéral (mot à mot) et un sens figuré ou coutumier."
    ],
    "examples": [
      {
        "label": "Exemple de double sens (littéral vs figuré)",
        "detail": "Une expression sur la pirogue ou le fleuve comme « Owaro-mfélo, ré nyènyo ngôri » signifie littéralement « Dans la pirogue d’autrui, ne prends pas tes aises », avec le sens figuré « respecte ce qui appartient aux autres »."
      }
    ],
    "category": "sens_francais",
    "tags": [
      "français",
      "signification",
      "traduction",
      "sens",
      "tournure",
      "secondaire",
      "littéral",
      "figuré",
      "proverbe",
      "étape 2",
      "exact"
    ]
  },
  {
    "id": "faq-etape-3-enregistrement-vocal",
    "question": "Étape 3 : Quelles sont les règles d’or pour réussir son enregistrement vocal en Myènè ?",
    "shortSummary": "Parlez dans un endroit calme, à allure naturelle, en prononçant le texte selon l’usage authentique de votre Tribu.",
    "answerParagraphs": [
      "Les enregistrements audio servent à entraîner les modèles de reconnaissance et de synthèse vocale (TTS) pour sauvegarder le patrimoine immatériel Omyènè.",
      "Placez-vous dans un lieu calme (sans télévision, musique, vent fort dans le microphone ni conversations en arrière-plan).",
      "Appuyez sur « Démarrer l’enregistrement », marquez une courte pause d’une demi-seconde, lisez la phrase en Myènè d’une voix claire, posée et naturelle (sans crier ni hâter le débit), puis appuyez sur « Arrêter ».",
      "Réécoutez systématiquement votre extrait grâce au lecteur intégré avant d’envoyer : si un mot est coupé au début ou à la fin, cliquez sur « Réenregistrer »."
    ],
    "examples": [
      {
        "label": "Quelle version lire au micro ?",
        "detail": "Si vous avez proposé une variante orthographique de votre Tribu à l’Étape 1, prononcez exactement cette variante tribale lors de votre enregistrement vocal."
      }
    ],
    "category": "audio_voix",
    "tags": [
      "audio",
      "voix",
      "micro",
      "microphone",
      "enregistrement",
      "étape 3",
      "prononciation",
      "bruit",
      "silence",
      "qualité"
    ]
  },
  {
    "id": "faq-filtrage-questions-par-tribu",
    "question": "Comment filtrer les questions pour ne voir que celles de ma Tribu ou d’une Tribu précise ?",
    "shortSummary": "Utilisez le sélecteur de Tribu en haut de la page principale ou dans l’onglet Explorer pour filtrer par Mpongwè, Adyumba, Enenga, Nkomi, Galoa ou Ôrungu.",
    "answerParagraphs": [
      "Sur la page principale (« Contribuer ») ainsi que dans l’onglet « Explorer », une barre de filtre par Tribu vous permet de sélectionner soit « Toutes les tribus », soit directement « Ma tribu », soit l’une des 6 tribus Myènè.",
      "Vous pouvez néanmoins contribuer sur une fiche initialement rédigée dans une autre tribu Myènè : il vous suffit d’indiquer à l’Étape 1 comment cette expression se dit ou s’écrit dans votre propre Tribu ! Cela permet justement de construire le dictionnaire comparatif inter-tribal."
    ],
    "category": "tribus_vs_clans",
    "tags": [
      "filtre",
      "filtrer",
      "tribu",
      "explorer",
      "question",
      "mpongwè",
      "adyumba",
      "enenga",
      "nkomi",
      "galoa",
      "ôrungu"
    ]
  },
  {
    "id": "faq-validation-aines-et-xp",
    "question": "Comment fonctionnent la validation par les Aînés et l’attribution des points XP ?",
    "shortSummary": "Chaque contribution rapporte des points XP immédiats (+15 XP écrit, +20 XP audio, +5 XP nuance française) et passe ensuite devant le collège des Validateurs.",
    "answerParagraphs": [
      "Dès que vous soumettez une contribution, vous recevez des points d’expérience (XP) qui font progresser votre rang coutumier dans le Classement (Initié Curieux → Conteur des Lagunes → Gardien du Verbe → Maître de la Parole → Sage Ancien).",
      "Les Validateurs et Aînés examinent séparément la justesse de l’écrit (orthographe de la tribu déclarée), la pertinence de la nuance française et la clarté de l’enregistrement oral.",
      "Une prononciation orale authentique peut être validée même si l’orthographe comporte une petite hésitation, et inversement."
    ],
    "category": "validation_xp",
    "tags": [
      "xp",
      "points",
      "récompense",
      "badge",
      "classement",
      "niveau",
      "validateur",
      "aîné",
      "approbation"
    ]
  },
  {
    "id": "faq-mode-hors-ligne-synchronisation",
    "question": "Puis-je contribuer au village ou en déplacement sans connexion Internet (Mode Hors-Ligne) ?",
    "shortSummary": "Oui ! Vos réponses écrites et vos enregistrements vocaux sont sauvegardés dans la mémoire locale de votre appareil et envoyés automatiquement dès le retour du réseau.",
    "answerParagraphs": [
      "L’application Nkala est conçue pour fonctionner même dans les zones à faible couverture réseau (villages riverains, lacs, déplacements).",
      "Vous pouvez télécharger un « Pack Hors-Ligne » depuis la barre supérieure avant votre départ, ou simplement continuer à répondre et enregistrer votre voix lorsque la connexion se coupe.",
      "Dès que votre téléphone ou ordinateur retrouve une connexion Internet, un bandeau synchronise automatiquement toutes vos contributions en attente de façon sécurisée sans aucune perte."
    ],
    "category": "hors_ligne",
    "tags": [
      "hors-ligne",
      "offline",
      "internet",
      "réseau",
      "avion",
      "synchronisation",
      "village",
      "pack"
    ]
  }
];
