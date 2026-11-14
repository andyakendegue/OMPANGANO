'use strict';
/*
 * Façade à l'API d'image-size 1.x (appel par défaut avec un chemin ou un tampon, synchrone) au-dessus d'image-size 2.1.0,
 * qui corrige deux dénis de service (analyseurs JXL/HEIF et ICNS, avis >=0.6.3 <=2.0.2). Aucune 1.x corrigée n'existe ;
 * Metro 0.83 (Expo 54) appelle `imageSize(cheminOuTampon)` pour les images de l'app à la compilation.
 * Imposée par « overrides » dans apps/nkala/package.json (14 nov. 2026). À retirer quand Metro passera à image-size 2.
 */
const fs = require('node:fs');
const { imageSize: mesurer, disableTypes, types } = require('./vendor/image-size-2.1.0/index.js');

function imageSize(entree, rappel) {
  const tampon = typeof entree === 'string' ? fs.readFileSync(entree) : entree;
  if (typeof rappel === 'function') {
    try { rappel(null, mesurer(tampon)); } catch (e) { rappel(e); }
    return undefined;
  }
  return mesurer(tampon);
}
module.exports = imageSize;
module.exports.default = imageSize;
module.exports.imageSize = imageSize;
module.exports.disableTypes = disableTypes;
module.exports.types = types;
