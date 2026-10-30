# OMPANGANO — corpus de phrases myènè (crowdsourcing, entraînement IA)

Dossier : `07_donnees/OMPANGANO/` — constitué le 30 octobre 2026.

| Fichier | Contenu |
|---|---|
| `corpus_myene_GEMINI_origine_10000.csv` | Fichier d'origine généré par Gemini (référence, ne pas modifier) |
| `corpus_myene_ANCIEN_mis_a_jour.csv` | Les 10 000 lignes Gemini corrigées (mêmes ITEM_xxxx) : colonnes `modifications`, `dialecte_justification`, texte d'origine conservé |
| `corpus_myene_NOUVEAU_30600.csv` | 30 600 phrases nouvelles (NEW_xxxxx), sans doublon avec l'ancien : 3 239 attestées (Raponda-Walker 1995, page citée), 1 606 attestées à re-segmenter, 25 755 composées à valider |
| `AUDIT_corpus_myene_OMPANGANO.md` | Audit comparatif des trois versions, règles suivies, limites, recommandations |
| `corpus_myene_OMPANGANO_annote.csv`, `lot_pilote_1000_phrases.csv` | Première analyse du fichier Gemini (annotations, lot pilote) |
| `scripts/` | Chaîne Python reproductible (nettoyage Raponda-Walker, composition, mise à jour, audit) |

Colonne `statut` : commencer la validation par `attestee`, puis `attestee_a_resegmenter`, puis les phrases composées.
Thème des nombres : `numeration_mesures` (325 lignes dans l'ancien fichier ; à reprendre dans le nouveau).
Droits : Raponda-Walker 1995 est protégé (Fondation Raponda-Walker) — vérifier avant diffusion.
