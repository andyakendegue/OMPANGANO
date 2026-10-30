# Audit comparatif — corpus myènè OMPANGANO

Version du 30 octobre 2026 (soir) : régénérée après l'ajout de la *Méthode pratique pour apprendre l'omyene* de Teisserès & Dubois (1957). Cette méthode décrit le **galwa** de Ngomo.

Fichiers audités, dans `07_donnees/OMPANGANO/` :
- `corpus_myene_GEMINI_origine_10000.csv` : fichier Gemini d'origine, qui sert de référence ;
- `corpus_myene_ANCIEN_mis_a_jour.csv` : les mêmes 10 000 identifiants `ITEM_xxxx`, corrigés ;
- `corpus_myene_NOUVEAU_35000.csv` : le nouveau fichier, identifiants `NEW_xxxxx`, entièrement renumérotés dans cette version.

## 1. Chiffres clés

| Indicateur | Gemini d'origine | Ancien mis à jour | Nouveau |
|---|---|---|---|
| Lignes | 10000 | 10000 | 35000 |
| Phrases uniques | 9891 | 10000 | 35000 |
| Doublons internes | 109 | 0 | 0 |
| Mots distincts (myènè) | 824 | 1075 | 7499 |
| Part des lignes dans les 100 débuts les plus fréquents (%) | 60.8 | 14.8 | 3.4 |
| Longueur moyenne (mots) | 9.02 | 6.04 | 3.32 |
| Caractères non latins | 1 | 0 | 0 |
| Mots douteux (égaraksyi, gou', ossiompwa) | 280 | 0 | 0 |
| Lignes avec un mot de 15 lettres ou plus (OCR collé) | 0 | 0 | 331 |
| Thèmes | 12 | 12 | 20 |
| Lignes avec transcription phonétique | 2200 | 10000 | 35000 |

**Croisement des deux fichiers livrés**
- Doublons de texte myènè entre l'ancien et le nouveau fichier : **0**.
- Même phrase française des deux côtés : 690. Ce sont souvent des versions dans deux dialectes différents (ôrungu / mpongwè / galwa) de la même phrase, à garder pour les comparer.
- Vocabulaire : **7873 mots distincts** au total (7499 dans le nouveau fichier, 1075 dans l'ancien).

## 2. Provenance par dialecte (nouveau fichier)

| Dialecte | Attestée | Attestée, à re-segmenter | Composée, à valider | Source |
|---|---|---|---|---|
| ôrungu | 11 | 0 | 24470 | Leçons omyènè (lexique, conjugaison, élisions) |
| mpongwè | 2907 | 1606 | 1067 | Raponda-Walker 1995 (exemples, page citée) ; Teisserès & Dubois, leçon 32 |
| galwa | 2784 | 0 | 2103 | Teisserès & Dubois 1957 (exemples, versions/thèmes, vocabulaires) ; variantes « G. » de Raponda-Walker |
| nkomi | 52 | 0 | 0 | Variantes « Nk. » de Raponda-Walker (mots isolés) |

Dans l'ancien fichier, les dialectes se répartissent ainsi : {'orungu': 5948, 'galwa': 2697, 'mpongwe': 1355}. Les lignes de remplacement (gabarits répétitifs, doublons) puisent désormais aussi dans les phrases galwa composées.

## 3. Apport du document galwa (Teisserès & Dubois 1957)

- **Phrases de version alignées sur leur thème français** : 417 phrases authentiques, alignées phrase à phrase. Sept leçons n'ont pas été alignées, parce que les deux textes n'ont pas le même nombre de phrases (leçons 3, 4, 11, 17, 18, 20, 22). Ce sont les meilleures phrases galwa du corpus pour l'enregistrement.
- **Exemples de grammaire et vocabulaires thématiques** : page et leçon citées. Les vocabulaires donnent des mots isolés.
- **Leçon 32 (différences galoa / mpôngwè)** : variantes ajoutées au thème `lexique_variantes_dialectales`. La leçon confirme les pronoms mpongwè utilisés (*mi, ô, e, azwè, anwè, wi*).
- **Phrases galwa composées** selon la grammaire du livre :
  - présent = pronom + verbe (*myè tonda*, leçon 1) ;
  - sujet nominal + pronom (*Rerè e tonda*, *Anaga wi kôka*) ;
  - futur en *be* (*Myè be jena*, leçon 8) ;
  - *gô* = à, pour ;
  - élision (*Ko sang'akondo*) ;
  - verbes et noms tirés des vocabulaires du livre.
- **Orthographe de 1957 conservée telle quelle** : *ṽ* = son entre v et w, *ñ* = n vélaire, *e* / *è*. La transcription phonétique rend *ṽ* par [ʋ] et *ñ* par [ŋ].

## 4. Corrections faites dans l'ancien fichier

| Correction | Lignes |
|---|---|
| Dialecte corrigé (marqueur documenté ou source de la phrase) | 6384 |
| Proverbe rétabli d'après les leçons | 1 |
| Gabarits répétitifs remplacés (12 gardés par gabarit ; les 315 décomptes intacts) | 4677 |
| Doublons remplacés | 109 |
| Arabe / devanagari → « bota » (ITEM_2216) | 1 |
| « ossiompwa » → « épwé z'atanga » (chaise) | 48 |
| « gou' » → « g' » | 220 |
| « égaraksyi » → « frigo » (emprunt, à confirmer) | 24 |
| Élision go / ni devant voyelle | 162 |
| Transcription phonétique refaite | 10000 |

Ce qui n'a pas pu être corrigé : la grammaire propre à Gemini (accords, passé, négation). Ces lignes restent `gemini_corrige_a_valider`. Le texte d'origine est conservé dans `myeneText_gemini_origine`, et chaque changement est décrit dans `modifications`.

## 5. Règles et limites

- Les phrases composées n'utilisent que des règles écrites dans les sources. Aucun accord de classe n'est produit : le nom n'est qu'objet ou complément de lieu. Pas de passé ni de négation.
- La transcription phonétique est segmentale, **sans tons**. Les tons de Gemini, inventés, sont gardés à part comme non fiables.
- Le thème des nombres (`numeration_mesures`) reste surtout dans l'ancien fichier (325 lignes). Une sous-catégorie de comptage à partir des leçons reste à faire.
- **Droits** : Raponda-Walker 1995 est encore protégé (Fondation Raponda-Walker). Teisserès & Dubois 1957 (Société des Missions Évangéliques de Paris) l'est probablement aussi. Les leçons omyènè portent des mentions d'auteur. À vérifier avant toute diffusion.

## 6. Recommandations

1. Enregistrer en priorité les 417 phrases galwa de version et les exemples attestés (mpongwè et galwa).
2. Faire valider les phrases composées par des locuteurs de chaque dialecte, puis corriger les règles d'après leurs retours.
3. Re-segmenter les 1 606 exemples de Raponda-Walker où des mots restent collés.
4. Aligner à la main les 7 versions/thèmes galwa non alignés.
5. Recueillir des phrases nkomi, enenga et adjumba : le corpus écrit n'en contient toujours pas.
