---
name: databook
description: >
  Create or refresh a DataBook: init the Vite book shell, profile data into one
  canonical JSON, write React chart components under src/charts/, reference them
  from tab markdown under src/book/.
---

# DataBook

**`src/data/types.ts` is the live contract.**

## Model

1. Fixed book shell (tabs, markdown, chart slots) — don’t fork chrome.
2. One `src/data/canonical.json` (+ `understanding.md`).
3. Book narrative = `src/book/book.yaml` + one `NN-<id>.md` tab file (GFM + ` ```chart ` fences).
4. Charts = `src/charts/<Name>.tsx` with `export const meta` (title + `query`) and a default export receiving `{ data }`.

````md
```chart
MonthlyRevenue 1.4
RevenueByCafe
```
````

Two or more names in one fence render side by side (optional flex weight per line).

## Invoke

Copy scaffold into the **target** (never write experiment data into the skill install; never `npm install` there).

| No book yet | Init sample, then replace with real data/charts |
| Book exists | Extend: read understanding → edit charts + tab `.md` → `npm run ok` |

Init copies: `src/`, `public/`, `scripts/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.ok.config.ts`, `.gitignore`. No README in foreign targets.

## Loop

Profile → `canonical.json` + `understanding.md` → write `src/charts/*.tsx` with `meta` → reference names from `src/book/*.md` → `npm run ok` → `npm run snap -- --all`.

Inspect a query with `npm run print-block -- <ChartName>`.

Open `references/anthropic-data-plugin/skills/explore-data/` (and validate/stats/SQL) only when needed. Don’t dump `references/`.

## Document bits

- Tab order = numeric filename prefix; front matter holds `id` / `label` / optional `page`.
- Book meta (`title`, `description`, `conventions`, `pages`, `defaultTabId`) lives in `src/book/book.yaml`.
- Query: `filter` / `groupBy` / `bin` / `aggregate` / `orderBy` / `limit` / `sample`. Helpers: `share`, `count_if`, `sum_if`, `mean_if`, `ratio`.
- Narrative: do **not** invent “Analyst ask / take / takeaways” headings unless the human asks.
- In-browser **(+)** inserts markdown into the active tab’s `.md` file via the Vite dev API (disk is the only source of truth).
