#!/usr/bin/env python3
"""Courriels aux utilisateurs de Nkala, envoyés depuis noreply@ (à lancer toutes les 10 minutes par cron).
  * bienvenue  : une fois, aux comptes créés depuis moins de 7 jours (objectifs du projet + guide pratique) ;
  * filiation  : aux comptes dont la filiation (clan paternel, clan maternel, village d'origine) n'est pas renseignée ;
                 au plus 3 rappels, espacés de 7 jours. « Je ne sais pas » compte comme une réponse.
Config : /opt/ompangano/secrets/noreply.env (chmod 600) : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
         (MAIL_FROM = « Nkala <noreply@essaka.engineering> »). Sans ce fichier, rien n'est envoyé.
Options : --dry-run (affiche sans envoyer ni enregistrer), --apercu bienvenue|filiation (affiche un exemple),
          --test adresse (envoie les deux modèles à cette adresse, sans rien enregistrer).
"""
import os, smtplib, ssl, subprocess, sys, time
from email.message import EmailMessage
from html import escape

CONFIG = os.environ.get('COURRIELS_SMTP', '/opt/ompangano/secrets/noreply.env')
SITE = 'https://ompangano.web.app'
MAX_PAR_PASSAGE = 20
RAPPELS_MAX = 3
DELAI_RAPPEL_JOURS = 7
DRY = '--dry-run' in sys.argv
SEP = '\x1f'


def sh(cmd, timeout=60):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)


def psql(sql):
    r = sh(f"docker exec ompangano-postgres-1 psql -U ompangano -d ompangano -At -F '{SEP}' -c \"{sql}\"")
    if r.returncode != 0:
        raise RuntimeError('psql : ' + r.stderr.strip()[:300])
    return [l.split(SEP) for l in r.stdout.split('\n') if l]


# ------------------------------------------------------------------ modèles de messages

def _html(titre, paragraphes, etapes=None, bouton=None):
    corps = ''.join(f'<p style="margin:0 0 14px">{p}</p>' for p in paragraphes)
    if etapes:
        corps += '<ol style="padding-left:20px;margin:0 0 16px">' + ''.join(f'<li style="margin-bottom:8px">{e}</li>' for e in etapes) + '</ol>'
    if bouton:
        corps += f'<p style="margin:22px 0"><a href="{SITE}" style="background:#c85a32;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">{escape(bouton)}</a></p>'
    return (f'<div style="background:#f6efe9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">'
            f'<div style="max-width:560px;margin:auto;background:#fff;border-radius:14px;padding:26px;color:#2b1a10;line-height:1.5;font-size:15px">'
            f'<h1 style="font-size:21px;margin:0 0 16px;color:#b4431e">{escape(titre)}</h1>{corps}'
            f'<hr style="border:none;border-top:1px solid #eadfd6;margin:22px 0 12px">'
            f'<p style="font-size:12px;color:#8a7466;margin:0">Vous recevez ce message car vous avez un compte sur Nkala. '
            f'Cette adresse (noreply) n\'accepte pas les réponses : pour toute question, utilisez la rubrique « Aide / FAQ » dans l\'application.</p>'
            f'</div></div>')


