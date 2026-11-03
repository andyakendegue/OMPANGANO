import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initOfflineServiceWorker } from './services/pwaOfflineManager';
import { installerProtectionCopie } from './services/protectionCopie';
import { installerSignalementErreurs } from './services/erreurs';

installerProtectionCopie();
installerSignalementErreurs();

// Initialize Service Worker & immediate CacheStorage warmup for iOS Safari Airplane Mode
initOfflineServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
