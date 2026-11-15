#!/usr/bin/env node
/**
 * Book check for agents (blocking in extend path step 6).
 *
 * Usage:
 *   npm run check                         # lint:charts (required)
 *   npm run check -- --url http://127.0.0.1:5173/
 *   npm run check:visual -- --url http://127.0.0.1:5173/
 *   node scripts/check-book.mjs --screenshot /tmp/book.png --url http://127.0.0.1:5173/
 *
 * Visual QA tries Playwright when installed (`npx playwright`), else falls back to
 * a timed Chromium headless screenshot. Always use an explicit process timeout —
 * never wait forever on the Vite HMR socket.
 *
 * Chromium fallback recipe:
 *   timeout 20s chromium --headless --disable-gpu --screenshot=out.png \
 *     --window-size=1280,800 --user-data-dir=/tmp/db-chrome-$$ \
 *     'http://127.0.0.1:5173/?tab=overview'
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function flagValue(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const url = flagValue('--url');
const screenshot = flagValue('--screenshot');
const wantVisual = args.includes('--visual') || Boolean(screenshot);

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

async function screenshotWithPlaywright(targetUrl, outPath) {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`check-book: playwright screenshot → ${outPath}`);
      return true;
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.warn(
      `check-book: playwright unavailable (${err instanceof Error ? err.message : err}); trying chromium fallback`,
    );
    return false;
  }
}

function screenshotWithChromium(targetUrl, outPath) {
  const chromiums = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  const bin = chromiums.find((c) => {
    const which = spawnSync('which', [c], { encoding: 'utf8' });
    return which.status === 0;
  });
  if (!bin) {
    console.error('check-book: no chromium binary found for screenshot fallback');
    return false;
  }
  const userData = `/tmp/db-chrome-${process.pid}`;
  const result = spawnSync(
    'timeout',
    [
      '20s',
      bin,
      '--headless',
      '--disable-gpu',
      `--screenshot=${outPath}`,
      '--window-size=1280,800',
      `--user-data-dir=${userData}`,
      targetUrl,
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0 || !existsSync(outPath)) {
    console.error(`check-book: chromium screenshot failed (exit ${result.status})`);
    return false;
  }
  console.log(`check-book: chromium screenshot → ${outPath}`);
  return true;
}

if (wantVisual) {
  if (!url) {
    console.error('check-book: --visual / --screenshot requires --url');
    process.exit(1);
  }
  const out = screenshot ?? path.join(root, 'check-book-screenshot.png');
  const ok = (await screenshotWithPlaywright(url, out)) || screenshotWithChromium(url, out);
  if (!ok) process.exit(1);
}

console.log('check-book: ok');
