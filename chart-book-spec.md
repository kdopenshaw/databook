# Chart Book — Product & Implementation Spec

Status: draft for implementers  
Audience: engineers building the scaffold, data layer, and AI skill  
Related research context: Cursor canvases cannot host Recharts (sandbox = `cursor/canvas` only); this tool is a **standalone React app** (or app embedded in a host), not a Cursor canvas artifact.

---

## 1. Overview

### 1.1 What it is

A **chart book** is a fixed-shape React application that presents one experiment’s analysis as an ordered stack of blocks: narrative markdown and charts. An **AI skill** (agent skill / prompt pack) drives creation:

1. **Profile** unknown data (from a repo path, uploaded files, or a user description of sources).
2. **Write** a durable understanding of the data and the experiment (schema notes, grain, caveats, intended questions).
3. **Transform / aggregate** as needed for analysis.
4. **Persist** those transforms in an organized, reusable form under a single data layout.
5. **Emit** (or update) the chart-book scaffold filled with a block list and chart definitions.

The skill is **experiment-agnostic**: it does not hard-code domain workflows (finance, growth, labs). The same pipeline works for any tabular experiment the user points at.

### 1.2 Design goals

| Goal | Meaning |
|------|---------|
| Correct by construction | Charts declare *queries* against sitting data; they do not own private CSV forks that drift. |
| One scaffold | Every book is the same React app shell; only content (blocks + chart types used) changes. |
| Narrative + viz | Markdown blocks explain aggregations and decisions; charts show results. |
| Minimal UI | Vercel-like dark-first chrome; consistent across all books. |
| Skill-first authoring | Humans rarely hand-edit chart wiring; the skill owns profiling → emission. |

### 1.3 Non-goals (v1)

- Cross-chart brushing, linked highlighting, or global filter bars that rewrite other charts.
- Arbitrary notebook code cells executed in the browser.
- Hosting charts inside Cursor `.canvas.tsx` (incompatible with Recharts / npm).
- Replacing Plotly Studio / Hex for warehouse BI; this is a **repo-local / skill-emitted chart book**.

### 1.4 High-level flow

```text
Sources (repo files | user description)
        │
        ▼
   AI Skill: profile + understand
        │
        ▼
   Canonical dataset (+ optional transform artifacts)
        │
        ▼
   Skill: choose charts + write markdown
        │
        ▼
   Emit / update scaffold
        │  ├── data/canonical.*
        │  ├── data/understanding.md (or JSON)
        │  ├── book/blocks.json (ordered blocks)
        │  └── app/ (fixed React shell)
        ▼
   User opens chart book (dark UI, top-to-bottom blocks)
```

---

## 2. Data layer

### 2.1 Canonical dataset

After profiling, the book has **one canonical dataset** (logical table or tidy frame) that all charts read.

- **Grain** is explicit (e.g. “one row per order×day”, “one row per subject×trial”).
- **Column contract** is documented: name, type, nullability, units, categorical levels.
- Physical form may be Parquet, CSV, or Arrow IPC under `data/`; the runtime loads into an in-memory table (e.g. Arquero, Polars via WASM, or DuckDB-WASM — choice is an implementation decision; the **API** is “run query object → rows”).

Transforms that produced the canonical set (joins, filters, derived columns) are saved as **reusable artifacts** (scripts + params + checksum of inputs), not discarded chat side effects.

### 2.2 Chart slices as query objects

Each chart declares a **query object** against the sitting canonical data. Charts do **not** each ship a separate pre-cut file.

Suggested shape (TypeScript):

```ts
type ChartQuery = {
  /** Stable id referenced by the chart block */
  id: string;
  /** Optional human label for debugging / markdown cross-refs */
  label?: string;
  filter?: FilterExpr[];      // e.g. { column, op, value }
  groupBy?: string[];         // categorical / time keys
  bin?: BinSpec[];            // numeric → histogram buckets
  aggregate?: AggSpec[];      // { column, fn: 'sum' | 'mean' | 'count' | ... , as }
  orderBy?: OrderSpec[];
  limit?: number;
  /** Sample for scatter / large-N safety; applied after aggregate unless raw */
  sample?: { n: number; seed?: number };
};
```

The chart block stores `queryId` (or inlines the query). The renderer:

1. Resolves the query against the current canonical table.
2. Passes the resulting rows into the chart component.

### 2.3 Correction propagation

Because slices are queries, **corrections propagate automatically**:

| Change | Effect |
|--------|--------|
| Fix a bug in a derived canonical column | All charts re-query; no per-chart CSV rewrite. |
| Tighten a global exclusion (e.g. drop test accounts in transform) | Re-run transform → refresh canonical → all charts update. |
| Edit one chart’s `filter` / `groupBy` | Only that chart’s query result changes. |

