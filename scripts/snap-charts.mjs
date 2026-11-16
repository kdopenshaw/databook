#!/usr/bin/env node
/**
 * Headless chart snapshots via Playwright (same stack as check:visual).
 *
 *   npm run snap -- MonthlyRevenue
 *   npm run snap -- --all
 *
 * Starts a temporary Vite preview server, opens each chart slot, saves PNG
 * under .snaps/, and fails on empty SVG or page console errors.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapsDir = path.join(root, '.snaps');
const args = process.argv.slice(2);

function usage(code = 1) {
  console.error('Usage: npm run snap -- <ChartName|--all>');
  process.exit(code);
}

if (!args.length || args.includes('--help')) usage(args.includes('--help') ? 0 : 1);

const wantAll = args.includes('--all');
const names = wantAll ? [] : args.filter((a) => !a.startsWith('-'));

async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createNetServer();
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

async function listChartsViaVite() {
  const server = await createViteServer({
    root,
    configFile: path.join(root, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    clearScreen: false,
    logLevel: 'error',
  });
  try {
    const { loadBook } = await server.ssrLoadModule('/src/data/loadBook.ts');
    const { uniqueChartNames } = await server.ssrLoadModule('/src/data/parseBook.ts');
    const { listBookCharts } = await server.ssrLoadModule('/src/charts/registry.ts');
    const book = loadBook();
    return { bookNames: uniqueChartNames(book), allFiles: listBookCharts() };
  } finally {
    await server.close();
  }
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'snap: playwright is not installed.\n  npm i -D playwright && npx playwright install chromium',
  );
  process.exit(1);
}

const { bookNames, allFiles } = await listChartsViaVite();
const targets = wantAll ? bookNames : names;
if (!targets.length) {
  console.error('snap: no charts to capture');
  process.exit(1);
}
for (const name of targets) {
  if (!allFiles.includes(name)) {
    console.error(`snap: unknown chart "${name}" (no src/charts/${name}.tsx)`);
    process.exit(1);
  }
  if (!bookNames.includes(name)) {
    console.error(`snap: chart "${name}" is not referenced in any tab markdown`);
    process.exit(1);
  }
}

mkdirSync(snapsDir, { recursive: true });

const build = spawnSync('npx', ['vite', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' },
});
if (build.status !== 0) {
  console.error('snap: vite build failed');
  process.exit(build.status ?? 1);
}

const port = await freePort();
const preview = spawn(
  'npx',
  ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: root, stdio: 'pipe', shell: true, detached: true },
);

function waitForServer(url, ms = 30000) {
  const start = Date.now();
  return (async () => {
    while (Date.now() - start < ms) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (res.ok || res.status === 404) return;
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`preview server did not start at ${url}`);
  })();
}

const base = `http://127.0.0.1:${port}/`;
let exitCode = 0;
try {
  await waitForServer(base);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 800));

    // Ensure every tab is visited so chart slots mount (pages/tabs may lazy-hide).
    const tabButtons = page.locator('.dbk-tabs-trigger');
    const tabCount = await tabButtons.count();
    for (let i = 0; i < tabCount; i++) {
      await tabButtons.nth(i).click().catch(() => {});
      await new Promise((r) => setTimeout(r, 200));
    }

    let failed = false;
    for (const name of targets) {
      consoleErrors.length = 0;
      // Click through tabs until the chart is visible
      let slot = page.locator(`[data-chart="${name}"]`).first();
      if (!(await slot.count())) {
        for (let i = 0; i < tabCount; i++) {
          await tabButtons.nth(i).click().catch(() => {});
          await new Promise((r) => setTimeout(r, 300));
          slot = page.locator(`[data-chart="${name}"]`).first();
          if (await slot.count()) break;
        }
      }
      if (!(await slot.count())) {
        console.error(`snap: ${name}: chart slot not found in DOM`);
        failed = true;
        continue;
      }
      await slot.scrollIntoViewIfNeeded();
      await new Promise((r) => setTimeout(r, 400));

      const empty = await slot.getAttribute('data-empty');
      if (empty === 'true') {
        console.error(`snap: ${name}: empty chart (data-empty)`);
        failed = true;
        continue;
      }

      const svgOk = await slot.evaluate((el) => {
        const svg = el.querySelector('svg');
        if (!svg) return false;
        const box = svg.getBoundingClientRect();
        if (box.width < 2 || box.height < 2) return false;
        // Reject completely empty SVGs (no painted children).
        return svg.childElementCount > 0;
      });
      if (!svgOk) {
        console.error(`snap: ${name}: empty or missing SVG`);
        failed = true;
        continue;
      }

      if (consoleErrors.length) {
        console.error(`snap: ${name}: console errors:\n- ${consoleErrors.join('\n- ')}`);
        failed = true;
        continue;
      }

      const out = path.join(snapsDir, `${name}.png`);
      await slot.screenshot({ path: out });
      console.log(`snap: ${name} → ${path.relative(root, out)}`);
    }

    // Marker so empty .snaps/ isn't mysterious
    writeFileSync(path.join(snapsDir, '.gitkeep'), '');

    if (failed) {
      exitCode = 1;
    } else {
      console.log(`snap: ok (${targets.length} chart${targets.length === 1 ? '' : 's'})`);
    }
  } finally {
    await browser.close();
  }
} catch (err) {
  console.error(`snap: ${err instanceof Error ? err.message : err}`);
  exitCode = 1;
} finally {
  try {
    if (preview.pid) process.kill(-preview.pid, 'SIGTERM');
  } catch {
    try {
      preview.kill('SIGKILL');
    } catch {
      // ignore
    }
  }
}

process.exit(exitCode);
