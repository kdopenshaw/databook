# AGENT_NOTES — Pokémon reaudit R3

## Dev server

```bash
cd pokemon-book
npm install
npm run dev -- --port 5180 --host 127.0.0.1
```

URL: **http://127.0.0.1:5180/**

Pages (sidebar): **Overview** · **Deep dive** (includes **Team pool**).

## Rebuild

```bash
python3 src/data/transforms/build_canonical.py
python3 src/data/transforms/build_rows.py   # mergeUserRows keeps createdBy:user
npm test
npm run lint:charts
```

## R3 changes

- Speed-tier cut for team-building pool (`in_team_pool`: non-leg, BST≥500, primary form) — shares + counts + mean BST.
- Preserved Overview `md-analyst-speed-tiers` (`createdBy: "user"`) via `mergeUserRows`.
- Honesty pass: split mixed-metric sibling rows (phys lean vs raw means; gen means vs counts; legendary BST vs six-stat means; archetype counts vs mean Speed); shared `mean_stat` keys for Attack/Sp.Atk and Defense/Sp.Def/Speed siblings.

## Friction vs skill

- Stock RechartsSpec only — **no renderer forks**.
- Shared-scale lint needs identical series `dataKey` → `mean_stat` / `rate` / `share` aliases.
- Pool shares use `sum(pool_share_unit)` (no window/`ratio` over grand total).
- `npm run check` still unavailable (`scripts/` not copied by scaffold-files.txt).
- `valueFormat: "percent"` expects 0–1 shares.
