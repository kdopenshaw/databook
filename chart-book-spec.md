# Chart Book — Product & Implementation Spec

Status: draft for implementers  
Audience: engineers building the scaffold, data layer, and AI skill  
Related research context: Cursor canvases cannot host Recharts (sandbox = `cursor/canvas` only); this tool is a **standalone React app** (or app embedded in a host), not a Cursor canvas artifact.

**Bundled references:** The DataBook skill’s own markdown **routes** the agent to `references/` at specific pipeline steps (not ambient background). See §11.

---

## 1. Overview

### 1.1 What it is

A **chart book** is a fixed-shape React application that presents one experiment’s analysis as an ordered stack of **rows**: full-width markdown rows and **component rows** that can hold one or more charts side by side. An **AI skill** (agent skill / prompt pack) drives creation:

1. **Init** the scaffold automatically (built into skill invocation — see §7.5).
2. **Profile** unknown data (from a repo path, uploaded files, or a user description of sources).
3. **Write** a durable understanding of the data and the experiment (schema notes, grain, caveats, intended questions).
4. **Transform / aggregate** as needed for analysis.
5. **Persist** those transforms and a **single canonical JSON** of normalized rows.
6. **Emit** (or update) row definitions with **self-describing chart blocks** (query objects inlined).

The skill is **experiment-agnostic**: it does not hard-code domain workflows (finance, growth, labs). The same pipeline works for any tabular experiment the user points at.

### 1.2 Design goals

| Goal | Meaning |
|------|---------|
| Correct by construction | Charts declare *queries* against sitting data; they do not own private CSV forks that drift. |
| One scaffold | Every book is the same React app shell; only content (rows + which Recharts pieces are used) changes. |
| Narrative + viz | Markdown rows explain aggregations and decisions; component rows show one or more charts. |
| Flexible composition | The agent chooses per row: a full-width markdown row, or a flex component row with N charts side by side. |
| Minimal UI | Quiet dark-first chrome via CSS variables + root class toggle; consistent across all books. |
| Skill-first authoring | Humans rarely hand-edit chart wiring; invoking the skill runs init and owns profiling → emission. |

### 1.3 Non-goals (v1)

- Cross-chart brushing, linked highlighting, or global filter bars that rewrite other charts.
- Arbitrary notebook code cells executed in the browser.
- Hosting charts inside Cursor `.canvas.tsx` (incompatible with Recharts / npm).
- Replacing Plotly Studio / Hex for warehouse BI; this is a **repo-local / skill-emitted chart book**.
- Nested rows, free-form grids, or drag-and-drop layout editors.
- A pre-filled / restricted starter chart catalog (the agent uses Recharts’ full API).
- A separate user-facing `databook init` command (init is automatic when the skill runs).
- Generating a README inside emitted chart-book folders in other projects.

### 1.4 High-level flow

```text
Sources (repo files | user description)
        │
        ▼
   AI Skill invoked
        │  └── databook init (automatic; scaffold + trivial sample)
        ▼
   Profile + understand
        │  └── skill routes agent → references/anthropic-data-plugin/ …
        ▼
   Canonical dataset: one JSON file of normalized rows
        │
        ▼
   Choose charts + row types + write markdown
        │  └── skill routes agent → references/anthropic-dataviz/ …
        ▼
   Emit / update rows (queries inlined in each chart block)
        │  ├── src/data/canonical.json
        │  ├── src/data/understanding.md
        │  ├── src/data/rows.json
        │  └── src/components/… (fixed React shell)
        ▼
   User opens chart book (dark UI via .dark on root, top-to-bottom rows)
```

---

## 2. Data layer

### 2.1 Canonical dataset

After profiling, the book has **one canonical dataset**: **normalized rows in a single JSON file** (e.g. `src/data/canonical.json`). All charts read this file.

- **Grain** is explicit (e.g. “one row per order×day”, “one row per subject×trial”).
- **Column contract** is documented: name, type, nullability, units, categorical levels.
- Physical form is **JSON** (array of row objects, or `{ rows: [...] }` with optional column metadata — pick one shape and keep it stable in the scaffold).
- The runtime loads the JSON into memory. **Query objects shape data at read time** (filter / group / aggregate / sort / sample); charts do not ship private pre-cut copies of the data.

