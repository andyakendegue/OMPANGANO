#!/usr/bin/env python3
"""
Construit le lexique de référence que lit Kak'Igonjo (server/api/src/lexiqueMyene.ts) : une entrée par mot attesté,
en graphie v3 (règles de référence v3.3, 22 nov. 2026), avec son sens, sa variante et les formes rejetées par Capp.
Chaque forme est d'abord normalisée comme avant (corrections propres à chaque source), puis passée en graphie v3
(lettres, formes de Rékanga et décisions de Capp, mw → nghw validés) par les fonctions de convertir_cursus_v3.py.

Le fichier produit dérive d'ouvrages protégés : il ne va JAMAIS dans le dépôt (public). Il se copie sur le serveur
dans le dossier du corpus, sous un nom caché que l'indexeur ignore :
    /opt/embeddings/.nkala/lexique_myene.json   (vu par l'API : /data/embeddings/.nkala/lexique_myene.json)

Usage :
    python3 server/scripts/construire_lexique_myene.py <racine DONDO> <sortie.json>
    ex. python3 server/scripts/construire_lexique_myene.py ~/Projets/DONDO /tmp/lexique_myene.json

Entrées lues (racine DONDO) :
    _contexte/audit_lexique/lexique_consolide.csv   (Raponda-Walker 1995, Teisserès-Dubois 1957, leçons omyènè, Capp)
    _contexte/audit_lexique/6_validations_capp.csv  (formes validées par Capp)
    _contexte/audit_lexique/2_formes_rejetees.csv   (formes refusées par Capp)
    _contexte/controle_regles_myene.py              (normalisation v2.0)
Le vocabulaire des cours d'Onenji (packages/noyau/contenu/exercices.json) est lu directement par l'API.
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

if len(sys.argv) != 3:
    sys.exit(__doc__)
racine = Path(sys.argv[1]).expanduser()
sortie = Path(sys.argv[2]).expanduser()
sys.path.insert(0, str(racine / '_contexte'))
from controle_regles_myene import normaliser, empreinte  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
from convertir_cursus_v3 import lettres_seules, NGHW_VALIDES, LEXIQUE_CAPP, v3  # noqa: E402


def en_v3(forme):
    """Graphie v2 → v3, mot par mot (crochets non concernés : le lexique n'en contient pas)."""
    def mot(m):
        t = m.group(0); low = t.lower()
        r = NGHW_VALIDES.get(low) or (LEXIQUE_CAPP.get(low) if low not in ('né', 'ne', 'mye') else None)
        if r is None:
            r = v3.Convertisseur.lexique(lettres_seules(t))
        return r[0].upper() + r[1:] if t[:1].isupper() and r else r
    return nfc(re.sub(r"[^\W\d_](?:[^\W\d_]|[\u0300-\u036f])*", mot, nfc(forme)))

AUDIT = racine / '_contexte' / 'audit_lexique'
# Variante et rang (plus petit = plus sûr) ; aucun nom d'auteur ne sort vers l'apprenant : l'API ne transmet que la variante.
SOURCES = {
    'CAPP':   ('orungu (validé)', 0, 'lecons'),
    'LECONS': ('orungu', 1, 'lecons'),
    'TD1957': ('galwa', 3, 'td'),
    'RW1995': ('mpongwè', 4, 'rw'),
}


def nfc(s):
    return unicodedata.normalize('NFC', s or '')


def propre(s, n=220):
    s = nfc(s).replace('­', '').replace('­ ', '')
    s = re.sub(r'\s+', ' ', s).strip(' ,;')
    return s if len(s) <= n else s[:n].rsplit(' ', 1)[0] + '…'


def norm_forme(forme, src):
    forme = propre(forme, 120)
    # erreurs d'OCR connues de Raponda-Walker : « rn » pour « m » (Abarnbo = Abambo)
    if src == 'rw':
        forme = re.sub(r'(?<=[aeiouáàéèíóú])rn(?=[aeiouáàéèíóúb])', 'm', forme)
    try:
        f, _ = normaliser(forme, src)
    except Exception:
        f = forme
    return en_v3(f)


entrees, vus = [], set()
with open(AUDIT / 'lexique_consolide.csv', encoding='utf-8') as fh:
    for r in csv.DictReader(fh):
        if r['source'] not in SOURCES:
            continue
        variante, rang, src = SOURCES[r['source']]
        forme, sens = norm_forme(r['forme'], src), propre(r['sens'])
        if not forme or not sens or len(forme) > 120:
            continue
        cle = (forme.lower(), sens.lower()[:60])
        if cle in vus:
            continue
        vus.add(cle)
        e = {'f': forme, 's': sens, 'v': variante, 'r': rang}
        info = propre(r.get('info', ''), 40)
        if info:
            e['i'] = info
        if forme != propre(r['forme'], 120):
            e['o'] = propre(r['forme'], 120)  # forme imprimée (contrôle interne)
        entrees.append(e)

with open(AUDIT / '6_validations_capp.csv', encoding='utf-8') as fh:
    for r in csv.DictReader(fh):
        f, s = en_v3(propre(r['forme_validee'], 120)), propre(r['sens_valide'])
        if f and s and (f.lower(), s.lower()[:60]) not in vus:
            entrees.append({'f': f, 's': s, 'v': 'orungu (validé)', 'r': 0})

# Formes refusées par Capp : seules les lignes de mots (pas les phrases relevées par expression régulière).
rejets = []
with open(AUDIT / '2_formes_rejetees.csv', encoding='utf-8') as fh:
    for r in csv.DictReader(fh):
        if '\\b' in r['regle'] or ' ' in r['forme'].strip():
            continue
        rejets.append({'f': en_v3(propre(r['forme'], 60)), 's': propre(r['sens'], 80), 'regle': propre(r['regle'], 160)})


def mots_fr(t):
    return {m for m in re.findall(r'\w{4,}', unicodedata.normalize('NFD', t.lower())) if m.isalpha()}


# Retirer du lexique toute entrée qui reprend une forme refusée avec le sens refusé (ex. Nyaré = viande).
avant = len(entrees)
entrees = [e for e in entrees
           if not any(e['f'].lower() == j['f'].lower() and mots_fr(e['s']) & mots_fr(j['s']) for j in rejets)]
print(f"{avant - len(entrees)} entrée(s) refusée(s) retirée(s)")

entrees.sort(key=lambda e: (e['r'], e['f'].lower()))
donnees = {
    'version': 1,
    'regles': f"DONDO v3.3 (22 nov. 2026 ; normalisation source {empreinte()[:16]})",
    'nombre': len(entrees),
    'entrees': entrees,
    'rejets': rejets,
}
sortie.parent.mkdir(parents=True, exist_ok=True)
sortie.write_text(json.dumps(donnees, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
par_v = {}
for e in entrees:
    par_v[e['v']] = par_v.get(e['v'], 0) + 1
print(f"{len(entrees)} entrées, {len(rejets)} rejets → {sortie} ({sortie.stat().st_size // 1024} Ko) ; {par_v}")
