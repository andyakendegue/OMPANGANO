#!/usr/bin/env python3
"""Lot 8 du cursus v3 (consigne 14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md ; audit 05, proposition E) : Emênô (13-20 ans),
10 unités aux titres simples. Exemples : SEULEMENT les règles de référence v3.3 (§ 5 à 11, phrases d'actualité corrigées par Capp),
le recueil des proverbes v3 et _contexte/IDENTITE_ORUNGU.md (cité tel quel). Aucun terme de spécialiste côté élève.
La devise des Ôrungu (écrite en ancienne graphie, « à reprendre telle quelle ») attend la décision de Capp : A_VALIDER_Capp_cursus_v3.csv.
Idempotent (identifiants emeno-u*, emeno-l*, em-*)."""
import csv, json, os

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
DONDO = os.path.dirname(OMP)
C = os.path.join(OMP, "packages/noyau/contenu")
REC = os.path.join(DONDO, "17_edition_DONDO_myene/v3_rekanga_2026-11-21/04_proverbes/proverbes_DONDO_v3_rekanga.csv")
R = "Règles de référence v3.3"
UNITES, LECONS, E = [], [], []


def unite(n, titre, description, contenu):
    uid, lid = f"emeno-u{n}", f"emeno-l{n}"
    UNITES.append({"id": uid, "parcours_id": "emeno", "titre": titre, "titre_myene": "", "description": description, "ordre": n, "publie": True})
    LECONS.append({"id": lid, "unite_id": uid, "titre": titre, "duree_min": 10, "xp": 25, "mode": "tous", "niveau_acces": "libre", "ordre": 1, "publie": True})
    for i, (t, k) in enumerate(contenu, 1):
        E.append({"id": f"em-{n:02d}-{i:02d}", "lecon_id": lid, "type": t, **k, "ordre": i})


def mots(source, liste):
    return [("ecouter", {"consigne": "Écoute et répète.", "mot_myene": m, "mot_francais": f, "source": source}) for m, f in liste]


def assoc(source, m, bonne, autres):
    return ("associer", {"consigne": f"Que veut dire « {m} » ?", "mot_myene": m, "options": [bonne] + autres, "reponse": bonne, "source": source})


def choix(source, consigne, bonne, autres, **k):
    return ("choix", {"consigne": consigne, "options": [bonne] + autres, "reponse": bonne, "source": source, **k})


def cours(source, titre, texte, conseil=None):
    return ("cours", {"consigne": titre, "texte": texte, **({"conseil": conseil} if conseil else {}), "source": source})


# 1. Les familles de mots
S = R + " § 5.1"
unite(1, "Les familles de mots", "Chaque mot a sa famille : elle dit comment il se met au pluriel et comment les autres mots s'accordent avec lui.", [
    cours(S, "Les familles de mots", "Les mots de l'ôrungu vont par familles. Chaque famille a sa façon de dire « un » et « plusieurs » : onghwana, l'enfant / awana, les enfants ; nago, la maison / inago, les maisons ; ezôma, la chose / iyoma, les choses ; owaro, la pirogue / amaro, les pirogues."),
    *mots(S, [("onghwana", "l'enfant"), ("awana", "les enfants"), ("oga", "le chef"), ("aga", "les chefs"), ("iba", "la mangue"), ("aba", "les mangues"), ("ezôma", "la chose"), ("iyoma", "les choses"), ("owaro", "la pirogue"), ("amaro", "les pirogues"), ("okita", "le commerce"), ("ikita", "les commerces")]),
    choix(S, "Comment dit-on « les enfants » ?", "awana", ["onghwana", "aga"]),
    choix(S, "Comment dit-on « les choses » ?", "iyoma", ["ezôma", "inago"]),
    choix(S, "Comment dit-on « les pirogues » ?", "amaro", ["owaro", "aba"]),
    assoc(S, "ikita", "les commerces", ["le commerce", "les mangues", "les chefs"]),
    assoc(S, "aga", "les chefs", ["le chef", "les enfants", "les choses"]),
])

