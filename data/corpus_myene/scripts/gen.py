# -*- coding: utf-8 -*-
"""Composition de phrases à partir de cadres attestés.
Grammaire utilisée (et seulement celle-ci) :
- leçons omyènè, 02_grammaire_conjugaison/« Les pronoms et la conjugaison » : présent = pronom + radical (Mi nya) ;
  futur = pronom + bé + radical (Wé bé djèna) ; pronoms Mi, Wé, É, Zé, Nwé, Wé.
- leçons, 03_expressions_conversation : « Mi kènda go sikul », « Va myè aningo », « Wé buta go dèwa ? »,
  « Réryô ré na gwé ? », « Kôkôlô » ; élision g' / n' / voyelle finale (« Wé kamb'inongô »).
- Raponda-Walker 1995 pour le mpongwè : 2e pers. sg. « O » (« O re… », p. 46, 251), 3e « E » (« Etóndeng'iyè », p. 603),
  futur « bé » (« anwè bé po ipa », p. 31), « azwè » + verbe (« k'azwè dyena wao », p. 250).
Aucun accord de classe n'est produit : les noms n'apparaissent qu'en position d'objet ou après « go ».
"""
import json, random, re, collections, itertools
from lexique import LECONS_NOMS, LECONS_PERS, LECONS_PERS_PL, LIEUX
from commun import joindre, cle

random.seed(2026)
H_ASP = {"hyène", "haut", "hache", "harpe", "haricot", "hibou", "hamac", "hotte", "harpon"}

def voyelle(m):
    return m[0] in "aeiouéèêâîôûœh" and m.split()[0] not in H_ASP

def art(fr, g, mode, comptable=1):
    pl = fr.split()[0].endswith(("s", "x")) and g in ("fp", "mp")
    if mode == "def":
        if pl: return "les " + fr
        if voyelle(fr): return "l'" + fr
        return ("le " if g == "m" else "la ") + fr
    if mode == "indef":
        if g in ("fp", "mp"): return "des " + fr
        if not comptable:
            if voyelle(fr): return "de l'" + fr
            return ("du " if g == "m" else "de la ") + fr
        return ("un " if g == "m" else "une ") + fr
    raise ValueError

# Conjugaisons françaises : (présent [je,tu,il,nous,vous,ils], futur)
def er(r, fut=None):
    p = [r + "e", r + "es", r + "e", r + ("eons" if r.endswith("g") else "ons"), r + "ez", r + "ent"]
    f = fut or (r + "er")
    return p, [f + x for x in ("ai", "as", "a", "ons", "ez", "ont")]
FRV = {
 "voir": (["vois", "vois", "voit", "voyons", "voyez", "voient"], ["verrai", "verras", "verra", "verrons", "verrez", "verront"]),
 "regarder": er("regard"), "manger": er("mang"), "préparer": er("prépar"), "aimer": er("aim"), "trouver": er("trouv"),
 "fermer": er("ferm"), "arranger": er("arrang"), "casser": er("cass"), "pêcher": er("pêch"), "pousser": er("pouss"),
 "tirer": er("tir"), "jouer": er("jou"), "danser": er("dans"),
 "acheter": (["achète", "achètes", "achète", "achetons", "achetez", "achètent"], ["achèterai", "achèteras", "achètera", "achèterons", "achèterez", "achèteront"]),
 "boire": (["bois", "bois", "boit", "buvons", "buvez", "boivent"], ["boirai", "boiras", "boira", "boirons", "boirez", "boiront"]),
 "prendre": (["prends", "prends", "prend", "prenons", "prenez", "prennent"], ["prendrai", "prendras", "prendra", "prendrons", "prendrez", "prendront"]),
 "ouvrir": (["ouvre", "ouvres", "ouvre", "ouvrons", "ouvrez", "ouvrent"], ["ouvrirai", "ouvriras", "ouvrira", "ouvrirons", "ouvrirez", "ouvriront"]),
 "aller": (["vais", "vas", "va", "allons", "allez", "vont"], ["irai", "iras", "ira", "irons", "irez", "iront"]),
 "dormir": (["dors", "dors", "dort", "dormons", "dormez", "dorment"], ["dormirai", "dormiras", "dormira", "dormirons", "dormirez", "dormiront"]),
 "se baigner": (["me baigne", "te baignes", "se baigne", "nous baignons", "vous baignez", "se baignent"],
                ["me baignerai", "te baigneras", "se baignera", "nous baignerons", "vous baignerez", "se baigneront"]),
 "vouloir": (["veux", "veux", "veut", "voulons", "voulez", "veulent"], ["voudrai", "voudras", "voudra", "voudrons", "voudrez", "voudront"]),
}
SUJ_FR = ["je", "tu", "il", "nous", "vous", "ils"]
def fr_sujet(i, v):
    s = SUJ_FR[i]
    if s == "je" and v[0] in "aeiouéèh": return "j'" + v
    if i == 2: s = random.choice(["il", "elle"])
    if i == 5: s = random.choice(["ils", "elles"]) if random.random() < .3 else "ils"
    return s + " " + v

