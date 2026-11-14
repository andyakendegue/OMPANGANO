const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
// Le noyau partagé est hors du dossier de l'application.
// Copies locales de dépendances corrigées (« overrides » de package.json, 14 nov. 2026) : decode-uri-component est inclus
// dans l'application ; image-size ne sert qu'à Metro (Node), mais le dossier est surveillé pour que la résolution soit la même.
config.watchFolders = [
  path.resolve(__dirname, '../../packages/noyau'),
  path.resolve(__dirname, '../../packages/decode-uri-component'),
  path.resolve(__dirname, '../../packages/image-size-compat'),
];
module.exports = config;
