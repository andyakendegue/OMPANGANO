/**
 * Génère api/src/seedItems.ts depuis src/services/seedData.ts (site web) : les 10 phrases de départ corrigées et leurs
 * anciens textes générés par IA. Le serveur s'en sert pour corriger la base ; un test vérifie qu'il n'y a pas d'écart avec le site.
 *   cd server && npx tsx scripts/generer-seed-serveur.mts
 */
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_ENENGA_ITEMS, SEED_ITEM_CORRECTIONS } from '../../src/services/seedData.ts';

const champs = ['id', 'frenchText', 'myeneText', 'dialect', 'category', 'contextNotes', 'difficulty'] as const;
const corriges = INITIAL_ENENGA_ITEMS.map(it => Object.fromEntries(champs.map(c => [c, (it as any)[c] ?? ''])));
fs.writeFileSync(path.resolve(import.meta.dirname, '../api/src/seedItems.ts'),
`// FICHIER GÉNÉRÉ par server/scripts/generer-seed-serveur.mts depuis src/services/seedData.ts — ne pas modifier à la main.
export interface SeedItemCorrige { id: string; frenchText: string; myeneText: string; dialect: string; category: string; contextNotes: string; difficulty: string }
/** Les 10 phrases de départ, avec le texte corrigé. */
export const SEED_ITEMS_CORRIGES: SeedItemCorrige[] = ${JSON.stringify(corriges, null, 2)};
/** Anciens textes générés par IA (incorrects), par identifiant de fiche de départ. */
export const SEED_ANCIENS_TEXTES: Record<string, string> = ${JSON.stringify(SEED_ITEM_CORRECTIONS, null, 2)};
`);
console.log('seedItems.ts :', corriges.length, 'fiches,', Object.keys(SEED_ITEM_CORRECTIONS).length, 'anciens textes');
