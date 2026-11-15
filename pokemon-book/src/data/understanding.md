# Understanding — Pokémon base stats (Gen 1–6)

## Question

How do base stats differ across **types**, **generations**, and **legendary status**?

## Sources

| Source | Rows | Notes |
|--------|------|-------|
| `data/Pokemon.csv` | 800 | Public Gen 1–6 form table (National Dex `#` 1–721). SHA-256 `02eabc49d3c70bc1e150891bdb9acb254910adfdfc12a6020c7b7117b2eca32f`. |

Columns: `#`, `Name`, `Type 1`, `Type 2`, `Total`, `HP`, `Attack`, `Defense`, `Sp. Atk`, `Sp. Def`, `Speed`, `Generation`, `Legendary`.

No joins. Rebuild with `python3 src/data/transforms/build_canonical.py` then `python3 src/data/transforms/build_rows.py` from the book root, then `npm test`.

## Profile

- 800 rows, 13 columns. Only `Type 2` is sparse: blank on 386 mono-type forms (48%).
- `#` is **not unique** (721 distinct dex numbers; 79 extra forms):
  - ~50 Mega/Primal forms (names containing `Mega ` / `Primal `).
  - Remaining extras are alternate formes (Rotom appliances, Deoxys, Pumpkaboo sizes, Therian, etc.).
- `Total` equals the sum of the six battle stats on every row.
- Stats are design constants on roughly a 1–255 scale (Shedinja HP 1; Blissey HP 255; Shuckle Defense/Sp. Def 230).
- Generations 1–6 present; counts by form: 166 / 106 / 160 / 121 / 165 / 82.
- Legendary flag: 65 / 800 forms (`True`).

## Grain

**Canonical grain:** one row per CSV form (800). Primary key: `row_id` (stable `dex-form` index).

Derived helpers:

- `is_primary_form` — first CSV row for each dex `#` (721 species “base” rows).
- `is_mega` — Mega/Primal name match.
- `form_kind` — `Base` | `Mega/Primal` | `Alternate`.
- `generation_label` — `Gen 1` … `Gen 6`.
- `status` — `Legendary` | `Non-legendary` (from the source flag).
- `type_2` — null when blank.

## Default analysis population

Charts default to **`is_primary_form = true`** (721 species), so Mega and alternate formes do not overweight species with many rows.

Type charts group by **`type_1` only**. Dual-type Pokémon contribute only under their primary type; Flying (and others that are often secondary) are under-counted — see caveats.

## Caveats

- **Legendary flag is inconsistent for mythicals.** Some mythicals are `False` (e.g. Mew, Celebi) and some are `True` (e.g. Jirachi, Arceus). Charts use the source flag as-is.
- Mega/alternate forms are excluded from default charts; they inflate totals (~+100 BST for most Megas).
- Stats are not samples — group differences are descriptive, not inferential.
- Gen 1–6 only (no Alola/Galar/Paldea forms beyond what this CSV encodes).
- Type-1-only ranking: Flying has very few primary-type species; Bug looks weakest partly because many Bug lines stay low-BST unevolved stages in the primary-form set.

## Headline findings (primary forms)

- Legendaries average ~**620** total vs ~**404** for non-legendaries.
- Among non-legendaries, **Dragon** and **Steel** lead mean Total; **Bug** is lowest; **Flying** Type-1 means are unstable (tiny n).
- **Gen 4** non-legendaries have the highest mean/median Total; **Gen 3** is weakest — no monotonic power creep across generations.
- Offense identity: Fighting / Ground / Rock lean physical (Attack ≫ Sp. Atk); Psychic / Fairy / Electric lean special.
