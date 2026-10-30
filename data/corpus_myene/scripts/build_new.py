# -*- coding: utf-8 -*-
import json, csv, re, random, collections
from commun import cle, phon
exec(open('/home/claude/w/modern.py').read())
random.seed(30)
OLD = '/mnt/user-data/attachments/a2f1503b-c6e2-53c6-b424-dcd64d983a11/e6729ee1-corpus_myene_crowdsourcing_10000.csv'
old = list(csv.DictReader(open(OLD, encoding='utf-8')))
IMG = {}
for r in old: IMG.setdefault(r['theme'], r['imageUrl'])
IMG_NEW = {"habillement_parure": "artisanat_outils", "maison_habitat": "vie_quotidienne_famille",
           "nature_plantes_pharmacopee": "chasse_faune_nature", "deplacements_lieux": "commerce_echanges_voyages",
           "expressions_quotidiennes": "oralite_proverbes_sagesse", "education_enseignement": "grammaire_contraste_tonal",
           "droit_famille_mariage": "clans_histoire_rites", "emotions_amour": "vie_quotidienne_famille",
           "sante_hygiene_soins": "sante_corps_spiritualite", "lexique_variantes_dialectales": "grammaire_contraste_tonal"}
def img(t): return IMG.get(t) or IMG[IMG_NEW.get(t, "vie_quotidienne_famille")]

# --- classement thématique des phrases attestées (par mots-clés du français) ---
TH = [
 ("peche_navigation", r"pêch|poisson|pirogue|pagay|canot|hameçon|filet|nasse|navig|voile|rame|marée|mer\b|rivière|lagune|bateau|ancre|débarcadère|naufrag|sardine|crabe"),
 ("chasse_faune_nature", r"chass|gibier|piège|antilope|singe|éléphant|serpent|oiseau|léopard|panthère|gorille|sanglier|chien|animal|bête|fourmi|abeille|mouche|rat\b|perroquet|poule|chèvre|cabri"),
 ("cuisine_agriculture", r"mang|repas|cuire|cuis|marmite|banane|manioc|igname|plantation|planter|récolt|sauce|viande|sel\b|huile|fruit|arachide|maïs|pain|faim|nourrit|boire|vin\b|eau\b|bouillir"),
 ("commerce_echanges_voyages", r"achet|vend|marchand|commerç|payer|pay|argent|franc|dette|prix|cher\b|échange|voyag|traitant|factorerie|magasin"),
 ("artisanat_outils", r"couteau|hache|tress|natte|panier|corbeille|tambour|sculpt|forger|outil|scie|planche|clou|corde|fil\b|coudre|tisser|construire|bâtir|case\b|toit"),
 ("habillement_parure", r"habit|vêtement|pagne|chapeau|chemise|robe|collier|bracelet|perle|parure|soulier|habill|ceinture|bonnet"),
 ("maison_habitat", r"maison|case|porte|lit\b|chaise|banc|table|cour\b|natte|lampe|chambre|toit|mur\b|balai|armoire|malle"),
 ("sante_hygiene_soins", r"malad|fièvre|douleur|blessure|plaie|remède|guéri|médec|soign|se laver|baigner|propre|sale|vomi|tousser|ulcère|mal\b"),
 ("sante_corps_spiritualite", r"tête|œil|yeux|main|pied|bras|jambe|ventre|dent|bouche|cœur|corps|sang|esprit|génie|fétiche|sorci|dieu|prière|prier|âme|mort\b|mourir|défunt|ancêtre"),
 ("droit_famille_mariage", r"mari\b|mariage|épous|femme\b|dot\b|fiancé|héritage|hériter|adultère|palabre|juge|procès|témoin|veuv|divorc|famille|parent|clan|lignée"),
 ("vie_quotidienne_famille", r"enfant|mère|père|frère|sœur|oncle|tante|ami|village|voisin|dormir|réveill|matin|soir|travail|travailler"),
 ("education_enseignement", r"école|apprendre|enseign|lire|écrire|livre|lettre|maître|élève|leçon|savoir|comprendre|parole|parler|langue|dire\b|mot\b"),
 ("emotions_amour", r"aim|amour|joie|content|triste|pleur|colère|fâch|peur|honte|jaloux|jalousie|rire|heureux|malheur|pitié|orgueil"),
 ("temps_climat_environnement", r"pluie|soleil|lune|vent|orage|saison|ciel|nuage|jour\b|nuit|temps|froid|chaud|chaleur|tonnerre|foudre"),
 ("clans_histoire_rites", r"chef|roi|esclave|guerre|tribu|ancien|rite|cérémon|danse|fête|deuil|initi|coutume|tradition"),
 ("numeration_mesures", r"\bdeux\b|\btrois\b|\bquatre\b|\bcinq\b|\bdix\b|\bcent\b|mesur|compter|nombre|moitié"),
]
def theme_fr(fr):
    f = fr.lower()
    for t, rx in TH:
        if re.search(rx, f): return t
    return "expressions_quotidiennes"
