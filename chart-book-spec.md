# Chart Book — Product & Implementation Spec

Status: draft for implementers  
Audience: engineers building the scaffold, data layer, and AI skill  
Related research context: Cursor canvases cannot host Recharts (sandbox = `cursor/canvas` only); this tool is a **standalone React app** (or app embedded in a host), not a Cursor canvas artifact.

**Bundled references:** Agents using this repo must also read `references/` (Anthropic data plugin + dataviz method). See §11.

---

## 1. Overview

### 1.1 What it is

A **chart book** is a fixed-shape React application that presents one experiment’s analysis as an ordered stack of **rows**: full-width markdown rows and **component rows** that can hold one or more charts side by side. An **AI skill** (agent skill / prompt pack) drives creation:

1. **Profile** unknown data (from a repo path, uploaded files, or a user description of sources).
2. **Write** a durable understanding of the data and the experiment (schema notes, grain, caveats, intended questions).
3. **Transform / aggregate** as needed for analysis.
4. **Persist** those transforms in an organized, reusable form under a single data layout.
5. **Emit** (or update) the chart-book scaffold filled with a **row list** (markdown vs component) and chart definitions.

The skill is **experiment-agnostic**: it does not hard-code domain workflows (finance, growth, labs). The same pipeline works for any tabular experiment the user points at.

### 1.2 Design goals

| Goal | Meaning |
|------|---------|
| Correct by construction | Charts declare *queries* against sitting data; they do not own private CSV forks that drift. |
| One scaffold | Every book is the same React app shell; only content (rows + chart types used) changes. |
| Narrative + viz | Markdown rows explain aggregations and decisions; component rows show one or more charts. |
| Flexible composition | The agent chooses per row: a full-width markdown row, or a flex component row with N charts side by side. |
| Minimal UI | Vercel-like dark-first chrome; consistent across all books. |
| Skill-first authoring | Humans rarely hand-edit chart wiring; the skill owns profiling → emission. |

### 1.3 Non-goals (v1)

- Cross-chart brushing, linked highlighting, or global filter bars that rewrite other charts.
- Arbitrary notebook code cells executed in the browser.
- Hosting charts inside Cursor `.canvas.tsx` (incompatible with Recharts / npm).
- Replacing Plotly Studio / Hex for warehouse BI; this is a **repo-local / skill-emitted chart book**.
- Nested rows, free-form grids, or drag-and-drop layout editors.

### 1.4 High-level flow

```text
Sources (repo files | user description)
        │
        ▼
   AI Skill: profile + understand
   (+ read references/ Anthropic materials)
        │
        ▼
   Canonical dataset (+ optional transform artifacts)
        │
        ▼
   Skill: choose charts + decide row types + write markdown
        │
        ▼
   Emit / update scaffold
        │  ├── data/canonical.*
        │  ├── data/understanding.md (or JSON)
        │  ├── book/rows.json (ordered rows)
        │  ├── book/queries.json (optional)
        │  └── app/ (fixed React shell)
        ▼
   User opens chart book (dark UI, top-to-bottom rows)
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
  /** Stable id referenced by the chart component */
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

The chart stores `queryId` (or inlines the query). The renderer:

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

This is inputs for later markdown rows and for human review—not only chat ephemeral text.

### 2.5 Organization on disk (suggested)

```text
chart-book/
  data/
    sources/           # immutable originals or pointers
    transforms/        # scripts + lockfile of params
    canonical/         # current sitting dataset
    understanding.md
  book/
    rows.json          # ordered row list (document model)
    queries.json       # query objects (if not inlined in charts)
  app/                 # fixed scaffold (see §6)
```

---

## 3. Document model

### 3.1 Row-based layout (not strict markdown↔chart alternation)

The chart book is a **linear document of rows**, conceptually like Jupyter, but **not** limited to alternating markdown and a single chart:

- Typed **rows** with an explicit **order index**  
- Rendered **top to bottom**  
- **Two row types** in v1: `markdown` and `component`  
- No free-form floating canvas layout in v1  

**There is no requirement** that markdown and charts alternate one-for-one. Outside any component row, markdown is its own full-width row. Inside a component row, multiple charts can sit **side by side** in a flex container (e.g. three charts touching horizontally).

The agent **decides per row** which type to emit when building a set of charts—based on narrative needs and whether comparisons read better as small multiples in one flex row vs stacked full-width charts.

### 3.2 Row types (v1)

| Type | Role |
|------|------|
| `markdown` | Full-width narrative row: experiment framing, how aggregations work, caveats, takeaways. |
| `component` | Flex container row that holds **one or more** chart components side by side. |

Future (out of scope for v1 wiring, reserved ids): `callout`, `table`, `stat_row` as additional row types or as children of `component`.

### 3.3 Row schema

```ts
type RowBase = {
  id: string;
  order: number;           // contiguous or sortable index
  createdBy: 'skill' | 'user';
};