Transforms that produced the canonical set (joins, filters, derived columns) are saved as **reusable artifacts** (scripts + params + checksum of inputs) under the data tree, not discarded chat side effects.

### 2.2 Chart slices as inlined query objects (self-describing blocks)

Each chart **block** embeds its **query object** inside the chart definition in `rows.json`. Charts are **self-describing**: everything needed to render a chart lives on that block (title, chart wiring, encoding, query).

**Do not** use a separate recipe / query catalog file (no `queries.json`, no external query id indirection).

Suggested shape (TypeScript):

```ts
type ChartQuery = {
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

The renderer:

1. Loads `canonical.json`.
2. Runs the chart block’s inlined `query` against those rows.
3. Passes the resulting rows into the Recharts composition the skill emitted for that block.

### 2.3 Correction propagation

Because slices are queries over one JSON file, **corrections propagate automatically**:

| Change | Effect |
|--------|--------|
| Fix a bug in a derived canonical column / rewrite `canonical.json` | All charts re-query; no per-chart data rewrite. |
| Tighten a global exclusion in the transform | Re-run transform → refresh `canonical.json` → all charts update. |
| Edit one chart’s inlined `filter` / `groupBy` | Only that chart’s query result changes. |

Implementers must version or hash the canonical artifact so the UI can show “data stale / rebuilding” if transforms are mid-run.

### 2.4 Understanding document

The skill writes a first-class **understanding** artifact as markdown (`src/data/understanding.md`):

- Source inventory and how they were combined  
- Assumed experiment question(s)  
- Grain, primary keys, join logic  
- Quality issues (nulls, outliers, suspicious levels)  
- Transforms applied and why  
- Open caveats  

This is inputs for later markdown rows and for human review—not only chat ephemeral text.

### 2.5 Organization on disk (standard)

**DataBook product repo** (this repository) and **emitted chart books** use the same nested layout:

```text
<databook-or-book-root>/
  README.md                 # DataBook product repo ONLY — init must NOT emit this into other projects
  skill.md                  # top-level skill (router + pipeline); product repo
  chart-book-spec.md        # product repo
  references/               # Anthropic bundles (product repo; skill routes here)
  src/
    components/             # React UI: layout, rows, charts, theme toggle
    data/                   # canonical.json, rows.json, understanding.md, transforms/
