# AGENT_NOTES — Pokémon reaudit2 Round 3 (extend)

## Branch

`cursor/pokemon-reaudit2-r1-a7c3` continued from analyst commit `7e6df76` (`md-analyst-speed-tiers`).

## What changed (R3)

Fail-closed **extend** (no re-init):

1. Read `understanding.md` + conventions
2. `npm run extend-check` → ok
3. Opened validate-data + create-viz / METHOD pointers
4. Edited generators → regenerated
5. **`mergeUserRows` preserved `md-analyst-speed-tiers`** (`createdBy: user`, order 0.5 on Summary)
6. Blocking: test → lint:charts → check → check:visual

### Content

- **Team pool** tab: `in_team_pool` = primary ∧ non-leg ∧ BST≥500 (**134**); speed tiers `<60` / `60–79` / `80–99` / `100+`
- Pool **counts** and **composition shares** on separate rows (`sum(pool_share_unit)`; `share` / `count_if` for rates)
- Summary **refs** to pool share + count charts
- Honesty: split lean species counts vs glass `count_if` onto separate rows (mixed magnitudes)

| Metric | R2 | R3 |
|--------|----|----|
| Tabs | 6 | **7** (+ Team pool) |
| Charts | 53 | **61** |
| Refs | 6 | **8** |

### User-row proof

After regen, Summary still has:

- `id`: `md-analyst-speed-tiers`
- `createdBy`: `user`
- `order`: `0.5`

## Rebuild

```bash
cd pokemon-book
python3 src/data/transforms/build_canonical.py
python3 src/data/transforms/build_rows.py   # mergeUserRows keeps analyst markdown
npm test && npm run lint:charts && npm run check
```

## Blocking results (R3)

| Check | Result |
|-------|--------|
| `npm run extend-check` | ok |
| `npm test` | 25 passed |
| `npm run lint:charts` | 12 passed |
| `npm run check` | ok |
| `npm run check:visual` | ok |

## Skill friction

- Long-form pool composition shares need `pool_share_unit` (summable); within-group `share` cannot emit tier composition alone — documented in understanding.md.
- Workspace can reset off the book branch; always pull `cursor/pokemon-reaudit2-r1-a7c3` before extend.
