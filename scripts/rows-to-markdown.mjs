#!/usr/bin/env node
/**
 * One-off / reusable: convert a legacy rows.json BookDocument into src/book/.
 *
 *   node scripts/rows-to-markdown.mjs [path/to/rows.json] [--out src/book]
 *
 * Writes book.yaml + NN-<id>.md tab files. Chart title/query stay in rows.json
 * during conversion only long enough to print a checklist of meta to move into
 * each chart file (stdout). Prefer running against a book that already has
 * chart components; then move query/title into each chart's `meta` export.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify as stringifyYaml } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = path.resolve(root, outIdx >= 0 ? args[outIdx + 1] : 'src/book');
const rowsPath = path.resolve(
  root,
  args.find((a, i) => !a.startsWith('-') && (outIdx < 0 || i !== outIdx + 1)) ?? 'src/data/rows.json',
);

if (!existsSync(rowsPath)) {
  console.error(`rows-to-markdown: missing ${rowsPath}`);
  process.exit(1);
}

const book = JSON.parse(readFileSync(rowsPath, 'utf8'));
mkdirSync(outDir, { recursive: true });

const meta = {
  title: book.title,
  experimentId: book.experimentId,
  description: book.description,
  generatedAt: book.generatedAt,
  defaultTabId: book.defaultTabId,
  pages: book.pages,
  conventions: book.conventions,
};
writeFileSync(path.join(outDir, 'book.yaml'), stringifyYaml(meta), 'utf8');

const tabs = [...(book.tabs ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
const chartMetaHints = [];

tabs.forEach((tab, i) => {
  const page =
    book.pages?.find((p) => p.tabIds?.includes(tab.id))?.id ?? undefined;
  const fm = [`id: ${JSON.stringify(tab.id)}`, `label: ${JSON.stringify(tab.label)}`];
  if (page) fm.push(`page: ${JSON.stringify(page)}`);

  const parts = [];
  const rows = [...(tab.rows ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const row of rows) {
    if (row.type === 'markdown') {
      const body = String(row.body ?? '').replace(/^\n+/, '').replace(/\n+$/, '');
      if (body) parts.push(body);
    } else if (row.type === 'component') {
      const lines = (row.components ?? []).map((c) => {
        chartMetaHints.push({
          component: c.component,
          title: c.title,
          subtitle: c.subtitle,
          notes: c.notes,
          query: c.query,
          legacyId: c.id,
        });
        const name = c.component;
        if (!name) throw new Error(`component row ${row.id} missing component name`);
        return c.flex !== undefined && c.flex !== 1 ? `${name} ${c.flex}` : name;
      });
      parts.push(['```chart', ...lines, '```'].join('\n'));
    }
  }

  const pad = String(i + 1).padStart(2, '0');
  const slug = String(tab.id).replace(/[^a-zA-Z0-9_-]+/g, '-');
  const filename = `${pad}-${slug}.md`;
  const content = `---\n${fm.join('\n')}\n---\n\n${parts.length ? `${parts.join('\n\n')}\n` : ''}`;
  writeFileSync(path.join(outDir, filename), content, 'utf8');
  console.error(`wrote ${path.relative(root, path.join(outDir, filename))}`);
});

console.error(`wrote ${path.relative(root, path.join(outDir, 'book.yaml'))}`);
console.log(JSON.stringify({ chartMetaHints }, null, 2));
console.error(
  'rows-to-markdown: done. Move each chartMetaHints entry into src/charts/<Name>.tsx as `export const meta`.',
);
