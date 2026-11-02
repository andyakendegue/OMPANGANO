/**
 * Génère packages/noyau/src/textes/faq.ts depuis MYENE_CONTRIBUTION_FAQS (site web) : mêmes questions, mêmes réponses.
 *   node_modules/.bin/tsx apps/nkala/scripts/extraire-faq-web.mts
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { MYENE_CONTRIBUTION_FAQS } from '../../../src/components/ContributionFaqSection.tsx';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const racine = path.resolve(import.meta.dirname, '../../..');
const src = fs.readFileSync(path.join(racine, 'src/components/ContributionFaqSection.tsx'), 'utf8');
const sf = ts.createSourceFile('f.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const categories: { id: string; label: string }[] = [];
const visite = (n: any) => {
  if (ts.isVariableDeclaration(n) && n.name.getText(sf) === 'FAQ_CATEGORIES' && n.initializer && ts.isArrayLiteralExpression(n.initializer)) {
    for (const el of n.initializer.elements) {
      const o: any = {};
      for (const p of el.properties) if (ts.isPropertyAssignment(p) && ['id', 'label'].includes(p.name.getText(sf)) && ts.isStringLiteralLike(p.initializer)) o[p.name.getText(sf)] = p.initializer.text;
      categories.push(o);
    }
  }
  ts.forEachChild(n, visite);
};
visite(sf);

const sortie = `// FICHIER GÉNÉRÉ par apps/nkala/scripts/extraire-faq-web.mts depuis src/components/ContributionFaqSection.tsx — ne pas modifier à la main.
export type CategorieFaq = 'tribus_vs_clans' | 'orthographe_tons' | 'sens_francais' | 'audio_voix' | 'validation_xp' | 'hors_ligne';
export interface EntreeFaq {
  id: string; question: string; shortSummary: string; answerParagraphs: string[];
  examples?: { label: string; detail: string }[]; category: CategorieFaq; tags: string[]; isImportantRule?: boolean;
}
export const CATEGORIES_FAQ: { id: 'all' | CategorieFaq; label: string }[] = ${JSON.stringify(categories, null, 2)};
export const FAQ_CONTRIBUTION: EntreeFaq[] = ${JSON.stringify(MYENE_CONTRIBUTION_FAQS, null, 2)};
`;
fs.writeFileSync(path.join(racine, 'packages/noyau/src/textes/faq.ts'), sortie);
console.log(`faq.ts : ${MYENE_CONTRIBUTION_FAQS.length} questions, ${categories.length} catégories`);
