# -*- coding: utf-8 -*-
"""Phrases galwa composées — grammaire de Teisserès & Dubois 1957 :
présent = pronom + verbe (leçon 1, p. 5 : myè tonda, we, e, zwe, nwe, wi) ; sujet nominal + pronom (« Rerè e tonda »,
« Anaga wi kôka ») ; futur = be (leçon 8 : « Myè be jena ») ; « gô » = à, pour ; élision (« Ko sang'akondo », p. 39).
Lexique : vocabulaires du livre (page citée). Aucun accord de classe produit."""
import json, re, random, collections
exec(open('/home/claude/w/noms_rw.py').read().split("E = json.load")[0])
from gen import FRV, er, art, fr_sujet, phr
from commun import joindre
random.seed(57)
FRV.update({"planter": er("plant"), "couper": er("coup"), "appeler": (["appelle", "appelles", "appelle", "appelons", "appelez", "appellent"], ["appellerai", "appelleras", "appellera", "appellerons", "appellerez", "appelleront"])})
d = json.load(open('/home/claude/w/galwa_extrait.json'))
L = d['lex'] + [x for x in d['ex'] if len(x['my'].split()) <= 2]
NC = set("sel sucre huile miel riz pain viande farine eau vin alcool bière lait sable argile boue fumée cendre manioc maïs".split())
noms = []; vus = set()
for x in L:
    fr = re.split(r"[,;(]", x['fr'])[0].strip().lower()
    fr = re.sub(r"^(un|une|le|la|les|l')\s*", "", fr)
    if not fr or len(fr.split()) > 3: continue
    h = fr.split()[0]
    if h not in KW or re.search(r"\b(sorte|espèce|qui|que)\b", fr): continue
    if len(fr.split()) > 1 and fr.split()[1] in ("de", "d'", "du", "des", "à", "en"): continue
    my = x['my'].split(" ou ")[0].strip()
    if " " in my or my in vus or not re.fullmatch(r"[a-zàâèéêôòóûîïñṽ'-]+", my): continue
    vus.add(my); g, c = KW[h]
    noms.append((my, fr, g, c, 0 if h in NC else 1, x['page']))
VERBES = [  # (galwa, fr, mode, catégories, page)
 ("jena", "voir", "indef", {"animal", "oiseau", "poisson", "objet", "vetement", "plante", "lieu"}, 6),
 ("pôna", "regarder", "def", {"animal", "oiseau", "objet", "vetement", "plante"}, 11),
 ("kôla", "acheter", "indef", {"aliment", "poisson", "objet", "vetement", "boisson"}, 64),
 ("nya", "manger", "indef", {"aliment", "poisson"}, 9),
 ("jonga", "boire", "indef", {"boisson"}, 9),
 ("tonda", "aimer", "def", {"aliment", "vetement", "lieu", "boisson"}, 6),
 ("dènga", "trouver", "indef", {"objet", "vetement", "animal", "aliment"}, 15),
 ("bonga", "prendre", "def", {"objet", "vetement", "aliment"}, 11),
 ("tèva", "casser", "def", {"objet"}, 29),
 ("bèna", "planter", "indef", {"plante"}, 18),
]
LIEUX = [("nkala", "au village", 8), ("nagô", "à la maison", 8), ("kisini", "dans la cuisine", 18), ("iga", "dans la forêt", 31),
         ("ôloṽi", "à la rivière", 33), ("ntyuwa", "à la mer", 41), ("igala", "dans la cour", 8), ("lekoli", "à l'école", 10)]
LOC = {"nya": ["nagô", "kisini"], "kôla": ["nkala"], "jena": ["iga", "nkala", "igala"], "dènga": ["nagô", "igala"], "bonga": ["nagô", "kisini"], "bèna": ["nkala"]}
PRON = [("Myè", 0), ("We", 1), ("E", 2), ("Zwe", 3), ("Nwe", 4), ("Wi", 5)]
PERS = [("Rerè", "le père"), ("Ngwè", "la mère"), ("Onôme", "l'homme"), ("Omwantô", "la femme"), ("Omwana", "l'enfant"), ("Ômbalô", "l'oncle")]
PERS_PL = [("Awana", "les enfants"), ("Anaga", "les gens")]
SRC = "Composée — grammaire et vocabulaire de Teisserès & Dubois 1957 (galwa)"
out = []
def add(my, fr, th, pages):
    r = phr(my, fr, "composee", th, "galwa", SRC, "Galwa de Ngomo ; règles : leçons 1 (présent, p. 5) et 8 (futur be) ; lexique p. " + ", ".join(str(p) for p in pages) + " ; à valider")
    out.append(r)
from gen import THEME_CAT
for (vm, vf, mode, cats, vp) in VERBES:
    pres, fut = FRV[vf]
    for (my, fr, g, c, cpt, np) in [n for n in noms if n[3] in cats]:
        if vm == "bèna" and fr.split()[0] not in ("arbre", "palmier", "arbuste", "plante", "roseau", "bambou", "liane"): continue
        ofr = art(fr, g, "def" if c in ("lieu", "nature") else mode, cpt)
        th = "commerce_echanges_voyages" if vm == "kôla" else ("cuisine_agriculture" if vm in ("nya", "jonga") else THEME_CAT.get(c, "vie_quotidienne_famille"))
        for (pm, i) in PRON:
            add(joindre([pm, vm, my]), fr_sujet(i, pres[i]) + " " + ofr, th, [vp, np])
            add(joindre([pm, "be", vm, my]), fr_sujet(i, fut[i]) + " " + ofr, th, [vp, np])
        for (sm, sf) in PERS:
            add(joindre([sm, "e", vm, my]), sf + " " + pres[2] + " " + ofr, th, [vp, np])
            add(joindre([sm, "e", "be", vm, my]), sf + " " + fut[2] + " " + ofr, th, [vp, np])
        for (sm, sf) in PERS_PL:
            add(joindre([sm, "wi", vm, my]), sf + " " + pres[5] + " " + ofr, th, [vp, np])
        for (lm, lf, lp) in LIEUX:
            if lm in LOC.get(vm, []):
                for (pm, i) in [("Myè", 0), ("Zwe", 3)]:
                    add(joindre([pm, vm, my, "gô", lm]), fr_sujet(i, pres[i]) + " " + ofr + " " + lf, th, [vp, np, lp])
for (vm, vf, vp) in [("kènda", "aller", 6), ("seva", "jouer", 42), ("jina", "danser", 81)]:
    pres, fut = FRV[vf]
    for (lm, lf, lp) in LIEUX:
        for (pm, i) in PRON:
            add(joindre([pm, vm, "gô", lm]), fr_sujet(i, pres[i]) + " " + lf, "deplacements_lieux", [vp, lp])
            add(joindre([pm, "be", vm, "gô", lm]), fr_sujet(i, fut[i]) + " " + lf, "deplacements_lieux", [vp, lp])
        for (sm, sf) in PERS:
            add(joindre([sm, "e", vm, "gô", lm]), sf + " " + pres[2] + " " + lf, "deplacements_lieux", [vp, lp])
print("noms galwa", len(noms), "phrases", len(out))
json.dump(out, open('/home/claude/w/comp_galwa.json', 'w'), ensure_ascii=False)
for r in random.sample(out, 15): print(r['myene'], '|', r['fr'])
