// Envoie les sauvegardes CHIFFRÉES vers Firebase Storage (dossier backups-ompangano/), sans toucher au reste du bucket.
// Utilise un compte de service limité à la création d'objets (voir README) :
//   npx tsx backup/upload-firebase.ts /chemin/cle-limitee.json /opt/ompangano/backups
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const [keyPath, dir] = process.argv.slice(2);
if (!keyPath || !dir) { console.error('usage : upload-firebase.ts <cle.json> <dossier-sauvegardes>'); process.exit(1); }
const cfg = JSON.parse(readFileSync(new URL('../../firebase-applet-config.json', import.meta.url), 'utf8'));
const bucket = getStorage(initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))), storageBucket: cfg.storageBucket })).bucket();
let n = 0;
for (const sub of ['db', 'media']) {
  for (const f of readdirSync(join(dir, sub)).filter(f => f.endsWith('.enc'))) {
    const dest = `backups-ompangano/${sub}/${f}`;
    if ((await bucket.file(dest).exists())[0]) continue;
    await bucket.upload(join(dir, sub, f), { destination: dest, contentType: 'application/octet-stream' });
    n++;
  }
}
console.log(`${n} fichier(s) chiffré(s) envoyé(s) vers backups-ompangano/`);
