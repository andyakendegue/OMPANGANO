#!/usr/bin/env python3
"""Conversion des cours Onênji en graphie v3 (Rékanga), avec les protections de la consigne
`14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md` (§ 2 et § 3) et les règles `_contexte/REGLES_MYENE_REFERENCE_v3.md` (v3.3).

Réutilise les fonctions du script du corpus (`17_edition_DONDO_myene/v3_rekanga_2026-11-21/appliquer_regles_v3_rekanga.py`) :
lettres, protection du français (liste Gutenberg), formes de Rékanga et décisions de Capp. Protections ajoutées :
  - rien n'est touché entre crochets (transcriptions, tons) ;
  - la règle des pronoms (e → ê, o → ô) et le lexique ne s'appliquent jamais à une lettre isolée, au champ `graphie`
    ni aux options des exercices de sons (son, quel_son, tracer) : lettres seulement ;
  - une phrase est convertie une seule fois ; la même forme est reportée dans tous ses champs (mot, options, réponse, indice, texte) ;
  - *gh* → *g*, *ts* → *c*, *gn* → *ny*, *h* seul → *ngh* (seulement les mots décidés : *handi* → *nghandi*) ;
  - *mw* → *nghw* seulement pour les mots validés par Capp ; tous les autres vont dans `A_VALIDER_Capp_mw_nghw.csv` ;
  - signes posés par la machine (indéfini, impératif, infinitif soudé, possessif soudé, semi-voyelle, nombres) : listés dans
    `A_VALIDER_Capp_signes.csv` (avant, après, sens) ; relatives : proposées seulement, jamais posées.

Usage : python3 server/scripts/convertir_cursus_v3.py [--essai]
  --essai : n'écrit pas les JSON, seulement les listes et le journal (dans 14_programme_et_jeux/journal_conversion_v3/).
"""
import argparse, csv, importlib.util, json, os, re, shutil, sys, unicodedata
from collections import Counter, OrderedDict
from datetime import datetime

ICI = os.path.dirname(os.path.abspath(__file__))
OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
DONDO = os.path.abspath(os.path.join(OMP, ".."))
NFC = lambda s: unicodedata.normalize("NFC", s)

spec = importlib.util.spec_from_file_location(
    "v3", os.path.join(DONDO, "17_edition_DONDO_myene/v3_rekanga_2026-11-21/appliquer_regles_v3_rekanga.py"))
v3 = importlib.util.module_from_spec(spec); spec.loader.exec_module(v3)

# ---------------------------------------------------------------------------------------------- lettres et mots
# Ajouts au script du corpus (complément du 22 nov. § 3 ; règles v3.3 § 2.2, § 4)
MOTIF_COURS = re.compile(r"tch|dj|dy|ñ|ṽ|v̂|è|é|(?<!n)gh|gn|(?:^|n)ts", re.I)
# Décisions de Capp (règles v3.3 § 2, § 6.1, § 9, complément § 2-4) appliquées au mot exact
LEXIQUE_CAPP = {
    "myé": "myê", "myè": "myê", "mye": "myê",               # je (pronom autonome et sujet)
    "né": "nwê", "ne": "nwê",                               # vous (seulement en position de sujet : voir PRONOM_SUJET)
    "handi": "nghandi",                                     # jalousie (h seul → ngh)
    "djôgôni": "njôgôni", "jôgôni": "njôgôni",              # poule (Capp, 22 nov.)
    "ogholo": "ogolo", "oghaso": "ogaso", "ndegho": "ndego", "ntogholo": "ntogolo",
    "ntsuwa": "ncuwa", "tsô": "cô",
}
# mw → nghw : seulement ce que Capp a validé (consigne § 2.3 ; règles § 2.2)
NGHW_VALIDES = {
    "omwana": "onghwana", "ômwana": "onghwana", "omwanto": "onghwantô", "omwantô": "onghwantô", "ômwantô": "onghwantô",
    "omwèyi": "onghwêyi", "omwêyi": "onghwêyi", "omweyi": "onghwêyi",
    "omwan'onome": "onghwan'onome", "ômwan'ônôme": "onghwan'onome", "omwan'omwantô": "onghwan'onghwantô",
    "ômwan'ômwantô": "onghwan'onghwantô", "omwant'iwami": "onghwant'wami", "omwant'wami": "onghwant'wami",
}
# Noms de l'application (complément § 4 ; règles § 9)
NOMS = [("Ogèndo", "Ogêndo"), ("Ogéndo", "Ogêndo"), ("Emeno", "Emênô"), ("Onenji", "Onênji"), ("Ontci", "Onci"),
        ("Nkorouna", "Nkoruna"), ("Igolani", "Igôlani"), ("Ekèï-kèï", "Ekêï-kêï"), ("Olèngwani", "Olêngwani"),
        ("Onèró", "Onêro"), ("Onèro", "Onêro")]
