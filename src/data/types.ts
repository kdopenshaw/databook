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
};

export type AggFn = 'count' | 'sum' | 'mean' | 'median' | 'min' | 'max' | 'count_distinct' | 'ratio';

export type AggSpec = {
  fn: AggFn;
  column?: string;
  denominator?: string;
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

export type RechartsSeriesSpec = {
  /** Recharts mark type — extend freely; renderer supports common marks. */
  mark: string;
  dataKey: string;
  name?: string;
  stroke?: string;
  fill?: string;
  type?: 'monotone' | 'linear' | 'step' | 'basis' | 'natural';
  strokeWidth?: number;
  dot?: boolean;
};

/**
 * Declarative Recharts composition the skill emitted.
 * Prefer naming real Recharts chart roots (e.g. LineChart); the scaffold
 * renderer maps known roots and series marks without restricting the skill
 * to a documented starter menu of chart types.
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
  recharts: RechartsSpec;
  query: ChartQuery;
  encoding: ChartEncoding;
  notes?: string;
  flex?: number;
};

export type RowBase = {
  id: string;
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

export type BookDocument = {
  title: string;
  experimentId?: string;
  description?: string;
  generatedAt?: string;
  tabs: TabSection[];
  defaultTabId?: string;
};
