#!/usr/bin/env python3
"""Cours d'Onênji : règles v3.6 (réponses de Capp aux listes à valider, 22 nov. 2026, soir). À lancer après les lots et après
cursus_v35_corrections.py. Idempotent ; écrit packages/noyau/contenu et contenu/exemples.
- plus aucun accent grave (è → ê ; à, ì, ò, ù → a, i, o, u ; ề → ê ; ồ → ô), sauf dans les transcriptions (colonne phonetique :
  l'accent grave y note le ton bas) ; Orungu au lieu de Ôrungu ;
- formes tranchées : eling'ela (‘ pour « une »), onghwanja-nghwanja (le toit), Ndego e bandamino ni ncango, njôgu, nkêma ;
- epa (l'os) / ipa (des os) : la paire « pa / pa » redevient « ipa / pa » ;
- le conseil « ê, ô et u ne commencent jamais un mot » revient dans la leçon des voyelles (règle confirmée par Capp)."""
import json, os, re, sys

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
sys.path.insert(0, ICI)
from sans_grave import convertir_texte  # noqa: E402

GARDER = {"id", "lecon_id", "unite_id", "parcours_id", "phonetique", "source", "audio", "image", "illustration", "jeu_id", "type", "scene"}
MOTS = [
    (r"‘?elingh ela", lambda m: ("‘" if m.group(0).startswith("‘") else "") + "eling'ela"),
    (r"\b[Oo]mwanja-mwanja\b", lambda m: ("O" if m.group(0)[0] == "O" else "o") + "nghwanja-nghwanja"),
    (r"\bNdego ê bandamino\b", lambda m: "Ndego e bandamino"),
    (r"(?<![\w'‘])jôgu\b", lambda m: "njôgu"), (r"(?<![\w'‘])Jôgu\b", lambda m: "Njôgu"),
    (r"(?<![\w'‘])kêma\b", lambda m: "nkêma"), (r"(?<![\w'‘])Kêma\b", lambda m: "Nkêma"),
]


def texte(v):
    v = convertir_texte(v)
    for rx, f in MOTS: v = re.sub(rx, f, v)
    return v


def corriger(v, cle=None):
    if cle in GARDER: return v
    if isinstance(v, str): return texte(v)
    if isinstance(v, list): return [corriger(x) for x in v]
    if isinstance(v, dict): return {k: corriger(x, k) for k, x in v.items()}
    return v


def main():
    C = os.path.join(OMP, "packages/noyau/contenu")
    n = 0
    for nom in ("exercices", "lecons", "unites", "parcours"):
        X = json.load(open(os.path.join(C, nom + ".json"), encoding="utf-8"))
        Y = []
        for e in X:
            f = corriger(e)
            if nom == "exercices":
                if f["id"] == "nl13-paire-05":  # « des os » = ipa (Capp) ; la paire redevient distincte
                    f.update({"options": ["ipa", "pa", "mênê"], "reponse": "ipa", "indice": "ipa « des os » ; epa « l'os » ; pa « donner »"}); f.pop("publie", None)
                if f["id"] == "nl13-mot-19" and f.get("mot_myene") == "pa":  # « des os » : ipa (la transcription « pá » était tronquée)
                    f.update({"type": "ecouter", "consigne": "Écoute et répète.", "mot_myene": "ipa", "mot_francais": "des os"}); f.pop("phonetique", None)
                if f["id"] == "nl9-cours" and "conseil" not in f:
                    f["conseil"] = "ê, ô et u ne commencent jamais un mot : on écrit Orungu."
            n += f != e
            Y.append(f)
        if nom == "exercices" and not any(e["id"] == "nl13-epa" for e in Y):
            o = max([e.get("ordre") or 0 for e in Y if e["lecon_id"] == "ntina-l13"] + [0]) + 1
            Y.append({"id": "nl13-epa", "lecon_id": "ntina-l13", "type": "ecouter", "consigne": "Écoute et répète.", "mot_myene": "epa", "mot_francais": "l'os",
                      "source": "Capp, 22 nov. 2026 (epa l'os, ipa des os) ; leçon « Le corps humain »", "ordre": o}); n += 1
        for dossier in (C, os.path.join(OMP, "contenu/exemples")):
            with open(os.path.join(dossier, nom + ".json"), "w", encoding="utf-8") as o:
                json.dump(Y, o, ensure_ascii=False, indent=1); o.write("\n")
    print(f"{n} lignes corrigées (règles v3.6)")


if __name__ == "__main__":
    main()
