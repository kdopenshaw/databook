# DataBook — Product & Implementation Spec

Status: draft for implementers  
Audience: engineers building the scaffold, data layer, and AI skill  
Related research context: Cursor canvases cannot host Recharts (sandbox = `cursor/canvas` only); this tool is a **standalone React app** (or app embedded in a host), not a Cursor canvas artifact.

**Bundled references:** The DataBook skill’s own markdown **routes** the agent to `references/` at specific pipeline steps (not ambient background). See §11.

---

## 1. Overview

### 1.1 What it is

A **DataBook** is a fixed-shape React application that presents one experiment’s analysis as **tabbed markdown** with **chart components** referenced by name (one or more side by side), plus a **sidebar** for page groups when the book grows large. An **AI skill** (agent skill / prompt pack) drives creation:

1. **Init** the scaffold automatically (built into skill invocation — see §7.5).
2. **Profile** unknown data (from a repo path, uploaded files, or a user description of sources).
3. **Write** a durable understanding of the data and the experiment (schema notes, grain, caveats, intended questions).
4. **Transform / aggregate** as needed for analysis.
5. **Persist** those transforms and a **single canonical JSON** of normalized rows.
6. **Write** chart components (`meta` + React) and **tab markdown** under `src/book/` that references them.

The skill is **experiment-agnostic**: it does not hard-code domain workflows (finance, growth, labs). The same pipeline works for any tabular experiment the user points at.

### 1.2 Design goals

| Goal | Meaning |
|------|---------|
| Correct by construction | Charts declare *queries* against sitting data; they do not own private CSV forks that drift. |
| One scaffold | Every book is the same React app shell; only content (tabs, markdown, which Recharts pieces are used) changes. |
| Narrative + viz | Tab markdown explains aggregations and decisions; ` ```chart ` fences show one or more charts. |
| Flexible composition | Agents interleave GFM with chart fences; multiple names in one fence sit side by side. |
| Sectioned navigation | **Tabs** (Geist) are the primary section nav. Optional **pages** group tabs; the sidebar lists pages only (never a 1:1 duplicate of tabs). |
| Minimal UI | Quiet dark-first chrome on **Geist** typography/spacing tokens + CSS variables + root class toggle; consistent across all books. |
| Skill-first authoring | Humans rarely hand-edit chart wiring; invoking the skill runs init and owns profiling → emission. |

### 1.3 Non-goals (v1)

- Cross-chart brushing, linked highlighting, or global filter bars that rewrite other charts.
- Arbitrary notebook code cells executed in the browser.
- Hosting charts inside Cursor `.canvas.tsx` (incompatible with Recharts / npm).
- Replacing Plotly Studio / Hex for warehouse BI; this is a **repo-local / skill-emitted DataBook**.
- Nested rows, free-form grids, or drag-and-drop layout editors (in-place **(+)** markdown insert between rows is in scope).
- Cursor canvas as the chart host (use the Vite book). Agents author chart components under `src/charts/`.
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
   Write chart components (src/charts/*.tsx with meta) + tab markdown
        │
        ▼
   Emit / update book files
        │  ├── src/data/canonical.json
        │  ├── src/data/understanding.md
        │  ├── src/book/book.yaml + src/book/NN-*.md
        │  └── src/components/… (fixed shell: sidebar, tabs, rows)
        ▼
   User opens DataBook (sidebar + Geist tabs + markdown/charts; dark via .dark on root)
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

### 2.2 Chart slices as `meta.query` on each chart file

Each chart file under `src/charts/<Name>.tsx` exports `meta: ChartMeta` with `title` / optional `subtitle` / `notes` and the **query object**. The default export is the React view. The chart **id is the component name**. Tab markdown only references names (no duplicated query/title in the book files).

**Do not** use a separate recipe / query catalog file (no `queries.json`, no external query id indirection). **Do not** add a catalog of built-in or config-driven chart types.

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
2. Resolves `meta` for each chart name in a ` ```chart ` fence.
3. Runs `meta.query` against those rows and passes `{ data }` into the chart component.

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
    book/                   # book.yaml + NN-*.md tabs (GFM + chart fences)
    data/                   # canonical.json, understanding.md, transforms/
    charts/                 # agent-authored <Name>.tsx (meta + default export)
```

Emitted books in other projects get `src/` (and whatever the scaffold needs to run) **without** a generated README. Document how to use DataBook in **this** repo’s root README only (§10).

---

## 3. Document model

### 3.1 Tabbed markdown + chart fences

The DataBook is a **document of tabbed sections**. Each tab is one markdown file under `src/book/`:

- Filename prefix (`01-`, `02-`, …) sets tab order  
- Front matter holds `id`, `label`, optional `page`  
- Body is normal GFM (react-markdown) plus fenced ` ```chart ` blocks  
- Two or more chart names in one fence render **side by side** (optional flex weight per line: `MonthlyRevenue 1.4`)  
- Book-level metadata lives in **`src/book/book.yaml`** (`title`, `description`, `conventions`, optional `pages`, `defaultTabId`)  
- **Sidebar** lists pages when `pages` are defined; tabs remain primary section nav  
- No free-form floating canvas layout in v1; no `rows.json`, no row `order` / `createdBy` / separate chart block ids  

