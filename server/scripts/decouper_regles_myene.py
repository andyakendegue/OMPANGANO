#!/usr/bin/env python3
"""Découpe `_contexte/REGLES_MYENE_REFERENCE_v3.md` par section pour le corpus consulté par Qwen (règles v3.3, § 15.2) :
un fichier par § (et par sous-section quand le § est long), titre « RÈGLES MYÈNÈ v3.3 § n », avec en tête la source,
le rang de source (0 : décisions de Capp et texte de référence) et la version. Le dossier produit se copie dans le corpus du serveur :
    /opt/embeddings/00_regles_myene_v3/   (indexé en premier : PRIORITE_RAG_DEFAUT de server/api/src/dossier.ts)

Usage : python3 server/scripts/decouper_regles_myene.py <racine DONDO> <dossier de sortie>
"""
import re, sys, unicodedata
from pathlib import Path

LONGUEUR_MAX = 2500  # au-delà, le § est découpé par sous-section (###)


def slug(t):
    t = unicodedata.normalize('NFD', t)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    return re.sub(r'[^A-Za-z0-9]+', '_', t).strip('_')[:50]


def main():
    racine, sortie = Path(sys.argv[1]).expanduser(), Path(sys.argv[2]).expanduser()
    src = racine / '_contexte' / 'REGLES_MYENE_REFERENCE_v3.md'
    texte = src.read_text(encoding='utf-8')
    version = re.search(r'version (\d+\.\d+)', texte).group(1)
    sortie.mkdir(parents=True, exist_ok=True)
    for f in sortie.glob('*.md'):
        f.unlink()
    morceaux = re.split(r'\n(?=## )', texte)
    n = 0
    for m in morceaux:
        titre = m.splitlines()[0].lstrip('# ').strip()
        num = re.match(r'(\d+)\.', titre)
        cle = f"{int(num.group(1)):02d}" if num else '00'
        parties = [m]
        if len(m) > LONGUEUR_MAX and '\n### ' in m:
            parties = re.split(r'\n(?=### )', m)
        for i, p in enumerate(parties):
            sous = p.splitlines()[0].lstrip('# ').strip()
            entete = (f"RÈGLES MYÈNÈ v{version} § {titre}" + (f" — {sous}" if i and sous != titre else '') + "\n"
                      f"source : règles myènè de référence DONDO v{version} (texte unique, prime sur tout) ; rang_source : 0 ; "
                      f"statut : valide_capp ; version_regles : v{version}\n\n")
            corps = p if i == 0 else f"(suite du § {titre})\n{p}"
            nom = f"Paragraphe_{cle}{'-' + str(i) if len(parties) > 1 else ''}_{slug(sous if i else titre)}.md"
            (sortie / nom).write_text(entete + corps.strip() + '\n', encoding='utf-8')
            n += 1
    print(f"{n} fichiers → {sortie} (v{version})")


if __name__ == '__main__':
    main()
