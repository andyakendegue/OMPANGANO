#!/usr/bin/env python3
"""Lot 4 du cursus v3 (consigne 14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md ; audit 05, proposition C) :
Ogêndo « Faire des phrases » : « Hier » avec les trois passés, « Dire non », puis le ou un, donner un ordre, un ou plusieurs,
compter les choses, c'est à moi, les mots au pluriel, celui qui… Idempotent (identifiants fp-*).

Exemples : SEULEMENT ceux des règles de référence v3.3 (§ 3, 5, 6, 7, 11 ; décisions de Capp), avec leur traduction.
Chaque leçon enseigne une règle et le signe qui la note ; pas de dictée exigeant un signe difficile à taper (choix à la place).
"""
import json, os

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
C = os.path.join(OMP, "packages/noyau/contenu")
E = []
LECONS = [  # id, titre, ordre dans l'unité ogendo-u6
    ("ogendo-l13", None, 1), ("ogendo-l14", None, 2), ("ogendo-l15", "Hier : les trois passés", 3), ("ogendo-l25", "Dire non", 4),
    ("ogendo-l16", None, 5), ("ogendo-l17", None, 6), ("ogendo-l26", "Le ou un ?", 7), ("ogendo-l27", "Donner un ordre", 8),
    ("ogendo-l28", "Un ou plusieurs, petit ou grand", 9), ("ogendo-l29", "Compter les choses", 10), ("ogendo-l30", "C'est à moi", 11),
    ("ogendo-l31", "Les mots au pluriel", 12), ("ogendo-l32", "Celui qui…", 13),
]


def ex(lecon, n, type_, source, **k):
    E.append({"id": f"fp-{lecon[-3:]}-{n:02d}", "lecon_id": lecon, "type": type_, **k, "source": source, "ordre": n})


def phrases(lecon, debut, source, liste):
    for i, (m, f) in enumerate(liste, debut):
        ex(lecon, i, "ecouter", source, consigne="Écoute et répète.", mot_myene=m, mot_francais=f)


# « Hier » : les trois passés (ajouts à la leçon existante ; ses exercices corrigés gardent leur identifiant)
S = "Règles de référence v3.3 § 6.2 (Capp, 22 nov. 2026)"
phrases("ogendo-l15", 20, S, [("A bya", "il est venu"), ("A byeni", "il vient d'arriver, il est là"), ("Ma nya", "j'ai mangé")])
ex("ogendo-l15", 23, "associer", S, consigne="Que veut dire « A byeni » ?", mot_myene="A byeni", options=["il vient d'arriver, il est là", "il était venu", "il est venu", "il n'est pas encore venu"], reponse="il vient d'arriver, il est là")
ex("ogendo-l15", 24, "choix", S, consigne="Comment dit-on « il est venu » ?", options=["A bya", "A wyeni", "A byeni"], reponse="A bya", indice="A wyeni veut dire « il était venu » : c'est fini, sans lien avec maintenant.")

# Dire non
L, S = "ogendo-l25", "Règles de référence v3.3 § 6.3 (Capp, 22 nov. 2026)"
ex(L, 1, "cours", S, consigne="Dire non", texte="Pour dire non, on met « re » devant le verbe : Myê re nya, je ne mange pas. Pour « jamais », le verbe finit en « e » : Ê re bye, il n'est jamais venu. Pour « pas encore », on met « pa » devant le verbe : Ê pa bya, il n'est pas encore venu.",
   conseil="Attention à la place de « pa » : après le verbe, c'est fait ! Myê re nya pa njôgôni : j'ai mangé du poulet.")
phrases(L, 2, S, [("Myê re nya", "je ne mange pas"), ("Ê re bye", "il n'est jamais venu"), ("Ê pa bya", "il n'est pas encore venu"), ("Myê re nya pa njôgôni", "j'ai mangé du poulet"), ("Ezele !", "non !")])
ex(L, 7, "associer", S, consigne="Que veut dire « Ê pa bya » ?", mot_myene="Ê pa bya", options=["il n'est pas encore venu", "il n'est jamais venu", "il est venu", "il était venu"], reponse="il n'est pas encore venu")
ex(L, 8, "associer", S, consigne="Que veut dire « Myê re nya » ?", mot_myene="Myê re nya", options=["je ne mange pas", "j'ai mangé", "je vais manger", "je mange"], reponse="je ne mange pas")
ex(L, 9, "choix", S, consigne="Comment dit-on « il n'est jamais venu » ?", options=["Ê re bye", "Ê pa bya", "A bya"], reponse="Ê re bye")
ex(L, 10, "choix", S, consigne="Laquelle veut dire « j'ai mangé du poulet » ?", options=["Myê re nya pa njôgôni", "Myê re nya", "Myê be nya"], reponse="Myê re nya pa njôgôni", indice="« pa » après le verbe : c'est fait.")
ex(L, 11, "dire", S, consigne="Dis « Ezele ! » à voix haute.", mot_myene="Ezele !", mot_francais="non !")

