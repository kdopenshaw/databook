export type ColumnType = 'quantitative' | 'temporal' | 'categorical' | 'boolean';

export type ColumnSpec = {
  name: string;
  type: ColumnType;
  label?: string;
  unit?: string;
  nullable?: boolean;
  levels?: string[];
  description?: string;
  binned?: { step: number; endColumn: string };
};

/** Temporal values are ISO date strings ('YYYY-MM-DD'), which sort lexically. */
export type Value = number | string | boolean | null;
export type DataRow = Record<string, Value>;

export type CanonicalDataset = {
  grain: string;
  schema: ColumnSpec[];
  rows: DataRow[];
  hash?: string;
  builtAt?: string;
  status?: 'ready' | 'building' | 'error';
};

export type Table = {
  schema: ColumnSpec[];
  rows: DataRow[];
};

// ---- Query objects (inlined on chart blocks) ----

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'is_null' | 'not_null';

export type FilterExpr = {
  column: string;
  op: FilterOp;
  value?: Value | Value[];
};

export type BinSpec = {
  column: string;
  step: number;
  /** Output column for the bin start; `${as}_end` holds the exclusive end. Defaults to `${column}_bin`. */
  as?: string;
  /**
   * When true (default), aggregated results include empty bins between the
   * observed min and max so categorical axes do not hide gaps. Prefer
   * `recharts.xType: "number"` + shared `xDomain` for small multiples.
   */
  fillEmpty?: boolean;
};

export type AggFn =
  | 'count'
  | 'sum'
  | 'mean'
  | 'median'
  | 'min'
  | 'max'
  | 'count_distinct'
  | 'ratio'
  /** Proportion of rows in the group matching `where`, or mean of a boolean/`column` truthy rate. */
  | 'share'
  /** Count rows in the group matching `where` (requires `where`). */
  | 'count_if'
  /** Sum `column` over rows matching `where` (requires `where`). */
  | 'sum_if'
  /** Mean of `column` over rows matching `where` (requires `where`). */
  | 'mean_if';

export type AggSpec = {
  fn: AggFn;
  column?: string;
  denominator?: string;
  /**
   * Row filter applied inside each group for `share` / `count_if` / `sum_if` / `mean_if`.
   * For `share` without `where`, a boolean/quantitative `column` is treated as a rate
   * (mean of truthy / numeric values).
   */
  where?: FilterExpr;
  as: string;
  label?: string;
  unit?: string;
};

export type OrderSpec = { column: string; direction?: 'asc' | 'desc' };

export type ChartQuery = {
  /** Optional id for debugging / error messages */
  id?: string;
  label?: string;
  filter?: FilterExpr[];
  groupBy?: string[];
  bin?: BinSpec[];
  aggregate?: AggSpec[];
  orderBy?: OrderSpec[];
  limit?: number;
  sample?: { n: number; seed?: number };
};

// ---- Flexible Recharts composition (not a closed catalog enum) ----

/**
 * Supported stock marks: `Line` | `Bar` | `Area` | `Scatter` (case-insensitive).
 * Unknown marks fail chart lint; extend the stock renderer before emitting new ones.
 */
export type RechartsSeriesSpec = {
  /** Recharts mark type — stock: Line, Bar, Area, Scatter. */
  mark: string;
  dataKey: string;
  name?: string;
  stroke?: string;
  fill?: string;
  type?: 'monotone' | 'linear' | 'step' | 'basis' | 'natural';
  strokeWidth?: number;
  strokeDasharray?: string;
  dot?: boolean;
  /** Bars/areas sharing a stackId stack on top of each other. */
  stackId?: string;
  /** Index into the --dbk-series-* palette; defaults to the series position. */
  colorIndex?: number;
};

/**
 * Declarative Recharts composition the skill emitted.
 * Prefer naming real Recharts chart roots (e.g. LineChart); the scaffold
 * stock renderer maps known roots and series marks (Line/Bar/Area/Scatter).
 * Unknown marks fail chart lint — extend the renderer before emitting new ones.
 *
 * Stock-supported optional fields (see SKILL.md → RechartsSpec):
 * layout, xLabel/yLabel, yDomain/xDomain, height, stackId, colorBy, xType, …
 */
