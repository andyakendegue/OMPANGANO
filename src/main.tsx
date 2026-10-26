import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initOfflineServiceWorker } from './services/pwaOfflineManager';

// Initialize Service Worker & immediate CacheStorage warmup for iOS Safari Airplane Mode
initOfflineServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
