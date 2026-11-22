#!/usr/bin/env python3
"""Lot 11 du cursus v3 (demande de Capp, 22 nov. 2026 : « est-ce aussi assez pour immerger l'apprenant et lui faire découvrir
un environnement assez riche ? ») : scènes immersives riches.

- Un décor par thème (lagune et mangrove, mer et plage, forêt, marché, intérieur de la maison, village et cour, ciel du jour à
  la nuit), en panorama qu'on fait défiler ; 15 à 25 éléments par scène, dont des éléments cachés.
- Mots : ceux des cours (déjà relus) et, pour enrichir, des mots des leçons omyènè (vocabulaire courant, lexique v3) et des
  mots décidés par Capp (règles v3.5 § 9). Tout mot qui n'était pas encore dans les cours va dans A_VALIDER_Capp_cursus_v3.csv.
- Au toucher : le mot, puis une phrase courte qui le met en action, prise UNIQUEMENT dans les exercices des cours ou les phrases
  de Capp (règles § 11) ; sinon le mot seul.
- Scènes reliées : chaque scène a des chemins vers ses voisines (village ↔ lagune ↔ mer, village ↔ forêt, village ↔ marché,
  village ↔ maison, ciel).
Idempotent : les identifiants sc-<leçon> sont remplacés ; les autres exercices ne bougent pas."""
import csv, json, os, re

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", "..")); DONDO = os.path.dirname(OMP)
C = os.path.join(OMP, "packages/noyau/contenu")
A_VALIDER = os.path.join(DONDO, "14_programme_et_jeux/A_VALIDER_Capp_cursus_v3.csv")
LEX = "lexique v3 (leçons omyènè)"; CAPP = "règles v3.5 § 9 (Capp)"

