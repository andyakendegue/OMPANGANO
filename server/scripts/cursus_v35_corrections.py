#!/usr/bin/env python3
"""Cours d'Onênji : corrections de Capp des règles v3.4 et v3.5 (22 nov. 2026, soir), appliquées après les lots du cursus v3.
- Ibanga wê → Ibanga we (règles § 10, § 12 : « we, jamais wê ») ;
- Incango sê ? est une salutation qui demande comment on va, pas une demande d'informations (§ 10.1) : sens français corrigé.
Idempotent ; écrit packages/noyau/contenu et contenu/exemples."""
import json, os

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
SENS_SALUT = "Comment vas-tu ? (pour saluer)"
REMPLACER = [("Ibanga wê", "Ibanga we")]
SENS = {"quelles nouvelles ?": "comment vas-tu ? (pour saluer)", "Quelles nouvelles ?": SENS_SALUT}


def corriger(v, e):
    if isinstance(v, str):
        for a, b in REMPLACER: v = v.replace(a, b)
        return v
    if isinstance(v, list): return [corriger(x, e) for x in v]
    if isinstance(v, dict): return {k: corriger(x, e) for k, x in v.items()}
    return v


def main():
    C = os.path.join(OMP, "packages/noyau/contenu")
    n = 0
    for nom in ("exercices", "lecons", "unites"):
        X = json.load(open(os.path.join(C, nom + ".json"), encoding="utf-8"))
        Y = []
        for e in X:
            f = corriger(e, e)
            texte = json.dumps(f, ensure_ascii=False)
            if "Incango sê" in texte:
                for k in ("mot_francais", "reponse", "consigne"):
                    if isinstance(f.get(k), str) and f[k] in SENS: f[k] = SENS[f[k]]
                if isinstance(f.get("consigne"), str): f["consigne"] = f["consigne"].replace("« quelles nouvelles ? »", "« comment vas-tu ? » (pour saluer)")
                if isinstance(f.get("options"), list): f["options"] = [SENS.get(o, o) for o in f["options"]]
            if f.get("id") == "ikoko-l1-01" and isinstance(f.get("texte"), str) and "Incango" not in f["texte"]:
                f["texte"] = f["texte"].replace("Puis on demande les nouvelles.", "Puis on demande comment ça va : « Incango sê ? ».")
            n += f != e
            Y.append(f)
        if nom == "exercices":  # répondre à une salutation (§ 10.1) : formules de Capp, ajoutées à « Saluer et prendre des nouvelles »
            Y = [e for e in Y if not e["id"].startswith("ik35-")]
            o = max([e.get("ordre") or 0 for e in Y if e["lecon_id"] == "ikoko-l1"] + [0])
            for i, (m, f) in enumerate([("Incango mbiambie.", "Ça va bien. (réponse à une salutation)"), ("Myê re vôvô. Akewa.", "Je vais bien, merci."), ("Du vôvô. Go nduani. Akewa.", "Ça va bien. Je me maintiens. Merci.")], 1):
                Y.append({"id": f"ik35-reponse-{i}", "lecon_id": "ikoko-l1", "type": "ecouter", "consigne": "Pour répondre : écoute et répète.", "mot_myene": m, "mot_francais": f,
                          "source": "Règles de référence v3.5 § 10.1 (Capp, 22 nov. 2026)", "ordre": o + i})
        for dossier in (C, os.path.join(OMP, "contenu/exemples")):
            with open(os.path.join(dossier, nom + ".json"), "w", encoding="utf-8") as o:
                json.dump(Y, o, ensure_ascii=False, indent=1); o.write("\n")
    print(f"{n} lignes corrigées (Ibanga we ; Incango sê ? = salutation)")


if __name__ == "__main__":
    main()
