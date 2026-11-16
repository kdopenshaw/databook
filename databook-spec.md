# DataBook — Product & Implementation Spec

Status: draft for implementers  
Audience: engineers building the scaffold, data layer, and AI skill  
Related research context: Cursor canvases cannot host Recharts (sandbox = `cursor/canvas` only); this tool is a **standalone React app** (or app embedded in a host), not a Cursor canvas artifact.

**Bundled references:** The DataBook skill’s own markdown **routes** the agent to `references/` at specific pipeline steps (not ambient background). See §11.

---

## 1. Overview

### 1.1 What it is

A **DataBook** is a fixed-shape React application that presents one experiment’s analysis as **tabbed sections of rows**: full-width markdown rows and **component rows** that can hold one or more charts side by side, with a **sidebar** for jumping between sections when the book grows large. An **AI skill** (agent skill / prompt pack) drives creation:

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
| One scaffold | Every book is the same React app shell; only content (tabs, rows, which Recharts pieces are used) changes. |
| Narrative + viz | Markdown rows explain aggregations and decisions; component rows show one or more charts. |
| Flexible composition | The agent chooses per row: a full-width markdown row, or a flex component row with N charts side by side. |
| Sectioned navigation | **Tabs** (Geist) are the primary section nav. Optional **pages** group tabs; the sidebar lists pages only (never a 1:1 duplicate of tabs). |
| Minimal UI | Quiet dark-first chrome on **Geist** typography/spacing tokens + CSS variables + root class toggle; consistent across all books. |
| Skill-first authoring | Humans rarely hand-edit chart wiring; invoking the skill runs init and owns profiling → emission. |

### 1.3 Non-goals (v1)

- Cross-chart brushing, linked highlighting, or global filter bars that rewrite other charts.
- Arbitrary notebook code cells executed in the browser.
- Hosting charts inside Cursor `.canvas.tsx` (incompatible with Recharts / npm).
- Replacing Plotly Studio / Hex for warehouse BI; this is a **repo-local / skill-emitted DataBook**.
- Nested rows, free-form grids, or drag-and-drop layout editors (in-place **(+)** markdown insert between rows is in scope).
- An unbounded “any Recharts component” emission path (v1 uses a stock RechartsSpec set; see §4.1).
- A separate user-facing `databook init` command (init is automatic when the skill runs).
- Generating a README inside emitted databook folders in other projects.

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
        │  ├── src/data/rows.json   # tabs → sections → rows
        │  └── src/components/… (fixed shell: sidebar, tabs, rows)
        ▼
   User opens DataBook (sidebar + Geist tabs + rows; dark via .dark on root)
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
  aggregate?: AggSpec[];      // { column, fn: 'sum' | 'mean' | 'count' | 'share' | 'count_if' | 'sum_if' | 'mean_if' | ... , as, where? }
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

**DataBook product repo** (this repository) and **emitted databooks** use the same nested layout:

```text
<databook-or-book-root>/
  README.md                 # DataBook product repo ONLY — init must NOT emit this into other projects
  SKILL.md                  # top-level skill (router + pipeline); product repo
  databook-spec.md        # product repo
  references/               # Anthropic bundles (product repo; skill routes here)
  src/
    components/             # React UI: sidebar, Geist tabs, layout, rows, charts, theme toggle
    data/                   # canonical.json, rows.json (tabs→rows), understanding.md, transforms/
```

Emitted books in other projects get `src/` (and whatever the scaffold needs to run) **without** a generated README. Document how to use DataBook in **this** repo’s root README only (§10).

---

## 3. Document model

### 3.1 Tabbed sections of rows (not strict markdown↔chart alternation)

The DataBook is a **document of tabbed sections**, each section a **linear stack of rows**, conceptually like Jupyter, but **not** limited to alternating markdown and a single chart:

- Top level: **tabs** (sections); each tab owns an ordered list of rows  
- Typed **rows** with an explicit **order index** within a tab  
- Rows render **top to bottom** inside the active tab  
- **Two row types** in v1: `markdown` and `component`  
- **Sidebar** lists tabs / sections for jump navigation (scaffold primitive)  
- No free-form floating canvas layout in v1  