# 2. Dire « de »
S = R + " § 5.2 (Capp)"
unite(2, "Dire « de »", "Le petit mot qui veut dire « de » s'accorde avec le mot qui le précède.", [
    cours(S, "Dire « de »", "Pour dire « de », on prend un petit mot qui s'accorde avec le mot d'avant ; sa voyelle tombe devant le mot suivant : onghwana w'inkala, un enfant du village ; incango s'ince, les nouvelles du pays ; Oga wi nce, le chef de l'État.",
          "Devant une couleur, le petit mot reste entier : onamba wa pupu, le pagne blanc."),
    *mots(S, [("onghwana w'inkala", "un enfant du village"), ("incango s'ince", "les nouvelles du pays"), ("Oga wi nce", "le chef de l'État"), ("Ampanga mi nce", "le gouvernement"), ("Ampenda m'Ewilo", "le ministère du Travail"), ("Président wi Gabon", "le président du Gabon"), ("Ncango si nkala", "des nouvelles du village"), ("Ncango sa gunu", "les nouvelles d'ici"), ("onamba wa pupu", "le pagne blanc")]),
    assoc(S, "Ampanga mi nce", "le gouvernement", ["le chef de l'État", "les nouvelles du pays", "le ministère du Travail"]),
    choix(S, "Comment dit-on « le chef de l'État » ?", "Oga wi nce", ["Ampanga mi nce", "Incango s'ince"]),
    choix(S, "Laquelle est juste ?", "Président wi Gabon", ["Président w'si Gabon"]),
    assoc(S, "Ncango sa gunu", "les nouvelles d'ici", ["des nouvelles du village", "les nouvelles du pays", "le pagne blanc"]),
    choix(S, "Comment dit-on « les nouvelles du pays » ?", "incango s'ince", ["onghwana w'inkala", "Ncango si nkala"]),
])

# 3. Quand le mot change de son
S = R + " § 6.4-6.5"
unite(3, "Quand le mot change de son", "Pour donner un ordre ou raconter un passé lointain, la première lettre du verbe s'adoucit.", [
    cours(S, "Quand le mot change de son", "La première lettre d'un verbe a deux formes : une forte, une douce. kênda (aller) devient gềnda ! (va !), ogêndo (le voyage), a gendi (il était allé). bya (venir) devient a wyeni (il était venu). bola (taper) devient a woli myê (elle m'avait tapé).",
          "b devient w ou v ; d devient l ; k devient g ; p devient v ; s devient z ; t devient r."),
    *mots(S, [("Gềnda godêwa !", "va dormir !"), ("ogêndo", "le voyage"), ("a gendi", "il était allé"), ("a wyeni", "il était venu"), ("a woli myê", "elle m'avait tapé"), ("wònga !", "prends !"), ("za lenigi", "nous pleurions"), ("avila", "depuis"), ("ê ga rênde", "qu'il écrive")]),
    assoc(S, "ogêndo", "le voyage", ["va !", "il était allé", "depuis"]),
    assoc(S, "a woli myê", "elle m'avait tapé", ["prends !", "nous pleurions", "il était venu"]),
    choix(S, "Comment dit-on « il était allé » ?", "a gendi", ["a wyeni", "ogêndo"]),
    choix(S, "Comment dit-on « prends ! » ?", "wònga !", ["za lenigi", "avila"]),
    assoc(S, "ê ga rênde", "qu'il écrive", ["va dormir !", "depuis", "le voyage"]),
])

# 4. Un verbe en donne d'autres
S = R + " § 6.7"
unite(4, "Un verbe en donne d'autres", "En ajoutant un petit morceau au verbe, on dit « faire faire », « pour quelqu'un » ou « l'un l'autre ».", [
    cours(S, "Un verbe en donne d'autres", "Un verbe peut en donner d'autres : kola, acheter → koliza, vendre ; nya, manger → nyeza, faire manger, pardonner (Nyeza myê, pardon) ; bulya, dire → bulinya, dire à quelqu'un ; teviza, montrer, et tevuna, conseiller, sont de la même famille."),
    *mots(S, [("kola", "acheter"), ("koliza", "vendre"), ("nyeza", "faire manger, pardonner"), ("Nyeza myê", "pardon"), ("bulya", "dire"), ("bulinya", "dire à quelqu'un"), ("teviza", "montrer"), ("tevuna", "conseiller"), ("tôndya", "faire plaisir")]),
    assoc(S, "koliza", "vendre", ["acheter", "montrer", "conseiller"]),
    assoc(S, "bulinya", "dire à quelqu'un", ["dire", "faire plaisir", "pardonner"]),
    choix(S, "Comment dit-on « conseiller » ?", "tevuna", ["teviza", "kola"]),
    choix(S, "Comment dit-on « pardon » ?", "Nyeza myê", ["Myê nya", "Myê be nya"]),
    assoc(S, "teviza", "montrer", ["conseiller", "vendre", "dire"]),
])

