# Understanding — Pokémon base stats (Gen 1–6)

## Question

How do base stats differ across **types** (both slots), **generations**, **legendary status**, **glass-cannon / tank archetypes**, and **speed tiers in the team-building pool**?

## Sources

| Source | Rows | Notes |
|--------|------|-------|
| `data/Pokemon.csv` | 800 | Public Gen 1–6 form table (National Dex `#` 1–721). SHA-256 `02eabc49d3c70bc1e150891bdb9acb254910adfdfc12a6020c7b7117b2eca32f`. |

Rebuild: `python3 src/data/transforms/build_canonical.py` then `python3 src/data/transforms/build_rows.py`, then `npm test`. Generators call `mergeUserRows` so `createdBy: "user"` rows (e.g. Overview `md-analyst-speed-tiers`) survive regen.

## Grain

**Canonical:** one row per **form × type slot** (1,214).

| Population | Filter | Rows | Use |
|------------|--------|------|-----|
| Per-species | `is_primary_form` && `type_slot=Primary` | 721 | Gens, legendary, distributions, archetypes |
| Type participation | `is_primary_form` (any slot) | ~1,071 | Type means / rates |
| Team-building pool | `in_team_pool` (+ species filters in charts) | **134** | Speed-tier shares |

`in_team_pool` = primary form ∧ non-legendary ∧ `total ≥ 500` (analyst definition).

## Speed tiers

Bands on raw Speed: **&lt;60** · **60–79** · **80–99** · **100+** (`speed_tier` + `speed_tier_rank` for sort).

Pool shares: `sum(pool_share_unit)` by tier where `pool_share_unit = 1/134` on pool species (null elsewhere). Counts and shares are charted on **separate rows** (different scales).

Observed pool shares (~): &lt;60 19% · 60–79 25% · 80–99 30% · 100+ 25%.

## Archetypes

Fit on 721 primary forms: offense = max(Attack, Sp. Atk); bulk = mean(HP, Defense, Sp. Def).

- Glass: `z(offense)−z(bulk) ≥ 1` and `z(offense) ≥ 0.5` → **61**
- Tank: `z(bulk)−max(z(offense),z(Speed)) ≥ 1` and `z(bulk) ≥ 0.5` → **41**

## Pages

- **Overview** → Summary (refs + analyst notes)
- **Deep dive** → Types · Generations · Legendary · Distributions · Archetypes · Team pool

## Honesty conventions

- Bar value axes include **0**.
- Sibling panels that share a measure use a shared `yDomain` (and shared series `dataKey` where lint requires it).
- Polarity metrics (Attack−Sp. Atk) are **not** siblings of raw means.
- Counts are **not** siblings of means / BST totals without a matching scale.
- Type-1-only traps: primary-slot panels are labeled; both-slot is the default for type identity.

## Starter finals (Gen 1–6)

Last-stage **base forms** of each gen’s Grass / Fire / Water starter line (primary form, primary type slot). Curated by National Dex identity (not type filters alone — e.g. other Grass types are excluded).

| Gen | Grass | Fire | Water |
|-----|-------|------|-------|
| 1 | Venusaur (#3) | Charizard (#6) | Blastoise (#9) |
| 2 | Meganium (#154) | Typhlosion (#157) | Feraligatr (#160) |
| 3 | Sceptile (#254) | Blaziken (#257) | Swampert (#260) |
| 4 | Torterra (#389) | Infernape (#392) | Empoleon (#395) |
| 5 | Serperior (#497) | Emboar (#500) | Samurott (#503) |
| 6 | Chesnaught (#652) | Delphox (#655) | Greninja (#658) |

Charts on **By generation** compare raw six stats (not BST creep across gens).

## Caveats

- Legendary/mythical flag inconsistency in the CSV.
- Mega/alternate formes excluded via `is_primary_form`.
- Both-slot type charts double-count dual-types by design.
- Stats are design constants — descriptive only.