# Verbes : myènè (forme des leçons), verbe fr, mode d'article, catégories d'objets, attesté en mpongwè (Raponda) ?
VERBES = [
 ("dyèna", "voir", "indef", {"animal", "oiseau", "poisson", "objet", "vetement", "plante", "nature_c"}, "dyéna"),
 ("pona", "regarder", "def", {"animal", "oiseau", "objet", "vetement", "plante", "nature_c", "lieu"}, None),
 ("kola", "acheter", "indef", {"aliment", "poisson", "objet", "vetement", "animal_dom", "boisson"}, "kola"),
 ("nya", "manger", "indef", {"aliment", "poisson"}, "nya"),
 ("dyônga", "boire", "indef", {"boisson"}, None),
 ("namba", "préparer", "indef", {"aliment", "poisson"}, None),
 ("tônda", "aimer", "def", {"aliment", "animal_dom", "vetement", "lieu", "boisson"}, "tônda"),
 ("dènga", "trouver", "indef", {"objet", "vetement", "animal", "aliment", "poisson"}, "dènga"),
 ("bônga", "prendre", "def", {"objet", "vetement", "aliment"}, "bônga"),
 ("nunguna", "ouvrir", "def", {"ouvrable"}, "nunguna"),
 ("nundja", "fermer", "def", {"ouvrable"}, None),
 ("kékiza", "arranger", "def", {"maison_obj"}, "kékiza"),
 ("djona", "casser", "def", {"cassable"}, None),
 ("lôwa", "pêcher", "indef", {"poisson_vif"}, None),
 ("sika", "pousser", "def", {"poussable"}, "sika"),
 ("dura", "tirer", "def", {"tirable"}, None),
]
OUVRABLE = {"windè", "puka", "kôbôti y'ozira", "nago", "inyéla", "nôntché"}
MAISON = {"odo", "tavulu", "ébongo", "épwé z'atanga", "nago", "nôntché", "kisini", "owaro", "nag'ombo", "siti"}
CASSABLE = {"élasi", "tavulu", "épwé z'atanga", "ébongo", "windè"}
POUSSABLE = {"owaro", "loto", "tavulu", "ébongo"}
TIRABLE = {"ogôli", "owaro", "loto"}
DOM = {"mboni", "ndjôgôni", "pusi", "mbwa"}
NATURE_C = {"omwèyi", "ogwèli", "ogoula", "ningo"}
INTRANS = [("kènda", "aller", "mvt"), ("séva", "jouer", "loc"), ("dyina", "danser", "loc"), ("dèwa", "dormir", "loc")]

