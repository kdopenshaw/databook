#!/usr/bin/env python3
"""Emit pokemon-book/src/data/rows.json (BookDocument) with mergeUserRows semantics."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

BOOK_ROOT = Path(__file__).resolve().parents[3]
ROWS_PATH = BOOK_ROOT / "src" / "data" / "rows.json"

# Per-species (no double-count): primary form + primary type slot.
SPECIES = [
    {"column": "is_primary_form", "op": "eq", "value": True},
    {"column": "type_slot", "op": "eq", "value": "Primary"},
]
SPECIES_NONLEG = SPECIES + [{"column": "legendary", "op": "eq", "value": False}]
SPECIES_LEG = SPECIES + [{"column": "legendary", "op": "eq", "value": True}]

# Type participation: primary forms, both type slots (dual-types counted twice).
TYPE_ANY = [{"column": "is_primary_form", "op": "eq", "value": True}]
TYPE_ANY_NONLEG = TYPE_ANY + [{"column": "legendary", "op": "eq", "value": False}]
TYPE_PRIMARY_ONLY = SPECIES_NONLEG  # Type-1-equivalent via type_slot=Primary

STAT_DOMAIN = [0, 130]
TOTAL_TYPE_DOMAIN = [0, 560]
TOTAL_GEN_DOMAIN = [0, 500]
STAT_GEN_DOMAIN = [0, 100]
HIST_X = [150, 800]
HIST_Y = [0, 180]
ARCH_BST_DOMAIN = [0, 600]
ARCH_OB_DOMAIN = [0, 140]
ARCH_RATE_DOMAIN = [0, 0.35]


def bar_h(
    chart_id: str,
    title: str,
    *,
    x_key: str,
    data_key: str,
    name: str,
    query: dict,
    subtitle: str | None = None,
    notes: str | None = None,
    y_domain: list | None = None,
    category_width: int = 88,
    height: int = 420,
    color_index: int = 0,
    y_label: str | None = None,
    decimals: int = 1,
    value_format: str | None = None,
) -> dict:
    block = {
        "id": chart_id,
        "title": title,
        "query": query,
        "encoding": {"category": x_key, "value": data_key},
        "recharts": {
            "chart": "BarChart",
            "layout": "vertical",
            "xKey": x_key,
            "series": [{"mark": "Bar", "dataKey": data_key, "name": name, "colorIndex": color_index}],
            "categoryWidth": category_width,
            "height": height,
            "showGrid": True,
            "showTooltip": True,
            "showLegend": False,
            "decimals": decimals,
            "barCategoryGap": "18%",
        },
        "flex": 1,
    }
    if subtitle:
        block["subtitle"] = subtitle
    if notes:
        block["notes"] = notes
    if y_domain is not None:
        block["recharts"]["yDomain"] = y_domain
    if y_label:
        block["recharts"]["yLabel"] = y_label
    if value_format:
        block["recharts"]["valueFormat"] = value_format
    return block


def bar_v(
    chart_id: str,
    title: str,
    *,
    x_key: str,
    series: list[dict],
    query: dict,
    subtitle: str | None = None,
    notes: str | None = None,
    y_domain: list | None = None,
    height: int = 320,
    show_legend: bool = True,
    stacked: bool = False,
    y_label: str | None = None,
    decimals: int = 1,
) -> dict:
    series_out = []
    for i, s in enumerate(series):
        item = {
            "mark": "Bar",
            "dataKey": s["dataKey"],
            "name": s.get("name", s["dataKey"]),
            "colorIndex": s.get("colorIndex", i),
        }
        if stacked:
            item["stackId"] = s.get("stackId", "a")
        series_out.append(item)
    block = {
        "id": chart_id,
        "title": title,
        "query": query,
        "encoding": {"x": x_key, "y": series_out[0]["dataKey"]},
        "recharts": {
            "chart": "BarChart",
            "xKey": x_key,
            "series": series_out,
            "height": height,
            "showGrid": True,
            "showTooltip": True,
            "showLegend": show_legend,
            "decimals": decimals,
            "barCategoryGap": "22%",
        },
        "flex": 1,
    }
    if subtitle:
        block["subtitle"] = subtitle
    if notes:
        block["notes"] = notes
    if y_domain is not None:
        block["recharts"]["yDomain"] = y_domain
    if y_label:
        block["recharts"]["yLabel"] = y_label
    return block


def line_chart(
    chart_id: str,
    title: str,
    *,
    x_key: str,
    series: list[dict],
    query: dict,
    subtitle: str | None = None,
    notes: str | None = None,
    y_domain: list | None = None,
    height: int = 300,
) -> dict:
    series_out = [
        {
            "mark": "Line",
            "dataKey": s["dataKey"],
            "name": s.get("name", s["dataKey"]),
            "type": "monotone",
            "strokeWidth": 2,
            "dot": True,
            "colorIndex": s.get("colorIndex", i),
        }
        for i, s in enumerate(series)
    ]
    block = {
        "id": chart_id,
        "title": title,
        "query": query,
        "encoding": {"x": x_key, "y": series_out[0]["dataKey"]},
        "recharts": {
            "chart": "LineChart",
            "xKey": x_key,
            "series": series_out,
            "height": height,
            "showGrid": True,
            "showTooltip": True,
            "showLegend": True,
            "decimals": 1,
        },
        "flex": 1,
    }
    if subtitle:
        block["subtitle"] = subtitle
    if notes:
        block["notes"] = notes
    if y_domain is not None:
        block["recharts"]["yDomain"] = y_domain
    return block


def scatter(
    chart_id: str,
    title: str,
    *,
    x_key: str,
    y_key: str,
    color_key: str,
    levels: list[dict],
    query: dict,
    subtitle: str | None = None,
    notes: str | None = None,
    x_label: str | None = None,
    y_label: str | None = None,
    tooltip_keys: list[str] | None = None,
    height: int = 420,
) -> dict:
    return {
        "id": chart_id,
        "title": title,
        "subtitle": subtitle,
        "notes": notes,
        "query": query,
        "encoding": {"x": x_key, "y": y_key, "color": color_key},
        "recharts": {
            "chart": "ScatterChart",
            "xKey": x_key,
            "series": [{"mark": "Scatter", "dataKey": y_key, "name": y_label or y_key}],
            "colorBy": {"key": color_key, "levels": levels},
            "tooltipKeys": tooltip_keys or ["name", "type_1", "total"],
            "xLabel": x_label or x_key,
            "yLabel": y_label or y_key,
            "height": height,
            "showGrid": True,
            "showTooltip": True,
            "showLegend": True,
            "decimals": 2,
        },
        "flex": 1,
    }


def hist(chart_id: str, title: str, *, filter_: list, subtitle: str | None = None, notes: str | None = None, color_index: int = 0) -> dict:
    return {
        "id": chart_id,
        "title": title,
        "subtitle": subtitle,
        "notes": notes,
        "query": {
            "label": title,
            "filter": filter_,
            "bin": [{"column": "total", "step": 50, "as": "total_bin", "fillEmpty": True}],
            "aggregate": [{"fn": "count", "as": "n"}],
            "orderBy": [{"column": "total_bin", "direction": "asc"}],
        },
        "encoding": {"x": "total_bin", "y": "n"},
        "recharts": {
            "chart": "BarChart",
            "xKey": "total_bin",
            "xType": "number",
            "xDomain": HIST_X,
            "xShift": 25,
            "yDomain": HIST_Y,
            "series": [{"mark": "Bar", "dataKey": "n", "name": "Forms", "colorIndex": color_index}],
            "xLabel": "Base stat total (bin start)",
            "yLabel": "Count",
            "height": 300,
            "showGrid": True,
            "showTooltip": True,
            "showLegend": False,
            "decimals": 0,
            "barCategoryGap": "8%",
        },
        "flex": 1,
    }


def md(row_id: str, order: float, body: str) -> dict:
    return {"id": row_id, "type": "markdown", "order": order, "createdBy": "skill", "body": body}


def component(row_id: str, order: float, components: list, *, wrap: bool = True, gap: int = 16) -> dict:
    return {
        "id": row_id,
        "type": "component",
        "order": order,
        "createdBy": "skill",
        "layout": {"gap": gap, "align": "stretch", "wrap": wrap},
        "components": components,
    }


def mean_by_type(stat: str, *, filter_: list, as_name: str | None = None) -> dict:
    out = as_name or f"mean_{stat}"
    return {
        "label": f"mean {stat} by type",
        "filter": filter_,
        "groupBy": ["type"],
        "aggregate": [{"fn": "mean", "column": stat, "as": out}, {"fn": "count", "as": "n"}],
        "orderBy": [{"column": out, "direction": "desc"}],
    }


def mean_by_gen(stats: list[str], *, filter_: list) -> dict:
    aggs = [{"fn": "mean", "column": s, "as": f"mean_{s}"} for s in stats]
    aggs.append({"fn": "count", "as": "n"})
    return {
        "label": "mean stats by generation",
        "filter": filter_,
        "groupBy": ["generation_label"],
        "aggregate": aggs,
        "orderBy": [{"column": "generation_label", "direction": "asc"}],
    }


def merge_user_rows(previous: dict | None, next_doc: dict) -> dict:
    if not previous:
        return next_doc
    user_by_tab: dict[str, list] = {}
    for tab in previous.get("tabs", []):
        users = [r for r in tab.get("rows", []) if r.get("createdBy") == "user"]
        if users:
            user_by_tab[tab["id"]] = users
    if not user_by_tab:
        return next_doc
    next_ids = {t["id"] for t in next_doc["tabs"]}
    for tid in user_by_tab:
        if tid not in next_ids:
            raise SystemExit(f'mergeUserRows: tab "{tid}" missing from regenerated book')
    tabs = []
    for tab in next_doc["tabs"]:
        users = user_by_tab.get(tab["id"])
        if not users:
            tabs.append(tab)
            continue
        skill_ids = {r["id"] for r in tab["rows"]}
        collisions = [u for u in users if u["id"] in skill_ids]
        if collisions:
            raise SystemExit(f"mergeUserRows: colliding ids in {tab['id']}")
        rows = sorted(tab["rows"] + users, key=lambda r: r["order"])
        tabs.append({**tab, "rows": rows})
    return {**next_doc, "tabs": tabs}


def build_document() -> dict:
    # ---- Types (primary slot vs both slots) ----
    type_total_primary = bar_h(
        "chart-type-total-primary",
        "Mean BST by type (Type 1 / primary slot)",
        x_key="type",
        data_key="mean_total",
        name="Mean total",
        query=mean_by_type("total", filter_=TYPE_PRIMARY_ONLY),
        subtitle="Primary forms · type_slot=Primary · non-legendary",
        notes="Same as R1 Type-1 cut; Flying stays under-counted.",
        y_domain=TOTAL_TYPE_DOMAIN,
        color_index=2,
        y_label="Mean BST",
    )
    type_total_both = bar_h(
        "chart-type-total-both",
        "Mean BST by type (both slots)",
        x_key="type",
        data_key="mean_total",
        name="Mean total",
        query=mean_by_type("total", filter_=TYPE_ANY_NONLEG),
        subtitle="Primary forms · Primary+Secondary · non-legendary",
        notes="Dual-types contribute to both types; species appear twice if dual.",
        y_domain=TOTAL_TYPE_DOMAIN,
        color_index=0,
        y_label="Mean BST",
    )

    type_attack = bar_h(
        "chart-type-attack",
        "Mean Attack (both slots)",
        x_key="type",
        data_key="mean_attack",
        name="Attack",
        query=mean_by_type("attack", filter_=TYPE_ANY_NONLEG),
        subtitle="Non-legendary primary forms · both type slots",
        y_domain=STAT_DOMAIN,
        color_index=1,
        height=380,
    )
    type_spatk = bar_h(
        "chart-type-spatk",
        "Mean Sp. Atk (both slots)",
        x_key="type",
        data_key="mean_sp_atk",
        name="Sp. Atk",
        query=mean_by_type("sp_atk", filter_=TYPE_ANY_NONLEG),
        subtitle="Non-legendary primary forms · both type slots",
        y_domain=STAT_DOMAIN,
        color_index=3,
        height=380,
    )
    type_phys_lean = bar_h(
        "chart-type-phys-lean",
        "Mean Attack − Sp. Atk (both slots)",
        x_key="type",
        data_key="mean_phys_minus_spec",
        name="Attack − Sp. Atk",
        query=mean_by_type("phys_minus_spec", filter_=TYPE_ANY_NONLEG),
        subtitle="Positive = physical lean · both slots",
        y_domain=[-40, 50],
        color_index=5,
        height=380,
    )
    type_def = bar_h(
        "chart-type-defense",
        "Mean Defense (both slots)",
        x_key="type",
        data_key="mean_defense",
        name="Defense",
        query=mean_by_type("defense", filter_=TYPE_ANY_NONLEG),
        subtitle="Both type slots · non-legendary",
        y_domain=STAT_DOMAIN,
        color_index=2,
        height=380,
    )
    type_spdef = bar_h(
        "chart-type-spdef",
        "Mean Sp. Def (both slots)",
        x_key="type",
        data_key="mean_sp_def",
        name="Sp. Def",
        query=mean_by_type("sp_def", filter_=TYPE_ANY_NONLEG),
        subtitle="Both type slots · non-legendary",
        y_domain=STAT_DOMAIN,
        color_index=4,
        height=380,
    )
    type_speed = bar_h(
        "chart-type-speed",
        "Mean Speed (both slots)",
        x_key="type",
        data_key="mean_speed",
        name="Speed",
        query=mean_by_type("speed", filter_=TYPE_ANY_NONLEG),
        subtitle="Both type slots · non-legendary",
        y_domain=STAT_DOMAIN,
        color_index=5,
        height=380,
    )

    type_n_primary = bar_h(
        "chart-type-n-primary",
        "Species count (primary slot)",
        x_key="type",
        data_key="n",
        name="Species",
        query={
            "label": "n by type primary slot",
            "filter": TYPE_PRIMARY_ONLY,
            "groupBy": ["type"],
            "aggregate": [{"fn": "count", "as": "n"}],
            "orderBy": [{"column": "n", "direction": "desc"}],
        },
        subtitle="One row per species",
        y_domain=[0, 120],
        color_index=2,
        height=380,
        decimals=0,
        y_label="Species",
    )
    type_n_both = bar_h(
        "chart-type-n-both",
        "Participation count (both slots)",
        x_key="type",
        data_key="n",
        name="Participations",
        query={
            "label": "n by type both slots",
            "filter": TYPE_ANY_NONLEG,
            "groupBy": ["type"],
            "aggregate": [{"fn": "count", "as": "n"}],
            "orderBy": [{"column": "n", "direction": "desc"}],
        },
        subtitle="Dual-types counted under both types · Flying rises",
        y_domain=[0, 120],
        color_index=0,
        height=380,
        decimals=0,
        y_label="Participations",
    )

    # ---- Generations (species grain) ----
    gen_total = bar_v(
        "chart-gen-total",
        "Mean base total by generation",
        x_key="generation_label",
        series=[{"dataKey": "mean_total", "name": "Mean total", "colorIndex": 0}],
        query={
            "label": "mean total by gen nonleg",
            "filter": SPECIES_NONLEG,
            "groupBy": ["generation_label"],
            "aggregate": [
                {"fn": "mean", "column": "total", "as": "mean_total"},
                {"fn": "count", "as": "n"},
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
        subtitle="Non-legendary primary forms · primary slot",
        notes="Gen 4 leads; Gen 3 weakest — no steady power creep.",
        y_domain=TOTAL_GEN_DOMAIN,
        show_legend=False,
        y_label="Mean BST",
        height=340,
    )
    gen_counts = bar_v(
        "chart-gen-counts",
        "Species count by generation and status",
        x_key="generation_label",
        series=[
            {"dataKey": "n_nonlegendary", "name": "Non-legendary", "colorIndex": 0, "stackId": "a"},
            {"dataKey": "n_legendary", "name": "Legendary", "colorIndex": 1, "stackId": "a"},
        ],
        query={
            "label": "counts by gen/status",
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [
                {"fn": "count", "column": "total_nonlegendary", "as": "n_nonlegendary"},
                {"fn": "count", "column": "total_legendary", "as": "n_legendary"},
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
        subtitle="Primary forms · primary slot · stacked",
        y_domain=[0, 180],
        stacked=True,
        decimals=0,
        y_label="Species",
        height=340,
    )
    gen_offense = line_chart(
        "chart-gen-offense",
        "Mean offense stats by generation",
        x_key="generation_label",
        series=[
            {"dataKey": "mean_attack", "name": "Attack", "colorIndex": 1},
            {"dataKey": "mean_sp_atk", "name": "Sp. Atk", "colorIndex": 3},
            {"dataKey": "mean_speed", "name": "Speed", "colorIndex": 5},
        ],
        query=mean_by_gen(["attack", "sp_atk", "speed"], filter_=SPECIES_NONLEG),
        subtitle="Non-legendary · primary slot · axis includes 0",
        y_domain=STAT_GEN_DOMAIN,
    )
    gen_bulk = line_chart(
        "chart-gen-bulk",
        "Mean bulk stats by generation",
        x_key="generation_label",
        series=[
            {"dataKey": "mean_hp", "name": "HP", "colorIndex": 0},
            {"dataKey": "mean_defense", "name": "Defense", "colorIndex": 2},
            {"dataKey": "mean_sp_def", "name": "Sp. Def", "colorIndex": 4},
        ],
        query=mean_by_gen(["hp", "defense", "sp_def"], filter_=SPECIES_NONLEG),
        subtitle="Non-legendary · primary slot · axis includes 0",
        y_domain=STAT_GEN_DOMAIN,
    )

    # ---- Legendary ----
    leg_means = bar_v(
        "chart-leg-means",
        "Mean stats: legendary vs non-legendary",
        x_key="status",
        series=[
            {"dataKey": "mean_hp", "name": "HP", "colorIndex": 0},
            {"dataKey": "mean_attack", "name": "Attack", "colorIndex": 1},
            {"dataKey": "mean_defense", "name": "Defense", "colorIndex": 2},
            {"dataKey": "mean_sp_atk", "name": "Sp. Atk", "colorIndex": 3},
            {"dataKey": "mean_sp_def", "name": "Sp. Def", "colorIndex": 4},
            {"dataKey": "mean_speed", "name": "Speed", "colorIndex": 5},
        ],
        query={
            "label": "mean six stats by status",
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [
                {"fn": "mean", "column": "hp", "as": "mean_hp"},
                {"fn": "mean", "column": "attack", "as": "mean_attack"},
                {"fn": "mean", "column": "defense", "as": "mean_defense"},
                {"fn": "mean", "column": "sp_atk", "as": "mean_sp_atk"},
                {"fn": "mean", "column": "sp_def", "as": "mean_sp_def"},
                {"fn": "mean", "column": "speed", "as": "mean_speed"},
                {"fn": "count", "as": "n"},
            ],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
        subtitle="Primary forms · primary slot",
        y_domain=[0, 130],
        height=360,
        y_label="Mean stat",
    )
    leg_total = bar_h(
        "chart-leg-total",
        "Mean base total by status",
        x_key="status",
        data_key="mean_total",
        name="Mean total",
        query={
            "label": "mean total by status",
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [
                {"fn": "mean", "column": "total", "as": "mean_total"},
                {"fn": "count", "as": "n"},
            ],
            "orderBy": [{"column": "mean_total", "direction": "desc"}],
        },
        subtitle="Primary forms · primary slot",
        y_domain=[0, 700],
        category_width=120,
        height=220,
        color_index=1,
    )
    scatter_as = scatter(
        "chart-scatter-atk-speed",
        "Attack vs Speed",
        x_key="attack",
        y_key="speed",
        color_key="status",
        levels=[
            {"value": "Non-legendary", "label": "Non-legendary", "colorIndex": 0},
            {"value": "Legendary", "label": "Legendary", "colorIndex": 1},
        ],
        query={"label": "species scatter", "filter": SPECIES, "orderBy": [{"column": "total", "direction": "desc"}]},
        subtitle="Primary forms · primary slot",
        x_label="Attack",
        y_label="Speed",
        tooltip_keys=["name", "type_1", "total"],
    )

    # ---- Distributions ----
    hist_all = hist("chart-hist-total-all", "Base total distribution", filter_=SPECIES, subtitle="Primary forms · primary slot · bin 50")
    hist_nonleg = hist("chart-hist-total-nonleg", "Non-legendary totals", filter_=SPECIES_NONLEG, subtitle="Shared scale with sibling", color_index=0)
    hist_leg = hist(
        "chart-hist-total-leg",
        "Legendary totals",
        filter_=SPECIES_LEG,
        subtitle="Shared scale with sibling",
        notes="Mass near 580–680.",
        color_index=1,
    )

    # ---- Archetypes ----
    arch_counts = bar_v(
        "chart-arch-counts",
        "Archetype counts (primary forms)",
        x_key="archetype",
        series=[{"dataKey": "n", "name": "Species", "colorIndex": 0}],
        query={
            "label": "archetype counts",
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "count", "as": "n"}],
            "orderBy": [{"column": "n", "direction": "desc"}],
        },
        subtitle="z-score cut: gap≥1.0 and floor≥0.5 vs primary-form pool",
        notes="Glass = high offense vs bulk; Tank = high bulk vs offense/speed.",
        y_domain=[0, 700],
        show_legend=False,
        decimals=0,
        height=300,
    )

    arch_mean_total = bar_h(
        "chart-arch-mean-total",
        "Mean BST by archetype",
        x_key="archetype",
        data_key="mean_total",
        name="Mean total",
        query={
            "label": "mean total by archetype",
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "total", "as": "mean_total"}, {"fn": "count", "as": "n"}],
            "orderBy": [{"column": "mean_total", "direction": "desc"}],
        },
        subtitle="Primary forms · primary slot",
        y_domain=ARCH_BST_DOMAIN,
        category_width=110,
        height=260,
        color_index=2,
    )
    # Same dataKey `mean_stat` so lint enforces a shared yDomain across siblings.
    arch_mean_offense = bar_h(
        "chart-arch-mean-offense",
        "Mean offense by archetype",
        x_key="archetype",
        data_key="mean_stat",
        name="Offense",
        query={
            "label": "mean offense by archetype",
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "offense", "as": "mean_stat"}, {"fn": "count", "as": "n"}],
            "orderBy": [{"column": "mean_stat", "direction": "desc"}],
        },
        subtitle="max(Attack, Sp. Atk) · shared scale with bulk",
        y_domain=ARCH_OB_DOMAIN,
        category_width=110,
        height=260,
        color_index=1,
    )
    arch_mean_bulk = bar_h(
        "chart-arch-mean-bulk",
        "Mean bulk by archetype",
        x_key="archetype",
        data_key="mean_stat",
        name="Bulk",
        query={
            "label": "mean bulk by archetype",
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "bulk", "as": "mean_stat"}, {"fn": "count", "as": "n"}],
            "orderBy": [{"column": "mean_stat", "direction": "desc"}],
        },
        subtitle="mean(HP, Defense, Sp. Def) · shared scale with offense",
        y_domain=ARCH_OB_DOMAIN,
        category_width=110,
        height=260,
        color_index=4,
    )

    # Shared-measure siblings for rates by type (same xKey + dataKey pattern via rate alias)
    arch_glass_rate = bar_h(
        "chart-arch-glass-rate",
        "Glass-cannon share by type",
        x_key="type",
        data_key="rate",
        name="Glass share",
        query={
            "label": "glass rate by type both slots",
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [{"fn": "mean", "column": "is_glass_cannon", "as": "rate"}, {"fn": "count", "as": "n"}],
            "orderBy": [{"column": "rate", "direction": "desc"}],
        },
        subtitle="Both type slots · primary forms · shared rate scale",
        notes="Boolean mean = share. Dual-types contribute under both types.",
        y_domain=ARCH_RATE_DOMAIN,
        color_index=1,
        height=400,
        decimals=2,
        value_format="percent",
        y_label="Share",
    )
    arch_tank_rate = bar_h(
        "chart-arch-tank-rate",
        "Tank share by type",
        x_key="type",
        data_key="rate",
        name="Tank share",
        query={
            "label": "tank rate by type both slots",
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [{"fn": "mean", "column": "is_tank", "as": "rate"}, {"fn": "count", "as": "n"}],
            "orderBy": [{"column": "rate", "direction": "desc"}],
        },
        subtitle="Both type slots · primary forms · shared rate scale",
        y_domain=ARCH_RATE_DOMAIN,
        color_index=4,
        height=400,
        decimals=2,
        value_format="percent",
        y_label="Share",
    )

    arch_scatter = scatter(
        "chart-arch-scatter",
        "z(offense) vs z(bulk)",
        x_key="z_offense",
        y_key="z_bulk",
        color_key="archetype",
        levels=[
            {"value": "Neither", "label": "Neither", "colorIndex": 0},
            {"value": "Glass cannon", "label": "Glass cannon", "colorIndex": 1},
            {"value": "Tank", "label": "Tank", "colorIndex": 4},
        ],
        query={"label": "archetype scatter", "filter": SPECIES},
        subtitle="Primary forms · z fit on primary-form pool",
        notes="Glass cannons sit high-offense / low-bulk; tanks the reverse.",
        x_label="z(offense)",
        y_label="z(bulk)",
        tooltip_keys=["name", "type_1", "glass_score", "tank_score", "total"],
    )

    arch_speed = bar_h(
        "chart-arch-speed",
        "Mean Speed by archetype",
        x_key="archetype",
        data_key="mean_speed",
        name="Speed",
        query={
            "label": "mean speed by archetype",
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "speed", "as": "mean_speed"}, {"fn": "count", "as": "n"}],
            "orderBy": [{"column": "mean_speed", "direction": "desc"}],
        },
        subtitle="Glass cannons tend to be faster",
        y_domain=[0, 120],
        category_width=110,
        height=260,
        color_index=5,
    )

    doc = {
        "title": "Pokémon base stats — Gen 1–6",
        "experimentId": "pokemon-gen1-6-reaudit-r2",
        "description": "Base stats by type (both slots), generation, legendary status, and glass/tank archetypes.",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "defaultTabId": "summary",
        "pages": [
            {"id": "page-overview", "label": "Overview", "order": 0, "tabIds": ["summary"]},
            {
                "id": "page-deep",
                "label": "Deep dive",
                "order": 1,
                "tabIds": ["types", "generations", "legendary", "distributions", "archetypes"],
            },
        ],
        "conventions": {
            "zeroBaselineBars": True,
            "population": (
                "Per-species charts: is_primary_form && type_slot=Primary (721). "
                "Type-participation charts: is_primary_form any slot (dual-types counted twice). "
                "Archetype z-scores fit on primary forms; thresholds gap=1.0, floor=0.5."
            ),
            "palette": {
                "0": "HP / non-legendary / Neither",
                "1": "Attack / legendary / Glass cannon",
                "2": "Defense / primary-slot totals",
                "3": "Sp. Atk",
                "4": "Sp. Def / Tank / bulk",
                "5": "Speed / physical lean",
            },
            "notes": [
                "Bar charts must include 0 on the value axis (omit yDomain or set yDomain[0] <= 0).",
                "Sibling panels that share measures use the same explicit yDomain (and xDomain for histograms).",
                "Canonical grain is form × type slot — always filter type_slot=Primary for per-species charts.",
                "Both-slot type charts use column `type` with is_primary_form; they intentionally double-count dual-types.",
                "Legendary uses the CSV flag as-is (mythicals inconsistently tagged).",
                "Archetypes are descriptive design labels, not battle roles.",
            ],
        },
        "tabs": [
            {
                "id": "summary",
                "label": "Summary",
                "order": 0,
                "rows": [
                    md(
                        "md-summary",
                        0,
                        """## Summary