**There is no requirement** that markdown and charts alternate one-for-one. Outside any component row, markdown is its own full-width row. Inside a component row, multiple charts can sit **side by side** in a flex container (e.g. three charts touching horizontally).

The agent **decides** which tab a set of rows belongs to, and **per row** which type to emit—based on narrative needs and whether comparisons read better as small multiples in one flex row vs stacked full-width charts.

### 3.2 Row types (v1)

| Type | Role |
|------|------|
| `markdown` | Full-width narrative row: experiment framing, how aggregations work, caveats, findings. Rendered with **react-markdown**. Do **not** title blocks “Analyst ask/take/note” unless the human asks. |
| `component` | Flex container row that holds **one or more** self-describing chart blocks side by side. |

Future (out of scope for v1 wiring, reserved ids): `callout`, `table`, `stat_row` as additional row types or as children of `component`.

### 3.3 Book / tab / row schema

Tabs are the **primary** nav primitive. The sidebar mounts **only when `pages` are defined** (page groups). The skill supplies metadata—not custom tab/sidebar implementations. Prefer `src/data/types.ts` as the live contract.

```ts
type BookDocument = {
  title: string;
  tabs: TabSection[];
  /** Optional default tab id; else first tab */
  defaultTabId?: string;
  /** Optional page groups; when set, Sidebar lists pages and tabs filter to the active page */
  pages?: BookPage[];
  /** House rules for editors + chart lint (palette, population, zero-baseline, …) */
  conventions?: BookConventions;
};

type BookPage = {
  id: string;
  label: string;
  order: number;
  tabIds: string[];
};

type BookConventions = {
  notes?: string[];
  zeroBaselineBars?: boolean; // default true for lint
  palette?: Record<string, string>;
  population?: string;
};

type TabSection = {
  id: string;
  label: string;           // shown in Geist Tabs
  order: number;
  rows: Row[];
};

type RowBase = {
  id: string;
  order: number;           // sortable; fractional values (1.5) allowed
  createdBy: 'skill' | 'user';
};

type MarkdownRow = RowBase & {
  type: 'markdown';
  body: string;            // GFM markdown → react-markdown
};

/** Self-describing chart block, or a ref to another block (Summary without copied queries). */
type ChartBlock = {
  id: string;
  title: string;
  subtitle?: string;       // units, period, filters in plain language
  ref?: string;            // reuse another chart id; omit query/recharts when set
  scaleGroup?: string;     // related measures share yDomain without identical dataKeys
  recharts?: RechartsSpec;
  query?: ChartQuery;      // inlined when not using ref
  encoding?: ChartEncoding;
  notes?: string;
  flex?: number;
};

type ComponentRow = RowBase & {
  type: 'component';
  components: ChartBlock[];
  layout?: {
    gap?: number;          // px; scaffold default 16
    align?: 'stretch' | 'start' | 'center';
    wrap?: boolean;        // default true
  };
};

type Row = MarkdownRow | ComponentRow;
```

`ChartEncoding` maps query result columns to visual roles. Stock **`RechartsSpec`** fields (horizontal bars via `layout: "vertical"`, `stackId`, axis labels, domains, `colorBy`, numeric `xType`, …) are documented in `SKILL.md` and `src/data/types.ts`. Unknown marks fail `npm run ok` (live chart lint). Generators must preserve `createdBy: "user"` rows via `mergeUserRows`.

### 3.4 How the agent chooses row type

When emitting a set of charts, the skill picks **per row**:

| Situation | Prefer |
|-----------|--------|
| Framing, caveats, aggregation explanation, findings | `markdown` row (full width) |
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
- Summarize findings after key chart groups as normal prose (headings that state the finding)

**Do not** invent meta sections titled “Analyst ask”, “Analyst take”, “Analyst takeaways”, “Analyst note”, or similar role labels unless the human explicitly requests that framing.

Humans may insert and edit markdown in the running book via the scaffold **(+)** control between rows (`createdBy: "user"`). The skill may regenerate skill-authored sections; generators must preserve user rows via `mergeUserRows`.

### 3.6 Renderer

Scaffold shell:

1. **`BookTabs`** — primary section nav (sticky strip, arrow-key roving tabindex, `?tab=` via `pushState`).  
2. **`Sidebar`** — only when `pages[]` is set; lists pages (not a duplicate of tabs). Hidden on narrow viewports.  
3. **`RowRenderer`** — maps the active tab’s `rows` sorted by `order` → React nodes, with a quiet **(+)** insert gap before/between/after rows:
   - `markdown` → `MarkdownRow` via **react-markdown**, full content width (user rows are editable; no “Analyst …” chrome)  
   - `component` → `ComponentRow` → horizontal flex of chart slots → each runs its **inlined** query → renders the block’s Recharts composition  

Empty query results: omit that chart slot (reflow remaining flex children) and show a short inline note *or* omit the whole component row if every slot is empty (prefer skill-side omission of empty charts).

On narrow viewports, `ComponentRow` wraps/stacks; the page sidebar is hidden and a sticky horizontal page switcher appears when `pages` exist; sticky tabs remain section nav (with overflow fade + scroll cue)—responsive behavior is scaffold-owned, not per-book CSS. Chart headers share a min-height so sibling plot baselines stay aligned.

Init sample may use a **single** tab (still mounting Tabs + Sidebar so every book exercises the primitives).

---

## 4. Chart layer

### 4.1 Locked library: Recharts (stock renderer)

