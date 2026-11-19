#!/usr/bin/env node
/**
 * Exploratory single gate: artifacts + query nonempty smoke.
 *
 *   npm run ok
 *   npm run validate          # alias
 *   npm run check             # alias → ok
 *   node scripts/ok-book.mjs --artifacts-only
 *
 * Does not run Playwright / check:visual. Does not run the full vitest suite.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const artifactsOnly = args.includes('--artifacts-only');

function checkArtifacts() {
  const errors = [];

  const understanding = path.join(root, 'src/data/understanding.md');
  if (!existsSync(understanding)) {
    errors.push('missing src/data/understanding.md — read/create grain + caveats before extending');
  }

  const rowsPath = path.join(root, 'src/data/rows.json');
  if (!existsSync(rowsPath)) {
    errors.push('missing src/data/rows.json');
  } else {
    try {
      const book = JSON.parse(readFileSync(rowsPath, 'utf8'));
      if (!book.conventions) {
        errors.push(
          'rows.json missing BookDocument.conventions — set before chart commits (cold agents inherit them)',
        );
      }
    } catch (err) {
      errors.push(`rows.json parse failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  const canonicalPath = path.join(root, 'src/data/canonical.json');
  if (!existsSync(canonicalPath)) {
    errors.push(
      'missing src/data/canonical.json — runtime table; rebuild from src/data/transforms/ if gitignored',
    );
  } else {
    const maxBytes = 100 * 1024;
    const size = readFileSync(canonicalPath).byteLength;
    if (size > maxBytes) {
      errors.push(
        `canonical.json is ${Math.round(size / 1024)}KB (limit ${Math.round(maxBytes / 1024)}KB) — write a transform, gitignore the built table, do not commit a pretty fact dump`,
      );
    }
  }

  const okScript = path.join(root, 'scripts/ok-book.mjs');
  if (!existsSync(okScript)) {
    errors.push('missing scripts/ok-book.mjs — copy scripts/ from scaffold');
  }

  const checkScript = path.join(root, 'scripts/check-book.mjs');
  if (!existsSync(checkScript)) {
    errors.push('missing scripts/check-book.mjs — needed for optional check:visual');
  }

  const pkgPath = path.join(root, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.scripts?.ok) errors.push('package.json missing "ok" script');
  }

  return errors;
}

const artifactErrors = checkArtifacts();
if (artifactErrors.length) {
  console.error('ok FAILED (artifacts):\n- ' + artifactErrors.join('\n- '));
  process.exit(1);
}

if (artifactsOnly) {
  console.log('ok: artifacts present (understanding.md + conventions + canonical + scripts)');
  process.exit(0);
}

const live = spawnSync(
  'npx',
  ['vitest', 'run', '--config', 'vitest.ok.config.ts'],
  { cwd: root, stdio: 'inherit', shell: true },
);
if (live.status !== 0) {
  process.exit(live.status ?? 1);
}

console.log('ok: query smoke passed');