To show the same chart twice, reference the name twice. For a variant, write a new component (may import shared pieces).

### 3.2 Content units (parsed from markdown)

| Unit | Role |
|------|------|
| Markdown | Full-width narrative: framing, aggregations, caveats, findings. Do **not** title blocks “Analyst ask/take/note” unless the human asks. |
| Chart fence | One or more component names → flex row of chart slots. |

### 3.3 Book / tab / chart schema

Prefer `src/data/types.ts` as the live contract.

```ts
type ChartMeta = {
  title: string;
  subtitle?: string;
  notes?: string;
  query: ChartQuery;
  allowEmpty?: boolean;
};

type ChartRef = { name: string; flex?: number };

type ContentBlock =
  | { type: 'markdown'; id: string; body: string }   // id is synthetic (not on disk)
  | { type: 'charts'; id: string; charts: ChartRef[] };

type TabSection = {
  id: string;
  label: string;
  order: number;          // from NN- filename prefix
  page?: string;
  sourceFile: string;     // e.g. 01-overview.md
  blocks: ContentBlock[];
};

type BookDocument = {
  title: string;
  tabs: TabSection[];
  defaultTabId?: string;
  pages?: BookPage[];
  conventions?: BookConventions;
  // … experimentId, description, generatedAt
};
```

Each `src/charts/<Name>.tsx` exports `meta` and a default component. The chart id **is** `Name`.

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

Humans may insert markdown in the running book via the scaffold **(+)** control. In dev, inserts write straight into the active tab’s `.md` file through a Vite endpoint — **the file on disk is the only source of truth**. There is no localStorage overlay / `mergeUserRows` / `createdBy` layer.

### 3.6 Renderer

Scaffold shell:

1. **`BookTabs`** — primary section nav (sticky strip, arrow-key roving tabindex, `?tab=` via `pushState`).  
2. **`Sidebar`** — only when `pages[]` is set; lists pages (not a duplicate of tabs). Hidden on narrow viewports.  
3. **`RowRenderer`** — maps the active tab’s parsed `blocks` → React nodes, with a quiet **(+)** insert gap before/between/after blocks:
   - `markdown` → `MarkdownRow` via **react-markdown**  
   - `charts` → `ComponentRow` → flex of `ChartSlot`s → each loads `meta`, runs `meta.query`, renders the component  

Empty query results show an inline empty note on that slot.

On narrow viewports, `ComponentRow` wraps/stacks; the page sidebar is hidden and a sticky horizontal page switcher appears when `pages` exist; sticky tabs remain section nav — responsive behavior is scaffold-owned. Chart headers share a min-height so sibling plot baselines stay aligned.

---

## 4. Chart layer

### 4.1 Charts = agent React components

