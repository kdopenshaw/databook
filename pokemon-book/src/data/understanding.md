# Understanding — Pokémon base stats (Gen 1–6)

## Question

How do base stats differ across **types** (both slots), **generations**, **legendary status**, and **glass-cannon / tank archetypes**?

## Sources

| Source | Rows | Notes |
|--------|------|-------|
| `data/Pokemon.csv` | 800 | Public Gen 1–6 form table (National Dex `#` 1–721). SHA-256 `02eabc49d3c70bc1e150891bdb9acb254910adfdfc12a6020c7b7117b2eca32f`. |

Columns: `#`, `Name`, `Type 1`, `Type 2`, `Total`, `HP`, `Attack`, `Defense`, `Sp. Atk`, `Sp. Def`, `Speed`, `Generation`, `Legendary`.

Rebuild: `python3 src/data/transforms/build_canonical.py` then `python3 src/data/transforms/build_rows.py`, then `npm test`.

## Profile

- 800 CSV forms; `#` is not unique (721 dex numbers + Mega/alternate formes).
- `Type 2` blank on 386 mono-type forms.
- `Total` always equals the six-stat sum.
- Legendary flag: 65 / 800 forms (46 / 721 primary forms).

## Grain

**Canonical grain:** one row per **form × type slot** (1,214 rows). Dual-types get a Primary and a Secondary row; mono-types get Primary only.

| Population | Filter | Rows (approx.) | Use |
|------------|--------|----------------|-----|
| Per-species | `is_primary_form` && `type_slot = Primary` | 721 | Generations, legendary, distributions, archetype counts |
| Type participation | `is_primary_form` (any slot) | ~1,071 | Type means / rates (dual-types under both types) |
| Type 1 only | species filter above | 721 | Side-by-side vs both-slots |

## Archetypes

Fit on the **721 primary forms**, then copied to every slot row of that form:

- `offense` = max(Attack, Sp. Atk); `bulk` = mean(HP, Defense, Sp. Def)
- z-scores vs primary-form mean/SD
- **Glass cannon:** `z(offense) − z(bulk) ≥ 1` and `z(offense) ≥ 0.5` → **61** species
- **Tank:** `z(bulk) − max(z(offense), z(Speed)) ≥ 1` and `z(bulk) ≥ 0.5` → **41** species
- Else **Neither**. If both fire (rare), the larger gap wins.

Thresholds (`gap=1.0`, `floor=0.5`) are a judgment call — descriptive labels, not competitive roles.

## Pages / IA

- **Overview** page → Summary tab (refs into deep-dive charts)
- **Deep dive** page → By type, By generation, Legendary, Distributions, Archetypes

Sidebar lists pages only because `BookDocument.pages` is set.

## Caveats

- Legendary / mythical flag inconsistency in the source CSV.
- Mega/alternate formes excluded from default populations via `is_primary_form`.
- Both-slot type charts **intentionally double-count** dual-type species.
- Stats are design constants — differences are descriptive, not inferential.
- Gen 1–6 only.

## Headline findings

- Legendary ~**620** vs non-legendary ~**404** mean BST (species grain).
- Both-slot cut: **Flying** participation jumps (~80 non-legendary participations vs ~2 as Type 1).
- Gen 4 strongest / Gen 3 weakest among non-legendary means — no monotonic power creep.
- Glass cannons lean fast and high-offense; tanks lean high-bulk / lower Speed.
