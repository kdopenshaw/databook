import { serializeTabFile } from './parseBook';
import type { BookDocument, ContentBlock, MarkdownBlock, TabSection } from './types';

function newBlockId(prefix = 'md'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

function replaceTab(book: BookDocument, tabId: string, nextTab: TabSection): BookDocument {
  return {
    ...book,
    tabs: book.tabs.map((t) => (t.id === tabId ? nextTab : t)),
  };
}

/**
 * Insert a markdown block into a tab.
 * `afterBlockId`: `null` = start; a block id = after that block; `'end'` = end.
 */
export function insertMarkdownBlock(
  book: BookDocument,
  tabId: string,
  afterBlockId: string | null | 'end' = 'end',
  body = '',
): { book: BookDocument; block: MarkdownBlock; tab: TabSection } {
  const tab = book.tabs.find((t) => t.id === tabId);
  if (!tab) throw new Error(`insertMarkdownBlock: unknown tab "${tabId}"`);

  const block: MarkdownBlock = {
    type: 'markdown',
    id: newBlockId('md'),
    body,
    editing: true,
  };

  let insertAt = tab.blocks.length;
  if (afterBlockId === null) {
    insertAt = 0;
  } else if (afterBlockId === 'end') {
    insertAt = tab.blocks.length;
  } else {
    const idx = tab.blocks.findIndex((b) => b.id === afterBlockId);
    if (idx < 0) throw new Error(`insertMarkdownBlock: unknown block "${afterBlockId}"`);
    insertAt = idx + 1;
  }

  const blocks: ContentBlock[] = [
    ...tab.blocks.slice(0, insertAt),
    block,
    ...tab.blocks.slice(insertAt),
  ];
  const nextTab = { ...tab, blocks };
  return { book: replaceTab(book, tabId, nextTab), block, tab: nextTab };
}

export function updateMarkdownBody(
  book: BookDocument,
  tabId: string,
  blockId: string,
  body: string,
): BookDocument {
  const tab = book.tabs.find((t) => t.id === tabId);
  if (!tab) return book;
  const blocks = tab.blocks.map((b) => {
    if (b.id !== blockId || b.type !== 'markdown') return b;
    return { ...b, body, editing: false };
  });
  return replaceTab(book, tabId, { ...tab, blocks });
}

export function removeMarkdownBlock(book: BookDocument, tabId: string, blockId: string): BookDocument {
  const tab = book.tabs.find((t) => t.id === tabId);
  if (!tab) return book;
  return replaceTab(book, tabId, {
    ...tab,
    blocks: tab.blocks.filter((b) => b.id !== blockId),
  });
}

/** Full on-disk contents for a tab after in-memory edits. */
export function tabFileContents(tab: TabSection): string {
  return serializeTabFile(tab);
}

/** @deprecated alias */
export const insertMarkdownRow = insertMarkdownBlock;
export const removeMarkdownRow = removeMarkdownBlock;
