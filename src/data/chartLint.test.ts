import { describe, expect, it } from 'vitest';
import { lintBook, lintBookErrors } from './chartLint';
import type { BookDocument, ChartBlock } from './types';
import sample from './rows.json';

const block = (partial: Partial<ChartBlock> & Pick<ChartBlock, 'id' | 'title'>): ChartBlock => {
  const { recharts: rechartsPartial, ...rest } = partial;
  return {
    encoding: { x: 'x', y: 'y' },
    query: { limit: 10 },
    ...rest,
    recharts: {
      chart: 'BarChart',
      xKey: 'x',
      series: [{ mark: 'Bar', dataKey: 'y' }],
      ...rechartsPartial,
    },
  };
};

const bookOf = (components: ChartBlock[], conventions?: BookDocument['conventions']): BookDocument => ({
  title: 'Lint fixture',
  tabs: [
    {
      id: 't',
      label: 'T',
      order: 0,
      rows: [{ id: 'r', order: 0, createdBy: 'skill', type: 'component', components }],
    },
  ],
  conventions,
});

describe('lintBook', () => {
  it('accepts the init sample', () => {
    expect(lintBookErrors(sample as BookDocument)).toEqual([]);
  });

  it('rejects bar charts whose yDomain excludes 0', () => {
    const issues = lintBookErrors(bookOf([block({ id: 'b1', title: 'Bad', recharts: { chart: 'BarChart', xKey: 'x', yDomain: [300, 500], series: [{ mark: 'Bar', dataKey: 'y' }] } })]));
    expect(issues.some((i) => i.code === 'bar-truncated-axis')).toBe(true);
  });

  it('rejects line zoom without a stated reason', () => {
    const issues = lintBookErrors(
      bookOf([
        block({
          id: 'l1',
          title: 'Zoom',
          recharts: { chart: 'LineChart', xKey: 'x', yDomain: [520, 540], series: [{ mark: 'Line', dataKey: 'y' }] },
        }),
      ]),
    );
    expect(issues.some((i) => i.code === 'line-zoom-unstated')).toBe(true);
  });

  it('allows line zoom when subtitle states the axis start', () => {
    const issues = lintBookErrors(
      bookOf([
        block({
          id: 'l2',
          title: 'Zoom',
          subtitle: 'Axis starts at 520 to show fine differences',
          recharts: { chart: 'LineChart', xKey: 'x', yDomain: [520, 540], series: [{ mark: 'Line', dataKey: 'y' }] },
        }),
      ]),
    );
    expect(issues).toEqual([]);
  });

  it('requires shared yDomain on sibling panels of the same measures', () => {
    const a = block({
      id: 'p1',
      title: 'A',
      recharts: { chart: 'BarChart', xKey: 'x', series: [{ mark: 'Bar', dataKey: 'y' }], yDomain: [0, 100] },
    });
    const b = block({
      id: 'p2',
      title: 'B',
      recharts: { chart: 'BarChart', xKey: 'x', series: [{ mark: 'Bar', dataKey: 'y' }], yDomain: [0, 140] },
    });
    const issues = lintBookErrors(bookOf([a, b]));
    expect(issues.some((i) => i.code === 'shared-scale-mismatch')).toBe(true);
  });

  it('rejects unknown marks', () => {
    const issues = lintBookErrors(
      bookOf([
        block({
          id: 'u1',
          title: 'Unknown',
          recharts: { chart: 'LineChart', xKey: 'x', series: [{ mark: 'Heatmap', dataKey: 'y' }] },
        }),
      ]),
    );
    expect(issues.some((i) => i.code === 'unknown-mark')).toBe(true);
  });

  it('resolves chart refs and still lints the target', () => {
    const source = block({
      id: 'src',
      title: 'Source',
      recharts: { chart: 'BarChart', xKey: 'x', yDomain: [10, 50], series: [{ mark: 'Bar', dataKey: 'y' }] },
    });
    const ref: ChartBlock = { id: 'copy', title: 'Copy', ref: 'src' };
    const book: BookDocument = {
      title: 'Refs',
      tabs: [
        {
          id: 'deep',
          label: 'Deep',
          order: 0,
          rows: [{ id: 'r0', order: 0, createdBy: 'skill', type: 'component', components: [source] }],
        },
        {
          id: 'summary',
          label: 'Summary',
          order: 1,
          rows: [{ id: 'r1', order: 0, createdBy: 'skill', type: 'component', components: [ref] }],
        },
      ],
    };
    const issues = lintBook(book);
    expect(issues.some((i) => i.code === 'bar-truncated-axis' && i.chartId === 'copy')).toBe(true);
  });
});