# 5. Raconter
S = R + " § 6.2 (Capp, 22 nov. 2026)"
unite(5, "Raconter", "Choisir le bon moment pour raconter : maintenant, tout à l'heure, autrefois, souvent, demain.", [
    cours(S, "Raconter", "Pour raconter, on choisit d'abord le moment : A bya, il est venu ; A byeni, il vient d'arriver, il est là ; A wyeni, il était venu, c'est fini. Ma luwo me nya : j'étais en train de manger. Za lenigi : nous pleurions (souvent, autrefois). Ere ko pandaga : il ne fait que monter."),
    *mots(S, [("A bya", "il est venu"), ("A byeni", "il vient d'arriver, il est là"), ("A wyeni", "il était venu"), ("Ma luwo me nya", "j'étais en train de manger"), ("Za lenigi", "nous pleurions"), ("Ere ko pandaga", "il ne fait que monter"), ("Myê be nya", "je vais manger"), ("Mênê midi, mi be nya", "demain à midi, je serai en train de manger"), ("Wêre ni ntyugw'araro", "ils ont trois jours")]),
    assoc(S, "Ere ko pandaga", "il ne fait que monter", ["il est venu", "nous pleurions", "je vais manger"]),
    choix(S, "Comment dit-on « j'étais en train de manger » ?", "Ma luwo me nya", ["Myê be nya", "Ma nya"]),
    choix(S, "Laquelle est juste pour « demain à midi, je serai en train de manger » ?", "Mênê midi, mi be nya", ["Mi be luwo me nya"]),
    assoc(S, "A byeni", "il vient d'arriver, il est là", ["il était venu", "il est venu", "il n'est pas encore venu"]),
    assoc(S, "Wêre ni ntyugw'araro", "ils ont trois jours", ["trois jours", "nous pleurions", "il est venu"]),
])

# 6. Celui qui…
S = R + " § 6.6 (formes de Capp)"
unite(6, "Celui qui…", "La forme qui dit « celui qui », « ce que », « ceux dont » : le verbe finit souvent en « o ».", [
    cours(S, "Celui qui…", "Pour parler de ceux à qui il est arrivé quelque chose, le verbe s'adoucit, finit en « o » et porte deux points sur sa première voyelle : anaga wa vïezo iyoma, les gens dont les affaires ont été brûlées, les sinistrés. kenjina wi be dïngo impuma araro : un programme qui durera trois ans."),
    *mots(S, [("A pyez'iyoma", "des choses ont été brûlées"), ("anaga wa vïezo iyoma", "les sinistrés"), ("anaga wa yono nago", "les victimes des démolitions"), ("kenjina wi be dïngo impuma araro", "un programme qui durera trois ans"), ("aningo mïjôngo wê", "l'eau que tu bois"), ("ayê n'äsuga myê", "c'est lui qui m'a taquiné")]),
    assoc(S, "anaga wa vïezo iyoma", "les sinistrés", ["des choses ont été brûlées", "les victimes des démolitions", "l'eau que tu bois"]),
    choix(S, "Laquelle est juste pour « les sinistrés » ?", "anaga wa vïezo iyoma", ["anaga pyezo iyoma"]),
    assoc(S, "kenjina wi be dïngo impuma araro", "un programme qui durera trois ans", ["les sinistrés", "trois jours", "c'est lui qui m'a taquiné"]),
    choix(S, "Comment dit-on « des choses ont été brûlées » ?", "A pyez'iyoma", ["anaga wa yono nago", "aningo mïjôngo wê"]),
    assoc(S, "anaga wa yono nago", "les victimes des démolitions", ["les sinistrés", "un programme qui durera trois ans", "l'eau que tu bois"]),
])

