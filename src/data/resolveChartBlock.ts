import type { BookDocument, ChartBlock } from './types';
import { collectBlocks } from './chartLint';

/** Resolve `ref` to a concrete chart block (title/subtitle/notes/flex may override). */
export function resolveChartBlock(book: BookDocument, block: ChartBlock): ChartBlock {
  if (!block.ref) {
    if (!block.recharts || !block.query) {
      throw new Error(`Chart "${block.id}" is missing recharts/query and has no ref`);
    }
    return block as ChartBlock & { recharts: NonNullable<ChartBlock['recharts']>; query: NonNullable<ChartBlock['query']> };
  }
  const target = collectBlocks(book).find((b) => b.id === block.ref && !b.ref);
  if (!target?.recharts || !target.query) {
    throw new Error(`Chart "${block.id}" ref "${block.ref}" not found (or points at another ref)`);
  }
  return {
    ...target,
    id: block.id,
    title: block.title || target.title,
    subtitle: block.subtitle ?? target.subtitle,
    notes: block.notes ?? target.notes,
    flex: block.flex ?? target.flex,
    ref: undefined,
  };
}
