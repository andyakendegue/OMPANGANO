/**
 * Conditionne un fichier audio ou vidéo en HLS chiffré AES-128 et le range dans le stockage (ou dans un dossier local pour essai).
 *   cd server && MEDIA_SECRET=… npx tsx scripts/chiffrer_media.ts <collection> <id> <fichier> [audio|video] [--local dossier]
 *   collection : titres | chapitres | cours_artisans ; id : identifiant de la ligne importée (colonne protege = oui)
 * La clé n'est jamais écrite dans le stockage : elle est dérivée de MEDIA_SECRET, sinon SESSION_SECRET (même dérivation que l'API, cles.ts) et livrée contre une licence.
 * Il faut ffmpeg. En production, lancer sur le VPS avec les variables S3_* du serveur.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cheminMedia, cleContenu } from '../api/src/media.ts';
import { createS3Storage } from '../api/src/storage.ts';

const args = process.argv.slice(2);
const iLocal = args.indexOf('--local');
const local = iLocal >= 0 ? args.splice(iLocal, 2)[1] : null;
const [collection, id, fichier, genre = 'audio'] = args;
if (!collection || !id || !fichier) { console.error('Usage : chiffrer_media.ts <collection> <id> <fichier> [audio|video] [--local dossier]'); process.exit(1); }
// Même clé que l'API (cles.ts) : MEDIA_SECRET, sinon SESSION_SECRET
const secret = process.env.MEDIA_SECRET || process.env.SESSION_SECRET;
if (!secret) { console.error('MEDIA_SECRET (ou SESSION_SECRET) manquant'); process.exit(1); }

const tmp = mkdtempSync(join(tmpdir(), 'hls-'));
writeFileSync(join(tmp, 'cle.bin'), cleContenu(secret, collection, id));
writeFileSync(join(tmp, 'keyinfo'), `{{CLE}}\n${join(tmp, 'cle.bin')}\n`);
const codecs = genre === 'video' ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k'] : ['-vn', '-c:a', 'aac', '-b:a', '128k'];
execFileSync('ffmpeg', ['-y', '-i', fichier, ...codecs, '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_key_info_file', join(tmp, 'keyinfo'), '-hls_segment_filename', join(tmp, 'seg%05d.ts'), join(tmp, 'index.m3u8')], { stdio: 'inherit' });

const sortie = readdirSync(tmp).filter(f => f === 'index.m3u8' || f.endsWith('.ts'));
if (local) {
  mkdirSync(join(local, cheminMedia(collection, id, '')), { recursive: true });
  for (const f of sortie) copyFileSync(join(tmp, f), join(local, cheminMedia(collection, id, f)));
} else {
  const need = (k: string) => process.env[k] || (() => { throw new Error(`Variable manquante : ${k}`); })();
  const st = createS3Storage({ endpoint: need('S3_ENDPOINT'), region: process.env.S3_REGION || 'garage', bucket: need('S3_BUCKET'), accessKeyId: need('S3_ACCESS_KEY_ID'), secretAccessKey: need('S3_SECRET_ACCESS_KEY') });
  for (const f of sortie) await st.put(cheminMedia(collection, id, f), readFileSync(join(tmp, f)), f.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
}
console.log(`${sortie.length - 1} segments chiffrés → ${local ? local : 'stockage'} : ${cheminMedia(collection, id, 'index.m3u8')}`);
