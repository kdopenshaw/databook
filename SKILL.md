---
name: databook
description: >
  Create or refresh a DataBook: init the Vite book shell, profile data into one
  canonical JSON, write React chart components under src/charts/, wire them in rows.json.
---

# DataBook

**`src/data/types.ts` is the live contract.**

## Model

1. Fixed book shell (tabs, markdown, chart slots) — don’t fork chrome.
2. One runtime table `src/data/canonical.json` (+ `understanding.md`).
3. Charts = `src/charts/<Name>.tsx` default export receiving `{ data }` from an inlined `query`.

Use Recharts by default for DataBook visualizations. Use an alternative only when Recharts cannot produce the required visualization and the alternative is clearly better suited to the task.

```json
{
  "id": "speed-by-type",
  "title": "Average base Speed by primary type",
  "component": "SpeedByType",
  "query": {
    "groupBy": ["type"],
    "aggregate": [{ "fn": "mean", "column": "speed", "as": "mean_speed" }],
    "orderBy": [{ "column": "mean_speed", "direction": "desc" }]
  }
}
```

## Invoke

Copy scaffold into the **target** (never write experiment data into the skill install; never `npm install` there).

| No book yet | Init sample, then replace with your data/charts |
| Book exists | Extend: read understanding → edit transforms/charts/rows → `mergeUserRows` → `npm run ok` |

Init copies: `src/`, `public/`, `scripts/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.ok.config.ts`, `.nvmrc`, `.gitignore`. No README in foreign targets.

The scaffold includes a compact Pokémon dataset with Markdown, a comparison
chart, a binned distribution, and a grouped Speed chart. Replace the sample content and
update the title and description in `index.html`.

## Data

Runtime still loads one `canonical.json`. That file is **not** what you author for a real experiment.

| Size | What to commit |
| Small (e.g., the compact Pokémon sample or fixtures) | `canonical.json` in git, compact JSON |
| Real extract | Short **transform** under `src/data/transforms/` that emits `canonical.json`. Commit the transform + `understanding.md` + schema notes. Do **not** paste thousands of pretty-printed objects. |
| Built table ≳ 100KB or a few thousand rows | Gitignore `canonical.json` **in the target book**. Rebuild before `npm run dev` / `ok`. Clone without the transform output should fail honestly, not ship an 800KB dump. |

Do not write per-chart extracts — the inlined `query` slices at read time. Do not pretty-print fact tables (`JSON.stringify(data, null, 2)` on thousands of rows). Agents write the transform (or a tiny table), not a warehouse dump.

## Loop

Profile → transform or tiny table → `understanding.md` → write `src/charts/*.tsx` + markdown → update `rows.json` → `npm run ok` / `print-block -- <id>`.

Open `references/anthropic-data-plugin/skills/explore-data/` (and validate/stats/SQL) only when needed. Don’t dump `references/`.

## Document bits

- Rows: `markdown` | `component` (flex of chart blocks) | `prompt` (dev Codex viz job).
- Chart block: `title`, `component`, `query`, optional `ref` / `subtitle` / `notes` / `flex`.
- Query: `filter` / `groupBy` / `bin` / `aggregate` / `orderBy` / `limit` / `sample`. Helpers: `share`, `count_if`, `sum_if`, `mean_if`, `ratio`.
- Preserve `createdBy: "user"` via `mergeUserRows`.