def diff(my):
    n = len(my.split())
    return "debutant" if n <= 3 else ("intermediaire" if n <= 7 else "avance")

out = []; seen = set(cle(r['myeneText']) for r in old)  # éviter tout doublon avec l'ancien fichier
stats = collections.Counter()
from wordfreq import zipf_frequency as ZF
def add(my, fr, th, dial, prov, page, statut, note, source_txt=""):
    my = re.sub(r"\s+'", "'", my); my = re.sub(r"\b(\w+) \1\b", r"\1", my); my = re.sub(r"\s+([,.;:?!])", r"\1", my)
    fr = re.sub(r"\.{2,}", ".", fr).replace('"', '').replace(' .', '.'); fr = re.sub(r"\s+", " ", fr).strip()
    my = re.sub(r"([.!?])\s*[.!?]+$", r"\1", my); fr = re.sub(r"([.!?])\s*[.!?]+$", r"\1", fr)
    if statut.startswith("attestee"):
        lw = [w for w in re.findall(r"[^\W\d_]+", my.lower()) if len(w) >= 5]
        if "ç" in my or any(ZF(w, 'fr') >= 3.3 for w in lw): stats['rejet_francais_dans_myene'] += 1; return
    k = cle(my)
    if not k or k in seen: stats['doublon_evite'] += 1; return
    seen.add(k)
    out.append(dict(frenchText=fr, myeneText=my, theme=th, dialect=dial, difficulty=diff(my),
                    contextNotes=note, imageUrl=img(th), transcription_phonetique=phon(my),
                    provenance=prov, source_page=page, myeneText_source=source_txt, statut=statut))

# 1) phrases attestées de Raponda-Walker
RW = json.load(open('/home/claude/w/raponda_clean.json'))
for r in RW:
    my = r['myene'].strip()
    if not my.endswith(('.', '?', '!')): my += '.'
    st = "attestee_a_resegmenter" if r['seg_flag'] else "attestee"
    add(my, r['fr'], theme_fr(r['fr']), "mpongwe", "attestée — Raponda-Walker 1995, Dictionnaire mpongwé-français",
        f"p. {r['page']} (s.v. {r['headword']})", st,
        "Exemple du dictionnaire ; orthographe modernisée (ȼ→tch, ṉ→ny, ó→ô, e→é)" + (" ; mots encore collés par l'OCR, à re-segmenter" if r['seg_flag'] else ""),
        r['raponda'])
stats['attestees'] = len(out)

