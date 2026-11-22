import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { codexJobsPlugin } from './scripts/codexJobsPlugin.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const rowsJsonPath = path.join(projectRoot, 'src/data/rows.json');

/** Dev-only: persist in-browser edits to the committable `rows.json`. */
function bookPersistPlugin(): Plugin {
  return {
    name: 'databook-persist-book',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/book' || (req.method !== 'PUT' && req.method !== 'POST')) {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
            if (
              !parsed ||
              typeof parsed !== 'object' ||
              !('tabs' in parsed) ||
              !Array.isArray((parsed as { tabs: unknown }).tabs)
            ) {
              throw new Error('body must be a BookDocument with tabs[]');
            }
            fs.writeFileSync(rowsJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), bookPersistPlugin(), codexJobsPlugin(projectRoot)],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['@mdxeditor/editor', '@mdxeditor/floating-selection-ui-plugin', 'react', 'react-dom'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
