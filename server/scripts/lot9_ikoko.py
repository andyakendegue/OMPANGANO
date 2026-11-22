#!/usr/bin/env python3
"""Lot 9 du cursus v3 (consigne 14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md ; audit 05, proposition F) : Ikôkô à trois entrées.
- « Premiers échanges » (existe, entrée adulte_debutant) ;
- « Je parle, j'apprends à écrire » (entrée adulte_parle) : lecture, signes, dictées de phrases courantes ; ensuite « Bien écrire » (Emênô) ;
- « Transmetteurs » (entrée transmetteurs) : écrire selon l'alphabet, corriger une écriture, conduire une veillée, enregistrer un ancien.
Phrases : seulement celles des règles de référence v3.3 (§ 2-3, 6, 10, 11) et des cours déjà relus. Idempotent (ikoko-u2, ikoko-u3, ik-*)."""
import json, os

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
C = os.path.join(OMP, "packages/noyau/contenu")
R = "Règles de référence v3.3"
UNITES = [
    {"id": "ikoko-u2", "parcours_id": "ikoko", "titre": "Je parle, j'apprends à écrire", "titre_myene": "", "entree": "adulte_parle", "suite_id": "emeno-u10",
     "description": "Pour l'adulte qui parle orungu sans savoir l'écrire : les lettres, les signes, puis des dictées de phrases de tous les jours.", "ordre": 2, "publie": True},
    {"id": "ikoko-u3", "parcours_id": "ikoko", "titre": "Transmetteurs", "titre_myene": "", "entree": "transmetteurs",
     "description": "Pour les parents, les enseignants et les personnes-ressources : écrire selon l'alphabet, corriger une écriture, conduire une veillée, enregistrer un ancien.", "ordre": 3, "publie": True},
]
LECONS, E = [], []


def lecon(lid, uid, titre, ordre, contenu):
    LECONS.append({"id": lid, "unite_id": uid, "titre": titre, "duree_min": 10, "xp": 25, "mode": "tous", "niveau_acces": "libre", "ordre": ordre, "publie": True})
    for i, (t, k) in enumerate(contenu, 1):
        E.append({"id": f"ik-{lid.split('-')[1]}-{i:02d}", "lecon_id": lid, "type": t, **k, "ordre": i})


def choix(s, consigne, bonne, autres):
    return ("choix", {"consigne": consigne, "options": [bonne] + autres, "reponse": bonne, "source": s})


def dictee(s, fr, rep, **k):
    return ("dictee", {"consigne": f"Écris en myènè : « {fr} ».", "mot_francais": fr, "reponse": rep, "source": s, **k})


