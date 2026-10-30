# -*- coding: utf-8 -*-
import json, csv, collections
d = json.load(open('/home/claude/w/audit.json')); F = d['fichiers']; C = d['croisement']
g, a, n = F['gemini_origine'], F['ancien_mis_a_jour'], F['nouveau']
s = json.load(open('/home/claude/w/stats_old.json'))
N = list(csv.DictReader(open('/home/claude/w/out_corpus_myene_NOUVEAU.csv', encoding='utf-8')))
ds = collections.Counter((r['dialect'], r['statut']) for r in N)
def row(lbl, k): return f"| {lbl} | {g[k]} | {a[k]} | {n[k]} |"
md = f"""# Audit comparatif — corpus myènè OMPANGANO

Version du 30 octobre 2026 (soir) : régénérée après l'ajout de la *Méthode pratique pour apprendre l'omyene* de Teisserès & Dubois (1957). Cette méthode décrit le **galwa** de Ngomo.

Fichiers audités, dans `07_donnees/OMPANGANO/` :
- `corpus_myene_GEMINI_origine_10000.csv` : fichier Gemini d'origine, qui sert de référence ;
- `corpus_myene_ANCIEN_mis_a_jour.csv` : les mêmes 10 000 identifiants `ITEM_xxxx`, corrigés ;
- `corpus_myene_NOUVEAU_35000.csv` : le nouveau fichier, identifiants `NEW_xxxxx`, entièrement renumérotés dans cette version.

## 1. Chiffres clés

| Indicateur | Gemini d'origine | Ancien mis à jour | Nouveau |
|---|---|---|---|
{row('Lignes', 'lignes')}
{row('Phrases uniques', 'phrases_uniques')}
{row('Doublons internes', 'doublons_internes')}
{row('Mots distincts (myènè)', 'mots_distincts')}
{row('Part des lignes dans les 100 débuts les plus fréquents (%)', 'part_100_debuts')}
{row('Longueur moyenne (mots)', 'long_moy')}
{row('Caractères non latins', 'non_latin')}
{row("Mots douteux (égaraksyi, gou', ossiompwa)", 'mots_suspects')}
{row('Lignes avec un mot de 15 lettres ou plus (OCR collé)', 'mots_colles_15car')}
{row('Thèmes', 'themes')}
{row('Lignes avec transcription phonétique', 'phonetique')}

**Croisement des deux fichiers livrés**
- Doublons de texte myènè entre l'ancien et le nouveau fichier : **{C['doublons_myene_ancien_nouveau']}**.
- Même phrase française des deux côtés : {C['doublons_francais_ancien_nouveau']}. Ce sont souvent des versions dans deux dialectes différents (ôrungu / mpongwè / galwa) de la même phrase, à garder pour les comparer.
- Vocabulaire : **{C['mots_union']} mots distincts** au total ({C['mots_nouveau']} dans le nouveau fichier, {C['mots_ancien']} dans l'ancien).

## 2. Provenance par dialecte (nouveau fichier)

| Dialecte | Attestée | Attestée, à re-segmenter | Composée, à valider | Source |
|---|---|---|---|---|
| ôrungu | {ds[('orungu','attestee')]} | 0 | {ds[('orungu','composee_a_valider')]} | Leçons omyènè (lexique, conjugaison, élisions) |
| mpongwè | {ds[('mpongwe','attestee')]} | {ds[('mpongwe','attestee_a_resegmenter')]} | {ds[('mpongwe','composee_a_valider')]} | Raponda-Walker 1995 (exemples, page citée) ; Teisserès & Dubois, leçon 32 |
| galwa | {ds[('galwa','attestee')]} | 0 | {ds[('galwa','composee_a_valider')]} | Teisserès & Dubois 1957 (exemples, versions/thèmes, vocabulaires) ; variantes « G. » de Raponda-Walker |
| nkomi | {ds[('nkomi','attestee')]} | 0 | 0 | Variantes « Nk. » de Raponda-Walker (mots isolés) |

Dans l'ancien fichier, les dialectes se répartissent ainsi : {a['dialectes']}. Les lignes de remplacement (gabarits répétitifs, doublons) puisent désormais aussi dans les phrases galwa composées.

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
"""
lab = {'remplace_gabarit répétitif': "Gabarits répétitifs remplacés (12 gardés par gabarit ; les 315 décomptes intacts)", 'remplace_doublon': 'Doublons remplacés',
       'gou': "« gou' » → « g' »", 'elision': "Élision go / ni devant voyelle", 'canape': "« ossiompwa » → « épwé z'atanga » (chaise)",
       'frigo': "« égaraksyi » → « frigo » (emprunt, à confirmer)", 'non_latin': "Arabe / devanagari → « bota » (ITEM_2216)",
       'proverbe_retabli': "Proverbe rétabli d'après les leçons", 'dialecte_change': 'Dialecte corrigé (marqueur documenté ou source de la phrase)'}
for k, v in s.items(): md += f"| {lab.get(k, k)} | {v} |\n"
md += """| Transcription phonétique refaite | 10000 |

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
"""
open('/home/claude/w/AUDIT_corpus_myene_OMPANGANO.md', 'w', encoding='utf-8').write(md)
print(len(md))