```

Emitted books in other projects get `src/` (and whatever the scaffold needs to run) **without** a generated README. Document how to use DataBook in **this** repo’s root README only (§10).

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
| `markdown` | Full-width narrative row: experiment framing, how aggregations work, caveats, takeaways. Rendered with **react-markdown**. |
| `component` | Flex container row that holds **one or more** self-describing chart blocks side by side. |

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
  body: string;            // GFM markdown → react-markdown
};

/** Self-describing chart block: query is always inlined (no external recipe file). */
type ChartBlock = {
  id: string;
  title: string;
  subtitle?: string;       // units, period, filters in plain language
  /** Recharts composition the skill chose (component names / props), not a closed enum catalog */
  recharts: RechartsSpec;
  query: ChartQuery;       // always inlined
  encoding: ChartEncoding; // maps query result columns → visual roles
  notes?: string;          // optional footnote under chart
  /** Optional flex hint; default equal share */
  flex?: number;           // e.g. 1, 2 — relative width in the row
};

type ComponentRow = RowBase & {
  type: 'component';
  /** One or more chart blocks laid out in a horizontal flex row */
  components: ChartBlock[];
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

`ChartEncoding` maps query result columns to visual roles. The skill fills encodings from profiled column types so charts are **correct by construction** (see §4.2). `RechartsSpec` is whatever the skill needs to instantiate Recharts components from the **full Recharts API** — not a fixed starter list of chart type names.

### 3.4 How the agent chooses row type

When emitting a set of charts, the skill picks **per row**:

| Situation | Prefer |
|-----------|--------|
| Framing, caveats, aggregation explanation, takeaways | `markdown` row (full width) |
| One standalone viz that needs breathing room | `component` row with a **single** chart block |
| Related metrics to compare at a glance (e.g. three distributions, three segments) | `component` row with **multiple** chart blocks side by side |
| Unrelated charts that each need a long narrative | Separate `markdown` + single-chart `component` pairs, or stacked single-chart rows |

Rules of thumb:

- **Do not** force a markdown row between every chart.  
- **Do** place a markdown row when the reader needs context before or after a group.  
- In a multi-chart `component` row, keep titles short; shared context belongs in a preceding markdown row.  
- Prefer 2–3 charts per component row; more than 4 usually hurts readability unless intentionally small multiples.

### 3.5 Markdown authored by the skill

Markdown rows are rendered with **[react-markdown](https://github.com/remarkjs/react-markdown)**. The skill should emit markdown that:

- State the experiment question before the first chart group  
- Explain non-obvious aggregations (“revenue is sum of `amount_usd` after excluding refunds”)  
- Call out outlier handling and excluded cohorts  
- Summarize findings after key chart groups  

Humans may edit markdown; the skill may regenerate sections marked `<!-- skill:managed -->` if that convention is adopted.

### 3.6 Renderer

`RowRenderer` maps `rows` sorted by `order` → React nodes:

- `markdown` → `MarkdownRow` via **react-markdown**, full content width  
- `component` → `ComponentRow` → horizontal flex of chart slots → each runs its **inlined** query → renders the block’s Recharts composition  

Empty query results: omit that chart slot (reflow remaining flex children) and show a short inline note *or* omit the whole component row if every slot is empty (prefer skill-side omission of empty charts).

On narrow viewports, `ComponentRow` may wrap or stack while keeping the same row identity—responsive behavior is scaffold-owned, not per-book CSS.

---

## 4. Chart layer

### 4.1 Locked library: Recharts

**Charting library is locked: [Recharts](https://recharts.org/).**

- Declarative React components, broad API surface, React peer support in current majors.  
- The skill points the agent at **Recharts’ full API documentation**; the agent may compose **any** Recharts components appropriate to the data.  
- **Do not** maintain a pre-filled starter chart catalog or a closed `ChartTypeName` enum that restricts which Recharts pieces may be used.  
- Scaffold code may include thin helpers (theme-aware strokes/fills, responsive container wrappers) but must not imply a limited menu of “supported chart types.”

### 4.2 Correct by construction

Charts must not accept arbitrary “plot these columns” without checks. The skill + runtime enforce:

1. **Data relationships → allowed encodings** (e.g. two quantitative → scatter-like; quantitative + time → line/area; categorical + quantitative → bar).  
2. **Encoding validation** before render (missing columns, wrong dtypes → skill error or chart omitted).  
3. **Sensible defaults**: bar baseline at 0; labeled axes with units; title = metric + split; subtitle = filters / period / source.  
4. **Aggregation honesty**: if `groupBy` is set, `aggregate` is required (no accidental plotting of raw duplicated keys as if aggregated).

Primary guidance for viz *decisions*: Anthropic materials under `references/`, **when the skill routes the agent there** (§11). Runtime still renders via Recharts.

### 4.3 No starter catalog

There is **no** documented starter list (`bar`, `line`, `scatter`, …) that implementers must wire as a fixed catalog.

- The agent reads Recharts docs and chooses components (`LineChart`, `BarChart`, `ScatterChart`, compositions, etc.).  
- Persist enough structure in `RechartsSpec` / encoding for the scaffold to render what the skill emitted.  
- Adding a new visual form is a skill/content change, not a scaffold catalog PR—unless shared theme helpers need extending.

### 4.4 Interactivity (minimal)

**In scope:**

- Hover tooltips  
- Legend toggle for multi-series (optional)  
- Theme-aware colors via CSS variables  

**Out of scope (v1):**

- Cross-chart filtering / brushing  
- Shared time-range controls that rewrite sibling queries  
- Drill-down navigation between books  

See §8 open questions.

---

## 5. UI

### 5.1 Visual direction

- Quiet chrome, strong typography hierarchy, generous whitespace; no heavy card stacks.  
- **Dark mode default** via **CSS variables** and a **class toggle on the root element** (e.g. `class="dark"` on `<html>` or app root).  
- **No theme-provider library** (no ThemeProvider package, no CSS-in-JS theme context library). Persist preference in `localStorage` and set/remove the root class.  
- Same tokens for every chart book so books feel like one product.

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
- Sticky compact header with title + theme toggle only (toggle flips root class).

### 5.3 Theme tokens

Expose CSS variables on `:root` / `.dark` consumed by Recharts via `stroke`/`fill` props (and by layout chrome):

- `--cb-bg`, `--cb-fg`, `--cb-muted`, `--cb-border`  
- `--cb-accent`  
- `--cb-series-1` … `--cb-series-n` (colorblind-safe categorical)  
- `--cb-sequential-*` / diverging when needed  

Chart gridlines and axes use muted tokens; never hard-code pure `#000` / `#fff` in chart components.

