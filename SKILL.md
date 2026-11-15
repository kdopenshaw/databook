---
name: databook
description: >
  Create or refresh a DataBook: init scaffold automatically, profile
  experiment data, write one canonical JSON of normalized rows, and emit
  row-based markdown + Recharts charts with inlined query objects.
---

# DataBook skill

This file is the **product entrypoint**. Invoking the skill *is* running DataBook.
Follow `databook-spec.md` for schemas, invariants, and acceptance criteria.
**`src/data/types.ts` is the live contract** when the prose spec disagrees.

## On invoke (always)

**Target** = the user’s open workspace (where the DataBook belongs).  
**Skill package** = this install (`SKILL.md`, `databook-spec.md`, `references/`, scaffold) — treat as a **read-only template**. **Copy** scaffold files into the target; **never** write experiment data, `canonical.json`, `rows.json`, or analysis into the skill install folder (`~/.cursor/skills/databook`, `.cursor/skills/databook`, or the product clone used only as the template). **Never `npm install` inside the skill install** (symlinks would pollute the product clone).

### New book vs extend existing

| Situation | Path |
|-----------|------|
| No `src/data/rows.json` / no Vite book shell in target | **Init** (below) → full pipeline |
| Book already exists (`understanding.md`, `canonical.json`, `rows.json`, often a generator under `src/data/transforms/`) | **Extend existing book** (skip init) |

### Extend existing book (cold / any-model pickup) — FAIL-CLOSED

Do **not** re-init. **Every** extend round (including R2/R3/cold) must complete this checklist **before** editing charts or committing `rows.json`. Skipping a step is a failed extend — do not ship charts.

| # | Mandatory gate | Done when |
|---|----------------|-----------|
| 1 | Read `src/data/understanding.md` | Grain, population filters, caveats recalled |
| 2 | Read `BookDocument.conventions` in `rows.json` (+ generator header) | Honesty rules in working memory |
| 3 | Find the generator (`src/data/transforms/…`) | Prefer editing it over hand-editing `rows.json` |
| 4 | Apply → `mergeUserRows` → **`npm run ok`** (blocking) | Artifacts + live `lintBook(rows, { table })` + nonempty query smoke green |
| 5 | Inspect query (when editing a chart) | **`npm run print-block -- <chartId>`** — same `runQuery` as the app; CSV/table on stdout (no browser) |
| 6 | Open **validate-data** / **create-viz** | **Only when choosing new chart forms / cuts** — not every regen |
| 7 | Visual | **Optional** on handoff or UI doubt: `npm run check:visual -- --url http://127.0.0.1:5173/` |

**Exploratory loop:** leave `npm run dev` running; after each edit run **`npm run ok`**. To inspect a chart’s query slice without the browser, run **`npm run print-block -- <chartId>`** (optional `--format table`, `--limit N`). Do **not** also run `lint:charts`, `check`, `extend-check`, `npm test`, or `check:visual` every round (`check`/`validate`/`extend-check` are aliases or subsets of `ok`).

House rules that must not live only in a private `AGENT_NOTES.md`:

- **Bar charts:** value axis includes 0 (omit `yDomain` or set `yDomain[0] <= 0`). Truncated bars fail lint.
- **Line charts:** if `yDomain` starts above 0, subtitle or notes must say `axis starts at …`.
- **Small multiples / sibling panels:** set the same **`scaleGroup`** (or identical measure `dataKey` aliases) and a **shared explicit `yDomain`** (and `xDomain` when numeric). Do not rename unrelated aggregates just to satisfy lint — use `scaleGroup`.
- **Don’t chart a non-result** (near-flat band as a “trend”). Lint rejects trend-claiming line/area charts with relative range &lt; 5% unless subtitle/notes acknowledge flatness.
- Keep generators + tests + `understanding.md` in the **target repo** (never `/tmp` only).
- Multi-chart rows: 2–3 charts typical; use `ref` on Summary tabs instead of copying queries.
- Prefer **`share` / `count_if` / `sum_if` / `mean_if`** over inventing pivot columns for rates and conditional totals.

### Init (automatic when no book yet)

1. Copy the scaffold listed in `scaffold-files.txt` (or: `src/`, `public/`, `scripts/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.ok.config.ts`, `.gitignore`) into the **target**. **`scripts/` is required** so `npm run ok` / `npm run print-block` work.
2. Write the **minimal sample** into the target: one tab **Overview**, markdown **hello world**, one exponential curve chart, tiny `canonical.json`, `understanding.md`, and `BookDocument.conventions`.
3. Set `index.html` `<title>` from `BookDocument.title` when replacing the sample.
4. Mount **BookTabs** (primary nav). Sidebar appears only when `pages` are defined (desktop); mobile shows a horizontal page switcher.
5. **Do not** generate a README inside the target book when initializing into another project.
6. Continue with the user’s request — all writes stay in the **target**.

## Pipeline

| Step | Action | Artifacts |
|------|--------|-----------|
| 1 | **Init** (automatic if needed) | scaffold + trivial sample **including `scripts/`** |
| 2 | **Profile** sources | → Anthropic data plugin → `src/data/understanding.md` |
| 3 | **Transform** | `src/data/canonical.json` — **one** JSON file of normalized rows |
| 4 | **Choose charts** | → Anthropic dataviz; pick Recharts compositions from **stock RechartsSpec** |
| 5 | **Emit document** | `src/data/rows.json` (`BookDocument`); inlined `query` + `recharts` + `encoding`; set `conventions` |
| 6 | **Sanity-check (blocking)** | **`npm run ok`** (artifacts + live honesty lint with canonical + query nonempty smoke). After chart/query edits, **`npm run print-block -- <chartId>`** to confirm the slice. Optional: `check:visual` on handoff. Multi-chart rows need a clear comparison purpose. |