def cats_of(n):
    my, fr, g, c, cpt = n
    s = {c}
    if c == "poisson" and " " not in my: s.add("poisson_vif")
    if my in OUVRABLE: s.add("ouvrable")
    if my in MAISON: s.add("maison_obj")
    if my in CASSABLE: s.add("cassable")
    if my in POUSSABLE: s.add("poussable")
    if my in TIRABLE: s.add("tirable")
    if my in DOM: s.add("animal_dom")
    if my in NATURE_C: s.add("nature_c")
    return s

THEME_CAT = {"animal": "chasse_faune_nature", "oiseau": "chasse_faune_nature", "poisson": "peche_navigation",
             "aliment": "cuisine_agriculture", "boisson": "cuisine_agriculture", "objet": "artisanat_outils",
             "vetement": "habillement_parure", "plante": "nature_plantes_pharmacopee", "lieu": "deplacements_lieux",
             "nature": "temps_climat_environnement", "corps": "sante_corps_spiritualite"}
DOUCE = {"ndumi", "nkèmbè", "oyara", "ilômba", "omwenguè", "nkéné", "mpuna", "osèndjèlè"}
LOC_OK = {"kola": {"aliment": ["nkala"], "poisson": ["nkala"], "objet": ["nkala"], "vetement": ["nkala"], "animal": ["nkala"], "boisson": ["nkala"]},
          "nya": {"aliment": ["nago", "kisini", "nkala"], "poisson": ["nago", "kisini"]},
          "namba": {"aliment": ["kisini"], "poisson": ["kisini"]},
          "dyèna": {"animal": ["iga", "nkala"], "oiseau": ["iga", "ntchuwa"], "objet": ["nago"], "plante": ["iga"], "poisson": ["ntchuwa"]},
          "dyéna": {"animal": ["nkala"], "oiseau": ["nkala"], "objet": ["nago"], "plante": ["nkala"]},
          "dènga": {"objet": ["nago", "okili"], "vetement": ["nôntché", "nago"], "animal": ["iga"]},
          "bônga": {"objet": ["nago", "kisini"], "vetement": ["nôntché"], "aliment": ["kisini"]},
          "lôwa": {"poisson": ["ntchuwa", "owaro"]}}
def lieux_pour(vm, n, lieux):
    my, fr, g, c, cpt = n
    ok = LOC_OK.get(vm, {}).get(c, [])
    if vm == "lôwa" and my in DOUCE: return [("olôwi", "dans la rivière")]
    if c == "poisson" and my in DOUCE: ok = [l for l in ok if l != "ntchuwa"]
    return [(lm, lf) for (lm, lf) in lieux + [("owaro", "depuis la pirogue")] if lm in ok and not (lm == "owaro" and vm != "lôwa")]

def theme(verbe, n):
    my, fr, g, c, cpt = n
    if verbe == "kola": return "commerce_echanges_voyages"
    if verbe == "lôwa": return "peche_navigation"
    if verbe in ("namba", "nya") and c in ("aliment", "poisson"): return "cuisine_agriculture"
    if my in MAISON and c != "lieu": return "maison_habitat"
    return THEME_CAT.get(c, "vie_quotidienne_famille")

def phr(my, fr, typ, them, dial, src, note=""):
    my = my[0].upper() + my[1:]
    fr = fr[0].upper() + fr[1:]
    if not my.endswith(("?", ".", "!")): my += "."
    if not fr.endswith(("?", ".", "!")): fr += "."
    return dict(myene=my, fr=fr, type=typ, theme=them, dialecte=dial, source=src, note=note)