Implementers must version or hash the canonical artifact so the UI can show “data stale / rebuilding” if transforms are mid-run.

### 2.4 Understanding document

The skill writes a first-class **understanding** artifact (markdown and/or structured JSON):

- Source inventory and how they were combined  
- Assumed experiment question(s)  
- Grain, primary keys, join logic  
- Quality issues (nulls, outliers, suspicious levels)  
- Transforms applied and why  
- Open caveats  

This is inputs for later markdown blocks and for human review—not only chat ephemeral text.

### 2.5 Organization on disk (suggested)

```text
chart-book/
  data/
    sources/           # immutable originals or pointers
    transforms/        # scripts + lockfile of params
    canonical/         # current sitting dataset
    understanding.md
  book/
    blocks.json        # ordered block list
    queries.json       # query objects (if not inlined in blocks)
  app/                 # fixed scaffold (see §6)
```

---

## 3. Document model

### 3.1 Block-based document

The chart book is a **linear document**, conceptually like Jupyter:

- Typed blocks  
- Explicit **order index**  
- Rendered **top to bottom**  
- No free-form floating canvas layout in v1  

### 3.2 Block types (v1)

| Type | Role |
|------|------|
| `markdown` | Narrative: experiment framing, how aggregations work, caveats, takeaways. |
| `chart` | One visualization bound to a query object + chart type. |

Future (out of scope for v1 wiring, reserved ids): `callout`, `table`, `stat_row`.

### 3.3 Block schema

```ts
type BlockBase = {
  id: string;
  order: number;           // contiguous or sortable index
  createdBy: 'skill' | 'user';
};

type MarkdownBlock = BlockBase & {
  type: 'markdown';
  body: string;            // GFM markdown
};

type ChartBlock = BlockBase & {
  type: 'chart';
  title: string;
  subtitle?: string;       // units, period, filters in plain language
  chartType: ChartTypeName;
  query: ChartQuery;       // or queryId: string
  encoding: ChartEncoding; // maps query result columns → visual roles
  notes?: string;          // optional footnote under chart
};

type Block = MarkdownBlock | ChartBlock;
```

`ChartEncoding` is chart-type-specific (e.g. `{ x, y, color?, size? }` for scatter; `{ category, value }` for bar). The skill fills encodings from profiled column types so charts are **correct by construction** (see §4.2).

### 3.4 Markdown authored by the skill

The skill should emit markdown blocks that:

- State the experiment question before the first chart  
- Explain non-obvious aggregations (“revenue is sum of `amount_usd` after excluding refunds”)  
- Call out outlier handling and excluded cohorts  
- Summarize findings after key chart groups  

Humans may edit markdown; the skill may regenerate sections marked `<!-- skill:managed -->` if that convention is adopted.

### 3.5 Renderer

`BlockRenderer` maps `blocks` sorted by `order` → React nodes:

- `markdown` → `MarkdownBlock` (safe markdown → React)  
- `chart` → `ChartBlock` → resolve query → `ChartCatalog[chartType]`  

Empty query results: omit the chart body and show a short inline note *or* omit the block entirely if the skill guarantees non-empty slices (prefer skill-side omission of empty charts).

---

## 4. Chart layer

### 4.1 Default library: Recharts (under review)