# (mot, sens, émoji, x %, y %, plan 0-2, caché, origine si le mot n'est pas encore dans les cours)
DECORS = {
    "lagune": ("Explore la lagune et la mangrove. Fais glisser le paysage.", [
        ("onghwêyi", "le soleil", "☀️", 12, 14, 0, False, None), ("ngozo", "le perroquet", "🦜", 22, 30, 1, False, None),
        ("erere", "un arbre", "🌳", 8, 46, 1, False, None), ("itanda", "le palétuvier", "🌿", 30, 52, 1, False, LEX),
        ("ijavi", "les feuilles", "🍃", 36, 38, 1, False, LEX), ("isômbô", "le martin-pêcheur", "🐦", 44, 34, 1, False, LEX),
        ("mbene", "l'étendue d'eau", "🏞️", 52, 60, 0, False, None), ("owaro", "la pirogue", "🛶", 60, 66, 1, False, None),
        ("onghwana", "un enfant", "🧒", 64, 58, 2, False, None), ("aningo", "l'eau", "💧", 70, 82, 2, False, None),
        ("ewêrê", "le poisson", "🐟", 78, 88, 2, True, None), ("osênjêlê", "la sardine des lacs", "🐟", 40, 86, 2, True, LEX),
        ("nguwu", "l'hippopotame", "🦛", 86, 74, 1, True, None), ("owonya-wonya", "le papillon", "🦋", 92, 40, 1, False, None),
        ("mbêrê", "une sardine", "🐟", 20, 80, 2, True, None), ("mpônô", "le chemin", "🛤️", 4, 74, 2, False, None)]),
    "mer": ("Au bord de la mer : touche ce que tu vois, cherche ce qui se cache dans l'eau.", [
        ("onghwêyi", "le soleil", "☀️", 80, 12, 0, False, None), ("ncuwa", "la mer", "🌊", 50, 52, 0, False, None),
        ("owaro", "la pirogue", "🛶", 36, 50, 1, False, None), ("rerê", "papa", "👨", 40, 44, 1, False, None),
        ("ogôli", "la corde", "🪢", 46, 66, 2, False, None), ("nkawa", "le thon", "🐟", 60, 62, 1, True, CAPP),
        ("civo", "le rouge (poisson)", "🐠", 70, 70, 1, True, LEX), ("nkojê", "le requin", "🦈", 88, 56, 0, True, LEX),
        ("nyuwan", "la raie", "🐟", 24, 64, 1, True, LEX), ("mbêrê", "une sardine", "🐟", 14, 58, 1, True, None),
        ("imangatanga", "les noix de coco", "🥥", 8, 40, 1, False, LEX), ("onghwana", "un enfant", "🧒", 20, 84, 2, False, None),
        ("epokolo", "le chapeau", "👒", 58, 86, 2, False, None), ("otondo", "le panier", "🧺", 74, 88, 2, False, None),
        ("ewêrê", "le poisson", "🐟", 92, 84, 2, False, None)]),
    "foret": ("Entre dans la forêt. Des animaux se cachent derrière les arbres : trouve-les.", [
        ("iga", "la forêt", "🌳", 6, 40, 0, False, None), ("erere", "un arbre", "🌳", 18, 50, 1, False, None),
        ("ijavi", "les feuilles", "🍃", 28, 24, 1, False, LEX), ("ngozo", "le perroquet", "🦜", 36, 20, 1, False, None),
        ("nkêma", "le singe", "🐒", 46, 30, 1, False, None), ("njina", "le gorille", "🦍", 56, 62, 1, False, None),
        ("njôgu", "l'éléphant", "🐘", 70, 58, 0, False, None), ("nkambi", "l'antilope", "🦌", 82, 66, 1, False, None),
        ("njêgô", "la panthère", "🐆", 92, 52, 1, True, None), ("homba", "le porc-épic", "🦔", 24, 84, 2, True, None),
        ("omamba", "un serpent", "🐍", 62, 86, 2, True, None), ("ekuru", "le hibou", "🦉", 76, 24, 1, True, None),
        ("ekaga", "la tortue", "🐢", 40, 88, 2, False, None), ("owonya-wonya", "le papillon", "🦋", 12, 72, 2, False, None),
        ("orônga", "le champignon", "🍄", 50, 90, 2, True, CAPP), ("ngowa", "le sanglier", "🐗", 88, 84, 2, False, LEX),
        ("mpônô", "le chemin", "🛤️", 4, 86, 2, False, None)]),
    "marche": ("Au marché : touche chaque chose, écoute son nom.", [
        ("Ngwê", "maman", "👩", 8, 56, 1, False, None), ("ikôndô", "la banane plantain", "🍌", 16, 70, 2, False, None),
        ("ewêrê", "le poisson", "🐟", 24, 62, 1, False, None), ("nyama", "la viande", "🍖", 32, 70, 2, False, None),
        ("ike", "l'œuf", "🥚", 38, 60, 1, False, None), ("mbenda", "l'arachide", "🥜", 44, 72, 2, False, None),
        ("ilasa", "l'orange", "🍊", 50, 60, 1, False, None), ("ntogolo", "le piment", "🌶️", 56, 72, 2, False, CAPP),
        ("ilosi", "un citron", "🍋", 62, 60, 1, False, LEX), ("nyôndô", "l'oignon", "🧅", 68, 72, 2, False, CAPP),
        ("ikoko", "la canne à sucre", "🎋", 74, 52, 1, False, CAPP), ("oresi", "le riz", "🍚", 80, 70, 2, False, None),
        ("ezanga", "le sel", "🧂", 86, 60, 1, False, None), ("mpêmba", "le pain", "🍞", 92, 70, 2, False, None),
        ("otondo", "le panier", "🧺", 12, 86, 2, False, None), ("puka", "le sac", "👜", 30, 88, 2, False, None),
        ("sika", "l'argent", "💰", 48, 88, 2, True, None), ("njôgôni", "la poule", "🐔", 66, 88, 2, False, None),
        ("mbêrê", "une sardine", "🐟", 84, 88, 2, False, None), ("onghwêyi", "le soleil", "☀️", 60, 12, 0, False, None)]),
    "maison": ("Dans la maison : la cuisine d'un côté, la chambre de l'autre. Touche chaque chose.", [
        ("windê", "la fenêtre", "🪟", 14, 30, 0, False, None), ("ogoni", "le feu", "🔥", 10, 74, 2, False, None),
        ("incwana", "les marmites", "🍲", 18, 66, 1, False, None), ("izêwê", "les cuillères", "🥄", 24, 50, 1, False, None),
        ("intuma", "les fourchettes", "🍴", 28, 58, 1, False, None), ("epêlê", "l'assiette", "🍽️", 32, 50, 1, False, None),
        ("elasi", "le verre", "🥛", 36, 58, 1, False, None), ("kopu", "la tasse", "☕", 40, 50, 1, False, None),
        ("aningo", "l'eau", "💧", 22, 82, 2, False, None), ("inyela", "la poubelle", "🗑️", 4, 86, 2, False, None),
        ("ezômbôlô", "le balai", "🧹", 44, 76, 2, False, None), ("iguge", "la porte", "🚪", 50, 46, 0, False, None),
        ("ozange", "la lumière", "💡", 60, 14, 0, False, None), ("odo", "le lit", "🛏️", 72, 70, 1, False, None),
        ("eyeno", "le miroir", "🪞", 64, 40, 1, False, None), ("kôbôti y'ozira", "le placard", "🗄️", 86, 50, 1, False, None),
        ("epwe z'atanga", "la chaise", "🪑", 58, 76, 2, False, None), ("otondo", "le panier", "🧺", 94, 82, 2, False, None),
        ("pusi", "le chat", "🐈", 76, 88, 2, True, None), ("mpandino", "l'échelle", "🪜", 96, 40, 1, False, None)]),
    "village": ("Dans la cour du village : la famille, les animaux, le feu. Fais glisser pour tout voir.", [
        ("nkala", "le village", "🏘️", 8, 36, 0, False, None), ("nago", "la maison", "🏠", 20, 46, 1, False, None),
        ("Rerê", "papa", "👨", 28, 62, 1, False, None), ("Ngwê", "maman", "👩", 34, 66, 1, False, None),
        ("Onghwana", "un enfant", "🧒", 40, 78, 2, False, None), ("Tâta poyo", "le grand-père", "👴", 48, 60, 1, False, None),
        ("Mâma poyo", "la grand-mère", "👵", 54, 64, 1, False, None), ("Yâya", "le frère aîné", "🧑", 60, 74, 2, False, None),
        ("ogoni", "le feu", "🔥", 44, 88, 2, False, None), ("ebongo", "le banc", "🪑", 52, 82, 2, False, None),
        ("Mbwa", "le chien", "🐕", 68, 84, 2, False, None), ("Njôgôni", "la poule", "🐔", 76, 88, 2, False, None),
        ("Mboni", "le cabri", "🐐", 84, 76, 1, False, None), ("Nyare", "le bœuf, la vache", "🐄", 92, 62, 0, False, None),
        ("Pusi", "le chat", "🐈", 16, 82, 2, True, None), ("ogulu", "la gargoulette", "🏺", 24, 86, 2, False, CAPP),
        ("erere", "un arbre", "🌳", 72, 40, 0, False, None), ("okili", "la route, le chemin", "🛣️", 96, 88, 2, False, None),
        ("onghwêyi", "le soleil", "☀️", 86, 12, 0, False, None)]),
    "ciel": ("Regarde le ciel du matin à la nuit : le soleil, la lune, les étoiles.", [
        ("ibanga", "le matin", "🌅", 6, 60, 0, False, None), ("onghwêyi", "le soleil", "☀️", 18, 18, 0, False, None),
        ("owenja", "la journée", "🌤️", 30, 30, 0, False, None), ("ngozo", "le perroquet", "🦜", 38, 46, 1, False, None),
        ("ningo", "la pluie", "🌧️", 46, 24, 0, False, None), ("ogula", "la tornade", "🌪️", 54, 40, 0, True, CAPP),
        ("nkolo", "le soir", "🌇", 62, 60, 0, False, None), ("ogwêra", "la nuit", "🌃", 70, 40, 0, False, None),
        ("ogwêli", "la lune", "🌙", 78, 18, 0, False, None), ("ogêgêni", "l'étoile", "⭐", 86, 28, 0, False, None),
        ("inanga", "le clair de lune", "🌕", 92, 14, 0, True, None), ("ekuru", "le hibou", "🦉", 82, 66, 1, True, None),
        ("nce", "la terre", "🌍", 50, 86, 2, False, None), ("nkala", "le village", "🏘️", 26, 82, 1, False, None),
        ("igwêra", "l'heure", "🕐", 94, 74, 1, False, None)]),
}
# Mots propres à une leçon, ajoutés à son décor
EXTRAS = {
    "ogendo-l6": [("ambôra", "les habits", "👚", 10, 66, 2, False, None), ("elinga", "la robe", "👗", 14, 58, 1, False, None),
                  ("ngôyi", "le haut (vêtement)", "👕", 18, 64, 1, False, None), ("obati", "le short", "🩳", 22, 58, 1, False, None),
                  ("epokolo", "le chapeau", "👒", 30, 52, 1, False, None), ("puka", "le sac", "👜", 64, 88, 2, False, None)],
    "ogendo-l7": [("ncuwa", "la mer", "🌊", 98, 56, 0, False, None), ("iga", "la forêt", "🌳", 2, 50, 0, False, None),
                  ("sikul", "l'école", "🏫", 14, 40, 0, False, None), ("mbôra", "la place, l'endroit", "📍", 36, 88, 2, False, None)],
}
SCENES = {  # leçon : décor
    "ntina-l5": "lagune", "ntina-l20": "village", "ntina-l22": "village", "ntina-l23": "foret", "ntina-l24": "marche",
    "ntina-l26": "maison", "ntina-l28": "ciel", "ogendo-l3": "maison", "ogendo-l4": "maison", "ogendo-l5": "maison",
    "ogendo-l6": "village", "ogendo-l7": "village", "ogendo-l9": "ciel",
}
VOISINS = {"village": ["lagune", "foret", "marche", "maison"], "lagune": ["village", "mer"], "mer": ["lagune"], "foret": ["village"],
           "marche": ["village"], "maison": ["village"], "ciel": ["village"]}
