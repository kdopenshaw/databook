# Understanding — Pokémon base stats (Gen 1–6)

## Question

How do base stats differ across **types**, **generations**, and **legendary status**, and what do the **stat distributions** look like in the primary-form species pool?

## Sources

| Source | Rows | Notes |
|--------|------|-------|
| `data/Pokemon.csv` | 800 | Public Gen 1–6 form table (National Dex `#` 1–721). SHA-256 `02eabc49d3c70bc1e150891bdb9acb254910adfdfc12a6020c7b7117b2eca32f`. |

Rebuild: `python3 src/data/transforms/build_canonical.py` then `python3 src/data/transforms/build_rows.py`, then `npm test`. Generators call `mergeUserRows` so `createdBy: "user"` rows survive regen.

## Grain

**Canonical file:** one row per **form × type slot** (Primary, and Secondary when dual-typed). Mega/alternate formes are retained with `is_primary_form=false` but default charts exclude them.

| Population | Filter | Rows | Use |
|------------|--------|------|-----|
| Per-species (honest primary form) | `is_primary_form` ∧ `type_slot=Primary` | **721** | Gens, legendary, distributions, Summary KPIs |
| Type participation (both slots) | `is_primary_form` (any slot) | **~1,071** | Type identity / type means |
| Type-1 only | `is_primary_form` ∧ `type_slot=Primary` grouped by `type` (= Type 1) | 721 | Explicit Type-1 comparisons |

`is_primary_form` = first CSV row for each National Dex `#` (base species before Mega/alternate formes).

## Type-1 vs both-slot (read this)

- **Type 1 / primary slot:** each species counted once. Dual-types contribute only their first type. Charts labeled “Type 1” or filtered to `type_slot=Primary` use this.
- **Both-slot participation:** dual-types appear under **both** types. Counts and means are participation-weighted; a Water/Flying species contributes to Water **and** Flying. Default “By type” panels use both slots via column `type` and document the double-count.
- Do **not** mix Type-1 and both-slot panels in the same sibling row without matching filters and labels.

## Honesty conventions

- Bar value axes include **0** (`BookDocument.conventions.zeroBaselineBars`).
- Sibling panels that share a measure family use the same **`scaleGroup`** plus a shared explicit `yDomain`.
- Counts are **not** siblings of means / BST totals.
- Polarity metrics (Attack − Sp. Atk) are **not** siblings of raw means.
- Prefer `share` / `count_if` / `sum_if` / `mean_if` for rates and conditional totals.

## Caveats

- The CSV `Legendary` flag is inconsistent for some mythical / event species; treat it as the source’s flag, not a lore-complete list.
- Mega and alternate formes inflate raw CSV means if left unfiltered — always use `is_primary_form` for species-level claims.
- Base stats are design constants (not measured combat outcomes).
- Generation means of BST vary modestly (~402–446); do not over-claim a strong “power creep” trend from this cut alone.