# 2) variantes dialectales attestées (notes « G. / Or. / Nk. / En. / Ad. » de Raponda-Walker)
E = json.load(open('/mnt/user-data/uploads/DONDO/07_donnees/dictionnaire_mpongwe_francais.json'))['entries']
DIAL = {"G": "galwa", "OR": "orungu", "NK": "nkomi", "EN": "enenga", "AD": "adjumba", "AJ": "adjumba", "NR": "orungu"}
nv = 0
for x in E:
    d = x['definition_raw']
    g = re.sub(r'^\s*(?:Cl\.?\s*)?[IVXL]+\s*\.?\s*', '', d)
    g = re.sub(r'^\s*[a-z]{1,4}\.\s*', '', g)
    for m in re.finditer(r'\(([^)]{2,90})\)', d[:220]):
        for part in re.split(r';', m.group(1)):
            mm = re.match(r'\s*(G|Or|OR|Nk|NK|En|Ad|Aj|NR)\s*\.\s*([^,;.()]+)', part)
            if not mm: continue
            form = fix_my(mm.group(2).strip())
            if len(form) < 2 or re.search(r'[0-9]', form) or len(form.split()) > 3: continue
            glo = re.split(r'[.;(]', re.sub(r'^\s*\([^)]*\)\s*\.?\s*', '', g))[0].strip()
            if not glo or len(glo) > 60: continue
            dial = DIAL[mm.group(1).upper()]
            add(modern(form)[0].upper() + modern(form)[1:] + ".", glo[0].upper() + glo[1:] + ".", "lexique_variantes_dialectales", dial,
                "attestée — variante dialectale notée par Raponda-Walker 1995", f"p. {x['page']} (s.v. {x['headword']}, mpongwè)",
                "attestee", f"Mot isolé : forme {dial} de « {modern(fix_my(x['headword']))} » (mpongwè)", form)
            nv += 1
stats['variantes'] = nv

# 2b) galwa attesté — Teisserès & Dubois 1957
GW = json.load(open('/home/claude/w/galwa_extrait.json'))
SRC_G = "attestée — Teisserès & Dubois 1957, Méthode pratique pour apprendre l'omyene (galwa de Ngomo)"
VTH = [("FAMILLE", "vie_quotidienne_famille"), ("VILLAGE", "vie_quotidienne_famille"), ("ÉCOLE", "education_enseignement"),
       ("MAISON", "maison_habitat"), ("CUISINE", "cuisine_agriculture"), ("CHAMBRE", "maison_habitat"), ("CASE", "maison_habitat"),
       ("REPAS", "cuisine_agriculture"), ("ANIMAUX", "chasse_faune_nature"), ("PLANTATION", "cuisine_agriculture"),
       ("TEMPS", "temps_climat_environnement"), ("ARBRES", "nature_plantes_pharmacopee"), ("EAU", "peche_navigation"),
       ("PÊCHE", "peche_navigation"), ("CORPS", "sante_corps_spiritualite"), ("MALADIE", "sante_hygiene_soins"),
       ("VÊTEMENT", "habillement_parure"), ("COMMERCE", "commerce_echanges_voyages"), ("VOYAGE", "commerce_echanges_voyages"),
       ("MARIAGE", "droit_famille_mariage"), ("RELIGION", "sante_corps_spiritualite"), ("TRAVAIL", "artisanat_outils"),
       ("CHASSE", "chasse_faune_nature"), ("PIROGUE", "peche_navigation"), ("NOMBRE", "numeration_mesures")]
def th_g(x):
    for k, t in VTH:
        if k in x.get('vocab', '').upper(): return t
    return theme_fr(x['fr'])
def fr_ok(fr):
    w = re.findall(r"[a-zàâçéèêëîïôûùü]+", fr.lower())
    return len(fr) >= 4 and w and sum(ZF(x, 'fr') >= 2.5 for x in w) / len(w) >= 0.75 and not re.search(r"\b(id|etc|cf|voir leçon|pl|sg|[IVX]{1,4})\b|^\d", fr)
def gnorm(s):  # orthographe 1957 conservée telle quelle
    return re.sub(r"[.!?]+$", "", s.strip())
ng = 0
for x in GW['aligned']:
    if not fr_ok(x['fr']): continue
    my = gnorm(x['my'].replace(",.", ".")) + "."
    add(my[0].upper() + my[1:], x['fr'].replace(",.", "."), theme_fr(x['fr']), "galwa", SRC_G, f"p. {x['page']} ({x['lecon']})", "attestee",
        "Phrase de version, alignée sur le thème français du livre ; orthographe 1957 conservée (ṽ, ñ, e/è)", x['my']); ng += 1