# Phrases tranchées par Capp (règles v3.3 § 6.1, 6.2, 11) : remplacées en entier
PHRASES_CAPP = {
    "Mi nya": "Myê nya", "Mi bé nya": "Myê be nya", "Mi be nya": "Myê be nya",
    "Myé nya · Mi nya": "Myê nya · Mi nya", "Né nya": "Nwê nya", "Né djèna": "Nwê jêna",
}
PRONOMS_SUJETS_V2 = {"né": "Nwê"}  # « Né » + verbe : vous (complément § 2)

TYPES_SONS = {"son", "quel_son", "tracer"}
TYPES_OPTIONS_MYENE = {"choix", "trou", "ordre", "comprendre"}


FRANCAIS_COURS = {"mandji", "myènè", "myènès", "épaule", "épic", "porc-épic", "né", "née", "salé", "télé", "tapé", "zélé", "ré", "été", "dé"}


class ConvCours(v3.Convertisseur):
    """Convertisseur du corpus + lettres absentes du script (gh, gn, ts), décisions de Capp, mw validés.
    francais=True : texte français qui cite des mots myènè ; seuls les mots à lettres v2 absents du français sont convertis,
    jamais une lettre isolée par la règle des pronoms, jamais un mot français homographe (né, salé, télé…)."""

    def __init__(self, fr, vocab, francais=False):
        super().__init__(fr, vocab)
        self.mode_fr = francais

    def mot(self, tok, debut_phrase=False):
        low = tok.lower()
        if low in FRANCAIS_COURS or low in v3.INTOUCHABLES:
            return tok
        if self.mode_fr:
            if low in NGHW_VALIDES or (low in LEXIQUE_CAPP and low not in ("né", "ne", "mye")):
                r = NGHW_VALIDES.get(low) or LEXIQUE_CAPP[low]
                out = r[0].upper() + r[1:] if tok[0].isupper() else r
                self.changes[(tok, out)] += 1
                return out
            if low in v3.FRANCAIS_FORCE or low in v3.PRENOMS_FR:
                return tok
            if len(tok) == 1 or not MOTIF_COURS.search(tok):
                out = lettres_seules(tok) if len(tok) == 1 else tok
            elif low in self.fr and low not in self.my:
                self.proteges[(tok, "francais")] += 1
                return tok
            else:
                out = self.lexique(lettres_seules(tok)) if low not in NGHW_VALIDES else NGHW_VALIDES[low]
            if out != tok:
                out = out[0].upper() + out[1:] if tok[0].isupper() else out
                self.changes[(tok, out)] += 1
            return out
        if low in NGHW_VALIDES:
            r = NGHW_VALIDES[low]
            out = r[0].upper() + r[1:] if tok[0].isupper() else r
            self.changes[(tok, out)] += 1
            return out
        if low in LEXIQUE_CAPP and low not in ("né", "ne", "mye"):
            r = LEXIQUE_CAPP[low]
            out = r[0].upper() + r[1:] if tok[0].isupper() else r
            self.changes[(tok, out)] += 1
            return out
        if not MOTIF_COURS.search(tok):
            return super().mot(tok, debut_phrase)
        if low in v3.INTOUCHABLES or low in v3.FRANCAIS_FORCE or low in v3.PRENOMS_FR:
            return tok
        if low not in self.my and low not in v3.MYENE_FORCE and low in self.fr:
            self.proteges[(tok, "francais")] += 1
            return tok
        out = lettres_seules(tok)
        out = re.sub(r"^([Nn]?)ts", lambda m: m.group(1) + "c", out)
        out = re.sub(r"^([Nn]?)Ts", lambda m: m.group(1) + "C", out)
        out = self.lexique(out)
        if out != tok:
            self.changes[(tok, out)] += 1
        return out

    def texte(self, s, protege=False):
        """protege=True : lettres seulement (lettres isolées, graphie, options de sons) ; jamais entre crochets."""
        if not s:
            return s
        parts = re.split(r"(\[[^\]\n]*\])", NFC(s))
        res = []
        for i, p in enumerate(parts):
            if i % 2:
                res.append(p)
            elif protege:
                res.append(lettres_seules(p))
            else:
                res.append(super().texte(p))
        return NFC("".join(res))