def modele_bienvenue(nom):
    nom = nom or 'contributeur'
    sujet = 'Bienvenue sur Nkala — merci de rejoindre l\'aventure'
    nom_h = escape(nom)  # le nom vient du profil : jamais inséré tel quel dans le HTML
    intro = [f'Bonjour {nom_h},', 'Merci d\'avoir rejoint <b>Nkala</b>. Ensemble, nous préservons, numérisons et transmettons la langue <b>Myènè</b> du Gabon.']
    objectifs = [
        '<b>Préserver</b> la langue Myènè et ses variantes (Ôrungu, Galoa, Mpongwè, Enenga, Nkomi, Adyumba) avant que des mots ne disparaissent.',
        '<b>Rassembler</b> un corpus de phrases justes : écriture, sens en français et prononciation, vérifiés par des locuteurs.',
        '<b>Transmettre</b> : ce corpus servira à créer des outils d\'apprentissage et des services numériques en Myènè, pour les jeunes et pour tous.',
    ]
    guide = [
        '<b>Connectez-vous</b> avec votre compte Google et renseignez votre <b>filiation</b> (clan paternel, clan maternel, village d\'origine). Si vous ne savez pas, choisissez « Je ne sais pas ».',
        'Ouvrez l\'onglet <b>Contribuer</b> : une phrase s\'affiche, les moins traitées en premier.',
        '<b>Étape 1 — L\'écriture</b> : dites si la phrase en Myènè est correcte, ou proposez votre version.',
        '<b>Étape 2 — Le sens</b> : confirmez la traduction en français ou proposez une meilleure tournure.',
        '<b>Étape 3 — Votre voix</b> : appuyez sur le micro, dites la phrase à voix claire dans un endroit calme, puis envoyez. Pas de réseau ? Pas de problème : votre contribution est gardée sur le téléphone et envoyée dès que la connexion revient.',
        'L\'onglet <b>Ezango</b> permet d\'explorer les phrases et d\'écouter les autres voix ; <b>Classement</b> et <b>Profil</b> montrent vos points, badges et contributions.',
    ]
    texte = (f'Bonjour {nom},\n\nMerci d\'avoir rejoint Nkala. Ensemble, nous préservons, numérisons et transmettons la langue Myènè du Gabon.\n\n'
             'NOS OBJECTIFS\n' + '\n'.join('- ' + _brut(o) for o in objectifs) +
             '\n\nPOUR COMMENCER EN 5 MINUTES\n' + '\n'.join(f'{i}. ' + _brut(g) for i, g in enumerate(guide, 1)) +
             f'\n\nOuvrir Nkala : {SITE}\n\nMerci pour votre voix !\nL\'équipe Nkala\n\n'
             '(Adresse noreply : les réponses ne sont pas lues. Aide : rubrique « Aide / FAQ » de l\'application.)\n')
    html = _html('Bienvenue sur Nkala', intro + ['<b>Nos objectifs</b>'], None) .replace('</div></div>', '') \
        + '<ul style="padding-left:20px;margin:0 0 16px">' + ''.join(f'<li style="margin-bottom:8px">{o}</li>' for o in objectifs) + '</ul>' \
        + '<p style="margin:0 0 10px"><b>Pour commencer en 5 minutes</b></p>' \
        + '<ol style="padding-left:20px;margin:0 0 16px">' + ''.join(f'<li style="margin-bottom:8px">{g}</li>' for g in guide) + '</ol>' \
        + f'<p style="margin:22px 0"><a href="{SITE}" style="background:#c85a32;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">Ouvrir Nkala</a></p>' \
        + '<p style="margin:0 0 6px">Merci pour votre voix !<br>L\'équipe Nkala</p>' \
        + '<hr style="border:none;border-top:1px solid #eadfd6;margin:22px 0 12px"><p style="font-size:12px;color:#8a7466;margin:0">Adresse noreply : les réponses ne sont pas lues. Aide : rubrique « Aide / FAQ » dans l\'application.</p></div></div>'
    return sujet, texte, html


def modele_filiation(nom):
    nom = nom or 'contributeur'
    sujet = 'Nkala — complétez votre filiation pour continuer à contribuer'
    nom_h = escape(nom)
    p = [f'Bonjour {nom_h},',
         'Votre <b>filiation</b> n\'est pas encore renseignée sur Nkala. Elle est désormais <b>obligatoire</b> : elle nous permet de rattacher chaque voix à son ethnie, son clan et son village, et d\'en garantir la valeur pour la langue Myènè.']
    etapes = ['Ouvrez Nkala : une fenêtre vous demande votre filiation.',
              'Choisissez votre <b>clan paternel</b>, votre <b>clan maternel</b> et votre <b>village d\'origine</b>.',
              'Vous ne savez pas ? Choisissez simplement <b>« Je ne sais pas »</b> : c\'est une réponse valide. Vous pourrez la modifier plus tard dans votre Profil.']
    texte = (f'Bonjour {nom},\n\nVotre filiation n\'est pas encore renseignée sur Nkala. Elle est désormais obligatoire : elle permet de rattacher '
             'chaque voix à son ethnie, son clan et son village.\n\n' + '\n'.join(f'{i}. ' + _brut(e) for i, e in enumerate(etapes, 1)) +
             f'\n\nOuvrir Nkala : {SITE}\n\nMerci !\nL\'équipe Nkala\n')
    return sujet, texte, _html('Complétez votre filiation', p, etapes, 'Ouvrir Nkala')


def _brut(s):
    import re
    return re.sub(r'<[^>]+>', '', s)


MODELES = {'bienvenue': modele_bienvenue, 'filiation': modele_filiation}

# ------------------------------------------------------------------ envoi

def config():
    cfg = {}
    for l in open(CONFIG, encoding='utf-8'):
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1)
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg


