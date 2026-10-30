# -*- coding: utf-8 -*-
import csv, json, re, random, collections, difflib, unicodedata
from commun import cle, phon
random.seed(10)
OLD = '/mnt/user-data/attachments/a2f1503b-c6e2-53c6-b424-dcd64d983a11/e6729ee1-corpus_myene_crowdsourcing_10000.csv'
rows = list(csv.DictReader(open(OLD, encoding='utf-8')))
NEW = list(csv.DictReader(open('/home/claude/w/out_corpus_myene_NOUVEAU_30000.csv', encoding='utf-8')))
used = set(cle(r['myeneText']) for r in NEW)
L = json.load(open('/home/claude/w/lecons_pairs.json'))
L += [("Mbolo", "Bonjour", "expression", "03_expressions_conversation/Bonjour.docx"),
      ("Nkolo mbia", "Bonsoir", "expression", "03_expressions_conversation/Bonjour.docx"),
      ("A wéré vôvô ?", "Comment vas-tu ?", "expression", "03_expressions_conversation/Bonjour.docx"),
      ("Intchango ?", "Les nouvelles ?", "expression", "03_expressions_conversation/Bonjour.docx"),
      ("Ngwè yé nkènda sani ?", "Comment va la famille ?", "expression", "03_expressions_conversation/Bonjour.docx"),
      ("Ibanga wé. Ka mènè !", "Au revoir", "expression", "03_expressions_conversation/Bonjour.docx")]
def nfc(s): return unicodedata.normalize('NFC', s).replace('’', "'").replace('‘', "'")
L = [(nfc(a), nfc(b), t, s) for a, b, t, s in L]

# réserve de phrases composées non utilisées (pour remplacer doublons et gabarits répétitifs)
POOL = collections.defaultdict(list)
for fn in ('comp_orungu.json', 'comp_mpongwe.json'):
    for r in json.load(open('/home/claude/w/' + fn)):
        if cle(r['myene']) not in used: POOL[r['theme']].append(r)
for t in POOL: random.shuffle(POOL[t])
VUS = collections.Counter(cle(w) for r in rows for w in r['myeneText'].split())
def tirer(theme):
    for t in [theme] + [k for k in POOL if k != theme]:
        cand = [r for r in POOL.get(t, [])[-60:] if cle(r['myene']) not in used]
        if not cand:
            POOL[t] = [r for r in POOL.get(t, []) if cle(r['myene']) not in used]
            cand = POOL[t][-60:]
        if cand:
            r = min(cand, key=lambda r: sum(VUS[cle(w)] for w in r['myene'].split()) / len(r['myene'].split()))
            POOL[t].remove(r); used.add(cle(r['myene']))
            for w in r['myene'].split(): VUS[cle(w)] += 1
            return r
    return None

