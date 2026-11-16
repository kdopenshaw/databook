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
2. One `src/data/canonical.json` (+ `understanding.md`).
3. Charts = `src/charts/<Name>.tsx` default export receiving `{ data }` from an inlined `query`.

```json
{
  "id": "rev-trend",
  "title": "Monthly revenue",
  "component": "MonthlyRevenue",
  "query": {
    "groupBy": ["month"],
    "aggregate": [{ "fn": "sum", "column": "amount", "as": "revenue" }],
    "orderBy": [{ "column": "month", "direction": "asc" }]
  }
}
```

## Invoke

Copy scaffold into the **target** (never write experiment data into the skill install; never `npm install` there).

| No book yet | Init sample, then replace with real data/charts |
| Book exists | Extend: read understanding → edit transforms/charts/rows → `mergeUserRows` → `npm run ok` |

Init copies: `src/`, `public/`, `scripts/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.ok.config.ts`, `.gitignore`. No README in foreign targets.

## Loop

Profile → `canonical.json` + `understanding.md` → write `src/charts/*.tsx` + markdown → update `rows.json` → `npm run ok` / `print-block -- <id>`.

Open `references/anthropic-data-plugin/skills/explore-data/` (and validate/stats/SQL) only when needed. Don’t dump `references/`.

## Document bits

- Rows: `markdown` | `component` (flex of chart blocks).
- Chart block: `title`, `component`, `query`, optional `ref` / `subtitle` / `notes` / `flex`.
- Query: `filter` / `groupBy` / `bin` / `aggregate` / `orderBy` / `limit` / `sample`. Helpers: `share`, `count_if`, `sum_if`, `mean_if`, `ratio`.
- Preserve `createdBy: "user"` via `mergeUserRows`.
