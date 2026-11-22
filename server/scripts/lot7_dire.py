#!/usr/bin/env python3
"""Lot 7 du cursus v3 : une partie de « Dire juste » devient « dire » (l'élève s'enregistre ; un modérateur corrige dans la file
de validation d'Ompangano). Un mot répété sur quatre de chaque leçon de « Dire juste » ; identifiants gardés ; idempotent."""
import json, os
ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
C = os.path.join(OMP, "packages/noyau/contenu")
LECONS = ["ntina-l9", "ntina-l10", "ntina-l11", "ntina-l12", "ntina-l13", "ntina-l14"]


def main():
    X = json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8"))
    n = 0
    for l in LECONS:
        mots = sorted((e for e in X if e["lecon_id"] == l and e["type"] in ("ecouter", "ton", "dire") and e.get("mot_myene") and e.get("publie") is not False), key=lambda e: e.get("ordre") or 0)
        for i, e in enumerate(mots):
            if i % 4 == 3 and e["type"] != "dire":
                e["type"] = "dire"; e["consigne"] = f"Dis « {e['mot_myene']} » à voix haute. Un correcteur écoutera ta voix."
                n += 1
    for d in (C, os.path.join(OMP, "contenu/exemples")):
        with open(os.path.join(d, "exercices.json"), "w", encoding="utf-8") as f:
            json.dump(X, f, ensure_ascii=False, indent=1); f.write("\n")
    print(f"{n} exercices « dire » de plus ; total dans « Dire juste » : {sum(1 for e in X if e['lecon_id'] in LECONS and e['type'] == 'dire')}")


if __name__ == "__main__":
    main()
