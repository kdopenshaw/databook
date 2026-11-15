# Agent notes: DataBook skill friction log

This is a running log of friction with the DataBook skill and scaffold (kdopenshaw/databook @ 2d00fd0) while building this book. It is not book documentation.

## Init / scaffold

1. **What "copy the scaffold" means is not spelled out.** SKILL.md says to copy "the fixed Vite React shell at the book root". I copied `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, and `vite.config.ts`, which builds and tests cleanly. There is no list of required files and no init script in the installed package (`scripts/install-skill.sh` exists in the repo but is not part of the skill symlinks).
2. **The scaffold ships no `.gitignore`.** This book relies on the repo-root `.gitignore` for `node_modules/` and `dist/`. A book initialized into a repo without one would commit `node_modules`.
3. **The init sample is wiped immediately.** The sample's `rows.json` queries `x`/`y` columns, so it breaks as soon as `canonical.json` is replaced. Init → real content has to land in one step; there is no valid intermediate state to commit.
4. The package name stays `databook` in the copied `package.json`, and the `<title>` in `index.html` stays "DataBook". Neither is mentioned as something to change, and the book title in `rows.json` does not flow to the HTML title. Left as-is.

## Spec vs scaffold mismatches

5. **The spec's `ChartQuery` and the scaffold's `ChartQuery` differ slightly.** The spec has `label`; the scaffold adds `id`. `BookDocument` in the scaffold requires `title`, which the spec omits. This is minor, but the scaffold's `types.ts` is the real contract.
6. **`encoding` is required on every block but the renderer never reads it.** Only `recharts.xKey`/`series` drive rendering. I filled `encoding` for documentation and test that its column names exist in the query result (`src/data/book.test.ts`).
7. **The spec's "correct by construction" item 2 (encoding validation before render) is not implemented.** A typo in `dataKey` silently renders an empty series. The book test above covers this for this book.
8. The spec says transforms should be saved "under the data tree" with params and an input checksum, but gives no shape for them. I used `src/data/transforms/build_canonical.py` plus `build_canonical.manifest.json`.

## Query engine (`runQuery`) limitations and workarounds

9. **There is no pivot, conditional aggregate, or long→wide reshape.** Multi-series charts need one column per series, but `groupBy` yields long rows. Workaround: pivot-helper columns in canonical. `total_legendary` / `total_nonlegendary` are null outside their group, so `mean`/`count` ignore them. `in_primary_slot` / `in_secondary_slot` are booleans so `sum` counts them.
10. **Stats cannot go on the x-axis** (no unpivot). The "stat profile" charts put the group on x and the six stats as series instead.
11. **There is no computed or derived expression in queries** (for example, uplift per stat, or a legendary − non-legendary gap). Such values must be precomputed in canonical or explained in markdown.
12. **Empty histogram bins are dropped**, so the category axis skips them silently and bin spacing can look uneven. That was acceptable here, but it is misleading for sparse data.
13. **Multi-valued attributes force a grain decision the skill does not mention.** Dual types meant choosing between a type-1-only grain (misleading; Flying would have 3 species) and a form × type-slot grain that duplicates rows. I chose the latter. Every per-species chart now needs `type_slot = Primary` and `is_primary_form = true`. That is easy to forget, so the test pins the counts.

## Renderer (`RechartsRenderer`) limitations, extended in this book's copy

The stock renderer could not draw several of the chosen forms. All extensions are optional fields in `RechartsSpec` / `RechartsSeriesSpec` (`src/data/types.ts`), so older specs render as before.

14. **ScatterChart was broken.** The X axis was categorical (no `type="number"`) and the Y axis had no `dataKey`, so scatter plots rendered empty with a jumbled axis. Fixed: numeric axes, Y uses `series[0].dataKey`, and an optional `tooltipKeys` shows the point's name.
15. **No horizontal bars.** Ranking 18 types on a vertical bar x-axis drops labels. Added `layout: "vertical"` and `categoryWidth`.
16. **No stacking.** Added a `stackId` passthrough on series.
17. **No axis titles,** although spec §4.2 requires labeled axes with units. Added `xLabel` / `yLabel`.
18. **Legend and tooltip sort series alphabetically** (Recharts defaults `itemSorter: 'value'/'name'`), so the legend read "Attack, Defense, HP…" against bars ordered HP, Attack…. Now sorted by series order.
19. **Unrounded tooltips** (means like 404.2370…), and no percent format. Added `decimals` and `valueFormat: "percent"`.
20. **Fixed 320px height** squashed the 18-row horizontal bars. Added `height`. Also added `yDomain` (for non-zero line baselines), `barCategoryGap`, `colorIndex` (stable palette slot, for example legendary = series-2 everywhere), and `strokeDasharray`.
21. Still missing: reference lines, per-series data or colour-by-category in scatter (I could not colour legendary points differently), `Cell`-level colouring (for example diverging colours for negative bars), ComposedChart, heatmaps (a correlation matrix had to become prose), and table rows (top-N lists had to be bar charts).

## Theme

22. **Charts do not re-theme on toggle.** `chartColors()` reads CSS variables during render, and `ThemeToggle` only flips the `<html>` class without re-rendering charts. Axis, grid, and tooltip colours stay on the old theme until the tab is switched or the page reloaded. This is scaffold-owned, so I did not change it.

## Tooling

23. Headless Chrome screenshots against the Vite dev server never exit (the HMR socket keeps them alive). I used `timeout 25` plus `--user-data-dir` per run.
24. A row's `order` must be set by hand, and `defaultTabId` / tab `order` duplication is easy to get wrong. The book test checks that ids are unique and order is contiguous.

## Round 2 (archetypes + small multiples)

25. **There is no small-multiples / faceted chart block.** A `ChartBlock` is exactly one inlined query feeding one Recharts chart (`ChartSlot` → `RechartsRenderer`). A single block holding six histograms would need either a scaffold change to `ChartSlot` (per-facet queries) or a long-format "stat × value" grain, and a single canonical file cannot hold a second grain cleanly. What I did instead: two `component` rows of three blocks each, with shared numeric x (0–260) and y (0–140) domains. Spec §3.4 points to component rows as the small-multiples primitive, but caps them softly at 3–4 children. The `ComponentRow` flex wrap cannot form a grid, because children use `flex: <number>` (basis 0), so `wrap: true` never wraps.
26. **Histograms on a categorical x-axis do not align across small multiples**, since each panel has a different set of non-empty bins. I added `xType: "number"`, `xDomain`, and `xTicks` to the book's renderer, which also makes empty bins show as gaps instead of vanishing.
27. **Scatter could not colour by category** (round 1, item 21). I added `colorBy: { key, levels[] }`, which splits the query result client-side into one `<Scatter>` per level. The query is unchanged, so this stays within "one query per block".
28. **Generated rows.json:** the skill does not say whether `rows.json` should be hand-written or generated. Repeated filters (base-form population, stat lists) make hand-editing error-prone, so `src/data/transforms/build_rows.py` is the source of truth and `rows.json` is its output. The skill's "humans may edit markdown" convention (`<!-- skill:managed -->`) does not fit a generated file.
29. **Archetype thresholds are analyst judgment, not data.** They are kept as named constants in the canonical transform and recorded in the manifest, so they can be tuned and re-run.
30. Taking per-chart screenshots needed a small Chrome DevTools-protocol script (Node 22 built-in `WebSocket`), because headless `--screenshot` cannot scroll or clip to an element. That script is tooling and is not part of the book.