def lettres_seules(s):
    """gh → g (jamais le gh de ngh), gn → ny, puis les lettres du script du corpus (dont ñ → ngh)."""
    t = re.sub(r"(?<![Nn])gh", "g", s)
    t = re.sub(r"(?<![Nn])Gh", "G", t)
    t = t.replace("gn", "ny").replace("Gn", "Ny")
    for a, b in v3.REMPLACEMENTS:
        t = t.replace(a, b)
    return NFC(t)


# ---------------------------------------------------------------------------------------------- signes
class Signes(v3.PassePhrases):
    """Passe des signes du script du corpus, corrigée pour la v3.3 : nombres en ny' ; relatives proposées, jamais posées
    (le script les mettait sur le -o final ; la règle est la première syllabe) ; pas d'indéfini sur un mot de liste ni
    devant un nombre (règles § 3)."""

    def __init__(self, *a):
        super().__init__(*a)
        self.propositions = []

    def nombres(self, rid, t):
        n = super().nombres(rid, t)
        return n.replace(" gn'", " ny'")

    def relatives(self, rid, t, fr):
        f = " " + fr.lower() + " "
        if re.search(r" (qui|que|qu'|dont) ", f.replace("’", "'")) and not re.search(r"est-ce qu|parce qu", f):
            self.propositions.append({"id": rid, "regle": "relative (tréma sur la première syllabe) : à poser par Capp", "avant": t, "apres": t})
        return t

    def phrase_cours(self, rid, t, fr):
        if not t or len(t.split()) < 2:  # mot de liste : au défini, sans ‘ (complément § 3)
            return t
        return self.phrase(rid, t, fr)

    def indefini(self, rid, t, fr):
        # Groupe nominal cité dans une liste (« une robe longue ») : pas d'indéfini ; seulement dans une phrase avec un verbe.
        toks = [x.lower().strip(",.!?") for x in t.split()]
        if not any(x in v3.PRONOMS | v3.AUXILIAIRES for x in toks):
            return t
        return super().indefini(rid, t, fr)