# Le ou un ?
L, S = "ogendo-l26", "Règles de référence v3.3 § 3 (indéfini ‘) ; paires un / le de la leçon des tons"
ex(L, 1, "cours", S, consigne="Le ou un ?", texte="Un petit signe ‘ devant le mot veut dire « un », « une » ou « des » : ‘oma, un homme ; oma, l'homme. ‘oga, un roi ; oga, le roi. On ne le met jamais devant un nombre.",
   conseil="Un mot appris seul se dit sans ‘ : oma, l'homme.")
phrases(L, 2, S, [("oma", "l'homme"), ("‘oma", "un homme"), ("oga", "le roi"), ("‘oga", "un roi"), ("ezo", "le mortier"), ("‘ezo", "un mortier"), ("‘epokolw'evolo", "un grand chapeau")])
ex(L, 9, "choix", S, consigne="Lequel veut dire « un homme » ?", options=["‘oma", "oma"], reponse="‘oma")
ex(L, 10, "choix", S, consigne="Lequel veut dire « le roi » ?", options=["oga", "‘oga"], reponse="oga")
ex(L, 11, "associer", S, consigne="Que veut dire « ‘ezo » ?", mot_myene="‘ezo", options=["un mortier", "le mortier", "les mortiers", "un roi"], reponse="un mortier")

# Donner un ordre
L, S = "ogendo-l27", "Règles de référence v3.3 § 3 et § 6.5 (impératif, accent grave)"
ex(L, 1, "cours", S, consigne="Donner un ordre", texte="Pour donner un ordre, la première lettre du verbe s'adoucit et la première voyelle porte un accent qui descend : Và myê aningo, donne-moi de l'eau. Gềnda godêwa !, va dormir. Yàga gonya, viens manger.",
   conseil="L'accent change le sens : ròra, déménage ! ; rora, les épouses.")
phrases(L, 2, S, [("Và myê aningo", "donne-moi de l'eau"), ("Gềnda godêwa !", "va dormir !"), ("Yàga gonya", "viens manger"), ("Lwàna bäru !", "assieds-toi !"), ("ròra", "déménage !"), ("rora", "les épouses")])
ex(L, 8, "choix", S, consigne="Lequel est un ordre : « déménage ! » ?", options=["ròra", "rora"], reponse="ròra")
ex(L, 9, "associer", S, consigne="Que veut dire « Và myê aningo » ?", mot_myene="Và myê aningo", options=["donne-moi de l'eau", "viens manger", "va dormir", "assieds-toi"], reponse="donne-moi de l'eau")
ex(L, 10, "choix", S, consigne="Comment dit-on « va dormir ! » ?", options=["Gềnda godêwa !", "Yàga gonya", "Lwàna bäru !"], reponse="Gềnda godêwa !")
ex(L, 11, "dire", S, consigne="Dis « Yàga gonya » à voix haute.", mot_myene="Yàga gonya", mot_francais="viens manger")

# Un ou plusieurs, petit ou grand
L, S = "ogendo-l28", "Règles de référence v3.3 § 3 (élision ou semi-voyelle)"
ex(L, 1, "cours", S, consigne="Un ou plusieurs, petit ou grand", texte="Quand deux mots se suivent, la dernière voyelle du premier peut tomber ou se changer. Pour une seule chose ou une petite chose, elle tombe : ogol'omôri, un pied ; epokol'inyango, le petit chapeau. Pour plusieurs choses ou une grande chose, i devient y' et o devient w' : agolw'ambani, deux pieds ; epokolw'evolo, le grand chapeau.")
phrases(L, 2, S, [("ogol'omôri", "un pied"), ("agolw'ambani", "deux pieds"), ("epokol'inyango", "le petit chapeau"), ("epokolw'evolo", "le grand chapeau"), ("ntyugw'araro", "trois jours")])
ex(L, 7, "choix", S, consigne="Lequel veut dire « deux pieds » ?", options=["agolw'ambani", "ogol'omôri"], reponse="agolw'ambani")
ex(L, 8, "choix", S, consigne="Lequel veut dire « le grand chapeau » ?", options=["epokolw'evolo", "epokol'inyango"], reponse="epokolw'evolo")
ex(L, 9, "associer", S, consigne="Que veut dire « ntyugw'araro » ?", mot_myene="ntyugw'araro", options=["trois jours", "deux pieds", "un pied", "le grand chapeau"], reponse="trois jours")

