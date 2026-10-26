import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

const ROOT_DIR = import.meta.dirname || path.resolve('.');

/**
 * Recursively collects source files for dev-mode manifest fallback
 */
function collectDevSourceUrls(dir: string, urlPrefix: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const urls: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relUrl = `${urlPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      urls.push(...collectDevSourceUrls(fullPath, relUrl));
    } else if (/\.(ts|tsx|js|jsx|css|json)$/i.test(entry.name)) {
      urls.push(relUrl);
    }
  }
  return urls;
}

/**
 * Collects Vite pre-bundled dependency URLs with their exact `?v=<browserHash>` query
 */
function collectViteOptimizedDepUrls(): string[] {
  const depsMetaPath = path.resolve(ROOT_DIR, 'node_modules/.vite/deps/_metadata.json');
  if (!fs.existsSync(depsMetaPath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(depsMetaPath, 'utf-8'));
    const browserHash = raw.browserHash || '';
    const suffix = browserHash ? `?v=${browserHash}` : '';
    const urls: string[] = [];

    if (raw.optimized && typeof raw.optimized === 'object') {
      for (const dep of Object.values(raw.optimized) as Array<{ file?: string }>) {
        if (dep?.file) {
          urls.push(`/node_modules/.vite/deps/${dep.file}${suffix}`);
        }
      }
    }
    if (raw.chunks && typeof raw.chunks === 'object') {
      for (const chunk of Object.values(raw.chunks) as Array<{ file?: string }>) {
        if (chunk?.file) {
          urls.push(`/node_modules/.vite/deps/${chunk.file}${suffix}`);
        }
      }
    }
    return urls;
  } catch {
    return [];
  }
}

/**
 * Universal Offline Plugin for OMPAGANO NKALA APP:
 * - In `build` mode:
 *   1. Strips `crossorigin` attributes from same-origin `<script>` and `<link>` tags in `dist/index.html`
 *      so Firefox, Android Browser, and iOS Safari match cached bundles without CORS credentials mismatches.
 *   2. Collects all built assets in `dist/`, prioritizing critical `.js` and `.css` bundles first.
 *   3. Injects `INJECTED_MANIFEST` into `dist/sw.js` and writes `dist/__ompagano_manifest.json` & `dist/version.json`.
 * - In `serve` (dev) mode:
 *   1. Removes `Vary: Origin` so browser CacheStorage never misses on dev modules.
 *   2. Serves `/__ompagano_manifest.json` and dynamically injects the dev module list into `/sw.js`.
 */
function ompaganoUniversalOfflinePlugin(): Plugin {
  return {
    name: 'ompagano-universal-offline-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Strip Vary: Origin header on responses so Firefox/Safari CacheStorage matches cleanly
        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = (name: string, value: number | string | readonly string[]) => {
          if (name.toLowerCase() === 'vary') {
            return res;
          }
          return origSetHeader(name, value);
        };

        const reqUrl = (req.url || '').split('?')[0];

        const buildDevManifestList = (): string[] => {
          const set = new Set<string>([
            '/',
            '/index.html',
            '/@vite/client',
            '/node_modules/vite/dist/client/env.mjs',
            '/firebase-applet-config.json?import',
            '/manifest.webmanifest',
            '/icon.svg',
            '/apple-touch-icon.png',
            '/pwa-192x192.png',
            '/pwa-512x192.png'.replace('512x192', '512x512'),
            '/pwa-maskable-512x512.png',
            '/assets/aistudio/LOGO-symbole_1c65e221.png',
            '/assets/aistudio/LOGO_c7de06c8.jpg',
            ...collectViteOptimizedDepUrls(),
            ...collectDevSourceUrls(path.resolve(ROOT_DIR, 'src'), '/src'),
          ]);

          for (const modUrl of server.moduleGraph.urlToModuleMap.keys()) {
            if (modUrl && modUrl.startsWith('/') && !modUrl.includes('version.json')) {
              set.add(modUrl);
            }
          }
          return Array.from(set);
        };

        if (reqUrl === '/__ompagano_manifest.json') {
          const assets = buildDevManifestList();
          res.statusCode = 200;
          origSetHeader('Content-Type', 'application/json; charset=utf-8');
          origSetHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
          res.end(JSON.stringify({ version: 'dev', buildTime: Date.now(), assets }));
          return;
        }

        if (reqUrl === '/sw.js') {
          const publicSwPath = path.resolve(ROOT_DIR, 'public/sw.js');
          if (fs.existsSync(publicSwPath)) {
            const assets = buildDevManifestList();
            const swSource = fs.readFileSync(publicSwPath, 'utf-8');
            const injectedSw = swSource.replace('self.__WB_MANIFEST || []', JSON.stringify(assets));
            res.statusCode = 200;
            origSetHeader('Content-Type', 'application/javascript; charset=utf-8');
            origSetHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
            origSetHeader('Service-Worker-Allowed', '/');
            res.end(injectedSw);
            return;
          }
        }

        next();
      });
    },
    closeBundle: {
      sequential: true,
      order: 'post',
      handler() {
        const distDir = path.resolve(ROOT_DIR, 'dist');
        const publicSwPath = path.resolve(ROOT_DIR, 'public/sw.js');
        const distSwPath = path.resolve(distDir, 'sw.js');
        const distIndexHtmlPath = path.resolve(distDir, 'index.html');

        if (!fs.existsSync(distDir) || !fs.existsSync(publicSwPath)) return;

        // 1. Clean same-origin `crossorigin` attributes from dist/index.html so Firefox/Safari/Android
        // fetch `/assets/index-*.js` and `/assets/index-*.css` with standard same-origin credentials.
        if (fs.existsSync(distIndexHtmlPath)) {
          let html = fs.readFileSync(distIndexHtmlPath, 'utf-8');
          html = html
            .replace(/<script type="module" crossorigin src="(\/assets\/[^"]+)"><\/script>/g, '<script type="module" src="$1"></script>')
            .replace(/<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+)">/g, '<link rel="stylesheet" href="$1">');
          fs.writeFileSync(distIndexHtmlPath, html, 'utf-8');
        }

        // 2. Collect all files in dist/ recursively
        const walkFiles = (dir: string, base = ''): string[] => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          const results: string[] = [];
          for (const entry of entries) {
            const relPath = base ? `${base}/${entry.name}` : entry.name;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              results.push(...walkFiles(fullPath, relPath));
            } else if (
              /\.(js|css|html|png|jpg|jpeg|svg|ico|webmanifest|woff|woff2)$/i.test(entry.name) &&
              entry.name !== 'sw.js' &&
              entry.name !== 'workbox-sw.js' &&
              !entry.name.startsWith('workbox-')
            ) {
              results.push('/' + relPath.replace(/\\/g, '/'));
            }
          }
          return results;
        };

        const rawAssets = walkFiles(distDir);

        // Prioritize critical execution files (HTML, CSS, JS, manifest, SVG) BEFORE images
        const priorityScore = (u: string): number => {
          if (u === '/index.html' || u === '/') return 0;
          if (u.endsWith('.css')) return 1;
          if (u.endsWith('.js')) return 2;
          if (u.endsWith('.webmanifest') || u.endsWith('.svg')) return 3;
          return 4;
        };
        const builtAssets = rawAssets.sort((a, b) => priorityScore(a) - priorityScore(b));

        // 3. Inject manifest into dist/sw.js
        const swSource = fs.readFileSync(publicSwPath, 'utf-8');
        const injectedSw = swSource.replace('self.__WB_MANIFEST || []', JSON.stringify(builtAssets));
        fs.writeFileSync(distSwPath, injectedSw, 'utf-8');

        // 4. Write dist/__ompagano_manifest.json for main-thread CacheStorage warmup
        const buildTimestamp = Date.now();
        const versionString = `2.5.${buildTimestamp}`;
        fs.writeFileSync(
          path.resolve(distDir, '__ompagano_manifest.json'),
          JSON.stringify(
            {
              version: versionString,
              buildTime: buildTimestamp,
              assets: builtAssets,
            },
            null,
            2
          ),
          'utf-8'
        );

        // 5. Update dist/version.json
        fs.writeFileSync(
          path.resolve(distDir, 'version.json'),
          JSON.stringify(
            {
              version: versionString,
              buildTime: buildTimestamp,
              builtAt: new Date().toISOString(),
            },
            null,
            2
          ),
          'utf-8'
        );
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      ompaganoUniversalOfflinePlugin(),
    ],
    resolve: {
      alias: {
        '@': ROOT_DIR,
      },
    },
    build: {
      chunkSizeWarningLimit: 2500,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