# ---------------------------------------------------------------------------------------------- conversion
class Cursus:
    def __init__(self, conv, signes):
        self.conv, self.signes = conv, signes
        self.memo = {}          # phrase d'origine -> forme v3 (une phrase convertie une fois)
        self.journal = []       # (id, champ, avant, apres)
        self.mw = OrderedDict()  # mot -> contexte
        self.doutes = []

    def phrase(self, rid, s, fr=""):
        if not s:
            return s
        if s in self.memo:
            return self.memo[s]
        if s in PHRASES_CAPP:
            n = PHRASES_CAPP[s]
        else:
            n = self.conv.texte(s)
            n = self.signes.phrase_cours(rid, n, fr or "")
        n = appliquer_noms(n)
        self.memo[s] = n
        return n

    conv_fr = None

    def texte_fr(self, s):
        """Texte français qui cite des mots myènè : phrases déjà converties reportées telles quelles, puis mots v2 hors français."""
        if not s:
            return s
        n = NFC(s)
        for avant in sorted(self.memo, key=len, reverse=True):
            if len(avant) >= 3 and avant in n and self.memo[avant] != avant:
                n = re.sub(r"(?<![\w’'])" + re.escape(avant) + r"(?![\w’'])", lambda m: self.memo[avant], n)
        n = self.conv_fr.texte(n)
        return appliquer_noms(n)

    def noter(self, rid, champ, avant, apres):
        if avant != apres:
            self.journal.append({"id": rid, "champ": champ, "avant": avant, "apres": apres})

    def reperer_mw(self, rid, s):
        for m in re.finditer(r"(?<![\w])([OoÔô]mw[\wêôèéâ’'-]*)", s or ""):
            w = m.group(1)
            if w.lower() not in NGHW_VALIDES:
                self.mw.setdefault(w, {"exercice": rid, "contexte": s})

    def exercice(self, e):
        rid, t = e["id"], e["type"]
        fr = e.get("mot_francais") or ""
        for k in ("mot_myene", "reponse", "texte", "indice", "conseil", "consigne"):
            self.reperer_mw(rid, e.get(k))
        for o in e.get("options") or []:
            self.reperer_mw(rid, o)
        # 1. myènè
        if e.get("mot_myene"):
            if t in TYPES_SONS and len(e["mot_myene"]) <= 2:
                n = self.conv.texte(e["mot_myene"], protege=True)
            else:
                n = self.phrase(rid, e["mot_myene"], fr)
            self.noter(rid, "mot_myene", e["mot_myene"], n); e["mot_myene"] = n
        if e.get("graphie"):
            n = self.conv.texte(e["graphie"], protege=True)
            self.noter(rid, "graphie", e["graphie"], n); e["graphie"] = n
        opts = e.get("options")
        if isinstance(opts, list):
            if t == "son":
                nouv = []
                for o in opts:
                    p = [x.strip() for x in o.split("=")]
                    p[0] = self.phrase(rid, p[0], p[1] if len(p) > 1 else "") if len(p[0]) > 2 else self.conv.texte(p[0], protege=True)
                    nouv.append(" = ".join(p))
            elif t in ("quel_son", "tracer") or all(len(o.strip()) <= 3 for o in opts):
                nouv = [self.conv.texte(o, protege=True) for o in opts]
            elif t == "ordre" and e.get("reponse") and " ".join(opts) == e["reponse"]:
                rep = self.phrase(rid, e["reponse"], (re.search(r"«\s*(.*?)\s*»", e.get("consigne", "")) or [None, ""])[1])
                morceaux = rep.split(" ")
                nouv = morceaux if len(morceaux) == len(opts) else [self.phrase(rid, o) for o in opts]
            elif t in TYPES_OPTIONS_MYENE:
                nouv = [self.phrase(rid, o) for o in opts]
            else:  # associer : options en français
                nouv = [self.texte_fr(o) for o in opts]
            self.noter(rid, "options", " | ".join(opts), " | ".join(nouv)); e["options"] = nouv
        if e.get("reponse"):
            if t in TYPES_SONS or (isinstance(opts, list) and all(len(o.strip()) <= 3 for o in opts) and len(e["reponse"]) <= 3):
                n = self.conv.texte(e["reponse"], protege=True)
            elif t in TYPES_OPTIONS_MYENE or t == "dictee":
                n = "/".join(self.phrase(rid, r, fr) for r in e["reponse"].split("/"))
                if t == "dictee":  # variantes v2 devenues identiques : une seule forme
                    n = "/".join(OrderedDict.fromkeys(n.split("/")))
            else:
                n = self.texte_fr(e["reponse"])
            self.noter(rid, "reponse", e["reponse"], n); e["reponse"] = n
        for z in e.get("zones") or []:
            if z.get("mot"):
                n = self.phrase(rid, z["mot"], z.get("sens", "")); self.noter(rid, "zones", z["mot"], n); z["mot"] = n
        # 2. français qui cite du myènè
        for k in ("consigne", "indice", "texte", "conseil", "mot_francais"):
            if e.get(k):
                n = self.texte_fr(e[k]); self.noter(rid, k, e[k], n); e[k] = n
        return e

    def titres(self, x):
        for k in ("titre", "titre_myene", "description", "palier_titre"):
            if x.get(k):
                n = self.texte_fr(x[k]); self.noter(x["id"], k, x[k], n); x[k] = n
        return x


def appliquer_noms(s):
    for a, b in NOMS:
        s = s.replace(a, b)
    return s


