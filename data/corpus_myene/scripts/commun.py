# -*- coding: utf-8 -*-
import re, unicodedata

VOY = "aeiouéèêôoâàîïûù"

def cle(s):
    """Clé de déduplication : minuscules, sans accents ni ponctuation."""
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z]", "", s)

def elide(a, b):
    """Élision documentée dans les leçons : voyelle finale de a tombe devant voyelle initiale de b (go iga -> g'iga)."""
    if b.lower() in ("é", "e", "a", "o"):
        return a + " " + b
    if a and b and a[-1].lower() in VOY and b[0].lower() in VOY and a.lower() not in ("myè", "wè", "yè", "zwè", "nwè", "é", "a", "o", "e", "mi"):
        return a[:-1] + "'" + b
    return a + " " + b

def joindre(mots):
    out = mots[0]
    for m in mots[1:]:
        # n'élider que sur le dernier mot de out
        tete, _, der = out.rpartition(" ")
        j = elide(der, m)
        out = (tete + " " + j) if tete else j
    return out

# ---------- transcription phonétique segmentale (sans tons) ----------
# Règles : « Comment écrire l'Omyènè » (leçons, 02_grammaire_conjugaison) — 1 caractère = 1 son.
G2P = [
    ("ntch", "ⁿtʃ"), ("ntc", "ⁿtʃ"), ("nts", "ⁿts"), ("tch", "tʃ"), ("tc", "tʃ"), ("ts", "ts"),
    ("ndj", "ⁿdʒ"), ("ndy", "ⁿdʲ"), ("nty", "ⁿtʲ"), ("dj", "dʒ"), ("dy", "dʲ"), ("ny", "ɲ"), ("gn", "ɲ"),
    ("mb", "ᵐb"), ("mp", "ᵐp"), ("mf", "ᶬf"), ("mv", "ᶬv"), ("nd", "ⁿd"), ("nt", "ⁿt"), ("nz", "ⁿz"),
    ("ngw", "ᵑɡʷ"), ("nkw", "ᵑkʷ"), ("ng", "ᵑɡ"), ("nk", "ᵑk"), ("gh", "ɣ"), ("gw", "ɣʷ"), ("kw", "kʷ"), ("bw", "bʷ"), ("mw", "mʷ"), ("pw", "pʷ"),
    ("sh", "ʃ"), ("ou", "u"),
    ("é", "e"), ("è", "ɛ"), ("ê", "ɛ"), ("ô", "ɔ"), ("û", "u"), ("â", "a"), ("î", "i"), ("ï", "i"),
    ("g", "ɣ"), ("r", "ɾ"), ("y", "j"), ("c", "k"),
]

def phon(texte):
    s = texte.lower()
    s = re.sub(r"[«»\"“”]", "", s)
    s = s.replace("'", "‿")
    s = re.sub(r"\s*[,;:—–-]\s*", " | ", s)
    s = re.sub(r"\s*[.!?…]+\s*", " ‖ ", s)
    out = []
    i = 0
    while i < len(s):
        for a, b in G2P:
            if s.startswith(a, i):
                out.append(b); i += len(a); break
        else:
            out.append(s[i]); i += 1
    r = re.sub(r"\s+", " ", "".join(out)).strip(" |‖")
    return "/" + r + "/"
