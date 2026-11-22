#!/usr/bin/env python3
"""Lot 3 du cursus v3 (consigne 14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md ; audit 05, proposition B) :
Ogêndo « Lire et écrire » sur l'alphabet de Rékanga, sans terme de spécialiste. Idempotent (identifiants le-*).

Mots employés : uniquement ceux des règles de référence v3.3 (§ 2, § 3, § 9) et des cours déjà relus, avec le même sens.
Aucun signe (‘, tréma, accent grave) n'est enseigné ici : chacun vient avec la règle qu'il note (lot 4).
Ntina palier 3 : « J'écris » fait aussi tracer c, j et ny ; la dictée « Kôkôlô » n'accepte plus « Kokolo » (ô est une lettre).
"""
import json, os

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
C = os.path.join(OMP, "packages/noyau/contenu")
SRC = "Règles de référence v3.3 (§ 2 lettres, § 9 mots décidés par Capp) ; alphabet de Rékanga"

UNITE = {"id": "ogendo-u7", "parcours_id": "ogendo", "titre": "Lire et écrire", "titre_myene": "",
         "description": "L'alphabet de l'ôrungu : les sept voyelles, le chapeau qui change le sens, les lettres simples, c et j, ny et ngh, les lettres qui vont par deux, la musique des mots et les mots venus d'ailleurs.",
         "ordre": 1, "publie": True}
LECONS = [  # id, titre, ordre
    ("ogendo-l18", "Les sept voyelles", 1), ("ogendo-l19", "Le chapeau change le sens", 2), ("ogendo-l20", "Les lettres simples", 3),
    ("ogendo-l21", "c et j", 4), ("ogendo-l22", "ny, sh, jh, ngh", 5), ("ogendo-l23", "Les lettres qui vont par deux", 6),
    ("ogendo-l1", "Révision : les consonnes de l'ôrungu", 7), ("ogendo-l2", "La musique des mots", 8), ("ogendo-l24", "Les mots venus d'ailleurs", 9),
]

E = []


def ex(lecon, n, type_, **k):
    d = {"id": f"le-{lecon[-3:]}-{n:02d}", "lecon_id": lecon, "type": type_, **k, "source": k.pop("source", SRC) if "source" in k else SRC, "ordre": n}
    E.append(d)


def mot(lecon, n, m, sens, ill=None):
    ex(lecon, n, "ecouter", consigne="Lis, écoute et répète.", mot_myene=m, mot_francais=sens, **({"illustration": ill} if ill else {}))


# 1. Les sept voyelles
L = "ogendo-l18"
ex(L, 1, "cours", consigne="Les sept voyelles", texte="L'ôrungu a sept voyelles : a, e, ê, i, o, ô, u. Deux portent un chapeau : ê et ô. Le e se dit la bouche un peu ouverte ; le ê, la bouche plus ouverte. Le o se dit les lèvres arrondies ; le ô, la bouche bien ouverte.",
   conseil="Chaque lettre se dit toujours : le e n'est jamais muet.")
for i, (m, s, il) in enumerate([("akewa", "merci", "🙏"), ("kisini", "la cuisine", "🍳"), ("epokolo", "le chapeau", "👒"), ("ekuru", "le hibou", "🦉"), ("mbêrê", "la sardine", "🐟"), ("akôndô", "les bananes plantains", "🍌")], 2):
    mot(L, i, m, s, il)
ex(L, 8, "quel_son", consigne="Quelle voyelle avec un chapeau entends-tu dans « akôndô » ?", mot_myene="akôndô", mot_francais="les bananes plantains", illustration="🍌", options=["o", "ô", "u"], reponse="ô")
ex(L, 9, "quel_son", consigne="Quelle voyelle se répète dans « mbêrê » ?", mot_myene="mbêrê", mot_francais="la sardine", illustration="🐟", options=["e", "ê", "i"], reponse="ê")
ex(L, 10, "quel_son", consigne="Par quelle voyelle commence « ekuru » ?", mot_myene="ekuru", mot_francais="le hibou", illustration="🦉", options=["e", "ê", "a"], reponse="e")
ex(L, 11, "tracer", consigne="Écris la voyelle avec un chapeau.", graphie="ê")
ex(L, 12, "tracer", consigne="Écris la voyelle avec un chapeau.", graphie="ô")
ex(L, 13, "dictee", consigne="Écris en myènè le mot qui veut dire « merci ».", mot_francais="merci", reponse="Akewa", indice="Il commence par « Ak… ».")
ex(L, 14, "dire", consigne="Dis « akôndô » à voix haute.", mot_myene="akôndô", mot_francais="les bananes plantains", illustration="🍌")

