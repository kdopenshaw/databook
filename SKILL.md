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

```json
{
  "id": "exponential-curve",
  "title": "Exponential curve",
  "component": "ExponentialCurve",
  "query": {
    "orderBy": [{ "column": "x", "direction": "asc" }]
  }
}
```

## Invoke

Copy scaffold into the **target** (never write experiment data into the skill install; never `npm install` there).

| No book yet | Init sample, then replace with real data/charts |
| Book exists | Extend: read understanding → edit transforms/charts/rows → `mergeUserRows` → `npm run ok` |

Init copies: `src/`, `public/`, `scripts/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.ok.config.ts`, `.gitignore`. No README in foreign targets.

The copied book is the **init sample**: one Overview tab (tabs + sidebar still mount), a **hello world** markdown row, and an **exponential curve** (`ExponentialCurve`) over tiny synthetic points in `canonical.json`. Set `index.html` `<title>` from `BookDocument.title`. Then replace sample data/charts with the experiment.

## Data

Runtime still loads one `canonical.json`. That file is **not** what you author for a real experiment.

| Size | What to commit |
| Tiny (init, fixtures, a handful of points) | `canonical.json` in git, compact JSON |
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