### 5.4 Consistency rule

The scaffold owns all chrome. Skills **must not** emit custom CSS themes per experiment. Branding variance is limited to book title and markdown content.

---

## 6. Scaffold

### 6.1 One fixed React app (nested layout)

The skill **always emits the same application shell** under the nested structure in §2.5. Per-book variance is data + `rows.json` (+ which Recharts compositions appear), not a new architecture.

**Fixed entry point** (illustrative):

```text
src/
  main.tsx
  App.tsx                      # loads rows + canonical.json; applies root dark class
  components/
    theme/
      theme.css                # CSS variables for :root and .dark
      ThemeToggle.tsx          # sets/removes root class; localStorage — not a theme library
    layout/
      PageLayout.tsx           # header + scroll column
    rows/
      RowRenderer.tsx
      MarkdownRow.tsx          # react-markdown
      ComponentRow.tsx         # flex container for chart blocks
      ChartSlot.tsx            # title/subtitle/notes + run inlined query + Recharts
    charts/
      # thin helpers only (e.g. ResponsiveFrame) — no starter type catalog
  data/
    canonical.json             # normalized rows (one file)
    rows.json                  # ordered rows; queries inlined in chart blocks
    understanding.md
    loadCanonical.ts
    runQuery.ts
```

Dependencies include at least: `react`, `recharts`, `react-markdown`.

### 6.2 Standard components (required)

| Component | Responsibility |
|-----------|----------------|
| `ThemeToggle` | Dark default, light via root class + CSS variables; no theme-provider library |
| `PageLayout` | Header (title, toggle), main column |
| `RowRenderer` | Sort by `order`, dispatch by row `type` |
| `MarkdownRow` | **react-markdown**, full width |
| `ComponentRow` | Flex layout for one or more chart blocks |
| `ChartSlot` | Title/subtitle/notes + run **inlined** query + render Recharts spec |
| Chart helpers | Presentational wrappers only — not a closed catalog |

### 6.3 What the skill may change per book

- `src/data/rows.json` (self-describing chart blocks with inlined queries)  
- `src/data/canonical.json` and `src/data/understanding.md`  
- Book metadata: title, description, generated_at  
- Recharts compositions referenced by those blocks  
- **Not** a fork of `PageLayout` / token architecture / init sample pattern  

### 6.4 Emission modes and init sample

1. **Init (automatic on skill invoke)** — see §7.5: copy scaffold → write **minimal sample book**:
   - One **markdown** row whose body is effectively **“hello world”** (deliberately trivial).  
   - One **component** row with a single chart: an **exponential curve** over trivial synthetic points in `canonical.json`.  
   - Purpose: prove the pipeline boots. **Do not** make the sample rich enough to bias later experiment books.  
2. **Greenfield analysis**: after init, replace sample data/rows with profiled experiment content.  
3. **Update**: re-run transforms and rewrite `canonical.json` / `rows.json`; leave scaffold components untouched unless scaffold version bumps.

Scaffold version may be pinned (e.g. `scaffold.version`) so skills know when to refresh the app shell.

**Init must not** create a README inside the emitted chart-book folder when initializing into another project. The **DataBook product repo** keeps its own root README (§10).

