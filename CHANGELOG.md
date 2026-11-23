# Changelog — Nkala

Format : `## [version] — versionCode N — AAAA-MM-JJ`
Notes de version copiées telles quelles dans le Play Store (FR) et l'App Store (FR) à chaque release.

---

## [0.3.0] — versionCode 10 — 2026-11-23

### Nouveautés
- **Dictée vocale en myènè** : parlez en ôrungu, Kak'Igonjo vous répond en myènè (reconnaissance vocale native).
- **Kak'Igonjo en graphie v3** : toutes les réponses myènè suivent la graphie de Rékanga ; recherche web de repli quand le sage avoue ne pas savoir.
- **Cours Onenji — lots 4 à 11** : trois passés, pluriel, possessifs, proverbes, familles de mots, raconter, nouvelles du pays, exercices « montre-moi », scènes immersives avec décors en panorama et ambiance sonore.
- **Validation communautaire** : les phrases dites peuvent être corrigées par un modérateur de la communauté.
- **Annonces** : tous types d'annonces sur le modèle du logement (carte OpenStreetMap) ; 1 annonce gratuite, puis 500 F.
- **Vidéos en streaming** : masterclass accessibles par abonnement.

### Améliorations
- Ondes sonores à la charte graphique (Ontci sable, Ompangano brique, Onênji ambre).
- Bouton « Réponses en myènè » ; traducteur français ↔ myènè.
- Accord parental requis pour l'envoi de voix des mineurs.
- Publicité sur tous les écrans, coupée par le forfait.

---

## [0.2.0] — versionCode 6 — 2026-11-14

### Nouveautés
- **Kak'Igonjo** : assistant IA avec compétence myènè et synthèse vocale.
- **Cours Onenji — lots 1 à 3** : sons et tons de l'ôrungu, alphabet de Rékanga (lire et écrire), scènes immersives.
- **Bibliothèque** gratuite ; cours et IA au forfait (questions gratuites par semaine).
- **Formules d'abonnement** Oma / Inina / Anyambiè, réglables dans la console d'administration.
- Annonces immobilières : photos, vidéos, capture 360°.

### Améliorations
- Toutes les consonnes, unité « Dire juste » (écriture + transcription + sens).
- Plus aucune référence aux sources dans ce que voit l'apprenant.

---

## [0.1.0] — versionCode 4 — 2026-11-13

### Première version publique (tests internes)
- Connexion Google et par SMS.
- Contribution : valider l'écriture, le sens et la prononciation de phrases en myènè.
- Module Ompangano : explorer les phrases, écouter les voix, enregistrer la sienne.
- Profil, filiation, classement et badges.
- Console d'administration.

---

## Instructions pour chaque nouvelle release

1. Ajouter une entrée en haut de ce fichier (après `---`).
2. Copier les **Nouveautés** et **Améliorations** dans :
   - **Play Console** → Piste de test → Notes de version → Français (France)
   - **App Store Connect** (quand disponible) → Nouveautés de cette version → Français
3. Incrémenter `version` dans `apps/nkala/app.json` ; `versionCode` est géré automatiquement par EAS (`autoIncrement: true`).
4. Build : `npx eas-cli@latest build -p android --profile production`
5. Soumettre : `npx eas-cli@latest submit -p android --profile interne` (tests internes) ou `--profile production` (alpha/production).
