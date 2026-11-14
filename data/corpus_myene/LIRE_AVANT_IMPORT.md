# À lire avant tout import

Les fichiers de ce dossier datent du **30 octobre 2026** et ne sont **pas** les versions corrigées. En particulier :

- `corpus_myene_ANCIEN_mis_a_jour.csv`, `corpus_myene_GEMINI_origine_10000.csv`, `corpus_myene_OMPANGANO_annote.csv` et `lot_pilote_1000_phrases.csv` contiennent encore des phrases rejetées depuis, par exemple ITEM_001 « Irende si bendi go nongo » (sans sens en myènè).
- Le serveur refuse maintenant ces phrases (liste des phrases écartées), mais n'importez pas ces fichiers.

**Fichiers à utiliser** : `07_donnees/OMPANGANO/final/` (à la racine du projet DONDO)
- administration du site (Import CSV) : `IMPORT_1_ancien_FINAL_10000.csv` puis `IMPORT_2_nouveau_FINAL_40125.csv` ;
- script `server/scripts/migrate-from-firebase.ts --corpus=` : `corpus_myene_ANCIEN_FINAL_10000.csv` et `corpus_myene_NOUVEAU_FINAL_40125.csv`.

**Mise à jour du 10 novembre 2026** : les fichiers à jour selon les règles d'écriture v2.0 sont dans `07_donnees/OMPANGANO/final_v2_regles_2026-11-10/` et `OMPANGANO/data/import_pret_v2/`.