type MarkdownRow = RowBase & {
  type: 'markdown';
  body: string;            // GFM markdown
};

type ChartComponent = {
  id: string;
  title: string;
  subtitle?: string;       // units, period, filters in plain language
  chartType: ChartTypeName;
  query: ChartQuery;       // or queryId: string
  encoding: ChartEncoding; // maps query result columns → visual roles
  notes?: string;          // optional footnote under chart
  /** Optional flex hint; default equal share */
  flex?: number;           // e.g. 1, 2 — relative width in the row
};

type ComponentRow = RowBase & {
  type: 'component';
  /** One or more charts laid out in a horizontal flex row */
  components: ChartComponent[];
  /**
   * Layout hints for the flex container.
   * Default: equal-width children, no gap (charts can touch), wrap only if needed.
   */
  layout?: {
    gap?: number;          // px; default 0 so charts can touch
    align?: 'stretch' | 'start' | 'center';
    wrap?: boolean;        // default false for desktop; scaffold may wrap on narrow viewports
  };
};

type Row = MarkdownRow | ComponentRow;
```

`ChartEncoding` is chart-type-specific (e.g. `{ x, y, color?, size? }` for scatter; `{ category, value }` for bar). The skill fills encodings from profiled column types so charts are **correct by construction** (see §4.2).

### 3.4 How the agent chooses row type

When emitting a set of charts, the skill picks **per row**:

| Situation | Prefer |
|-----------|--------|
| Framing, caveats, aggregation explanation, takeaways | `markdown` row (full width) |
| One standalone viz that needs breathing room | `component` row with a **single** chart |
| Related metrics to compare at a glance (e.g. three distributions, three segments) | `component` row with **multiple** charts side by side |
| Unrelated charts that each need a long narrative | Separate `markdown` + single-chart `component` pairs, or stacked single-chart rows |

Rules of thumb:

- **Do not** force a markdown row between every chart.  
- **Do** place a markdown row when the reader needs context before or after a group.  
- In a multi-chart `component` row, keep titles short; shared context belongs in a preceding markdown row.  
- Prefer 2–3 charts per component row; more than 4 usually hurts readability unless intentionally small multiples.

### 3.5 Markdown authored by the skill

The skill should emit markdown rows that:

- State the experiment question before the first chart group  
- Explain non-obvious aggregations (“revenue is sum of `amount_usd` after excluding refunds”)  
- Call out outlier handling and excluded cohorts  
- Summarize findings after key chart groups  

Humans may edit markdown; the skill may regenerate sections marked `<!-- skill:managed -->` if that convention is adopted.

### 3.6 Renderer

`RowRenderer` maps `rows` sorted by `order` → React nodes:

- `markdown` → `MarkdownRow` (safe markdown → React), full content width  
- `component` → `ComponentRow` → horizontal flex of `ChartSlot`s → each resolves query → `ChartCatalog[chartType]`  

Empty query results: omit that chart slot (reflow remaining flex children) and show a short inline note *or* omit the whole component row if every slot is empty (prefer skill-side omission of empty charts).

On narrow viewports, `ComponentRow` may wrap or stack while keeping the same row identity—responsive behavior is scaffold-owned, not per-book CSS.

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

Decision rule for implementers: ship Recharts in the scaffold; keep `ChartCatalog` behind a thin adapter interface so a Visx swap does not rewrite `rows.json`.

### 4.2 Correct by construction

Charts must not accept arbitrary “plot these columns” without checks. The skill + runtime enforce:

1. **Type → allowed chart types** (e.g. two quantitative → scatter; quantitative + time → line; categorical + quantitative → bar).  
2. **Encoding validation** before render (missing columns, wrong dtypes → skill error or chart omitted).  
3. **Sensible defaults**: bar baseline at 0; labeled axes with units; title = metric + split; subtitle = filters / period / source.  
4. **Aggregation honesty**: if `groupBy` is set, `aggregate` is required (no accidental plotting of raw duplicated keys as if aggregated).

Primary guidance for viz decisions: the **bundled** Anthropic materials under `references/` (§11). Optional: re-check upstream if a pin is stale.

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

const ChartCatalog: Record<ChartTypeName, ChartComponentView> = {
  bar: BarChartView,
  bar_horizontal: HorizontalBarChartView,
  line: LineChartView,
  // ...
};
```