# 2. Le chapeau change le sens
L = "ogendo-l19"
ex(L, 1, "cours", consigne="Le chapeau change le sens", texte="Un petit chapeau sur le e ou sur le o, et le mot change : mpono, le couvercle ; mpônô, le chemin. nkondo, la carpe ; nkôndô, la troupe. rerê, papa ; rere, les arbres.",
   conseil="Écoute bien : avec le chapeau, la bouche s'ouvre davantage.")
for i, (m, s, il) in enumerate([("mpono", "le couvercle", "🫙"), ("mpônô", "le chemin", "🛤️"), ("nkondo", "la carpe", "🐟"), ("nkôndô", "la troupe", "👥"), ("rerê", "papa", "👨"), ("rere", "les arbres", "🌳"), ("igôla", "les montres", "⌚"), ("igola", "les vers", "🪱")], 2):
    mot(L, i, m, s, il)
ex(L, 10, "choix", consigne="Lequel veut dire « le chemin » ?", options=["mpônô", "mpono"], reponse="mpônô", illustration="🛤️")
ex(L, 11, "choix", consigne="Lequel veut dire « papa » ?", options=["rere", "rerê"], reponse="rerê", illustration="👨")
ex(L, 12, "choix", consigne="Lequel veut dire « la carpe » ?", options=["nkôndô", "nkondo"], reponse="nkondo", illustration="🐟")
ex(L, 13, "choix", consigne="Lequel veut dire « les montres » ?", options=["igola", "igôla"], reponse="igôla", illustration="⌚")
ex(L, 14, "dictee", consigne="Écris en myènè le mot qui veut dire « le chemin ».", mot_francais="le chemin", reponse="mpônô", indice="N'oublie pas les chapeaux.")

# 3. Les lettres simples
L = "ogendo-l20"
ex(L, 1, "cours", consigne="Les lettres simples", texte="b, d, f, g, k, l, m, n, p, r, s, t, v, w, y, z. Le g est toujours dur ; entre deux voyelles, il se dit plus doux. Le s reste dur. Le r se dit en tapant une seule fois la langue. Le v est un seul son, entre v et w.")
for i, (m, s, il) in enumerate([("ebanda", "la peau", "🤚"), ("ogolo", "le pied", "🦶"), ("ivava", "l'aile", "🪽"), ("swaka", "le couteau", "🔪"), ("nago", "la maison", "🏠")], 2):
    mot(L, i, m, s, il)
ex(L, 7, "quel_son", consigne="Quelle lettre entends-tu deux fois dans « ivava » ?", mot_myene="ivava", mot_francais="l'aile", illustration="🪽", options=["v", "w", "b"], reponse="v")
ex(L, 8, "quel_son", consigne="Quelle lettre commence « swaka » ?", mot_myene="swaka", mot_francais="le couteau", illustration="🔪", options=["s", "z", "c"], reponse="s")
ex(L, 9, "choix", consigne="Comment dit-on « le pied » ?", options=["ogolo", "nago", "swaka"], reponse="ogolo", illustration="🦶")
ex(L, 10, "dictee", consigne="Écris en myènè le mot qui veut dire « la maison ».", mot_francais="la maison", reponse="nago")
ex(L, 11, "dictee", consigne="Écris en myènè le mot qui veut dire « le pied ».", mot_francais="le pied", reponse="ogolo")
ex(L, 12, "tracer", consigne="Écris la lettre.", graphie="v")

# 4. c et j
L = "ogendo-l21"
ex(L, 1, "cours", consigne="c et j", texte="Le c se dit « tch » : incango, les nouvelles ; ncaro, trois. Le j se dit « dy » ou « dj » : jêna, voir ; njôgu, l'éléphant. On les retrouve dans Onênji, le nom du module où tu apprends.",
   conseil="Après n, ils ne font qu'un son avec le n : nc, nj.")
for i, (m, s, il) in enumerate([("incango", "les nouvelles", "📰"), ("ncaro", "trois", "3️⃣"), ("jêna", "voir", "👀"), ("njôgu", "l'éléphant", "🐘"), ("njina", "le gorille", "🦍")], 2):
    mot(L, i, m, s, il)
