#!/usr/bin/env node
/**
 * Smoke: insert markdown via (+), save, reload, assert persistence to tab .md.
 * Requires a running Vite server: npm run dev
 * Requires Playwright: npm i -D playwright && npx playwright install chromium
 *
 *   node scripts/smoke-markdown-insert.mjs --url http://127.0.0.1:5173/
 */
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'smoke-markdown-insert: playwright is not installed.\n' +
      '  npm i -D playwright && npx playwright install chromium',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const url = urlIdx >= 0 ? args[urlIdx + 1] : 'http://127.0.0.1:5173/';

const marker = `Smoke finding ${Date.now()}`;

const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--no-sandbox'] });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const gap = page.locator('.dbk-insert-gap-btn').first();
  await gap.evaluate((el) => {
    el.style.opacity = '1';
  });
  await gap.click();

  const textarea = page.locator('.dbk-markdown-textarea');
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  await textarea.fill(`## ${marker}\n\nPersisted via (+).`);
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByText(marker).waitFor({ state: 'visible', timeout: 5000 });

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.getByText(marker).waitFor({ state: 'visible', timeout: 5000 });

  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const bookDir = path.join(fileURLToPath(new URL('..', import.meta.url)), 'src/book');
  const files = fs.readdirSync(bookDir).filter((f) => f.endsWith('.md'));
  const onDisk = files.map((f) => fs.readFileSync(path.join(bookDir, f), 'utf8')).join('\n');
  if (!onDisk.includes(marker)) {
    console.error('smoke-markdown-insert: marker missing from src/book/*.md');
    process.exit(1);
  }

  const banned = await page.locator('text=/Analyst (note|ask|take)/i').count();
  if (banned > 0) {
    console.error('smoke-markdown-insert: found banned Analyst framing in DOM');
    process.exit(1);
  }

  console.log('smoke-markdown-insert: ok — insert, save, reload persisted to src/book/');
} finally {
  await browser.close();
}
