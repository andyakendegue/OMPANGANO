const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
// Le noyau partagé est hors du dossier de l'application.
config.watchFolders = [path.resolve(__dirname, '../../packages/noyau')];
module.exports = config;
