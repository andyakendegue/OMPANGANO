import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [BRUT, OUT, ASSETS] = process.argv.slice(2);
fs.mkdirSync(`${OUT}/captures`, { recursive: true });
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const ttf = (f) => 'data:font/ttf;base64,' + fs.readFileSync(f).toString('base64');
const FONTS = `<style>@font-face{font-family:Outfit;font-weight:800;src:url(${ttf('/Users/capp/Projets/DONDO/OMPANGANO/apps/nkala/node_modules/@expo-google-fonts/outfit/800ExtraBold/Outfit_800ExtraBold.ttf')})}@font-face{font-family:'Plus Jakarta Sans';src:url(${ttf('/Users/capp/Projets/DONDO/OMPANGANO/apps/nkala/node_modules/@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf')})}</style>`;
const base = `*{margin:0;box-sizing:border-box}body{background:#170D08;font-family:'Plus Jakarta Sans',sans-serif;overflow:hidden}`;

const ecrans = [
  ['11_partie', 'Apprends les mots<br>en jouant', 'Ogoni : trouve le mot avant que le feu s’éteigne'],
  ['02_jouer', 'Une salle de jeux<br>pour chaque thème', 'Mots, corps, maison, nature, nombres, famille'],
  ['03_apprendre', 'Des cours<br>pas à pas', 'Test de niveau, étapes de la vie, cours à distance'],
  ['09_defi', 'Chaque jeu<br>s’explique en images', 'Une aide illustrée avant de jouer'],
  ['07_village', 'Le village<br>dans ta poche', 'Pharmacies de garde, taxis, marchés, écoles'],
];
const br = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await br.newPage();

// Captures 1080 x 1920 (9:16)
await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
let i = 1;
for (const [f, titre, sous] of ecrans) {
  await p.setContent(`<html><head>${FONTS}<style>${base}
  body{width:1080px;height:1920px;position:relative;background:radial-gradient(circle at 15% 8%,#5a2414 0,transparent 38%),radial-gradient(circle at 95% 70%,#4a3008 0,transparent 35%),#170D08}
  .t{position:absolute;top:110px;left:0;right:0;text-align:center;font-family:Outfit;font-weight:800;font-size:84px;line-height:1.05;color:#FED7AA}
  .s{position:absolute;top:330px;left:80px;right:80px;text-align:center;font-size:36px;color:#F59E0B}
  .tel{position:absolute;top:440px;left:50%;transform:translateX(-50%);width:700px;height:1554px;border-radius:64px;border:14px solid #2d1a10;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 2px #4A2412}
  .tel{background:#170D08}.tel img{width:100%;display:block}
  </style></head><body><div class="t">${titre}</div><div class="s">${sous}</div><div class="tel"><img src="${b64(`${BRUT}/${f}.png`)}"></div></body></html>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `${OUT}/captures/capture_${i++}_${f.replace(/^\d+_/, '')}.png` });
}

// Image de présentation 1024 x 500
await p.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
await p.setContent(`<html><head>${FONTS}<style>${base}
body{width:1024px;height:500px;position:relative;background:radial-gradient(circle at 10% 0%,#5a2414 0,transparent 45%),radial-gradient(circle at 100% 100%,#4a3008 0,transparent 45%),#170D08}
img{position:absolute;left:90px;top:70px;width:360px}
.t{position:absolute;left:500px;top:150px;right:60px;font-family:Outfit;font-weight:800;font-size:58px;line-height:1.05;color:#FED7AA}
.s{position:absolute;left:502px;top:300px;right:60px;font-size:26px;line-height:1.35;color:#F59E0B}
</style></head><body><img src="${b64(`${ASSETS}/splash-icon.png`)}"><div class="t">La langue myènè<br>dans ta poche</div><div class="s">Apprendre, jouer, écouter<br>et retrouver les tiens.</div></body></html>`, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `${OUT}/image_presentation_1024x500.png` });
await br.close();
