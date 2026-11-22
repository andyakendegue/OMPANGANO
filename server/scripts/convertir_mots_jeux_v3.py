#!/usr/bin/env python3
"""Mots des jeux d'Azeva (collection mots_jeux, en base) en graphie v3 : mêmes fonctions que convertir_cursus_v3.py.
Entrée : export JSON [{id, data}] ; sortie : JSON {id: {myene: nouvelle forme}} pour scripts/importer_cours.ts, et journal CSV.
Usage : python3 server/scripts/convertir_mots_jeux_v3.py <export.json> <sortie.json>"""
import csv, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from convertir_cursus_v3 import ConvCours, DONDO, v3  # noqa: E402

fr = v3.charger_francais(os.path.join(DONDO, "_contexte/listes/mots_francais_gutenberg.txt"))
conv = ConvCours(fr, v3.construire_vocab(DONDO, fr))
lignes = json.load(open(sys.argv[1], encoding="utf-8"))
sortie, journal = {}, []
for l in lignes:
    avant = l["data"].get("myene") or ""
    apres = conv.texte(avant)
    if apres != avant:
        sortie[l["id"]] = {"myene": apres}
        journal.append({"id": l["id"], "avant": avant, "apres": apres, "francais": l["data"].get("francais", "")})
json.dump(sortie, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
J = os.path.join(DONDO, "14_programme_et_jeux/journal_conversion_v3/mots_jeux_v3.csv")
with open(J, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["id", "avant", "apres", "francais"]); w.writeheader(); w.writerows(journal)
print(f"{len(journal)} mots convertis sur {len(lignes)} ; journal : {J}")
