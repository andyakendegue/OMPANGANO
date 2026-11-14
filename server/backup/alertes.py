#!/usr/bin/env python3
"""Alertes par e-mail pour OMPANGANO (à lancer toutes les 5 minutes par cron, voir README).
Surveille et prévient par e-mail :
  * l'API : panne (2 contrôles ratés d'affilée) et rétablissement, conteneurs arrêtés ou en mauvaise santé ;
  * les erreurs du serveur (5xx, exceptions) et des navigateurs (table app_errors), regroupées par empreinte ;
  * l'espace disque (> 85 %), les sauvegardes trop anciennes (> 36 h), la copie hors site absente ou ancienne (> 48 h) ;
  * la sécurité (ISO 27001 A.8.16) : promotion en administrateur, actions d'administration sensibles, rafale de SMS (> 50 / h),
    rafale de refus de connexion, purge des données en retard (> 48 h).
Config : /opt/ompangano/secrets/smtp.env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO), comme mail-backup.py.
État : /var/lib/ompangano-alertes.json. Au plus 6 e-mails par heure ; ce qui n'a pas pu partir est envoyé au passage suivant.
Options : --dry-run (affiche au lieu d'envoyer, n'enregistre rien), --test (envoie un e-mail d'essai).
"""
import glob, json, os, shutil, smtplib, ssl, subprocess, sys, time, urllib.error, urllib.request
from collections import OrderedDict
from email.message import EmailMessage

ETAT = os.environ.get('ALERTES_ETAT', '/var/lib/ompangano-alertes.json')
SMTP_ENV = os.environ.get('ALERTES_SMTP', '/opt/ompangano/secrets/smtp.env')
SAUVEGARDES = '/opt/ompangano/backups'
HEALTH = 'https://api-ompangano.essaka.engineering/health'
MAX_MAILS_PAR_HEURE = 6
CONTENEURS = ['ompangano-api-1', 'ompangano-postgres-1', 'ompangano-garage-1']
# Services ajoutés pour Nkala : surveillés seulement s'ils existent (un conteneur absent n'est pas une panne tant qu'il n'a pas été installé)
CONTENEURS_FACULTATIFS = ['regie-revive-1', 'regie-revive-db-1', 'runpod-embedding-proxy', 'runpod-openai-proxy']
# Adresses internes à contrôler (service : url) ; toute réponse HTTP < 500 prouve que le service tourne
SERVICES_INTERNES = {'proxy embeddings': 'http://172.17.0.1:8001/health', 'Revive': 'http://172.17.0.1:3910/www/admin/install.php'}
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
    for brut in r.stdout.split('\n'):  # pas splitlines() : il coupe aussi sur \x1e, le séparateur des lignes de pile
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
    for c in CONTENEURS_FACULTATIFS:
        r = sh("docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' " + c)
        if r.returncode != 0:
            continue
        etat = r.stdout.strip()
        if not etat.startswith('running') or 'unhealthy' in etat:
            problemes.append(f'conteneur {c} : {etat}')
    for nom, url in SERVICES_INTERNES.items():
        existe = sh("docker inspect -f '{{.Name}}' " + ('runpod-embedding-proxy' if 'proxy' in nom else 'regie-revive-1')).returncode == 0
        if not existe:
            continue
        try:
            with urllib.request.urlopen(url, timeout=10) as rep:
                if rep.status >= 500:
                    problemes.append(f'{nom} a répondu {rep.status}')
        except urllib.error.HTTPError as e:
            if e.code >= 500:
                problemes.append(f'{nom} a répondu {e.code}')
        except Exception as e:
            problemes.append(f'{nom} injoignable : {e}')
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
    hors_site = os.path.join(SAUVEGARDES, 'derniere_copie_hors_site')
    age_hs = (time.time() - os.path.getmtime(hors_site)) / 3600 if os.path.exists(hors_site) else None
    if (age_hs is None or age_hs > 48) and etat.get('hors_site_alerte') != jour:
        out.append(('hors_site_alerte', 'Aucune copie des sauvegardes hors du VPS depuis 48 h (BACKUP_REMOTE non défini ou en échec) : une panne du VPS ferait tout perdre.'))
    return out