def construire(cfg, kind, nom, to):
    sujet, texte, html = MODELES[kind](nom)
    m = EmailMessage()
    m['From'] = cfg['MAIL_FROM']
    m['To'] = to
    m['Subject'] = sujet
    m['Auto-Submitted'] = 'auto-generated'
    m.set_content(texte)
    m.add_alternative(html, subtype='html')
    return m


def connexion(cfg):
    port = int(cfg.get('SMTP_PORT', '587'))
    ctx = ssl.create_default_context()
    if port == 465:
        s = smtplib.SMTP_SSL(cfg['SMTP_HOST'], port, context=ctx, timeout=60)
    else:
        s = smtplib.SMTP(cfg['SMTP_HOST'], port, timeout=60)
        s.starttls(context=ctx)
    s.login(cfg['SMTP_USER'], cfg['SMTP_PASS'])
    return s


def sql_txt(v):
    return v.replace("'", "''")


def destinataires():
    """(user_id, email, nom, kind) à servir, au plus MAX_PAR_PASSAGE."""
    out = []
    # bienvenue : comptes récents (7 jours), créés depuis plus de 2 minutes, jamais accueillis
    for u, e, n in psql(
        "select id, email, coalesce(nullif(data->>'displayName',''), split_part(email,'@',1)) from users u "
        "where deleted_at is null and email is not null and email <> '' and status <> 'suspended' "
        "and created_at > now() - interval '7 days' and created_at < now() - interval '2 minutes' "
        "and not exists (select 1 from user_mails m where m.user_id = u.id and m.kind = 'bienvenue') order by created_at limit 20"):
        out.append((u, e, n, 'bienvenue'))
    # rappel de filiation : incomplète, inscription terminée, dernier rappel de plus de 7 jours, 3 rappels au plus
    vide = "('', 'non précisé', 'non precise', 'non rattaché', 'non rattache', 'à définir')"
    for u, e, n in psql(
        "select id, email, coalesce(nullif(data->>'displayName',''), split_part(email,'@',1)) from users u "
        "where deleted_at is null and email is not null and email <> '' and status <> 'suspended' "
        f"and (lower(trim(coalesce(data->>'paternalClan',''))) in {vide} or lower(trim(coalesce(data->>'maternalClan',''))) in {vide} "
        f"or lower(trim(coalesce(data->>'villageOfOrigin',''))) in {vide}) "
        "and created_at < now() - interval '2 minutes' "
        f"and (select count(*) from user_mails m where m.user_id = u.id and m.kind = 'filiation') < {RAPPELS_MAX} "
        f"and not exists (select 1 from user_mails m where m.user_id = u.id and m.kind = 'filiation' and m.sent_at > now() - interval '{DELAI_RAPPEL_JOURS} days') "
        "order by created_at limit 20"):
        out.append((u, e, n, 'filiation'))
    return out[:MAX_PAR_PASSAGE]


def main():
    if '--apercu' in sys.argv:
        kind = sys.argv[sys.argv.index('--apercu') + 1]
        sujet, texte, _ = MODELES[kind]('Marie')
        print('Sujet :', sujet, '\n\n' + texte)
        return
    if not os.path.exists(CONFIG):
        print(f'{CONFIG} absent : courriels noreply non configurés, rien envoyé.')
        return
    cfg = config()
    if '--test' in sys.argv:
        to = sys.argv[sys.argv.index('--test') + 1]
        with connexion(cfg) as s:
            for kind in MODELES:
                s.send_message(construire(cfg, kind, 'Essai', to))
        print(f'Deux courriels d\'essai envoyés à {to}.')
        return
    todo = destinataires()
    if not todo:
        return
    s = None if DRY else connexion(cfg)
    envoyes = 0
    try:
        for (uid, email, nom, kind) in todo:
            if DRY:
                print(f'[essai à blanc] {kind} -> {email} ({nom})')
                continue
            try:
                s.send_message(construire(cfg, kind, nom, email))
            except smtplib.SMTPRecipientsRefused as e:
                print(f'refusé {email} : {e}', file=sys.stderr)
            except smtplib.SMTPServerDisconnected:
                s = connexion(cfg)
                s.send_message(construire(cfg, kind, nom, email))
            # enregistré même si l'adresse est refusée : pas de nouvel essai en boucle
            psql(f"insert into user_mails (user_id, kind, to_email) values ('{sql_txt(uid)}', '{kind}', '{sql_txt(email)}')")
            envoyes += 1
            time.sleep(1)
    finally:
        if s:
            try: s.quit()
            except Exception: pass
    print(f'{envoyes} courriel(s) envoyé(s).')


if __name__ == '__main__':
    main()
