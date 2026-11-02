/** Génère packages/noyau/src/textes/seed.ts depuis INITIAL_ENENGA_ITEMS (site web) : fiches affichées avant le premier téléchargement. */
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_ENENGA_ITEMS } from '../../../src/services/seedData.ts';
const racine = path.resolve(import.meta.dirname, '../../..');
fs.writeFileSync(path.join(racine, 'packages/noyau/src/textes/seed.ts'),
`// FICHIER GÉNÉRÉ par apps/nkala/scripts/extraire-seed-web.mts depuis src/services/seedData.ts — ne pas modifier à la main.
import type { QuestionnaireItem } from '../types';
export const FICHES_DE_SECOURS: QuestionnaireItem[] = ${JSON.stringify(INITIAL_ENENGA_ITEMS, null, 2)};
`);
console.log('seed.ts :', INITIAL_ENENGA_ITEMS.length, 'fiches');
