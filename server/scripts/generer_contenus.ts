/**
 * Génère, depuis les schémas de packages/noyau, les modèles CSV vides (contenu/modeles/*.csv), les exemples JSON
 * (contenu/exemples/*.json, copie de packages/noyau/contenu/) et le guide des colonnes (contenu/COLONNES.md).
 * Lancer : npx tsx server/scripts/generer_contenus.ts (depuis OMPANGANO/).
 */
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../../packages/noyau/src/contenu/schemas.ts';
import { modeleCsv } from '../../packages/noyau/src/contenu/valider.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
mkdirSync(join(racine, 'contenu', 'modeles'), { recursive: true });
mkdirSync(join(racine, 'contenu', 'exemples'), { recursive: true });
for (const s of SCHEMAS) writeFileSync(join(racine, 'contenu', 'modeles', `${s.id}.csv`), modeleCsv(s));
const src = join(racine, 'packages', 'noyau', 'contenu');
for (const f of readdirSync(src).filter(f => f.endsWith('.json'))) copyFileSync(join(src, f), join(racine, 'contenu', 'exemples', f));

const modules = ['onenji', 'azeva', 'ontci', 'nkala', 'commun'] as const;
const titres: Record<string, string> = { onenji: 'Onenji (apprendre)', azeva: 'Azeva (jouer)', ontci: 'Ontci (écouter)', nkala: 'Nkala (village)', commun: 'Commun' };
let md = '# Colonnes des fichiers de contenu\n\nGénéré par `server/scripts/generer_contenus.ts` : ne pas modifier à la main.\n\n';
for (const m of modules) {
  md += `## ${titres[m]}\n\n`;
  for (const s of SCHEMAS.filter(x => x.module === m)) {
    md += `### ${s.titre} — \`${s.id}\`\n${s.description}\n\n| Colonne | Type | Obligatoire | Description |\n|---|---|---|---|\n`;
    for (const c of s.champs) md += `| \`${c.nom}\` | ${c.type}${c.choix ? ` (${c.choix.join(' / ')})` : ''}${c.ref ? ` → \`${c.ref}\`` : ''} | ${c.requis ? 'oui' : ''} | ${c.aide.replace(/\|/g, '\\|')} |\n`;
    md += '\n';
  }
}
writeFileSync(join(racine, 'contenu', 'COLONNES.md'), md);
console.log(`${SCHEMAS.length} modèles CSV, exemples JSON et COLONNES.md générés dans contenu/`);