LIBELLES = {"village": "Vers le village", "lagune": "Vers la lagune", "mer": "Vers la mer", "foret": "Vers la forêt", "marche": "Vers le marché", "maison": "Entrer dans la maison", "ciel": "Regarder le ciel"}
PLACE_LIENS = [(97, 9), (3, 9), (38, 9), (64, 9)]  # dans le ciel, en haut du panorama : rien ne s'y cache


def cle(m):
    return re.sub(r"[‘'’!?.,]", "", m.lower()).strip()


def phrases_validees(X):
    """Phrases des cours (exercices publiés) et phrases de Capp (règles § 11) : (myènè, français)."""
    res = []
    for e in X:
        if e.get("publie") is False or e.get("type") in ("proverbe", "culture", "cours"): continue  # phrase courte « en action », pas un proverbe
        for my, fr in ((e.get("mot_myene"), e.get("mot_francais")), (e.get("reponse"), e.get("mot_francais"))):
            if isinstance(my, str) and isinstance(fr, str) and 3 <= len(my.split()) <= 9 and fr and not fr.startswith("formule"):
                res.append((my.strip(), fr.strip()))
    regles = open(os.path.join(DONDO, "_contexte/REGLES_MYENE_REFERENCE_v3.md"), encoding="utf-8").read()
    bloc = re.search(r"^## 11\..*?(?=^## )", regles, re.S | re.M).group(0)
    for my, fr in re.findall(r"^\| \*(.+?)\* \| (.+?) \|$", bloc, re.M):
        if " / " not in my and len(my.split()) <= 9: res.append((my.replace("*", ""), fr))
    vus, out = set(), []
    for p in res:
        if p[0] not in vus: vus.add(p[0]); out.append(p)
    return out


