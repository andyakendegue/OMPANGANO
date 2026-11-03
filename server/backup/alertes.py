#!/usr/bin/env python3
"""Alertes par e-mail pour OMPANGANO (à lancer toutes les 5 minutes par cron, voir README).
Surveille et prévient par e-mail :
  * l'API : panne (2 contrôles ratés d'affilée) et rétablissement, conteneurs arrêtés ou en mauvaise santé ;
  * les erreurs du serveur (5xx, exceptions) et des navigateurs (table app_errors), regroupées par empreinte ;
  * l'espace disque (> 85 %), les sauvegardes trop anciennes (> 36 h).
Config : /opt/ompangano/secrets/smtp.env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO), comme mail-backup.py.
État : /var/lib/ompangano-alertes.json. Au plus 6 e-mails par heure ; ce qui n'a pas pu partir est envoyé au passage suivant.
Options : --dry-run (affiche au lieu d'envoyer, n'enregistre rien), --test (envoie un e-mail d'essai).
"""
import glob, json, os, shutil, smtplib, ssl, subprocess, sys, time, urllib.request
from collections import OrderedDict
from email.message import EmailMessage

ETAT = os.environ.get('ALERTES_ETAT', '/var/lib/ompangano-alertes.json')
SMTP_ENV = os.environ.get('ALERTES_SMTP', '/opt/ompangano/secrets/smtp.env')
SAUVEGARDES = '/opt/ompangano/backups'
HEALTH = 'https://api-ompangano.essaka.engineering/health'
MAX_MAILS_PAR_HEURE = 6
CONTENEURS = ['ompangano-api-1', 'ompangano-postgres-1', 'ompangano-garage-1']
DRY = '--dry-run' in sys.argv


def sh(cmd, timeout=30):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)


def charger_etat():
    try:
        return json.load(open(ETAT, encoding='utf-8'))
    except Exception:
        return {}


def enregistrer_etat(etat):
    if DRY:
        return
    tmp = ETAT + '.tmp'
    json.dump(etat, open(tmp, 'w', encoding='utf-8'))
    os.replace(tmp, ETAT)


def config_smtp():
    cfg = {}
    for ligne in open(SMTP_ENV, encoding='utf-8'):
        ligne = ligne.strip()
        if ligne and not ligne.startswith('#') and '=' in ligne:
            k, v = ligne.split('=', 1)
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg


def envoyer(sujet, texte):
    if DRY:
        print(f'--- E-MAIL (essai à blanc) ---\nSujet : {sujet}\n{texte}\n')
        return True
    cfg = config_smtp()
    msg = EmailMessage()
    msg['From'] = cfg.get('MAIL_FROM') or cfg['SMTP_USER']
    msg['To'] = cfg['MAIL_TO']
    msg['Subject'] = sujet
    msg.set_content(texte)
    port = int(cfg.get('SMTP_PORT', '587'))
    ctx = ssl.create_default_context()
    if port == 465:
        s = smtplib.SMTP_SSL(cfg['SMTP_HOST'], port, context=ctx, timeout=60)
    else:
        s = smtplib.SMTP(cfg['SMTP_HOST'], port, timeout=60)
        s.starttls(context=ctx)
    with s:
        s.login(cfg['SMTP_USER'], cfg['SMTP_PASS'])
        s.send_message(msg)
    return True


def peut_envoyer(etat):
    maintenant = time.time()
    etat['envois'] = [t for t in etat.get('envois', []) if maintenant - t < 3600]
    return len(etat['envois']) < MAX_MAILS_PAR_HEURE


def noter_envoi(etat):
    etat.setdefault('envois', []).append(time.time())


def grouper(lignes):
    """lignes : tuples (id, at, source, fingerprint, message, stack, url, user_id, ip, ctx) -> groupes triés par fréquence"""
    groupes = OrderedDict()
    for (i, at, source, fp, message, stack, url, user_id, ip, ctx) in lignes:
        g = groupes.setdefault(fp, {'n': 0, 'source': source, 'message': message, 'stack': stack, 'url': url,
                                    'premier': at, 'dernier': at, 'utilisateurs': set(), 'ctx': ctx})
        g['n'] += 1
        g['dernier'] = at
        if user_id:
            g['utilisateurs'].add(user_id)
    return sorted(groupes.values(), key=lambda g: -g['n'])


def texte_erreurs(groupes, total):
    out = [f'{total} erreur(s) en {len(groupes)} cas distinct(s) depuis le dernier contrôle.\n']
    for g in groupes[:15]:
        out.append(f"[{g['source']}] {g['n']}× — {g['message']}")
        out.append(f"   vu de {g['premier']} à {g['dernier']}, {len(g['utilisateurs'])} compte(s) concerné(s)")
        if g['url']:
            out.append(f"   où : {g['url']}")
        if g['ctx'] and g['ctx'] != '{}':
            out.append(f"   contexte : {g['ctx']}")
        if g['stack']:
            out.append('   ' + '\n   '.join(g['stack'].splitlines()[:4]))
        out.append('')
    if len(groupes) > 15:
        out.append(f'… et {len(groupes) - 15} autre(s) cas (voir la table app_errors).')
    return '\n'.join(out)


