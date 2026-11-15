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

## Round 3 (analyst edit, follow-ups, Summary "page")

31. **There are no pages.** `BookDocument` is `tabs → rows`. `App.tsx` imports exactly one `rows.json`, and `Sidebar` / `BookTabs` are fixed primitives that list tabs flatly with no grouping level. What I did instead: a **Summary** tab first and default (`defaultTabId: "summary"`, shareable as `?tab=summary`), followed by the six deep-dive tabs unchanged. Its four charts are copies of existing blocks with new ids and identical inlined queries, so they cannot drift from the deep-dive versions. Real pages would need a scaffold change. Option A: a `pages: { id, label, tabIds[] }[]` level in `BookDocument`, with Sidebar grouping tabs under page headings, BookTabs showing only the active page's tabs, and `?page=` routing in `App.tsx`. Option B: two books sharing one `canonical.json` (a second `rows.*.json` plus a second Vite entry or a `?book=` switch in `App.tsx`). Both touch Sidebar/BookTabs/App, which the skill says not to fork per book, so this is a product-repo change, not a per-book one.
32. **The analyst hand-edited a generated file.** `rows.json` comes from `build_rows.py`, so regenerating would have silently deleted their note. `build_rows.py` now reads back every `createdBy: "user"` row from the existing `rows.json` and re-emits it verbatim (it fails loudly if that row's tab disappears). `book.test.ts` pins the note's presence. The skill's `createdBy: 'skill' | 'user'` field exists but has no defined merge semantics; this is one interpretation.
33. **Fractional `order`** (`1.5`) is a natural way for a person to slot a row in. The scaffold's sort handles it, but my round-1 test (contiguous integer order) rejected it. The test now requires unique, numeric orders, with skill rows contiguous.
34. Recharts auto-thins category tick labels even with only 4 categories (the "300–399" label was hidden). The renderer now uses `interval={0}` for category x-axes with 12 or fewer values.
35. The analyst's commit removed the trailing newline from `rows.json`; regeneration restores it. That diff is harmless.

## Round 4 (correlation matrix, lookup table, critical review)

36. **The query engine cannot compute a correlation matrix, and the renderer has no heatmap.** `runQuery` has no correlation aggregate and cannot unpivot six columns into `(stat_a, stat_b, r)` rows, and there is no cell/heatmap mark. What I did instead: `build_rows.py` computes Pearson r from `canonical.json` and emits a 7×7 GFM markdown table. `book.test.ts` recomputes every cell, so the table cannot drift from the data. A true heatmap would need either a correlation aggregate plus a long-format result, or a precomputed second grain (stat × stat), plus a heatmap or cell mark in the renderer.
37. **There is no table row type.** The spec reserves `table` for later. GFM tables already parse through remark-gfm, but `theme.css` had **no table styles**, so they rendered as unstyled, borderless text. I added `.cb-markdown table/th/td` rules that use only `--cb-*` tokens and tabular numerals. That is a scaffold-level gap and belongs upstream.
38. **There is no per-group top-N.** `orderBy` + `limit` is global, so "top 5 per type" cannot be a query. The lookup table is generated the same way as the correlation table and tested the same way. Ties at fifth place are flagged (†, "+k more at T"), not broken by Dex order.
39. **Friction item 22 (charts do not re-theme) was a real bug.** Loading in light mode and toggling to dark left light-palette series and white grid lines on the dark background. The fix is a `useThemeKey()` hook (a MutationObserver on the `<html>` class) in `ResponsiveFrame.tsx`, which `App.tsx` uses as the `RowRenderer` key, so the charts remount and reread the CSS variables. This is a scaffold fix and belongs upstream.
40. Element screenshots taken after a `Page.reload` sometimes came back with empty chart areas, even though the DOM had every bar. That was my capture script, not the book; viewport screenshots confirmed the charts render.

### Review findings and fixes

- **Histograms on a categorical axis** (Summary and Legendary "Base stat total distribution", legendary total values): the x-axis was a list of bin labels, so empty bins vanished and the gap between 600 and 680 looked continuous. They now use a numeric x-axis with fixed ticks, and the renderer's `xShift` centres bars on their bin (the tooltip shows the bin range).
- **Raw counts vs shares:** "Legendaries by type" showed raw counts, which favour big types. It now carries a note that it is a count, and the share chart is next to it.
- **Colour semantics:** each stat has a fixed colour (HP 0 … Speed 5), and orange (index 1) means "legendary". Three charts broke that. In "Defense vs Speed by type", Speed used Sp. Def's colour. In the tanks chart, Speed used Sp. Atk's colour (it now uses a neutral colour, index 6). "Strongest forms overall" was all orange even though most bars are not legendary. "Legendaries by type" now uses the legendary orange.
- **Truncated bar axis:** "Mono- vs dual-type mean total by generation" is a bar chart whose y-axis started at 300, so bar lengths overstated the gap. It now starts at 0. Line charts that still do not start at zero (BST by generation, stat means by generation) say so in their subtitle or note.
- **Small samples:** legendary means per generation rest on 4–11 species; a note says so.
- **Misleading comparison:** "Archetypes among Megas" compared Megas against all species. It is now "Archetype share: base forms vs their Megas" (11 of 48 vs 28 of 50), which is the like-for-like comparison.
- **Unreadable ticks:** share charts got explicit `valueTicks` (0/25/50/75/100%, 0–20%), and the small-multiple histograms got shared y ticks (0–140).
- **Generation shares:** a mixed chart (legendary share and dual-type share on one axis) was reduced to legendary share; dual-type share lives in the dual-typing section.

## Round 5 (a cold teammate's starter section, commit 1eeecb9)

Another agent with no context added a starter-final section to Generations. Its data work was sound: the 18-species list is correct, it went through `build_canonical.py` / `build_rows.py` rather than hand-editing JSON, and the prose numbers are right. What it missed:

- **A bar chart with a cut-off axis** ("mean total by role", y from 520 to 540). Fire's bar (532) drew about 1.7× as tall as Grass's (527), a 1% difference. This is exactly the rule the round-4 review had just enforced.
- **Charts of a non-result.** All 18 totals sit in 525–535, so a line chart of totals (whose "means" were each one species, via three new pivot columns) and a role bar chart both said "flat" while looking like trends. The real story is in how the points are spent (Fire is frail and special, Gen 2 reuses Gen 1's numbers), and the section didn't tell it.
- **Small multiples that can't be compared or read:**
  - Each panel auto-scaled its own y-axis.
  - The x-axis read Fire / Grass / Water in every panel, so you couldn't tell which Pokémon is which without hovering.
  - Every panel had the same subtitle, "e.g. Venusaur / Charizard / Blastoise", even in Gens 2–6.
  - No panel had a note.
- **Colours:** Grass / Fire / Water were drawn in palette 0 / 3 / 4, which in this book are HP / Sp. Atk / Sp. Def, right next to stat-coloured charts.
- **Documentation and tests:**
  - No test for any new number.
  - No `understanding.md` entry for the new columns.
  - No manifest param for the hand-maintained starter list.
  - No check that the list matched 18 species (a typo would have silently dropped one).

What I changed:
- Dropped the three pivot columns.
- Added a one-per-(generation, role) guard in the transform and recorded the list in the manifest.
- The totals are now a generated 6 × 3 markdown table.
- New "Average stat profile by role" chart on a zero baseline.
- Per-generation panels use names on the x-axis, a shared 0–130 scale and one takeaway note each.
- The prose is derived from the data and tested.
- Documented in `understanding.md`.

**What would have helped them, in this repo** (now done):
1. **The house rules were only in this log and in my head.** They now sit as a conventions block at the top of `build_rows.py`, the file any editor has to open.
2. **Tests enforce the rules.** `book.test.ts` → "book conventions" covers zero-based bars, stated line-axis zooms, a shared scale for small multiples, and fixed stat colours. Run against 1eeecb9, it fails on every chart problem above.

**What would have helped, in the skill** (read-only, so these are suggestions):
3. **There is no "extend an existing book" path.** `SKILL.md` is an init → profile → transform → emit pipeline. It never tells a later editor to read `understanding.md`, the generator, or the tests first, or to rerun the sanity step on the whole book.
4. **The chart rules exist but are routed elsewhere.** "Bar charts start at zero" and "scales are consistent across panels" are in `references/anthropic-data-plugin/skills/validate-data` and `create-viz`. The router sends agents there only for profiling and for choosing a chart form, not as a pre-commit check. Pipeline step 6 ("queries return rows") has no chart-honesty items.
5. **The spec has no place for book-level conventions** (a palette meaning, a population filter). `chart-book-spec.md` could reserve a `conventions` block in `BookDocument` or `understanding.md`, so the next agent inherits them.