# 7. Les nouvelles du pays
S = R + " § 11 (phrases d'actualité corrigées par Capp)"
unite(7, "Les nouvelles du pays", "Lire et comprendre des nouvelles écrites en ôrungu.", [
    cours(S, "Les nouvelles du pays", "Voici des nouvelles écrites en ôrungu. On dit ce qui a été fait, plutôt que qui l'a fait : A pyez'iyoma go carrefour Château, des biens ont été brûlés au carrefour Château.", "On garde les noms de personnes et de lieux tels qu'ils sont, et le mot myènè d'abord : Mandji pour Port-Gentil."),
    *mots(S, [("Incango s'ince", "les nouvelles du pays"), ("A pyez'iyoma go carrefour Château.", "des biens ont été brûlés au carrefour Château"), ("Ikita, issopu n'inago sa pyeni.", "les commerces, les bars et les maisons ont brûlé"), ("Mênê ozangue ê be dwana byambie go Mandji.", "demain, l'électricité marchera bien à Mandji"), ("Régis Onanga Ndiaye a yano go Mandji.", "Régis Onanga Ndiaye est né à Mandji"), ("Wê bel'incango nde ?", "quelles nouvelles veux-tu ?"), ("Và m'y'incango sa nêno go nce yazo", "donne-moi les nouvelles du jour dans notre pays")]),
    assoc(S, "Ikita, issopu n'inago sa pyeni.", "les commerces, les bars et les maisons ont brûlé", ["des biens ont été brûlés au carrefour Château", "demain, l'électricité marchera bien à Mandji", "les nouvelles du pays"]),
    assoc(S, "Mênê ozangue ê be dwana byambie go Mandji.", "demain, l'électricité marchera bien à Mandji", ["les commerces ont brûlé", "il est né à Mandji", "quelles nouvelles veux-tu ?"]),
    choix(S, "Comment dit-on « il est né à Mandji » ?", "a yano go Mandji", ["a jani go Mandji"]),
    choix(S, "Comment demande-t-on « quelles nouvelles veux-tu ? » ?", "Wê bel'incango nde ?", ["Incango nde wê bele ?"]),
    assoc(S, "Và m'y'incango sa nêno go nce yazo", "donne-moi les nouvelles du jour dans notre pays", ["les nouvelles du pays", "quelles nouvelles veux-tu ?", "des biens ont été brûlés"]),
])

# 8. Le sens caché des proverbes
rec = {r["id"]: r for r in csv.DictReader(open(REC, encoding="utf-8"), delimiter=";")}
PRV = ["PRV-0046", "PRV-0009", "PRV-0070", "PRV-0071", "PRV-0037", "PRV-0059"]
c8 = [cours("Recueil des proverbes DONDO v3", "Le sens caché des proverbes", "Un proverbe dit une chose et en veut dire une autre. Lis-le, cherche ce qu'il raconte, puis ce qu'il veut dire pour nous.")]
for p in PRV:
    r = rec[p]
    c8.append(("proverbe", {"consigne": "Un proverbe", "mot_myene": r["texte_original"], "mot_francais": r["traduction"], "texte": "Ce qu'il veut dire : " + r["sens_ou_equivalent"], "source": f"Recueil des proverbes DONDO v3, {p}"}))
autres_sens = [rec[p]["sens_ou_equivalent"] for p in PRV]
for p in PRV[:5]:
    r = rec[p]
    c8.append(("comprendre", {"consigne": "Que veut dire ce proverbe ?", "texte": r["texte_original"], "options": [r["sens_ou_equivalent"]] + [s for s in autres_sens if s != r["sens_ou_equivalent"]][:2], "reponse": r["sens_ou_equivalent"], "source": f"Recueil des proverbes DONDO v3, {p}"}))
unite(8, "Le sens caché des proverbes", "Ce que disent les proverbes, et ce qu'ils veulent dire.", c8)

# 9. Notre histoire
S = "_contexte/IDENTITE_ORUNGU.md (Capp, 4 oct. 2026) ; règles de référence v3.3 § 9-10"
unite(9, "Notre histoire", "La royauté des Ôrungu, sa devise, et la parole qui ouvre les contes.", [
    cours(S, "Notre histoire", "La royauté actuelle des Ôrungu s'appelle AMPENDA M'ÔRUNGU, « Royauté Ôrungu ». Sa devise : Egongo – Ôzange – Ivenda, « Solidarité – Vérité – Royauté ». On écrit toujours « Ôrungu », avec un Ô majuscule.",
          "Pour ouvrir un conte, l'ancien dit « Wulinya myê » : dis-moi, raconte-moi."),
    *mots(S, [("Ampenda m'Ôrungu", "la royauté ôrungu"), ("Egongo – Ôzange – Ivenda", "Solidarité – Vérité – Royauté"), ("Egongo", "la solidarité"), ("Ôzange", "la vérité"), ("Ivenda", "la royauté"), ("Wulinya myê", "dis-moi, raconte-moi")]),
    assoc(S, "Ôzange", "la vérité", ["la solidarité", "la royauté", "le peuple"]),
    assoc(S, "Egongo", "la solidarité", ["la vérité", "la royauté", "le voyage"]),
    choix(S, "Quelle est la devise de la royauté ?", "Egongo – Ôzange – Ivenda", ["Ivenda – Egongo – Ôzange"]),
    assoc(S, "Wulinya myê", "dis-moi, raconte-moi", ["bonjour", "au revoir", "merci"]),
    choix(S, "Comment dit-on « la royauté » ?", "Ivenda", ["Egongo", "Ôzange"]),
])