---

## 7. Skill

### 7.1 Role

The **DataBook / Chart Book skill** (`skill.md` at repo root) teaches an agent to:

1. **Run databook init automatically** on invoke (§7.5).  
2. Follow **routed** reads into `references/` at the right pipeline steps (§11) — not “read everything up front.”  
3. Discover and profile data (repo paths, schemas, sample rows, quality).  
4. Infer experiment intent from user text + data shape.  
5. Write `understanding.md`.  
6. Design and run transforms → write **one** `canonical.json` of normalized rows.  
7. Choose Recharts compositions from data relationships + routed viz guidance.  
8. Decide **row types**: markdown vs flex component rows.  
9. Write **self-describing** chart blocks with **inlined** query objects + encodings.  
10. Write markdown rows (react-markdown content) that explain aggregations and findings.  
11. Replace the trivial init sample with real content; sanity-check non-empty queries and coherent multi-chart rows.

### 7.2 Skill structure (standard)

```text
skill.md                       # top-level: triggers, pipeline, init, reference router
references/                    # bundled Anthropic materials (see §11)
  anthropic-data-plugin/
  anthropic-dataviz/
src/                           # scaffold template + (in product repo) working tree
  components/
  data/
```

Optional skill-local notes may live beside `skill.md` if needed; the **router** that says *when* to open each Anthropic file lives in **`skill.md`**.

Triggers (examples): “create a chart book”, “profile this experiment data”, “add charts for …”, “refresh the chart book after cleaning”.

### 7.3 Anthropic materials (routed, not ambient)

Bundled Anthropic references are **required package contents**, but they are **not** ambient background the agent should absorb wholesale at start.

`skill.md` acts as a **router**: it tells the agent **exactly when** to open which reference (examples in §11.4). Guidance remains **advisory for decisions**, not a second renderer. Output must still be Recharts + inlined queries inside the row model.

### 7.4 Invariants the skill must not violate

- No per-chart copied JSON/CSV as source of truth.  
- No separate query/recipe file; queries stay inlined on chart blocks.  
- No closed starter chart catalog that blocks Recharts API use.  
- No theme-provider library; root class + CSS variables only.  
- No light-only styling.  
- No cross-chart filter wiring in v1.  
- Do not target Cursor canvas as the host for Recharts.  
- Do not invent a third row type without a scaffold change.  
- Do not emit ad-hoc CSS grid/float layouts instead of `component` rows.  
- Do not generate a README inside emitted books in other projects.  
- Do not require the user to run a separate init command.

### 7.5 Built-in `databook init`

**Invoking the skill runs init automatically.** There is no separate init command for the user to remember.

Init:

1. Ensures the nested scaffold (`src/components`, `src/data`, …) exists.  
2. Writes the **minimal sample** (hello-world markdown + exponential curve chart + tiny `canonical.json`).  
3. Does **not** write a README into the target book folder when the target is another project.  
4. Then continues the skill pipeline (profile / replace sample / emit real rows) as the user request requires.

If a book scaffold already exists, init is a no-op or a version-aware refresh — still triggered by the skill, not by a user-facing CLI they must memorize.

---

## 8. Open questions

1. **Cross-chart interaction** — Explicitly **out of scope for v1**. Revisit whether a single global filter bar (rewriting inlined query `filter` fields) is worth the complexity once the query engine is stable.  
2. **Query engine** — Simple in-memory JS vs Arquero vs DuckDB-WASM for large `canonical.json`; pick based on typical N.  
3. **Skill hosting** — Cursor skill vs Claude skill vs both; emission path differs (local FS vs cloud agent).  
4. **Multi-canonical datasets** — v1 assumes one JSON file; some experiments need fact + dim tables. Prefer join-into-one-canonical first; multi-file later if required.  
5. **Component-row max children** — Soft cap at 3 vs hard validation at 4; confirm after first real multi-chart books.  
6. **`RechartsSpec` persistence shape** — Exact JSON form for storing arbitrary Recharts compositions in `rows.json` (serializable element tree vs declarative DSL); lock after first working emitter.

---

