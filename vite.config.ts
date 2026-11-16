import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const bookDir = path.join(projectRoot, 'src/book');

function safeBookPath(rel: string): string | null {
  if (!rel || rel.includes('\0') || path.isAbsolute(rel)) return null;
  const normalized = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return null;
  const full = path.join(bookDir, normalized);
  if (!full.startsWith(bookDir + path.sep) && full !== bookDir) return null;
  return full;
}

/** Dev-only: write/delete files under `src/book/` (markdown tabs + book.yaml). */
function bookFilePlugin(): Plugin {
  return {
    name: 'databook-book-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/book/file') {
          next();
          return;
        }

        if (req.method === 'DELETE') {
          try {
            const u = new URL(req.url ?? '', 'http://localhost');
            const rel = u.searchParams.get('path') ?? '';
            const full = safeBookPath(rel);
            if (!full) throw new Error('invalid path');
            if (!full.endsWith('.md') && !full.endsWith('.yaml') && !full.endsWith('.yml')) {
              throw new Error('only .md / .yaml under src/book/');
            }
            if (fs.existsSync(full)) fs.unlinkSync(full);
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
          return;
        }

        if (req.method !== 'PUT' && req.method !== 'POST') {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
              path?: string;
              content?: string;
            };
            if (!parsed?.path || typeof parsed.content !== 'string') {
              throw new Error('body must be { path, content }');
            }
            const full = safeBookPath(parsed.path);
            if (!full) throw new Error('invalid path');
            if (!full.endsWith('.md') && !full.endsWith('.yaml') && !full.endsWith('.yml')) {
              throw new Error('only .md / .yaml under src/book/');
            }
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, parsed.content, 'utf8');
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
  plugins: [react(), bookFilePlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
