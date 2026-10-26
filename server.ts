import { execSync } from 'child_process';
import express from 'express';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = import.meta.dirname || path.resolve('.');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const PORT = Number(process.env.PORT) || 3000;

/**
 * Ensures the production bundle (`dist/`) is freshly built so all browsers
 * (Firefox Desktop, Android Default Browser, iOS Safari) receive a deterministic
 * 2-file bundle (`/assets/index-*.js` + `/assets/index-*.css`) and pre-populated `/sw.js`
 * with zero dev-mode WebSocket loops or 65-file ES module chains.
 */
function ensureFreshProductionBuild() {
  try {
    console.log('[OMPAGANO Server] Building production offline-first bundle...');
    execSync('npx vite build', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (err) {
    console.error('[OMPAGANO Server] Build warning:', err);
  }
}

ensureFreshProductionBuild();

const app = express();
app.disable('x-powered-by');
app.disable('etag');

// Strip Vary headers so Firefox, Safari, and Android CacheStorage match every response cleanly
app.use((_req, res, next) => {
  const origSetHeader = res.setHeader.bind(res);
  res.setHeader = (name: string, value: number | string | readonly string[]) => {
    if (name.toLowerCase() === 'vary') {
      return res;
    }
    return origSetHeader(name, value);
  };
  next();
});

// Serve Service Worker, Offline Manifest, and Version Info with strict no-cache headers
app.get(['/sw.js', '/__ompagano_manifest.json', '/version.json', '/manifest.webmanifest'], (req, res) => {
  const filePath = path.join(DIST_DIR, req.path);
  if (!fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }

  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
  } else if (req.path.endsWith('.webmanifest')) {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  } else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(fs.readFileSync(filePath));
});

// Serve hashed static bundles and assets from dist/
app.use(
  express.static(DIST_DIR, {
    index: false,
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`) && /\.(js|css)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  })
);

// SPA Fallback: Always return clean 200 OK index.html (never redirect)
app.get('*', (_req, res) => {
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(fs.readFileSync(indexHtmlPath));
  } else {
    res.status(503).send('Building application...');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[OMPAGANO Server] Production Offline-First Server listening on http://0.0.0.0:${PORT}`);
});
