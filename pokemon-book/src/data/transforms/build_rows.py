#!/usr/bin/env python3
"""Emit src/data/rows.json (the BookDocument) for the Pokémon book (stdlib only).

rows.json is generated: edit this file and re-run it rather than hand-editing
the JSON. The exception is rows with "createdBy": "user": they are read back from
the existing rows.json and kept verbatim (including fractional `order`, which
places them between generated rows). Run build_canonical.py first if canonical
columns changed.

Usage (from the book root):  python3 src/data/transforms/build_rows.py
"""

import copy
import json
from pathlib import Path

BASE = [{"column": "type_slot", "op": "eq", "value": "Primary"}, {"column": "is_primary_form", "op": "eq", "value": True}]
BASE_ANY = [{"column": "is_primary_form", "op": "eq", "value": True}]
NONLEG = {"column": "legendary", "op": "eq", "value": False}
STATS = [("hp", "HP"), ("attack", "Attack"), ("defense", "Defense"), ("sp_atk", "Sp. Atk"), ("sp_def", "Sp. Def"), ("speed", "Speed")]
STAT_AGGS = [{"fn": "mean", "column": k, "as": f"mean_{k}", "label": f"Mean {l}"} for k, l in STATS]
STAT_SERIES = [{"mark": "Bar", "dataKey": f"mean_{k}", "name": l} for k, l in STATS]


def md(id, body):
    return {"id": id, "type": "markdown", "createdBy": "skill", "body": body.strip()}


def comp(id, *blocks):
    return {"id": id, "type": "component", "createdBy": "skill", "layout": {"gap": 0, "align": "stretch", "wrap": False}, "components": list(blocks)}


def chart(id, title, subtitle, query, recharts, encoding, notes=None, flex=1):
    b = {"id": id, "title": title, "subtitle": subtitle, "query": {"label": title, **query}, "encoding": encoding, "recharts": {"showGrid": True, "showTooltip": True, **recharts}, "flex": flex}
    if notes:
        b["notes"] = notes
    return b


def tab(id, label, rows):
    for i, r in enumerate(rows):
        r["order"] = i
    return {"id": id, "label": label, "rows": rows}


overview = tab("overview", "Overview", [
    md("md-question", """
## What separates strong Pokémon from weak ones?

This book compares **base stats** (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed, and their sum, the *base stat total*) across **types**, **generations 1–6**, and **legendary status**.

**Source:** `data/Pokemon.csv`, 800 rows, one per Pokémon *form*. That covers 721 species plus 50 Mega/Primal forms and 29 alternate forms (Rotom appliances, Deoxys formes, and so on).

**Population.** Unless a chart says otherwise, it uses **one row per species (its base form, 721 rows)**. That keeps Charizard's two Megas and Rotom's five appliances from counting multiple times. Megas get their own section under *Stats & Megas*.

**Types count both slots.** A Grass/Poison Pokémon counts toward Grass *and* Poison in type charts. Using only the primary type hides most Flying Pokémon: Flying is the primary type of just 3 species but the secondary type of 87.
"""),
    md("md-headlines", """
### Headline findings

1. **Legendary is a stat tier, not just a label.** Base-form legendaries average **620** total vs **404** for everyone else. *No* base-form legendary is below 580, and only 15 non-legendaries reach it.
2. **The non-legendary distribution has two humps** (around 300–349 and 450–499): unevolved vs fully evolved Pokémon.
3. **Gen 4 is the strongest generation** (non-legendary mean 424, median 453). There is no steady power creep: Gen 3 is the weakest (385).
4. **Dragon tops the type ranking (499), but partly through legendaries.** A quarter of Dragon species are legendary. Among non-legendaries, Steel (450) edges past Dragon (444). Bug is last (366).
5. **Types have a physical/special identity.** Fighting, Ground, and Rock lean on Attack; Psychic, Fairy, and Electric lean on Sp. Atk.
6. **Bulk and speed are traded off.** Defense and Speed are uncorrelated (r = −0.01), the weakest link between any two stats.
7. **Mega Evolution is a flat +100** (49 of 50; Mega Alakazam is +90), spent on offense and never on HP.
"""),
    md("md-analyst-followups", """
### Answers to the analyst's follow-ups

The book now carries the **team-building pool** as a column (`in_team_pool`: non-legendary, total ≥ 500; 134 species). The full charts are in *Types → Speed tiers* and *Types → Does dual typing buy stats?*.

- **Speed ≥ 100 by type.** Electric has the highest share of fast species overall (33%), then Flying (26%) and Psychic (23%). Rock (5%), Fairy (6%), and Steel (7%) are the slowest. **Inside the team pool the picture changes:** Flying and Fire lead with 8 fast species each, and Electric drops to 1 (Jolteon); most fast Electrics sit just under 500. Steel and Fairy have none.
- **Dual typing mostly buys coverage, not stats.** Dual-types average +24 total among non-legendaries, and the gap appears in every generation. But dual-types are simply more common higher up the total scale (39% of species under 300 vs 57% at 500+). Within the same total band the gap shrinks to 2–10 points. **Inside the team pool it is zero** (530 vs 529).
"""),
    comp("comp-total-dist",
        chart("chart-total-hist", "Base stat total distribution", "Species (base forms) per 20-point bin, split by legendary status",
              {"filter": BASE, "bin": [{"column": "total", "step": 20, "as": "total_bin"}],
               "aggregate": [{"fn": "count", "column": "total_nonlegendary", "as": "non_legendary", "label": "Non-legendary species"},
                             {"fn": "count", "column": "total_legendary", "as": "legendary", "label": "Legendary species"}]},
              {"chart": "BarChart", "xKey": "total_bin", "series": [
                  {"mark": "Bar", "dataKey": "non_legendary", "name": "Non-legendary", "stackId": "status"},
                  {"mark": "Bar", "dataKey": "legendary", "name": "Legendary", "stackId": "status"}],
               "xLabel": "Base stat total (bin start)", "yLabel": "Species", "barCategoryGap": 1},
              {"x": "total_bin", "y": "non_legendary", "color": "status", "stack": True},
              "Legendaries start at 580; the non-legendary tail above 580 is mostly pseudo-legendaries and mythicals.", flex=2),
        chart("chart-gen-counts", "Species per generation", "Base forms, stacked by legendary status",
              {"filter": BASE, "groupBy": ["generation"],
               "aggregate": [{"fn": "count", "column": "total_nonlegendary", "as": "non_legendary", "label": "Non-legendary species"},
                             {"fn": "count", "column": "total_legendary", "as": "legendary", "label": "Legendary species"}]},
              {"chart": "BarChart", "xKey": "generation", "series": [
                  {"mark": "Bar", "dataKey": "non_legendary", "name": "Non-legendary", "stackId": "status"},
                  {"mark": "Bar", "dataKey": "legendary", "name": "Legendary", "stackId": "status"}],
               "yLabel": "Species"},
              {"x": "generation", "y": "non_legendary", "color": "status", "stack": True}),
    ),
    md("md-caveats", """
### Caveats

- **The `Legendary` flag is inconsistent for mythicals.** Mew, Celebi, Manaphy, Genesect, Keldeo, and Meloetta are `False`; Jirachi, Darkrai, Victini, Arceus, and Hoopa are `True`. The book keeps the source flag, so a few "non-legendary 600s" are mythicals.
- Stats are fixed game-design values, not samples. Differences are descriptive, and there is no sampling error to test.
- Only generations 1–6 are covered.

Profiling notes, the column contract, and the transform are in `src/data/understanding.md` and `src/data/transforms/`.
"""),
])

