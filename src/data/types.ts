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

// ---- Query objects (owned by each chart's `meta`) ----

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
  /** When true (default), fill empty histogram bins between observed min and max. */
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
  | 'share'
  | 'count_if'
  | 'sum_if'
  | 'mean_if';

export type AggSpec = {
  fn: AggFn;
  column?: string;
  denominator?: string;
  where?: FilterExpr;
  as: string;
  label?: string;
  unit?: string;
};

export type OrderSpec = { column: string; direction?: 'asc' | 'desc' };

export type ChartQuery = {
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

/**
 * Exported from each `src/charts/<Name>.tsx` as `meta`.
 * The chart id is the component / file name.
 */
export type ChartMeta = {
  title: string;
  subtitle?: string;
  notes?: string;
  query: ChartQuery;
  /** Opt-in: ok / smoke allow zero rows for this chart. */
  allowEmpty?: boolean;
};

/** One chart reference inside a ```chart fenced block. */
export type ChartRef = {
  name: string;
  flex?: number;
};

/**
 * Parsed content unit inside a tab markdown file.
 * Synthetic `id` is for React keys / insert positions only — not stored on disk.
 */
export type MarkdownBlock = {
  type: 'markdown';
  id: string;
  body: string;
  /** True while a freshly inserted empty note is open in the editor. */
  editing?: boolean;
};

export type ChartsBlock = {
  type: 'charts';
  id: string;
  charts: ChartRef[];
};

export type ContentBlock = MarkdownBlock | ChartsBlock;

export type TabSection = {
  id: string;
  label: string;
  /** Tab order from the numeric filename prefix (01-, 02-, …). */
  order: number;
  /** Optional page id from front matter; book.yaml pages may also list tabIds. */
  page?: string;
  /** Filename under `src/book/` (e.g. `01-overview.md`). */
  sourceFile: string;
  blocks: ContentBlock[];
};

export type BookPage = {
  id: string;
  label: string;
  order: number;
  tabIds: string[];
};

export type BookConventions = {
  notes?: string[];
  population?: string;
  palette?: Record<string, string>;
};

/**
 * In-memory book. On disk: `src/book/book.yaml` + one `NN-*.md` per tab.
 * See `parseBook.ts` / `loadBook.ts`.
 */
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
