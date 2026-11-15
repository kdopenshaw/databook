# AGENT_NOTES — Pokémon reaudit2 Round 1

## Branch

`cursor/pokemon-reaudit2-r1-a7c3` off tip `cursor/reaudit-remaining-fixes-f6db` @ `d0f2822`.

## What shipped

Fresh `pokemon-book/` from scaffold (`scaffold-files.txt`, **including `scripts/`**).

| Artifact | Notes |
|----------|-------|
| `data/Pokemon.csv` | 800 rows from `origin/cursor/pokemon-reaudit-r1-1b05` |
| `src/data/canonical.json` | form × type slot · 1,214 rows · 721 primary species |
| `src/data/understanding.md` | Grain + Type-1 vs both-slot caveats |
| `src/data/rows.json` | 5 tabs · 2 pages · 33 charts · 4 refs |
| `src/data/transforms/` | `build_canonical.py` + `build_rows.py` (`mergeUserRows`) |

**Tabs:** Summary · By type · By generation · Legendary · Distributions  
**Pages:** Overview (Summary) · Deep dive (the rest)

**Conventions:** `zeroBaselineBars`, population string, palette, honesty notes.  
**scaleGroup:** `type-offense`, `type-bulk`, `gen-stats`, `leg-stats`, `stat-hist` (+ a few single-panel tags).  
**Aggregates used:** `share`, `count_if`, `mean_if`, `sum_if`, plus `count`/`mean`.

Stock RechartsSpec only — no renderer forks.

## Rebuild

```bash
cd pokemon-book
npm install
python3 src/data/transforms/build_canonical.py
python3 src/data/transforms/build_rows.py
npm test && npm run lint:charts && npm run check
npm run dev -- --port 5180 --host 127.0.0.1
npm run check:visual -- --url http://127.0.0.1:5180/
```

## Blocking results (this run)

| Check | Result |
|-------|--------|
| `npm test` | 25 passed |
| `npm run lint:charts` | 12 passed |
| `npm run check` | ok |
| `npm run extend-check` | ok (not an extend round; sanity) |
| `npm run check:visual` | ok (HTTP 200 + screenshot) |

## Skill friction

- Init sample must be fully replaced (`canonical.json`, `rows.json`, `understanding.md`, `index.html` title) — easy to leave sample crumbs if transforms are skipped.
- `scaffold-files.txt` now lists `scripts/` (this tip) — copy worked; `npm run check` / `check:visual` available (prior R1 notes said scripts were missing).
- `scaleGroup` removes the old “rename every aggregate to `mean_stat`” lint workaround for sibling means — used intentionally on offense/bulk/gen/leg/hist panels.
- `valueFormat: "percent"` expects 0–1 shares from `share`.
- validate-data + create-viz pointers opened at chart-choice time per skill router (not ambient dump of all references).
