# Understanding — Pokémon base stats (Gen 1–6)

## Question

How do base stats differ across **types** (both slots), **generations**, **legendary status**, **offensive/defensive archetypes**, and **speed tiers in the team-building pool**?

## Sources

| Source | Rows | Notes |
|--------|------|-------|
| `data/Pokemon.csv` | 800 | Public Gen 1–6 form table (National Dex `#` 1–721). SHA-256 `02eabc49d3c70bc1e150891bdb9acb254910adfdfc12a6020c7b7117b2eca32f`. |

**Starter finals:** 18 primary-form species (dex # 3, 6, 9, …, 658) flagged `is_starter_final`. Each also emits six `record_kind=base_stat` rows (`stat_label` / `stat_value`) for per-species stat panels. Default species/type filters add `record_kind=type_slot` so these long rows do not enter population cuts.

Rebuild: `python3 src/data/transforms/build_canonical.py` then `python3 src/data/transforms/build_rows.py`, then `npm test`. Generators call `mergeUserRows` so `createdBy: "user"` rows (e.g. Summary `md-analyst-speed-tiers`) survive regen.

## Grain

**Canonical file:** one row per **form × type slot** (Primary, and Secondary when dual-typed), plus optional **base_stat** rows for starter-finals stat panels. Mega/alternate formes are retained with `is_primary_form=false` but default charts exclude them.

| Population | Filter | Rows | Use |
|------------|--------|------|-----|
| Per-species (honest primary form) | `is_primary_form` ∧ `type_slot=Primary` | **721** | Gens, legendary, distributions, archetypes, Summary KPIs |
| Type participation (both slots) | `is_primary_form` (any slot) | **~1,071** | Type identity / type means / archetype rates by type |
| Type-1 only | `is_primary_form` ∧ `type_slot=Primary` grouped by `type` | 721 | Explicit Type-1 comparisons (undercounts dual-type secondaries) |
| Secondary slot only | `is_primary_form` ∧ `type_slot=Secondary` | **350** | Dual-types’ Type 2 participation |
| Team-building pool | `in_team_pool` (+ species filters in charts) | **134** | Speed-tier shares & counts |

`is_primary_form` = first CSV row for each National Dex `#` (base species before Mega/alternate formes).

## Type-1 vs both-slot (read this)

- **Type 1 / primary slot:** each species counted once. Dual-types contribute only their first type. Charts labeled “Type 1” or filtered to `type_slot=Primary` **undercount** types that appear mainly as Type 2 (e.g. Flying).
- **Both-slot participation:** dual-types appear under **both** types. Counts and means are participation-weighted; a Water/Flying species contributes to Water **and** Flying. Default “By type” panels use both slots via column `type`.
- **Slot split:** Primary vs Secondary `count_if` panels show how much of a type’s participation is first-slot vs second-slot — still both-slot aware, not Type-1-only.
- Do **not** mix Type-1 and both-slot panels in the same sibling row without matching filters and labels.

## Speed tiers & team pool

Bands on raw Speed: **&lt;60** · **60–79** · **80–99** · **100+** (`speed_tier` + `speed_tier_rank` for sort).

`in_team_pool` = primary form ∧ non-legendary ∧ `total ≥ 500` (analyst definition) → **134** species.

Pool composition shares: `sum(pool_share_unit)` by `speed_tier` where `pool_share_unit = 1/134` on pool species (null elsewhere). Counts and shares are charted on **separate rows** (different scales). Prefer `share` / `count_if` for rates and conditional counts; `pool_share_unit` exists only because long-form tier composition needs a summable unit when `share` is within-group.

## Archetypes

Fit on **721 primary forms**; scores copy onto every slot row for that form.

| Field | Definition |
|-------|------------|
| Offense | `max(Attack, Sp. Atk)` |
| Bulk | `mean(HP, Defense, Sp. Def)` |
| Glass cannon | `z(offense)−z(bulk) ≥ 1` and `z(offense) ≥ 0.5` → **61** |
| Tank | `z(bulk)−max(z(offense), z(Speed)) ≥ 1` and `z(bulk) ≥ 0.5` → **41** |
| Neither | Everyone else (mutual exclusivity: larger gap wins if both fire) |
| Offense lean | Physical / Special if `\|Attack−Sp.Atk\| ≥ 15`, else Balanced |

Physical lean **counts** vs glass **count_if** use different magnitudes — never siblings. Polarity `Attack−Sp.Atk` stays off raw-mean rows.

These are descriptive design clusters, not competitive tier lists.

## Honesty conventions

- Bar value axes include **0** (`BookDocument.conventions.zeroBaselineBars`).
- Sibling panels that share a measure family use the same **`scaleGroup`** plus a shared explicit `yDomain`.
- Counts are **not** siblings of means / BST totals / shares.
- Polarity metrics (Attack − Sp. Atk) are **not** siblings of raw means.
- Do not chart near-flat bands as trends without acknowledging flatness.
- Prefer `share` / `count_if` / `sum_if` / `mean_if` for rates and conditional totals.

## Caveats

- The CSV `Legendary` flag is inconsistent for some mythical / event species; treat it as the source’s flag, not a lore-complete list.
- Mega and alternate formes inflate raw CSV means if left unfiltered — always use `is_primary_form` for species-level claims.
- Base stats are design constants (not measured combat outcomes).
- Generation means of BST vary modestly (~402–446); do not over-claim a strong “power creep” trend from this cut alone.
- Archetype thresholds are analyst judgment (`gap=1.0`, `floor=0.5`, lean gap `15`).
- Team-pool BST≥500 cutoff is an analyst definition, not an official competitive rule.