**Default for v1: [Recharts](https://recharts.org/)** — declarative React components, large ecosystem, React 19 peer support in current majors, and alignment with the broader Next/shadcn chart pattern (wrappers over Recharts).

**Library choice is under review.** Compare before locking:

| Library | Fit for this chart book | Notes |
|---------|-------------------------|--------|
| **Recharts** | Strong default | Easy declarative API; ~100KB+ gzip for a typical chart; SVG; good enough dark theming via CSS variables. |
| **Visx** (Airbnb, D3-based — not Uber) | Strong if custom minimalism wins | Smallest expressive bundle when composed carefully; higher authoring cost; Vercel Analytics historically used Visx ([discussion](https://github.com/vercel/vercel/discussions/9232)). |
| **Nivo** | Polished defaults | Heavier; excellent themes/animations; more “dashboard kit” than minimal chart book. |
| **Victory** | Weak for web-only minimal book | Solid RN story; larger bundle; less ideal as default here. |
| **Lightweight Charts** | Poor general default | TradingView canvas lib; excellent for time-series finance, not a general catalog (no histogram/heatmap/box as first-class). |

Vercel context (informational, not a hard requirement):

- Product Analytics charts: **Visx** (public confirmation by Lee Robinson, 2023).  
- Dashboard component investment: **Tremor** acquired Jan 2025; Tremor charts depend on **Recharts**.  
- shadcn/ui charts (common in Vercel-adjacent apps): **Recharts**.

Decision rule for implementers: ship Recharts in the scaffold; keep `ChartCatalog` behind a thin adapter interface so a Visx swap does not rewrite blocks.json.

### 4.2 Correct by construction

Charts must not accept arbitrary “plot these columns” without checks. The skill + runtime enforce:

1. **Type → allowed chart types** (e.g. two quantitative → scatter; quantitative + time → line; categorical + quantitative → bar).  
2. **Encoding validation** before render (missing columns, wrong dtypes → skill error or block omitted).  
3. **Sensible defaults**: bar baseline at 0; labeled axes with units; title = metric + split; subtitle = filters / period / source.  
4. **Aggregation honesty**: if `groupBy` is set, `aggregate` is required (no accidental plotting of raw duplicated keys as if aggregated).

Optional fallback for hard viz decisions: load Anthropic’s **data-visualization / dataviz** skill guidance (chart-type tables, anti-patterns) when the primary skill is unsure (see §7.3).

### 4.3 Chart catalog

A **type-name → component** lookup:

```ts
type ChartTypeName =
  | 'bar'
  | 'bar_horizontal'
  | 'line'
  | 'area'
  | 'scatter'
  | 'histogram'
  | 'box'
  | 'heatmap'
  | 'pie'; // discouraged except ≤6 categories; skill prefers bar

const ChartCatalog: Record<ChartTypeName, ChartComponent> = {
  bar: BarChartView,
  bar_horizontal: HorizontalBarChartView,
  line: LineChartView,
  // ...
};
```

Each `ChartComponent` receives `{ data, encoding, theme }` only—no knowledge of the file system.

v1 minimum set to implement: `bar`, `bar_horizontal`, `line`, `area`, `scatter`, `histogram`.  
v1 nice-to-have: `box`, `heatmap`.  
`pie` optional and gated.

### 4.4 Interactivity (minimal)

**In scope:**

- Hover tooltips  
- Legend toggle for multi-series (optional)  
- Theme-aware colors  

**Out of scope (v1):**

- Cross-chart filtering / brushing  
- Shared time-range controls that rewrite sibling queries  
- Drill-down navigation between books  

See §8 open questions.

---

## 5. UI

### 5.1 Visual direction

- **Vercel-style minimal**: quiet chrome, strong typography hierarchy, generous whitespace, no decorative gradients or heavy card stacks.  
- **Dark mode default**; **light mode toggle** persisted (localStorage).  
- Same theme tokens for every chart book so books feel like one product.

### 5.2 Layout

```text
┌─────────────────────────────────────────┐
│  Book title · experiment id    [theme]  │
├─────────────────────────────────────────┤
│  Markdown …                             │
│  Chart …                                │
│  Markdown …                             │
│  Chart …                                │
│  …                                      │
└─────────────────────────────────────────┘
```

- Single column, max readable width (~720–880px) for narrative; charts may span slightly wider if needed.  
- No app sidebar in v1.  
- Sticky compact header with title + theme toggle only.

### 5.3 Theme tokens

Expose CSS variables (or a small theme object) consumed by Recharts via `stroke`/`fill` props:

- `--cb-bg`, `--cb-fg`, `--cb-muted`, `--cb-border`  
- `--cb-accent`  
- `--cb-series-1` … `--cb-series-n` (colorblind-safe categorical)  
- `--cb-sequential-*` / diverging if heatmap ships  

Chart gridlines and axes use muted tokens; never hard-code pure `#000` / `#fff` in chart components.

### 5.4 Consistency rule

The scaffold owns all chrome. Skills **must not** emit custom CSS themes per experiment. Branding variance is limited to book title and markdown content.

---

## 6. Scaffold

### 6.1 One fixed React app

The skill **always emits the same application shell**. Per-book variance is data + `blocks` (+ which catalog entries are referenced), not a new architecture.

**Fixed entry point** (illustrative):

```text
app/
  src/
    main.tsx                 # always
    App.tsx                  # always — loads book config + data
    theme/
      ThemeProvider.tsx      # always
      tokens.css             # always
    layout/
      PageLayout.tsx         # always — header + scroll column
    blocks/
      BlockRenderer.tsx      # always
      MarkdownBlock.tsx      # always
      ChartBlock.tsx         # always
    charts/
      catalog.ts             # always — type → component
      BarChartView.tsx       # always (even if unused in a given book)
      ...
    data/
      loadCanonical.ts       # always
      runQuery.ts            # always
  index.html
  package.json               # pinned deps (recharts, react, markdown, …)
```

### 6.2 Standard components (required)

| Component | Responsibility |
|-----------|----------------|
| `ThemeProvider` | Dark default, light toggle, CSS variables |
| `PageLayout` | Header (title, toggle), main column |
| `BlockRenderer` | Sort by `order`, dispatch by `type` |
| `MarkdownBlock` | Render GFM safely |
| `ChartBlock` | Title/subtitle/notes + run query + catalog lookup |
| Chart views | Presentational only |

### 6.3 What the skill may change per book

- `book/blocks.json` (and/or `queries.json`)  
- `data/canonical/*` and `data/understanding.md`  
- Book metadata: title, description, generated_at  
- **Not** a fork of `PageLayout` / theme / catalog architecture  

If a new chart type is needed, it is added to the **shared scaffold catalog** (product change), then skills may reference it—not one-off components inside a single book.

### 6.4 Emission modes

1. **Greenfield**: copy scaffold template → write data + blocks → `npm install && npm run dev`.  
2. **Update**: re-run transforms and rewrite `blocks.json` / canonical data; leave `app/src` untouched unless scaffold version bumps.

Scaffold version is pinned in `chart-book/scaffold.version` so skills know when to refresh the app shell.

---

## 7. Skill

### 7.1 Role

The **Chart Book skill** teaches an agent to:

1. Discover and profile data (repo paths, schemas, sample rows, quality).  
2. Infer experiment intent from user text + data shape.  
3. Write `understanding.md`.  
4. Design and run transforms → write canonical dataset + transform scripts.  
5. Choose chart types from data relationships (correct-by-construction rules).  
6. Define query objects + encodings.  
7. Write markdown blocks that explain aggregations and findings.  
8. Emit/update the fixed scaffold and block list.  
9. Sanity-check: every chart query returns rows; titles include units; no empty decorative charts.

### 7.2 Skill structure (suggested)

```text
skills/chart-book/
  SKILL.md                 # triggers, pipeline, invariants
  references/
    profiling.md
    chart-selection.md     # relationship → chart type
    query-schema.md
    scaffold-layout.md
    anti-patterns.md
  templates/
    scaffold/              # or pointer to package
```

Triggers (examples): “create a chart book”, “profile this experiment data”, “add charts for …”, “refresh the chart book after cleaning”.

### 7.3 Anthropic data-viz as optional fallback

When chart-type selection or encoding is ambiguous, the skill may consult Anthropic’s published **data-visualization / dataviz** guidance (knowledge-work-plugins / open-artifacts dataviz): form-from-data-job, anti-pie/3D/dual-axis, palette roles, labeling norms.

Fallback is **advisory**, not a second renderer. Output must still be Recharts (or the chosen catalog) query + encoding objects.

### 7.4 Invariants the skill must not violate

- No per-chart copied CSV as source of truth.  
- No custom one-off chart components outside the catalog.  
- No light-only styling.  
- No cross-chart filter wiring in v1.  
- Do not target Cursor canvas as the host for Recharts.

---

## 8. Open questions

1. **Cross-chart interaction** — Explicitly **out of scope for v1**. Revisit whether a single global filter bar (rewriting query `filter` fields) is worth the complexity once the query engine is stable.  
2. **Default chart library** — Recharts is the working default; a **Visx** comparison may change the default if minimal bundle size and custom aesthetics outweigh authoring speed. Keep the catalog adapter ready.  
3. **Query engine** — DuckDB-WASM vs Arquero vs precomputed caches for large canonical tables; pick based on typical N.  
4. **Skill hosting** — Cursor skill vs Claude skill vs both; scaffold emission path differs (local FS vs cloud agent).  
5. **pie / heatmap / box** — Finalize v1 catalog cut after first two real experiments.  
6. **Understanding format** — Pure markdown vs JSON schema for machine re-use in refresh runs.  
7. **Multi-canonical datasets** — v1 assumes one; some experiments need fact + dim tables. Prefer join-into-one-canonical first; multi-table query objects later if required.

---

## 9. Acceptance criteria (implementer checklist)

- [ ] Fixed scaffold boots with dark theme and light toggle.  
- [ ] `blocks.json` renders markdown and chart blocks in order.  
- [ ] Chart blocks execute query objects against one canonical dataset.  
- [ ] Editing a transform and refreshing canonical updates all charts without hand-editing chart data files.  
- [ ] Chart catalog resolves at least bar, line, scatter, histogram.  
- [ ] Skill doc describes profile → understand → transform → emit end-to-end.  
- [ ] No dependency on Cursor canvas for rendering.  
- [ ] README for a generated book documents how to refresh data.

---

## 10. References

- Cursor canvas constraint: import only from `cursor/canvas`; no npm/Recharts in canvases.  
- Vercel Analytics chart stack: Visx ([vercel/vercel discussion #9232](https://github.com/vercel/vercel/discussions/9232)).  
- Vercel × Tremor: [vercel.com/blog/vercel-acquires-tremor](https://vercel.com/blog/vercel-acquires-tremor) (Tremor → Recharts).  
- shadcn charts: Recharts-based.  
- Anthropic data visualization skill / dataviz method: chart selection + design checks as optional skill fallback.
