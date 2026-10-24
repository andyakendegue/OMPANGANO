# 🇬🇦 OMPAGANO — NKALA APP
### Plateforme Participative de Crowdsourcing & Préservation de la Langue Myènè

> **OMPAGANO** (« Transmettre la parole » en langue Myènè) est une plateforme web moderne et inclusive dédiée à la collecte, l'enregistrement vocal haute fidélité, l'annotation et la sauvegarde numérique de la langue **Myènè** du Gabon et de ses six tribus (Enenga, Mpongwè, Galoa, Nkomi, Ôrungu, Adyumba).

---

## 📖 Sommaire
1. [Contexte Culturel & Linguistique Myènè](#-contexte-culturel--linguistique)
2. [Rôles & Contrôle d'Accès Strict (RBAC)](#-rôles--contrôle-daccès-strict-rbac)
3. [Studio des Validateurs (Nuance Oral vs Écrit)](#-studio-des-validateurs-nuance-oral-vs-écrit)
4. [Fonctionnalités Principales](#-fonctionnalités-principales)
5. [Stack Technique](#-stack-technique)
6. [Architecture & Structure du Répertoire](#-architecture--structure-du-répertoire)
7. [Modèle de Données (Firestore)](#-modèle-de-données-firestore)
8. [Installation & Développement Local](#-installation--développement-local)
9. [Déploiement Firebase Hosting Multi-Sites](#-déploiement-firebase-hosting-multi-sites)
10. [Configuration du Domaine Personnalisé](#-configuration-du-domaine-personnalisé)

---

## 🌿 Contexte Culturel & Linguistique

La langue **Myènè** (groupe B10 / Bantu) regroupe six communautés tribales historiques du Gabon :
- **Enenga** (*Lambaréné, Lac Zilé, Lac Onangué, Moyen-Ogooué*)
- **Mpongwè** (*Estuaire de Libreville*)
- **Galoa** (*Lambaréné, Ogooué central*)
- **Nkomi** (*Lagune Fernan Vaz, Ogooué-Maritime*)
- **Ôrungu** (*Mandji, Port-Gentil*)
- **Adyumba** (*Lac Azingo*)

> **Contexte de la tribu Enenga** : La langue commune est **le Myènè**. Le terme **Enenga** est employé exclusivement pour désigner la tribu Myènè originaire du Moyen-Ogooué (Lambaréné et région des lacs Onangué et Zilé) ainsi que ses clans et lignages historiques.

---

## 🛡️ Rôles & Contrôle d'Accès Strict (RBAC)

L'application applique un cloisonnement strict des privilèges sans mode démo ni accès non authentifié :

1. **Contributeurs (`user`)** :
   - Écran de collecte vocale (*Contribuer*)
   - Explorateur lexical (*Vocabulaire Myènè*)
   - Tableau d'émulation (*Classement*)
   - Filiation et généalogie clanique (*Mon Profil*)
   - *Aucun accès aux interfaces de modération ou d'administration.*

2. **Validateurs (`validator`)** :
   - Accès aux fonctionnalités contributeurs + onglet dédié **Validation Voix**.
   - Studio d'écoute des enregistrements audio des locuteurs.
   - Double évaluation indépendante : **Orthographe** (Écrit) et **Prononciation** (Oral).
   - Application de la nuance demandée (*l'écrit peut être bon mais pas la prononciation, la prononciation est bonne mais l'écrit est erroné*).
   - *Aucun accès aux réglages système ou à l'administration des utilisateurs.*

3. **Administrateurs (`admin`)** :
   - Accès total, incluant le tableau de bord d'**Administration**.
   - Gestion des utilisateurs (nomination des administrateurs et validateurs, suspension de comptes).
   - Gestion des réponses et export CSV complet des corpus validés.
   - Configuration dynamique des thèmes et des dénominations de badges.
   - Déclenchement de synchronisation Cloud et diagnostic DNS pour le domaine personnalisé.

---

## 🎙️ Studio des Validateurs (Nuance Oral vs Écrit)

Le module de validation permet d'examiner chaque contribution selon deux axes indépendants :
- **Axe 1 - L'Écrit (Orthographe & Graphie)** : Conforme vs À rectifier.
- **Axe 2 - L'Oral (Prononciation & Intonation)** : Authentique vs À réenregistrer.

### Synthèse des décisions :
- **100% Validé (`approved`)** : Écrit et prononciation tous deux conformes.
- **Audio Validé • Écrit à corriger (`audio_approved_text_revision`)** : *La prononciation est bonne mais le contributeur a mal orthographié l'expression.* L'audio est archivé, le texte est renvoyé en révision.
- **Écrit Validé • Audio à refaire (`text_approved_audio_revision`)** : *L'écrit est parfaitement conforme mais l'enregistrement oral est inaudible, hésitant ou mal accentué.* Le texte est archivé, un nouvel enregistrement est demandé.
- **Rejeté (`rejected`)** : Écrit et audio non recevables.

---

## 🛠️ Stack Technique

| Domaine | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build & Tooling** | [Vite 8](https://vite.dev/) avec Rollup / Rolldown optimisé |
| **Styles & Design** | [Tailwind CSS v4](https://tailwindcss.com/) (thème ambre / terre cuite gabonaise) |
| **Icônes & Animations** | [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/), [Canvas-Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Base de Données** | [Firebase Cloud Firestore](https://firebase.google.com/docs/firestore) |
| **Authentification** | [Firebase Authentication](https://firebase.google.com/docs/auth) (Google OAuth) |
| **Stockage Fichiers** | [Firebase Cloud Storage](https://firebase.google.com/docs/storage) (Audio WAV/WebM) |
| **Stockage Hors-Ligne** | Client IndexedDB natif pour PWA |
| **Hébergement** | [Firebase Hosting](https://firebase.google.com/docs/hosting) (Architecture Multi-sites) |

---

## 📁 Architecture & Structure du Répertoire

```text
├── DEPLOY_OMPAGANO.md             # Guide pas-à-pas de déploiement Firebase multi-sites
├── firebaserc.json                # Référence de configuration Firebase visible (non masquée)
├── .firebaserc                    # Configuration des projets et cibles Firebase CLI
├── firebase.json                  # Définition Hosting (cible: "ompangano", rewrites SPA)
├── firestore.rules                # Règles de sécurité Firestore avec contrôle RBAC
├── package.json                   # Dépendances et scripts de build / déploiement
├── index.html                     # Point d'entrée HTML et métadonnées SEO/OGP
├── src/
│   ├── main.tsx                   # Point d'entrée React
│   ├── App.tsx                    # Composant racine, routage et gestion d'état global
│   ├── firebase.ts                # Initialisation Firebase Auth, Firestore et Storage
│   ├── index.css                  # Styles Tailwind CSS et polices
│   ├── components/
│   │   ├── AdminDashboard.tsx            # Tableau de bord d'administration et modération
│   │   ├── AudioRecorder.tsx             # Composant d'enregistrement vocal avec visualiseur
│   │   ├── AuthModal.tsx                 # Modal de connexion Google / profil
│   │   ├── BadgesManagerAdmin.tsx        # Éditeur de dénominations dynamiques des badges
│   │   ├── BottomNav.tsx                 # Navigation mobile ergonomique
│   │   ├── ChallengeCelebrationModal.tsx # Célébration confettis lors des succès
│   │   ├── CrowdsourceCard.tsx           # Carte principale de collecte et validation
│   │   ├── CsvImportSection.tsx          # Importateur CSV avec mapping thématique
│   │   ├── HostingCustomDomainAdmin.tsx  # Diagnostic et instructions DNS domaine personnalisé
│   │   ├── LeaderboardAndRewards.tsx     # Classement et arbre des niveaux de sagesse
│   │   ├── Navbar.tsx                    # Barre supérieure bilingue et indicateurs
│   │   ├── NotificationCenterModal.tsx   # Centre de notifications applicatif
│   │   ├── OfflinePackModal.tsx          # Gestionnaire de téléchargement pack hors-ligne
│   │   ├── OnboardingModal.tsx           # Questionnaire culturel (tribu, clan, village)
│   │   ├── ThemeManagerAdmin.tsx         # Gestionnaire de modules thématiques
│   │   ├── UserProfileView.tsx           # Profil détaillé et généalogie du contributeur
│   │   ├── VocabularyExplorer.tsx        # Dictionnaire et explorateur lexical Myènè
│   │   ├── WeeklyChallengeBanner.tsx     # Bannière d'objectifs de la semaine
│   │   └── WeeklyChallengesAdmin.tsx     # Planificateur de défis hebdomadaires
│   ├── services/
│   │   ├── notificationService.ts        # Notifications in-app et alertes
│   │   ├── offlineStorage.ts             # Couche d'abstraction IndexedDB (hors-ligne)
│   │   └── seedData.ts                   # Corpus lexical initial Enenga / Myènè
│   └── types/
│       └── index.ts                      # Schémas TypeScript complets
```

---

## 🗄️ Modèle de Données (Firestore)

| Collection | Description | Permissions d'accès |
|---|---|---|
| `/questionnaire/{id}` | Phrasier, mots et expressions avec transcription API et thème | Lecture publique • Écriture admin |
| `/contributions/{id}` | Enregistrements audio, corrections orthographiques soumises | Lecture publique • Création utilisateur • Modération validateur/admin |
| `/users/{id}` | Profil du locuteur, généalogie (clans, village), XP, badges | Lecture publique • Écriture propriétaire/admin |
| `/themes/{id}` | Catalogue des modules thématiques dynamiques | Lecture publique • Gestion admin |
| `/badges/{id}` | Dénominations dynamiques, icônes et seuils de badges | Lecture publique • Gestion admin |
| `/challenges/{id}` | Défis hebdomadaires actifs et passés | Lecture publique • Gestion admin |
| `/clans/{id}` | Registre collaboratif des clans Myènè | Lecture publique • Ajout utilisateur |
| `/villages/{id}` | Registre des villages et regroupements | Lecture publique • Ajout utilisateur |
| `/metrics/current` | Compteurs d'enregistrements et statistiques en temps réel | Lecture publique • Écriture système |

---

## 🎨 Modules Thématiques & Dénominations Dynamiques

### 1. Import CSV
L'importateur CSV accepte les fichiers de lexique contenant les colonnes suivantes :
```csv
frenchText,myeneText,moduleThematique,phoneticApi,dialect,difficulty,contextNotes
"Pirogue en bois","Élêmbi","peche_navigation","e.lɛ́.mbi","enenga","debutant","Embarcation traditionnelle taillée dans l'okoumé"
"Filet de pêche","Ikokolo","peche_navigation","i.ko.ko.lo","enenga","intermediaire","Utilisé lors des crues du lac Zilé"
```
Si une valeur de `moduleThematique` n'existe pas encore dans la base, le système l'enregistre automatiquement dans la collection `/themes` et la rend disponible dans toute l'application.

### 2. Dénominations Dynamiques des Badges
Les dénominations des badges ne sont plus figées dans le code. Depuis l'onglet **Badges Dynamiques** de l'administration, il est possible de :
- Modifier le nom d'un badge (ex: changer *"Pêcheur"* en *"Maître des Eaux & Pêche"*).
- Ajuster les seuils d'XP, d'audios requis ou de validations.
- Associer des icônes culturelles adaptées.

---

## 💻 Installation & Développement Local

### Prérequis
- [Node.js](https://nodejs.org/) v18+ ou v20+
- [npm](https://www.npmjs.com/) v9+
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

### Procédure :
```bash
# 1. Cloner le dépôt
git clone <URL_DU_DEPOT_GITHUB>
cd ompagano-nkala-app

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement local
npm run dev
```
L'application sera accessible sur `http://localhost:3000`.

### Autres scripts disponibles :
- `npm run build` : Compilation TypeScript et génération du bundle de production dans `dist/`.
- `npm run lint` : Contrôle statique des types TypeScript (`tsc --noEmit`).
- `npm run preview` : Prévisualisation locale du bundle de production.
- `npm run deploy:hosting` : Build et déploiement direct sur le site `ompangano`.

---

## 🚀 Déploiement Firebase Hosting Multi-Sites

L'application fait partie du projet Firebase **NKALA APP**, qui héberge deux sites :
1. `enenga` (`enenga.web.app`)
2. `ompangano` (`ompangano.web.app`)

### Déploiement sécurisé et isolé :
Pour déployer uniquement sur le site **`ompangano`** sans jamais toucher au site `enenga` :

```bash
# 1. Se connecter à votre compte Google Firebase
firebase login

# 2. Lister vos projets pour identifier le projet NKALA APP
firebase projects:list

# 3. Définir le projet actif
firebase use <ID_PROJET_NKALA_APP>

# 4. Déployer exclusivement sur le site ompangano
npm run deploy:hosting
```
*Le script exécute en arrière-plan `vite build && firebase deploy --only hosting:ompangano` conformément à la directive `"site": "ompangano"` définie dans `firebase.json`.*

---

## 🌐 Configuration du Domaine Personnalisé

Le domaine personnalisé souhaité est : **`source.essaka.engineering`**.

### 1. Déclaration sur la Console Firebase
1. Rendez-vous dans la **Console Firebase** sur le projet **NKALA APP**.
2. Allez dans **Build** > **Hosting**.
3. Sélectionnez le site **`ompangano`**.
4. Cliquez sur **Ajouter un domaine personnalisé** et entrez : `source.essaka.engineering`.

### 2. Configuration DNS chez le Registrar (Zone `essaka.engineering`)
Ajoutez l'enregistrement DNS suivant chez votre gestionnaire de domaine (Cloudflare, OVH, etc.) :

| Type | Nom d'hôte / Sous-domaine | Valeur Cible | TTL |
|---|---|---|---|
| **CNAME** | `source` | `ompangano.web.app` | 3600 (1h) |

*Alternative (Enregistrement A direct si requis par votre DNS) :*
- Type : `A` | Nom : `source` | Cible : `199.36.158.100`

### 3. Certificat SSL
Firebase Hosting et Google Trust Services provisionnent et renouvellent automatiquement un certificat SSL HTTPS gratuit (Let's Encrypt / Google CA) dès la détection de la propagation DNS. Un outil de test en direct est disponible dans l'onglet **Déploiement & Domaine** de l'administration de l'application.

---

## 👥 Contribution & Licence

Ce projet est développé pour la sauvegarde et la valorisation du patrimoine linguistique et culturel gabonais. 
Les enregistrements vocaux et données lexicales recueillis ont vocation à nourrir les initiatives de revitalisation linguistique de la communauté Myènè.
