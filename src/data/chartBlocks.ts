import { uniqueChartNames } from './parseBook';
import type { BookDocument } from './types';

/** Unique chart component names referenced from tab markdown. */
export function collectChartNames(book: BookDocument): string[] {
  return uniqueChartNames(book);
}
