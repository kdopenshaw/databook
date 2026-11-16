import { describe, expect, it } from 'vitest';
import {
  buildBookFromFiles,
  parseChartLine,
  parseTabBody,
  serializeTabBody,
} from './parseBook';

describe('parseBook', () => {
  it('parses chart lines with optional flex', () => {
    expect(parseChartLine('MonthlyRevenue')).toEqual({ name: 'MonthlyRevenue' });
    expect(parseChartLine('MonthlyRevenue 1.4')).toEqual({ name: 'MonthlyRevenue', flex: 1.4 });
  });

  it('round-trips markdown + chart fences', () => {
    const body = `## Hello

Paragraph.

\`\`\`chart
MonthlyRevenue 1.4
RevenueByCafe
\`\`\`

Tail.
`;
    const blocks = parseTabBody(body, 't');
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({ type: 'markdown' });
    expect(blocks[1]).toMatchObject({
      type: 'charts',
      charts: [
        { name: 'MonthlyRevenue', flex: 1.4 },
        { name: 'RevenueByCafe' },
      ],
    });
    const again = parseTabBody(serializeTabBody(blocks), 't');
    expect(again[1]).toMatchObject(blocks[1]);
  });

  it('builds a book from yaml + tab files', () => {
    const book = buildBookFromFiles(
      `title: Demo\nconventions:\n  notes: [x]\npages:\n  - id: p1\n    label: Home\n    order: 0\n    tabIds: [overview]\n`,
      [
        {
          filename: '01-overview.md',
          raw: `---\nid: overview\nlabel: Overview\npage: p1\n---\n\nHi\n\n\`\`\`chart\nMonthlyRevenue\n\`\`\`\n`,
        },
      ],
    );
    expect(book.title).toBe('Demo');
    expect(book.tabs[0].blocks).toHaveLength(2);
    expect(book.pages?.[0].tabIds).toContain('overview');
  });
});