ex(L, 7, "quel_son", consigne="Quelle lettre entends-tu au début de « jêna » ?", mot_myene="jêna", mot_francais="voir", illustration="👀", options=["j", "c", "y"], reponse="j")
ex(L, 8, "quel_son", consigne="Quelles lettres entends-tu au début de « ncaro » ?", mot_myene="ncaro", mot_francais="trois", illustration="3️⃣", options=["nc", "nj", "c"], reponse="nc")
ex(L, 9, "choix", consigne="Comment dit-on « l'éléphant » ?", options=["njôgu", "njina", "incango"], reponse="njôgu", illustration="🐘")
ex(L, 10, "dictee", consigne="Écris en myènè le mot qui veut dire « trois ».", mot_francais="trois", reponse="ncaro")
ex(L, 11, "dictee", consigne="Écris en myènè le mot qui veut dire « les nouvelles ».", mot_francais="les nouvelles", reponse="incango")
ex(L, 12, "tracer", consigne="Écris la lettre.", graphie="c")
ex(L, 13, "tracer", consigne="Écris la lettre.", graphie="j")
ex(L, 14, "dire", consigne="Dis « njôgu » à voix haute.", mot_myene="njôgu", mot_francais="l'éléphant", illustration="🐘")

# 5. ny, sh, jh, ngh
L = "ogendo-l22"
ex(L, 1, "cours", consigne="ny, sh, jh, ngh", texte="Certains sons s'écrivent avec plusieurs lettres. ny : nyama, la viande. ngh se fait au fond de la bouche : nghomba, le porc-épic ; nghango, le médicament ; nghandi, la jalousie. sh et jh sont rares.",
   conseil="Ces lettres ne se séparent jamais : ny, ngh, sh, jh font chacune un seul son.")
for i, (m, s, il) in enumerate([("nyama", "la viande", "🍖"), ("nghomba", "le porc-épic", "🦔"), ("nghango", "le médicament", "💊"), ("nghandi", "la jalousie", "😒")], 2):
    mot(L, i, m, s, il)
ex(L, 6, "quel_son", consigne="Par quelles lettres commence « nghomba » ?", mot_myene="nghomba", mot_francais="le porc-épic", illustration="🦔", options=["ngh", "ng", "ny"], reponse="ngh")
ex(L, 7, "quel_son", consigne="Par quelles lettres commence « nyama » ?", mot_myene="nyama", mot_francais="la viande", illustration="🍖", options=["ny", "n", "ngh"], reponse="ny")
ex(L, 8, "choix", consigne="Comment dit-on « le médicament » ?", options=["nghango", "nghandi", "nyama"], reponse="nghango", illustration="💊")
ex(L, 9, "dictee", consigne="Écris en myènè le mot qui veut dire « le porc-épic ».", mot_francais="le porc-épic", reponse="nghomba")
ex(L, 10, "tracer", consigne="Écris les lettres.", graphie="ny")
ex(L, 11, "tracer", consigne="Écris les lettres.", graphie="ngh")
ex(L, 12, "dire", consigne="Dis « nghomba » à voix haute.", mot_myene="nghomba", mot_francais="le porc-épic", illustration="🦔")

# 6. Les lettres qui vont par deux
L = "ogendo-l23"
ex(L, 1, "cours", consigne="Les lettres qui vont par deux", texte="m ou n devant une autre lettre se disent d'un seul coup : mb, mp, mf, nd, nt, nc, nj, ng, nk. On ne les sépare jamais quand on coupe un mot : na-go, a-wa-na, mbwa, i-ka-ka, kê-ma, e-wo-njo.")
for i, (m, s, il) in enumerate([("mbwa", "le chien", "🐕"), ("mpêmba", "le pain", "🍞"), ("nkambi", "l'antilope", "🦌"), ("njina", "le gorille", "🦍")], 2):
    mot(L, i, m, s, il)
ex(L, 6, "choix", consigne="Comment coupe-t-on « ewonjo » (la tête) ?", options=["e-wo-njo", "e-won-jo"], reponse="e-wo-njo")
ex(L, 7, "choix", consigne="Comment coupe-t-on « awana » (les enfants) ?", options=["a-wa-na", "aw-a-na"], reponse="a-wa-na")
ex(L, 8, "choix", consigne="Comment coupe-t-on « kêma » (le singe) ?", options=["kê-ma", "kêm-a"], reponse="kê-ma")
ex(L, 9, "choix", consigne="Comment dit-on « l'antilope » ?", options=["nkambi", "mbwa", "mpêmba"], reponse="nkambi", illustration="🦌")
ex(L, 10, "dictee", consigne="Écris en myènè le mot qui veut dire « le chien ».", mot_francais="le chien", reponse="mbwa")
ex(L, 11, "tracer", consigne="Écris les lettres qui vont ensemble.", graphie="nd")