**Pages:** Overview (this tab) · Deep dive (types, generations, legendary, distributions, archetypes).

1. **Legendary gap** — ~620 vs ~404 mean BST (primary forms).
2. **Types** — both-slot cut restores Flying participation; Bug still weakest on mean BST among non-legendaries.
3. **Generations** — Gen 4 strongest non-legendary mean; Gen 3 weakest.
4. **Archetypes** — glass cannons (high offense vs bulk) vs tanks (high bulk vs offense/speed); z-scores on the primary-form pool.

Caveats and grain: `src/data/understanding.md`.""",
                    ),
                    component(
                        "comp-summary-refs",
                        1,
                        [
                            {"id": "summary-ref-type", "ref": "chart-type-total-both", "title": "Types (both slots)", "flex": 1},
                            {"id": "summary-ref-gen", "ref": "chart-gen-total", "title": "Generations", "flex": 1},
                            {"id": "summary-ref-arch", "ref": "chart-arch-counts", "title": "Archetypes", "flex": 1},
                        ],
                    ),
                ],
            },
            {
                "id": "types",
                "label": "By type",
                "order": 1,
                "rows": [
                    md(
                        "md-types",
                        0,
                        """## By type

**Primary slot** = Type 1 only (no double-count). **Both slots** = dual-types counted under each type (Flying etc. appear). Means below are non-legendary primary forms.""",
                    ),
                    component("comp-type-totals", 1, [type_total_primary, type_total_both]),
                    component("comp-type-counts", 2, [type_n_primary, type_n_both]),
                    md("md-types-offense", 3, """### Offense identity (both slots)

