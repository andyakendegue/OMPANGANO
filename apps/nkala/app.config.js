// Fichiers Firebase natifs, non versionnés : sur EAS, variables d'environnement de type « fichier »
// GOOGLE_SERVICES_JSON (Android) et GOOGLE_SERVICE_INFO_PLIST (iOS) ; en local, les fichiers du dossier (ignorés par git).
module.exports = ({ config }) => ({
  ...config,
  ios: { ...config.ios, googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist' },
  android: { ...config.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json' },
});