def lire_erreurs(depuis_id):
    sep = '\x1f'
    sql = ("select id, to_char(at at time zone 'utc','YYYY-MM-DD HH24:MI:SS'), source, fingerprint, replace(message, E'\\n', ' '), "
           "replace(coalesce(stack,''), E'\\n', E'\\x1e'), coalesce(url,''), coalesce(user_id,''), coalesce(ip,''), ctx::text "
           f"from app_errors where id > {int(depuis_id)} order by id limit 2000")
    r = sh(f"docker exec ompangano-postgres-1 psql -U ompangano -d ompangano -At -F '{sep}' -c \"{sql}\"", 60)
    if r.returncode != 0:
        raise RuntimeError('lecture de app_errors impossible : ' + r.stderr.strip()[:200])
    lignes = []
    for brut in r.stdout.splitlines():
        p = brut.split(sep)
        if len(p) >= 10:
            lignes.append((int(p[0]), p[1], p[2], p[3], p[4], p[5].replace('\x1e', '\n'), p[6], p[7], p[8], p[9]))
    return lignes


def dernier_id():
    r = sh("docker exec ompangano-postgres-1 psql -U ompangano -d ompangano -At -c \"select coalesce(max(id),0) from app_errors\"")
    return int(r.stdout.strip() or 0) if r.returncode == 0 else None


def sante_api():
    """Retourne (ok, detail)"""
    problemes = []
    try:
        with urllib.request.urlopen(HEALTH, timeout=15) as rep:
            if rep.status != 200:
                problemes.append(f'/health a répondu {rep.status}')
    except Exception as e:
        problemes.append(f'/health injoignable : {e}')
    for c in CONTENEURS:
        r = sh("docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' " + c)
        etat = r.stdout.strip()
        if r.returncode != 0 or not etat.startswith('running') or 'unhealthy' in etat:
            problemes.append(f'conteneur {c} : {etat or r.stderr.strip()[:80]}')
    return (not problemes), '\n'.join(problemes)


def anomalies_systeme(etat):
    """Disque et sauvegardes : une alerte par jour et par type tant que le problème dure"""
    out = []
    jour = time.strftime('%Y-%m-%d')
    u = shutil.disk_usage('/')
    pct = round(100 * u.used / u.total)
    if pct >= 85 and etat.get('disque_alerte') != jour:
        out.append(('disque_alerte', f'Disque du VPS rempli à {pct} % ({u.free // 2**30} Go libres).'))
    dumps = sorted(glob.glob(os.path.join(SAUVEGARDES, 'db', '*.dump.enc')))
    if dumps:
        age_h = (time.time() - os.path.getmtime(dumps[-1])) / 3600
        if age_h > 36 and etat.get('sauvegarde_alerte') != jour:
            out.append(('sauvegarde_alerte', f'La dernière sauvegarde de la base date de {round(age_h)} h ({os.path.basename(dumps[-1])}).'))
    return out


def main():
    if '--test' in sys.argv:
        envoyer('OMPANGANO — e-mail d\'essai des alertes', 'Si vous lisez ce message, les alertes par e-mail fonctionnent.')
        print('E-mail d\'essai envoyé.')
        return
    etat = charger_etat()
    premier = 'dernier_id' not in etat
    # 1. Santé de l'API
    ok, detail = sante_api()
    if ok:
        etat['echecs'] = 0
        if etat.get('en_panne'):
            if peut_envoyer(etat):
                envoyer('OMPANGANO — API rétablie', f"L'API répond de nouveau (panne commencée vers {etat.get('panne_depuis', '?')}).")
                noter_envoi(etat); etat['en_panne'] = False
    else:
        etat['echecs'] = etat.get('echecs', 0) + 1
        if etat['echecs'] >= 2 and not etat.get('en_panne') and peut_envoyer(etat):
            envoyer('OMPANGANO — PANNE de l\'API', 'Contrôle raté deux fois de suite :\n' + detail)
            noter_envoi(etat); etat['en_panne'] = True; etat['panne_depuis'] = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
    # 2. Erreurs serveur et navigateurs
    try:
        if premier:
            etat['dernier_id'] = dernier_id() or 0  # première exécution : on ne renvoie pas l'historique
        else:
            lignes = lire_erreurs(etat['dernier_id'])
            if lignes and peut_envoyer(etat):
                groupes = grouper(lignes)
                tete = groupes[0]['message'][:70]
                envoyer(f'OMPANGANO — {len(lignes)} erreur(s) : {tete}', texte_erreurs(groupes, len(lignes)))
                noter_envoi(etat)
                etat['dernier_id'] = lignes[-1][0]
    except Exception as e:
        print('erreurs :', e, file=sys.stderr)
    # 3. Disque et sauvegardes
    for cle, texte in anomalies_systeme(etat):
        if peut_envoyer(etat):
            envoyer('OMPANGANO — anomalie système', texte)
            noter_envoi(etat); etat[cle] = time.strftime('%Y-%m-%d')
    enregistrer_etat(etat)


if __name__ == '__main__':
    main()