Shared 0–130 value scale."""),
                    component("comp-type-offense", 4, [type_attack, type_spatk, type_phys_lean]),
                    md("md-types-bulk", 5, """### Bulk and Speed (both slots)"""),
                    component("comp-type-bulk", 6, [type_def, type_spdef, type_speed]),
                ],
            },
            {
                "id": "generations",
                "label": "By generation",
                "order": 2,
                "rows": [
                    md(
                        "md-gens",
                        0,
                        """## By generation

Species grain (`type_slot=Primary`). Means exclude legendaries; stacked counts include them.""",
                    ),
                    component("comp-gen-overview", 1, [gen_total, gen_counts]),
                    component("comp-gen-stats", 2, [gen_offense, gen_bulk]),
                ],
            },
            {
                "id": "legendary",
                "label": "Legendary",
                "order": 3,
                "rows": [
                    md(
                        "md-leg",
                        0,
                        """## Legendary status

Species grain. Source flag kept as-is (mythicals inconsistently tagged).""",
                    ),
                    component("comp-leg-gap", 1, [leg_total, leg_means]),
                    component("comp-leg-scatter", 2, [scatter_as]),
                ],
            },
            {
                "id": "distributions",
                "label": "Distributions",
                "order": 4,
                "rows": [
                    md(
                        "md-dist",
                        0,
                        """## Base total distributions

Species grain. Sibling histograms share `xDomain` / `yDomain`.""",
                    ),
                    component("comp-hist-all", 1, [hist_all]),
                    component("comp-hist-split", 2, [hist_nonleg, hist_leg]),
                ],
            },
            {
                "id": "archetypes",
                "label": "Archetypes",
                "order": 5,
                "rows": [
                    md(
                        "md-arch",
                        0,
                        """## Glass cannon vs tank

**Offense** = max(Attack, Sp. Atk). **Bulk** = mean(HP, Defense, Sp. Def). Z-scores fit on **721 primary forms**, then applied to every form.

- **Glass cannon:** `glass_score = z(offense) − z(bulk) ≥ 1` and `z(offense) ≥ 0.5`
- **Tank:** `tank_score = z(bulk) − max(z(offense), z(Speed)) ≥ 1` and `z(bulk) ≥ 0.5`

Thresholds are a judgment call — descriptive labels, not competitive roles. Type shares use **both slots** so dual-types contribute under each type.""",
                    ),
                    component("comp-arch-counts", 1, [arch_counts, arch_speed]),
                    component("comp-arch-bst", 2, [arch_mean_total]),
                    md(
                        "md-arch-means",
                        3,
                        """### Offense vs bulk

Shared 0–140 scale (same measure key across panels).""",
                    ),
                    component("comp-arch-means", 4, [arch_mean_offense, arch_mean_bulk]),
                    md(
                        "md-arch-rates",
                        5,
                        """### Type composition

Share = mean of the boolean flag. Shared 0–35% rate scale · both type slots.""",
                    ),
                    component("comp-arch-rates", 6, [arch_glass_rate, arch_tank_rate]),
                    component("comp-arch-scatter", 7, [arch_scatter]),
                ],
            },
        ],
    }
    return doc


def main() -> None:
    previous = None
    if ROWS_PATH.exists():
        previous = json.loads(ROWS_PATH.read_text(encoding="utf-8"))
    next_doc = build_document()
    merged = merge_user_rows(previous, next_doc)
    ROWS_PATH.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    n_charts = sum(
        len(r["components"]) for t in merged["tabs"] for r in t["rows"] if r["type"] == "component"
    )
    print(f"Wrote {ROWS_PATH} ({len(merged['tabs'])} tabs, {len(merged.get('pages', []))} pages, {n_charts} chart slots)")


if __name__ == "__main__":
    main()
