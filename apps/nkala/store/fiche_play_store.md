# Nkala : fiche Google Play (fr-FR)

13 novembre 2026. Texte à coller dans Play Console > Croissance > Présence sur le Store > Fiche principale.
Visuels : `livrables/play-store/` (générés à partir de vraies captures de l'app, mode invité, version web du 13 nov.).

## Textes

**Nom de l'application** (30 caractères max) :

```
Nkala – langue myènè
```

**Description courte** (80 caractères max) :

```
Apprends le myènè en jouant : cours, jeux, radio et le village dans ta poche.
```

**Description complète** (4 000 caractères max) :

```
Mbolo ! Nkala, c'est le village dans ta poche : apprendre la langue myènè, jouer, écouter et retrouver les tiens, où que tu sois.

Nkala réunit les six peuples myènè du Gabon : Ôrungu, Mpongwè, Galwa, Nkomi, Enenga et Adyumba.

APPRENDRE (ONENJI)
• Un test de niveau rapide pour commencer au bon endroit.
• Des cours pas à pas, organisés selon les étapes de la vie : salutations, famille, corps, maison, nature, nombres…
• Une vidéothèque (Igolani) et une bibliothèque (Ezango) pour aller plus loin.
• Kak'Igonjo, le vieux sage du village, répond à tes questions et t'accompagne pendant les cours.

JOUER (AZEVA)
• Des salles de jeux par thème : mots, corps, maison, nature, nombres, famille et société.
• Un défi du jour pour garder ta série.
• Ogoni : trouve le mot avant que le feu de bois ne s'éteigne.
• Chaque jeu s'explique en images avant de commencer.
• Des niveaux qui s'ouvrent au fil de ta progression.
• Les jeux sont gratuits.

ÉCOUTER (ONTCI)
• Radio en direct, musique et vidéos des artistes de chez nous.

LE VILLAGE
• Pharmacies de garde, taxis, marchés, écoles, restaurants, administrations.
• Annonces, actualités locales et services de la commune.

CONTRIBUER (OMPANGANO)
• Enregistre ta voix, valide les phrases des autres et aide à préserver la langue pour les générations à venir.

POUR TOUTE LA FAMILLE
• Mode enfant : icônes, sons et grands boutons, sans publicité, avec une durée de jeu limitée, réglé par un parent.
• Mode lecture facile : gros caractères et interface épurée.
• Thème clair ou sombre.

Tu peux essayer Nkala sans compte. Pour garder ta progression sur tous tes appareils, contribuer ou apparaître dans les classements, crée un compte avec ton numéro de téléphone ou ton compte Google.

Nkala est gratuite, avec une publicité discrète. Des formules permettent de débloquer des cours et de retirer la publicité.

Nkala est conçue au Gabon par Essaka Engineering, avec les locuteurs et les anciens.
Wulinya myè : raconte-moi.
```

**Notes de version** (testeurs, 500 caractères max) :

```
Première version de test de Nkala. Merci de nous aider ! Essaie les cours, les jeux (Ogoni, défi du jour), le village et Kak'Igonjo, puis dis-nous ce qui ne va pas.
```

## Visuels (`livrables/play-store/`)

| Élément | Fichier | Format Play |
|---|---|---|
| Icône | `icone_512.png` | 512 × 512 PNG |
| Image de présentation | `image_presentation_1024x500.png` | 1024 × 500 |
| Captures téléphone (5) | `captures/capture_1_partie.png` … `capture_5_village.png` | 1080 × 1920 (9:16) |

Ordre des captures : partie d'Ogoni, salles de jeux, Apprendre, aide illustrée d'un jeu, Village.
Pour les refaire (version web lancée sur le port 5173, `npm i puppeteer-core` dans un dossier à part) :
`node capturer_ecrans.mjs <brut>` puis `node capturer_jeu.mjs <brut>` puis
`node composer_visuels.mjs <brut> ../../../livrables/play-store ../assets` (le chemin des polices est écrit en dur dans `composer_visuels.mjs`).

## Autres champs de la Play Console

- **Catégorie** : Éducation. **Tags** : apprentissage des langues, jeux éducatifs.
- **E-mail de contact** : à fournir (obligatoire, affiché publiquement).
- **Site web** : à fournir (facultatif).
- **Politique de confidentialité** : **URL obligatoire, aucune page n'existe encore dans le projet**. L'app demande le micro, crée des comptes (téléphone, Google) et affiche de la publicité : la page doit le dire.
- **Public cible** : si « moins de 13 ans » est coché (le mode enfant le suggère), l'app entre dans le programme Familles de Google Play : régie publicitaire certifiée Familles, pas d'identifiant publicitaire pour les enfants, politique adaptée. Sinon cocher 13 ans et plus et ne pas présenter l'app comme destinée aux enfants.
- **Sécurité des données** : déclarer numéro de téléphone, e-mail, nom, photo (comptes), enregistrements audio (contributions), progression (jeux, cours), données publicitaires ; chiffrement en transit ; suppression du compte possible (exigée par Google : prévoir une URL de demande de suppression).
- **Classification du contenu** : questionnaire IARC (aucun contenu violent ; mentionner les interactions entre utilisateurs : cours à distance, contributions, classements).
- **Publicité** : cocher « contient des annonces ».
- **Achats intégrés** : à cocher si les formules passent par Google Play Billing.
