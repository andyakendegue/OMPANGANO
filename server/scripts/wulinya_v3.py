#!/usr/bin/env python3
"""Série Wulinya myè en graphie v3.6 (demande de Capp, 22 nov. 2026, nuit : « réécrire tous les documents dans la v3 »).
Documents : 11_histoire_cotes_myene/06_wulinya_mye/*.md (sauf « Prompts Flow — prêts à coller.md », régénéré par le script
de synchronisation). Ce qui est converti :
- la colonne myènè des tableaux dont l'en-tête commence par « Ôrungu » / « Orungu » / « Myènè » : convertisseur v3 des cours
  (mode myènè) puis sans_grave (plus d'accent grave) ;
- la colonne française de ces tableaux et les passages en italique du reste du texte : mode « français » (seuls les mots absents
  du français et écrits en v2 changent : noms, citations myènè) ;
- Ôrungu → Orungu partout.
Jamais touché : les sections « Prompts Flow » et les blocs fixes (anglais), les blocs de code, les crochets.
Usage : wulinya_v3.py [--ecrire]  (sans --ecrire : affiche les changements). Les originaux vont dans _anciennes_versions_2026-11-22/."""
import collections, importlib.util, os, re, shutil, sys

ICI = os.path.dirname(os.path.abspath(__file__)); DONDO = os.path.abspath(os.path.join(ICI, "..", "..", ".."))
sys.path.insert(0, ICI)
from sans_grave import convertir_texte  # noqa: E402
spec = importlib.util.spec_from_file_location("cc", os.path.join(ICI, "convertir_cursus_v3.py")); cc = importlib.util.module_from_spec(spec); spec.loader.exec_module(cc)

DOSSIER = os.path.join(DONDO, "11_histoire_cotes_myene/06_wulinya_mye")
ARCH = os.path.join(DOSSIER, "_anciennes_versions_2026-11-22")
EXCLUS = {"Prompts Flow — prêts à coller.md"}
# Noms officiels (lieux, pays, ethnies voisines, personnalités, auteurs) : orthographe d'état civil ou française, jamais convertie.
OFFICIELS = ["Compiègne", "Espagne", "Lambaréné", "Omboué", "Ngounié", "Tsogo", "Okandé", "Bongo", "Rapontchombo", "Ayaminè-Anguilet",
             "Augé", "Ogooué", "Onangué", "Eyeghe", "Rogombé-Nwèntchandi", "Rogombé", "Gonsalves", "Amsterdam", "Lopez", "Mandji", "Libreville",
             "Port-Gentil", "Fernan-Vaz", "Gabon", "Owendo", "Ndjolé", "Cap Lopez", "Nyonié", "Oguémoué", "Émile"]
SECTIONS_ANGLAIS = re.compile(r"^#{2,4} .*(Prompts Flow|blocs fixes|Refaire sans Flow)", re.I)


def convertisseurs():
    fr = cc.v3.charger_francais(os.path.join(DONDO, "_contexte/listes/mots_francais_gutenberg.txt"))
    vocab = cc.v3.construire_vocab(DONDO, fr)
    return cc.ConvCours(fr, vocab), cc.ConvCours(fr, vocab, francais=True)


def main():
    ecrire = "--ecrire" in sys.argv
    my, frc = convertisseurs()
    def proteger(f):
        def g(s):
            pris = {}
            for i, n in enumerate(sorted(OFFICIELS, key=len, reverse=True)):
                if n in s: k = f"\uE000{i}\uE001"; pris[k] = n; s = s.replace(n, k)
            s = f(s)
            for k, n in pris.items(): s = s.replace(k, n)
            return s
        return g
    conv_my = proteger(lambda s: convertir_texte(my.texte(s), myene_seul=True))
    conv_fr = proteger(lambda s: convertir_texte(frc.texte(s)))
    # Nom de la série en v3 (Wulinya myê), sauf quand il désigne un fichier (« Wulinya myè — Charte graphique.md » : noms gardés).
    serie = lambda s: re.sub(r"Wulinya myè(?![^|»\n]*?\.md)", "Wulinya myê", s)
    sous_titre = lambda s: serie(s.replace("Ôrungu", "Orungu").replace("ôrungu", "orungu").replace("ÔRUNGU", "ORUNGU"))
    italiques = lambda s: re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", lambda m: "*" + conv_fr(m.group(1)) + "*", s)
    bilan = collections.Counter(); exemples = collections.Counter()
    for nom in sorted(os.listdir(DOSSIER)):
        if not nom.endswith(".md") or nom in EXCLUS: continue
        p = os.path.join(DOSSIER, nom); s = open(p, encoding="utf-8").read()
        out, anglais, code, tableau_my = [], False, False, False
        for l in s.split("\n"):
            if l.startswith("```"): code = not code; out.append(l); continue
            if code: out.append(l); continue
            if l.startswith("#"):
                anglais = bool(SECTIONS_ANGLAIS.match(l)) if re.match(r"^#{2,4} ", l) else anglais and not l.startswith("# ")
                if l.startswith("# "): anglais = False
            if anglais: out.append(l.replace("Ôrungu", "Orungu")); continue
            if l.startswith("|"):
                cel = l.split("|")
                if len(cel) > 2 and re.match(r"\s*\**(Ôrungu|Orungu|Myènè|Myênê|Omyènè)\b", cel[1]) and not cel[1].strip().startswith("---"):
                    tableau_my = True; out.append(sous_titre(l)); continue
                if tableau_my and not set(cel[1].strip()) <= set("-: "):
                    cel[1] = conv_my(cel[1]); cel[2:] = [sous_titre(c) for c in cel[2:]]
                    n = "|".join(cel)
                else:
                    n = sous_titre(italiques(l))
            else:
                tableau_my = False
                n = sous_titre(italiques(l))  # prose française : seules les citations en italique changent
            if n != l:
                bilan[nom] += 1
                for a, b in zip(l.split(), n.split()):
                    if a != b: exemples[(a, b)] += 1
            out.append(n)
        if ecrire and "\n".join(out) != s:
            os.makedirs(ARCH, exist_ok=True)
            if not os.path.exists(os.path.join(ARCH, nom)): shutil.copy2(p, os.path.join(ARCH, nom))
            open(p, "w", encoding="utf-8").write("\n".join(out))
    print(dict(bilan))
    for k, v in exemples.most_common(None if "--tout" in sys.argv else 120): print(v, k)


if __name__ == "__main__":
    main()
