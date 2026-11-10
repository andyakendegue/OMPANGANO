// Retire l'entitlement « aps-environment » (notifications push) tant que le compte Apple Developer payant n'est pas actif.
// Pour réactiver les notifications : supprimer ce plugin de app.json et ajouter ["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#C85A32" }].
const { withEntitlementsPlist } = require('expo/config-plugins');
module.exports = (config) => withEntitlementsPlist(config, (c) => { delete c.modResults['aps-environment']; return c; });
