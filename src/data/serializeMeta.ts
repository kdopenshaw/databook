import { stringify as stringifyYaml } from 'yaml';
import type { BookDocument } from './types';

/** Serialize book-level metadata for `src/book/book.yaml`. */
export function serializeBookYaml(book: BookDocument): string {
  const meta = {
    title: book.title,
    experimentId: book.experimentId,
    description: book.description,
    generatedAt: book.generatedAt,
    defaultTabId: book.defaultTabId,
    pages: book.pages,
    conventions: book.conventions,
  };
  return stringifyYaml(meta);
}
