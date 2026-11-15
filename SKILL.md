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

## On invoke (always)

1. **Run databook init automatically** — there is no separate user-facing init command.
   - Ensure nested layout: `src/components/`, `src/data/`, plus the fixed Vite React shell at the book root when scaffolding a new book.
   - If no book yet: write the **minimal sample**
     - one tab **Overview**
     - one markdown row body **hello world**
     - one component row with a single **exponential curve** chart
     - tiny synthetic points in `src/data/canonical.json`
   - Mount **Sidebar + BookTabs** even for that single-tab sample.
   - **Do not** generate a README inside the target book when initializing into another project.
2. Continue with the user’s request (replace the sample with real analysis as needed).

## Pipeline

| Step | Action | Artifacts |
|------|--------|-----------|
| 1 | **Init** (automatic) | scaffold + trivial sample |
| 2 | **Profile** sources | → route to Anthropic data plugin (below) → `src/data/understanding.md` |
| 3 | **Transform** | `src/data/canonical.json` — **one** JSON file of normalized rows |
| 4 | **Choose charts** | → route to Anthropic dataviz (below); pick Recharts compositions freely |
| 5 | **Emit document** | `src/data/rows.json` (`BookDocument`: tabs → rows); each chart block has **inlined** `query` + `recharts` + `encoding` |
| 6 | **Sanity-check** | queries return rows; multi-chart rows have a clear comparison purpose; tab/sidebar labels stay scannable |

**Do not** create `queries.json`, `blocks.json`, or a closed `ChartCatalog` of bar/line/…. Queries live on each chart block.

## Reference router (not ambient)

Open bundled references **only at the step that needs them**. Do **not** dump all of `references/` into context at start.

| When | Read |
|------|------|
| Profiling / exploring unfamiliar sources | `references/anthropic-data-plugin/skills/explore-data/` and related plugin skills (`validate-data`, `statistical-analysis`, `sql-queries`, `analyze`, …) as needed |
| Validation / statistical checks | `references/anthropic-data-plugin/skills/validate-data/`, `statistical-analysis/`, etc. |
| Choosing chart form / encodings | `references/anthropic-dataviz/METHOD.md`, then `create-viz/` / `data-visualization/` |
| Layout / rows / scaffold rules | This file + `chart-book-spec.md` — **not** Anthropic dashboard skills as a second layout system |

## Document model (reminders)

- **Tabs** group rows into sections; every book mounts Geist-styled `BookTabs` + custom `Sidebar` (synced jump-nav).
- Row types: `markdown` (react-markdown, full width) | `component` (flex of one or more self-describing chart blocks).
- Chart blocks: `title`, `recharts` (flexible composition), `encoding`, **`query` inlined**.
- Canonical data: one JSON file; `runQuery` shapes slices at read time (`filter` / `groupBy` / `aggregate` / `orderBy` / `limit` / `sample`).

## Locked choices

- Charts: **Recharts** only (full API; no closed starter catalog).
- Markdown: **react-markdown**.
- Typography: **`geist`** font package. Tabs: Geist-styled primitive in scaffold (`BookTabs`) — public npm `geist` is fonts only.
- Theme: CSS variables + class `dark` on `<html>` via `ThemeToggle` + `localStorage`. **No** ThemeProvider library/context package.
- Product docs live in this repo’s root `README.md` only.