# 10. Bien écrire
S = R + " § 2-4, § 12"
unite(10, "Bien écrire", "Écrire l'ôrungu avec les lettres et les signes de l'alphabet, et éviter les erreurs courantes.", [
    cours(S, "Bien écrire", "Pour bien écrire : les lettres de l'alphabet (ê, ô, c, j, ny, ngh), « go » collé au verbe pour dire « manger, voir » (gonya, gojêna), mais séparé pour un lieu (go Mandji). Et toujours le mot de la question à la fin : Wê bel'incango nde ?"),
    choix(S, "Laquelle est juste ?", "a veni", ["a va"]),
    choix(S, "Laquelle est juste ?", "a yano", ["a jani"]),
    choix(S, "Laquelle est juste ?", "Wê bel'incango nde ?", ["Incango nde wê bele ?"]),
    choix(S, "Laquelle est juste pour « l'enfant » ?", "onghwana", ["omwana"]),
    choix(S, "Laquelle est juste pour « mais » ?", "Ndo", ["Nde"]),
    choix(S, "Laquelle est juste pour « et toi » ?", "Awê", ["Wê"]),
    choix(S, "Laquelle est juste pour « manger » ?", "gonya", ["go nya"]),
    ("dictee", {"consigne": "Écris en myènè : « quelles nouvelles ? »", "mot_francais": "quelles nouvelles ?", "reponse": "Incango sê ?", "source": S}),
    ("dictee", {"consigne": "Écris en myènè : « les nouvelles du pays ».", "mot_francais": "les nouvelles du pays", "reponse": "Incango s'ince", "source": S}),
    ("dictee", {"consigne": "Écris en myènè : « je ne mange pas ».", "mot_francais": "je ne mange pas", "reponse": "Myê re nya", "source": S}),
])

DOUTE = {"forme": "Ôrungu akômbyè ! … Ôrungu'Anyambyè ! (devise des Ôrungu)", "sens": "Ôrungu Peuple uni ! … Ôrungu peuple éternel !",
         "regle": "IDENTITE_ORUNGU.md (« à reprendre telle quelle ») / règles v3.3 § 2 (plus de è)",
         "raison": "La devise est écrite avec è (ancienne graphie). L'écrire en v3 (akômbyê, Anyambyê…) ou la citer telle quelle ? Pas mise dans Emênô en attendant."}


def main():
    P = json.load(open(os.path.join(C, "parcours.json"), encoding="utf-8"))
    U = [u for u in json.load(open(os.path.join(C, "unites.json"), encoding="utf-8")) if not u["id"].startswith("emeno-u")] + UNITES
    L = [l for l in json.load(open(os.path.join(C, "lecons.json"), encoding="utf-8")) if not l["id"].startswith("emeno-l")] + LECONS
    X = [e for e in json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8")) if not e["id"].startswith("em-")] + E
    for p in P:
        if p["id"] == "emeno":
            p["description"] = "13 à 20 ans. Les familles de mots, dire « de », les mots qui changent de son, raconter, lire les nouvelles du pays, le sens caché des proverbes, notre histoire et bien écrire."
    for n, d in (("parcours", P), ("unites", U), ("lecons", L), ("exercices", X)):
        for dossier in (C, os.path.join(OMP, "contenu/exemples")):
            with open(os.path.join(dossier, n + ".json"), "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, indent=1); f.write("\n")
    chemin = os.path.join(DONDO, "14_programme_et_jeux/A_VALIDER_Capp_cursus_v3.csv")
    lignes = list(csv.DictReader(open(chemin, encoding="utf-8")))
    if not any(l["forme"] == DOUTE["forme"] for l in lignes):
        with open(chemin, "a", encoding="utf-8", newline="") as f:
            csv.DictWriter(f, fieldnames=["forme", "sens", "regle", "raison"]).writerow(DOUTE)
    print(f"Emênô : {len(UNITES)} unités, {len(E)} exercices")


if __name__ == "__main__":
    main()
