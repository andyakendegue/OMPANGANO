#!/usr/bin/env python3
"""Passes manuelles de la conversion v3 des cours (consigne `14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md` § 3, lot 2),
appliquées APRÈS `convertir_cursus_v3.py`. Idempotent.

1. Exercices de sons et de tons refaits à la main, sans terme de spécialiste ni symbole phonétique affiché (complément § 6) :
   les choix « ɓ / b / β » deviennent des questions simples (« l'air entre ou sort ? »).
2. Paires (« Dire juste ») : la transcription entre crochets n'est plus affichée (elle reste dans le champ `phonetique` des
   exercices de mots, pour la voix et la ligne de mélodie). Deux formes devenues identiques à l'écrit sont distinguées par le signe
   de Rékanga quand la règle le donne : ‘ pour « un » face à « le » (règles § 3), accent grave pour l'impératif (§ 6.5) ; sinon
   l'exercice est retiré (publie: false, identifiant gardé) : paires v / ṽ (un seul son), et doutes listés pour Capp.
3. Cartes de sons : la carte j réunit dj et dy ; v = un seul son ; h seul n'existe pas (ngh).
Signes posés par la machine → A_VALIDER_Capp_signes.csv ; doutes → A_VALIDER_Capp_cursus_v3.csv.
"""
import csv, json, os, re, unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))
OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
DONDO = os.path.dirname(OMP)
C = os.path.join(OMP, "packages/noyau/contenu")
P = os.path.join(DONDO, "14_programme_et_jeux")
NFC = lambda s: unicodedata.normalize("NFC", s)
GRAVE = {"a": "à", "e": "è", "i": "ì", "o": "ò", "u": "ù", "ê": "ề", "ô": "ồ"}

signes, doutes, retires = [], [], []


def grave(mot):
    """Accent grave sur la première voyelle du verbe (règles § 3, § 6.5) ; rien si déjà posé."""
    if re.search(r"[àèìòùềồ]", mot):
        return mot
    for i, ch in enumerate(mot):
        if ch.lower() in GRAVE:
            nv = GRAVE[ch.lower()]
            return NFC(mot[:i] + (nv.upper() if ch.isupper() else nv) + mot[i + 1:])
    return mot


def indefini(forme):
    """‘ devant le nom (règles § 3) : « win oga » → « win ‘oga » ; « oga » → « ‘oga »."""
    if "‘" in forme:
        return forme
    m = forme.split(" ")
    if m[0] in ("win",) and len(m) > 1:
        return " ".join([m[0], "‘" + m[1]] + m[2:])
    return "‘" + forme


def imperatif(sens):
    s = sens.strip()
    return s.endswith("!") and not re.match(r"(?i)(au revoir|bienvenue|merci|bonjour|bonsoir)", s)


def un_face_au_le(sens, autre):
    return bool(re.match(r"(?i)(c'est )?(un|une|des) ", sens)) and bool(re.match(r"(?i)(c'est )?(le|la|l'|les) ", autre or ""))


def poser(e, champ, avant, apres, regle):
    if avant != apres:
        signes.append({"id": e["id"], "regle": regle, "avant": avant, "apres": apres, "sens": e.get("mot_francais") or "", "applique": "oui"})
    return apres


def retirer(e, raison):
    if e.get("publie") is not False:
        e["publie"] = False
        retires.append({"id": e["id"], "raison": raison})