COMPTAGE = ("Anèrô wa ranguni", "Azwè zé tanguna")
op = collections.Counter(' '.join(r['myeneText'].split()[:4]) for r in rows)
TOP = set(k for k, _ in op.most_common(100))
GARDE_PAR_GABARIT = 12
vus_gab = collections.Counter()
MARQ = [  # marqueurs dialectaux documentés
    (r"\bpièrè\b", "orungu", "pièrè (ôrungu / nkomi, confirmé par Capp)"),
    (r"\bogouma\b|\bipôrô\b|\bipandô\b", "orungu", "ogouma / ipôrô / ipandô (leçons : forme ôrungu-nkomi)"),
    (r"\bmbuka\b", "nkomi", "mbuka (leçons : forme nkomi)"),
    (r"\boguwa\b|\bayakwè\b|\bbôtôlô\b", "mpongwe", "oguwa / ayakwè / bôtôlô (leçons : forme mpongwè)"),
    (r"\bosaga\b", "galwa", "osaga (leçons : forme galwa)"),
]
seen_txt = set()
st = collections.Counter()
out = []
for r in rows:
    my = r['myeneText'].strip(); fr = r['frenchText'].strip(); th = r['theme']
    mods = []; prov = "Gemini (corpus OMPANGANO 10 000) — corrigé"; page = ""
    notes = r['contextNotes']; api_g = ""
    if 'API:' in notes:
        notes, api_g = notes.split('API:', 1); notes = notes.strip(' |'); api_g = api_g.strip()
    notes = re.sub(r'\[ORU_\d+\s*\|\s*[^\]]*\]\s*', '', notes).strip()
    # 1) caractères non latins
    if any(c.isalpha() and not unicodedata.name(c, '').startswith('LATIN') for c in my):
        my = "Oba wé dyèno myè pièrè ni nago wi bota ilonda."
        mods.append("caractères arabes/devanagari remplacés : « بोटا » = translittération de « bota » (porter des fruits)"); st['non_latin'] += 1
    # 2) mots douteux
    if "gou'" in my:
        my = my.replace("gou' ", "g'").replace("gou'", "g'"); mods.append("« gou' » → « g' » (élision de go devant voyelle, cf. leçons « g'igala »)"); st['gou'] += 1
    if re.search(r"égaraksyi", my):
        my = my.replace("égaraksyi", "frigo"); mods.append("« égaraksyi » (inventé) → « frigo » : emprunt au français, aucun mot myènè dans le corpus — à confirmer"); st['frigo'] += 1
    if re.search(r"[io]ssiompwa", my):
        my = re.sub(r"[io]ssiompwa", "épwé z'atanga", my)
        fr = fr.replace("canapés", "chaises").replace("canapé", "chaise").replace("du salon", "")
        fr = re.sub(r"\s+", " ", fr).replace(" .", ".")
        mods.append("« ossiompwa » (canapé, inventé) → « épwé z'atanga » (chaise, leçons La Nature) ; français ajusté"); st['canape'] += 1
    # 3) élisions documentées : go + voyelle -> g' ; ni + voyelle -> n'
    my2 = re.sub(r"\bgo ([aeiouéèôAEIOUÉÈÔ])", r"g'\1", my)
    my2 = re.sub(r"\bni ([aeiouéèôAEIOUÉÈÔ])", r"n'\1", my2)
    if my2 != my: mods.append("élision go/ni devant voyelle (g', n') selon les leçons"); st['elision'] += 1; my = my2
    # 4) restitution exacte des proverbes / expressions des leçons
    best = None; bs = 0
    for a, b, t, s in L:
        sc = difflib.SequenceMatcher(None, cle(my), cle(a)).ratio()
        if sc > bs: bs, best = sc, (a, b, t, s)
    def sansgh(x): return cle(x).replace('gh', 'g')
    if best and bs >= 0.80 and sansgh(best[0]) != sansgh(my):
        mods.append(f"texte rétabli d'après la source ({best[3]}) ; écart Gemini : « {my} »"); my = best[0].rstrip('. ') + ('' if best[0].endswith(('?', '!')) else '.')
        st['proverbe_retabli'] += 1
    if best and bs >= 0.80:
        prov = "attestée — leçons omyènè"; page = best[3]
        if best[2] == 'proverbe': th = "oralite_proverbes_sagesse"
    # 5) doublons et gabarits répétitifs -> nouvelle phrase
    opening = ' '.join(r['myeneText'].split()[:4])
    remplacer = None
    if cle(my) in seen_txt:
        remplacer = "doublon"
    elif opening in TOP and not r['myeneText'].startswith(COMPTAGE) and r['theme'] != 'numeration_mesures' and prov.startswith("Gemini"):
        vus_gab[opening] += 1
        if vus_gab[opening] > GARDE_PAR_GABARIT: remplacer = "gabarit répétitif"
    if remplacer:
        n = tirer(th)
        if n:
            mods = [f"{remplacer} remplacé par une phrase nouvelle (vocabulaire diversifié) ; ancienne : « {r['myeneText']} » / « {r['frenchText']} »"]
            my, fr, th = n['myene'], n['fr'], n['theme']; prov = n['source']; notes = "Phrase composée, à valider"
            st['remplace_' + remplacer] += 1
    if cle(my) in seen_txt:  # sécurité
        n = tirer(th); my, fr, th = n['myene'], n['fr'], n['theme']; prov = n['source']; mods.append("doublon résiduel remplacé"); st['dup_residuel'] += 1
    seen_txt.add(cle(my)); used.add(cle(my))
    # 6) dialecte : marqueurs documentés, sinon base des leçons (ôrungu)
    dial = None; why = ""
    for rx, d, w in MARQ:
        if re.search(rx, my, re.I): dial, why = d, w; break
    if not dial and "Raponda" in prov:
        dial, why = "mpongwe", "phrase composée avec le lexique de Raponda-Walker (mpongwè)"
    if not dial:
        dial = "orungu"; why = "aucun marqueur dialectal : rattaché à la base des leçons omyènè (ôrungu), à confirmer par le locuteur"
    if dial != r['dialect']: mods.append(f"dialecte {r['dialect']} → {dial} ({why})"); st['dialecte_change'] += 1
    # 7) phonétique
    mods.append("transcription phonétique refaite (segmentale, sans tons)")
    n_words = len(my.split())
    out.append(dict(id=r['id'], frenchText=fr, myeneText=my, theme=th, dialect=dial,
                    difficulty="debutant" if n_words <= 3 else ("intermediaire" if n_words <= 7 else "avance"),
                    contextNotes=notes, imageUrl=r['imageUrl'], transcription_phonetique=phon(my),
                    api_gemini_origine_non_fiable=api_g, provenance=prov, source_page=page,
                    myeneText_gemini_origine=r['myeneText'], frenchText_gemini_origine=r['frenchText'],
                    dialecte_justification=why, modifications=" ; ".join(mods),
                    statut="attestee" if prov.startswith("attestée") else ("composee_a_valider" if "Composée" in prov else "gemini_corrige_a_valider")))
cols = list(out[0].keys())
with open('/home/claude/w/out_corpus_myene_ANCIEN_mis_a_jour.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, cols); w.writeheader(); w.writerows(out)
print(st); print(collections.Counter(r['dialect'] for r in out)); print(collections.Counter(r['statut'] for r in out))
json.dump(dict(st), open('/home/claude/w/stats_old.json', 'w'))