S = R + " § 2 (lettres)"
lecon("ikoko-l4", "ikoko-u2", "Les lettres de l'alphabet", 1, [
    ("cours", {"consigne": "Les lettres de l'alphabet", "texte": "Tu parles déjà : il reste à écrire ce que tu dis. Sept voyelles : a, e, ê, i, o, ô, u (le chapeau ouvre la bouche : mpono, le couvercle ; mpônô, le chemin). c se dit « tch » (incango), j se dit « dy » ou « dj » (jêna), ngh est le son du fond de la bouche (nghomba). m ou n devant une lettre ne s'en séparent pas (mbwa, ncaro).", "source": S}),
    choix(S, "Lequel veut dire « le chemin » ?", "mpônô", ["mpono"]),
    choix(S, "Lequel veut dire « papa » ?", "rerê", ["rere"]),
    ("quel_son", {"consigne": "Quelles lettres commencent « nghomba » ?", "mot_myene": "nghomba", "mot_francais": "le porc-épic", "options": ["ngh", "ng", "ny"], "reponse": "ngh", "source": S}),
    dictee(S, "les nouvelles", "incango"),
    dictee(S, "trois", "ncaro"),
    dictee(S, "l'éléphant", "njôgu"),
    dictee(S, "le chien", "mbwa"),
])
S = R + " § 3 (signes)"
lecon("ikoko-l5", "ikoko-u2", "Les signes", 2, [
    ("cours", {"consigne": "Les signes", "texte": "‘ devant un mot veut dire « un » : ‘oma, un homme ; oma, l'homme. L'accent qui descend marque un ordre : Và myê aningo, donne-moi de l'eau ; ròra, déménage ! (rora, les épouses). Deux points sur la première voyelle du verbe disent « que, qui » : aningo mïjôngo wê, l'eau que tu bois. Le chapeau sur a marque la parenté : mâma, kâka, yâya. « go » se colle au verbe : gonya, manger ; mais go Mandji, à Mandji.", "source": S}),
    choix(S, "Lequel veut dire « un homme » ?", "‘oma", ["oma"]),
    choix(S, "Lequel est un ordre : « déménage ! » ?", "ròra", ["rora"]),
    choix(S, "Laquelle est juste pour « manger » ?", "gonya", ["go nya"]),
    choix(S, "Laquelle est juste pour « à la maison » ?", "go nago", ["gonago"]),
    choix(S, "Laquelle veut dire « l'eau que tu bois » ?", "aningo mïjôngo wê", ["Và myê aningo"]),
])
S = R + " § 6, § 10, § 11 (formules et phrases de Capp)"
lecon("ikoko-l6", "ikoko-u2", "Dictées de tous les jours", 3, [
    ("cours", {"consigne": "Dictées de tous les jours", "texte": "Écris les phrases que tu dis chaque jour. Les petits signes (‘, l'accent qui descend, les deux points) ne sont pas encore exigés : les lettres, si.", "source": S}),
    dictee(S, "merci beaucoup", "Akewa mpolo !"),
    dictee(S, "comment vas-tu ? (pour saluer)", "Incango sê ?"),
    dictee(S, "quelles nouvelles veux-tu ?", "Wê bel'incango nde ?"),
    dictee(S, "pardon", "Nyeza myê"),
    dictee(S, "au revoir", "Ibanga we. Ka mênê !"),
    dictee(S, "je ne mange pas", "Myê re nya"),
    dictee(S, "je vais manger", "Myê be nya"),
    dictee(S, "les Orungu mangent du poisson", "Orungu wi ny'ewêrê."),
])
S = R + " § 2-4, § 12"
lecon("ikoko-l7", "ikoko-u3", "Écrire et corriger", 1, [
    ("cours", {"consigne": "Écrire et corriger", "texte": "Pour transmettre, on écrit avec l'alphabet de tous : une lettre pour un son, les signes à leur place, et l'ordre de la phrase de l'orungu (le mot de la question à la fin). Pour corriger une écriture ancienne : è devient ê, é devient e, tch devient c, dj et dy deviennent j.", "source": S}),
    choix(S, "Laquelle est juste ?", "Wê bel'incango nde ?", ["Incango nde wê bele ?"]),
    choix(S, "Laquelle est juste pour « il est venu » ?", "A bya", ["A wyeni"]),
    choix(S, "Laquelle est juste pour « il est né » ?", "a yano", ["a jani"]),
    choix(S, "Laquelle est juste pour « l'enfant » ?", "onghwana", ["omwana"]),
    choix(S, "Laquelle est juste pour « ma femme » ?", "onghwant'wami", ["onghwant'iwami"]),
    choix(S, "Laquelle est juste pour « j'ai mangé du poulet » ?", "Myê re nya pa njôgôni", ["Myê re nya njôgôni"]),
])
S = R + " § 10 (formules) ; Ompangano (collecte)"
lecon("ikoko-l8", "ikoko-u3", "Conduire une veillée, enregistrer un ancien", 2, [
    ("cours", {"consigne": "Conduire une veillée", "texte": "À la veillée, la devinette s'ouvre ainsi : celui qui la pose dit « Tô ! », les autres répondent « Tôngê ! », puis il dit « Reviza ni myê ». Le conte s'ouvre par « Wulinya myê » : dis-moi, raconte-moi.", "source": S}),
    ("ecouter", {"consigne": "Écoute et répète.", "mot_myene": "Tô ! — Tôngê ! — Reviza ni myê", "mot_francais": "ouverture de la devinette", "source": S}),
    ("ecouter", {"consigne": "Écoute et répète.", "mot_myene": "Wulinya myê", "mot_francais": "dis-moi, raconte-moi (ouverture du conte)", "source": S}),
    choix(S, "Que répond-on à « Tô ! » ?", "Tôngê !", ["Mbolo", "Akewa"]),
    choix(S, "Comment s'ouvre le conte ?", "Wulinya myê", ["Ibanga we", "Sale !"]),
    ("culture", {"consigne": "Bon à savoir", "mot_myene": "Ompangano", "mot_francais": "la collecte", "texte": "Pour garder la parole des anciens : dans Ompangano, enregistrez un ancien qui dit un mot, une phrase ou un conte, puis faites relire l'écriture. Demandez toujours son accord avant d'enregistrer.", "source": S}),
    ("dire", {"consigne": "Dis « Wulinya myê » à voix haute.", "mot_myene": "Wulinya myê", "mot_francais": "dis-moi, raconte-moi", "source": S}),
])


def main():
    P = json.load(open(os.path.join(C, "parcours.json"), encoding="utf-8"))
    U = [u for u in json.load(open(os.path.join(C, "unites.json"), encoding="utf-8")) if u["id"] not in {x["id"] for x in UNITES}] + UNITES
    L = [l for l in json.load(open(os.path.join(C, "lecons.json"), encoding="utf-8")) if l["id"] not in {x["id"] for x in LECONS}] + LECONS
    X = [e for e in json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8")) if not e["id"].startswith("ik-")] + E
    for p in P:
        if p["id"] == "ikoko":
            p["description"] = "21 ans et plus. Trois entrées : « Premiers échanges » pour l'adulte qui débute, « Je parle, j'apprends à écrire » pour celui qui parle déjà, « Transmetteurs » pour les parents, enseignants et personnes-ressources."
    for n, d in (("parcours", P), ("unites", U), ("lecons", L), ("exercices", X)):
        for dossier in (C, os.path.join(OMP, "contenu/exemples")):
            with open(os.path.join(dossier, n + ".json"), "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, indent=1); f.write("\n")
    print(f"Ikôkô : 2 entrées ajoutées, {len(LECONS)} leçons, {len(E)} exercices")


if __name__ == "__main__":
    main()