**Default path:** agents add files under `src/charts/<Name>.tsx` (`export const meta` + default export) and put `Name` in a ` ```chart ` fence in a tab `.md`. The slot runs `meta.query` against `canonical.json` and passes `{ data }` into that component.

- Use **Recharts** inside those files (dependency already in the scaffold), or plain SVG/HTML if simpler.  
- Theme helpers: `ResponsiveFrame`, `chartColors()` from `src/components/charts/ResponsiveFrame.tsx`.  
- Registry: `src/charts/registry.ts` eagerly loads `src/charts/*.tsx`.

There is **no** JSON chart-type catalog — only React components.

### 4.2 Queries still shape data

`runQuery` validates filter/bin/aggregate shapes against the canonical schema (e.g. `groupBy`/`bin` require aggregates). That is data honesty, not a chart-type menu.

### 4.3 Interactivity (minimal, unchanged)

Hover tooltips and theme-aware colors are up to the chart component. Cross-chart brushing / global filters remain out of scope for v1.

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
- Skill emits `tabs[]` with `id` / `label` / `rows`; optional `pages[]` for Sidebar grouping. **`npm run ok`** checks artifacts + nonempty query smoke — not a chart-type catalog.  
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
      # ResponsiveFrame + chartColors helpers; agent charts live in src/charts/
  book/
    book.yaml                  # title, conventions, pages, …
    01-overview.md             # front matter + GFM + ```chart fences
  charts/
    MonthlyRevenue.tsx         # meta + default export
  data/
    canonical.json             # normalized rows (one file)
    understanding.md
    loadCanonical.ts
    runQuery.ts
```

Dependencies include at least: `react`, `recharts`, `react-markdown`, `yaml`. Geist typography is **vendored** (`public/fonts/*.woff2`); Tabs are the scaffold `BookTabs` primitive (do not add the `geist` npm package — it peers Next unused).

### 6.2 Standard components (required)

| Component | Responsibility |
|-----------|----------------|
| `ThemeToggle` | Dark default, light via root class + CSS variables; no theme-provider library |
| `PageLayout` | Header (title, toggle), **sidebar**, main column with tabs + content |
| `Sidebar` | **Fixed** nav among page groups; not generated per book |
| `BookTabs` | **Fixed** wrapper around **Geist Tabs**; every book includes it |
| `RowRenderer` | Dispatch parsed markdown / chart blocks (inside active tab) |
| `MarkdownRow` | **react-markdown**, full width |
| `ComponentRow` | Flex layout for one or more chart refs |
| `ChartSlot` | Title/subtitle/notes from `meta` + run `meta.query` + render component |
| Chart helpers | Presentational wrappers only — not a closed catalog |

### 6.3 What the skill may change per book

- `src/book/book.yaml` and `src/book/NN-*.md`  
- `src/charts/*.tsx` (`meta` + component)  
- `src/data/canonical.json` and `src/data/understanding.md`  
- **Not** a fork of `PageLayout` / `Sidebar` / `BookTabs` / token architecture  

### 6.4 Emission modes and init sample

1. **Init (automatic on skill invoke)** — see §7.5: copy scaffold → write sample book under `src/book/` + charts.  
2. **Greenfield analysis**: after init, replace sample data/charts/tabs with profiled experiment content.  
3. **Update**: re-run transforms and rewrite `canonical.json` / tab markdown / chart `meta`; leave scaffold components untouched unless scaffold version bumps.  
4. **Legacy**: `scripts/rows-to-markdown.mjs` converts an old `rows.json` book into `src/book/`.

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
7. Write chart components under `src/charts/` with `meta`, reference them from `src/book/*.md`.  
8. Decide **tabs/sections** and narrative vs chart fences.  
9. **Query** objects live on each chart’s `meta`.  
10. Markdown findings (no default “Analyst ask/take” framing).  
11. Replace the init sample; `npm run ok` + `npm run snap -- --all`.

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
- Prefer `src/charts/*.tsx` over inventing a second chart DSL.  
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
6. **Chart component ergonomics** — How much boilerplate agents need in `src/charts/*.tsx`; whether a tiny helper kit beyond `ResponsiveFrame` is worth it.

---

## 9. Acceptance criteria (implementer checklist)

- [ ] Fixed scaffold boots with dark default via CSS variables + root class toggle (no theme-provider library).  
- [ ] **Geist Tabs** (`BookTabs`) and **Sidebar** mount on every book (including single-tab init).  
- [ ] Tabs group rows into sections (primary nav); optional pages drive Sidebar (no 1:1 tab duplicate).  
- [ ] Geist provides typography/spacing tokens + Tabs; page shell, sidebar, row container, markdown block, chart slot are custom on those tokens.  
- [ ] `src/book/*.md` renders GFM + ` ```chart ` fences inside the active tab.  
- [ ] Running book offers a quiet **(+)** between blocks; inserts write the tab `.md` via Vite (disk only).  
- [ ] Skill markdown is findings prose — no default “Analyst ask/take” framing.  
- [ ] A chart fence can hold multiple names side by side; `npm run ok` gates parse/resolve/query/unused.  
- [ ] Chart `meta.query` owns the slice; no separate queries/recipe file; no config-driven chart catalog.  
- [ ] Canonical data is **one JSON file** of normalized rows; queries shape data at read time.  
- [ ] Skill invoke runs **databook init** automatically.  
- [ ] Init into another project does **not** create a book-local README.  
- [ ] DataBook product repo has a **root README**.  
- [ ] `SKILL.md` routes agents to Anthropic references at the correct pipeline steps (not ambient dump).  
- [ ] Charts are `src/charts/*.tsx` with `meta`; `npm run snap` captures PNGs.  
- [ ] Nested layout standard: `src/components`, `src/book`, `src/charts`, `src/data`, `references`, top-level `SKILL.md`.  
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
  README.md
  anthropic-data-plugin/     # trimmed: explore, validate, stats, SQL, analyze
```

### 11.2 Plugin role

Profiling / validation / SQL habits when routed. Charts are **not** produced by plugin viz skills — agents write `src/charts/*.tsx`.

### 11.3 Router

Canonical router is **`SKILL.md`**. Do not dump all of `references/` at start.

### 11.4 Maintenance

Update `UPSTREAM.md` when bumping the vendor pin; note intentional omissions.

---

## 12. External references

- Recharts (used inside agent chart components): [recharts.org](https://recharts.org/)  
- react-markdown: [github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown)  
- Anthropic knowledge-work-plugins `data/`: [github.com/anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (trimmed under `references/anthropic-data-plugin/`)