def ecrire_csv(chemin, champs, lignes):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=champs, extrasaction="ignore")
        w.writeheader(); w.writerows(lignes)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--essai", action="store_true"); a = ap.parse_args()
    fr = v3.charger_francais(os.path.join(DONDO, "_contexte/listes/mots_francais_gutenberg.txt"))
    vocab = v3.construire_vocab(DONDO, fr)
    conv = ConvCours(fr, vocab)
    # verbes repérés comme dans le script du corpus (pour les signes)
    verbes, cv = set(), v3.Convertisseur(fr, vocab)
    O = os.path.join(DONDO, "07_donnees/OMPANGANO/final_v2_regles_2026-11-10")
    for nom in ["IMPORT_1_ancien_v2_10000.csv", "IMPORT_2_nouveau_v2_40125.csv"]:
        for r in csv.DictReader(open(os.path.join(O, nom), encoding="utf-8")):
            toks = cv.texte(r["myeneText"]).lower().split(" ")
            for k in range(len(toks) - 1):
                if toks[k].strip(",.") in v3.PRONOMS | v3.AUXILIAIRES:
                    v = toks[k + 1].split("'")[0].strip(",.!?")
                    if v.endswith("a") and v not in v3.PRONOMS | v3.AUXILIAIRES:
                        verbes.add(v)
    signes = Signes(vocab, verbes, fr)
    cur = Cursus(conv, signes)
    cur.conv_fr = ConvCours(fr, vocab, francais=True)
    C = os.path.join(OMP, "packages/noyau/contenu")
    data = {n: json.load(open(os.path.join(C, n + ".json"), encoding="utf-8")) for n in ("parcours", "unites", "lecons", "exercices")}
    # les mots et phrases d'abord (mémoire des phrases), puis les textes français
    for e in data["exercices"]:
        cur.exercice(e)
    for n in ("parcours", "unites", "lecons"):
        for x in data[n]:
            cur.titres(x)

    J = os.path.join(DONDO, "14_programme_et_jeux/journal_conversion_v3")
    ecrire_csv(os.path.join(J, "MODIFICATIONS_cours_v3.csv"), ["id", "champ", "avant", "apres"], cur.journal)
    ecrire_csv(os.path.join(J, "mots_convertis_cours.csv"), ["avant", "apres", "n"],
               [{"avant": x, "apres": y, "n": c} for (x, y), c in conv.changes.most_common()])
    ecrire_csv(os.path.join(J, "mots_proteges_francais.csv"), ["mot", "raison", "n"],
               [{"mot": x, "raison": r, "n": c} for (x, r), c in conv.proteges.most_common()])
    # listes pour Capp (ajoutées sans effacer : une ligne par forme, la plus récente remplace l'identique)
    P = os.path.join(DONDO, "14_programme_et_jeux")
    sens = {e["id"]: e.get("mot_francais") or "" for e in data["exercices"]}
    sg = [dict(j, sens=sens.get(j["id"], ""), applique="oui") for j in signes.journal if j["avant"] != j["apres"]]
    sg += [dict(j, sens=sens.get(j["id"], ""), applique="non (proposition)") for j in signes.propositions]
    ecrire_csv(os.path.join(P, "A_VALIDER_Capp_signes.csv"), ["id", "regle", "avant", "apres", "sens", "applique"], sg)
    mw = [{"mot": w, "sens": sens.get(c["exercice"], ""), "source": "cours Onênji (" + c["exercice"] + ")",
           "forme_proposee": re.sub(r"^([OoÔô])mw", lambda m: ("O" if m.group(1) in "OÔ" else "o") + "nghw", w), "contexte": c["contexte"]}
          for w, c in cur.mw.items()]
    ecrire_csv(os.path.join(P, "A_VALIDER_Capp_mw_nghw.csv"), ["mot", "sens", "source", "forme_proposee", "contexte"], mw)
    bilan = {"date": datetime.now().isoformat(timespec="seconds"), "exercices": len(data["exercices"]),
             "exercices_modifies": len({j["id"] for j in cur.journal if j["id"] in sens}), "champs_modifies": len(cur.journal),
             "signes_poses": len(sg) - len(signes.propositions), "relatives_proposees": len(signes.propositions), "mw_a_valider": len(mw)}
    json.dump(bilan, open(os.path.join(J, "bilan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(bilan, ensure_ascii=False, indent=1))
    if a.essai:
        return
    A = os.path.join(DONDO, "_archives", datetime.now().strftime("%Y-%m-%d") + "_cursus_avant_v3")
    os.makedirs(A, exist_ok=True)
    for n in data:
        src = os.path.join(C, n + ".json")
        if not os.path.exists(os.path.join(A, n + ".json")):
            shutil.copy2(src, os.path.join(A, n + ".json"))
        with open(src, "w", encoding="utf-8") as f:
            json.dump(data[n], f, ensure_ascii=False, indent=1); f.write("\n")
        shutil.copy2(src, os.path.join(OMP, "contenu/exemples", n + ".json"))
    print("JSON écrits ; anciens fichiers dans", A)


if __name__ == "__main__":
    main()
