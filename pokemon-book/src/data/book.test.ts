import { describe, expect, it } from 'vitest';
import type { BookDocument, ChartBlock } from './types';
import { lintBookErrors } from './chartLint';
import { loadCanonical, getCanonicalMeta } from './loadCanonical';
import { runQuery } from './runQuery';
import bookJson from './rows.json';

const book = bookJson as BookDocument;

const blocks: ChartBlock[] = book.tabs.flatMap((t) =>
  t.rows.flatMap((r) => (r.type === 'component' ? r.components : [])),
);

describe('pokemon book', () => {
  it('passes chart lint', () => {
    expect(lintBookErrors(book)).toEqual([]);
  });

  it('documents conventions and population', () => {
    expect(book.conventions?.population).toMatch(/type_slot/);
    expect(book.conventions?.notes?.length).toBeGreaterThan(0);
    expect(book.conventions?.zeroBaselineBars).not.toBe(false);
  });

  it('has pages that drive the sidebar', () => {
    expect(book.pages?.length).toBeGreaterThanOrEqual(2);
    const pageTabIds = new Set(book.pages!.flatMap((p) => p.tabIds));
    for (const t of book.tabs) {
      expect(pageTabIds.has(t.id), t.id).toBe(true);
    }
    expect(book.pages!.map((p) => p.label)).toEqual(expect.arrayContaining(['Overview', 'Deep dive']));
  });

  it('has scannable tabs including archetypes', () => {
    const labels = book.tabs.map((t) => t.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        'Summary',
        'By type',
        'By generation',
        'Legendary',
        'Distributions',
        'Archetypes',
      ]),
    );
  });

  it('canonical grain is form × type slot', () => {
    const meta = getCanonicalMeta();
    expect(meta.rowCount).toBe(1214);
    const table = loadCanonical();
    const species = table.rows.filter((r) => r.is_primary_form === true && r.type_slot === 'Primary');
    expect(species).toHaveLength(721);
    const glass = species.filter((r) => r.is_glass_cannon === true);
    const tank = species.filter((r) => r.is_tank === true);
    expect(glass.length).toBe(61);
    expect(tank.length).toBe(41);
  });

  it('summary refs resolve to real charts', () => {
    const ids = new Set(blocks.filter((b) => !b.ref).map((b) => b.id));
    for (const b of blocks.filter((b) => b.ref)) {
      expect(ids.has(b.ref!), b.ref).toBe(true);
    }
  });

  it('key queries return rows for species and both-slot types', () => {
    const table = loadCanonical();
    const typeBoth = runQuery(table, {
      filter: [
        { column: 'is_primary_form', op: 'eq', value: true },
        { column: 'legendary', op: 'eq', value: false },
      ],
      groupBy: ['type'],
      aggregate: [{ fn: 'mean', column: 'total', as: 'mean_total' }],
    });
    expect(typeBoth).toHaveLength(18);

    const flying = runQuery(table, {
      filter: [
        { column: 'is_primary_form', op: 'eq', value: true },
        { column: 'legendary', op: 'eq', value: false },
        { column: 'type', op: 'eq', value: 'Flying' },
      ],
      aggregate: [{ fn: 'count', as: 'n' }],
    });
    expect(Number(flying[0].n)).toBeGreaterThan(10);

    const genMeans = runQuery(table, {
      filter: [
        { column: 'is_primary_form', op: 'eq', value: true },
        { column: 'type_slot', op: 'eq', value: 'Primary' },
        { column: 'legendary', op: 'eq', value: false },
      ],
      groupBy: ['generation_label'],
      aggregate: [{ fn: 'mean', column: 'total', as: 'mean_total' }],
    });
    expect(genMeans).toHaveLength(6);

    const arch = runQuery(table, {
      filter: [
        { column: 'is_primary_form', op: 'eq', value: true },
        { column: 'type_slot', op: 'eq', value: 'Primary' },
      ],
      groupBy: ['archetype'],
      aggregate: [{ fn: 'count', as: 'n' }],
    });
    expect(arch.length).toBe(3);
  });
});
