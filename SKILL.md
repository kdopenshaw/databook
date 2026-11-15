---
name: databook
description: >
  Create or refresh a DataBook chart book: init scaffold automatically, profile
  experiment data, write one canonical JSON of normalized rows, and emit
  row-based markdown + Recharts charts with inlined query objects.
---

# DataBook skill

This file is the **product entrypoint**. Invoking the skill *is* running DataBook.
Follow `chart-book-spec.md` for schemas, invariants, and acceptance criteria.
**`src/data/types.ts` is the live contract** when the prose spec disagrees.

## On invoke (always)

**Target** = the user’s open workspace (where the chart book belongs).  
**Skill package** = this install (`SKILL.md`, `chart-book-spec.md`, `references/`, scaffold) — treat as a **read-only template**. **Copy** scaffold files into the target; **never** write experiment data, `canonical.json`, `rows.json`, or analysis into the skill install folder (`~/.cursor/skills/databook`, `.cursor/skills/databook`, or the product clone used only as the template). **Never `npm install` inside the skill install** (symlinks would pollute the product clone).

### New book vs extend existing

| Situation | Path |
|-----------|------|
| No `src/data/rows.json` / no Vite book shell in target | **Init** (below) → full pipeline |
| Book already exists (`understanding.md`, `canonical.json`, `rows.json`, often a generator under `src/data/transforms/`) | **Extend existing book** (skip init) |

### Extend existing book (cold / any-model pickup)

Do **not** re-init. Orient in this order, then change:

1. Read `src/data/understanding.md` (grain, population filters, caveats).
2. Read book-level `conventions` in `rows.json` (`BookDocument.conventions`) and any conventions block atop the row generator.
3. Find the generator (`src/data/transforms/build_rows.py` or equivalent) — prefer editing it over hand-editing `rows.json`.
4. Read / run existing tests (`npm test`, including chart lint + book conventions).
5. Route to `validate-data` / `create-viz` **before** committing chart changes (honesty, not only first-chart choice).
6. Apply the change → regenerate `rows.json` via `mergeUserRows` semantics (preserve `createdBy: "user"`) → `npm test` → **`npm run lint:charts`** → visual check (`npm run check` / screenshot recipe in `scripts/check-book.mjs`).

House rules that must not live only in a private `AGENT_NOTES.md`:

- **Bar charts:** value axis includes 0 (omit `yDomain` or set `yDomain[0] <= 0`). Truncated bars fail lint.
- **Line charts:** if `yDomain` starts above 0, subtitle or notes must say `axis starts at …`.
- **Small multiples / sibling panels** in one component row that share measures: **shared explicit `yDomain`** (and `xDomain` when numeric).
- **Don’t chart a non-result** (e.g. a flat band presented as a “trend”). Prefer a table or prose.
- Keep generators + tests + `understanding.md` in the **target repo** (never `/tmp` only).
- Multi-chart rows: 2–3 charts typical; use `ref` on Summary tabs instead of copying queries.

### Init (automatic when no book yet)

1. Copy the scaffold listed in `scaffold-files.txt` (or: `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`) into the **target**.
2. Write the **minimal sample** into the target: one tab **Overview**, markdown **hello world**, one exponential curve chart, tiny `canonical.json`.
3. Set `index.html` `<title>` from `BookDocument.title` when replacing the sample.
4. Mount **BookTabs** (primary nav). Sidebar appears only when `pages` are defined.
5. **Do not** generate a README inside the target book when initializing into another project.
6. Continue with the user’s request — all writes stay in the **target**.

## Pipeline

| Step | Action | Artifacts |
|------|--------|-----------|
| 1 | **Init** (automatic if needed) | scaffold + trivial sample |
| 2 | **Profile** sources | → Anthropic data plugin → `src/data/understanding.md` |
| 3 | **Transform** | `src/data/canonical.json` — **one** JSON file of normalized rows |
| 4 | **Choose charts** | → Anthropic dataviz; pick Recharts compositions from **stock RechartsSpec** |
| 5 | **Emit document** | `src/data/rows.json` (`BookDocument`); inlined `query` + `recharts` + `encoding`; set `conventions` |
| 6 | **Sanity-check** | queries return rows; **`npm run lint:charts`** (zero-baseline bars, shared sibling scales, known marks); multi-chart rows have a clear comparison purpose; tab labels scannable; visual check |

**Do not** create `queries.json`, `blocks.json`, or a closed `ChartCatalog` of bar/line/…. Queries live on each chart block.

## Reference router (not ambient)

Open bundled references **only at the step that needs them**. Do **not** dump all of `references/` into context at start.

| When | Read |
|------|------|
| Profiling / exploring unfamiliar sources | `references/anthropic-data-plugin/skills/explore-data/` and related (`validate-data`, `statistical-analysis`, `sql-queries`, `analyze`, …) |
| Validation / statistical checks **and pre-commit honesty** | `references/anthropic-data-plugin/skills/validate-data/`, `statistical-analysis/`, plus dataviz zero-baseline / scale guidance |
| Choosing chart form / encodings | `references/anthropic-dataviz/METHOD.md`, then `create-viz/` / `data-visualization/` |
| Layout / rows / scaffold rules | This file + `chart-book-spec.md` + `src/data/types.ts` |

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

**Do not fork the scaffold renderer** for these — emit the fields above. Unknown marks fail `lint:charts`.

### Multi-chart rows & pages

- **Component rows** hold 1–N chart blocks (small multiples). Prefer shared domains; default flex wrap.
- **`ref: "<chartId>"`** on a block reuses another chart (Summary tab) — do not copy queries.
- **`pages`** (optional): Sidebar lists pages; tabs show only the active page’s `tabIds`. Without pages, **tabs only** (no duplicate sidebar).

### User rows

- `createdBy: "user"` marks analyst edits. Generators must call `mergeUserRows(previous, next)` (see `src/data/mergeUserRows.ts`) so regeneration does not wipe them.
- Fractional `order` (e.g. `1.5`) is valid for slotting between skill rows.
- User markdown renders with an “Analyst note” callout in the scaffold.

## Document model (reminders)

- **Tabs** group rows; **pages** (optional) group tabs.
- Row types: `markdown` | `component`.
- Chart blocks: `title`, `recharts`, `encoding`, **`query` inlined** — or `ref` to another block.
- Canonical data: one JSON file; `runQuery` shapes slices (`filter` / `groupBy` / `bin` / `aggregate` / `orderBy` / `limit` / `sample`). Single-bin histograms fill empty bins by default.

## Locked choices

- Charts: **Recharts** only (stock renderer fields above).
- Markdown: **react-markdown** + GFM.
- Typography: **`geist`** font package. Tabs: Geist-styled `BookTabs`.
- Theme: CSS variables + class `dark` on `<html>` via `ThemeToggle` + `localStorage`. Charts remount on theme change.
- Product docs live in this repo’s root `README.md` only.
