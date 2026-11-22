#!/usr/bin/env python3
"""Lot 6 du cursus v3 : « Montre-moi » aux paliers 1 et 2 de Ntina, à la place des choix écrits (audit 05, D 5).
Une question « Que veut dire « X » ? » (options en français) devient : on entend X, on touche le bon dessin parmi 3 ou 4,
quand chaque option a son dessin dans la même unité (même sens, même émoji que l'exercice où le mot est appris).
Identifiants gardés ; idempotent (une question déjà convertie est laissée telle quelle)."""
import json, os
ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
C = os.path.join(OMP, "packages/noyau/contenu")


def main():
    U = json.load(open(os.path.join(C, "unites.json"), encoding="utf-8")); L = json.load(open(os.path.join(C, "lecons.json"), encoding="utf-8"))
    X = json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8"))
    p12 = {u["id"] for u in U if u.get("parcours_id") == "ntina" and u.get("palier") in (1, 2)}
    unite = {l["id"]: l["unite_id"] for l in L}
    dessins = {}  # (unité, sens en minuscules) -> émoji
    for e in X:
        if unite.get(e["lecon_id"]) in p12 and e.get("illustration") and e.get("mot_francais") and e.get("publie") is not False:
            dessins.setdefault((unite[e["lecon_id"]], e["mot_francais"].strip().lower()), e["illustration"])
    n = 0
    for e in X:
        u = unite.get(e["lecon_id"])
        if u not in p12 or e["type"] != "associer" or not e.get("mot_myene") or not isinstance(e.get("options"), list):
            continue
        ims = [dessins.get((u, o.strip().lower())) for o in e["options"]]
        if not all(ims) or len(set(ims)) != len(ims) or e["reponse"] not in e["options"]:
            continue
        rep = ims[e["options"].index(e["reponse"])]
        e.update(type="montre", consigne=f"Touche le dessin : « {e['mot_myene']} »", options=ims[:4] if rep in ims[:4] else [rep] + [i for i in ims if i != rep][:3], reponse=rep,
                 mot_francais=e.get("mot_francais") or e["reponse"])
        e.pop("indice", None)
        n += 1
    # deux « montre-moi » de plus par leçon, à partir des mots illustrés qu'elle fait entendre (identifiants mm-*)
    X = [e for e in X if not e["id"].startswith("mm-")]
    ajout = []
    for l in sorted((l for l in L if l["unite_id"] in p12), key=lambda l: l["id"]):
        mots = [e for e in X if e["lecon_id"] == l["id"] and e["type"] == "ecouter" and e.get("illustration") and e.get("mot_myene") and e.get("publie") is not False]
        autres = list(dict.fromkeys(im for (u, _), im in dessins.items() if u == l["unite_id"]))
        deja = {e.get("mot_myene") for e in X if e["lecon_id"] == l["id"] and e["type"] == "montre"}
        place = 14 - sum(1 for e in X if e["lecon_id"] == l["id"] and e.get("publie") is not False)  # leçon courte pour 3-5 ans
        mots = [m for m in mots if m["mot_myene"] not in deja][:max(0, min(2, place))]
        ordre = max([e.get("ordre") or 0 for e in X if e["lecon_id"] == l["id"]] + [0]) + 1
        for i, m in enumerate(mots):
            leurres = [im for im in autres if im != m["illustration"]][(i * 2) % max(1, len(autres) - 1):][:2] or [im for im in autres if im != m["illustration"]][:2]
            if len(leurres) < 2:
                continue
            ajout.append({"id": f"mm-{l['id']}-{i + 1}", "lecon_id": l["id"], "type": "montre", "consigne": f"Touche le dessin : « {m['mot_myene']} »", "mot_myene": m["mot_myene"],
                          "mot_francais": m["mot_francais"], "options": [m["illustration"]] + leurres, "reponse": m["illustration"], "source": m.get("source", ""), "ordre": ordre + i})
    X += ajout
    n += len(ajout)
    for d in (C, os.path.join(OMP, "contenu/exemples")):
        with open(os.path.join(d, "exercices.json"), "w", encoding="utf-8") as f:
            json.dump(X, f, ensure_ascii=False, indent=1); f.write("\n")
    print(f"{n} questions converties en « montre-moi » ; total {sum(e['type'] == 'montre' for e in X)}")


if __name__ == "__main__":
    main()
