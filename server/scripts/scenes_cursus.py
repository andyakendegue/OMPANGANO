#!/usr/bin/env python3
"""Exercices « scène » (on touche ce qu'on voit pour entendre et lire son nom) : un par leçon de vocabulaire illustrée,
demande de Capp du 22 nov. 2026. Aucun mot nouveau : chaque zone reprend un mot déjà présent dans la leçon (même écriture v3,
même sens, même source). Idempotent : les identifiants sc-<leçon> sont remplacés à chaque passage."""
import json, os
ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
C = os.path.join(OMP, "packages/noyau/contenu")
SCENES = {  # leçon : (décor, consigne)
    "ntina-l20": ("village", "Touche chaque personne du village pour entendre son nom."),
    "ntina-l22": ("village", "Touche les animaux de la maison."),
    "ntina-l23": ("lagune", "Touche les animaux de la forêt et de la lagune."),
    "ntina-l24": ("village", "Au marché : touche ce que tu vois."),
    "ntina-l26": ("village", "Dans la maison : touche chaque chose."),
    "ntina-l28": ("lagune", "Touche le ciel, l'eau et les arbres."),
    "ogendo-l3": ("village", "Touche chaque partie de la maison, écoute et lis son nom."),
    "ogendo-l4": ("village", "Touche les meubles, écoute et lis leur nom."),
    "ogendo-l5": ("village", "À la cuisine : touche chaque objet, écoute et lis son nom."),
    "ogendo-l6": ("village", "Touche chaque habit, écoute et lis son nom."),
    "ogendo-l7": ("village", "Touche chaque lieu, écoute et lis son nom."),
    "ogendo-l9": ("lagune", "Du matin au soir : touche chaque moment."),
}
POSITIONS = {  # village : au sol (sous l'horizon) ; lagune : ciel, rive et eau
    "village": [(14, 62), (36, 82), (56, 64), (76, 84), (90, 62), (24, 90), (64, 92)],
    "lagune": [(18, 34), (50, 26), (82, 36), (22, 70), (55, 78), (84, 70), (38, 52)],
}


def main():
    ex = json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8"))
    ex = [e for e in ex if not (e["id"].startswith("sc-") and e["id"] != "sc-lagune")]
    ajout = []
    for lecon, (decor, consigne) in SCENES.items():
        mots, vus = [], set()
        for e in ex:
            if e["lecon_id"] == lecon and e.get("publie") is not False and e["type"] == "ecouter" and e.get("illustration") and e.get("mot_myene") \
                    and len(e["mot_myene"].split()) <= 2 and e["mot_myene"].lower() not in vus:
                vus.add(e["mot_myene"].lower()); mots.append(e)
        pos = POSITIONS[decor]
        mots = mots[:len(pos)]
        if len(mots) < 4:
            continue
        pris = {e.get("ordre") for e in ex if e["lecon_id"] == lecon}
        der = max(e.get("ordre") or 0 for e in ex if e["lecon_id"] == lecon and e["type"] == "ecouter") + 1
        while der in pris:  # une même position = variantes dialectales : on prend une position libre
            der += 1
        ajout.append({"id": f"sc-{lecon}", "lecon_id": lecon, "type": "scene", "consigne": consigne, "scene": decor,
                      "zones": [{"x": x, "y": y, "mot": m["mot_myene"], "sens": m["mot_francais"], "illustration": m["illustration"], **({"audio": m["audio"]} if m.get("audio") else {})}
                                for (x, y), m in zip(pos, mots)],
                      "source": "Mots de la leçon (exercices " + ", ".join(m["id"] for m in mots) + ")", "ordre": der})
    ex += ajout
    for d in (C, os.path.join(OMP, "contenu/exemples")):
        with open(os.path.join(d, "exercices.json"), "w", encoding="utf-8") as f:
            json.dump(ex, f, ensure_ascii=False, indent=1); f.write("\n")
    print(f"{len(ajout)} scènes ; total {sum(e['type'] == 'scene' for e in ex)}")


if __name__ == "__main__":
    main()
