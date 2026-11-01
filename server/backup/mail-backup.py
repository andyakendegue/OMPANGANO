#!/usr/bin/env python3
"""Envoie par e-mail la dernière sauvegarde CHIFFRÉE (base + fichiers) si elle tient dans la limite de taille.
Config : /opt/ompangano/secrets/smtp.env (chmod 600), lignes KEY=valeur :
  SMTP_HOST, SMTP_PORT (587 = STARTTLS, 465 = SSL), SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO
Utilisation : mail-backup.py [dossier-sauvegardes]   (défaut /opt/ompangano/backups)
Les pièces jointes sont chiffrées (AES-256) : sans backup.key elles sont illisibles.
"""
import glob, os, smtplib, ssl, sys
from email.message import EmailMessage

MAX_TOTAL = 20 * 1024 * 1024  # la plupart des messageries refusent au-delà de 25 Mo
cfg = {}
for line in open('/opt/ompangano/secrets/smtp.env', encoding='utf-8'):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        cfg[k.strip()] = v.strip().strip('"').strip("'")

root = sys.argv[1] if len(sys.argv) > 1 else '/opt/ompangano/backups'
files = []
for sub, pat in (('db', '*.dump.enc'), ('media', '*.tar.gz.enc')):
    found = sorted(glob.glob(os.path.join(root, sub, pat)))
    if found:
        files.append(found[-1])
total = sum(os.path.getsize(f) for f in files)

msg = EmailMessage()
msg['From'] = cfg.get('MAIL_FROM') or cfg['SMTP_USER']
msg['To'] = cfg['MAIL_TO']
msg['Subject'] = 'OMPANGANO — sauvegarde chiffrée'
if total > MAX_TOTAL:
    msg['Subject'] += ' (trop volumineuse : non jointe)'
    msg.set_content(f"La dernière sauvegarde fait {total // 1024 // 1024} Mo, au-delà de {MAX_TOTAL // 1024 // 1024} Mo.\n"
                    "Elle reste sur le VPS dans /opt/ompangano/backups/. Prévoir un autre mode de copie hors serveur.\n"
                    + "\n".join(os.path.basename(f) for f in files))
else:
    msg.set_content("Sauvegarde chiffrée OMPANGANO (AES-256). Se déchiffre avec la clé ompangano-backup.key :\n"
                    "  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:ompangano-backup.key -in <fichier> -out <sortie>\n")
    for f in files:
        msg.add_attachment(open(f, 'rb').read(), maintype='application', subtype='octet-stream', filename=os.path.basename(f))

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
print(f"Envoyé à {cfg['MAIL_TO']} ({total // 1024} Ko de pièces jointes).")