# 9. Les mots venus d'ailleurs
L = "ogendo-l24"
ex(L, 1, "cours", consigne="Les mots venus d'ailleurs", texte="Dans les mots de l'ôrungu, an, en, on se lisent a-n, e-n, o-n. Les mots venus d'autres langues peuvent garder leur son par le nez : on l'écrit avec n ou m après la voyelle, comme dans kômpita, l'ordinateur.",
   conseil="Quand un mot n'existe pas en myènè, on garde le mot français tel quel.")
mot(L, 2, "kômpita", "l'ordinateur", "💻")
ex(L, 3, "choix", consigne="Comment dit-on « l'ordinateur » ?", options=["kômpita", "kisini", "nago"], reponse="kômpita", illustration="💻")
ex(L, 4, "dictee", consigne="Écris en myènè le mot qui veut dire « l'ordinateur ».", mot_francais="l'ordinateur", reponse="kômpita")
ex(L, 5, "dire", consigne="Dis « kômpita » à voix haute.", mot_myene="kômpita", mot_francais="l'ordinateur", illustration="💻")

# Ntina palier 3 : « J'écris » trace aussi c, j, ny
for n, g in ((11, "c"), (12, "j"), (13, "ny")):
    E.append({"id": f"ntina-l33-tr-{g}", "lecon_id": "ntina-l33", "type": "tracer", "consigne": "Écris la lettre.", "graphie": g, "source": SRC, "ordre": n})


def main():
    U = json.load(open(os.path.join(C, "unites.json"), encoding="utf-8"))
    Ls = json.load(open(os.path.join(C, "lecons.json"), encoding="utf-8"))
    X = json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8"))
    # unités : la nouvelle en tête d'Ogêndo, l'ancienne garde les leçons de sons en aide
    U = [u for u in U if u["id"] != UNITE["id"]] + [UNITE]
    ordre = {"ogendo-u7": 1, "ntina-u3": 2, "ntina-u4": 3, "ogendo-u6": 4, "ogendo-u2": 5, "ogendo-u3": 6, "ogendo-u4": 7, "ogendo-u5": 8}
    for u in U:
        if u["id"] in ordre:
            u["ordre"] = ordre[u["id"]]
        if u["id"] == "ntina-u3":
            u["titre"], u["description"] = "Les sons en détail", "Pour aller plus loin : chaque voyelle et chaque consonne, comment la bouche les fait, avec beaucoup d'exemples."
        if u["id"] == "ikoko-u1" and u.get("suite_id") == "ntina-u3":
            u["suite_id"] = "ogendo-u7"
    nouveaux = {i for i, _, _ in LECONS}
    for l in Ls:
        if l["id"] in ("ogendo-l1", "ogendo-l2"):
            l["unite_id"] = "ogendo-u7"
            l["ordre"] = dict((i, o) for i, _, o in LECONS)[l["id"]]
            if l["id"] == "ogendo-l2":
                l["titre"] = "La musique des mots"
    Ls = [l for l in Ls if l["id"] not in nouveaux or l["id"] in ("ogendo-l1", "ogendo-l2")]
    for i, t, o in LECONS:
        if i not in ("ogendo-l1", "ogendo-l2"):
            Ls.append({"id": i, "unite_id": "ogendo-u7", "titre": t, "duree_min": 8, "xp": 20, "mode": "tous", "niveau_acces": "libre", "ordre": o, "publie": True})
    ids = {e["id"] for e in E}
    X = [e for e in X if e["id"] not in ids]
    for e in X:  # ô est une lettre : plus de variante sans chapeau
        if e["id"] == "e16" and e.get("reponse") == "Kôkôlô/Kokolo":
            e["reponse"] = "Kôkôlô"
    X += E
    for n, d in (("unites", U), ("lecons", Ls), ("exercices", X)):
        for dossier in (C, os.path.join(OMP, "contenu/exemples")):
            with open(os.path.join(dossier, n + ".json"), "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, indent=1); f.write("\n")
    print(f"unité {UNITE['id']} : {len(LECONS)} leçons ; {len(E)} exercices ajoutés")


if __name__ == "__main__":
    main()
