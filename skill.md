---
name: databook
description: >
  Create or refresh a DataBook chart book: init scaffold automatically, profile
  experiment data, write one canonical JSON of normalized rows, and emit
  row-based markdown + Recharts charts with inlined query objects.
---

# DataBook skill

## On invoke

1. **Run databook init automatically** (no separate user command).
   - Ensure nested layout: `src/components/`, `src/data/`.
   - If no book yet: write the **minimal sample** — one markdown row (“hello world”) and one component row with an **exponential curve** over tiny synthetic `canonical.json`.
   - **Do not** generate a README inside the target book when initializing into another project.
2. Continue with the user’s request (replace sample with real analysis as needed).

## Pipeline

1. Profile sources → write `src/data/understanding.md`.
2. Transform → write **`src/data/canonical.json`** (normalized rows, one file).
3. Choose **tabs/sections**, row types (`markdown` | `component`), and Recharts compositions.
4. Emit **`src/data/rows.json`** (`BookDocument`: tabs → rows) with **self-describing chart blocks** (query objects **inlined** — no `queries.json` / recipe file).
5. Sanity-check: queries return rows; multi-chart rows have a clear comparison purpose; tab/sidebar labels stay scannable for large books.

Follow `chart-book-spec.md` for schemas and invariants.

## Reference router (not ambient)

Open bundled references **only at the step that needs them**:

| When | Read |
|------|------|
| Profiling / exploring data | `references/anthropic-data-plugin/skills/explore-data/` and related plugin skills (`validate-data`, `statistical-analysis`, `sql-queries`, …) as needed |
| Choosing chart form / encodings | `references/anthropic-dataviz/METHOD.md`, then `create-viz/` / `data-visualization/` |
| Layout / rows / scaffold rules | This file + `chart-book-spec.md` — **not** Anthropic dashboard skills as a second layout system |

Do **not** dump all of `references/` into context at start.

## Locked choices (reminders)

- Chart library: **Recharts** (full API; no closed starter catalog).
- Markdown: **react-markdown**.
- Chrome: **Geist** Tabs + typography/spacing tokens; custom **Sidebar**, page shell, row/markdown/chart primitives on those tokens.
- Theme: CSS variables + **root class toggle** (no theme-provider library).
- Queries: **inlined** on each chart block.
- Canonical data: **one JSON file** of normalized rows; queries shape at read time.
