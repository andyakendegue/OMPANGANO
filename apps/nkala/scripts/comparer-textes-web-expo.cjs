/**
 * Parité des textes : pour chaque composant « contributeur » du site web, liste les textes fixes absents d'Expo.
 *   node apps/nkala/scripts/comparer-textes-web-expo.cjs [--detail]
 */
const fs = require('fs'); const path = require('path');
const R = path.resolve(__dirname, '../../..');
const code = fs.readFileSync(path.join(__dirname, 'extraire-textes-web.cjs'), 'utf8').split('function ecrire')[0]
  .replace("require('typescript')", `require('${R}/apps/nkala/node_modules/typescript')`).replace("path.resolve(__dirname, '../../..')", `'${R}'`);
eval(code + ';globalThis.__b = blocs; globalThis.__ts = ts;');

const lire = (d) => fs.readdirSync(path.join(R, d), { recursive: true }).filter(f => /\.(tsx?|json)$/.test(f) && !/node_modules/.test(f)).map(f => fs.readFileSync(path.join(R, d, f), 'utf8'));
const corpus = [...lire('apps/nkala/src'), ...lire('apps/nkala/app'), ...lire('packages/noyau/src')].join('\n');
const n = (t) => t.normalize('NFC').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/’/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const corp = n(corpus.replace(/\\n/g, ' '));

const composants = {
  'Fiche de contribution': 'src/components/CrowdsourceCard.tsx', 'Enregistreur': 'src/components/AudioRecorder.tsx', 'Défi (bandeau)': 'src/components/WeeklyChallengeBanner.tsx',
  'Défi (célébration)': 'src/components/ChallengeCelebrationModal.tsx', 'Ezango (explorateur)': 'src/components/VocabularyExplorer.tsx', 'Classement': 'src/components/LeaderboardAndRewards.tsx',
  'Profil': 'src/components/UserProfileView.tsx', 'Inscription': 'src/components/OnboardingModal.tsx', 'Connexion (écran)': 'src/components/AuthGateScreen.tsx', 'Connexion (fenêtre)': 'src/components/AuthModal.tsx',
  'Conditions': 'src/components/TermsConsentModal.tsx', 'Guide visuel': 'src/components/VisualGuideModal.tsx', 'FAQ (fenêtre)': 'src/components/FaqModal.tsx', 'FAQ (contenu)': 'src/components/ContributionFaqSection.tsx',
  'Alertes': 'src/components/NotificationCenterModal.tsx', 'Hors-ligne': 'src/components/OfflinePackModal.tsx', 'En-tête': 'src/components/Navbar.tsx', 'Navigation': 'src/components/BottomNav.tsx',
  'Mise à jour': 'src/components/AppUpdateBanner.tsx', 'Validation (validateurs)': 'src/components/ValidatorWorkspace.tsx',
};
let T = 0, M = 0; const detail = process.argv.includes('--detail');
for (const [nom, f] of Object.entries(composants)) {
  const src = fs.readFileSync(path.join(R, f), 'utf8');
  const sf = __ts.createSourceFile(f, src, __ts.ScriptTarget.Latest, true, __ts.ScriptKind.TSX);
  const fixes = __b(sf, sf).map(b => b.texte).filter(t => !t.includes('{{') && /[A-Za-zÀ-ÿ]{3}/.test(t));
  const manquants = [...new Set(fixes)].filter(t => !corp.includes(n(t)));
  T += new Set(fixes).size; M += manquants.length;
  console.log(`${nom.padEnd(26)} ${String(new Set(fixes).size - manquants.length).padStart(3)}/${String(new Set(fixes).size).padEnd(3)} reproduits  (${manquants.length} manquants)`);
  if (detail) manquants.forEach(t => console.log('     - ' + t.slice(0, 150)));
}
console.log(`TOTAL ${T - M}/${T} textes fixes reproduits (${Math.round(((T - M) / T) * 100)} %)`);
