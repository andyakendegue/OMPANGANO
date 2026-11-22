#!/usr/bin/env python3
"""Règles v3.6 (Capp, 22 nov. 2026, soir) : plus aucun accent grave en myènè et « Orungu » au lieu de « Ôrungu ».
- è → ê ; ề → ê ; ồ → ô ; à, ì, ò, ù → a, i, o, u (dans les mots myènè seulement) ;
- Ôrungu → Orungu, ôrungu → orungu, ÔRUNGU → ORUNGU (partout, y compris en français : c'est un nom propre myènè).
Un mot du dictionnaire français (« très », « à », « où », « première ») ou un nom protégé (myènè, mpongwè, Teisserès…) ne bouge pas.
Utilisable comme module (convertir_texte) ou en ligne de commande sur des fichiers (texte entier) : sans_grave.py fichier…"""
import os, re, sys, unicodedata

ICI = os.path.dirname(os.path.abspath(__file__)); DONDO = os.path.abspath(os.path.join(ICI, "..", "..", ".."))
_FR = None
PROTEGES = {"myènè", "omyènè", "mpongwè", "teisserès", "è", "myè", "nkomè", "galoà", "alè"}
MOT = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-žẀ-ỿ̀-ͯ'‘’-]+")
TABLE = {"è": "ê", "È": "Ê", "à": "a", "À": "A", "ì": "i", "Ì": "I", "ò": "o", "Ò": "O", "ù": "u", "Ù": "U", "ề": "ê", "Ề": "Ê", "ồ": "ô", "Ồ": "Ô"}


def francais():
    global _FR
    if _FR is None:
        _FR = set(unicodedata.normalize("NFC", l.strip().lower()) for l in open(os.path.join(DONDO, "_contexte/listes/mots_francais_gutenberg.txt"), encoding="utf-8"))
    return _FR


def mot_sans_grave(m):
    m = unicodedata.normalize("NFC", m)
    if not any(ch in TABLE for ch in m): return m
    base = m.strip("'‘’-").lower()
    parties = re.split(r"['‘’-]", base)
    if base in PROTEGES or base in francais() or all((p in francais() or p in PROTEGES or not any(ch in TABLE for ch in p)) for p in parties if p):
        return m
    return "".join(TABLE.get(ch, ch) for ch in m)


def convertir_texte(t, myene_seul=False):
    """myene_seul=True : le texte est entièrement myènè (on ne protège pas les mots français homographes, sauf « à » isolé)."""
    if not isinstance(t, str) or not t: return t
    t = unicodedata.normalize("NFC", t)
    t = t.replace("Ôrungu", "Orungu").replace("ôrungu", "orungu").replace("ÔRUNGU", "ORUNGU")
    # Transcriptions entre crochets ou barres obliques ([àwáná], /nyà/) : l'accent grave y note le ton bas, on n'y touche pas.
    morceaux = re.split(r"(\[[^\]]*\]|/[^/\s][^/]*/)", t)
    if len(morceaux) > 1:
        return "".join(m if i % 2 else convertir_texte(m, myene_seul) for i, m in enumerate(morceaux))
    if myene_seul:
        return MOT.sub(lambda x: x.group(0) if x.group(0) in ("à", "À") or x.group(0).lower() in PROTEGES else "".join(TABLE.get(ch, ch) for ch in x.group(0)), t)
    return MOT.sub(lambda x: mot_sans_grave(x.group(0)), t)


if __name__ == "__main__":
    for f in sys.argv[1:]:
        s = open(f, encoding="utf-8").read(); n = convertir_texte(s)
        if n != s: open(f, "w", encoding="utf-8").write(n); print("modifié :", f)
