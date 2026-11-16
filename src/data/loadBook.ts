import { ensureDefaultPage, normalizePageTabIds } from './bookEdits';
import { buildBookFromFiles, isTabMarkdownFile } from './parseBook';
import type { BookDocument } from './types';

const bookYamlModule = import.meta.glob('../book/book.yaml', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const tabModules = import.meta.glob('../book/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function rawBookYaml(): string {
  const entry = Object.entries(bookYamlModule)[0];
  if (!entry?.[1]) throw new Error('missing src/book/book.yaml');
  return entry[1];
}

function tabFileInputs(): { filename: string; raw: string }[] {
  return Object.entries(tabModules)
    .map(([path, raw]) => {
      const filename = path.split('/').pop() ?? path;
      return { filename, raw };
    })
    .filter((f) => isTabMarkdownFile(f.filename));
}

/** Load the book from `src/book/` (Vite raw imports — HMR on edit). */
export function loadBook(): BookDocument {
  const book = buildBookFromFiles(rawBookYaml(), tabFileInputs());
  return ensureDefaultPage(normalizePageTabIds(book));
}
