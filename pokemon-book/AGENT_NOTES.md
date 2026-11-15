# AGENT_NOTES — Pokémon reaudit R2

## Dev server

```bash
cd pokemon-book
npm install
npm run dev -- --port 5180 --host 127.0.0.1
```

URL: **http://127.0.0.1:5180/**

Pages (sidebar): **Overview** · **Deep dive**. Tabs filter to the active page.

## Rebuild

```bash
python3 src/data/transforms/build_canonical.py
python3 src/data/transforms/build_rows.py
npm test
npm run lint:charts
```

## R2 changes

- Canonical grain → form × type slot (1,214 rows); species charts filter `type_slot=Primary`.
- Both-slot type analysis + primary-slot comparison panels.
- Archetypes tab (glass / tank z-score cut); shared `yDomain` on rate and offense/bulk siblings.
- `BookDocument.pages` → Overview / Deep dive (sidebar mounts only because pages exist).
- Summary uses `ref` (no copied queries). `mergeUserRows` still applied in `build_rows.py`.

## Friction vs skill

- Stock RechartsSpec still enough — **no renderer/App/theme forks**.
- `scaffold-files.txt` still omits `scripts/`; `npm run check` unavailable without copying scripts.
- Sibling shared-scale lint keys off identical `xKey` + series `dataKey`; renamed aggregates to a shared `mean_stat` / `rate` so honesty is lint-enforced.
- `valueFormat: "percent"` expects 0–1 rates (boolean means) — domain stays `[0, 0.35]`.
- Boolean `mean` for shares is the stock substitute for a missing pivot/share aggregate.

## Population reminder

See `src/data/understanding.md` and `BookDocument.conventions`.
