#!/usr/bin/env python3
"""Emit pokemon-book/src/data/rows.json (BookDocument) with mergeUserRows semantics."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

BOOK_ROOT = Path(__file__).resolve().parents[3]
ROWS_PATH = BOOK_ROOT / "src" / "data" / "rows.json"

PRIMARY = [{"column": "is_primary_form", "op": "eq", "value": True}]
PRIMARY_NONLEG = PRIMARY + [{"column": "legendary", "op": "eq", "value": False}]
PRIMARY_LEG = PRIMARY + [{"column": "legendary", "op": "eq", "value": True}]

# Shared scales for small multiples (include 0 for bars; generous headroom from profile).
STAT_DOMAIN = [0, 130]
TOTAL_TYPE_DOMAIN = [0, 560]
TOTAL_GEN_DOMAIN = [0, 500]
STAT_GEN_DOMAIN = [0, 100]
HIST_X = [150, 800]
HIST_Y = [0, 180]


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
    y_domain: list[int] | None = None,
    category_width: int = 88,
    height: int = 420,
    color_index: int = 0,
    x_label: str | None = None,
    y_label: str | None = None,
    decimals: int = 1,
    encoding: dict | None = None,
) -> dict:
    block = {
        "id": chart_id,
        "title": title,
        "query": query,
        "encoding": encoding or {"category": x_key, "value": data_key},
        "recharts": {
            "chart": "BarChart",
            "layout": "vertical",
            "xKey": x_key,
            "series": [
                {
                    "mark": "Bar",
                    "dataKey": data_key,
                    "name": name,
                    "colorIndex": color_index,
                }
            ],
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
    if x_label:
        block["recharts"]["xLabel"] = x_label
    if y_label:
        block["recharts"]["yLabel"] = y_label
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
    y_domain: list[int] | None = None,
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
    y_domain: list[int] | None = None,
    height: int = 300,
    show_legend: bool = True,
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
            "showLegend": show_legend,
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
    query: dict,
    subtitle: str | None = None,
    notes: str | None = None,
) -> dict:
    return {
        "id": chart_id,
        "title": title,
        "subtitle": subtitle,
        "notes": notes,
        "query": query,
        "encoding": {"x": "attack", "y": "speed", "color": "status"},
        "recharts": {
            "chart": "ScatterChart",
            "xKey": "attack",
            "series": [{"mark": "Scatter", "dataKey": "speed", "name": "Speed"}],
            "colorBy": {
                "key": "status",
                "levels": [
                    {"value": "Non-legendary", "label": "Non-legendary", "colorIndex": 0},
                    {"value": "Legendary", "label": "Legendary", "colorIndex": 1},
                ],
            },
            "tooltipKeys": ["name", "type_1", "total"],
            "xLabel": "Attack",
            "yLabel": "Speed",
            "height": 420,
            "showGrid": True,
            "showTooltip": True,
            "showLegend": True,
            "decimals": 0,
        },
        "flex": 1,
    }


def hist(
    chart_id: str,
    title: str,
    *,
    filter_: list,
    subtitle: str | None = None,
    notes: str | None = None,
    color_index: int = 0,
) -> dict:
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
            "series": [
                {
                    "mark": "Bar",
                    "dataKey": "n",
                    "name": "Forms",
                    "colorIndex": color_index,
                }
            ],
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
    return {
        "id": row_id,
        "type": "markdown",
        "order": order,
        "createdBy": "skill",
        "body": body,
    }


def component(row_id: str, order: float, components: list, *, wrap: bool = True, gap: int = 16) -> dict:
    return {
        "id": row_id,
        "type": "component",
        "order": order,
        "createdBy": "skill",
        "layout": {"gap": gap, "align": "stretch", "wrap": wrap},
        "components": components,
    }


def mean_by_type(stat: str, label: str, *, nonleg: bool = False) -> dict:
    return {
        "label": f"mean {label} by type_1",
        "filter": PRIMARY_NONLEG if nonleg else PRIMARY,
        "groupBy": ["type_1"],
        "aggregate": [{"fn": "mean", "column": stat, "as": f"mean_{stat}"}, {"fn": "count", "as": "n"}],
        "orderBy": [{"column": f"mean_{stat}", "direction": "desc"}],
    }


def mean_by_gen(stats: list[tuple[str, str]]) -> dict:
    aggs = [{"fn": "mean", "column": s, "as": f"mean_{s}"} for s, _ in stats]
    aggs.append({"fn": "count", "as": "n"})
    return {
        "label": "mean stats by generation",
        "filter": PRIMARY_NONLEG,
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
    type_total_all = bar_h(
        "chart-type-total-all",
        "Mean base total by Type 1",
        x_key="type_1",
        data_key="mean_total",
        name="Mean total",
        query=mean_by_type("total", "Total"),
        subtitle="Primary forms · all statuses · Type 1 only",
        notes="Flying n is tiny as a primary type; dual-types only count under Type 1.",
        y_domain=TOTAL_TYPE_DOMAIN,
        color_index=2,
        y_label="Mean BST",
    )
    type_total_nonleg = bar_h(
        "chart-type-total-nonleg",
        "Mean base total by Type 1 (non-legendary)",
        x_key="type_1",
        data_key="mean_total",
        name="Mean total",
        query=mean_by_type("total", "Total", nonleg=True),
        subtitle="Primary forms · legendary flag = false",
        notes="Removes legendary inflation (Dragon especially).",
        y_domain=TOTAL_TYPE_DOMAIN,
        color_index=0,
        y_label="Mean BST",
    )

    type_attack = bar_h(
        "chart-type-attack",
        "Mean Attack by Type 1",
        x_key="type_1",
        data_key="mean_attack",
        name="Attack",
        query=mean_by_type("attack", "Attack", nonleg=True),
        subtitle="Non-legendary primary forms",
        y_domain=STAT_DOMAIN,
        color_index=1,
        height=380,
    )
    type_spatk = bar_h(
        "chart-type-spatk",
        "Mean Sp. Atk by Type 1",
        x_key="type_1",
        data_key="mean_sp_atk",
        name="Sp. Atk",
        query=mean_by_type("sp_atk", "Sp. Atk", nonleg=True),
        subtitle="Non-legendary primary forms",
        y_domain=STAT_DOMAIN,
        color_index=3,
        height=380,
    )
    type_phys_lean = bar_h(
        "chart-type-phys-lean",
        "Mean Attack − Sp. Atk by Type 1",
        x_key="type_1",
        data_key="mean_phys_minus_spec",
        name="Attack − Sp. Atk",
        query=mean_by_type("phys_minus_spec", "phys_minus_spec", nonleg=True),
        subtitle="Positive = physical lean · non-legendary primary forms",
        notes="Bar axis still includes 0 so polarity is readable.",
        y_domain=[-40, 50],
        color_index=5,
        height=380,
    )

    type_def = bar_h(
        "chart-type-defense",
        "Mean Defense by Type 1",
        x_key="type_1",
        data_key="mean_defense",
        name="Defense",
        query=mean_by_type("defense", "Defense", nonleg=True),
        subtitle="Non-legendary primary forms",
        y_domain=STAT_DOMAIN,
        color_index=2,
        height=380,
    )
    type_spdef = bar_h(
        "chart-type-spdef",
        "Mean Sp. Def by Type 1",
        x_key="type_1",
        data_key="mean_sp_def",
        name="Sp. Def",
        query=mean_by_type("sp_def", "Sp. Def", nonleg=True),
        subtitle="Non-legendary primary forms",
        y_domain=STAT_DOMAIN,
        color_index=4,
        height=380,
    )
    type_speed = bar_h(
        "chart-type-speed",
        "Mean Speed by Type 1",
        x_key="type_1",
        data_key="mean_speed",
        name="Speed",
        query=mean_by_type("speed", "Speed", nonleg=True),
        subtitle="Non-legendary primary forms",
        y_domain=STAT_DOMAIN,
        color_index=5,
        height=380,
    )

    gen_total = bar_v(
        "chart-gen-total",
        "Mean base total by generation",
        x_key="generation_label",
        series=[{"dataKey": "mean_total", "name": "Mean total", "colorIndex": 0}],
        query={
            "label": "mean total by gen nonleg",
            "filter": PRIMARY_NONLEG,
            "groupBy": ["generation_label"],
            "aggregate": [
                {"fn": "mean", "column": "total", "as": "mean_total"},
                {"fn": "count", "as": "n"},
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
        subtitle="Non-legendary primary forms",
        notes="Gen 4 leads; Gen 3 is weakest — no steady power creep.",
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
            "label": "counts by gen/status via pivot helpers",
            "filter": PRIMARY,
            "groupBy": ["generation_label"],
            "aggregate": [
                {"fn": "count", "column": "total_nonlegendary", "as": "n_nonlegendary"},
                {"fn": "count", "column": "total_legendary", "as": "n_legendary"},
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
        subtitle="Primary forms · stacked counts",
        notes="count on nullable pivot columns counts non-null only.",
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
        query=mean_by_gen([("attack", "Attack"), ("sp_atk", "Sp. Atk"), ("speed", "Speed")]),
        subtitle="Non-legendary primary forms · axis includes 0",
        y_domain=STAT_GEN_DOMAIN,
        height=320,
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
        query=mean_by_gen([("hp", "HP"), ("defense", "Defense"), ("sp_def", "Sp. Def")]),
        subtitle="Non-legendary primary forms · axis includes 0",
        y_domain=STAT_GEN_DOMAIN,
        height=320,
    )

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
            "filter": PRIMARY,
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
        subtitle="Primary forms · clustered means",
        notes="Largest gaps tend to sit in Sp. Atk / Sp. Def; HP gap is smaller.",
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
            "filter": PRIMARY,
            "groupBy": ["status"],
            "aggregate": [
                {"fn": "mean", "column": "total", "as": "mean_total"},
                {"fn": "count", "as": "n"},
            ],
            "orderBy": [{"column": "mean_total", "direction": "desc"}],
        },
        subtitle="Primary forms",
        y_domain=[0, 700],
        category_width=120,
        height=220,
        color_index=1,
    )

    scatter_as = scatter(
        "chart-scatter-atk-speed",
        "Attack vs Speed",
        query={
            "label": "primary forms sample for scatter",
            "filter": PRIMARY,
            "orderBy": [{"column": "total", "direction": "desc"}],
        },
        subtitle="Primary forms · coloured by legendary status",
        notes="Hover shows name, Type 1, and total.",
    )

    hist_all = hist(
        "chart-hist-total-all",
        "Base total distribution",
        filter_=PRIMARY,
        subtitle="Primary forms · bin width 50",
        color_index=0,
    )
    hist_nonleg = hist(
        "chart-hist-total-nonleg",
        "Non-legendary totals",
        filter_=PRIMARY_NONLEG,
        subtitle="Primary forms · shared scale with siblings",
        color_index=0,
    )
    hist_leg = hist(
        "chart-hist-total-leg",
        "Legendary totals",
        filter_=PRIMARY_LEG,
        subtitle="Primary forms · shared scale with siblings",
        notes="Mass near 580–680; almost no legendaries below 580.",
        color_index=1,
    )

    doc = {
        "title": "Pokémon base stats — Gen 1–6",
        "experimentId": "pokemon-gen1-6-reaudit-r1",
        "description": "How base stats differ across Type 1, generation, and legendary status (primary forms).",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "defaultTabId": "summary",
        "conventions": {
            "zeroBaselineBars": True,
            "population": "Default charts filter is_primary_form = true (721 species). Type charts group by type_1 only. Non-legendary panels add legendary = false.",
            "palette": {
                "0": "HP / non-legendary",
                "1": "Attack / legendary",
                "2": "Defense / totals (all statuses)",
                "3": "Sp. Atk",
                "4": "Sp. Def",
                "5": "Speed / physical lean",
            },
            "notes": [
                "Bar charts must include 0 on the value axis (omit yDomain or set yDomain[0] <= 0).",
                "Sibling panels that share measures use the same explicit yDomain (and xDomain for histograms).",
                "Mega/alternate formes are excluded from default populations via is_primary_form.",
                "Legendary uses the CSV flag as-is (mythicals are inconsistently tagged).",
                "Type-1-only analysis under-counts secondary types such as Flying.",
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

Primary forms only (**721** species). Mega and alternate formes are set aside so multi-form species are not overweight.

1. **Legendary gap** — flagged legendaries average ~**620** BST vs ~**404** for everyone else (see Legendary tab).
2. **Types** — among non-legendaries, **Dragon** / **Steel** lead mean Total; **Bug** is lowest. Offense identity splits physical (Fighting, Ground, Rock) vs special (Psychic, Fairy, Electric).
3. **Generations** — **Gen 4** non-legendaries are strongest; **Gen 3** weakest. Counts and means do not show steady power creep.

Details and caveats: `src/data/understanding.md`. Charts below are refs into the analysis tabs.""",
                    ),
                    component(
                        "comp-summary-refs",
                        1,
                        [
                            {
                                "id": "summary-ref-type",
                                "ref": "chart-type-total-nonleg",
                                "title": "Types (non-legendary)",
                                "flex": 1,
                            },
                            {
                                "id": "summary-ref-gen",
                                "ref": "chart-gen-total",
                                "title": "Generations",
                                "flex": 1,
                            },
                            {
                                "id": "summary-ref-leg",
                                "ref": "chart-leg-total",
                                "title": "Legendary gap",
                                "flex": 1,
                            },
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
                        """## By Type 1

Population: **primary forms**. Left panel includes legendaries; right panel is non-legendary only (fairer for type identity). Dual-types appear only under Type 1.""",
                    ),
                    component(
                        "comp-type-totals",
                        1,
                        [type_total_all, type_total_nonleg],
                    ),
                    md(
                        "md-types-offense",
                        2,
                        """### Offense identity

Shared 0–130 scale across the three panels.""",
                    ),
                    component(
                        "comp-type-offense",
                        3,
                        [type_attack, type_spatk, type_phys_lean],
                    ),
                    md(
                        "md-types-bulk",
                        4,
                        """### Bulk and Speed

Same shared scale as the Attack / Sp. Atk panels above.""",
                    ),
                    component(
                        "comp-type-bulk",
                        5,
                        [type_def, type_spdef, type_speed],
                    ),
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

Means use **non-legendary primary forms** so legendary roster size does not dominate. Stacked counts use all primary forms.""",
                    ),
                    component(
                        "comp-gen-overview",
                        1,
                        [gen_total, gen_counts],
                    ),
                    component(
                        "comp-gen-stats",
                        2,
                        [gen_offense, gen_bulk],
                    ),
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

Source `Legendary` flag (mythicals inconsistently tagged — see understanding.md). Population: primary forms.""",
                    ),
                    component(
                        "comp-leg-gap",
                        1,
                        [leg_total, leg_means],
                        wrap=True,
                    ),
                    component(
                        "comp-leg-scatter",
                        2,
                        [scatter_as],
                    ),
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

Bin width **50**. Sibling histograms share `xDomain` and `yDomain` so shapes are comparable.""",
                    ),
                    component(
                        "comp-hist-all",
                        1,
                        [hist_all],
                    ),
                    component(
                        "comp-hist-split",
                        2,
                        [hist_nonleg, hist_leg],
                    ),
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
        len(r["components"])
        for t in merged["tabs"]
        for r in t["rows"]
        if r["type"] == "component"
    )
    print(f"Wrote {ROWS_PATH} ({len(merged['tabs'])} tabs, {n_charts} chart slots)")


if __name__ == "__main__":
    main()
