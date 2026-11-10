// FICHIER GÉNÉRÉ par apps/nkala/scripts/extraire-textes-web.cjs depuis src/components/TermsConsentModal.tsx — ne pas modifier à la main.
// Les {{expressions}} sont des valeurs dynamiques à remplacer à l'affichage.
import type { BlocTexte } from './blocs';
export const TEXTES_CONDITIONS: Record<string, BlocTexte[]> = {
  "consentement": [
    {
      "type": "texte",
      "texte": "Formulaire de Consentement du Contributeur Individuel Validation Requise"
    },
    {
      "type": "p",
      "texte": "Je soussigné(e) {{userName}}, né(e) le {{userBirthDate}} à {{userBirthPlace}}, agissant à titre de Contributeur Individuel sur la plateforme Nkala, déclare avoir été informé(e) et accepter les points suivants :"
    },
    {
      "type": "p",
      "texte": "J'accepte que mes textes, traductions, annotations culturelles, images et enregistrements vocaux soient collectés et utilisés par Essaka Engineering (RCCM RG/POG 2022 A 1290, Port-Gentil, Gabon) dans le cadre du programme participatif Nkala et des projets associés."
    },
    {
      "type": "p",
      "texte": "Ces données servent à entraîner, évaluer et améliorer des modèles d'intelligence artificielle valorisant les langues et cultures gabonaises, exploités notamment dans l'application Nkala."
    },
    {
      "type": "p",
      "texte": "Ma participation individuelle est valorisée par un système de Points d'Expérience (XP), de Rangs culturels, de Badges honorifiques et de Défis hebdomadaires, pouvant donner lieu à des récompenses et distinctions en fonction de mes accomplissements validés."
    },
    {
      "type": "p",
      "texte": "Conformément à la loi gabonaise n° 001/2011 et aux prescriptions de la CNPDCP, je dispose à tout moment d'un droit d'accès, de rectification, de suppression (sous 60 jours) et de retrait de mon consentement. Mes données brutes ne sont jamais revendues à des tiers."
    },
    {
      "type": "p",
      "texte": "Je participe librement et conserve mes droits d'auteur sur mes contributions conformément à l'Accord de Bangui (OAPI Annexe VII), en accordant à Essaka Engineering une licence non exclusive. Je m'engage à fournir des contributions authentiques, sans fraude ni usurpation."
    },
    {
      "type": "label",
      "texte": "Pour un contributeur mineur (Nom & qualité du parent ou représentant légal – facultatif si majeur) :"
    },
    {
      "type": "h3",
      "texte": "Validation des Conditions & Autorisations Individuelles"
    },
    {
      "type": "label",
      "texte": "J'accepte les Conditions Générales de la plateforme Nkala applicables aux contributeurs individuels (Droits, engagements de qualité, propriété intellectuelle et système de points, badges et récompenses). * (Obligatoire)"
    },
    {
      "type": "label",
      "texte": "Je valide l'utilisation de mes données personnelles et linguistiques par Essaka Engineering pour la sauvegarde patrimoniale, l'entraînement et l'exploitation des Modèles IA dans Nkala. * (Obligatoire)"
    },
    {
      "type": "label",
      "texte": "J'autorise l'usage de ma voix (enregistrements audio et prononciations en langue Myènè) aux seules fins d'entraînement IA, sans clonage trompeur ni atteinte à ma dignité."
    },
    {
      "type": "label",
      "texte": "J'autorise l'usage de mon image ou des photos culturelles que je partage (facultatif)."
    },
    {
      "type": "label",
      "texte": "Signature électronique (« Lu et approuvé » suivi de votre nom) *"
    },
    {
      "type": "texte",
      "texte": "Validé électroniquement sur Nkala"
    },
    {
      "type": "texte",
      "texte": "Date : {{new Date().toLocaleDateString('fr-FR')}}"
    },
    {
      "type": "texte",
      "texte": "Statut : Contributeur Individuel"
    },
    {
      "type": "button",
      "texte": "{{isSubmitting ? ( <> <span className=\"w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin\" /> <span>Enregistrement de votre consentement...</span> </> ) : ( <> <ShieldCheck className=\"w-5 h-5 text-[#fde047]\" /> <span>Signer & Valider mes Conditions et l'Utilisation de mes Données</span> <Sparkles className=\"w-4 h-4 text-[#fde047]\" /> </> )}}"
    }
  ],
  "conditions": [
    {
      "type": "texte",
      "texte": "Charte de Contribution Individuelle & Système de Récompenses • Nkala"
    },
    {
      "type": "h3",
      "texte": "Entre Essaka Engineering et le Contributeur Individuel"
    },
    {
      "type": "p",
      "texte": "ESSAKA ENGINEERING, siège social situé au Quartier SALSA, Port-Gentil (Gabon), immatriculée au RCCM sous le n° RG/POG 2022 A 1290, NIF n° 202302004939, représentée par M. MIGOUMBI AKENDEGUE CAPP ANDY (Gérant / Fondateur), d'une part, et toute personne physique inscrite en qualité de Contributeur Individuel sur la plateforme Nkala, d'autre part."
    },
    {
      "type": "h4",
      "texte": "Article 1 – Préambule & Définitions"
    },
    {
      "type": "p",
      "texte": "Essaka Engineering développe des modèles d'intelligence artificielle adaptés aux réalités gabonaises, notamment aux langues et cultures locales. Pour entraîner ces modèles, Essaka a conçu Nkala, une plateforme participative collectant des textes, traductions, images et enregistrements vocaux auprès de contributeurs individuels. Essaka exploite par ailleurs l'application Nkala, dans laquelle les modèles entraînés sont utilisés."
    },
    {
      "type": "li",
      "texte": "Nkala : plateforme de crowdsourcing d'Essaka destinée à la collecte et à la validation de données linguistiques et culturelles."
    },
    {
      "type": "li",
      "texte": "Nkala : application d'Essaka dans laquelle les Modèles IA sont exploités."
    },
    {
      "type": "li",
      "texte": "Modèles IA : modèles d'apprentissage automatique d'Essaka, entraînés en tout ou partie grâce aux Données des Contributeurs."
    },
    {
      "type": "li",
      "texte": "Contributeur : toute personne physique inscrite sur Nkala fournissant ou validant des Données à titre individuel."
    },
    {
      "type": "li",
      "texte": "Données : textes, traductions, enregistrements vocaux, images et métadonnées associées fournis par le Contributeur."
    },
    {
      "type": "li",
      "texte": "Points d'Expérience (XP), Rangs & Badges : système de valorisation mesurant les accomplissements validés du Contributeur et donnant accès à des distinctions et récompenses."
    },
    {
      "type": "h4",
      "texte": "Articles 2 & 3 – Engagements du Contributeur et d'Essaka"
    },
    {
      "type": "p",
      "texte": "Engagements du Contributeur : Le Contributeur s'engage à fournir des contributions sincères et de qualité (clarté des enregistrements vocaux, exactitude des textes et dialectes Myènè, respect des consignes) et garantit ne transmettre aucun contenu illicite, diffamatoire ou portant atteinte aux droits de tiers."
    },
    {
      "type": "p",
      "texte": "Engagements d'Essaka Engineering : Essaka s'engage à fournir un accès sécurisé à Nkala, à utiliser les Données uniquement dans le cadre défini aux présentes conditions, à chiffrer et protéger les Données, et à comptabiliser de manière transparente les Points d'Expérience (XP), les badges et les accomplissements de chaque Contributeur pouvant donner lieu à des récompenses."
    },
    {
      "type": "h4",
      "texte": "Article 4 – Autorisation d'Utilisation des Données"
    },
    {
      "type": "p",
      "texte": "4.1 Étendue et caractère non exclusif : Le Contributeur autorise Essaka Engineering, à titre non exclusif et pour le monde entier, à reproduire, enregistrer, annoter, transformer, stocker et utiliser ses Données pour entraîner, évaluer, améliorer et exploiter les Modèles IA, y compris au sein de l'application Nkala."
    },
    {
      "type": "p",
      "texte": "4.2 Protection de la voix et de l'image : Le Contributeur autorise l'usage de sa voix (et facultativement de son image) aux seules fins d'entraînement IA décrites ci-dessus. Essaka s'interdit formellement d'utiliser la voix ou l'image du Contributeur pour créer des contenus trompeurs imitant une personne identifiable (deepfakes) ou portant atteinte à sa dignité ou à sa réputation."
    },
    {
      "type": "h4",
      "texte": "Article 5 – Protection des Données Personnelles (Loi n° 001/2011 & CNPDCP)"
    },
    {
      "type": "p",
      "texte": "Le traitement des données personnelles respecte la loi gabonaise n° 001/2011 du 25 septembre 2011 relative à la protection des données à caractère personnel ainsi que les prescriptions de la Commission Nationale pour la Protection des Données à Caractère Personnel (CNPDCP)."
    },
    {
      "type": "p",
      "texte": "Chaque Contributeur dispose d'un droit d'accès, de rectification, d'opposition et de suppression de ses Données, ainsi que du droit de retirer son consentement à tout moment. En cas de retrait, Essaka cesse d'utiliser les Données pour de nouveaux entraînements et les supprime de ses bases dans un délai maximal de 60 jours. Engagement de non-revente : Essaka ne vend ni ne cède jamais les Données brutes des Contributeurs à des tiers."
    },
    {
      "type": "h4",
      "texte": "Article 6 – Propriété Intellectuelle (Accord de Bangui OAPI)"
    },
    {
      "type": "p",
      "texte": "Le Contributeur reste titulaire des droits d'auteur et droits voisins sur ses Données conformément à l'Accord de Bangui instituant l'Organisation Africaine de la Propriété Intellectuelle (OAPI) et à son Annexe VII sur la propriété littéraire et artistique. Essaka Engineering demeure seule propriétaire des Modèles IA, des applications Nkala, de leur code source et de leur documentation."
    },
    {
      "type": "h4",
      "texte": "Articles 7 & 8 – Système de Points (XP), Badges, Rangs et Récompenses d'Accomplissement"
    },
    {
      "type": "p",
      "texte": "La participation individuelle sur Nkala est bénévole et repose sur un système de reconnaissance et de gamification culturelle : chaque action validée (enregistrement vocal, traduction ou variante orthographique, note contextuelle, validation de pairs ou défi thématique) rapporte des Points d'Expérience (XP)."
    },
    {
      "type": "p",
      "texte": "Ces Points XP permettent de gravir les 5 Rangs Culturels (de « Initié Curieux » à « Sage Ancien ») et de débloquer des Badges honorifiques attestant de l'expertise et de l'assiduité du Contributeur. En fonction des accomplissements réalisés, des paliers atteints et du classement communautaire, Essaka Engineering peut attribuer des récompenses, distinctions, accès privilégiés ou dotations spéciales aux contributeurs les plus méritants."
    },
    {
      "type": "h4",
      "texte": "Articles 9 à 12 – Éthique, Anti-Fraude et Droit Applicable"
    },
    {
      "type": "p",
      "texte": "Éthique et Anti-Fraude : Toute contribution frauduleuse (données falsifiées, enregistrements générés artificiellement et présentés comme humains, ou créations de comptes multiples sous fausse identité) entraîne l'annulation des Points (XP), badges et récompenses correspondants ainsi que la suspension du compte après notification."
    },
    {
      "type": "p",
      "texte": "Droit applicable : Les présentes conditions sont régies par le droit gabonais. En cas de différend, une solution amiable est recherchée en priorité dans un délai de 30 jours avant toute saisine des juridictions compétentes de Port-Gentil (Gabon)."
    },
    {
      "type": "button",
      "texte": "Retourner au Formulaire de Consentement pour Valider →"
    }
  ],
  "recompenses_badges": [
    {
      "type": "h4",
      "texte": "1. Barème des Points d'Expérience (XP) par Accomplissement"
    },
    {
      "type": "p",
      "texte": "Chaque contribution sur Nkala vous fait gagner des Points d'Expérience (XP). Vos points s'accumulent pour faire progresser votre rang et débloquer des badges et récompenses."
    },
    {
      "type": "texte",
      "texte": "Type d'Accomplissement"
    },
    {
      "type": "texte",
      "texte": "Gain en Points (XP)"
    },
    {
      "type": "texte",
      "texte": "Impact & Valorisation"
    },
    {
      "type": "texte",
      "texte": "🎙️ Enregistrement vocal en langue Myènè"
    },
    {
      "type": "texte",
      "texte": "+30 à +50 XP"
    },
    {
      "type": "texte",
      "texte": "Enrichit le corpus sonore & débloque les badges vocaux"
    },
    {
      "type": "texte",
      "texte": "✍️ Proposition de traduction ou variante écrite"
    },
    {
      "type": "texte",
      "texte": "+20 à +35 XP"
    },
    {
      "type": "texte",
      "texte": "Préserve l'orthographe et les nuances dialectales"
    },
    {
      "type": "texte",
      "texte": "🔍 Validation / revue d'une contribution tierce"
    },
    {
      "type": "texte",
      "texte": "+15 à +25 XP"
    },
    {
      "type": "texte",
      "texte": "Garantit la fiabilité linguistique du corpus IA"
    },
    {
      "type": "texte",
      "texte": "📜 Filiation & Généalogie complète vérifiée"
    },
    {
      "type": "texte",
      "texte": "+50 XP + Badge"
    },
    {
      "type": "texte",
      "texte": "Ancre vos contributions dans votre ethnie, clan et village"
    },
    {
      "type": "texte",
      "texte": "🏆 Défi Hebdomadaire complété"
    },
    {
      "type": "texte",
      "texte": "+200 à +300 XP"
    },
    {
      "type": "texte",
      "texte": "Bonus majeur d'XP + Badge exclusif de Défi"
    },
    {
      "type": "h4",
      "texte": "2. Les 5 Niveaux & Rangs Culturels de Nkala"
    },
    {
      "type": "texte",
      "texte": "Niveau 1 • Initié Curieux (0 – 150 XP)"
    },
    {
      "type": "p",
      "texte": "Découvre les sonorités et les premiers mots du patrimoine."
    },
    {
      "type": "texte",
      "texte": "Niveau 2 • Conteur des Lagunes (150 – 450 XP)"
    },
    {
      "type": "p",
      "texte": "Reconnaît la finesse des accents et du vocabulaire des lacs et fleuves."
    },
    {
      "type": "texte",
      "texte": "Niveau 3 • Gardien du Verbe (450 – 1 000 XP)"
    },
    {
      "type": "p",
      "texte": "Enregistre avec justesse et apporte des variantes orthographiques précises."
    },
    {
      "type": "texte",
      "texte": "Niveau 4 • Maître de la Parole (1 000 – 2 500 XP)"
    },
    {
      "type": "p",
      "texte": "Pilier de la transmission orale respecté par toute la communauté."
    },
    {
      "type": "texte",
      "texte": "👑 Niveau 5 • Sage Ancien (2 500+ XP)"
    },
    {
      "type": "p",
      "texte": "Autorité vivante sur la langue et les traditions orales Omyènè."
    },
    {
      "type": "h4",
      "texte": "3. Badges Honorifiques & Récompenses liées aux Accomplissements"
    },
    {
      "type": "li",
      "texte": "Badges de Maîtrise Permanente : Débloquez des distinctions telles que 📜 Filiation Nkala, 🎙️ Première Voix, 🪶 Passeur de 10 Mots, 👂 Oreille de l’Aîné, 🌊 Gardien des Lacs (assiduité) et 👑 Maître du Verbe."
    },
    {
      "type": "li",
      "texte": "Badges de Défis Hebdomadaires : Triomphez des missions thématiques pour obtenir 🎣 Maître des Eaux & Pêche, 👑 Mémoire des Rois & Clans, 🎙️ Écho d’Or Ancestral ou 🐆 Pisteur de la Savane."
    },
    {
      "type": "li",
      "texte": "Récompenses selon vos Accomplissements : Vos points (XP), votre rang dans le classement des Gardiens, vos badges débloqués et la qualité de vos contributions validées peuvent donner lieu à des récompenses spéciales, distinctions honorifiques, accès privilégiés aux fonctionnalités Nkala, promotions au rôle de Validateur Certifié ou dotations communautaires lors des événements et campagnes organisés par Essaka Engineering."
    },
    {
      "type": "button",
      "texte": "Aller au Formulaire de Consentement pour Signer →"
    }
  ]
};
