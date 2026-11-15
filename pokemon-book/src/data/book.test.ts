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
    expect(book.conventions?.population).toMatch(/is_primary_form/);
    expect(book.conventions?.notes?.length).toBeGreaterThan(0);
    expect(book.conventions?.zeroBaselineBars).not.toBe(false);
  });

  it('has scannable tabs for the core question', () => {
    const labels = book.tabs.map((t) => t.label);
    expect(labels).toEqual(
      expect.arrayContaining(['Summary', 'By type', 'By generation', 'Legendary', 'Distributions']),
    );
  });

  it('canonical grain is 800 forms with 721 primary', () => {
    const meta = getCanonicalMeta();
    expect(meta.rowCount).toBe(800);
    const table = loadCanonical();
    const primary = table.rows.filter((r) => r.is_primary_form === true);
    expect(primary).toHaveLength(721);
  });

  it('summary refs resolve to real charts', () => {
    const ids = new Set(blocks.filter((b) => !b.ref).map((b) => b.id));
    for (const b of blocks.filter((b) => b.ref)) {
      expect(ids.has(b.ref!), b.ref).toBe(true);
    }
  });

  it('key queries return rows', () => {
    const table = loadCanonical();
    const typeMeans = runQuery(table, {
      filter: [
        { column: 'is_primary_form', op: 'eq', value: true },
        { column: 'legendary', op: 'eq', value: false },
      ],
      groupBy: ['type_1'],
      aggregate: [{ fn: 'mean', column: 'total', as: 'mean_total' }],
    });
    expect(typeMeans).toHaveLength(18);

    const genMeans = runQuery(table, {
      filter: [
        { column: 'is_primary_form', op: 'eq', value: true },
        { column: 'legendary', op: 'eq', value: false },
      ],
      groupBy: ['generation_label'],
      aggregate: [{ fn: 'mean', column: 'total', as: 'mean_total' }],
    });
    expect(genMeans).toHaveLength(6);

    const status = runQuery(table, {
      filter: [{ column: 'is_primary_form', op: 'eq', value: true }],
      groupBy: ['status'],
      aggregate: [{ fn: 'mean', column: 'total', as: 'mean_total' }],
    });
    expect(status).toHaveLength(2);
  });
});