# Compter les choses
L, S = "ogendo-l29", "Règles de référence v3.3 § 7.2 (Capp, 22 nov. 2026)"
ex(L, 1, "cours", S, consigne="Compter les choses", texte="De un à cinq, le nombre suit le mot et s'accorde : nago ncaro, trois maisons ; inagw'incaro, les trois maisons. Pour dix : Igomi ny'imboni, dix chèvres. Pour vingt : igomi ny'itondo ambani, vingt paniers. Avec des unités, on dit le nombre en entier : igomi ni ncaro y'inago, treize maisons.")
phrases(L, 2, S, [("nago ncaro", "trois maisons"), ("inagw'incaro", "les trois maisons"), ("alosy'araro", "trois citrons"), ("awan'awani", "les deux enfants"), ("Igomi ny'imboni", "dix chèvres"), ("igomi ny'itondo ambani", "vingt paniers"), ("igomi ni ncaro y'inago", "treize maisons"), ("agom'awani n'otani y'itondo", "vingt-cinq paniers")])
ex(L, 10, "choix", S, consigne="Comment dit-on « vingt paniers » ?", options=["igomi ny'itondo ambani", "nago ncaro", "agom'awani n'otani y'itondo"], reponse="igomi ny'itondo ambani")
ex(L, 11, "associer", S, consigne="Que veut dire « igomi ni ncaro y'inago » ?", mot_myene="igomi ni ncaro y'inago", options=["treize maisons", "trois maisons", "dix chèvres", "vingt paniers"], reponse="treize maisons")
ex(L, 12, "choix", S, consigne="Lequel veut dire « les trois maisons » ?", options=["inagw'incaro", "nago ncaro"], reponse="inagw'incaro")

# C'est à moi
L, S = "ogendo-l30", "Règles de référence v3.3 § 5.3 (possessifs ; Capp, 22 nov. 2026)"
ex(L, 1, "cours", S, consigne="C'est à moi", texte="Pour dire « ton » ou « ta », le petit mot se colle au nom : epokolozô, ton chapeau ; nagiyô, ta maison ; Reriyô, ton papa. Nce iyazo : le pays est à nous ; Nce yazo : chez nous. ïwami : le mien.",
   conseil="Après une apostrophe, la première voyelle du petit mot tombe souvent : onghwant'wami, ma femme.")
phrases(L, 2, S, [("epokolozô", "ton chapeau"), ("nagiyô", "ta maison"), ("Reriyô", "ton papa"), ("akemô", "tes œufs"), ("Nce iyazo", "le pays est à nous"), ("Nce yazo", "chez nous"), ("ïwami", "le mien"), ("onghwant'wami", "ma femme")])
ex(L, 10, "choix", S, consigne="Comment dit-on « ta maison » ?", options=["nagiyô", "epokolozô", "akemô"], reponse="nagiyô")
ex(L, 11, "associer", S, consigne="Que veut dire « Nce yazo » ?", mot_myene="Nce yazo", options=["chez nous", "le pays est à nous", "ta maison", "le mien"], reponse="chez nous")
ex(L, 12, "choix", S, consigne="Comment dit-on « ma femme » ?", options=["onghwant'wami", "onghwant'iwami"], reponse="onghwant'wami")

