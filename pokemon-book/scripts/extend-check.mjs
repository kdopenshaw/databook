#!/usr/bin/env node
/**
 * Fail-closed extend-path gate (P0.b).
 * Verifies the book target has the artifacts agents must re-read before chart commits.
 * Does not prove the agent opened create-viz — that stays a SKILL checklist item —
 * but blocks extend work when understanding.md / conventions / check script are missing.
 *
 * Usage (from book root): npm run extend-check
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
      errors.push('rows.json missing BookDocument.conventions — set before chart commits (cold agents inherit them)');
    }
  } catch (err) {
    errors.push(`rows.json parse failed: ${err instanceof Error ? err.message : err}`);
  }
}

const checkScript = path.join(root, 'scripts/check-book.mjs');
if (!existsSync(checkScript)) {
  errors.push('missing scripts/check-book.mjs — copy scripts/ from scaffold (npm run check must work)');
}

const pkgPath = path.join(root, 'package.json');
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts?.check) errors.push('package.json missing "check" script');
  if (!pkg.scripts?.['lint:charts']) errors.push('package.json missing "lint:charts" script');
}

if (errors.length) {
  console.error('extend-check FAILED:\n- ' + errors.join('\n- '));
  console.error('\nSKILL fail-closed checklist: understanding.md → conventions → validate-data/create-viz → lint → npm run check');
  process.exit(1);
}

console.log('extend-check: ok (understanding.md + conventions + check script present)');
console.log('Still required before chart commits: open validate-data + create-viz pointers (see SKILL.md).');