def requete(sql, timeout=60):
    """Lignes (listes de champs) d'une requête SQL lancée dans le conteneur Postgres."""
    sep = '\x1f'
    r = sh(f"docker exec ompangano-postgres-1 psql -U ompangano -d ompangano -At -F '{sep}' -c \"{sql}\"", timeout)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:200])
    return [l.split(sep) for l in r.stdout.splitlines() if l]


def evenements_securite(etat):
    """Événements de sécurité depuis le dernier passage. Renvoie (sujet, texte) ou None."""
    lignes = []
    dernier = etat.get('journal_id')
    if dernier is None:
        etat['journal_id'] = int((requete("select coalesce(max(id),0) from journal_admin") or [['0']])[0][0])
        return None
    sensibles = "('utilisateur_modifie','sessions_revoquees','suppression','compte_supprime','droit_accorde','paiement_confirme')"
    for i, par, action, cible, detail, at in requete(
            f"select id, par, action, coalesce(cible,''), detail::text, to_char(at,'YYYY-MM-DD HH24:MI') from journal_admin "
            f"where id > {int(dernier)} and action in {sensibles} order by id limit 200"):
        etat['journal_id'] = max(etat['journal_id'], int(i))
        promo = '"apres": "admin"' in detail or '"apres":"admin"' in detail
        if promo or action in ('sessions_revoquees', 'suppression', 'compte_supprime') or '"statut"' in detail:
            lignes.append(f"{at}  {'PROMOTION ADMIN — ' if promo else ''}{action}  par {par}  sur {cible}")
    sms = int((requete("select count(*) from sms_essais where genre='envoi' and at > now() - interval '1 hour'") or [['0']])[0][0])
    if sms > 100:  # deux lignes par envoi (numéro et IP)
        lignes.append(f"Rafale de SMS : {sms // 2} envois dans la dernière heure (coût Twilio, tentative d'abus ?).")
    refus = int((requete("select count(*) from sms_essais where genre='verif' and not ok and at > now() - interval '1 hour'") or [['0']])[0][0])
    if refus > 50:
        lignes.append(f"{refus} codes SMS faux dans la dernière heure (essais de connexion forcée ?).")
    jour = time.strftime('%Y-%m-%d')
    try:
        age = requete("select extract(epoch from now() - max(at))/3600 from purges")
        if (not age or not age[0][0] or float(age[0][0]) > 48) and etat.get('purge_alerte') != jour:
            lignes.append("La purge des données (durées de conservation) n'a pas tourné depuis plus de 48 h.")
            etat['purge_alerte'] = jour
    except Exception:
        pass  # table « purges » pas encore créée (migration 017 non déployée)
    if not lignes:
        return None
    return ('OMPANGANO — sécurité : ' + lignes[0][:60], "Événements de sécurité :\n\n" + "\n".join(lignes))


def main():
    if '--message' in sys.argv:
        # Message ponctuel (utilisé par le script de déploiement) : --message "Sujet" "Texte"
        i = sys.argv.index('--message')
        envoyer(sys.argv[i + 1], sys.argv[i + 2] if len(sys.argv) > i + 2 else '')
        print('Message envoyé.')
        return
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
    # 3. Sécurité
    try:
        ev = evenements_securite(etat)
        if ev and peut_envoyer(etat):
            envoyer(*ev); noter_envoi(etat)
    except Exception as e:
        print('sécurité :', e, file=sys.stderr)
    # 4. Disque et sauvegardes
    for cle, texte in anomalies_systeme(etat):
        if peut_envoyer(etat):
            envoyer('OMPANGANO — anomalie système', texte)
            noter_envoi(etat); etat[cle] = time.strftime('%Y-%m-%d')
    enregistrer_etat(etat)


if __name__ == '__main__':
    main()
