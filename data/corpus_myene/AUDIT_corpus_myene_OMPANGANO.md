# Audit comparatif — corpus myènè OMPANGANO

Date : 30 octobre 2026. Fichiers audités, dans `07_donnees/OMPANGANO/` :
- `e6729ee1-corpus_myene_crowdsourcing_10000.csv` : fichier Gemini d'origine (référence) ;
- `corpus_myene_ANCIEN_mis_a_jour.csv` : le même fichier, mêmes identifiants `ITEM_xxxx`, corrigé ;
- `corpus_myene_NOUVEAU_30600.csv` : nouveau fichier, identifiants `NEW_xxxxx`.

## 1. Chiffres clés

| Indicateur | Gemini d'origine | Ancien mis à jour | Nouveau |
|---|---|---|---|
| Lignes | 10000 | 10000 | 30600 |
| Phrases uniques | 9891 | 10000 | 30600 |
| Doublons internes | 109 | 0 | 0 |
| Mots distincts (myènè) | 824 | 1015 | 6183 |
| Mots qui n’apparaissent qu’une fois | 136 | 138 | 4395 |
| Part des lignes dans les 100 débuts les plus fréquents (%) | 60.8 | 13.7 | 3.8 |
| Longueur moyenne (mots) | 9.02 | 5.96 | 3.39 |
| Caractères non latins | 1 | 0 | 0 |
| Mots douteux (égaraksyi, gou', ossiompwa) | 280 | 0 | 0 |
| Lignes avec un mot de 15 lettres ou plus (OCR collé) | 0 | 0 | 330 |
| Thèmes | 12 | 12 | 20 |
| Lignes avec transcription phonétique | 2200 | 10000 | 30600 |

**Croisement des deux fichiers livrés**
- Doublons de texte myènè entre l'ancien et le nouveau fichier : **0**.
- Même phrase française dans les deux fichiers : 167. Ce ne sont pas des doublons : la même idée est rendue par deux phrases myènè différentes (souvent une ôrungu et une mpongwè). Elles sont utiles pour comparer les dialectes.
- Vocabulaire : 1015 mots dans l'ancien fichier, 6183 dans le nouveau, 570 en commun ; **6636 mots distincts** au total.
- Mots de Gemini conservés dans l'ancien fichier : 814 sur 824.

## 2. Provenance : ce qui est attesté et ce qui est composé

| Statut | Ancien mis à jour | Nouveau | Ce que cela veut dire |
|---|---|---|---|
| attestee | 22 | 3239 | Phrase prise telle quelle dans une source du corpus (page indiquée) |
| attestee_a_resegmenter | 0 | 1606 | Phrase authentique de Raponda-Walker, mais des mots restent collés par l'OCR : à relire |
| gemini_corrige_a_valider | 5192 | 0 | Phrase de Gemini, corrigée là où le corpus le permet |
| composee_a_valider | 4786 | 25755 | Phrase construite par Claude à partir de cadres attestés : à faire valider |

**Point d'attention.** Raponda-Walker ne fournit qu'environ 4 800 phrases d'exemple exploitables. Les 25 755 phrases composées représentent donc **84 %** du nouveau fichier. Elles reposent uniquement sur des règles documentées (voir section 4), mais aucun locuteur ne les a encore vérifiées. Elles sont plus courtes et plus régulières que des phrases spontanées.

## 3. Dialectes

| Dialecte | Gemini d'origine | Ancien mis à jour | Nouveau |
|---|---|---|---|
| orungu | 5037 | 6682 | 23886 |
| mpongwe | 2528 | 3318 | 6356 |
| nkomi | 754 | 0 | 52 |
| galwa | 750 | 0 | 306 |
| enenga | 600 | 0 | 0 |
| adjumba | 331 | 0 | 0 |

Règle appliquée (fin de l'attribution au hasard). Le dialecte d'une ligne est donné par un **marqueur documenté** :
- *pièrè* (ôrungu / nkomi) ;
- *ogouma*, *ipôrô*, *ipandô* (ôrungu) et *mbuka* (nkomi), d'après les leçons ;
- *oguwa*, *ayakwè*, *bôtôlô* (mpongwè) et *osaga* (galwa), d'après les leçons ;
- le lexique de Raponda-Walker (mpongwè).

Sans marqueur, la ligne est rattachée à la base des leçons (ôrungu). La colonne `dialecte_justification` indique pourquoi.

Pour le galwa et le nkomi, le nouveau fichier ne contient que des **mots isolés**. Ce sont les variantes que Raponda-Walker note « G. » ou « Nk. » (thème `lexique_variantes_dialectales`). Aucune phrase complète en galwa, nkomi, enenga ou adjumba n'existe dans le corpus. Pour ces dialectes, seuls des locuteurs peuvent fournir des phrases.

## 4. Corrections faites dans l'ancien fichier

| Correction | Lignes |
|---|---|
| Dialecte corrigé | 5540 |
| Proverbe rétabli mot pour mot d'après les leçons | 1 |
| Gabarits répétitifs remplacés par des phrases nouvelles (12 gardées par gabarit ; les 315 décomptes ne sont pas touchés) | 4677 |
| Doublons remplacés | 109 |
| Arabe et devanagari → « bota » (ITEM_2216) | 1 |
| « ossiompwa » (canapé, inventé) → « épwé z'atanga » (chaise) | 48 |
| « gou' » → « g' » | 220 |
| « égaraksyi » → « frigo » (emprunt, à confirmer) | 24 |
| Élision go / ni devant voyelle (g', n') | 162 |
| Transcription phonétique refaite | 10000 |

**Décomptes.** Sur les 6 075 lignes répétitives, seules 315 sont des décomptes (« Anèrô wa ranguni… »). Elles sont gardées intactes pour l'apprentissage des nombres. Les autres gabarits (« Oma wi dyandya… », « Ngwè y'ayani ngwè… ») ont été réduits.

**Ce qui n'a pas pu être corrigé.** Pour la grammaire des phrases propres à Gemini (accords de classe, temps du passé, négation), le corpus ne donne pas de règle vérifiable. Ces 5 192 lignes gardent le statut `gemini_corrige_a_valider`. Le texte d'origine de Gemini reste dans `myeneText_gemini_origine`, et chaque changement est décrit dans `modifications`.

## 5. Règles suivies pour les phrases composées

- Présent = pronom + radical (*Mi nya*) ; futur = pronom + *bé* + radical (*Wé bé djèna*). Source : leçons, *Les pronoms et la conjugaison*.
- Pronoms ôrungu : Mi, Wé, É, Zé, Nwé, Wé.
- Pronoms mpongwè : Mi, O, E, Azwè, Anwè, d'après les exemples de Raponda-Walker (p. 31, 46, 250, 603).
- Élision devant voyelle : *g'iga*, *n'onèrô*, *Wé kamb'inôngô*.
- Cadres repris des leçons : *Mi kènda go…*, *Va myè … , kôkôlô*, *Wé buta go…*, *… ré na gwé ?*.
- **Aucun accord de classe n'est inventé** : les noms ne sont qu'objets ou compléments de lieu.
- Pas de passé ni de négation dans les phrases composées : leurs formes varient trop pour être produites sans locuteur.
- Les combinaisons absurdes sont exclues (pas de carpe pêchée en mer, pas de « préparer du sel », etc.).

## 6. Transcription phonétique

La colonne `transcription_phonetique` est **segmentale et sans tons**. Elle suit les règles de *Comment écrire l'Omyènè* (leçons), à raison d'un caractère par son :
- *è* = [ɛ], *ô* = [ɔ], *g* = [ɣ] ;
- *ny* = [ɲ], *dy* = [dʲ], *dj* = [dʒ], *tch* = [tʃ] ;
- prénasales notées [ᵐb], [ⁿd], [ᵑɡ]…

Les tons de Gemini étaient inventés : ils sont gardés à part dans `api_gemini_origine_non_fiable`, pour traçabilité. Les vrais tons de l'ôrungu sont décrits par Ambouroue (2007), mais l'extraction du texte de la thèse perd ses caractères phonétiques. Il faudrait passer par un OCR des pages.

## 7. Thèmes du nouveau fichier

| Thème | Lignes |
|---|---|
| cuisine_agriculture | 4102 |
| commerce_echanges_voyages | 3820 |
| chasse_faune_nature | 3753 |
| artisanat_outils | 3721 |
| peche_navigation | 3447 |
| expressions_quotidiennes | 3244 |
| maison_habitat | 2225 |
| deplacements_lieux | 1982 |
| habillement_parure | 1582 |
| nature_plantes_pharmacopee | 977 |
| temps_climat_environnement | 517 |
| lexique_variantes_dialectales | 369 |
| sante_corps_spiritualite | 286 |
| vie_quotidienne_famille | 142 |
| sante_hygiene_soins | 119 |
| clans_histoire_rites | 107 |
| education_enseignement | 86 |
| emotions_amour | 45 |
| droit_famille_mariage | 43 |
| numeration_mesures | 33 |

Nouveaux thèmes : habillement_parure, maison_habitat, nature_plantes_pharmacopee, deplacements_lieux, expressions_quotidiennes, sante_hygiene_soins, education_enseignement, droit_famille_mariage, emotions_amour, lexique_variantes_dialectales. Ils suivent `_contexte/ONENJI_THEMES.md`. Les thèmes droit, éducation et émotions restent peu fournis : seules les phrases attestées les alimentent.

## 8. Recommandations pour OMPANGANO

1. Faire valider d'abord les lignes `attestee`, puis `attestee_a_resegmenter`. Ce sont les plus sûres.
2. Pour chaque phrase composée, demander au locuteur : « correcte / à corriger / impossible ». Utiliser les réponses pour corriger les règles avant d'en produire davantage.
3. Faire déclarer le dialecte par le locuteur à l'enregistrement. Ce choix prime sur la colonne `dialect`.
4. Recueillir de vraies phrases galwa, nkomi, enenga et adjumba : le corpus écrit n'en contient pas.
5. **Droits** : le *Dictionnaire mpongwé-français* de Raponda-Walker (1995) est encore protégé (Fondation Raponda-Walker). Les leçons omyènè portent aussi des mentions d'auteur. Avant de diffuser ces données ou un modèle entraîné dessus, vérifier les autorisations. Les sources du XIXe siècle (Le Berre, Wilson) sont dans le domaine public.
