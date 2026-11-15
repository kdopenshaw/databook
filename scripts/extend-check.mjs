#!/usr/bin/env node
/**
 * Back-compat wrapper: artifact presence only.
 * Prefer `npm run ok` (artifacts + live lint + query smoke) every exploratory round.
 *
 * Usage: npm run extend-check
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [path.join(root, 'scripts/ok-book.mjs'), '--artifacts-only'], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