legendary = tab("legendary", "Legendary status", [
    md("md-leg-intro", """
## Legendary vs non-legendary

46 of 721 species (6.4%) are flagged legendary. The gap is about **+216 total points**, roughly two standard deviations of the whole population. It is not spread evenly: **special stats get the biggest boost** (Sp. Atk +48, Sp. Def +40), while HP gets the smallest (+27).
"""),
    comp("comp-leg-profile",
        chart("chart-leg-stat-profile", "Mean of each stat by status", "Base forms; bars are the mean of each base stat",
              {"filter": BASE, "groupBy": ["status"], "aggregate": STAT_AGGS},
              {"chart": "BarChart", "xKey": "status", "series": STAT_SERIES, "yLabel": "Mean base stat", "decimals": 1},
              {"x": "status", "y": "mean_hp", "color": "stat"}, flex=1),
        chart("chart-leg-by-type", "Legendary species per type", "Base forms; both type slots count",
              {"filter": BASE_ANY, "groupBy": ["type"], "aggregate": [{"fn": "sum", "column": "legendary", "as": "legendary_species", "label": "Legendary species"}],
               "orderBy": [{"column": "legendary_species", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [{"mark": "Bar", "dataKey": "legendary_species", "name": "Legendary species"}],
               "xLabel": "Legendary species", "categoryWidth": 72, "height": 460},
              {"y": "type", "x": "legendary_species"},
              "Psychic and Dragon dominate; Bug and Poison have none.", flex=1),
    ),
    md("md-leg-boundary", """
### The 580 line

Legendaries have a hard floor: **no base-form legendary is below 580**, and 16 of them sit exactly on it (the legendary birds, beasts, Regis, lake trio, Swords of Justice, and the Tornadus/Thundurus genies). The 15 non-legendaries at 580 or above fall into three groups:

- **Pseudo-legendaries** at exactly 600: Dragonite, Tyranitar, Salamence, Metagross, Garchomp, Hydreigon, and Goodra.
- **Mythicals or legendaries the source does not flag:** Mew, Celebi, Manaphy, Genesect, Meloetta, Keldeo, and Cresselia.
- **Slaking (670)**, the strongest non-legendary. Its ability, Truant, makes it act only every other turn, which is the game's price for those stats.
"""),
    comp("comp-leg-edges",
        chart("chart-top-nonleg", "Strongest non-legendaries", "Base forms, top 16 by base stat total",
              {"filter": BASE + [NONLEG], "orderBy": [{"column": "total", "direction": "desc"}, {"column": "dex", "direction": "asc"}], "limit": 16},
              {"chart": "BarChart", "layout": "vertical", "xKey": "name", "series": [{"mark": "Bar", "dataKey": "total", "name": "Base stat total"}],
               "xLabel": "Base stat total", "categoryWidth": 168, "height": 460},
              {"y": "name", "x": "total"}),
        chart("chart-leg-total-values", "Legendary species by base stat total", "Base forms; each bar is one exact total value",
              {"filter": BASE + [{"column": "legendary", "op": "eq", "value": True}], "groupBy": ["total"], "aggregate": [{"fn": "count", "as": "species", "label": "Legendary species"}]},
              {"chart": "BarChart", "xKey": "total", "series": [{"mark": "Bar", "dataKey": "species", "name": "Legendary species", "colorIndex": 1}],
               "xLabel": "Base stat total", "yLabel": "Species", "height": 460},
              {"x": "total", "y": "species"},
              "Two spikes: 580 (the trios) and 600 (Latias/Latios, Heatran, Landorus, Zygarde, and flagged mythicals such as Jirachi, Darkrai, and Victini). Nothing is below 580."),
    ),
])

types = tab("types", "Types", [
    md("md-types-intro", """
## Types

Each species counts toward **every type it has** (1,071 type memberships across 721 species; 350 are dual-type). The mean total per type is shown twice: for all species, and for **non-legendaries only**. That separates "this type is strong" from "this type has a lot of legendaries".
"""),
    comp("comp-type-total",
        chart("chart-type-total", "Mean base stat total by type", "Base forms, both type slots; sorted by the all-species mean",
              {"filter": BASE_ANY, "groupBy": ["type"],
               "aggregate": [{"fn": "mean", "column": "total", "as": "mean_total", "label": "All species"},
                             {"fn": "mean", "column": "total_nonlegendary", "as": "mean_total_nonleg", "label": "Non-legendary only"}],
               "orderBy": [{"column": "mean_total", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [
                  {"mark": "Bar", "dataKey": "mean_total", "name": "All species"},
                  {"mark": "Bar", "dataKey": "mean_total_nonleg", "name": "Non-legendary only"}],
               "xLabel": "Mean base stat total", "categoryWidth": 72, "height": 560, "decimals": 1},
              {"y": "type", "x": "mean_total", "color": "population"},
              "Dragon drops from 499 to 444 once legendaries are removed; Steel (450) becomes the top non-legendary type. Poison and Bug have no legendaries, so both bars match."),
    ),
    comp("comp-type-membership",
        chart("chart-type-slots", "Species per type, by slot", "Base forms; primary vs secondary type",
              {"filter": BASE_ANY, "groupBy": ["type"],
               "aggregate": [{"fn": "sum", "column": "in_primary_slot", "as": "primary", "label": "As primary type"},
                             {"fn": "sum", "column": "in_secondary_slot", "as": "secondary", "label": "As secondary type"},
                             {"fn": "count", "as": "species", "label": "Species"}],
               "orderBy": [{"column": "species", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [
                  {"mark": "Bar", "dataKey": "primary", "name": "Primary", "stackId": "slot"},
                  {"mark": "Bar", "dataKey": "secondary", "name": "Secondary", "stackId": "slot"}],
               "xLabel": "Species", "categoryWidth": 72, "height": 520},
              {"y": "type", "x": "species", "color": "type_slot", "stack": True},
              "Flying is almost always a secondary type (87 of 90)."),
        chart("chart-type-leg-share", "Legendary share by type", "Base forms, both type slots",
              {"filter": BASE_ANY, "groupBy": ["type"], "aggregate": [{"fn": "mean", "column": "legendary", "as": "legendary_share", "label": "Legendary share"}],
               "orderBy": [{"column": "legendary_share", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [{"mark": "Bar", "dataKey": "legendary_share", "name": "Legendary share", "colorIndex": 1}],
               "xLabel": "Share of species that are legendary", "categoryWidth": 72, "height": 520, "valueFormat": "percent"},
              {"y": "type", "x": "legendary_share"}),
    ),
    md("md-types-identity", """
### Type identity: how the stats are spent

The total says how strong a type is; the split says *how*. **Attack − Sp. Atk** separates physical types (Fighting +36, Ground +31, Rock +30) from special types (Psychic −22, Fairy −16, Electric −14). **Defense vs Speed** separates the walls (Steel 110 Def / 56 Spe, Rock 107 / 48) from the sprinters (Flying 83 Spe, Electric 82).
"""),
    comp("comp-type-identity",
        chart("chart-type-phys-spec", "Physical vs special lean by type", "Mean of Attack − Sp. Atk; base forms, both slots",
              {"filter": BASE_ANY, "groupBy": ["type"], "aggregate": [{"fn": "mean", "column": "phys_minus_spec", "as": "mean_lean", "label": "Mean Attack − Sp. Atk"}],
               "orderBy": [{"column": "mean_lean", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [{"mark": "Bar", "dataKey": "mean_lean", "name": "Attack − Sp. Atk"}],
               "xLabel": "← special · points · physical →", "categoryWidth": 72, "height": 520, "decimals": 1},
              {"y": "type", "x": "mean_lean"}),
        chart("chart-type-def-speed", "Defense vs Speed by type", "Mean stat; base forms, both slots; sorted by Defense",
              {"filter": BASE_ANY, "groupBy": ["type"],
               "aggregate": [{"fn": "mean", "column": "defense", "as": "mean_defense", "label": "Mean Defense"},
                             {"fn": "mean", "column": "speed", "as": "mean_speed", "label": "Mean Speed"}],
               "orderBy": [{"column": "mean_defense", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [
                  {"mark": "Bar", "dataKey": "mean_defense", "name": "Defense", "colorIndex": 2},
                  {"mark": "Bar", "dataKey": "mean_speed", "name": "Speed", "colorIndex": 4}],
               "xLabel": "Mean base stat", "categoryWidth": 72, "height": 520, "decimals": 1},
              {"y": "type", "x": "mean_defense", "color": "stat"}),
    ),
    md("md-speed-tiers", """
### Speed tiers

Speed tiers are **<60, 60–79, 80–99, and 100+**. On the left is each type's mix of all species, sorted by its 100+ share. On the right is the **team-building pool** (non-legendary, total ≥ 500; 134 species), counting only the fast ones.

Electric, Flying, and Psychic are the fast types overall. Rock is the slowest: 78% of Rock species are under 60. Electric's fast species mostly fall *just short* of the pool, though (Raichu 485, Electrode 480, Electabuzz 490, Zebstrika 497) or are legendary (Zapdos, Raikou, Thundurus). Only Jolteon makes it. **In the pool, Flying and Fire supply the most fast options** (Charizard, Aerodactyl, Crobat, Noivern; Rapidash, Infernape, Volcarona).
"""),
    comp("comp-speed-tiers",
        chart("chart-speed-tier-mix", "Speed tier mix by type", "Base forms, both type slots; share of each type's species",
              {"filter": BASE_ANY, "groupBy": ["type"],
               "aggregate": [{"fn": "mean", "column": "speed_lt60", "as": "tier_lt60", "label": "<60"},
                             {"fn": "mean", "column": "speed_60_79", "as": "tier_60_79", "label": "60–79"},
                             {"fn": "mean", "column": "speed_80_99", "as": "tier_80_99", "label": "80–99"},
                             {"fn": "mean", "column": "speed_100plus", "as": "tier_100plus", "label": "100+"}],
               "orderBy": [{"column": "tier_100plus", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [
                  {"mark": "Bar", "dataKey": "tier_lt60", "name": "<60", "stackId": "tier", "colorIndex": 7},
                  {"mark": "Bar", "dataKey": "tier_60_79", "name": "60–79", "stackId": "tier", "colorIndex": 6},
                  {"mark": "Bar", "dataKey": "tier_80_99", "name": "80–99", "stackId": "tier", "colorIndex": 0},
                  {"mark": "Bar", "dataKey": "tier_100plus", "name": "100+", "stackId": "tier", "colorIndex": 1}],
               "xLabel": "Share of the type's species", "categoryWidth": 72, "height": 560, "valueFormat": "percent", "yDomain": [0, 1]},
              {"y": "type", "x": "tier_100plus", "color": "speed_tier", "stack": True},
              "Sorted by the 100+ share. Bars sum to 100% per type.", flex=3),
        chart("chart-pool-fast-by-type", "Fast options in the team pool", "Non-legendary, total ≥ 500, Speed ≥ 100; both type slots",
              {"filter": BASE_ANY + [{"column": "in_team_pool", "op": "eq", "value": True}, {"column": "speed", "op": "gte", "value": 100}],
               "groupBy": ["type"], "aggregate": [{"fn": "count", "as": "species", "label": "Species"}],
               "orderBy": [{"column": "species", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [{"mark": "Bar", "dataKey": "species", "name": "Fast pool species", "colorIndex": 1}],
               "xLabel": "Species", "categoryWidth": 72, "height": 560},
              {"y": "type", "x": "species"},
              "34 of the 134 pool species have Speed ≥ 100. Steel and Fairy have none.", flex=2),
    ),
    md("md-dual-typing", """
### Does dual typing buy stats?

**Mostly no: it buys coverage.** The raw gap is real. Among non-legendaries, dual-types average **417 vs 393** for mono-types, and dual-types are ahead in every generation. But the gap is largely *composition*: the dual-type share rises from 39% of species under 300 to 57% at 500+. Many lines gain a second type as they evolve, so dual-types skew toward evolved, higher-total species.

Compare like with like and the gap mostly disappears. Within each total band it is only 2–10 points, and **inside the team pool it is zero** (530 vs 529). There, dual-types trade a little HP (−8) for Defense (+6) and Speed (+6).

Without evolution-stage data this is a proxy argument. Total band stands in for stage.
"""),
    comp("comp-dual",
        chart("chart-dual-by-gen", "Mono vs dual-type mean total, by generation", "Non-legendary base forms",
              {"filter": BASE + [NONLEG], "groupBy": ["generation"],
               "aggregate": [{"fn": "mean", "column": "total_mono", "as": "mean_mono", "label": "Mono-type"},
                             {"fn": "mean", "column": "total_dual", "as": "mean_dual", "label": "Dual-type"}]},
              {"chart": "BarChart", "xKey": "generation", "series": [
                  {"mark": "Bar", "dataKey": "mean_mono", "name": "Mono-type", "colorIndex": 7},
                  {"mark": "Bar", "dataKey": "mean_dual", "name": "Dual-type", "colorIndex": 0}],
               "yLabel": "Mean base stat total", "yDomain": [300, 460], "decimals": 1},
              {"x": "generation", "y": "mean_dual", "color": "typing"},
              "Y axis starts at 300."),
        chart("chart-dual-by-band", "Mono vs dual-type, within total bands", "Non-legendary base forms; mean total inside each band",
              {"filter": BASE + [NONLEG], "groupBy": ["total_band"],
               "aggregate": [{"fn": "mean", "column": "total_mono", "as": "mean_mono", "label": "Mono-type"},
                             {"fn": "mean", "column": "total_dual", "as": "mean_dual", "label": "Dual-type"}]},
              {"chart": "BarChart", "xKey": "total_band", "series": [
                  {"mark": "Bar", "dataKey": "mean_mono", "name": "Mono-type", "colorIndex": 7},
                  {"mark": "Bar", "dataKey": "mean_dual", "name": "Dual-type", "colorIndex": 0}],
               "yLabel": "Mean base stat total", "decimals": 1},
              {"x": "total_band", "y": "mean_dual", "color": "typing"},
              "Bars nearly match inside every band; 500+ is the team pool."),
        chart("chart-dual-share-by-band", "Dual-type share by total band", "Non-legendary base forms",
              {"filter": BASE + [NONLEG], "groupBy": ["total_band"],
               "aggregate": [{"fn": "mean", "column": "is_dual_type", "as": "dual_share", "label": "Dual-type share"}]},
              {"chart": "BarChart", "xKey": "total_band", "series": [{"mark": "Bar", "dataKey": "dual_share", "name": "Dual-type share", "colorIndex": 0}],
               "yLabel": "Share of species", "valueFormat": "percent", "yDomain": [0, 0.7]},
              {"x": "total_band", "y": "dual_share"},
              "This composition shift drives the raw gap."),
    ),
])

gens = tab("generations", "Generations", [
    md("md-gen-intro", """
## Generations

Is there power creep? **Not a steady one.** Non-legendary strength dips in Gen 3, **jumps in Gen 4** (mean 424, median 453; Gen 4 added many evolutions of older lines, such as Magnezone, Rhyperior, and Togekiss), and settles back around 412 afterwards. Legendaries hover around 605–634 in every generation.
"""),
    comp("comp-gen-total",
        chart("chart-gen-total", "Base stat total by generation", "Base forms; mean (and non-legendary median) per generation; Y axis starts at 300",
              {"filter": BASE, "groupBy": ["generation"],
               "aggregate": [{"fn": "mean", "column": "total_legendary", "as": "mean_leg", "label": "Legendary mean"},
                             {"fn": "mean", "column": "total_nonlegendary", "as": "mean_nonleg", "label": "Non-legendary mean"},
                             {"fn": "median", "column": "total_nonlegendary", "as": "median_nonleg", "label": "Non-legendary median"}]},
              {"chart": "LineChart", "xKey": "generation", "series": [
                  {"mark": "Line", "dataKey": "mean_nonleg", "name": "Non-legendary mean", "dot": True, "type": "linear"},
                  {"mark": "Line", "dataKey": "median_nonleg", "name": "Non-legendary median", "dot": True, "type": "linear", "strokeDasharray": "4 3", "colorIndex": 0},
                  {"mark": "Line", "dataKey": "mean_leg", "name": "Legendary mean", "dot": True, "type": "linear", "colorIndex": 1}],
               "yLabel": "Base stat total", "yDomain": [300, 700], "decimals": 1},
              {"x": "generation", "y": "mean_nonleg", "color": "series"}, flex=2),
        chart("chart-gen-shares", "Legendary and dual-type share", "Base forms, share of species per generation",
              {"filter": BASE, "groupBy": ["generation"],
               "aggregate": [{"fn": "mean", "column": "legendary", "as": "legendary_share", "label": "Legendary share"},
                             {"fn": "mean", "column": "is_dual_type", "as": "dual_share", "label": "Dual-type share"}]},
              {"chart": "BarChart", "xKey": "generation", "series": [
                  {"mark": "Bar", "dataKey": "legendary_share", "name": "Legendary", "colorIndex": 1},
                  {"mark": "Bar", "dataKey": "dual_share", "name": "Dual-type", "colorIndex": 2}],
               "yLabel": "Share of species", "valueFormat": "percent"},
              {"x": "generation", "y": "legendary_share", "color": "metric"},
              "Gen 4 has the most legendaries per species (10%); Gen 6 is the most dual-typed (57%)."),
    ),
    comp("comp-gen-stats",
        chart("chart-gen-stat-lines", "Mean of each stat by generation, non-legendaries", "Base forms, non-legendary only",
              {"filter": BASE + [NONLEG], "groupBy": ["generation"], "aggregate": STAT_AGGS},
              {"chart": "LineChart", "xKey": "generation", "series": [{"mark": "Line", "dataKey": f"mean_{k}", "name": l, "dot": True, "type": "linear"} for k, l in STATS],
               "yLabel": "Mean base stat", "yDomain": [50, 90], "decimals": 1},
              {"x": "generation", "y": "mean_attack", "color": "stat"},
              "Y axis starts at 50 to show the spread; every stat moves within about 20 points. Gen 4's bump is broad (HP, Attack, Defense, and Sp. Def all rise), and Attack keeps climbing into Gen 5."),
    ),
])

stats = tab("stats", "Stats & Megas", [
    md("md-stats-intro", """
## How the six stats relate

Every stat correlates positively with total (r = 0.55 for Speed up to 0.72 for Sp. Atk), but the stats are only loosely tied to each other. The weakest pair is **Defense and Speed (r = −0.01)**: heavily armored Pokémon (Shuckle, Steelix, Aggron) are rarely fast. Attack and Sp. Atk are only moderately linked (r = 0.34), which is why "physical" and "special" attackers are distinct archetypes.
"""),
    comp("comp-scatter",
        chart("chart-def-speed", "Defense vs Speed", "Base forms (721 species)",
              {"filter": BASE},
              {"chart": "ScatterChart", "xKey": "defense", "series": [{"mark": "Scatter", "dataKey": "speed", "name": "Species"}],
               "xLabel": "Defense", "yLabel": "Speed", "tooltipKeys": ["name", "defense", "speed"]},
              {"x": "defense", "y": "speed"}, "r = −0.01. The slow, bulky corner (lower right) and the fast, frail corner (upper left) are both populated."),
        chart("chart-atk-spatk", "Attack vs Sp. Atk", "Base forms (721 species)",
              {"filter": BASE},
              {"chart": "ScatterChart", "xKey": "attack", "series": [{"mark": "Scatter", "dataKey": "sp_atk", "name": "Species", "colorIndex": 4}],
               "xLabel": "Attack", "yLabel": "Sp. Atk", "tooltipKeys": ["name", "attack", "sp_atk"]},
              {"x": "attack", "y": "sp_atk"}, "r = 0.34. Points far from the diagonal are specialists; the diagonal band is mixed attackers."),
    ),
    comp("comp-top-stat",
        chart("chart-top-stat", "Each species' highest stat", "Base forms; count of species whose single highest stat is each one",
              {"filter": BASE, "groupBy": ["top_stat"], "aggregate": [{"fn": "count", "as": "species", "label": "Species"}]},
              {"chart": "BarChart", "xKey": "top_stat", "series": [{"mark": "Bar", "dataKey": "species", "name": "Species"}], "yLabel": "Species"},
              {"x": "top_stat", "y": "species"},
              "Attack is the most common peak stat (192 species); Sp. Def the rarest (65). Ties go to the earlier stat in HP → Speed order."),
    ),
    md("md-mega", """
## Mega Evolution: a flat +100, spent on offense

Mega/Primal forms add **exactly +100** to the base total in 49 of 50 cases (Mega Alakazam is +90). The chart compares the 48 species that have a Mega/Primal against their own Mega/Primal forms. Attack (+29), Sp. Atk (+24), and Defense (+21) absorb most of the boost; **HP never changes**.
"""),
    comp("comp-mega",
        chart("chart-mega-profile", "Base form vs Mega/Primal: mean of each stat", "Species that have a Mega or Primal form",
              {"filter": [{"column": "type_slot", "op": "eq", "value": "Primary"}, {"column": "has_mega_form", "op": "eq", "value": True},
                          {"column": "form_kind", "op": "in", "value": ["Base", "Mega/Primal"]}],
               "groupBy": ["form_kind"], "aggregate": STAT_AGGS},
              {"chart": "BarChart", "xKey": "form_kind", "series": STAT_SERIES, "yLabel": "Mean base stat", "decimals": 1},
              {"x": "form_kind", "y": "mean_attack", "color": "stat"},
              "Means over 48 base forms vs 50 Mega/Primal forms (Charizard and Mewtwo have two Megas each)."),
        chart("chart-mega-top", "Strongest forms overall", "All 800 forms, top 12 by base stat total",
              {"filter": [{"column": "type_slot", "op": "eq", "value": "Primary"}], "orderBy": [{"column": "total", "direction": "desc"}, {"column": "dex", "direction": "asc"}], "limit": 12},
              {"chart": "BarChart", "layout": "vertical", "xKey": "name", "series": [{"mark": "Bar", "dataKey": "total", "name": "Base stat total", "colorIndex": 1}],
               "xLabel": "Base stat total", "categoryWidth": 132, "height": 380},
              {"y": "name", "x": "total"}, "Megas and Primals hold 11 of the top 12 spots; Arceus (720) is the only base form. Ties at 700 are broken by dex number (Black/White Kyurem and Mega Diancie also have 700)."),
    ),
])

ARCH_LEVELS = [
    {"value": "Neither", "colorIndex": 7},
    {"value": "Glass cannon", "colorIndex": 5},
    {"value": "Tank", "colorIndex": 2},
]
STAT_HIST_TICKS = [0, 50, 100, 150, 200, 250]


def stat_hist(key, label, color_index):
    return chart(
        f"chart-hist-{key}", label, "Species per 10-point bin",
        {"filter": BASE, "bin": [{"column": key, "step": 10, "as": f"{key}_bin"}],
         "aggregate": [{"fn": "count", "as": "species", "label": "Species"}]},
        {"chart": "BarChart", "xKey": f"{key}_bin", "xType": "number", "xDomain": [0, 260], "xTicks": STAT_HIST_TICKS,
         "yDomain": [0, 140], "height": 200, "barCategoryGap": 1, "showGrid": True,
         "series": [{"mark": "Bar", "dataKey": "species", "name": "Species", "colorIndex": color_index}],
         "margin": {"top": 8, "right": 12, "bottom": 4, "left": 0}},
        {"x": f"{key}_bin", "y": "species"},
    )


archetypes = tab("archetypes", "Archetypes", [
    md("md-arch-intro", """
## Glass cannons and tanks

Two archetypes, defined on **standardized** stats so offense and bulk are compared on the same scale. Each stat is converted to standard deviations (SD) from the mean of the 721 base forms.

- **Offense** = the better of Attack and Sp. Atk. **Bulk** = the mean of HP, Defense, and Sp. Def.
- **Glass cannon:** offense is at least **1 SD higher than bulk**, and offense is at least 0.5 SD above average (so it really hits hard).
- **Tank:** bulk is at least **1 SD higher than both offense and Speed**, and bulk is at least 0.5 SD above average.

That flags **61 glass cannons (8.5%)** and **41 tanks (5.7%)** among the 721 species; no species is both. The two groups differ in more than offense: glass cannons are also *fast* (mean Speed 85 vs 66 overall), while tanks average 49.
"""),
    comp("comp-arch-scatter",
        chart("chart-arch-scatter", "Offense vs bulk, by archetype", "Base forms (721 species); hover for name",
              {"filter": BASE},
              {"chart": "ScatterChart", "xKey": "offense", "series": [{"mark": "Scatter", "dataKey": "bulk", "name": "Species"}],
               "colorBy": {"key": "archetype", "levels": ARCH_LEVELS}, "showLegend": True, "height": 420,
               "xLabel": "Offense = max(Attack, Sp. Atk)", "yLabel": "Bulk = mean(HP, Def, Sp. Def)",
               "tooltipKeys": ["name", "archetype", "offense", "bulk", "speed"]},
              {"x": "offense", "y": "bulk", "color": "archetype"},
              "Shuckle (bulk 160, offense 10) is the extreme tank at the top left; Deoxys, Aegislash (Blade), and Rampardos are the most extreme glass cannons on the right."),
    ),
    comp("comp-arch-who",
        chart("chart-top-glass", "Most extreme glass cannons", "Base forms, top 15 by glass-cannon score (offense SD − bulk SD)",
              {"filter": BASE + [{"column": "is_glass_cannon", "op": "eq", "value": True}],
               "orderBy": [{"column": "glass_score", "direction": "desc"}], "limit": 15},
              {"chart": "BarChart", "layout": "vertical", "xKey": "name", "series": [
                  {"mark": "Bar", "dataKey": "offense", "name": "Offense", "colorIndex": 5},
                  {"mark": "Bar", "dataKey": "bulk", "name": "Bulk", "colorIndex": 2}],
               "xLabel": "Base stat", "categoryWidth": 168, "height": 520, "decimals": 1},
              {"y": "name", "x": "offense", "color": "measure"},
              "Many are unevolved or middle-stage (Abra, Gastly, Cranidos, Carvanha): the 'glass' part is often just low HP early in a line."),
        chart("chart-top-tank", "Most extreme tanks", "Base forms, top 15 by tank score (bulk SD − max(offense, Speed) SD)",
              {"filter": BASE + [{"column": "is_tank", "op": "eq", "value": True}],
               "orderBy": [{"column": "tank_score", "direction": "desc"}], "limit": 15},
              {"chart": "BarChart", "layout": "vertical", "xKey": "name", "series": [
                  {"mark": "Bar", "dataKey": "bulk", "name": "Bulk", "colorIndex": 2},
                  {"mark": "Bar", "dataKey": "offense", "name": "Offense", "colorIndex": 5},
                  {"mark": "Bar", "dataKey": "speed", "name": "Speed", "colorIndex": 3}],
               "xLabel": "Base stat", "categoryWidth": 168, "height": 520, "decimals": 1},
              {"y": "name", "x": "bulk", "color": "measure"},
              "8 of the 41 tanks are legendary (Registeel, Regirock, Regice, Giratina, and others), compared with 8 of the 61 glass cannons."),
    ),
    md("md-arch-where", """
### Which types and generations produce them

Shares are per type, counting both type slots, so read them against small denominators: the top type for each archetype has only 7–11 such species.

- **Glass cannons come from Ghost (20%), Dark (18%), Fighting (16%), and Psychic (15%).** Fairy has none.
- **Tanks come from Rock (16%) and Steel (15%).** Fire, Poison, Fighting, Electric, and Dragon almost never qualify (one each).
- **Ghost is unusual: it is high on both lists** (7 glass cannons, such as Gastly → Gengar, and 5 tanks, such as Dusclops and Cofagrigus).
- **By generation, Gen 2 is the tank generation** (8 tanks vs 2 glass cannons: Shuckle, Blissey, Steelix, Umbreon, and others). Gens 1 and 3–5 lean glass cannon (9–11%). Gen 6 has few of either (2 each, 2.8%).
"""),
    comp("comp-arch-type",
        chart("chart-glass-by-type", "Glass-cannon share by type", "Base forms, both type slots",
              {"filter": BASE_ANY, "groupBy": ["type"],
               "aggregate": [{"fn": "mean", "column": "is_glass_cannon", "as": "glass_share", "label": "Glass-cannon share"}],
               "orderBy": [{"column": "glass_share", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [{"mark": "Bar", "dataKey": "glass_share", "name": "Glass cannons", "colorIndex": 5}],
               "xLabel": "Share of the type's species", "categoryWidth": 72, "height": 520, "valueFormat": "percent", "decimals": 1},
              {"y": "type", "x": "glass_share"}),
        chart("chart-tank-by-type", "Tank share by type", "Base forms, both type slots",
              {"filter": BASE_ANY, "groupBy": ["type"],
               "aggregate": [{"fn": "mean", "column": "is_tank", "as": "tank_share", "label": "Tank share"}],
               "orderBy": [{"column": "tank_share", "direction": "desc"}]},
              {"chart": "BarChart", "layout": "vertical", "xKey": "type", "series": [{"mark": "Bar", "dataKey": "tank_share", "name": "Tanks", "colorIndex": 2}],
               "xLabel": "Share of the type's species", "categoryWidth": 72, "height": 520, "valueFormat": "percent", "decimals": 1},
              {"y": "type", "x": "tank_share"}),
    ),
    comp("comp-arch-gen",
        chart("chart-arch-by-gen", "Archetype share by generation", "Base forms, share of each generation's species",
              {"filter": BASE, "groupBy": ["generation"],
               "aggregate": [{"fn": "mean", "column": "is_glass_cannon", "as": "glass_share", "label": "Glass-cannon share"},
                             {"fn": "mean", "column": "is_tank", "as": "tank_share", "label": "Tank share"}]},
              {"chart": "BarChart", "xKey": "generation", "series": [
                  {"mark": "Bar", "dataKey": "glass_share", "name": "Glass cannons", "colorIndex": 5},
                  {"mark": "Bar", "dataKey": "tank_share", "name": "Tanks", "colorIndex": 2}],
               "yLabel": "Share of species", "valueFormat": "percent", "decimals": 1},
              {"x": "generation", "y": "glass_share", "color": "archetype"}, flex=2),
        chart("chart-arch-mega", "Archetype of Mega/Primal forms", "50 Mega/Primal forms, scored on the base-form scale",
              {"filter": [{"column": "type_slot", "op": "eq", "value": "Primary"}, {"column": "form_kind", "op": "eq", "value": "Mega/Primal"}],
               "groupBy": ["archetype"], "aggregate": [{"fn": "count", "as": "forms", "label": "Forms"}]},
              {"chart": "BarChart", "xKey": "archetype", "series": [{"mark": "Bar", "dataKey": "forms", "name": "Mega/Primal forms", "colorIndex": 1}],
               "yLabel": "Forms"},
              {"x": "archetype", "y": "forms"},
              "28 of 50 Megas are glass cannons: Mega Evolution adds offense and never HP.", flex=1),
    ),
    md("md-stat-spreads", """
### Distribution of each stat (small multiples)

Six histograms of the 721 base forms, with the **same X axis (0–260) and Y axis (0–140 species)** so the shapes compare directly. All six have a similar spread (SD 26–29), but the shapes differ:

- **HP is the most right-skewed** (skew 1.7). Most species sit at 50–80, with a long tail out to Blissey (255).
- **Defense and Sp. Def are next** (skew about 1.0–1.1), with tails to Shuckle's 230.
- **Attack and Speed are the most symmetric** (skew about 0.3), and the two attacking stats top out lowest (Attack 165, Sp. Atk 154). Offense varies a lot but has no freak outliers; bulk is where the extremes live.

*Layout note:* the scaffold has no multi-panel chart block (one chart block = one query = one Recharts chart). This grid is **two component rows of three chart blocks each**, which is the scaffold's small-multiples primitive.
"""),
    comp("comp-hist-1", stat_hist("hp", "HP", 0), stat_hist("attack", "Attack", 1), stat_hist("defense", "Defense", 2)),
    comp("comp-hist-2", stat_hist("sp_atk", "Sp. Atk", 3), stat_hist("sp_def", "Sp. Def", 4), stat_hist("speed", "Speed", 5)),
])

DEEP_DIVE = [overview, legendary, types, gens, stats, archetypes]
_blocks = {b["id"]: b for t in DEEP_DIVE for r in t["rows"] for b in r.get("components", [])}


def reuse(block_id, **overrides):
    """Same chart (identical inlined query) under a new id, for the Summary tab."""
    b = copy.deepcopy(_blocks[block_id])
    recharts = {**b["recharts"], **overrides.pop("recharts", {})}
    return {**b, "id": f"{block_id}-summary", "recharts": recharts, **overrides}


summary = tab("summary", "Summary", [
    md("md-summary", """
## Pokémon base stats: summary

What separates strong Pokémon from weak ones, across 721 species from generations 1–6? Each chart uses one row per species (the base form). The other tabs are the **deep dive**.

1. **Legendary is a stat tier.** Legendaries average **620** total vs **404**, and none is below 580.
2. **Types differ in strength and style.** Dragon ranks highest (499) partly because a quarter of Dragons are legendary; Steel leads among non-legendaries (450), and Bug is last (366). Fighting, Ground, and Rock hit physically; Psychic, Fairy, and Electric hit specially.
3. **There is no steady power creep.** Gen 4 is the strongest generation and Gen 3 the weakest.
4. **Stats come in archetypes.** 61 glass cannons (high offense, low bulk, and usually fast) and 41 tanks (bulky, slow). Glass cannons cluster in Ghost, Dark, Fighting, and Psychic; tanks in Rock and Steel.
5. **For team-building** (non-legendary, total ≥ 500; 134 species), Flying and Fire supply the most fast (≥100 Speed) options. **Dual typing buys coverage, not stats:** inside that pool, dual- and mono-types have the same average total.
"""),
    comp("comp-summary-1",
        reuse("chart-total-hist", flex=3),
        reuse("chart-gen-total", flex=2, notes="Non-legendary strength peaks in Gen 4; legendaries stay around 605–634."),
    ),
    comp("comp-summary-2",
        reuse("chart-type-total", recharts={"height": 480}, notes="Removing legendaries drops Dragon from 499 to 444; Steel leads non-legendaries."),
        reuse("chart-arch-scatter", recharts={"height": 480}),
    ),
    md("md-summary-next", """
**Caveats.** Stats ignore abilities and movepools (Slaking's 670 comes with Truant). The source's legendary flag is inconsistent for mythicals.

**Deep dive:** *Overview* · *Legendary status* · *Types* (incl. speed tiers and dual typing) · *Generations* · *Stats & Megas* · *Archetypes*.
"""),
])


def user_rows_by_tab():
    """Rows a person added to rows.json (createdBy: user) survive regeneration, order included."""
    path = Path(__file__).resolve().parents[1] / "rows.json"
    if not path.exists():
        return {}
    kept = {}
    for t in json.loads(path.read_text(encoding="utf-8"))["tabs"]:
        rows = [r for r in t["rows"] if r.get("createdBy") == "user"]
        if rows:
            kept[t["id"]] = rows
    return kept


book = {
    "title": "Pokémon base stats",
    "experimentId": "Gen 1–6 · 721 species",
    "description": "How base stats differ across types, generations, and legendary status.",
    "generatedAt": "2026-11-15T00:00:00.000Z",
    "defaultTabId": "summary",
    "tabs": [],
}
kept = user_rows_by_tab()
for i, t in enumerate([summary, *DEEP_DIVE]):
    rows = t["rows"] + kept.pop(t["id"], [])
    book["tabs"].append({"id": t["id"], "label": t["label"], "order": i, "rows": rows})
if kept:
    raise SystemExit(f"user rows belong to tabs that no longer exist: {sorted(kept)}; move them before regenerating")

with open(Path(__file__).resolve().parents[1] / "rows.json", "w", encoding="utf-8") as f:
    json.dump(book, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(sum(len(r.get("components", [])) for t in book["tabs"] for r in t["rows"]), "charts")
