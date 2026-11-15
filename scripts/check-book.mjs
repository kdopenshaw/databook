#!/usr/bin/env node
/**
 * Lightweight book check for agents (P1.7).
 *
 * Usage:
 *   node scripts/check-book.mjs                  # lint rows.json via vitest chartLint
 *   node scripts/check-book.mjs --url http://127.0.0.1:5173/
 *
 * Screenshot recipe (exits cleanly despite Vite HMR):
 *   timeout 20s chromium --headless --disable-gpu --screenshot=out.png \
 *     --window-size=1280,800 --user-data-dir=/tmp/db-chrome-$$ \
 *     'http://127.0.0.1:5173/?tab=overview'
 * Or CDP with an explicit process timeout — never wait forever on the HMR socket.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const url = urlIdx >= 0 ? args[urlIdx + 1] : null;

const lint = spawnSync('npm', ['run', 'lint:charts'], { cwd: root, stdio: 'inherit', shell: true });
if (lint.status !== 0) process.exit(lint.status ?? 1);

if (url) {
  const ctrl = AbortSignal.timeout(8000);
  try {
    const res = await fetch(url, { signal: ctrl });
    if (!res.ok) {
      console.error(`check-book: ${url} → HTTP ${res.status}`);
      process.exit(1);
    }
    console.log(`check-book: ${url} → HTTP ${res.status}`);
  } catch (err) {
    console.error(`check-book: failed to fetch ${url}:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

console.log('check-book: ok');