# ------------------------------------------------------------------------------------------------ 1. textes réécrits
TEXTES = {
    "nl6-cours-00": {"texte": "L'orungu a plusieurs consonnes faites avec les lèvres. Pour le b, l'air entre dans la bouche au lieu d'en sortir. Devant u, le p sort avec un petit souffle. Le v se dit entre v et w. Le f se fait avec la lèvre du bas contre les dents du haut."},
    "nl7-cours-00": {"texte": "Avec la pointe de la langue derrière les dents du haut, l'orungu fait t, d, n, s, z, l et r. Pour le d, l'air entre dans la bouche, sauf après n. Devant u, le t sort avec un petit souffle. Pour le r, la langue tape une seule fois. Le s reste dur, même entre deux voyelles.",
                     "conseil": "Après n, le d et le t ne font qu'un son avec le n : nd, nt."},
    "nl8-cours-00": {"consigne": "Le haut et le fond de la bouche",
                     "texte": "Contre le haut de la bouche se font c, nc, nj, ny et y ; au fond de la bouche, k, g, ngh, nk et ng. Le g se dit doux entre deux voyelles, et dur après n (ng). Devant i, e, ê ou y, le w se dit la langue en avant."},
    "nl9-cours": {"texte": "Dans chaque paire, une seule voyelle change, et le mot change de sens. Lis le mot, suis la ligne de la mélodie, et répète lentement."},
    "nl10-cours": {"consigne": "p, b, m, v, f, w",
                   "texte": "Ici, c'est la consonne qui change le mot. Pour le b, l'air entre dans la bouche ; devant u, le p sort avec un petit souffle ; le v se dit entre v et w ; le f se fait avec la lèvre du bas contre les dents du haut."},
    "nl11-cours": {"texte": "La pointe de la langue fait toutes ces consonnes. Pour le d, l'air entre dans la bouche, sauf après n ; devant u, le t sort avec un petit souffle ; pour le r, la langue tape une seule fois ; le s reste dur, même entre deux voyelles."},
    "nl12-cours": {"texte": "Le g se dit doux entre deux voyelles, et dur après n (ng). Le ngh se fait au fond de la bouche, le ny contre le haut de la bouche. Devant i, e, ê ou y, le w se dit la langue en avant.",
                   "conseil": "Compare nghomba et nomba : seule la première lettre change."},
    "nl13-cours": {"consigne": "Même écriture, autre mélodie, autre sens",
                   "texte": "La hauteur de la voix change le sens. À l'écrit, le petit signe ‘ veut dire « un » : ‘oga, un roi ; oga, le roi. Suis la ligne de la mélodie : en haut la voix haute, en bas la voix basse, au milieu la voix entre les deux.",
                   "conseil": "En orungu, la voix ne monte jamais sur une même syllabe."},
    "nl14-cours": {"texte": "Dans une phrase, la voix descend peu à peu : une syllabe haute qui suit une syllabe basse se dit un peu plus bas que la syllabe haute d'avant. Plusieurs syllabes hautes de suite peuvent aussi descendre comme des marches. Suis la mélodie de chaque phrase, puis répète-la d'un seul souffle."},
    "nl17-cours": {"texte": "De 1 à 5, le nombre se place après le nom et s'accorde avec lui : nago ncaro, trois maisons. Après n, raro devient ncaro. Pour dix, on dit igomi, puis ny' et le nom avec son i : igomi ny'imboni, dix chèvres."},
    "ton-h": {"consigne": "La voix haute",
              "texte": "La voix peut être haute, basse, ou au milieu. L'écriture de tous les jours ne note pas la hauteur de la voix : on l'apprend à l'oreille, en suivant la ligne de la mélodie."},
    "ton-a": {"consigne": "La voix au milieu"},
    "ton-papillon": {"texte": "Bas, haut, bas, haut, bas : la voix danse comme le papillon. Et plus on avance dans le mot, plus la voix descend un peu."},
    "ton-paires": {"texte": "La hauteur de la voix change le sens : « un mortier » et « le mortier » ne se disent pas pareil. À l'écrit, le petit signe ‘ veut dire « un ».",
                   "options": ["‘ezo = un mortier = [èzó]", "ezo = le mortier = [ézò]"]},
    "son-c-minasales": {"consigne": "Une seule consonne : m ou n et la lettre qui suit se disent d'un coup.", "graphie": "mp · mb · mf · nt · nd · nk · ng"},
    # quel_son : questions simples à la place des symboles
    "qs-v-2": {"indice": "ô : la bouche bien ouverte, les lèvres arrondies."},
    "ntina-l31-qs-v-2": {"indice": "ô : la bouche bien ouverte, les lèvres arrondies."},
    "qs-v-3": {"indice": "ê : la bouche plus ouverte que pour e."},
    "ntina-l31-qs-v-3": {"indice": "ê : la bouche plus ouverte que pour e."},
    "qs-c-1": {"consigne": "Dans « ebanda », pour le b, l'air entre dans la bouche ou il en sort ?", "options": ["L'air entre", "L'air sort"], "reponse": "L'air entre", "indice": "Sans m devant, pour le b, l'air entre dans la bouche."},
    "nl6-qs-11": {"consigne": "Dans « ebanda », pour le b, l'air entre dans la bouche ou il en sort ?", "options": ["L'air entre", "L'air sort"], "reponse": "L'air entre", "indice": "Sans m devant, pour le b, l'air entre dans la bouche."},
    "nl6-qs-12": {"consigne": "Dans « mbina », après m, pour le b, l'air entre ou il sort ?", "options": ["L'air sort", "L'air entre"], "reponse": "L'air sort", "indice": "Après m, le b sort de la bouche."},
    "qs-c-2": {"consigne": "Dans « pupu », entends-tu un petit souffle après le p ?", "options": ["Oui, un petit souffle", "Non"], "reponse": "Oui, un petit souffle", "indice": "Devant u, le p sort avec un petit souffle."},
    "nl6-qs-13": {"consigne": "Dans « pupu », entends-tu un petit souffle après le p ?", "options": ["Oui, un petit souffle", "Non"], "reponse": "Oui, un petit souffle", "indice": "Devant u, le p sort avec un petit souffle."},
    "nl7-qs-11": {"consigne": "Dans « itutu » (du vin de palme), entends-tu un petit souffle après le t ?", "options": ["Oui, un petit souffle", "Non"], "reponse": "Oui, un petit souffle", "indice": "Devant u, le t sort avec un petit souffle."},
    "nl7-qs-12": {"consigne": "Dans « dena » (pleurer), pour le d, l'air entre dans la bouche ou il en sort ?", "options": ["L'air entre", "L'air sort"], "reponse": "L'air entre", "indice": "Sans n devant, pour le d, l'air entre dans la bouche."},
    "nl7-qs-13": {"consigne": "Et dans « indendende » (des libellules), après n ?", "options": ["L'air sort", "L'air entre"], "reponse": "L'air sort", "indice": "Après n, le d sort de la bouche et ne fait qu'un son avec le n."},
    "nl7-qs-14": {"options": ["r", "l", "d"], "reponse": "r", "indice": "Pour le r, la langue tape une seule fois derrière les dents du haut."},
    "nl7-qs-15": {"consigne": "Dans « sônô » (la semaine), le s reste-t-il dur ?", "options": ["Oui, il reste dur", "Non, il devient doux"], "reponse": "Oui, il reste dur", "indice": "Le s reste dur, même entre deux voyelles."},
    "qs-c-4": {"consigne": "Dans « ogewe » (un banquet), le g se dit doux ou dur ?", "options": ["Doux", "Dur"], "reponse": "Doux", "indice": "Entre deux voyelles, le g se dit doux."},
    "nl8-qs-16": {"consigne": "Dans « ogewe » (un banquet), le g se dit doux ou dur ?", "options": ["Doux", "Dur"], "reponse": "Doux", "indice": "Entre deux voyelles, le g se dit doux."},
    "nl8-qs-17": {"consigne": "Et dans « ingongo » (une boîte), après n ?", "options": ["Dur", "Doux"], "reponse": "Dur", "indice": "Après n, le g se dit dur."},
    "nl8-qs-18": {"consigne": "Par quelles lettres commence « nyama » (un animal) ?", "options": ["ny", "n", "ngh"], "reponse": "ny", "indice": "ny : un seul son, la langue contre le haut de la bouche."},
    "nl8-qs-19": {"consigne": "Par quelles lettres commence « nghomba » (un porc-épic) ?", "options": ["ngh", "n", "ny"], "reponse": "ngh", "indice": "ngh se fait au fond de la bouche."},
    "qs-t-1": {"consigne": "Dans « ezo » (le mortier), la dernière syllabe est haute, basse, ou au milieu ?", "options": ["haute", "basse", "au milieu"], "reponse": "basse",
               "indice": "« Le mortier » : la voix est haute puis basse. « Un mortier », ‘ezo : basse puis haute."},
    "qs-t-2": {"consigne": "Dans « ilasa » (l'orange), la syllabe du milieu est haute, basse, ou au milieu ?", "options": ["haute", "au milieu", "basse"], "reponse": "au milieu"},
    "qs-t-3": {"consigne": "Sur « pa » (donner), la voix…", "options": ["reste haute", "descend", "monte"], "reponse": "descend", "indice": "En orungu, la voix ne monte jamais sur une même syllabe.", "mot_francais": "donner"},
}
RETRAITS = {
    "qs-c-3": "v et ṽ ne font qu'un son (Capp, 22 nov.) : l'exercice n'a plus d'objet",
    "nl6-qs-14": "v et ṽ ne font qu'un son (Capp, 22 nov.)",
    "nl6-qs-15": "v et ṽ ne font qu'un son (Capp, 22 nov.)",
    "nl6-son-07": "carte ṽ : v est un seul son (la carte v reste)",
    "nl8-son-05": "carte dy réunie à la carte j (nl8-son-04)",
    "nl8-son-15": "h seul n'existe pas en v3 (ngh : carte nl8-son-10)",
    "nl8-qs-20": "question sur une variante du w trop technique pour l'élève ; à refaire avec Capp",
}


