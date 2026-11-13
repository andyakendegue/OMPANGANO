/**
 * Configuration Firebase du client (projet enenga). La clé API n'est pas versionnée :
 * EXPO_PUBLIC_FIREBASE_API_KEY vient de apps/nkala/.env.local (ignoré par git) ou des variables d'environnement EAS.
 * Les autres champs sont des identifiants publics. Après une régénération de la clé, changer seulement la variable.
 */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  oAuthClientId: '859400798745-l2n59unf6udem2scsb0mvf8tjdgcat5m.apps.googleusercontent.com',
  recaptchaSiteKey: '',
  authDomain: 'enenga.firebaseapp.com',
  databaseURL: 'https://enenga-default-rtdb.firebaseio.com',
  projectId: 'enenga',
  storageBucket: 'enenga.appspot.com',
  messagingSenderId: '743429299872',
  appId: '1:743429299872:web:ad274efc1eaebd378733c5',
  measurementId: 'G-7ZH6NPBVYC',
};
if (!firebaseConfig.apiKey) console.warn('[firebase] EXPO_PUBLIC_FIREBASE_API_KEY manquante : la connexion Google ne marchera pas.');
export default firebaseConfig;
