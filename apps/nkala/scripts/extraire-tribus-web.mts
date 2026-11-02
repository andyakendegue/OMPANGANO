/** Génère packages/noyau/src/textes/tribus_info.ts depuis TRIBAL_DIALECT_INFO (site web). */
import fs from 'node:fs';
import path from 'node:path';
import { TRIBAL_DIALECT_INFO } from '../../../src/services/seedData.ts';
const racine = path.resolve(import.meta.dirname, '../../..');
fs.writeFileSync(path.join(racine, 'packages/noyau/src/textes/tribus_info.ts'),
`// FICHIER GÉNÉRÉ par apps/nkala/scripts/extraire-tribus-web.mts depuis src/services/seedData.ts — ne pas modifier à la main.
export interface InfoTribu { tribe: string; dialectCode: string; geographicalZone: string; historicalOrigins: string; orthographicAndTonalTraits: string; mottoOrSymbol: string; associatedVillages?: string[] }
export const INFO_TRIBUS: Record<string, InfoTribu> = ${JSON.stringify(TRIBAL_DIALECT_INFO, null, 2)};
`);
console.log('tribus_info.ts :', Object.keys(TRIBAL_DIALECT_INFO).join(', '));
