import puppeteer from 'puppeteer-core';
const OUT = process.argv[2];
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const clic = async (texte) => {
  const ok = await p.evaluate((t) => {
    const els = [...document.querySelectorAll('div,span,a,button')].filter(e => e.textContent?.trim() === t && e.offsetParent !== null);
    const el = els[els.length - 1]; if (!el) return null; const r = el.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2];
  }, texte);
  if (!ok) console.log('introuvable :', texte); else await p.mouse.click(ok[0], ok[1]);
  await pause(3500);
};
const shot = async (nom) => { await p.screenshot({ path: `${OUT}/${nom}.png` }); console.log('ok', nom); };
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 90000 });
await pause(6000);
await shot('00_bienvenue');
const existe = (t) => p.evaluate((t) => [...document.querySelectorAll('div,span')].some(e => e.textContent?.trim() === t && e.offsetParent !== null), t);
for (let i = 0; i < 10; i++) {
  if (await existe('Contribuer') && await existe('Accueil')) break;
  let fait = false;
  for (const t of ['Essayer sans compte', 'Adulte ou ado', 'Passer', 'Plus tard', 'Pas maintenant', 'Continuer', 'Suivant', 'Commencer', "C'est parti"]) {
    if (await existe(t)) { console.log('clic', t); await clic(t); fait = true; break; }
  }
  if (!fait) { console.log('bloqué :', (await p.evaluate(() => document.body.innerText)).slice(0, 400)); break; }
}
await shot('01_accueil');
for (const [onglet, nom] of [['Jouer', '02_jouer'], ['Apprendre', '03_apprendre'], ['Contribuer', '04_contribuer'], ['Moi', '05_moi']]) {
  await clic(onglet); await pause(3000); await shot(nom);
}
// Chemins directs pour les autres écrans
for (const [url, nom] of [['/ecoute', '06_ecoute'], ['/village', '07_village'], ['/serie', '08_serie']]) {
  await p.goto('http://localhost:5173' + url, { waitUntil: 'networkidle2', timeout: 60000 }); await pause(5000); await shot(nom);
}
await b.close();