## 9. Acceptance criteria (implementer checklist)

- [ ] Fixed scaffold boots with dark default via CSS variables + root class toggle (no theme-provider library).  
- [ ] `rows.json` renders markdown rows (**react-markdown**) and component rows in order.  
- [ ] A component row can hold multiple charts side by side in a flex layout (including equal-width, touching / zero-gap).  
- [ ] Chart blocks carry **inlined** query objects; no separate queries/recipe file.  
- [ ] Canonical data is **one JSON file** of normalized rows; queries shape data at read time.  
- [ ] Skill invoke runs **databook init** automatically and installs the trivial hello-world + exponential sample.  
- [ ] Init into another project does **not** create a book-local README.  
- [ ] DataBook product repo has a **root README**.  
- [ ] `skill.md` routes agents to Anthropic references at the correct pipeline steps (not ambient dump).  
- [ ] No closed starter chart catalog; agent may use Recharts’ full API.  
- [ ] Nested layout standard: `src/components`, `src/data`, `references`, top-level `skill.md`.  
- [ ] No dependency on Cursor canvas for rendering.

---

## 10. DataBook root README

This **product repository** (`kdopenshaw/databook`) includes a **root `README.md`** describing what DataBook is, how to invoke the skill, and where `references/` and the scaffold live.

**Emitted chart books** in other projects **must not** get an auto-generated README from init. Operators who want project-local docs write them themselves.

---

## 11. Bundled references (routed package deal)

Materials under `references/` ship with DataBook. They are **not** ambient background. The agent reads them **when `skill.md` says so**.

### 11.1 Layout

```text
references/
  README.md                      # short index; skill.md is the router
  anthropic-data-plugin/         # full Anthropic data plugin (vendored)
    UPSTREAM.md
    LICENSE
    skills/                      # analyze, explore-data, create-viz, …
  anthropic-dataviz/             # data-viz method + viz-focused skills
    METHOD.md
    UPSTREAM.md
    create-viz/
    data-visualization/
```

### 11.2 Anthropic data plugin (`references/anthropic-data-plugin/`)

Vendored copy of the [`data/`](https://github.com/anthropics/knowledge-work-plugins/tree/main/data) plugin from [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (Apache-2.0).

**Role:** profiling, exploration, SQL/stats/validation habits. Used when the skill is in **data understanding / transform** phases — not as a blanket read at session start.

### 11.3 Anthropic data viz (`references/anthropic-dataviz/`)

- **`METHOD.md`** — form-first, color-last procedure digest.  
- **`create-viz/`** and **`data-visualization/`** — chart-type / publication guidance.

**Role:** decide *what* to chart and *how* to encode it **during chart selection / encoding**. Runtime still renders Recharts; these files guide decisions.

### 11.4 Router (what `skill.md` must encode)

`skill.md` must include explicit routing, for example:

| Pipeline step | Open |
|---------------|------|
| Profiling / exploring unfamiliar sources | `references/anthropic-data-plugin/skills/explore-data/` (and related plugin skills as needed) |
| Validation / statistical checks | `references/anthropic-data-plugin/skills/validate-data/`, `statistical-analysis/`, etc. |
| Choosing chart form / encodings | `references/anthropic-dataviz/METHOD.md`, then `create-viz/` / `data-visualization/` as needed |
| Building the book shell / rows | Chart Book rules in `skill.md` + this spec — not Anthropic dashboard skills as a second layout system |

Do **not** instruct the agent to “read all of `references/` before starting.” Do **not** treat Anthropic dashboard builders as a replacement for the Chart Book row model.

### 11.5 Maintenance

When bumping vendored content, update each folder’s `UPSTREAM.md` and note intentional diffs. Keep `skill.md` router paths in sync with folder names.

---

## 12. External references

- Cursor canvas constraint: import only from `cursor/canvas`; no npm/Recharts in canvases.  
- Recharts: [recharts.org](https://recharts.org/) (locked charting library; full API available to the skill).  
- react-markdown: [github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown).  
- Anthropic knowledge-work-plugins `data/`: [github.com/anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (vendored under `references/anthropic-data-plugin/`).
