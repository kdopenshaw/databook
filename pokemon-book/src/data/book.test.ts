import { describe, expect, it } from 'vitest';
import { loadCanonical } from './loadCanonical';
import { runQuery } from './runQuery';
import type { BookDocument, ChartBlock, DataRow } from './types';
import rowsJson from './rows.json';

const book = rowsJson as BookDocument;
const table = loadCanonical();
const blocks: ChartBlock[] = book.tabs.flatMap((t) => t.rows.flatMap((r) => (r.type === 'component' ? r.components : [])));
const BASE = [
  { column: 'type_slot', op: 'eq' as const, value: 'Primary' },
  { column: 'is_primary_form', op: 'eq' as const, value: true },
];

describe('book structure', () => {
  it('has unique tab, row, and chart ids and unique row orders per tab', () => {
    const ids = [...book.tabs.map((t) => t.id), ...book.tabs.flatMap((t) => t.rows.map((r) => r.id)), ...blocks.map((b) => b.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of book.tabs) {
      const orders = t.rows.map((r) => r.order);
      expect(orders.every((o) => Number.isFinite(o))).toBe(true);
      expect(new Set(orders).size).toBe(orders.length);
      const skill = t.rows.filter((r) => r.createdBy === 'skill').map((r) => r.order);
      expect(skill).toEqual(skill.map((_, i) => i));
    }
    expect(book.tabs.some((t) => t.id === book.defaultTabId)).toBe(true);
  });

  it('keeps the analyst-authored Overview note after regeneration', () => {
    const overview = book.tabs.find((t) => t.id === 'overview')!;
    const note = overview.rows.find((r) => r.id === 'md-analyst-take');
    expect(note).toMatchObject({ type: 'markdown', createdBy: 'user', order: 1.5 });
    expect(note && note.type === 'markdown' ? note.body : '').toContain("Analyst's take (Keith)");
  });

  it('Summary is the default tab and holds 3–4 charts', () => {
    expect(book.defaultTabId).toBe('summary');
    const summary = book.tabs.find((t) => t.id === 'summary')!;
    const n = summary.rows.flatMap((r) => (r.type === 'component' ? r.components : [])).length;
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(4);
  });

  it('keeps component rows to at most 3 charts', () => {
    for (const t of book.tabs) for (const r of t.rows) if (r.type === 'component') expect(r.components.length).toBeLessThanOrEqual(3);
  });
});

describe.each(blocks.map((b) => [b.id, b] as const))('chart %s', (_id, block) => {
  const rows = runQuery(table, block.query);

  it('returns rows', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('only encodes columns the query returns', () => {
    const cols = new Set(Object.keys(rows[0]));
    const spec = block.recharts;
    const keys = [
      spec.xKey,
      ...(spec.series ?? []).map((s) => s.dataKey),
      ...(spec.yKeys ?? []),
      ...(spec.tooltipKeys ?? []),
      ...(spec.colorBy ? [spec.colorBy.key] : []),
    ];
    for (const k of keys) expect(cols, `${block.id} → ${k}`).toContain(k);
    for (const v of Object.values(block.encoding)) if (typeof v === 'string' && cols.has(v)) expect(cols).toContain(v);
  });
});

const mdBody = (tabId: string, rowId: string): string => {
  const row = book.tabs.find((t) => t.id === tabId)?.rows.find((r) => r.id === rowId);
  return row && row.type === 'markdown' ? row.body : '';
};
const tableRows = (body: string): string[][] =>
  body
    .split('\n')
    .filter((l) => l.startsWith('|') && !/^\|[-|: ]+\|$/.test(l))
    .slice(1)
    .map((l) => l.slice(1, -1).split('|').map((c) => c.trim().replace(/\*/g, '')));

describe('markdown tables match canonical.json', () => {
  const species = runQuery(table, { filter: BASE });

  it('correlation matrix cells equal Pearson r over base forms', () => {
    const keys = ['hp', 'attack', 'defense', 'sp_atk', 'sp_def', 'speed', 'total'];
    const col = (k: string) => species.map((r) => r[k] as number);
    const pearson = (x: number[], y: number[]) => {
      const mx = x.reduce((a, b) => a + b, 0) / x.length;
      const my = y.reduce((a, b) => a + b, 0) / y.length;
      let sxy = 0, sxx = 0, syy = 0;
      for (let i = 0; i < x.length; i++) {
        sxy += (x[i] - mx) * (y[i] - my);
        sxx += (x[i] - mx) ** 2;
        syy += (y[i] - my) ** 2;
      }
      return sxy / Math.sqrt(sxx * syy);
    };
    const rows = tableRows(mdBody('stats', 'md-corr-matrix'));
    expect(rows).toHaveLength(keys.length);
    rows.forEach((cells, i) =>
      cells.slice(1).forEach((cell, j) => {
        if (i === j) return expect(cell).toBe('—');
        expect(Number(cell.replace('−', '-'))).toBeCloseTo(pearson(col(keys[i]), col(keys[j])), 2);
      }),
    );
  });

  it('top-5 table lists the highest totals per primary type', () => {
    const rows = tableRows(mdBody('lookup', 'md-top-by-type'));
    let type = '';
    const listed = new Map<string, number[]>();
    for (const [t, , , , total] of rows) {
      if (t) type = t;
      listed.set(type, [...(listed.get(type) ?? []), Number(total)]);
    }
    const byType = new Map<string, number[]>();
    for (const r of species) byType.set(r.type1 as string, [...(byType.get(r.type1 as string) ?? []), r.total as number]);
    expect([...listed.keys()].sort()).toEqual([...byType.keys()].sort());
    for (const [t, totals] of byType) expect(listed.get(t)).toEqual(totals.sort((a, b) => b - a).slice(0, 5));
  });
});

describe('canonical sanity (numbers quoted in markdown)', () => {
  const one = (q: Parameters<typeof runQuery>[1]): DataRow => runQuery(table, q)[0];

  it('has 721 base species and 1,071 type memberships', () => {
    expect(one({ filter: BASE, aggregate: [{ fn: 'count', as: 'n' }] }).n).toBe(721);
    expect(one({ filter: [BASE[1]], aggregate: [{ fn: 'count', as: 'n' }] }).n).toBe(1071);
  });

  it('legendary vs non-legendary mean totals are 620 vs 404', () => {
    const r = one({
      filter: BASE,
      aggregate: [
        { fn: 'mean', column: 'total_legendary', as: 'leg' },
        { fn: 'mean', column: 'total_nonlegendary', as: 'non' },
        { fn: 'min', column: 'total_legendary', as: 'leg_min' },
      ],
    });
    expect(Math.round(r.leg as number)).toBe(620);
    expect(Math.round(r.non as number)).toBe(404);
    expect(r.leg_min).toBe(580);
  });

  it('flags 61 glass cannons and 41 tanks among base forms, never both', () => {
    const r = one({
      filter: BASE,
      aggregate: [
        { fn: 'sum', column: 'is_glass_cannon', as: 'glass' },
        { fn: 'sum', column: 'is_tank', as: 'tank' },
      ],
    });
    expect(r).toEqual({ glass: 61, tank: 41 });
    const both = runQuery(table, {
      filter: [{ column: 'is_glass_cannon', op: 'eq', value: true }, { column: 'is_tank', op: 'eq', value: true }],
    });
    expect(both).toHaveLength(0);
  });

  it('scatter colorBy levels cover every archetype value', () => {
    for (const b of blocks) {
      if (!b.recharts.colorBy) continue;
      const values = new Set(runQuery(table, b.query).map((r) => r[b.recharts.colorBy!.key]));
      const levels = new Set(b.recharts.colorBy.levels.map((l) => l.value));
      for (const v of values) expect(levels, `${b.id} level ${String(v)}`).toContain(v);
    }
  });

  it('starter finals: one per generation × role, totals 525–535, claims in the prose and notes hold', () => {
    const starters = runQuery(table, { filter: [...BASE, { column: 'is_starter_final', op: 'eq', value: true }], orderBy: [{ column: 'dex' }] });
    expect(starters).toHaveLength(18);
    const slots = new Set(starters.map((r) => `${r.generation}|${r.starter_type}`));
    expect(slots.size).toBe(18);
    const by = (name: string) => starters.find((r) => r.name === name)!;
    const stats = (r: DataRow) => ['hp', 'attack', 'defense', 'sp_atk', 'sp_def', 'speed'].map((k) => r[k] as number);
    expect(Math.min(...starters.map((r) => r.total as number))).toBe(525);
    expect(Math.max(...starters.map((r) => r.total as number))).toBe(535);
    expect(starters.filter((r) => r.generation === 'Gen 5').map((r) => r.total)).toEqual([528, 528, 528]);
    expect(stats(by('Typhlosion'))).toEqual(stats(by('Charizard')));
    const [v, m] = [stats(by('Venusaur')), stats(by('Meganium'))];
    expect(m).toEqual([v[0], v[1], v[3], v[2], v[4], v[5]]);
    const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
    expect(sorted(stats(by('Feraligatr')))).toEqual(sorted(stats(by('Blastoise'))));
    const top = (k: string) => [...starters].sort((a, b) => (b[k] as number) - (a[k] as number))[0].name;
    expect([top('attack'), top('speed'), top('defense')]).toEqual(['Emboar', 'Greninja', 'Chesnaught']);
    expect(starters.filter((r) => r.is_glass_cannon).map((r) => r.name)).toEqual(['Blaziken']);
    expect(starters.filter((r) => r.is_tank)).toHaveLength(0);

    const grid = tableRows(mdBody('generations', 'md-gen-starters'));
    expect(grid).toHaveLength(6);
    for (const [gen, ...cells] of grid) {
      cells.forEach((cell, i) => {
        const r = starters.find((s) => s.generation === gen && s.starter_type === ['Grass', 'Fire', 'Water'][i])!;
        expect(cell).toBe(`${r.name} ${r.total}`);
      });
    }
  });

  it('Mega/Primal uplift is +100 except one +90', () => {
    const rows = runQuery(table, {
      filter: [BASE[0], { column: 'mega_uplift', op: 'not_null' }],
      groupBy: ['mega_uplift'],
      aggregate: [{ fn: 'count', as: 'n' }],
    });
    expect(rows).toEqual([
      { mega_uplift: 90, n: 1 },
      { mega_uplift: 100, n: 49 },
    ]);
  });
});

// House rules from the round-4 data-viz review; a new chart that breaks one fails here.
describe('book conventions', () => {
  const STAT_INDEX: Record<string, number> = { hp: 0, attack: 1, defense: 2, sp_atk: 3, sp_def: 4, speed: 5 };
  const statOf = (dataKey: string) => dataKey.replace(/^mean_/, '');
  const rowsWithCharts = book.tabs.flatMap((t) => t.rows.flatMap((r) => (r.type === 'component' ? [r] : [])));

  it('bar charts start their value axis at zero', () => {
    for (const b of blocks) {
      if (b.recharts.chart !== 'BarChart' || !b.recharts.yDomain) continue;
      expect(Number(b.recharts.yDomain[0]), b.id).toBeLessThanOrEqual(0);
    }
  });

  it('line charts that do not start at zero say so', () => {
    for (const b of blocks) {
      const d = b.recharts.yDomain;
      if (b.recharts.chart !== 'LineChart' || !d || Number(d[0]) <= 0) continue;
      expect(`${b.subtitle ?? ''} ${b.notes ?? ''}`, b.id).toMatch(/axis starts at/i);
    }
  });

  it('side-by-side charts of the same measures share a fixed value scale', () => {
    for (const row of rowsWithCharts) {
      const groups = new Map<string, ChartBlock[]>();
      for (const b of row.components) {
        const sig = `${b.recharts.chart}|${b.recharts.xKey}|${(b.recharts.series ?? []).map((s) => s.dataKey).join(',')}`;
        groups.set(sig, [...(groups.get(sig) ?? []), b]);
      }
      for (const group of groups.values()) {
        if (group.length < 2) continue;
        for (const b of group) {
          expect(b.recharts.yDomain, `${b.id} needs a fixed yDomain`).toBeDefined();
          expect(b.recharts.yDomain, b.id).toEqual(group[0].recharts.yDomain);
          expect(b.recharts.xDomain, b.id).toEqual(group[0].recharts.xDomain);
        }
      }
    }
  });

  it('in stat-only charts each stat keeps its colour (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed = palette 1–6)', () => {
    for (const b of blocks) {
      const series = b.recharts.series ?? [];
      if (b.recharts.chart === 'ScatterChart' || !series.length || !series.every((s) => statOf(s.dataKey) in STAT_INDEX)) continue;
      series.forEach((s, i) => expect(s.colorIndex ?? i, `${b.id} → ${s.dataKey}`).toBe(STAT_INDEX[statOf(s.dataKey)]));
    }
  });

  it('starter charts carry a takeaway note', () => {
    for (const b of blocks.filter((x) => x.id.startsWith('chart-starter-'))) expect((b.notes ?? '').length, b.id).toBeGreaterThan(20);
  });
});
