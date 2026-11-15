#!/usr/bin/env python3
"""Emit src/data/rows.json (the BookDocument) for the Pokémon book (stdlib only).

rows.json is generated: edit this file and re-run it rather than hand-editing
the JSON. Run build_canonical.py first if canonical columns changed.

Usage (from the book root):  python3 src/data/transforms/build_rows.py
"""

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

book = {
    "title": "Pokémon base stats",
    "experimentId": "Gen 1–6 · 721 species",
    "description": "How base stats differ across types, generations, and legendary status.",
    "generatedAt": "2026-11-15T00:00:00.000Z",
    "defaultTabId": "overview",
    "tabs": [],
}
for i, t in enumerate([overview, legendary, types, gens, stats]):
    t["order"] = i
    book["tabs"].append({"id": t["id"], "label": t["label"], "order": i, "rows": t["rows"]})

with open(Path(__file__).resolve().parents[1] / "rows.json", "w", encoding="utf-8") as f:
    json.dump(book, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(sum(len(r.get("components", [])) for t in book["tabs"] for r in t["rows"]), "charts")
