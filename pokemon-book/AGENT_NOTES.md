# AGENT_NOTES — Pokémon reaudit2 Round 2 (extend)

## Branch

`cursor/pokemon-reaudit2-r1-a7c3` (continued from R1 @ `8b6673b`).

## What changed (R2)

Fail-closed **extend** (no re-init):

1. Read `understanding.md` + `BookDocument.conventions`
2. `npm run extend-check` → ok
3. Opened validate-data + create-viz / METHOD pointers
4. Edited generators (`build_canonical.py`, `build_rows.py`) + regenerated artifacts
5. `mergeUserRows` in generator (no `createdBy:user` rows present this round)
6. Blocking: `npm test` → `lint:charts` → `check` → `check:visual`

### Content

- **Archetypes tab:** glass cannon (61) / tank (41) / neither; physical vs special lean; `scaleGroup: arch-stats`; gen shares; scatter; `mean_if` / `sum_if` / `count_if` / `share`
- **By type improved:** both-slot default kept; Primary vs Secondary `count_if` slot split (`scaleGroup: type-slots`); glass/tank shares by type; mean Speed; Type-1-only labeled as undercount contrast
- **Summary refs** extended (archetype count + offense/bulk scatter) — no query copies
- Canonical now carries archetype / lean / z-score fields

| Metric | R1 | R2 |
|--------|----|----|
| Tabs | 5 | **6** (+ Archetypes) |
| Charts | 33 | **53** |
| Refs | 4 | **6** |

## Rebuild

```bash
cd pokemon-book
python3 src/data/transforms/build_canonical.py
python3 src/data/transforms/build_rows.py
npm test && npm run lint:charts && npm run check
```

## Blocking results (R2)

| Check | Result |
|-------|--------|
| `npm run extend-check` | ok |
| `npm test` | 25 passed |
| `npm run lint:charts` | 12 passed |
| `npm run check` | ok |
| `npm run check:visual` | ok (HTTP 200 + screenshot) |

## Skill friction

- Extend checklist is clear; must stay on the book branch (workspace can reset to product tip without `pokemon-book/`).
- Archetype thresholds are judgment — documented in `understanding.md` + conventions population string.
- `scaleGroup` continues to replace identical-`dataKey` aliasing for sibling means.
