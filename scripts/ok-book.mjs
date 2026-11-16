#!/usr/bin/env node
/**
 * Gate: artifacts + tab parse + chart resolve + query smoke + unused charts.
 *
 *   npm run ok
 *   node scripts/ok-book.mjs --artifacts-only
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const artifactsOnly = args.includes('--artifacts-only');

function checkArtifacts() {
  const errors = [];

  const understanding = path.join(root, 'src/data/understanding.md');
  if (!existsSync(understanding)) {
    errors.push('missing src/data/understanding.md — read/create grain + caveats before extending');
  }

  const bookYaml = path.join(root, 'src/book/book.yaml');
  if (!existsSync(bookYaml)) {
    errors.push('missing src/book/book.yaml');
  } else {
    try {
      const meta = parseYaml(readFileSync(bookYaml, 'utf8'));
      if (!meta?.conventions) {
        errors.push(
          'book.yaml missing conventions — set before chart commits (cold agents inherit them)',
        );
      }
      if (!meta?.title) errors.push('book.yaml missing title');
    } catch (err) {
      errors.push(`book.yaml parse failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  const bookDir = path.join(root, 'src/book');
  if (existsSync(bookDir)) {
    const tabs = readdirSync(bookDir).filter((f) => /^\d+-.+\.md$/i.test(f));
    if (!tabs.length) errors.push('no tab markdown files (expected src/book/NN-*.md)');
  } else {
    errors.push('missing src/book/');
  }

  const canonicalPath = path.join(root, 'src/data/canonical.json');
  if (!existsSync(canonicalPath)) {
    errors.push('missing src/data/canonical.json');
  }

  const okScript = path.join(root, 'scripts/ok-book.mjs');
  if (!existsSync(okScript)) {
    errors.push('missing scripts/ok-book.mjs — copy scripts/ from scaffold');
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
  console.log('ok: artifacts present (understanding.md + book.yaml + canonical + scripts)');
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

console.log('ok: book structure + query smoke passed');
