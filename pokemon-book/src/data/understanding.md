# Understanding — Pokémon base stats (Gen 1–6)

## Question

How do Pokémon base stats differ across **types**, **generations**, and **legendary status**, and what is surprising in the data?

## Sources

| Source | Rows | Notes |
|--------|------|-------|
| `data/Pokemon.csv` (public Kaggle-style dataset, sha256 `02eabc49…a32f`) | 800 | One row per Pokémon *form*, Gen 1–6 (National Dex 1–721) |

Columns: `#`, `Name`, `Type 1`, `Type 2`, `Total`, `HP`, `Attack`, `Defense`, `Sp. Atk`, `Sp. Def`, `Speed`, `Generation`, `Legendary`.

No joins. The transform is `src/data/transforms/build_canonical.py` (stdlib Python). Its input checksum and output hash are in `build_canonical.manifest.json` next to it.

## Profile

- 800 rows, 13 columns. No empty values except `Type 2`, which is blank for the 386 mono-type forms (48%).
- `#` is **not unique**. There are 721 distinct dex numbers; 79 rows are extra forms of an existing species:
  - **50 Mega/Primal forms** (48 Mega + Primal Kyogre/Groudon). 49 add exactly **+100** to the base total; Mega Alakazam adds +90.
  - **29 alternate forms** with the same or a different stat spread (Rotom appliances, Deoxys formes, Pumpkaboo/Gourgeist sizes, Therian formes, Black/White Kyurem, etc.).
- Names glue species and form together (`VenusaurMega Venusaur`, `DeoxysNormal Forme`). The transform splits them into `species` and a readable `name` (`Mega Venusaur`, `Deoxys (Normal Forme)`).
- `Total` always equals the sum of the six stats (checked for all 800 rows).
- Stats are on a 1–255 scale. Plausible extremes: Shedinja has HP 1, Blissey HP 255, Shuckle Defense/Sp. Def 230, and Deoxys (Speed) Speed 180.
- `Generation` has six levels; Gen 6 is the smallest (72 species) and Gen 5 the largest (156).
- `Legendary`: 65 of 800 forms, 46 of 721 base species (6.4%).

## Grain and keys (canonical)

**One row per form × type slot** (1,214 rows). Mono-type forms have one row (`type_slot = Primary`); dual-type forms have a second row (`Secondary`). Primary key: `row_id`.

The grain is designed so that "by type" questions count a dual-type Pokémon under **both** of its types. Type-1-only analysis is misleading: Flying is the secondary type of 87 base species but the primary type of only 3.

Filter conventions used by chart queries:

| Population | Filter |
|------------|--------|
| One row per species (default for most charts) | `type_slot = Primary` and `is_primary_form = true` → 721 rows |
| Every type a species has | `is_primary_form = true` (any slot) → 1,071 rows |
| Megas vs their own base forms | `type_slot = Primary` and `has_mega_form = true` and `form_kind in [Base, Mega/Primal]` |

## Derived columns

- `species`, `name`, `form_kind` (Base / Mega/Primal / Alternate form), `is_primary_form` (the first CSV row for a dex number).
- `generation` relabelled `Gen 1`…`Gen 6`; `status` = Legendary / Non-legendary.
- `phys_minus_spec` = Attack − Sp. Atk (positive means a physical lean).
- `top_stat`: the highest of the six stats (ties go to the earlier stat in HP → Speed order).
- `mega_uplift`: Mega/Primal total minus its base-form total.
- **Pivot helpers** (the query engine has no pivot or conditional aggregate): `total_legendary` / `total_nonlegendary` are the total or null, so `mean` and `count` split by status within one query. `in_primary_slot` / `in_secondary_slot` are booleans so `sum` counts slots.

## Quality issues and caveats

- **Legendary flag is inconsistent for mythicals.** Mew, Celebi, Manaphy, Phione, Genesect, Keldeo, and Meloetta are `False` (as is Cresselia, a canon legendary); Jirachi, Darkrai, Victini, Arceus, Shaymin, Diancie, Hoopa, and Volcanion are `True`. The source flag is kept as-is. Some "non-legendary 600 BST" species are mythicals.
- Megas and alternate forms are excluded from most charts so that species with many forms (Rotom ×6, Charizard ×3) are not over-weighted. Megas get their own section.
- Stats are game design constants, not samples. Differences between groups are descriptive; there is no sampling uncertainty to test.
- Only Gen 1–6 are covered (no Alola/Galar/Paldea, no Fairy retcons of older Pokémon beyond what the CSV encodes).

## Headline findings (base forms)

- Legendaries average **620** total vs **404** (a gap of about 2 standard deviations). The largest gaps are in Sp. Atk (+48) and Sp. Def (+40); the smallest is HP (+27).
- **No base-form legendary is below 580**, and 16 sit exactly on it. Only 15 non-legendaries reach 580+: the pseudo-legendaries (Dragonite, Tyranitar, Salamence, Metagross, Garchomp, Hydreigon, Goodra at exactly 600), unflagged mythicals and legendaries (Mew, Celebi, Manaphy, Genesect, Meloetta, Keldeo, Cresselia), and Slaking (670, balanced by its Truant ability).
- The non-legendary total distribution is **bimodal** (peaks around 300–349 and 450–499), which reflects unevolved vs fully evolved Pokémon.
- **Gen 4 is the strongest generation** (non-legendary mean 424, median 453) and has the highest legendary share (10%). Gen 3 is the weakest (385). There is no steady power creep.
- **Dragon has the highest mean total (499)**, but 26% of Dragon species are legendary. Among non-legendaries, **Steel (450)** edges out Dragon (444). Bug is lowest (366), and Bug and Poison have no legendaries at all.
- Physical vs special identity: Fighting (+36), Ground (+31), and Rock (+30) lean physical; Psychic (−22), Fairy (−16), and Electric (−14) lean special.
- Defense and Speed are **uncorrelated** (r = −0.01), the weakest pair among the six stats. Sp. Atk correlates most with total (0.72).
- Dual-type non-legendaries average 417 vs 393 for mono-types.
- Megas add +100 that goes to Attack (+29), Sp. Atk (+24), and Defense (+21), and **never to HP** (+0 on average).