Each chart view receives `{ data, encoding, theme }` only—no knowledge of the file system.

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
┌─────────────────────────────────────────────────────────┐
│  Book title · experiment id                    [theme]  │
├─────────────────────────────────────────────────────────┤
│  Markdown row (full width) …                            │
├─────────────────────────────────────────────────────────┤
│  Component row │ Chart A │ Chart B │ Chart C │  (flex)  │
├─────────────────────────────────────────────────────────┤
│  Markdown row …                                         │
├─────────────────────────────────────────────────────────┤
│  Component row │           Chart D (full)      │        │
│  …                                                      │
└─────────────────────────────────────────────────────────┘
```

- Vertical stack of rows; max readable width (~720–880px) for **markdown** rows.  
- **Component** rows may use the same content width or a slightly wider chart band so multi-chart flex layouts remain usable.  
- Within a component row, children share horizontal space (equal by default); gap defaults to **0** so adjacent charts can touch.  
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

The skill **always emits the same application shell**. Per-book variance is data + `rows` (+ which catalog entries are referenced), not a new architecture.

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
    rows/
      RowRenderer.tsx        # always
      MarkdownRow.tsx        # always
      ComponentRow.tsx       # always — flex container for charts
      ChartSlot.tsx          # always — title/subtitle/notes + query + catalog
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
| `RowRenderer` | Sort by `order`, dispatch by row `type` |
| `MarkdownRow` | Render GFM safely, full width |
| `ComponentRow` | Flex layout for one or more chart slots |
| `ChartSlot` | Title/subtitle/notes + run query + catalog lookup |
| Chart views | Presentational only |

### 6.3 What the skill may change per book

- `book/rows.json` (and/or `queries.json`)  
- `data/canonical/*` and `data/understanding.md`  
- Book metadata: title, description, generated_at  
- **Not** a fork of `PageLayout` / theme / catalog architecture  

If a new chart type is needed, it is added to the **shared scaffold catalog** (product change), then skills may reference it—not one-off components inside a single book.

### 6.4 Emission modes

1. **Greenfield**: copy scaffold template → write data + rows → `npm install && npm run dev`.  
2. **Update**: re-run transforms and rewrite `rows.json` / canonical data; leave `app/src` untouched unless scaffold version bumps.

Scaffold version is pinned in `chart-book/scaffold.version` so skills know when to refresh the app shell.

---

## 7. Skill

### 7.1 Role

The **Chart Book skill** teaches an agent to:

1. Read bundled references under `references/` (see §11) before designing charts.  
2. Discover and profile data (repo paths, schemas, sample rows, quality).  
3. Infer experiment intent from user text + data shape.  
4. Write `understanding.md`.  
5. Design and run transforms → write canonical dataset + transform scripts.  
6. Choose chart types from data relationships (correct-by-construction rules + Anthropic viz guidance).  
7. Decide **row types**: which narrative is a markdown row; which charts share a flex component row vs stand alone.  
8. Define query objects + encodings.  
9. Write markdown rows that explain aggregations and findings.  
10. Emit/update the fixed scaffold and row list.  
11. Sanity-check: every chart query returns rows; titles include units; no empty decorative charts; multi-chart rows have a coherent comparison purpose.

### 7.2 Skill structure (suggested)

```text
skills/chart-book/
  SKILL.md                 # triggers, pipeline, invariants
  references/              # skill-local; also point at repo-root references/
    profiling.md
    chart-selection.md     # relationship → chart type
    row-layout.md          # when to use markdown vs multi-chart component rows
    query-schema.md
    scaffold-layout.md
    anti-patterns.md
  templates/
    scaffold/              # or pointer to package
```

Triggers (examples): “create a chart book”, “profile this experiment data”, “add charts for …”, “refresh the chart book after cleaning”.

### 7.3 Anthropic materials (required, bundled)

Chart-type selection and encoding are guided by the **packaged** Anthropic references in this repo (`references/anthropic-dataviz/` and `references/anthropic-data-plugin/`). They are part of the product package—not an optional remote fetch at runtime.

Guidance is **advisory for decisions**, not a second renderer. Output must still be Recharts (or the chosen catalog) query + encoding objects inside the row model.

### 7.4 Invariants the skill must not violate

- No per-chart copied CSV as source of truth.  
- No custom one-off chart components outside the catalog.  
- No light-only styling.  
- No cross-chart filter wiring in v1.  
- Do not target Cursor canvas as the host for Recharts.  
- Do not invent a third row type without a scaffold change.  
- Do not emit ad-hoc CSS grid/float layouts instead of `component` rows.

---

## 8. Open questions

1. **Cross-chart interaction** — Explicitly **out of scope for v1**. Revisit whether a single global filter bar (rewriting query `filter` fields) is worth the complexity once the query engine is stable.  
2. **Default chart library** — Recharts is the working default; a **Visx** comparison may change the default if minimal bundle size and custom aesthetics outweigh authoring speed. Keep the catalog adapter ready.  
3. **Query engine** — DuckDB-WASM vs Arquero vs precomputed caches for large canonical tables; pick based on typical N.  
4. **Skill hosting** — Cursor skill vs Claude skill vs both; scaffold emission path differs (local FS vs cloud agent).  
5. **pie / heatmap / box** — Finalize v1 catalog cut after first two real experiments.  
6. **Understanding format** — Pure markdown vs JSON schema for machine re-use in refresh runs.  
7. **Multi-canonical datasets** — v1 assumes one; some experiments need fact + dim tables. Prefer join-into-one-canonical first; multi-table query objects later if required.  
8. **Component-row max children** — Soft cap at 3 vs hard validation at 4; confirm after first real multi-chart books.

---

## 9. Acceptance criteria (implementer checklist)

- [ ] Fixed scaffold boots with dark theme and light toggle.  
- [ ] `rows.json` renders markdown rows and component rows in order.  
- [ ] A component row can hold multiple charts side by side in a flex layout (including equal-width, touching / zero-gap).  
- [ ] Chart slots execute query objects against one canonical dataset.  
- [ ] Editing a transform and refreshing canonical updates all charts without hand-editing chart data files.  
- [ ] Chart catalog resolves at least bar, line, scatter, histogram.  
- [ ] Skill doc describes profile → understand → transform → choose row types → emit end-to-end.  
- [ ] Skill / README points agents at `references/` Anthropic bundles.  
- [ ] No dependency on Cursor canvas for rendering.  
- [ ] README for a generated book documents how to refresh data.

---

## 10. External references

- Cursor canvas constraint: import only from `cursor/canvas`; no npm/Recharts in canvases.  
- Vercel Analytics chart stack: Visx ([vercel/vercel discussion #9232](https://github.com/vercel/vercel/discussions/9232)).  
- Vercel × Tremor: [vercel.com/blog/vercel-acquires-tremor](https://vercel.com/blog/vercel-acquires-tremor) (Tremor → Recharts).  
- shadcn charts: Recharts-based.  
- Anthropic knowledge-work-plugins `data/`: [github.com/anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (vendored under `references/anthropic-data-plugin/`).

---

## 11. Bundled references (package deal)

Any agent using **DataBook** must treat the materials under `references/` as required reading—the same “package deal” as the Chart Book skill and scaffold. Do not invent parallel chart conventions or skip these folders.

### 11.1 Layout

```text
references/
  README.md                      # index + role of each bundle
  anthropic-data-plugin/         # full Anthropic data plugin (vendored)
    UPSTREAM.md                  # pin / fetch provenance
    LICENSE                      # Apache-2.0 from upstream
    skills/                      # analyze, explore-data, create-viz, …
  anthropic-dataviz/             # data-viz method + viz-focused skills
    METHOD.md                    # form-first / color-last procedure digest
    UPSTREAM.md
    create-viz/                  # from the data plugin
    data-visualization/          # from the data plugin
```

### 11.2 Anthropic data plugin (`references/anthropic-data-plugin/`)

Vendored copy of the [`data/`](https://github.com/anthropics/knowledge-work-plugins/tree/main/data) plugin from [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (Apache-2.0).

**Role:** end-to-end analyst pipeline—explore, SQL, stats, validation, dashboards, and visualization skills. Chart Book agents use it for profiling habits, query craft, and dashboard judgment that complement (but do not replace) the Chart Book row/query model.

### 11.3 Anthropic data viz (`references/anthropic-dataviz/`)

Packaged data-visualization guidance:

- **`METHOD.md`** — condensed form-first, color-last procedure (pick form → assign color by job → validate palette → marks → hover → a11y → inspect).  
- **`create-viz/`** and **`data-visualization/`** — the plugin’s viz skills (chart-type tables, publication defaults), copied here for a single viz entry point.

**Role:** decide *what* to chart and *how* to encode it. Runtime still renders via the Chart Book catalog (Recharts by default); these references guide decisions, not a second renderer.

### 11.4 Agent obligations

1. Before choosing chart types or encodings, read `references/anthropic-dataviz/METHOD.md` and the relevant create-viz / data-visualization skill docs.  
2. When profiling or transforming unfamiliar data, consult skills under `references/anthropic-data-plugin/skills/`.  
3. When bumping vendored content, update each folder’s `UPSTREAM.md` and note intentional diffs—do not silently drift from upstream.

See also `references/README.md`.