**Do not** create `queries.json`, `blocks.json`, or a closed `ChartCatalog` of bar/line/…. Queries live on each chart block.

## Reference router (not ambient)

Open bundled references **only at the step that needs them**. Do **not** dump all of `references/` into context at start.

| When | Read |
|------|------|
| Profiling / exploring unfamiliar sources | `references/anthropic-data-plugin/skills/explore-data/` and related (`validate-data`, `statistical-analysis`, `sql-queries`, `analyze`, …) |
| Validation / statistical checks when cutting new analysis | `references/anthropic-data-plugin/skills/validate-data/`, `statistical-analysis/`, plus dataviz zero-baseline / scale guidance |
| Choosing chart form / encodings | `references/anthropic-dataviz/METHOD.md`, then `create-viz/` / `data-visualization/` |
| Layout / rows / scaffold rules | This file + `databook-spec.md` + `src/data/types.ts` |

## RechartsSpec (stock renderer)

Supported chart roots: `LineChart`, `BarChart`, `AreaChart`, `ScatterChart`.  
Supported series marks: `Line`, `Bar`, `Area`, `Scatter`.

Important optional fields (all in `src/data/types.ts`):

| Field | Use |
|-------|-----|
| `layout: "vertical"` | Horizontal bars (long category labels) |
| `stackId` on series | Stacked bars/areas |
| `xLabel` / `yLabel` | Axis titles |
| `yDomain` / `xDomain` / `xTicks` / `valueTicks` | Fixed scales (required for sibling small multiples) |
| `height`, `categoryWidth`, `barCategoryGap` | Sizing |
| `xType: "number"`, `xShift` | Aligned histograms / empty-bin gaps |
| `colorBy` | Scatter coloured by category levels |
| `tooltipKeys`, `decimals`, `valueFormat` | Tooltip polish |
| `colorIndex`, `strokeDasharray` | Stable palette slots / dashed lines |

**Do not fork the scaffold renderer** for these — emit the fields above. Unknown marks fail `npm run ok` / chart lint.

### Multi-chart rows, scaleGroup & pages

- **Component rows** hold 1–N chart blocks (small multiples). Prefer shared domains; default flex wrap.
- **`scaleGroup: "stats"`** (example) on sibling panels that share a measure family — lint enforces a shared `yDomain` without forcing identical `dataKey` names. Alias pattern: you may also emit the same aggregate `as` / `dataKey` across panels when it is truly the same measure.
- **`ref: "<chartId>"`** on a block reuses another chart (Summary tab) — do not copy queries.
- **`pages`** (optional): Sidebar lists pages on desktop; mobile shows a sticky page switcher. Tabs show only the active page’s `tabIds`. Without pages, **tabs only**.

### Query aggregates (rates & conditionals)

Prefer first-class helpers over pivot columns:

| `fn` | Use |
|------|-----|
| `share` | With `where`: matching rows / group size. With boolean `column`: truthy rate. |
| `count_if` | Count rows matching `where` |
| `sum_if` / `mean_if` | Sum/mean of `column` over rows matching `where` |
| `ratio` | Sum(numerator) / sum(denominator) |

### Markdown voice (default)

Write findings as normal prose and section headings that state the point (“HP rises with generation”, “Caveats”).

**Do not** invent meta framing blocks titled **“Analyst ask”**, **“Analyst take”**, **“Analyst takeaways”**, **“Analyst note”**, or similar role labels — unless the human explicitly asks for that framing. Prefer the finding itself, not a label about who is speaking.

### User rows (in-app inserts)

- Humans can insert markdown between rows via the scaffold **(+)** control. Those rows use `createdBy: "user"`.
- Generators must call `mergeUserRows(previous, next)` (see `src/data/mergeUserRows.ts`) so regeneration does not wipe user rows.
- Fractional `order` (e.g. `1.5`) is valid for slotting between skill rows.
- Do **not** emit `createdBy: "user"` rows from the skill unless mirroring an explicit human insert; skill-authored narrative stays `createdBy: "skill"`.

## Document model (reminders)

- **Tabs** group rows; **pages** (optional) group tabs.
- Row types: `markdown` | `component`.
- Chart blocks: `title`, `recharts`, `encoding`, **`query` inlined** — or `ref` to another block; optional `scaleGroup`.
- Canonical data: one JSON file; `runQuery` shapes slices (`filter` / `groupBy` / `bin` / `aggregate` / `orderBy` / `limit` / `sample`). Single-bin histograms fill empty bins by default.

## Locked choices

- Charts: **Recharts** only (stock renderer fields above).
- Markdown: **react-markdown** + GFM. In-app **(+)** inserts user markdown; skill output stays findings prose (no default “Analyst ask/take” sections).
- Typography: **vendored Geist fonts** in `public/fonts/` (no `geist` npm package). Tabs: Geist-styled `BookTabs`.
- Theme: CSS variables + class `dark` on `<html>` via `ThemeToggle` + `localStorage`. Charts remount on theme change.
- Product docs live in this repo’s root `README.md` only.