export type RechartsSpec = {
  chart: string;
  xKey: string;
  yKeys?: string[];
  series?: RechartsSeriesSpec[];
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  /** Recharts `layout`; "vertical" draws horizontal bars with `xKey` on the category (Y) axis. */
  layout?: 'horizontal' | 'vertical';
  xLabel?: string;
  yLabel?: string;
  /** Category-axis width in px for vertical layout (long labels). */
  categoryWidth?: number;
  height?: number;
  /** Value-axis domain. Bars must include 0 (lint). Line zoom requires a stated reason. */
  yDomain?: [number, number];
  valueFormat?: 'number' | 'percent';
  /** Max fraction digits in tooltips and ticks. */
  decimals?: number;
  barCategoryGap?: number | string;
  /** Result columns listed in the scatter tooltip (e.g. a name column). */
  tooltipKeys?: string[];
  /** Scatter only: split result rows by a categorical column, one coloured series per listed level. */
  colorBy?: { key: string; levels: { value: string; label?: string; colorIndex?: number }[] };
  /** "number" puts `xKey` on a continuous axis (e.g. histogram bins aligned across small multiples). */
  xType?: 'category' | 'number';
  xDomain?: [number, number];
  xTicks?: number[];
  /**
   * Numeric x only: plot each row at xKey + xShift. For histograms, use half the bin
   * step so bars span [start, end); tooltips then show the bin range.
   */
  xShift?: number;
  /** Explicit ticks on the value axis (Y, or X in vertical layout). */
  valueTicks?: number[];
};

export type ChartEncoding = {
  x?: string;
  y?: string;
  category?: string;
  value?: string;
  color?: string;
  size?: string;
  stack?: boolean;
};

export type ChartBlock = {
  id: string;
  title: string;
  subtitle?: string;
  /**
   * Reuse another chart block by id (any tab). When set, the scaffold renders the
   * referenced block’s query/recharts; optional local title/subtitle/notes override display.
   * Prefer refs on Summary tabs instead of copying queries.
   */
  ref?: string;
  /**
   * Sibling shared-scale group id. Related measures (e.g. mean_hp vs mean_atk) that
   * should share yDomain set the same `scaleGroup` — no need to rename aggregates to
   * an identical `dataKey`. Chart lint keys off this before falling back to dataKeys.
   */
  scaleGroup?: string;
  recharts?: RechartsSpec;
  query?: ChartQuery;
  encoding?: ChartEncoding;
  notes?: string;
  flex?: number;
};

export type RowBase = {
  id: string;
  /** Sort key within the tab; fractional values (e.g. 1.5) slot between neighbors. */
  order: number;
  createdBy: 'skill' | 'user';
};

export type MarkdownRow = RowBase & {
  type: 'markdown';
  body: string;
};

export type ComponentRow = RowBase & {
  type: 'component';
  components: ChartBlock[];
  layout?: {
    gap?: number;
    align?: 'stretch' | 'start' | 'center';
    wrap?: boolean;
  };
};

export type BookRow = MarkdownRow | ComponentRow;

export type TabSection = {
  id: string;
  label: string;
  order: number;
  rows: BookRow[];
};

/**
 * Optional top-level grouping above tabs. When present, Sidebar lists pages
 * (not a duplicate of tabs); BookTabs shows only the active page’s tabs.
 */
export type BookPage = {
  id: string;
  label: string;
  order: number;
  tabIds: string[];
};

/**
 * Book-level house rules inherited by cold agents and consumed by chart lint.
 * Also document the same rules in `understanding.md`.
 */
export type BookConventions = {
  /** Human-readable rules (palette meanings, population filters, grain caveats). */
  notes?: string[];
  /** Default true: bar charts may not use a yDomain that excludes 0. */
  zeroBaselineBars?: boolean;
  /** Palette slot → meaning, e.g. { "0": "HP", "1": "legendary / Attack" }. */
  palette?: Record<string, string>;
  /** Short description of the default analysis population / filters. */
  population?: string;
};

export type BookDocument = {
  title: string;
  experimentId?: string;
  description?: string;
  generatedAt?: string;
  tabs: TabSection[];
  defaultTabId?: string;
  pages?: BookPage[];
  conventions?: BookConventions;
};
