#!/usr/bin/env python3
"""Lot 5 du cursus v3 (consigne 14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md ; audit 05, proposition D 1-4) : Ntina.
- un proverbe par unité (liste de l'audit, D 1), texte du recueil v3 (proverbes_DONDO_v3_rekanga.csv) et sa traduction ;
  lettres restées v2 dans le recueil corrigées (gh → g) et connectif lu selon les règles § 4 (yi nkala → y'inkala, zi ngani → z'ingani) :
  ces changements vont dans A_VALIDER_Capp_signes.csv ;
- ‘mbolo wë ! (salut, bonjour, bonsoir) en carte « bon à savoir » ;
- parenté : tâta poyo, mâma poyo, kâka (grand-parent), yâya (frère aîné) (règles § 3, § 9) ;
- un exercice « dire » par leçon du palier 3 (mot déjà présent dans la leçon).
Idempotent (identifiants nt5-*)."""
import csv, json, os

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
DONDO = os.path.dirname(OMP)
C = os.path.join(OMP, "packages/noyau/contenu")
REC = os.path.join(DONDO, "17_edition_DONDO_myene/v3_rekanga_2026-11-21/04_proverbes/proverbes_DONDO_v3_rekanga.csv")
PROVERBES = {  # leçon : (proverbe, corrections v3 appliquées au texte du recueil)
    "ntina-l2": ("PRV-0069", [("Ndegho", "Ndego")]),
    "ntina-l19": ("PRV-0050", []),
    "ntina-l21": ("PRV-0015", []),
    "ntina-l22": ("PRV-0011", [("yi nkala", "y'inkala")]),
    "ntina-l25": ("PRV-0035", [("Ntogholo", "Ntogolo"), ("zi ngani", "z'ingani")]),
    "ntina-l27": ("PRV-0047", []),
    "ntina-l29": ("PRV-0044", [("yi nkala", "y'inkala")]),
    "ntina-l35": ("PRV-0051", []),
}
SIGNES = os.path.join(DONDO, "14_programme_et_jeux/A_VALIDER_Capp_signes.csv")


def main():
    rec = {r["id"]: r for r in csv.DictReader(open(REC, encoding="utf-8"), delimiter=";")}
    X = json.load(open(os.path.join(C, "exercices.json"), encoding="utf-8"))
    X = [e for e in X if not e["id"].startswith("nt5-")]
    libre = lambda l: max([e.get("ordre") or 0 for e in X if e["lecon_id"] == l] + [0]) + 1
    nouveaux, signes = [], []
    for lecon, (pid, corr) in PROVERBES.items():
        r = rec[pid]; t = r["texte_original"]
        for a, b in corr:
            if a in t:
                signes.append({"id": f"nt5-{lecon}-proverbe", "regle": "proverbe : lettre v3 (gh → g) ou connectif lu selon les règles § 4", "avant": t, "apres": t.replace(a, b), "sens": r["traduction"], "applique": "oui"})
                t = t.replace(a, b)
        nouveaux.append({"id": f"nt5-{lecon}-proverbe", "lecon_id": lecon, "type": "proverbe", "consigne": "Un proverbe", "mot_myene": t, "mot_francais": r["traduction"],
                         **({"texte": r["sens_ou_equivalent"]} if r.get("sens_ou_equivalent") else {}), "source": f"Recueil des proverbes DONDO v3, {pid}", "ordre": libre(lecon)})
    S = "Règles de référence v3.3 § 3 (parenté), § 9, § 10"
    nouveaux.append({"id": "nt5-mbolo-we", "lecon_id": "ntina-l1", "type": "culture", "consigne": "Bon à savoir", "mot_myene": "‘mbolo wë !", "mot_francais": "salut, bonjour, bonsoir",
                     "texte": "« Mbolo » se dit aussi « ‘mbolo wë ! », pour saluer quelqu'un à toute heure du jour.", "source": S, "ordre": libre("ntina-l1")})
    o = libre("ntina-l21")
    for i, (m, f, ill) in enumerate([("Kâka", "le grand-parent", "🧓"), ("Yâya", "le frère aîné", "🧑")]):
        nouveaux.append({"id": f"nt5-parente-{i + 1}", "lecon_id": "ntina-l21", "type": "ecouter", "consigne": "Écoute et répète.", "mot_myene": m, "mot_francais": f, "illustration": ill, "source": S, "ordre": o + i})
    for e in X:  # parenté : circonflexe sur le a
        for k in ("mot_myene", "reponse", "consigne", "texte"):
            if isinstance(e.get(k), str):
                e[k] = e[k].replace("Tata poyo", "Tâta poyo").replace("Mama poyo", "Mâma poyo").replace("tata poyo", "tâta poyo").replace("mama poyo", "mâma poyo")
        if isinstance(e.get("options"), list):
            e["options"] = [x.replace("Tata poyo", "Tâta poyo").replace("Mama poyo", "Mâma poyo") for x in e["options"]]
    # « dire » au palier 3 : un mot de la leçon
    U = json.load(open(os.path.join(C, "unites.json"), encoding="utf-8")); L = json.load(open(os.path.join(C, "lecons.json"), encoding="utf-8"))
    p3 = {u["id"] for u in U if u.get("parcours_id") == "ntina" and u.get("palier") == 3}
    for l in sorted((l for l in L if l["unite_id"] in p3), key=lambda l: l["id"]):
        if any(e["lecon_id"] == l["id"] and e["type"] == "dire" for e in X):
            continue
        m = next((e for e in X if e["lecon_id"] == l["id"] and e.get("publie") is not False and e["type"] in ("ecouter", "quel_son") and e.get("mot_myene") and e.get("mot_francais")), None)
        if m:
            nouveaux.append({"id": f"nt5-dire-{l['id']}", "lecon_id": l["id"], "type": "dire", "consigne": f"Dis « {m['mot_myene']} » à voix haute.", "mot_myene": m["mot_myene"], "mot_francais": m["mot_francais"],
                             **({"illustration": m["illustration"]} if m.get("illustration") else {}), "source": m.get("source", ""), "ordre": libre(l["id"])})
    X += nouveaux
    for dossier in (C, os.path.join(OMP, "contenu/exemples")):
        with open(os.path.join(dossier, "exercices.json"), "w", encoding="utf-8") as f:
            json.dump(X, f, ensure_ascii=False, indent=1); f.write("\n")
    anciennes = list(csv.DictReader(open(SIGNES, encoding="utf-8")))
    cles = {(r["id"], r["avant"]) for r in anciennes}
    with open(SIGNES, "a", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "regle", "avant", "apres", "sens", "applique"])
        for s in signes:
            if (s["id"], s["avant"]) not in cles: w.writerow(s)
    print(f"{len(nouveaux)} exercices ajoutés (dont {len(PROVERBES)} proverbes) ; {len(signes)} corrections listées pour Capp")


if __name__ == "__main__":
    main()