**Charting library is locked: [Recharts](https://recharts.org/).**

- Declarative React components with React peer support in current majors.  
- The scaffold ships a **stock renderer** with a **closed** set of chart roots and series marks (see `SKILL.md` → RechartsSpec and `src/data/types.ts`):  
  - Roots: `LineChart`, `BarChart`, `AreaChart`, `ScatterChart`  
  - Marks: `Line`, `Bar`, `Area`, `Scatter`  
- Agents choose among those stock compositions (plus documented `RechartsSpec` fields: `layout`, `stackId`, domains, `colorBy`, …). Unknown roots/marks fail `npm run ok` / chart lint.  
- Extending the visual vocabulary is a **scaffold change** (renderer + lint), not an unbounded “emit any Recharts tree” content change.  
- Thin helpers (theme-aware strokes/fills, responsive wrappers) are allowed; do not fork a second chart library.

### 4.2 Correct by construction

Charts must not accept arbitrary “plot these columns” without checks. The skill + runtime enforce:

1. **Data relationships → allowed encodings** (e.g. two quantitative → scatter-like; quantitative + time → line/area; categorical + quantitative → bar).  
2. **Encoding validation** before render (missing columns, wrong dtypes → skill error or chart omitted).  
3. **Sensible defaults**: bar baseline at 0; labeled axes with units; title = metric + split; subtitle = filters / period / source.  
4. **Aggregation honesty**: if `groupBy` is set, `aggregate` is required (no accidental plotting of raw duplicated keys as if aggregated).

Primary guidance for viz *decisions*: Anthropic materials under `references/` (**when** the skill routes the agent there — §11), mapped onto the stock RechartsSpec. Runtime still renders via the stock Recharts renderer.

### 4.3 Stock set, not an open catalog

There is a documented stock list (the four roots / four marks above). That is intentional:

- Anthropic `create-viz` / `data-visualization` may recommend forms outside the stock set (heatmap, sankey, …); agents must map those to stock marks or use markdown/table instead.  
- Persist compositions in `RechartsSpec` / encoding for the scaffold to render.  
- Adding a new visual form requires extending the stock renderer and chart lint — not only a skill-content change.

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
- **Geist** (open-source design system) supplies **typography and spacing tokens** plus selected components (**Tabs**).  
- The **rest of the primitive set is custom-built on top of Geist tokens**: page shell, sidebar, row container, markdown block, chart slot. Do not pull an entire third-party app shell; compose DataBook chrome from Geist foundations + these custom primitives.  
- **Dark mode default** via **CSS variables** (aligned with Geist where applicable) and a **class toggle on the root element** (e.g. `class="dark"` on `<html>` or app root).  
- **No theme-provider library** (no ThemeProvider package, no CSS-in-JS theme context library). Persist preference in `localStorage` and set/remove the root class.  
- Same tokens for every DataBook so books feel like one product.

### 5.2 Layout

```text
┌──────────┬──────────────────────────────────────────────┐
│ Sidebar  │  Book title · experiment id         [theme]  │
│          ├──────────────────────────────────────────────┤
│ Overview │  [ Geist Tabs: Overview | Results | … ]      │
│ Results  ├──────────────────────────────────────────────┤
│ Appendix │  Markdown row (full width) …                 │
│   …      │  Component row │ A │ B │ C │  (flex)         │
│          │  …                                           │
└──────────┴──────────────────────────────────────────────┘
```

- **Sidebar** (scaffold primitive): navigates among tab groups / sections; always part of the shell so large books (many charts) stay scannable.  
- **Tabs** (Geist Tabs, scaffold primitive): group rows into sections; expected **default feature of every data book** (even a single-tab init sample mounts them).  
- Vertical stack of rows **inside the active tab**; max readable width (~720–880px) for **markdown** rows.  
- **Component** rows may use the same content width or a slightly wider chart band so multi-chart flex layouts remain usable.  
- Within a component row, children share horizontal space (equal by default); gap defaults to **0** so adjacent charts can touch.  
- Sticky compact header with title + theme toggle (toggle flips root class).

### 5.3 Tabs (Geist)

- Use Geist’s **Tabs** component from the open-source Geist design system (e.g. `@vercel/geistcn` / published Geist Tabs API).  
- Skill emits `tabs[]` with `id` / `label` / `rows`; optional `pages[]` for Sidebar grouping (mobile page switcher when the sidebar is hidden). Chart honesty is enforced by `src/data/chartLint.ts` via **`npm run ok`** (live book + canonical) — bar axes include 0, line zooms are stated, sibling panels share domains via identical `dataKey` aliases or `scaleGroup`, and near-flat “trend” bands are rejected unless flatness is acknowledged. `npm run lint:charts` remains unit tests of the linter only.  
- Prefer reflecting the active tab in the URL (`?tab=` via `pushState`; optional `?page=`) so refresh and Back work — scaffold-owned.  
- Tabs are **not** generated as one-off per-book UI; only labels and row membership vary.

### 5.4 Sidebar

- Fixed scaffold **Sidebar** lists the same sections as the tabs (and may later nest anchors within a long tab if needed).  
- Clicking a sidebar item selects that tab (and scrolls to top of section content).  
- Purpose: jump navigation when a book has many charts (e.g. 25) so users are not trapped in one endless scroll.  
- Implementation is custom DataBook chrome on Geist tokens—not a per-book generated nav tree of arbitrary widgets.

### 5.5 Theme tokens

Expose CSS variables on `:root` / `.dark`, preferring **Geist typography/spacing** foundations, consumed by layout chrome and by Recharts via `stroke`/`fill` props:

- Geist-aligned type/spacing scale (as provided by the Geist package / tokens)  
- `--dbk-bg`, `--dbk-fg`, `--dbk-muted`, `--dbk-border`  
- `--dbk-accent`  
- `--dbk-series-1` … `--dbk-series-n` (colorblind-safe categorical)  
- `--dbk-sequential-*` / diverging when needed  

Chart gridlines and axes use muted tokens; never hard-code pure `#000` / `#fff` in chart components.

### 5.6 Consistency rule

The scaffold owns all chrome (sidebar, tabs, page shell, row/chart primitives). Skills **must not** emit custom CSS themes or alternate tab/sidebar implementations per experiment. Branding variance is limited to book title, tab labels, and markdown content.

---

## 6. Scaffold

### 6.1 One fixed React app (nested layout)

The skill **always emits the same application shell** under the nested structure in §2.5. Per-book variance is data + `rows.json` (tabs/sections/rows + which Recharts compositions appear), not a new architecture.

**Primitive split:**

| From Geist | Custom on Geist tokens |
|------------|-------------------------|
| Typography & spacing tokens | Page shell (`PageLayout`) |
| **Tabs** component | **Sidebar** |
| | Row container / `RowRenderer` |
| | Markdown block (`MarkdownRow`) |
| | Chart slot (`ChartSlot`) + Recharts helpers |

**Fixed entry point** (illustrative):

```text
src/
  main.tsx
  App.tsx                      # loads book doc + canonical.json; applies root dark class
  components/
    theme/
      theme.css                # Geist-aligned + --dbk-* variables for :root and .dark
      ThemeToggle.tsx          # sets/removes root class; localStorage — not a theme library
    layout/
      PageLayout.tsx           # header + sidebar + main column
      Sidebar.tsx              # FIXED primitive — jump between tab groups / sections
      BookTabs.tsx             # FIXED primitive — wraps Geist Tabs; groups rows into sections
    rows/
      RowRenderer.tsx
      MarkdownRow.tsx          # react-markdown
      ComponentRow.tsx         # flex container for chart blocks
      ChartSlot.tsx            # title/subtitle/notes + run inlined query + Recharts
    charts/
      # thin helpers only (e.g. ResponsiveFrame) — stock RechartsSpec set (§4.1)
  data/
    canonical.json             # normalized rows (one file)
    rows.json                  # BookDocument: tabs → rows; queries inlined in chart blocks
    understanding.md
    loadCanonical.ts
    runQuery.ts
```

Dependencies include at least: `react`, `recharts`, `react-markdown`. Geist typography is **vendored** (`public/fonts/*.woff2`); Tabs are the scaffold `BookTabs` primitive (do not add the `geist` npm package — it peers Next unused).

### 6.2 Standard components (required)

| Component | Responsibility |
|-----------|----------------|
| `ThemeToggle` | Dark default, light via root class + CSS variables; no theme-provider library |
| `PageLayout` | Header (title, toggle), **sidebar**, main column with tabs + rows |
| `Sidebar` | **Fixed** nav among tab groups / sections; not generated per book |
| `BookTabs` | **Fixed** wrapper around **Geist Tabs**; every book includes it |
| `RowRenderer` | Sort by `order`, dispatch by row `type` (inside active tab) |
| `MarkdownRow` | **react-markdown**, full width |
| `ComponentRow` | Flex layout for one or more chart blocks |
| `ChartSlot` | Title/subtitle/notes + run **inlined** query + render Recharts spec |
| Chart helpers | Presentational wrappers only — not a closed catalog |

### 6.3 What the skill may change per book

- `src/data/rows.json` (tab labels/membership + self-describing chart blocks with inlined queries)  
- `src/data/canonical.json` and `src/data/understanding.md`  
- Book metadata: title, description, generated_at  
- Recharts compositions referenced by those blocks  
- **Not** a fork of `PageLayout` / `Sidebar` / `BookTabs` / token architecture / init sample pattern  

### 6.4 Emission modes and init sample

1. **Init (automatic on skill invoke)** — see §7.5: copy scaffold → write **minimal sample book**:
   - One tab (e.g. label “Overview”) so **Geist Tabs** + **Sidebar** still mount.  
   - One **markdown** row whose body is effectively **“hello world”** (deliberately trivial).  
   - One **component** row with a single chart: an **exponential curve** over trivial synthetic points in `canonical.json`.  
   - Purpose: prove the pipeline boots. **Do not** make the sample rich enough to bias later experiment books.  
2. **Greenfield analysis**: after init, replace sample data/rows with profiled experiment content.  
3. **Update**: re-run transforms and rewrite `canonical.json` / `rows.json`; leave scaffold components untouched unless scaffold version bumps.

Scaffold version may be pinned (e.g. `scaffold.version`) so skills know when to refresh the app shell.

**Init must not** create a README inside the emitted databook folder when initializing into another project. The **DataBook product repo** keeps its own root README (§10).

---

## 7. Skill

### 7.1 Role

The **DataBook skill** (`SKILL.md` at repo root) teaches an agent to:

1. **Run databook init automatically** on invoke (§7.5).  
2. Follow **routed** reads into `references/` at the right pipeline steps (§11) — not “read everything up front.”  
3. Discover and profile data (repo paths, schemas, sample rows, quality).  
4. Infer experiment intent from user text + data shape.  
5. Write `understanding.md`.  
6. Design and run transforms → write **one** `canonical.json` of normalized rows.  
7. Choose Recharts compositions from data relationships + routed viz guidance.  
8. Decide **tabs/sections** (group related rows) and **row types**: markdown vs flex component rows.  
9. Write **self-describing** chart blocks with **inlined** query objects + encodings.  
10. Write markdown rows (react-markdown content) that explain aggregations and findings.  
11. Replace the trivial init sample with real content; sanity-check non-empty queries, coherent multi-chart rows, and sidebar/tab labels that scale for large books.

### 7.2 Skill structure (standard)

```text
SKILL.md                       # top-level: triggers, pipeline, init, reference router
references/                    # bundled Anthropic materials (see §11)
  anthropic-data-plugin/
  anthropic-dataviz/
src/                           # scaffold template + (in product repo) working tree
  components/
  data/
```

Optional skill-local notes may live beside `SKILL.md` if needed; the **router** that says *when* to open each Anthropic file lives in **`SKILL.md`**.

Triggers (examples): “create a DataBook”, “profile this experiment data”, “add charts for …”, “refresh the DataBook after cleaning”.

### 7.3 Anthropic materials (routed, not ambient)

Bundled Anthropic references are **required package contents**, but they are **not** ambient background the agent should absorb wholesale at start.

`SKILL.md` acts as a **router**: it tells the agent **exactly when** to open which reference (examples in §11.4). Guidance remains **advisory for decisions**, not a second renderer. Output must still be Recharts + inlined queries inside the row model.

### 7.4 Invariants the skill must not violate

- No per-chart copied JSON/CSV as source of truth.  
- No separate query/recipe file; queries stay inlined on chart blocks.  
- No marks outside the stock RechartsSpec set without a scaffold renderer + lint change.  
- No theme-provider library; root class + CSS variables only.  
- No light-only styling.  
- No cross-chart filter wiring in v1.  
- Do not target Cursor canvas as the host for Recharts.  
- Do not invent a third row type without a scaffold change.  
- Do not emit ad-hoc CSS grid/float layouts instead of `component` rows.  
- Do not replace or fork **Sidebar** / **BookTabs** (Geist) with per-book custom nav.  
- Do not generate a README inside emitted books in other projects.  
- Do not require the user to run a separate init command.  
- Do not invent “Analyst ask / take / takeaways / note” (or similar meta role labels) as default markdown section titles unless the human explicitly asks.

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
5. **Component-row max children** — Soft cap at 3 vs hard validation at 4; confirm after first real multi-databooks.  
6. **`RechartsSpec` persistence shape** — Exact JSON form for storing arbitrary Recharts compositions in `rows.json` (serializable element tree vs declarative DSL); lock after first working emitter.

---

## 9. Acceptance criteria (implementer checklist)

- [ ] Fixed scaffold boots with dark default via CSS variables + root class toggle (no theme-provider library).  
- [ ] **Geist Tabs** (`BookTabs`) and **Sidebar** mount on every book (including single-tab init).  
- [ ] Tabs group rows into sections (primary nav); optional pages drive Sidebar (no 1:1 tab duplicate).  
- [ ] Geist provides typography/spacing tokens + Tabs; page shell, sidebar, row container, markdown block, chart slot are custom on those tokens.  
- [ ] `rows.json` (`BookDocument`) renders markdown rows (**react-markdown**) and component rows in order inside the active tab.  
- [ ] Running book offers a quiet **(+)** between rows to insert editable user markdown; inserts persist (browser overlay + `mergeUserRows` shape).  
- [ ] Skill markdown is findings prose — no default “Analyst ask/take” framing.  
- [ ] A component row can hold multiple charts side by side; `ref` reuses charts; `npm run ok` gates honesty (live lint + query smoke).   
- [ ] Chart blocks carry **inlined** query objects; no separate queries/recipe file.  
- [ ] Canonical data is **one JSON file** of normalized rows; queries shape data at read time.  
- [ ] Skill invoke runs **databook init** automatically and installs the trivial hello-world + exponential sample.  
- [ ] Init into another project does **not** create a book-local README.  
- [ ] DataBook product repo has a **root README**.  
- [ ] `SKILL.md` routes agents to Anthropic references at the correct pipeline steps (not ambient dump).  
- [ ] Stock RechartsSpec only (four roots / four marks); unknown marks fail `npm run ok`.  
- [ ] Nested layout standard: `src/components`, `src/data`, `references`, top-level `SKILL.md`.  
- [ ] No dependency on Cursor canvas for rendering.

---

## 10. DataBook root README

This **product repository** (`kdopenshaw/databook`) includes a **root `README.md`** describing what DataBook is, how to invoke the skill, and where `references/` and the scaffold live.

**Emitted databooks** in other projects **must not** get an auto-generated README from init. Operators who want project-local docs write them themselves.

---

## 11. Bundled references (routed package deal)

Materials under `references/` ship with DataBook. They are **not** ambient background. The agent reads them **when `SKILL.md` says so**.

### 11.1 Layout

```text
references/
  README.md                      # short index; SKILL.md is the canonical router
  anthropic-data-plugin/         # Anthropic data plugin (vendored, trimmed for DataBook)
    UPSTREAM.md
    LICENSE
    CONNECTORS.md
    skills/                      # explore-data, create-viz, data-visualization, analyze, …
  anthropic-dataviz/             # form-first digest only (no duplicated create-viz copies)
    METHOD.md
    UPSTREAM.md
```

### 11.2 Anthropic data plugin (`references/anthropic-data-plugin/`)

Vendored copy of the [`data/`](https://github.com/anthropics/knowledge-work-plugins/tree/main/data) plugin from [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (Apache-2.0), trimmed for DataBook:

- **Shipped** under `skills/`: profiling, explore, validate, stats, SQL, `create-viz`, `data-visualization`, optional `analyze`.  
- **Omitted** (not in this tree): upstream `build-dashboard`, `data-context-extractor` — they conflict with the DataBook row model / pipeline.  
- Single copies of `create-viz` and `data-visualization` live here (not also under `anthropic-dataviz/`), so `CONNECTORS.md` relative links resolve.

**Role:** profiling, exploration, SQL/stats/validation habits, and chart-type tables. Used when the skill routes the agent there — not as a blanket read at session start. `analyze` is optional for Q&A-shaped asks, not required for book emission.

### 11.3 Anthropic data viz (`references/anthropic-dataviz/`)

- **`METHOD.md`** — form-first, color-last procedure digest (DataBook-authored summary).  
- Chart-type / publication skills: open the **plugin** paths `skills/create-viz/` and `skills/data-visualization/` (do not duplicate them here).

**Role:** decide *what* to chart and *how* to encode it **during chart selection / encoding**, then map onto the stock RechartsSpec. Runtime still renders via the stock renderer; these files guide decisions.

### 11.4 Router (canonical copy is `SKILL.md`)

Keep the live routing table in **`SKILL.md`** only; this section states the intended shape:

| Pipeline step | Open |
|---------------|------|
| Profiling / exploring unfamiliar sources | `references/anthropic-data-plugin/skills/explore-data/` (optional related: validate / stats / SQL skills) |
| Broader data Q&A (optional) | `references/anthropic-data-plugin/skills/analyze/` |
| Validation / statistical checks | `references/anthropic-data-plugin/skills/validate-data/`, `statistical-analysis/`, etc. |
| Choosing chart form / encodings | `references/anthropic-dataviz/METHOD.md`, then plugin `create-viz/` + `data-visualization/` |
| Building the book shell / rows | DataBook rules in `SKILL.md` + this spec — not Anthropic dashboard builders |

Do **not** instruct the agent to “read all of `references/` before starting.” Do **not** treat Anthropic dashboard builders as a replacement for the DataBook row model.

### 11.5 Maintenance

When bumping vendored content, update each folder’s `UPSTREAM.md` and note intentional diffs. Keep `SKILL.md` router paths in sync with folder names.

---

## 12. External references

- Cursor canvas constraint: import only from `cursor/canvas`; no npm/Recharts in canvases.  
- Recharts: [recharts.org](https://recharts.org/) (locked charting library; DataBook stock renderer — see §4.1).  
- react-markdown: [github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown).  
- Geist design system (typography/spacing tokens + Tabs): [vercel.com/geist](https://vercel.com/geist) / Tabs docs (e.g. [geist/tabs](https://vercel.com/geist/tabs)).  
- Anthropic knowledge-work-plugins `data/`: [github.com/anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (vendored under `references/anthropic-data-plugin/`).
