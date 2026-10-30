# -*- coding: utf-8 -*-
"""Extraction du galwa — Teisserès & Dubois 1957, Méthode pratique pour apprendre l'omyene (projet DONDO,
claude/Teisseres_Dubois_1957_Methode_pratique_omyene.md). Produit galwa_attestees.json et galwa_lexique.json."""
import re, json, collections, sys
SRC = sys.argv[1]
T = open(SRC, encoding='utf-8').read().split('\n')
page = None; lecon = ""; vocab_titre = ""
ex = []; lex = []; versions = {}; themes = {}
mode = None; num = None
def clean_fr(s):
    s = re.sub(r"\(litt\.[^)]*\)", "", s)
    s = re.sub(r"\[[^\]]*\]|\*\[[^\]]*\]\*", "", s)
    s = re.sub(r"\s+", " ", s).strip(" ,;:—–-.")
    return s
def clean_my(s):
    s = re.sub(r"\[[^\]]*\]", "", s).replace("*", "")
    return re.sub(r"\s+", " ", s).strip(" ,;:—–-.")
for i, l in enumerate(T):
    m = re.search(r"<!-- PDF p\. \d+ = p\. (\d+)", l)
    if m: page = int(m.group(1))
    if l.startswith("## "): lecon = l[3:].strip(); mode = None
    if l.startswith("### VOCABULAIRE"): vocab_titre = l[4:].strip()
    m = re.match(r"#### (VERSION|THÈME) (\d+)", l)
    if m: mode, num = m.group(1), int(m.group(2)); continue
    if l.startswith("#"): mode = None if not l.startswith("####") else mode
    if mode and l.strip() and not l.startswith(("<!--", "---")):
        (versions if mode == "VERSION" else themes).setdefault(num, []).append((l.strip(), page))
        continue
    # tableaux : cellules italiques (galwa) suivies de cellules en clair (français)
    if l.startswith("|") and "*" in l and "---" not in l:
        cells = [c.strip() for c in l.strip().strip("|").split("|")]
        acc = []
        for c in cells:
            if not c: continue
            if re.fullmatch(r"(?:\*[^*]+\*[\s,]*(?:ou|,)?\s*)+(?:\([^)]*\))?", c) or re.fullmatch(r"\*[^*]+\*.*", c) and not re.search(r"[a-zé]{3,}\s+[a-zé]{3,}", re.sub(r"\*[^*]+\*", "", c)):
                acc.append(re.split(r"\s+ou\s+|,", re.sub(r"\(.*?\)", "", c))[0])
            else:
                if acc:
                    my = clean_my(" ".join(acc)); fr = clean_fr(re.split(r"\(", c)[0] if not c.startswith("(") else c)
                    if my and fr and not fr.startswith(("pl.", "Pluriel")):
                        (lex if vocab_titre and lecon.startswith(tuple("PDTQCSHNOVQ")) and len(my.split()) <= 3 and "VOCABULAIRE" in vocab_titre else ex).append(
                            dict(my=my, fr=fr, page=page, lecon=lecon, vocab=vocab_titre))
                    acc = []
        continue
    if l.startswith("### ") and not l.startswith("### VOCABULAIRE"): vocab_titre = ""
    # exemples en ligne : *galwa*, français  /  *galwa* — français
    for m in re.finditer(r"\*([^*]{2,120})\*\s*(?:,|—|–|:)\s*([^*\n]{2,160}?)(?=\s*(?:\*|Ex\.|$))", l):
        my, fr = clean_my(m.group(1)), clean_fr(m.group(2))
        if my and fr and re.search(r"[a-zà-ü]", fr):
            ex.append(dict(my=my, fr=fr, page=page, lecon=lecon, vocab=""))
# versions / thèmes alignés phrase à phrase
def phrases(lines, it):
    t = " ".join(x[0] for x in lines).replace("*", "")
    t = re.sub(r"<!--.*?-->", " ", t); t = re.sub(r"\([^)]*\)", "", t)
    ps = [p.strip() for p in re.split(r"(?<=[.!?])\s+", t) if p.strip()]
    return ps, lines[0][1]
aligned = []; skipped = []
for n in sorted(versions):
    if n not in themes: continue
    v, pv = phrases(versions[n], True); th, pt = phrases(themes[n], False)
    if len(v) == len(th):
        for a, b in zip(v, th):
            a = re.split(r"\s+ou\s+", a)[0].rstrip(" .") + "."
            b = re.split(r"\s+ou\s+", b)[0].rstrip(" .") + "."
            if not b.endswith((".", "?", "!")): b += "."
            aligned.append(dict(my=a, fr=b, page=pv, lecon=f"Version/Thème {n}", vocab=""))
    else:
        skipped.append((n, len(v), len(th)))
# leçon 32 : différences galoa / mpôngwè
diff = []
inside = False
for l in T:
    if l.startswith("## TRENTE-DEUXIÈME"): inside = True; continue
    if inside and l.startswith("## "): break
    if inside and l.startswith("|") and l.count("*") >= 4:
        cells = [c.strip() for c in l.strip().strip("|").split("|")]
        it = [clean_my(c) for c in cells if c.startswith("*")]
        fr = [clean_fr(c) for c in cells if c and not c.startswith("*")]
        if len(it) >= 2: diff.append(dict(galwa=it[0], mpongwe=it[1], fr=fr[0] if fr else ""))
print("exemples", len(ex), "lexique", len(lex), "versions alignées", len(aligned), "non alignées", skipped, "diff32", len(diff))
json.dump(dict(ex=ex, lex=lex, aligned=aligned, diff=diff), open("/home/claude/w/galwa_extrait.json", "w"), ensure_ascii=False, indent=0)