def generer(noms, pers, pers_pl, lieux, dial, pron, verbes_ok, src):
    """Produit toutes les combinaisons ; l'échantillonnage se fait après."""
    out = []
    PRON = pron  # [(myene, index_fr)]
    for (vm, vf, mode, cats, mp) in VERBES:
        if verbes_ok is not None:
            if not mp: continue
            vm = mp
        pres, fut = FRV[vf]
        objs = [n for n in noms if cats & cats_of(n) and not (vm in ("namba",) and n[1].split()[0] in ("sel", "huile", "miel", "sucre", "eau", "piment"))]
        for n in objs:
            my, fr, g, c, cpt = n
            o_fr = art(fr, g, "def" if my in NATURE_C else mode, cpt)
            th = theme(vm, n)
            for (pm, i) in PRON:
                out.append(phr(joindre([pm, vm, my]), fr_sujet(i, pres[i]) + " " + o_fr, "composee", th, dial, src))
                out.append(phr(joindre([pm, "bé", vm, my]), fr_sujet(i, fut[i]) + " " + o_fr, "composee", th, dial, src))
                if i == 1:
                    out.append(phr(joindre([pm, vm, my]) + " ?", "est-ce que tu " + pres[1] + " " + o_fr + " ?", "composee", "expressions_quotidiennes", dial, src))
            for (sm, sf, sg) in pers:
                out.append(phr(joindre([sm, "é", vm, my]) if dial == "orungu" else joindre([sm, "e", vm, my]),
                               sf + " " + pres[2] + " " + o_fr, "composee", th, dial, src))
                out.append(phr(joindre([sm, "bé", vm, my]), sf + " " + fut[2] + " " + o_fr, "composee", th, dial, src))
            for (sm, sf) in pers_pl:
                out.append(phr(joindre([sm, "wé", vm, my]), sf + " " + pres[5] + " " + o_fr, "composee", th, dial, src))
            for (lm, lf) in lieux_pour(vm, n, lieux):
                for (pm, i) in PRON[:1] + PRON[3:4]:
                    out.append(phr(joindre([pm, vm, my, "go", lm]), fr_sujet(i, pres[i]) + " " + o_fr + " " + lf, "composee", th, dial, src))
                out.append(phr("Mènè, " + joindre([PRON[0][0].lower(), "bé", vm, my, "go", lm]), "demain, " + fr_sujet(0, fut[0]) + " " + o_fr + " " + lf, "composee", th, dial, src))
    # verbes de mouvement / activité + lieu
    if verbes_ok is None or True:
        for (vm, vf, k) in INTRANS:
            if verbes_ok is not None and vm not in verbes_ok: continue
            pres, fut = FRV[vf]
            for (lm, lf) in lieux:
                lf2 = lf
                for (pm, i) in PRON:
                    out.append(phr(joindre([pm, vm, "go", lm]), fr_sujet(i, pres[i]) + " " + lf2, "composee", "deplacements_lieux", dial, src))
                    out.append(phr(joindre([pm, "bé", vm, "go", lm]), fr_sujet(i, fut[i]) + " " + lf2, "composee", "deplacements_lieux", dial, src))
                for (sm, sf, sg) in pers:
                    out.append(phr(joindre([sm, "é" if dial == "orungu" else "e", vm, "go", lm]), sf + " " + pres[2] + " " + lf2, "composee", "deplacements_lieux", dial, src))
                for (sm, sf) in pers_pl:
                    out.append(phr(joindre([sm, "wé", vm, "go", lm]), sf + " " + pres[5] + " " + lf2, "composee", "deplacements_lieux", dial, src))
    return out