# Les mots au pluriel
L, S = "ogendo-l31", "Règles de référence v3.3 § 5.1-5.2"
ex(L, 1, "cours", S, consigne="Les mots au pluriel", texte="Pour dire plusieurs, on ajoute i devant le mot : nago, la maison ; inago, les maisons. nkala, le village ; inkala, les villages. Ncango si nkala : des nouvelles du village ; Incango s'inkala : les nouvelles du village ; Ncango sa gunu : les nouvelles d'ici.")
phrases(L, 2, S, [("nago", "la maison"), ("inago", "les maisons"), ("nkala", "le village"), ("inkala", "les villages"), ("Ncango si nkala", "des nouvelles du village"), ("Incango s'inkala", "les nouvelles du village"), ("Ncango sa gunu", "les nouvelles d'ici")])
ex(L, 9, "choix", S, consigne="Comment dit-on « les villages » ?", options=["inkala", "nkala"], reponse="inkala")
ex(L, 10, "choix", S, consigne="Lequel veut dire « les nouvelles du village » ?", options=["Incango s'inkala", "Ncango si nkala", "Ncango sa gunu"], reponse="Incango s'inkala")
ex(L, 11, "dictee", S, consigne="Écris en myènè le mot qui veut dire « les maisons ».", mot_francais="les maisons", reponse="inago")

# Celui qui…
L, S = "ogendo-l32", "Règles de référence v3.3 § 3 et § 6.6 (forme relative, tréma sur la première syllabe)"
ex(L, 1, "cours", S, consigne="Celui qui…, ce que…", texte="Pour dire « que » ou « qui », le verbe finit souvent en « o » et porte deux petits points sur sa première voyelle : aningo mïjôngo wê, l'eau que tu bois ; ayê n'äsuga myê, c'est lui qui m'a taquiné.")
phrases(L, 2, S, [("ntogolo ya gelo, nö yïtôndo yê", "c'est le piment rouge qu'il aime"), ("aningo mïjôngo wê", "l'eau que tu bois"), ("pêlê yäjovuno myê", "les assiettes que j'ai lavées"), ("ayê n'äsuga myê", "c'est lui qui m'a taquiné")])
ex(L, 6, "associer", S, consigne="Que veut dire « aningo mïjôngo wê » ?", mot_myene="aningo mïjôngo wê", options=["l'eau que tu bois", "donne-moi de l'eau", "les assiettes que j'ai lavées", "c'est lui qui m'a taquiné"], reponse="l'eau que tu bois")
ex(L, 7, "choix", S, consigne="Lequel veut dire « c'est lui qui m'a taquiné » ?", options=["ayê n'äsuga myê", "pêlê yäjovuno myê", "aningo mïjôngo wê"], reponse="ayê n'äsuga myê")
ex(L, 8, "associer", S, consigne="Que veut dire « pêlê yäjovuno myê » ?", mot_myene="pêlê yäjovuno myê", options=["les assiettes que j'ai lavées", "l'eau que tu bois", "c'est le piment rouge qu'il aime", "c'est lui qui m'a taquiné"], reponse="les assiettes que j'ai lavées")


def main():
    Ls = json.load(open(os.path.join(C, "lecons.json"), encoding="utf-8"))
    X = json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8"))
    par = {l["id"]: l for l in Ls}
    for i, t, o in LECONS:
        if i in par:
            par[i]["ordre"] = o
            if t: par[i]["titre"] = t
        else:
            Ls.append({"id": i, "unite_id": "ogendo-u6", "titre": t, "duree_min": 8, "xp": 20, "mode": "tous", "niveau_acces": "libre", "ordre": o, "publie": True})
    ids = {e["id"] for e in E}
    X = [e for e in X if e["id"] not in ids] + E
    for e in X:  # impératif « Viens manger » : accent grave (règles § 6.5, forme de Capp « Yàga gonya »)
        IMP = {"Yaga gonya": "Yàga gonya", "Yaga": "Yàga"}  # « Viens ! », « Viens manger »
        if e.get("mot_myene") in IMP: e["mot_myene"] = IMP[e["mot_myene"]]
        if isinstance(e.get("options"), list): e["options"] = [IMP.get(o, o) for o in e["options"]]
        if e.get("reponse") in IMP: e["reponse"] = IMP[e["reponse"]]
        for k in ("consigne", "texte", "indice"):
            if isinstance(e.get(k), str): e[k] = e[k].replace("« Yaga gonya »", "« Yàga gonya »")
    for n, d in (("lecons", Ls), ("exercices", X)):
        for dossier in (C, os.path.join(OMP, "contenu/exemples")):
            with open(os.path.join(dossier, n + ".json"), "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, indent=1); f.write("\n")
    print(f"{len(E)} exercices ; {sum(1 for i, t, o in LECONS if i not in par)} leçons nouvelles")


if __name__ == "__main__":
    main()
