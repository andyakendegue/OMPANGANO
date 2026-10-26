import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register the PWA Service Worker immediately so the app works 100% offline (Airplane Mode)
registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('[PWA] OMPAGANO est prêt à fonctionner hors-ligne (Mode Avion supporté).');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