def main():
    ex = json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8"))
    lecons = json.load(open(os.path.join(C, "lecons.json"), encoding="utf-8"))
    par_id = {e["id"]: e for e in ex}
    for i, champs in TEXTES.items():
        for k, v in champs.items():
            par_id[i][k] = v
    for i, r in RETRAITS.items():
        retirer(par_id[i], r)
    for e in ex:  # « verbe de type B », « type A » : terme de spécialiste
        for k in ("consigne", "mot_francais", "indice", "reponse"):
            if isinstance(e.get(k), str):
                e[k] = re.sub(r"\s*\((verbe de )?type [AB]\)", "", e[k])
        if isinstance(e.get("options"), list):
            e["options"] = [re.sub(r"\s*\((verbe de )?type [AB]\)", "", o) for o in e["options"]]
    for e in ex:  # myènè cité dans un texte français, protégé à tort comme homographe français (« Salé ! »)
        for k in ("texte", "consigne", "indice", "conseil"):
            if isinstance(e.get(k), str):
                e[k] = e[k].replace("« Salé ! »", "« Sale ! »")
    if "conseil" in par_id["nl9-cours"]:  # « ɛ, ɔ et u ne commencent jamais un mot » : contredit Orungu ; à revoir avec Capp
        doutes.append({"forme": par_id["nl9-cours"].pop("conseil"), "sens": "conseil de la leçon des voyelles", "regle": "v3 § 2.1", "raison": "« ô ne commence jamais un mot » contredit Orungu ; retiré en attendant Capp"})
    # 2. mots impératifs (sens « … ! ») : accent grave, dans les leçons de paires et partout où le mot est seul
    for e in ex:
        f = (e.get("mot_francais") or "").strip()
        m = e.get("mot_myene") or ""
        if m and imperatif(f) and len(m.split()) == 1:
            e["mot_myene"] = poser(e, "mot_myene", m, grave(m), "impératif (accent grave)")
    # 2 bis. mots en paire « un X / le X » (leçon des tons) : ‘ devant la forme « un »
    sens_par_forme = {}
    for e in ex:
        if e["lecon_id"] == "ntina-l13" and e.get("mot_myene") and e["type"] == "ton":
            sens_par_forme.setdefault(e["mot_myene"].lstrip("‘"), []).append(e)
    for forme, l in sens_par_forme.items():
        if len(l) == 2:
            a, b = l
            for x, y in ((a, b), (b, a)):
                if un_face_au_le(x["mot_francais"], y["mot_francais"]):
                    x["mot_myene"] = poser(x, "mot_myene", x["mot_myene"], indefini(x["mot_myene"]), "indéfini ‘ (un / le)")
    # 3. paires : plus de transcription affichée ; formes identiques distinguées par le signe ou exercice retiré
    for e in ex:
        if not isinstance(e.get("options"), list) or not any(" · [" in o for o in e["options"]):
            continue
        sens = {}  # transcription -> sens, d'après l'indice « forme · [ph] « sens » / … »
        for forme, ph, s in re.findall(r"([^/·]+?) · (\[[^\]]+\]) « ([^»]+) »", e.get("indice") or ""):
            sens[ph] = (forme.strip(), s.strip())
        def nettoyer(o):
            m = re.match(r"(.+?) · (\[[^\]]+\])$", o)
            if not m:
                return o
            forme, ph = m.group(1).strip(), m.group(2)
            s = sens.get(ph, (forme, ""))[1]
            autre = next((v[1] for k, v in sens.items() if k != ph), "")
            if imperatif(s):
                return poser(e, "options", forme, grave(forme), "impératif (accent grave)")
            if un_face_au_le(s, autre):
                return poser(e, "options", forme, indefini(forme), "indéfini ‘ (un / le)")
            return forme
        rep_ph = e.get("reponse") or ""
        e["options"] = [nettoyer(o) for o in e["options"]]
        e["reponse"] = nettoyer(rep_ph)
        e["indice"] = " / ".join(f"{nettoyer(f + ' · ' + ph)} « {s} »" for ph, (f, s) in sens.items()) or e.get("indice")
        if len(set(e["options"])) < len(e["options"]):
            raison = "paire v / ṽ : un seul son (Capp, 22 nov.)" if "v" in e["reponse"].lower() else "deux formes identiques à l'écrit en v3"
            retirer(e, raison)
            if "v / ṽ" not in raison:
                doutes.append({"forme": " | ".join(e["options"]), "sens": e.get("indice", ""), "regle": "v3 § 3 (signes)", "raison": raison + " ; aucun signe de Rékanga ne les distingue"})
    # leçons : titres sans terme de spécialiste
    for l in lecons:
        if l["id"] == "ntina-l8":
            l["titre"] = "Les consonnes du haut et du fond de la bouche"
    for n, d in (("exercices", ex), ("lecons", lecons)):
        with open(os.path.join(C, n + ".json"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1); f.write("\n")
        with open(os.path.join(OMP, "contenu/exemples", n + ".json"), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1); f.write("\n")
    # listes pour Capp : on ajoute aux listes de la conversion automatique
    def ajouter(chemin, champs, lignes):
        anciennes = list(csv.DictReader(open(chemin, encoding="utf-8"))) if os.path.exists(chemin) else []
        cles = {tuple(r.get(c, "") for c in champs) for r in anciennes}
        with open(chemin, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=champs, extrasaction="ignore"); w.writeheader(); w.writerows(anciennes)
            w.writerows(r for r in lignes if tuple(r.get(c, "") for c in champs) not in cles)
    ajouter(os.path.join(P, "A_VALIDER_Capp_signes.csv"), ["id", "regle", "avant", "apres", "sens", "applique"], signes)
    ajouter(os.path.join(P, "A_VALIDER_Capp_cursus_v3.csv"), ["forme", "sens", "regle", "raison"], doutes)
    ajouter(os.path.join(P, "journal_conversion_v3", "exercices_retires.csv"), ["id", "raison"], retires)
    print(f"signes posés : {len(signes)} ; doutes : {len(doutes)} ; exercices retirés : {len(retires)}")


if __name__ == "__main__":
    main()
