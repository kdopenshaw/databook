---
name: databook
description: >
  Create or refresh a DataBook: init the Vite book shell, profile experiment
  data into one canonical JSON, write React chart components, and wire them
  into row-based markdown tabs.
---

# DataBook skill

Invoking this skill *is* running DataBook.  
**`src/data/types.ts` is the live contract** when docs disagree.

## Simple model

1. **Book shell** — fixed React app (tabs, markdown rows, chart slots). Don’t fork chrome.
2. **Data** — one `src/data/canonical.json` (+ `understanding.md`). Charts query it at read time.
3. **Charts** — agents add React components under `src/charts/<Name>.tsx` and reference them from `rows.json`.

```json
{
  "id": "chart-exp",
  "title": "Exponential curve",
  "component": "ExpCurve",
  "query": { "orderBy": [{ "column": "x", "direction": "asc" }] }
}
```

`component` → default export of `src/charts/ExpCurve.tsx`, called with `{ data }` (query result rows). Use Recharts (or plain SVG) however you like inside that file.

Legacy `recharts` JSON specs still render via the scaffold fallback; prefer new `src/charts/*.tsx` files.

## On invoke

**Target** = user’s workspace. **Skill package** = this install (read-only template). Copy scaffold into the target; never write experiment data into the skill install; never `npm install` inside the skill install.

| Situation | Path |
|-----------|------|
| No book yet | **Init** → then profile / replace sample |
| Book exists | **Extend** — don’t re-init |

### Init

Copy scaffold (`src/`, `public/`, `scripts/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.ok.config.ts`, `.gitignore`). Include `src/charts/`. Write the trivial sample (hello-world markdown + `ExpCurve` chart). Set `<title>` from the book title. No README in foreign targets.

### Extend

1. Read `understanding.md` and existing charts/conventions.
2. Prefer editing a generator under `src/data/transforms/` when one exists; call `mergeUserRows` so `createdBy: "user"` rows survive.
3. Add/change `src/charts/*.tsx` and wire blocks in `rows.json`.
4. **`npm run ok`** (artifacts + nonempty query smoke). Inspect with `npm run print-block -- <chartId>`.

## Pipeline

| Step | Action |
|------|--------|
| 1 | Init if needed |
| 2 | Profile sources → `understanding.md` (open `references/anthropic-data-plugin/skills/explore-data/` only if unfamiliar) |
| 3 | Write `canonical.json` |
| 4 | Write chart components + markdown; update `rows.json` |
| 5 | `npm run ok` |

Optional: `validate-data` / `statistical-analysis` when cutting new analysis; `analyze` for free-form Q&A. Do **not** dump all of `references/` up front. Do **not** use Anthropic dashboard builders — this app is the book.

## Document model

- Tabs → rows: `markdown` | `component` (flex of chart blocks).
- Chart block: `title`, `component` (or legacy `recharts`), inlined `query`, optional `ref` / `notes` / `flex`.
- Queries: `filter` / `groupBy` / `bin` / `aggregate` / `orderBy` / `limit` / `sample` via `runQuery`. Helpers: `share`, `count_if`, `sum_if`, `mean_if`, `ratio`.
- User markdown inserts: `createdBy: "user"`; preserve with `mergeUserRows`.

## Locked choices

- Book chrome stays the scaffold (tabs, theme, fonts).
- One canonical JSON table.
- Prefer React chart files over JSON chart catalogs.
- Product docs: root `README.md` only.
