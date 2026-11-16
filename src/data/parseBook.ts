import { parse as parseYaml } from 'yaml';
import type {
  BookConventions,
  BookDocument,
  BookPage,
  ChartRef,
  ContentBlock,
  TabSection,
} from './types';

export type BookMetaFile = {
  title: string;
  experimentId?: string;
  description?: string;
  generatedAt?: string;
  defaultTabId?: string;
  pages?: BookPage[];
  conventions?: BookConventions;
};

export type TabFrontMatter = {
  id: string;
  label: string;
  page?: string;
};

const CHART_FENCE = /^```chart[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;

/** Split `---` YAML front matter from the markdown body. */
export function splitFrontMatter(raw: string): { matter: string; body: string } {
  const text = raw.replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) {
    return { matter: '', body: text };
  }
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { matter: '', body: text };
  const after = text.slice(end + 4);
  const body = after.replace(/^\r?\n/, '');
  return { matter: text.slice(4, end).trim(), body };
}

export function parseTabFrontMatter(raw: string): { meta: TabFrontMatter; body: string } {
  const { matter, body } = splitFrontMatter(raw);
  if (!matter) throw new Error('tab file missing YAML front matter (need id + label)');
  const data = parseYaml(matter) as Partial<TabFrontMatter>;
  if (!data?.id || typeof data.id !== 'string') throw new Error('tab front matter needs string id');
  if (!data?.label || typeof data.label !== 'string') throw new Error('tab front matter needs string label');
  return {
    meta: {
      id: data.id,
      label: data.label,
      page: typeof data.page === 'string' ? data.page : undefined,
    },
    body,
  };
}

/** Parse one line of a ```chart block: `Name` or `Name 1.4`. */
export function parseChartLine(line: string): ChartRef | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s+(\d+(?:\.\d+)?))?$/);
  if (!m) {
    throw new Error(`invalid chart line "${trimmed}" (expected ComponentName or ComponentName 1.4)`);
  }
  const flex = m[2] !== undefined ? Number(m[2]) : undefined;
  if (flex !== undefined && !(flex > 0)) throw new Error(`invalid flex on chart line "${trimmed}"`);
  return { name: m[1], flex };
}

/** Parse tab body into markdown / charts blocks (stable synthetic ids). */
export function parseTabBody(body: string, idPrefix = 'b'): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let cursor = 0;
  let index = 0;
  const re = new RegExp(CHART_FENCE.source, CHART_FENCE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const before = body.slice(cursor, match.index);
    if (before.trim().length) {
      const md = before.replace(/^\n+/, '').replace(/\n+$/, '');
      blocks.push({ type: 'markdown', id: `${idPrefix}-${index++}`, body: md });
    }
    const charts: ChartRef[] = [];
    for (const line of match[1].split(/\r?\n/)) {
      const ref = parseChartLine(line);
      if (ref) charts.push(ref);
    }
    if (!charts.length) throw new Error('empty ```chart block');
    blocks.push({ type: 'charts', id: `${idPrefix}-${index++}`, charts });
    cursor = match.index + match[0].length;
  }
  const rest = body.slice(cursor);
  if (rest.trim().length) {
    const md = rest.replace(/^\n+/, '').replace(/\n+$/, '');
    blocks.push({ type: 'markdown', id: `${idPrefix}-${index++}`, body: md });
  }
  return blocks;
}

/** Serialize blocks back to a tab markdown body (no front matter). */
export function serializeTabBody(blocks: ContentBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === 'markdown') {
      const body = block.body.replace(/^\n+/, '').replace(/\n+$/, '');
      if (body.length) parts.push(body);
    } else {
      const lines = block.charts.map((c) =>
        c.flex !== undefined && c.flex !== 1 ? `${c.name} ${c.flex}` : c.name,
      );
      parts.push(['```chart', ...lines, '```'].join('\n'));
    }
  }
  return parts.length ? `${parts.join('\n\n')}\n` : '';
}

export function serializeTabFile(tab: Pick<TabSection, 'id' | 'label' | 'page' | 'blocks'>): string {
  const fm: Record<string, string> = { id: tab.id, label: tab.label };
  if (tab.page) fm.page = tab.page;
  const matter = Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');
  const body = serializeTabBody(tab.blocks);
  return `---\n${matter}\n---\n\n${body}`;
}

/** Filename like `01-overview.md` → order 1 (or 0-based from the number). */
export function orderFromFilename(filename: string): number | null {
  const base = filename.split('/').pop() ?? filename;
  const m = base.match(/^(\d+)-.+\.md$/i);
  if (!m) return null;
  return Number(m[1]);
}

export function isTabMarkdownFile(filename: string): boolean {
  const base = filename.split('/').pop() ?? filename;
  return /^\d+-.+\.md$/i.test(base) && base.toLowerCase() !== 'index.md';
}

export function parseBookMeta(yamlText: string): BookMetaFile {
  const data = parseYaml(yamlText) as BookMetaFile;
  if (!data?.title || typeof data.title !== 'string') {
    throw new Error('book.yaml must include string title');
  }
  return data;
}

export type TabFileInput = { filename: string; raw: string };

/** Build a BookDocument from book.yaml text + tab markdown files. */
export function buildBookFromFiles(metaYaml: string, tabFiles: TabFileInput[]): BookDocument {
  const meta = parseBookMeta(metaYaml);
  const tabs: TabSection[] = [];
  for (const file of tabFiles) {
    const base = file.filename.split('/').pop() ?? file.filename;
    if (!isTabMarkdownFile(base)) continue;
    const order = orderFromFilename(base);
    if (order === null) continue;
    const { meta: fm, body } = parseTabFrontMatter(file.raw);
    const blocks = parseTabBody(body, fm.id);
    tabs.push({
      id: fm.id,
      label: fm.label,
      order,
      page: fm.page,
      sourceFile: base,
      blocks,
    });
  }
  tabs.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  let pages = meta.pages;
  if (pages?.length) {
    // Prefer explicit tabIds; also attach tabs that declare `page:` in front matter.
    const byPage = new Map<string, string[]>();
    for (const p of pages) byPage.set(p.id, [...p.tabIds]);
    for (const tab of tabs) {
      if (!tab.page) continue;
      const list = byPage.get(tab.page) ?? [];
      if (!list.includes(tab.id)) list.push(tab.id);
      byPage.set(tab.page, list);
    }
    pages = pages.map((p) => ({ ...p, tabIds: byPage.get(p.id) ?? p.tabIds }));
  }

  return {
    title: meta.title,
    experimentId: meta.experimentId,
    description: meta.description,
    generatedAt: meta.generatedAt,
    defaultTabId: meta.defaultTabId ?? tabs[0]?.id,
    pages,
    conventions: meta.conventions,
    tabs,
  };
}

/** Chart component names referenced from ```chart blocks (with multiplicity). */
export function collectChartNames(book: BookDocument): string[] {
  const names: string[] = [];
  for (const tab of book.tabs) {
    for (const block of tab.blocks) {
      if (block.type === 'charts') {
        for (const c of block.charts) names.push(c.name);
      }
    }
  }
  return names;
}

export function uniqueChartNames(book: BookDocument): string[] {
  return [...new Set(collectChartNames(book))].sort();
}