for x in GW['ex']:
    my = x['my'].split(" ou ")[0].strip()
    if len(my) < 3 or not fr_ok(x['fr']) or any(ZF(w, 'fr') >= 3.3 for w in re.findall(r"[^\W\d_]{5,}", my.lower())): continue
    m2 = gnorm(my); f2 = re.sub(r"[.!?]+$", "", x['fr'][0].upper() + x['fr'][1:])
    add(m2[0].upper() + m2[1:] + ".", f2 + ".",
        th_g(x), "galwa", SRC_G, f"p. {x['page']} ({x['lecon'][:60]})", "attestee", "Exemple de grammaire du livre ; orthographe 1957 conservée", my); ng += 1
for x in GW['lex']:
    my = x['my'].split(" ou ")[0].strip()
    if not fr_ok(x['fr']) or len(my) < 2: continue
    m2 = gnorm(my); f2 = x['fr'][0].upper() + x['fr'][1:]
    f2 = re.sub(r"[.!?]+$", "", f2)
    add(m2[0].upper() + m2[1:] + ".", f2 + ".", th_g(x), "galwa", SRC_G, f"p. {x['page']} ({x['vocab'] or x['lecon'][:40]})", "attestee",
        "Mot du vocabulaire thématique (mot isolé)", my); ng += 1
for x in GW['diff']:
    g_, m_ = x['galwa'].strip(), x['mpongwe'].strip()
    if not g_ or not m_ or g_ == m_ or len(g_) < 2 or re.search(r"[A-Z]{3}|Présent|Passé", g_ + m_): continue
    add(gnorm(m_)[0].upper() + gnorm(m_)[1:] + ".", (x['fr'] if fr_ok(x['fr']) else f"Forme mpongwè correspondant au galwa « {g_} »") + ".",
        "lexique_variantes_dialectales", "mpongwe", "attestée — Teisserès & Dubois 1957, leçon 32 (différences galoa / mpôngwè)",
        "p. 87-91 (leçon 32)", "attestee", f"Variante : mpongwè « {m_} » / galwa « {g_} »", m_); ng += 1
stats['galwa_attestees'] = ng

# 3) phrases composées
O = json.load(open('/home/claude/w/comp_orungu.json')); M = json.load(open('/home/claude/w/comp_mpongwe.json'))
GC = json.load(open('/home/claude/w/comp_galwa.json'))
CIBLE = 35000
need = CIBLE - len(out)
random.shuffle(GC)
random.shuffle(O); random.shuffle(M)
take_m = min(len(M), int(need * 0.22))
take_g = int(need * 0.25)
pool = M[:take_m] + GC[:take_g] + O
byth = collections.defaultdict(list)
for r in pool: byth[r['theme']].append(r)
order = []
while any(byth.values()):
    for t in list(byth):
        if byth[t]: order.append(byth[t].pop())
for r in order:
    if len(out) >= CIBLE: break
    add(r['myene'], r['fr'], r['theme'], r['dialecte'], r['source'], "", "composee_a_valider",
        r.get('note') or "Phrase composée : lexique et conjugaison des leçons omyènè (base ôrungu), à faire valider par un locuteur")
stats['total'] = len(out)
for i, r in enumerate(out, 1): r['id'] = f"NEW_{i:05d}"
cols = ["id", "frenchText", "myeneText", "theme", "dialect", "difficulty", "contextNotes", "imageUrl",
        "transcription_phonetique", "provenance", "source_page", "myeneText_source", "statut"]
with open('/home/claude/w/out_corpus_myene_NOUVEAU.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, cols); w.writeheader(); w.writerows(out)
print(stats)
print(collections.Counter(r['statut'] for r in out)); print(collections.Counter(r['dialect'] for r in out))
print(collections.Counter(r['theme'] for r in out).most_common())