def generer_orungu_extra(noms, pers, src):
    out = []
    # « Wé buta go + verbe » (leçons : « Wé buta go dèwa ? »)
    vpres, vfut = FRV["vouloir"]
    for (vm, vf, mode, cats, mp) in VERBES[:9]:
        for n in [n for n in noms if cats & cats_of(n)]:
            my, fr, g, c, cpt = n
            o_fr = art(fr, g, mode, cpt)
            for (pm, i) in [("Mi", 0), ("Wé", 1), ("Zé", 3)]:
                q = " ?" if i == 1 else ""
                out.append(phr(joindre([pm, "buta", "go", vm, my]) + q, fr_sujet(i, vpres[i]) + " " + vf + " " + o_fr + q, "composee", theme(vm, n), "orungu", src))
    # « Va myè X, kôkôlô » (leçons : « Va myè aningo », « Kôkôlô »)
    for n in noms:
        my, fr, g, c, cpt = n
        if c in ("lieu", "nature", "plante", "corps", "animal", "oiseau"): continue
        o_fr = art(fr, g, "indef" if not cpt else "def", cpt)
        for (om, of) in [("myè", "donne-moi"), ("yè", "donne-lui"), ("zwè", "donne-nous")]:
            out.append(phr("Va " + om + " " + my + ", kôkôlô", of + " " + o_fr + ", s'il te plaît", "composee", "expressions_quotidiennes", "orungu", src))
            out.append(phr("Va " + om + " " + my, of + " " + o_fr, "composee", "expressions_quotidiennes", "orungu", src))
    # « X ré na gwé ? » (leçons : « Réryô ré na gwé ? »)
    for (sm, sf, sg) in pers:
        out.append(phr(sm + " ré na gwé ?", "où est " + sf + " ?", "composee", "expressions_quotidiennes", "orungu", src))
    # sôvuna go ntchuwa (Raponda p. 571 : « Sóvuna go ntȼuwa », se baigner dans la mer)
    pres, fut = FRV["se baigner"]
    for (pm, i) in [("Mi", 0), ("Wé", 1), ("É", 2), ("Zé", 3), ("Nwé", 4), ("Wé", 5)]:
        out.append(phr(joindre([pm, "sôvuna", "go", "ntchuwa"]), fr_sujet(i, pres[i]) + " dans la mer", "composee", "sante_hygiene_soins", "orungu", src))
        out.append(phr(joindre([pm, "bé", "sôvuna", "go", "ntchuwa"]), fr_sujet(i, fut[i]) + " dans la mer", "composee", "sante_hygiene_soins", "orungu", src))
    return out

if __name__ == "__main__":
    SRC_L = "Composée — lexique et conjugaison des leçons omyènè (03_lecons_omyene)"
    SRC_R = "Composée — noms de Raponda-Walker 1995, verbes attestés dans ses exemples"
    noms_l = [(a, b, c, d, e) for (a, b, c, d, e) in LECONS_NOMS]
    pron_o = [("Mi", 0), ("Wé", 1), ("É", 2), ("Zé", 3), ("Nwé", 4), ("Wé", 5)]
    o = generer(noms_l, LECONS_PERS, LECONS_PERS_PL, LIEUX, "orungu", pron_o, None, SRC_L)
    o += generer_orungu_extra(noms_l, LECONS_PERS, SRC_L)
    R = json.load(open("/home/claude/w/noms_raponda.json"))
    noms_r = [(r["my"], r["fr"], r["g"], r["cat"], r["comptable"]) for r in R]
    pron_m = [("Mi", 0), ("O", 1), ("E", 2), ("Azwè", 3), ("Anwè", 4)]
    pers_m = [("Onomé", "l'homme", "m"), ("Omwana", "l'enfant", "m"), ("Onèrô", "l'ancien", "m"), ("Omwanto", "la femme", "f")]
    m = generer(noms_r, pers_m, [], [("nkala", "au village"), ("nago", "à la maison")], "mpongwe", pron_m,
                {"kènda", "séva"}, SRC_R)
    for r in m: r["note"] = "Mpongwè (lexique Raponda-Walker) ; verbes et pronoms attestés dans ses exemples, phrase à faire valider"
    print("orungu", len(o), "mpongwe", len(m))
    json.dump(o, open("/home/claude/w/comp_orungu.json", "w"), ensure_ascii=False)
    json.dump(m, open("/home/claude/w/comp_mpongwe.json", "w"), ensure_ascii=False)
    for r in random.sample(o, 20) + random.sample(m, 10): print(r["dialecte"], "|", r["myene"], "|", r["fr"])