SANS_PHRASE = {"ibanga", "nce"}  # même mot, autre sens dans la phrase trouvée (Ibanga we = au revoir ; Oga wi nce = le pays)


def trouver_phrase(mot, phrases):
    m = cle(mot).split()[0] if cle(mot) else ""
    if len(m) < 3 or m in SANS_PHRASE: return None
    for my, fr in sorted(phrases, key=lambda p: len(p[0])):
        mots = [cle(w) for w in re.split(r"[\s']+", my)]
        if m in mots and cle(my) != cle(mot):
            return my, fr
    return None


def zones_de(liste, phrases):
    out = []
    for mot, sens, emo, x, y, plan, cache, _ in liste:
        z = {"x": x, "y": y, "mot": mot, "sens": sens, "illustration": emo, "plan": plan}
        if cache: z["cache"] = True
        p = trouver_phrase(mot, phrases)
        if p: z["phrase"], z["phrase_fr"] = p
        out.append(z)
    return out


def main():
    X = json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8"))
    hors_scenes = [e for e in X if not e["id"].startswith("sc-")]
    dans_cours = {cle(e.get("mot_myene") or "") for e in hors_scenes if e.get("publie") is not False}
    anciens = {e["id"]: e for e in X if e["id"].startswith("sc-")}
    X = [e for e in X if not e["id"].startswith("sc-")]
    phrases = phrases_validees(X)
    base = {d: zones_de(v[1], phrases) for d, v in DECORS.items()}
    nouveaux, a_valider = [], {}
    for d, (_, liste) in DECORS.items():
        for mot, sens, *_r, origine in liste:
            if origine and cle(mot) not in dans_cours: a_valider[mot] = (sens, origine)
    for lecon, decor in SCENES.items():
        consigne, liste = DECORS[decor]
        extra = EXTRAS.get(lecon, [])
        noms = {cle(z[0]) for z in extra}
        zones = zones_de([z for z in liste if cle(z[0]) not in noms] + extra, phrases)
        liens = [{"x": px, "y": py, "libelle": LIBELLES[v], "scene": v, "consigne": DECORS[v][0], "zones": base[v]} for (px, py), v in zip(PLACE_LIENS, VOISINS[decor])]
        ident = "sc-lagune" if lecon == "ntina-l5" else f"sc-{lecon}"
        ordre = anciens[ident]["ordre"] if ident in anciens else max([e.get("ordre") or 0 for e in X if e["lecon_id"] == lecon] + [0]) + 1
        nouveaux.append({"id": ident, "lecon_id": lecon, "type": "scene", "consigne": consigne, "scene": decor, "zones": zones, "liens": liens,
                         "source": "Mots des cours ; mots des leçons omyènè (lexique v3) et décisions de Capp (règles v3.5 § 9) ; phrases des cours et des règles § 11 (lot 11)", "ordre": ordre})
    X += nouveaux
    for dossier in (C, os.path.join(OMP, "contenu/exemples")):
        with open(os.path.join(dossier, "exercices.json"), "w", encoding="utf-8") as f:
            json.dump(X, f, ensure_ascii=False, indent=1); f.write("\n")
    # mots nouveaux pour les cours : à valider par Capp (sans doublon)
    lignes = list(csv.DictReader(open(A_VALIDER, encoding="utf-8")))
    deja = {l["forme"] for l in lignes}
    with open(A_VALIDER, "a", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["forme", "sens", "regle", "raison"])
        for mot, (sens, origine) in a_valider.items():
            if mot not in deja:
                w.writerow({"forme": mot, "sens": sens, "regle": f"lot 11 (scènes) ; source : {origine}", "raison": "mot attesté ajouté à une scène, pas encore dans les cours : forme et sens à confirmer"})
    nb = [len(e["zones"]) for e in nouveaux]
    print(f"{len(nouveaux)} scènes, {min(nb)} à {max(nb)} éléments, {sum(1 for e in nouveaux for z in e['zones'] if z.get('phrase'))} phrases ; {len(a_valider)} mots à valider")


if __name__ == "__main__":
    main()
