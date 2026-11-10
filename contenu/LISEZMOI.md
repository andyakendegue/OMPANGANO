# Contenus de Nkala : fichiers CSV et JSON

Les jeux, les cours, le catalogue d'Ontci, l'annuaire du village, les défis, les succès, les rangs et les textes se remplissent **avec des fichiers**, sans toucher au code. Un fichier = une collection (un tableau).

## En 5 gestes
1. Ouvrir la console : menu **Plus > Administration > Contenus (CSV/JSON)**.
2. Choisir la collection (par exemple « Exercices »).
3. **Modèle CSV** : récupérer le fichier vide avec les bonnes colonnes (les modèles sont aussi dans `contenu/modeles/`). **Voir les colonnes** explique chaque colonne ; le détail est dans `contenu/COLONNES.md`.
4. Remplir le fichier dans un tableur (Excel, LibreOffice, Numbers), l'enregistrer en **CSV UTF-8**, ou écrire un fichier JSON (voir `contenu/exemples/`).
5. **Vérifier** (rien n'est enregistré, le rapport liste les erreurs ligne par ligne), puis **Ajouter / mettre à jour** (ou **Remplacer tout** pour que le fichier devienne la liste complète).

## Règles
- La première ligne donne les noms des colonnes ; l'ordre des colonnes n'a pas d'importance. Séparateur : virgule ou point-virgule (détecté).
- `id` : unique dans la collection, sans espace (lettres, chiffres, `-`, `_`, `.`). Réimporter la même `id` met la ligne à jour.
- `publie` : `oui` ou `non`. Une ligne à `non` reste un brouillon invisible dans l'application.
- Listes : valeurs séparées par `|` (`options`, `tags`, `titres_ids`).
- Dates : `AAAA-MM-JJ`. Nombres décimaux : virgule ou point.
- `ordre` : position dans les listes (1, 2, 3…).
- **Liens entre fichiers** : `unite_id` renvoie à une `id` de « unités », `lecon_id` à « leçons », etc. Importer dans cet ordre : parcours → unités → leçons → exercices ; salles → jeux ; artistes → albums → titres ; catégories de lieux → lieux → gardes. Une référence inconnue donne un avertissement.
- **Mots myènè** : toujours une `source` (document et page), jamais un mot « deviné ». Écriture : `_contexte/REGLES_ENCODAGE.md` (ɛ ɔ ṉ ṽ, NFC). Un mot sans source est signalé.
- Ton : tutoiement pour l'accueil, les jeux et les enfants ; vouvoiement pour les services citoyens.
- Images, audio, vidéo : adresse `https://…` ou chemin du stockage (`images/…`). Les fichiers eux-mêmes se déposent dans le stockage.
- `niveau_acces` : `libre`, `gratuit_avec_pub`, `abonnement`, `achat`, `essai`, `location`, `reserve`. Le serveur refuse le contenu sans le droit.

## Contenu de démonstration
`contenu/exemples/*.json` est livré aussi **dans l'application** : tant que le serveur n'a rien publié pour une collection, l'application montre ces exemples (marqués « exemple » ou `demo-`). Dès qu'une ligne est publiée, les exemples disparaissent pour cette collection. Seuls des mots du lexique sourcé (`packages/noyau/src/lexique.ts`) y figurent.

## Collections
| Module | Collections |
|---|---|
| Onenji | parcours, unites, lecons, exercices, cours_artisans, chapitres, bibliotheque, opportunites |
| Azeva | salles, jeux, mots_jeux, defis, succes, avatars, plateau |
| Ontci | artistes, albums, titres, radios, chaines_tv, playlists, genres |
| Nkala | categories_lieux, lieux, gardes, actualites, magazine, services, categories_annonces, sondages |
| Commun | rangs, messages, produits, pub_creations |

Les jeux de mots d'Azeva utilisent d'abord les fiches validées du corpus (Ompangano) ; `mots_jeux` ajoute des mots.

## Mettre à jour les modèles
Si une collection change dans `packages/noyau/src/contenu/schemas.ts`, relancer : `cd server && npx tsx scripts/generer_contenus.ts` (régénère les modèles CSV, les exemples et `COLONNES.md`).
