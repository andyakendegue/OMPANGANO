/**
 * Extrait les textes de lecture des modales du site web (src/components) pour les reprendre à l'identique dans Expo.
 * Aucun texte n'est retapé à la main : relancer ce script après toute modification des textes du web.
 *   node apps/nkala/scripts/extraire-textes-web.cjs
 * Sortie : packages/noyau/src/textes/*.ts (fichiers générés, ne pas modifier à la main).
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '../../..');
const BLOCS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'label', 'blockquote', 'dt', 'dd', 'summary']);
const INLINE = new Set(['strong', 'b', 'em', 'i', 'span', 'a', 'code', 'u', 'small', 'mark']);

const norm = (t) => t.replace(/\s+/g, ' ').trim();

// Texte aplati d'un nœud (éléments en ligne inclus). Les expressions dynamiques sont notées {{expression}}.
function texte(node, sf) {
  let out = '';
  const visite = (n) => {
    if (ts.isJsxText(n)) { out += n.text; return; }
    if (ts.isJsxExpression(n)) {
      const e = n.expression;
      if (!e) return;
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) { out += e.text; return; }
      if (ts.isTemplateExpression(e)) { out += e.getText(sf).slice(1, -1).replace(/\$\{([^}]*)\}/g, '{{$1}}'); return; }
      if (e.kind === ts.SyntaxKind.NullKeyword) return;
      out += `{{${e.getText(sf).replace(/\s+/g, ' ')}}}`;
      return;
    }
    if (ts.isJsxElement(n)) {
      const tag = n.openingElement.tagName.getText(sf);
      if (tag === 'br') { out += '\n'; return; }
      n.children.forEach(visite);
      return;
    }
    if (ts.isJsxSelfClosingElement(n)) { if (n.tagName.getText(sf) === 'br') out += '\n'; return; }
    if (ts.isJsxFragment(n)) n.children.forEach(visite);
  };
  visite(node);
  return out;
}

// Parcourt un sous-arbre JSX et renvoie les blocs de texte dans l'ordre d'affichage.
function blocs(racine, sf) {
  const res = [];
  const visite = (n) => {
    if (ts.isJsxElement(n)) {
      const tag = n.openingElement.tagName.getText(sf);
      if (BLOCS.has(tag)) {
        const t = norm(texte(n, sf));
        if (t) res.push({ type: tag, texte: t });
        return;
      }
      // Élément ordinaire : le texte qu'il porte directement (hors éléments blocs enfants) forme un bloc.
      const direct = n.children.filter(c => ts.isJsxText(c) || (ts.isJsxElement(c) && INLINE.has(c.openingElement.tagName.getText(sf))) || (ts.isJsxExpression(c) && c.expression && (ts.isStringLiteral(c.expression) || ts.isNoSubstitutionTemplateLiteral(c.expression))));
      const aBloc = n.children.some(c => ts.isJsxElement(c) && !INLINE.has(c.openingElement.tagName.getText(sf)));
      if (direct.length && !aBloc) {
        const t = norm(texte(n, sf));
        if (t && /[A-Za-zÀ-ÿ]{2}/.test(t)) { res.push({ type: tag === 'button' ? 'button' : 'texte', texte: t }); return; }
      }
      n.children.forEach(visite);
      return;
    }
    if (ts.isJsxFragment(n)) { n.children.forEach(visite); return; }
    if (ts.isJsxExpression(n) && n.expression) { ts.forEachChild(n.expression, visite); return; }
    if (ts.isJsxSelfClosingElement(n)) return;
    ts.forEachChild(n, visite);
  };
  visite(racine);
  return res;
}

// Trouve les blocs « {variable === 'valeur' && ( ... )} » et en extrait les textes, par valeur.
function parOnglet(fichier, variable) {
  const src = fs.readFileSync(path.join(RACINE, fichier), 'utf8');
  const sf = ts.createSourceFile(fichier, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = {};
  const visite = (n) => {
    if (ts.isJsxExpression(n) && n.expression && ts.isBinaryExpression(n.expression) && n.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      const g = n.expression.left;
      if (ts.isBinaryExpression(g) && g.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && g.left.getText(sf) === variable) {
        const valeur = g.right.getText(sf).replace(/['"]/g, '');
        out[valeur] = (out[valeur] || []).concat(blocs(n.expression.right, sf));
        return;
      }
    }
    ts.forEachChild(n, visite);
  };
  visite(sf);
  return out;
}

fs.writeFileSync(path.join(RACINE, 'packages/noyau/src/textes/blocs.ts'), `// FICHIER GÉNÉRÉ par apps/nkala/scripts/extraire-textes-web.cjs — ne pas modifier à la main.\nexport interface BlocTexte { type: string; texte: string }\n`);

function ecrire(nom, exportNom, contenu, source) {
  const f = path.join(RACINE, 'packages/noyau/src/textes', nom);
  const entete = `// FICHIER GÉNÉRÉ par apps/nkala/scripts/extraire-textes-web.cjs depuis ${source} — ne pas modifier à la main.\n// Les {{expressions}} sont des valeurs dynamiques à remplacer à l'affichage.\n`;
  fs.writeFileSync(f, `${entete}import type { BlocTexte } from './blocs';\nexport const ${exportNom}: Record<string, BlocTexte[]> = ${JSON.stringify(contenu, null, 2)};\n`);
  const n = Object.values(contenu).reduce((a, l) => a + l.length, 0);
  console.log(`${nom}: ${Object.keys(contenu).length} sections, ${n} blocs`);
}

ecrire('conditions.ts', 'TEXTES_CONDITIONS', parOnglet('src/components/TermsConsentModal.tsx', 'activeTab'), 'src/components/TermsConsentModal.tsx');
ecrire('guide.ts', 'TEXTES_GUIDE', parOnglet('src/components/VisualGuideModal.tsx', 'activeSlide'), 'src/components/VisualGuideModal.tsx');
