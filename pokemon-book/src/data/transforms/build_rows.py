#!/usr/bin/env python3
"""Emit pokemon-book/src/data/rows.json (BookDocument) with mergeUserRows semantics."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BOOK_ROOT = Path(__file__).resolve().parents[3]
ROWS_PATH = BOOK_ROOT / "src" / "data" / "rows.json"
# Allow importing sibling merge semantics via a tiny inline port (Python).
# Runtime merge lives in mergeUserRows.ts — mirror: preserve createdBy:user rows.

# Canonical row kinds — default charts exclude long-form stat slices.
TYPE_SLOT_ROWS = [{"column": "record_kind", "op": "eq", "value": "type_slot"}]

# Per-species (no double-count): primary form + primary type slot.
SPECIES = [
    {"column": "is_primary_form", "op": "eq", "value": True},
    {"column": "type_slot", "op": "eq", "value": "Primary"},
    *TYPE_SLOT_ROWS,
]
SPECIES_NONLEG = SPECIES + [{"column": "legendary", "op": "eq", "value": False}]
SPECIES_LEG = SPECIES + [{"column": "legendary", "op": "eq", "value": True}]

# Type participation: primary forms, both type slots (dual-types counted twice).
TYPE_ANY = [{"column": "is_primary_form", "op": "eq", "value": True}, *TYPE_SLOT_ROWS]
TYPE_ANY_NONLEG = TYPE_ANY + [{"column": "legendary", "op": "eq", "value": False}]

# Team-building pool: primary form + primary slot + in_team_pool (implies non-leg, BST≥500).
TEAM_POOL = SPECIES + [{"column": "in_team_pool", "op": "eq", "value": True}]

STAT_DOMAIN = [0, 130]
TOTAL_TYPE_DOMAIN = [0, 560]
TOTAL_GEN_DOMAIN = [0, 500]
STAT_GEN_DOMAIN = [0, 100]
HIST_X_TOTAL = [150, 800]
HIST_Y_TOTAL = [0, 180]
HIST_X_STAT = [0, 260]
HIST_Y_STAT = [0, 220]
COUNT_TYPE_DOMAIN = [0, 130]
COUNT_GEN_DOMAIN = [0, 180]
SHARE_DOMAIN = [0, 0.35]
LEG_MEAN_DOMAIN = [0, 160]
LEG_BST_DOMAIN = [0, 700]
ARCH_COUNT_DOMAIN = [0, 700]
ARCH_BST_DOMAIN = [0, 600]
ARCH_STAT_DOMAIN = [0, 140]
ARCH_SHARE_DOMAIN = [0, 0.25]
ARCH_LEAN_COUNT = [0, 400]
SLOT_COUNT_DOMAIN = [0, 130]
POOL_SHARE_DOMAIN = [0, 0.4]
POOL_COUNT_DOMAIN = [0, 50]
POOL_BST_DOMAIN = [0, 700]
POOL_IN_SHARE = [0, 0.5]

# Grass · Fire · Water final evolutions per generation (primary-form names in CSV).
STARTER_FINALS_BY_GEN: dict[int, tuple[str, str, str]] = {
    1: ("Venusaur", "Charizard", "Blastoise"),
    2: ("Meganium", "Typhlosion", "Feraligatr"),
    3: ("Sceptile", "Blaziken", "Swampert"),
    4: ("Torterra", "Infernape", "Empoleon"),
    5: ("Serperior", "Emboar", "Samurott"),
    6: ("Chesnaught", "Delphox", "Greninja"),
}


def merge_user_rows(previous: dict | None, nxt: dict) -> dict:
    """Python mirror of src/data/mergeUserRows.ts (keep createdBy:user rows)."""
    if not previous:
        return nxt
    prev_tabs = {t["id"]: t for t in previous.get("tabs", [])}
    out_tabs = []
    for tab in nxt["tabs"]:
        prev = prev_tabs.get(tab["id"])
        if not prev:
            out_tabs.append(tab)
            continue
        user_rows = [r for r in prev.get("rows", []) if r.get("createdBy") == "user"]
        if not user_rows:
            out_tabs.append(tab)
            continue
        skill_ids = {r["id"] for r in tab.get("rows", [])}
        collisions = [r for r in user_rows if r["id"] in skill_ids]
        if collisions:
            raise SystemExit(
                f"mergeUserRows: user row id(s) collide with skill rows in tab "
                f"\"{tab['id']}\": {', '.join(c['id'] for c in collisions)}"
            )
        merged_rows = sorted(
            list(tab.get("rows", [])) + user_rows,
            key=lambda r: (r.get("order", 0), r["id"]),
        )
        out_tabs.append({**tab, "rows": merged_rows})
    # Fail closed if a previous tab with user rows disappeared.
    next_ids = {t["id"] for t in nxt["tabs"]}
    for tid, tab in prev_tabs.items():
        if any(r.get("createdBy") == "user" for r in tab.get("rows", [])) and tid not in next_ids:
            raise SystemExit(
                f'mergeUserRows: tab "{tid}" had createdBy:user rows but is missing '
                "from the regenerated book."
            )
    return {**nxt, "tabs": out_tabs}


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
    scale_group: str | None = None,
    category_width: int = 88,
    height: int = 420,
    color_index: int = 0,
    y_label: str | None = None,
    decimals: int = 1,
    value_format: str | None = None,
) -> dict:
    block: dict = {
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
    if scale_group:
        block["scaleGroup"] = scale_group
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
    scale_group: str | None = None,
    height: int = 320,
    show_legend: bool = True,
    y_label: str | None = None,
    decimals: int = 1,
    value_format: str | None = None,
) -> dict:
    series_out = []
    for i, s in enumerate(series):
        series_out.append(
            {
                "mark": "Bar",
                "dataKey": s["dataKey"],
                "name": s.get("name", s["dataKey"]),
                "colorIndex": s.get("colorIndex", i),
            }
        )
    block: dict = {
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
    if value_format:
        block["recharts"]["valueFormat"] = value_format
    if scale_group:
        block["scaleGroup"] = scale_group
    return block


def hist_bar(
    chart_id: str,
    title: str,
    *,
    column: str,
    step: int,
    subtitle: str | None = None,
    notes: str | None = None,
    x_domain: list | None = None,
    y_domain: list | None = None,
    scale_group: str | None = None,
    x_shift: float | None = None,
    color_index: int = 0,
    height: int = 280,
    filters: list | None = None,
) -> dict:
    bin_as = f"{column}_bin"
    query: dict = {
        "filter": filters or SPECIES,
        "bin": [{"column": column, "step": step, "as": bin_as}],
        "aggregate": [{"fn": "count", "as": "n", "label": "Species"}],
        "orderBy": [{"column": bin_as, "direction": "asc"}],
    }
    block: dict = {
        "id": chart_id,
        "title": title,
        "query": query,
        "encoding": {"x": bin_as, "y": "n"},
        "recharts": {
            "chart": "BarChart",
            "xKey": bin_as,
            "xType": "number",
            "series": [{"mark": "Bar", "dataKey": "n", "name": "Species", "colorIndex": color_index}],
            "height": height,
            "showGrid": True,
            "showTooltip": True,
            "showLegend": False,
            "decimals": 0,
            "barCategoryGap": "8%",
            "xLabel": column.replace("_", " ").title() if column != "total" else "BST",
            "yLabel": "Species",
        },
        "flex": 1,
    }
    if subtitle:
        block["subtitle"] = subtitle
    if notes:
        block["notes"] = notes
    if x_domain is not None:
        block["recharts"]["xDomain"] = x_domain
    if y_domain is not None:
        block["recharts"]["yDomain"] = y_domain
    if x_shift is not None:
        block["recharts"]["xShift"] = x_shift
    if scale_group:
        block["scaleGroup"] = scale_group
    return block


def scatter(
    chart_id: str,
    title: str,
    *,
    x_key: str,
    y_key: str,
    query: dict,
    subtitle: str | None = None,
    notes: str | None = None,
    color_by: dict | None = None,
    height: int = 360,
    x_domain: list | None = None,
    y_domain: list | None = None,
    tooltip_keys: list | None = None,
) -> dict:
    block: dict = {
        "id": chart_id,
        "title": title,
        "query": query,
        "encoding": {"x": x_key, "y": y_key},
        "recharts": {
            "chart": "ScatterChart",
            "xKey": x_key,
            "series": [{"mark": "Scatter", "dataKey": y_key, "name": y_key}],
            "height": height,
            "showGrid": True,
            "showTooltip": True,
            "showLegend": bool(color_by),
            "decimals": 0,
        },
        "flex": 1,
    }
    if subtitle:
        block["subtitle"] = subtitle
    if notes:
        block["notes"] = notes
    if color_by:
        block["recharts"]["colorBy"] = color_by
    if x_domain is not None:
        block["recharts"]["xDomain"] = x_domain
    if y_domain is not None:
        block["recharts"]["yDomain"] = y_domain
    if tooltip_keys:
        block["recharts"]["tooltipKeys"] = tooltip_keys
    return block


def md(row_id: str, order: float, body: str) -> dict:
    return {
        "id": row_id,
        "type": "markdown",
        "order": order,
        "createdBy": "skill",
        "body": body,
    }


def comp(row_id: str, order: float, components: list, *, wrap: bool = True) -> dict:
    return {
        "id": row_id,
        "type": "component",
        "order": order,
        "createdBy": "skill",
        "layout": {"gap": 16, "align": "stretch", "wrap": wrap},
        "components": components,
    }


def starter_final_stat_bars(
    chart_id: str,
    species_name: str,
    *,
    color_index: int,
) -> dict:
    return bar_h(
        chart_id,
        species_name,
        x_key="stat_label",
        data_key="stat_value",
        name="Base stat",
        subtitle="Primary form · record_kind=base_stat · shared scaleGroup starter-final-stats",
        notes="Six base stats on a 0–130 axis — siblings share yDomain across all starter finals.",
        y_domain=STAT_DOMAIN,
        scale_group="starter-final-stats",
        category_width=72,
        height=360,
        color_index=color_index,
        decimals=0,
        y_label="Base stat",
        query={
            "filter": [
                {"column": "record_kind", "op": "eq", "value": "base_stat"},
                {"column": "name", "op": "eq", "value": species_name},
            ],
            "orderBy": [{"column": "stat_rank", "direction": "asc"}],
        },
    )


def ref_block(chart_id: str, ref: str, title: str | None = None, subtitle: str | None = None) -> dict:
    block: dict = {"id": chart_id, "ref": ref, "flex": 1}
    if title:
        block["title"] = title
    if subtitle:
        block["subtitle"] = subtitle
    return block


def build_book() -> dict:
    # ---- Types (both-slot) ----
    type_count = bar_h(
        "chart-type-count",
        "Species participation by type",
        x_key="type",
        data_key="n",
        name="Participations",
        subtitle="Primary forms · both type slots · dual-types counted twice",
        notes="Both-slot participation. Filter is_primary_form only (any type_slot).",
        y_domain=COUNT_TYPE_DOMAIN,
        color_index=0,
        decimals=0,
        y_label="Participations",
        query={
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [{"fn": "count", "as": "n", "label": "Participations"}],
            "orderBy": [{"column": "n", "direction": "desc"}],
        },
    )
    type_bst = bar_h(
        "chart-type-bst",
        "Mean BST by type",
        x_key="type",
        data_key="mean_bst",
        name="Mean BST",
        subtitle="Primary forms · both type slots",
        y_domain=TOTAL_TYPE_DOMAIN,
        color_index=2,
        y_label="Mean BST",
        query={
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [{"fn": "mean", "column": "total", "as": "mean_bst", "label": "Mean BST"}],
            "orderBy": [{"column": "mean_bst", "direction": "desc"}],
        },
    )
    type_leg_share = bar_h(
        "chart-type-leg-share",
        "Legendary share by type",
        x_key="type",
        data_key="leg_share",
        name="Legendary share",
        subtitle="share(legendary) · primary forms · both slots",
        notes="Uses aggregate fn share with where legendary=true.",
        y_domain=SHARE_DOMAIN,
        color_index=1,
        value_format="percent",
        decimals=1,
        y_label="Share",
        query={
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [
                {
                    "fn": "share",
                    "as": "leg_share",
                    "label": "Legendary share",
                    "where": {"column": "legendary", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "leg_share", "direction": "desc"}],
        },
    )
    type_dual_share = bar_h(
        "chart-type-dual-share",
        "Dual-type share by type",
        x_key="type",
        data_key="dual_share",
        name="Dual-type share",
        subtitle="share(is_dual_type) · primary forms · both slots",
        y_domain=[0, 1],
        scale_group="type-rate",
        color_index=5,
        value_format="percent",
        decimals=0,
        y_label="Share",
        query={
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [
                {
                    "fn": "share",
                    "column": "is_dual_type",
                    "as": "dual_share",
                    "label": "Dual-type share",
                }
            ],
            "orderBy": [{"column": "dual_share", "direction": "desc"}],
        },
    )
    # Sibling means with scaleGroup (distinct dataKeys — tip feature).
    type_atk = bar_h(
        "chart-type-atk",
        "Mean Attack by type",
        x_key="type",
        data_key="mean_atk",
        name="Mean Attack",
        subtitle="Both slots · shared scale with Sp. Atk",
        y_domain=STAT_DOMAIN,
        scale_group="type-offense",
        color_index=1,
        height=380,
        query={
            "filter": TYPE_ANY_NONLEG,
            "groupBy": ["type"],
            "aggregate": [{"fn": "mean", "column": "attack", "as": "mean_atk", "label": "Mean Attack"}],
            "orderBy": [{"column": "type", "direction": "asc"}],
        },
    )
    type_spatk = bar_h(
        "chart-type-spatk",
        "Mean Sp. Atk by type",
        x_key="type",
        data_key="mean_spatk",
        name="Mean Sp. Atk",
        subtitle="Both slots · shared scale with Attack",
        y_domain=STAT_DOMAIN,
        scale_group="type-offense",
        color_index=3,
        height=380,
        query={
            "filter": TYPE_ANY_NONLEG,
            "groupBy": ["type"],
            "aggregate": [{"fn": "mean", "column": "sp_atk", "as": "mean_spatk", "label": "Mean Sp. Atk"}],
            "orderBy": [{"column": "type", "direction": "asc"}],
        },
    )
    type_def = bar_h(
        "chart-type-def",
        "Mean Defense by type",
        x_key="type",
        data_key="mean_def",
        name="Mean Defense",
        subtitle="Both slots · shared bulk scale",
        y_domain=STAT_DOMAIN,
        scale_group="type-bulk",
        color_index=2,
        height=380,
        query={
            "filter": TYPE_ANY_NONLEG,
            "groupBy": ["type"],
            "aggregate": [{"fn": "mean", "column": "defense", "as": "mean_def", "label": "Mean Defense"}],
            "orderBy": [{"column": "type", "direction": "asc"}],
        },
    )
    type_spdef = bar_h(
        "chart-type-spdef",
        "Mean Sp. Def by type",
        x_key="type",
        data_key="mean_spdef",
        name="Mean Sp. Def",
        subtitle="Both slots · shared bulk scale",
        y_domain=STAT_DOMAIN,
        scale_group="type-bulk",
        color_index=4,
        height=380,
        query={
            "filter": TYPE_ANY_NONLEG,
            "groupBy": ["type"],
            "aggregate": [{"fn": "mean", "column": "sp_def", "as": "mean_spdef", "label": "Mean Sp. Def"}],
            "orderBy": [{"column": "type", "direction": "asc"}],
        },
    )
    type1_count = bar_h(
        "chart-type1-count",
        "Species count by Type 1",
        x_key="type",
        data_key="n",
        name="Species",
        subtitle="Primary forms · Type 1 only (type_slot=Primary) · undercounts Type-2-only roles",
        notes="Type-1-only cut — Flying and other common secondaries look thinner than both-slot.",
        y_domain=COUNT_TYPE_DOMAIN,
        color_index=0,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["type"],
            "aggregate": [{"fn": "count", "as": "n", "label": "Species"}],
            "orderBy": [{"column": "n", "direction": "desc"}],
        },
    )
    # Both-slot slot split: Primary vs Secondary participation via count_if.
    type_slot_primary = bar_h(
        "chart-type-slot-primary",
        "Primary-slot participations by type",
        x_key="type",
        data_key="n_primary_slot",
        name="Primary slot",
        subtitle="count_if(type_slot=Primary) · both-slot groups · scaleGroup type-slots",
        notes="Within both-slot type groups, how many rows are Type 1.",
        y_domain=SLOT_COUNT_DOMAIN,
        scale_group="type-slots",
        color_index=0,
        decimals=0,
        height=380,
        query={
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [
                {
                    "fn": "count_if",
                    "as": "n_primary_slot",
                    "label": "Primary slot",
                    "where": {"column": "type_slot", "op": "eq", "value": "Primary"},
                }
            ],
            "orderBy": [{"column": "type", "direction": "asc"}],
        },
    )
    type_slot_secondary = bar_h(
        "chart-type-slot-secondary",
        "Secondary-slot participations by type",
        x_key="type",
        data_key="n_secondary_slot",
        name="Secondary slot",
        subtitle="count_if(type_slot=Secondary) · both-slot groups · scaleGroup type-slots",
        notes="Type 2 appearances — Flying/Poison often dominate here vs Type-1-only charts.",
        y_domain=SLOT_COUNT_DOMAIN,
        scale_group="type-slots",
        color_index=5,
        decimals=0,
        height=380,
        query={
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [
                {
                    "fn": "count_if",
                    "as": "n_secondary_slot",
                    "label": "Secondary slot",
                    "where": {"column": "type_slot", "op": "eq", "value": "Secondary"},
                }
            ],
            "orderBy": [{"column": "type", "direction": "asc"}],
        },
    )
    type_speed = bar_h(
        "chart-type-speed",
        "Mean Speed by type",
        x_key="type",
        data_key="mean_speed",
        name="Mean Speed",
        subtitle="Both slots · non-legendary · pairs with bulk/offense families separately",
        y_domain=STAT_DOMAIN,
        color_index=5,
        height=380,
        query={
            "filter": TYPE_ANY_NONLEG,
            "groupBy": ["type"],
            "aggregate": [{"fn": "mean", "column": "speed", "as": "mean_speed", "label": "Mean Speed"}],
            "orderBy": [{"column": "type", "direction": "asc"}],
        },
    )
    type_glass_share = bar_h(
        "chart-type-glass-share",
        "Glass-cannon share by type",
        x_key="type",
        data_key="glass_share",
        name="Glass share",
        subtitle="share(is_glass_cannon) · primary forms · both slots",
        y_domain=ARCH_SHARE_DOMAIN,
        scale_group="type-arch-rate",
        color_index=1,
        value_format="percent",
        decimals=1,
        height=380,
        query={
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [
                {
                    "fn": "share",
                    "as": "glass_share",
                    "label": "Glass share",
                    "where": {"column": "is_glass_cannon", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "glass_share", "direction": "desc"}],
        },
    )
    type_tank_share = bar_h(
        "chart-type-tank-share",
        "Tank share by type",
        x_key="type",
        data_key="tank_share",
        name="Tank share",
        subtitle="share(is_tank) · primary forms · both slots",
        y_domain=ARCH_SHARE_DOMAIN,
        scale_group="type-arch-rate",
        color_index=4,
        value_format="percent",
        decimals=1,
        height=380,
        query={
            "filter": TYPE_ANY,
            "groupBy": ["type"],
            "aggregate": [
                {
                    "fn": "share",
                    "as": "tank_share",
                    "label": "Tank share",
                    "where": {"column": "is_tank", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "tank_share", "direction": "desc"}],
        },
    )

    # ---- Generations ----
    gen_count = bar_v(
        "chart-gen-count",
        "Primary forms by generation",
        x_key="generation_label",
        series=[{"dataKey": "n", "name": "Species", "colorIndex": 0}],
        subtitle="is_primary_form ∧ type_slot=Primary",
        y_domain=COUNT_GEN_DOMAIN,
        show_legend=False,
        decimals=0,
        y_label="Species",
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [{"fn": "count", "as": "n", "label": "Species"}],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    gen_bst = bar_v(
        "chart-gen-bst",
        "Mean BST by generation",
        x_key="generation_label",
        series=[{"dataKey": "mean_bst", "name": "Mean BST", "colorIndex": 2}],
        subtitle="Primary forms · modest gen-to-gen spread (~402–446)",
        notes="Bars from 0. Spread is modest — not a strong power-creep claim.",
        y_domain=TOTAL_GEN_DOMAIN,
        show_legend=False,
        y_label="Mean BST",
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [{"fn": "mean", "column": "total", "as": "mean_bst", "label": "Mean BST"}],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    gen_leg_share = bar_v(
        "chart-gen-leg-share",
        "Legendary share by generation",
        x_key="generation_label",
        series=[{"dataKey": "leg_share", "name": "Legendary share", "colorIndex": 1}],
        subtitle="share where legendary · primary forms",
        y_domain=SHARE_DOMAIN,
        scale_group="gen-rate",
        show_legend=False,
        value_format="percent",
        decimals=1,
        y_label="Share",
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [
                {
                    "fn": "share",
                    "as": "leg_share",
                    "label": "Legendary share",
                    "where": {"column": "legendary", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    gen_dual_share = bar_v(
        "chart-gen-dual-share",
        "Dual-type share by generation",
        x_key="generation_label",
        series=[{"dataKey": "dual_share", "name": "Dual-type share", "colorIndex": 5}],
        subtitle="share(is_dual_type) · primary forms",
        y_domain=[0, 1],
        show_legend=False,
        value_format="percent",
        decimals=0,
        y_label="Share",
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [
                {
                    "fn": "share",
                    "column": "is_dual_type",
                    "as": "dual_share",
                    "label": "Dual-type share",
                }
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    gen_atk = bar_v(
        "chart-gen-atk",
        "Mean Attack by generation",
        x_key="generation_label",
        series=[{"dataKey": "mean_atk", "name": "Attack", "colorIndex": 1}],
        subtitle="Non-legendary primary forms · scaleGroup gen-stats",
        y_domain=STAT_GEN_DOMAIN,
        scale_group="gen-stats",
        show_legend=False,
        query={
            "filter": SPECIES_NONLEG,
            "groupBy": ["generation_label"],
            "aggregate": [{"fn": "mean", "column": "attack", "as": "mean_atk"}],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    gen_spa = bar_v(
        "chart-gen-spa",
        "Mean Sp. Atk by generation",
        x_key="generation_label",
        series=[{"dataKey": "mean_spa", "name": "Sp. Atk", "colorIndex": 3}],
        subtitle="Non-legendary primary forms · scaleGroup gen-stats",
        y_domain=STAT_GEN_DOMAIN,
        scale_group="gen-stats",
        show_legend=False,
        query={
            "filter": SPECIES_NONLEG,
            "groupBy": ["generation_label"],
            "aggregate": [{"fn": "mean", "column": "sp_atk", "as": "mean_spa"}],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    gen_spd = bar_v(
        "chart-gen-spd",
        "Mean Speed by generation",
        x_key="generation_label",
        series=[{"dataKey": "mean_spd", "name": "Speed", "colorIndex": 5}],
        subtitle="Non-legendary primary forms · scaleGroup gen-stats",
        y_domain=STAT_GEN_DOMAIN,
        scale_group="gen-stats",
        show_legend=False,
        query={
            "filter": SPECIES_NONLEG,
            "groupBy": ["generation_label"],
            "aggregate": [{"fn": "mean", "column": "speed", "as": "mean_spd"}],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    gen_leg_count_if = bar_v(
        "chart-gen-leg-count",
        "Legendary count by generation",
        x_key="generation_label",
        series=[{"dataKey": "n_leg", "name": "Legendaries", "colorIndex": 1}],
        subtitle="count_if(legendary) · primary forms",
        notes="Uses count_if rather than filtering then counting.",
        y_domain=[0, 20],
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [
                {
                    "fn": "count_if",
                    "as": "n_leg",
                    "label": "Legendaries",
                    "where": {"column": "legendary", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )

    # ---- Legendary ----
    leg_count = bar_v(
        "chart-leg-count",
        "Species count by legendary flag",
        x_key="status",
        series=[{"dataKey": "n", "name": "Species", "colorIndex": 0}],
        subtitle="Primary forms only",
        y_domain=[0, 700],
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [{"fn": "count", "as": "n"}],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    leg_bst = bar_v(
        "chart-leg-bst",
        "Mean BST by legendary flag",
        x_key="status",
        series=[{"dataKey": "mean_bst", "name": "Mean BST", "colorIndex": 2}],
        subtitle="Primary forms · separate scale from six-stat means",
        y_domain=LEG_BST_DOMAIN,
        show_legend=False,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [{"fn": "mean", "column": "total", "as": "mean_bst"}],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    leg_hp = bar_v(
        "chart-leg-hp",
        "Mean HP",
        x_key="status",
        series=[{"dataKey": "mean_hp", "name": "HP", "colorIndex": 0}],
        subtitle="scaleGroup leg-stats",
        y_domain=LEG_MEAN_DOMAIN,
        scale_group="leg-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [{"fn": "mean", "column": "hp", "as": "mean_hp"}],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    leg_atk = bar_v(
        "chart-leg-atk",
        "Mean Attack",
        x_key="status",
        series=[{"dataKey": "mean_atk", "name": "Attack", "colorIndex": 1}],
        subtitle="scaleGroup leg-stats",
        y_domain=LEG_MEAN_DOMAIN,
        scale_group="leg-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [{"fn": "mean", "column": "attack", "as": "mean_atk"}],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    leg_def = bar_v(
        "chart-leg-def",
        "Mean Defense",
        x_key="status",
        series=[{"dataKey": "mean_def", "name": "Defense", "colorIndex": 2}],
        subtitle="scaleGroup leg-stats",
        y_domain=LEG_MEAN_DOMAIN,
        scale_group="leg-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [{"fn": "mean", "column": "defense", "as": "mean_def"}],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    leg_spa = bar_v(
        "chart-leg-spa",
        "Mean Sp. Atk",
        x_key="status",
        series=[{"dataKey": "mean_spa", "name": "Sp. Atk", "colorIndex": 3}],
        subtitle="scaleGroup leg-stats",
        y_domain=LEG_MEAN_DOMAIN,
        scale_group="leg-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [{"fn": "mean", "column": "sp_atk", "as": "mean_spa"}],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    leg_spd_stat = bar_v(
        "chart-leg-spdef",
        "Mean Sp. Def",
        x_key="status",
        series=[{"dataKey": "mean_spdef", "name": "Sp. Def", "colorIndex": 4}],
        subtitle="scaleGroup leg-stats",
        y_domain=LEG_MEAN_DOMAIN,
        scale_group="leg-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [{"fn": "mean", "column": "sp_def", "as": "mean_spdef"}],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    leg_speed = bar_v(
        "chart-leg-speed",
        "Mean Speed",
        x_key="status",
        series=[{"dataKey": "mean_speed", "name": "Speed", "colorIndex": 5}],
        subtitle="scaleGroup leg-stats",
        y_domain=LEG_MEAN_DOMAIN,
        scale_group="leg-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [{"fn": "mean", "column": "speed", "as": "mean_speed"}],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    # mean_if / sum_if examples on legendary tab
    leg_mean_if_bst = bar_v(
        "chart-leg-mean-if-dual",
        "Mean BST of dual-types (mean_if)",
        x_key="status",
        series=[{"dataKey": "mean_dual_bst", "name": "Mean BST (dual)", "colorIndex": 2}],
        subtitle="mean_if(total where is_dual_type) by legendary flag",
        y_domain=LEG_BST_DOMAIN,
        scale_group="leg-bst-cond",
        show_legend=False,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [
                {
                    "fn": "mean_if",
                    "column": "total",
                    "as": "mean_dual_bst",
                    "where": {"column": "is_dual_type", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    leg_sum_if = bar_v(
        "chart-leg-sum-if-dual",
        "Sum of dual-type BST (sum_if)",
        x_key="status",
        series=[{"dataKey": "sum_dual_bst", "name": "Sum BST (dual)", "colorIndex": 5}],
        subtitle="sum_if(total where is_dual_type) · illustrative conditional total",
        notes="Different scale from means — own row, not a sibling of mean panels.",
        y_domain=[0, 220000],
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["status"],
            "aggregate": [
                {
                    "fn": "sum_if",
                    "column": "total",
                    "as": "sum_dual_bst",
                    "where": {"column": "is_dual_type", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "status", "direction": "asc"}],
        },
    )
    scatter_off_bulk = scatter(
        "chart-scatter-offense-bulk",
        "Offense vs bulk",
        x_key="bulk",
        y_key="offense",
        subtitle="Primary forms · colored by legendary flag",
        x_domain=[0, 200],
        y_domain=[0, 200],
        tooltip_keys=["name", "type_1", "total"],
        color_by={
            "key": "status",
            "levels": [
                {"value": "Non-legendary", "label": "Non-legendary", "colorIndex": 0},
                {"value": "Legendary", "label": "Legendary", "colorIndex": 1},
            ],
        },
        query={
            "filter": SPECIES,
            "orderBy": [{"column": "dex_number", "direction": "asc"}],
        },
    )

    # ---- Distributions ----
    hist_total = hist_bar(
        "chart-hist-total",
        "BST distribution",
        column="total",
        step=50,
        subtitle="Primary forms · bin step 50",
        x_domain=HIST_X_TOTAL,
        y_domain=HIST_Y_TOTAL,
        x_shift=25,
        color_index=2,
    )
    hist_hp = hist_bar(
        "chart-hist-hp",
        "HP distribution",
        column="hp",
        step=10,
        subtitle="Primary forms · shared stat hist scale",
        x_domain=HIST_X_STAT,
        y_domain=HIST_Y_STAT,
        scale_group="stat-hist",
        x_shift=5,
        color_index=0,
    )
    hist_atk = hist_bar(
        "chart-hist-atk",
        "Attack distribution",
        column="attack",
        step=10,
        subtitle="Primary forms · shared stat hist scale",
        x_domain=HIST_X_STAT,
        y_domain=HIST_Y_STAT,
        scale_group="stat-hist",
        x_shift=5,
        color_index=1,
    )
    hist_speed = hist_bar(
        "chart-hist-speed",
        "Speed distribution",
        column="speed",
        step=10,
        subtitle="Primary forms · shared stat hist scale",
        x_domain=HIST_X_STAT,
        y_domain=HIST_Y_STAT,
        scale_group="stat-hist",
        x_shift=5,
        color_index=5,
    )
    phys_lean = bar_v(
        "chart-phys-lean",
        "Mean Attack − Sp. Atk by generation",
        x_key="generation_label",
        series=[{"dataKey": "mean_lean", "name": "Attack − Sp. Atk", "colorIndex": 5}],
        subtitle="Polarity bars (not a trend line) · own row · not sibling to raw means",
        notes="Signed polarity metric — zero baseline required. Modest gen-to-gen shifts; not a growth claim.",
        y_domain=[-40, 40],
        show_legend=False,
        query={
            "filter": SPECIES_NONLEG,
            "groupBy": ["generation_label"],
            "aggregate": [{"fn": "mean", "column": "phys_minus_spec", "as": "mean_lean"}],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )

    # ---- Archetypes ----
    arch_count = bar_v(
        "chart-arch-count",
        "Species count by archetype",
        x_key="archetype",
        series=[{"dataKey": "n", "name": "Species", "colorIndex": 0}],
        subtitle="Primary forms · Glass 61 · Tank 41 · Neither remainder",
        y_domain=ARCH_COUNT_DOMAIN,
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "count", "as": "n"}],
            "orderBy": [{"column": "archetype", "direction": "asc"}],
        },
    )
    arch_bst = bar_v(
        "chart-arch-bst",
        "Mean BST by archetype",
        x_key="archetype",
        series=[{"dataKey": "mean_bst", "name": "Mean BST", "colorIndex": 2}],
        subtitle="Primary forms · separate scale from six-stat means",
        y_domain=ARCH_BST_DOMAIN,
        show_legend=False,
        query={
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "total", "as": "mean_bst"}],
            "orderBy": [{"column": "archetype", "direction": "asc"}],
        },
    )
    arch_glass_share_gen = bar_v(
        "chart-arch-glass-gen",
        "Glass-cannon share by generation",
        x_key="generation_label",
        series=[{"dataKey": "glass_share", "name": "Glass share", "colorIndex": 1}],
        subtitle="share(is_glass_cannon) · primary forms",
        y_domain=ARCH_SHARE_DOMAIN,
        scale_group="arch-gen-rate",
        show_legend=False,
        value_format="percent",
        decimals=1,
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [
                {
                    "fn": "share",
                    "as": "glass_share",
                    "where": {"column": "is_glass_cannon", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    arch_tank_share_gen = bar_v(
        "chart-arch-tank-gen",
        "Tank share by generation",
        x_key="generation_label",
        series=[{"dataKey": "tank_share", "name": "Tank share", "colorIndex": 4}],
        subtitle="share(is_tank) · primary forms",
        y_domain=ARCH_SHARE_DOMAIN,
        scale_group="arch-gen-rate",
        show_legend=False,
        value_format="percent",
        decimals=1,
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [
                {
                    "fn": "share",
                    "as": "tank_share",
                    "where": {"column": "is_tank", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    arch_atk = bar_v(
        "chart-arch-atk",
        "Mean Attack",
        x_key="archetype",
        series=[{"dataKey": "mean_atk", "name": "Attack", "colorIndex": 1}],
        subtitle="scaleGroup arch-stats",
        y_domain=ARCH_STAT_DOMAIN,
        scale_group="arch-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "attack", "as": "mean_atk"}],
            "orderBy": [{"column": "archetype", "direction": "asc"}],
        },
    )
    arch_spa = bar_v(
        "chart-arch-spa",
        "Mean Sp. Atk",
        x_key="archetype",
        series=[{"dataKey": "mean_spa", "name": "Sp. Atk", "colorIndex": 3}],
        subtitle="scaleGroup arch-stats",
        y_domain=ARCH_STAT_DOMAIN,
        scale_group="arch-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "sp_atk", "as": "mean_spa"}],
            "orderBy": [{"column": "archetype", "direction": "asc"}],
        },
    )
    arch_def = bar_v(
        "chart-arch-def",
        "Mean Defense",
        x_key="archetype",
        series=[{"dataKey": "mean_def", "name": "Defense", "colorIndex": 2}],
        subtitle="scaleGroup arch-stats",
        y_domain=ARCH_STAT_DOMAIN,
        scale_group="arch-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "defense", "as": "mean_def"}],
            "orderBy": [{"column": "archetype", "direction": "asc"}],
        },
    )
    arch_spdef = bar_v(
        "chart-arch-spdef",
        "Mean Sp. Def",
        x_key="archetype",
        series=[{"dataKey": "mean_spdef", "name": "Sp. Def", "colorIndex": 4}],
        subtitle="scaleGroup arch-stats",
        y_domain=ARCH_STAT_DOMAIN,
        scale_group="arch-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "sp_def", "as": "mean_spdef"}],
            "orderBy": [{"column": "archetype", "direction": "asc"}],
        },
    )
    arch_speed = bar_v(
        "chart-arch-speed",
        "Mean Speed",
        x_key="archetype",
        series=[{"dataKey": "mean_speed", "name": "Speed", "colorIndex": 5}],
        subtitle="scaleGroup arch-stats",
        y_domain=ARCH_STAT_DOMAIN,
        scale_group="arch-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "speed", "as": "mean_speed"}],
            "orderBy": [{"column": "archetype", "direction": "asc"}],
        },
    )
    arch_hp = bar_v(
        "chart-arch-hp",
        "Mean HP",
        x_key="archetype",
        series=[{"dataKey": "mean_hp", "name": "HP", "colorIndex": 0}],
        subtitle="scaleGroup arch-stats",
        y_domain=ARCH_STAT_DOMAIN,
        scale_group="arch-stats",
        show_legend=False,
        height=280,
        query={
            "filter": SPECIES,
            "groupBy": ["archetype"],
            "aggregate": [{"fn": "mean", "column": "hp", "as": "mean_hp"}],
            "orderBy": [{"column": "archetype", "direction": "asc"}],
        },
    )
    lean_count = bar_v(
        "chart-lean-count",
        "Species by offense lean",
        x_key="offense_lean",
        series=[{"dataKey": "n", "name": "Species", "colorIndex": 5}],
        subtitle="|Attack−Sp.Atk| ≥ 15 → Physical/Special · primary forms",
        y_domain=ARCH_LEAN_COUNT,
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["offense_lean"],
            "aggregate": [{"fn": "count", "as": "n"}],
            "orderBy": [{"column": "offense_lean", "direction": "asc"}],
        },
    )
    lean_glass_count_if = bar_v(
        "chart-lean-glass-count",
        "Glass cannons by offense lean",
        x_key="offense_lean",
        series=[{"dataKey": "n_glass", "name": "Glass cannons", "colorIndex": 1}],
        subtitle="count_if(is_glass_cannon) within lean · primary forms",
        y_domain=[0, 40],
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["offense_lean"],
            "aggregate": [
                {
                    "fn": "count_if",
                    "as": "n_glass",
                    "where": {"column": "is_glass_cannon", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "offense_lean", "direction": "asc"}],
        },
    )
    arch_mean_if_offense = bar_v(
        "chart-arch-mean-if-offense",
        "Mean offense among glass cannons (mean_if)",
        x_key="offense_lean",
        series=[{"dataKey": "mean_glass_off", "name": "Mean offense (glass)", "colorIndex": 1}],
        subtitle="mean_if(offense where is_glass_cannon) by lean",
        y_domain=ARCH_STAT_DOMAIN,
        scale_group="arch-cond-offense",
        show_legend=False,
        query={
            "filter": SPECIES,
            "groupBy": ["offense_lean"],
            "aggregate": [
                {
                    "fn": "mean_if",
                    "column": "offense",
                    "as": "mean_glass_off",
                    "where": {"column": "is_glass_cannon", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "offense_lean", "direction": "asc"}],
        },
    )
    arch_sum_if_tank_bst = bar_v(
        "chart-arch-sum-if-tank",
        "Sum of tank BST (sum_if)",
        x_key="offense_lean",
        series=[{"dataKey": "sum_tank_bst", "name": "Sum BST (tanks)", "colorIndex": 4}],
        subtitle="sum_if(total where is_tank) by lean · own scale",
        notes="Conditional total — not a sibling of mean panels.",
        y_domain=[0, 25000],
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["offense_lean"],
            "aggregate": [
                {
                    "fn": "sum_if",
                    "column": "total",
                    "as": "sum_tank_bst",
                    "where": {"column": "is_tank", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "offense_lean", "direction": "asc"}],
        },
    )
    scatter_arch = scatter(
        "chart-scatter-arch",
        "Offense vs bulk by archetype",
        x_key="bulk",
        y_key="offense",
        subtitle="Primary forms · glass / tank / neither",
        x_domain=[0, 200],
        y_domain=[0, 200],
        tooltip_keys=["name", "type_1", "archetype", "total"],
        color_by={
            "key": "archetype",
            "levels": [
                {"value": "Neither", "label": "Neither", "colorIndex": 0},
                {"value": "Glass cannon", "label": "Glass cannon", "colorIndex": 1},
                {"value": "Tank", "label": "Tank", "colorIndex": 4},
            ],
        },
        query={
            "filter": SPECIES,
            "orderBy": [{"column": "dex_number", "direction": "asc"}],
        },
    )

    # ---- Team pool / speed tiers ----
    pool_tier_count = bar_v(
        "chart-pool-tier-count",
        "Team-pool species by speed tier",
        x_key="speed_tier",
        series=[{"dataKey": "n", "name": "Species", "colorIndex": 0}],
        subtitle="in_team_pool · primary forms · counts only (shares on next row)",
        y_domain=POOL_COUNT_DOMAIN,
        show_legend=False,
        decimals=0,
        y_label="Species",
        query={
            "filter": TEAM_POOL,
            "groupBy": ["speed_tier"],
            "aggregate": [{"fn": "count", "as": "n", "label": "Species"}],
            "orderBy": [{"column": "speed_tier", "direction": "asc"}],
        },
    )
    pool_tier_share = bar_v(
        "chart-pool-tier-share",
        "Team-pool speed-tier shares",
        x_key="speed_tier",
        series=[{"dataKey": "pool_share", "name": "Share of pool", "colorIndex": 5}],
        subtitle="sum(pool_share_unit) by tier · 1/134 on pool species",
        notes="Composition shares via summable unit (share is within-group). Axis includes 0.",
        y_domain=POOL_SHARE_DOMAIN,
        show_legend=False,
        value_format="percent",
        decimals=1,
        y_label="Share of pool",
        query={
            "filter": TEAM_POOL,
            "groupBy": ["speed_tier"],
            "aggregate": [
                {
                    "fn": "sum",
                    "column": "pool_share_unit",
                    "as": "pool_share",
                    "label": "Share of pool",
                }
            ],
            "orderBy": [{"column": "speed_tier", "direction": "asc"}],
        },
    )
    # count_if blistering (100+) and share of pool by generation on all primary forms.
    pool_count_if_fast = bar_v(
        "chart-pool-count-if-fast",
        "100+ Speed count by generation",
        x_key="generation_label",
        series=[{"dataKey": "n_fast", "name": "Speed 100+", "colorIndex": 5}],
        subtitle="count_if(speed_tier=100+) · primary forms",
        y_domain=[0, 50],
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [
                {
                    "fn": "count_if",
                    "as": "n_fast",
                    "label": "Speed 100+",
                    "where": {"column": "speed_tier", "op": "eq", "value": "100+"},
                }
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    pool_share_by_gen = bar_v(
        "chart-pool-share-by-gen",
        "Team-pool share by generation",
        x_key="generation_label",
        series=[{"dataKey": "pool_share", "name": "In team pool", "colorIndex": 2}],
        subtitle="share(in_team_pool) · primary forms",
        y_domain=POOL_IN_SHARE,
        show_legend=False,
        value_format="percent",
        decimals=1,
        query={
            "filter": SPECIES,
            "groupBy": ["generation_label"],
            "aggregate": [
                {
                    "fn": "share",
                    "as": "pool_share",
                    "label": "In team pool",
                    "where": {"column": "in_team_pool", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    pool_share_by_tier_all = bar_v(
        "chart-pool-share-by-tier",
        "Share of each speed tier in the team pool",
        x_key="speed_tier",
        series=[{"dataKey": "in_pool_share", "name": "In team pool", "colorIndex": 2}],
        subtitle="share(in_team_pool) within speed_tier · all primary forms",
        notes="Different question from pool composition shares — fraction of each tier that qualifies.",
        y_domain=[0, 1],
        show_legend=False,
        value_format="percent",
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["speed_tier"],
            "aggregate": [
                {
                    "fn": "share",
                    "as": "in_pool_share",
                    "label": "In team pool",
                    "where": {"column": "in_team_pool", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "speed_tier", "direction": "asc"}],
        },
    )
    pool_bst = bar_v(
        "chart-pool-bst",
        "Mean BST by speed tier (team pool)",
        x_key="speed_tier",
        series=[{"dataKey": "mean_bst", "name": "Mean BST", "colorIndex": 2}],
        subtitle="Pool only · own row (not sibling to counts/shares)",
        y_domain=POOL_BST_DOMAIN,
        show_legend=False,
        query={
            "filter": TEAM_POOL,
            "groupBy": ["speed_tier"],
            "aggregate": [{"fn": "mean", "column": "total", "as": "mean_bst"}],
            "orderBy": [{"column": "speed_tier", "direction": "asc"}],
        },
    )
    pool_count_if_slow = bar_v(
        "chart-pool-count-if-slow",
        "Slow (<60) pool members by generation",
        x_key="generation_label",
        series=[{"dataKey": "n_slow_pool", "name": "Slow in pool", "colorIndex": 0}],
        subtitle="count_if(in_team_pool ∧ speed_tier=<60) via nested filter + count_if",
        notes="Filter to slow tier, count_if in_team_pool — avoids boolean pivot columns.",
        y_domain=[0, 20],
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES + [{"column": "speed_tier", "op": "eq", "value": "<60"}],
            "groupBy": ["generation_label"],
            "aggregate": [
                {
                    "fn": "count_if",
                    "as": "n_slow_pool",
                    "where": {"column": "in_team_pool", "op": "eq", "value": True},
                }
            ],
            "orderBy": [{"column": "generation_label", "direction": "asc"}],
        },
    )
    all_tier_count = bar_v(
        "chart-all-tier-count",
        "All primary forms by speed tier",
        x_key="speed_tier",
        series=[{"dataKey": "n", "name": "Species", "colorIndex": 0}],
        subtitle="Full 721 species · contrast with team-pool counts",
        y_domain=[0, 250],
        show_legend=False,
        decimals=0,
        query={
            "filter": SPECIES,
            "groupBy": ["speed_tier"],
            "aggregate": [{"fn": "count", "as": "n"}],
            "orderBy": [{"column": "speed_tier", "direction": "asc"}],
        },
    )

    # ---- Summary refs ----
    # Note: md-analyst-speed-tiers (createdBy:user, order 0.5) is preserved by mergeUserRows.
    summary_rows = [
        md(
            "md-summary",
            0,
            """## Pokémon base stats — Gen 1–6

**Population:** 721 primary forms (first CSV row per National Dex `#`). Mega and alternate formes are in the canonical file but excluded from default charts via `is_primary_form`.

**Type caveats:** default type panels use **both slots** (dual-types counted twice). Type-1-only panels undercount common secondaries (e.g. Flying). See Deep dive → By type and `understanding.md`.

**Archetypes:** glass cannon (61) / tank (41) from z-score gaps on primary forms — Deep dive → Archetypes.

**Team pool:** non-legendary primary forms with BST ≥ 500 (**134**) — Deep dive → Team pool.

Charts below are **refs** into the detail tabs.""",
        ),
        comp(
            "comp-summary-refs",
            1,
            [
                ref_block("ref-type-count", "chart-type-count", title="Type participation (ref)"),
                ref_block("ref-gen-bst", "chart-gen-bst", title="Mean BST by gen (ref)"),
                ref_block("ref-leg-bst", "chart-leg-bst", title="Legendary vs not — BST (ref)"),
                ref_block("ref-arch-count", "chart-arch-count", title="Archetype counts (ref)"),
            ],
            wrap=True,
        ),
        comp(
            "comp-summary-hist",
            2,
            [
                ref_block("ref-hist-total", "chart-hist-total", title="BST distribution (ref)"),
                ref_block("ref-scatter-arch", "chart-scatter-arch", title="Offense vs bulk (ref)"),
            ],
            wrap=True,
        ),
        comp(
            "comp-summary-pool",
            3,
            [
                ref_block("ref-pool-share", "chart-pool-tier-share", title="Pool speed-tier shares (ref)"),
                ref_block("ref-pool-count", "chart-pool-tier-count", title="Pool speed-tier counts (ref)"),
            ],
            wrap=True,
        ),
    ]

    types_rows = [
        md(
            "md-types",
            0,
            """## By type

**Default = both type slots** (`type` on primary forms). Dual-types appear under each of their types — this is intentional participation weighting, not a Type-1 undercount.

Slot-split panels use `count_if` on `type_slot` inside both-slot groups. The Type-1-only count at the bottom is a **contrast** cut: it undercounts types that appear mainly as Type 2.""",
        ),
        comp("comp-type-count-bst", 1, [type_count, type_bst]),
        md("md-types-slots", 2, "### Slot split (both-slot groups) — `scaleGroup: type-slots`"),
        comp("comp-type-slots", 3, [type_slot_primary, type_slot_secondary]),
        comp("comp-type-shares", 4, [type_leg_share, type_dual_share]),
        md("md-types-arch-rate", 5, "### Archetype rates by type (both slots) — `scaleGroup: type-arch-rate`"),
        comp("comp-type-arch-rate", 6, [type_glass_share, type_tank_share]),
        md("md-types-offense", 7, "### Offense means (non-legendary) — shared `scaleGroup: type-offense`"),
        comp("comp-type-offense", 8, [type_atk, type_spatk]),
        md("md-types-bulk", 9, "### Bulk means (non-legendary) — shared `scaleGroup: type-bulk`"),
        comp("comp-type-bulk", 10, [type_def, type_spdef]),
        comp("comp-type-speed", 11, [type_speed]),
        md("md-types-type1", 12, "### Type 1 only (undercounts Type-2 roles — contrast)"),
        comp("comp-type1", 13, [type1_count]),
    ]

    arch_rows = [
        md(
            "md-arch",
            0,
            """## Archetypes

Z-scores fit on 721 primary forms (`gap=1.0`, `floor=0.5`):

- **Glass cannon** — high offense relative to bulk (61)
- **Tank** — high bulk relative to offense and Speed (41)
- **Neither** — everyone else

**Offense lean:** Physical / Special when `|Attack−Sp.Atk| ≥ 15`, else Balanced.

Counts stay on separate rows from means. Six-stat means share `scaleGroup: arch-stats`.""",
        ),
        comp("comp-arch-count-bst", 1, [arch_count, arch_bst]),
        comp("comp-arch-gen-rates", 2, [arch_glass_share_gen, arch_tank_share_gen]),
        md("md-arch-stats", 3, "### Mean stats by archetype — `scaleGroup: arch-stats`"),
        comp("comp-arch-stats", 4, [arch_hp, arch_atk, arch_def, arch_spa, arch_spdef, arch_speed]),
        md(
            "md-arch-lean",
            5,
            "### Physical vs special lean\n\n"
            "Species counts (~hundreds) and glass `count_if` (~tens) are **different scales** — "
            "separate rows, not siblings / not a shared `scaleGroup`.",
        ),
        comp("comp-lean-count", 6, [lean_count]),
        comp("comp-lean-glass", 7, [lean_glass_count_if]),
        md("md-arch-cond", 8, "### Conditional aggregates (`mean_if` / `sum_if`)"),
        comp("comp-arch-mean-if", 9, [arch_mean_if_offense]),
        comp("comp-arch-sum-if", 10, [arch_sum_if_tank_bst]),
        comp("comp-arch-scatter", 11, [scatter_arch]),
    ]

    pool_rows = [
        md(
            "md-pool",
            0,
            """## Team pool / speed tiers

**Pool definition:** primary form ∧ non-legendary ∧ BST ≥ 500 → **134** species (`in_team_pool`).

**Speed tiers:** `<60` · `60–79` · `80–99` · `100+`.

Counts and composition shares use **separate rows** (different scales). Composition shares use `sum(pool_share_unit)`; rates elsewhere use `share` / `count_if`.""",
        ),
        comp("comp-pool-counts", 1, [pool_tier_count]),
        comp("comp-pool-shares", 2, [pool_tier_share]),
        comp("comp-all-tier", 3, [all_tier_count]),
        md("md-pool-rates", 4, "### Rates with `share` / `count_if`"),
        comp("comp-pool-gen", 5, [pool_share_by_gen, pool_count_if_fast]),
        comp("comp-pool-tier-in", 6, [pool_share_by_tier_all]),
        comp("comp-pool-slow", 7, [pool_count_if_slow]),
        md("md-pool-bst", 8, "### Pool mean BST by tier (own scale)"),
        comp("comp-pool-bst", 9, [pool_bst]),
    ]

    gen_rows = [
        md(
            "md-gens",
            0,
            """## By generation

Primary-form species only. Mean BST moves modestly across gens — bars start at 0; avoid over-reading “power creep.”""",
        ),
        comp("comp-gen-count-bst", 1, [gen_count, gen_bst]),
        comp("comp-gen-shares", 2, [gen_leg_share, gen_dual_share]),
        comp("comp-gen-leg-count", 3, [gen_leg_count_if]),
        md("md-gen-stats", 4, "### Non-legendary mean stats — `scaleGroup: gen-stats`"),
        comp("comp-gen-stats", 5, [gen_atk, gen_spa, gen_spd]),
    ]

    starter_rows = [
        md(
            "md-starters",
            0,
            """## Starter final evolutions (Gen 1–6)

**Population:** the 18 traditional starter **final** lines — primary CSV rows for Venusaur through Greninja (no Mega/alternate formes). Canonical adds **long-form** `record_kind=base_stat` rows (six stats per final) so each panel charts raw stat magnitudes without inventing pivot columns.

**Scales:** all 18 stat panels share `scaleGroup: starter-final-stats` with `yDomain: [0, 130]` so Grass/Fire/Water finals within a generation compare honestly.""",
        ),
    ]
    starter_color = (0, 1, 5)  # Grass / Fire / Water palette slots
    for gen in range(1, 7):
        grass, fire, water = STARTER_FINALS_BY_GEN[gen]
        charts = [
            starter_final_stat_bars(f"chart-starter-g{gen}-grass", grass, color_index=starter_color[0]),
            starter_final_stat_bars(f"chart-starter-g{gen}-fire", fire, color_index=starter_color[1]),
            starter_final_stat_bars(f"chart-starter-g{gen}-water", water, color_index=starter_color[2]),
        ]
        starter_rows.append(
            md(f"md-starter-g{gen}", float(gen), f"### Generation {gen} — {grass} · {fire} · {water}"),
        )
        starter_rows.append(comp(f"comp-starter-g{gen}", gen + 0.1, charts))

    leg_rows = [
        md(
            "md-leg",
            0,
            """## Legendary

CSV `Legendary` flag on primary forms (46 legendary / 675 non-legendary in this cut). Flag is source-defined — not a lore-complete mythical list.

Six-stat means share `scaleGroup: leg-stats`. BST means stay on their own row.""",
        ),
        comp("comp-leg-count-bst", 1, [leg_count, leg_bst]),
        comp("comp-leg-stats", 2, [leg_hp, leg_atk, leg_def, leg_spa, leg_spd_stat, leg_speed]),
        md("md-leg-cond", 3, "### Conditional aggregates (`mean_if` / `sum_if`)"),
        comp("comp-leg-mean-if", 4, [leg_mean_if_bst]),
        comp("comp-leg-sum-if", 5, [leg_sum_if]),
        comp("comp-leg-scatter", 6, [scatter_off_bulk]),
    ]

    dist_rows = [
        md(
            "md-dist",
            0,
            """## Distributions

Histograms over primary forms. Stat panels share `scaleGroup: stat-hist` with identical `xDomain` / `yDomain`. Physical lean is a polarity cut on its own row.""",
        ),
        comp("comp-hist-total", 1, [hist_total]),
        comp("comp-hist-stats", 2, [hist_hp, hist_atk, hist_speed]),
        comp("comp-phys-lean", 3, [phys_lean]),
    ]

    book = {
        "title": "Pokémon Base Stats (Gen 1–6)",
        "experimentId": "pokemon-gen1-6-r3",
        "description": (
            "Primary-form base-stat chart book — both-slot types, generations, "
            "legendary flag, archetypes, team-pool speed tiers, and distributions."
        ),
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "defaultTabId": "summary",
        "conventions": {
            "zeroBaselineBars": True,
            "population": (
                "Per-species: is_primary_form && type_slot=Primary (721). "
                "Type-participation: is_primary_form any slot (dual-types counted twice). "
                "Archetypes: z-score gap=1.0 floor=0.5 on primary forms (Glass 61 / Tank 41); "
                "offense lean |Atk−SpA|≥15. "
                "Team-building pool: primary form, non-legendary, total≥500 (134) — in_team_pool."
            ),
            "palette": {
                "0": "HP / counts / Neither / non-legendary / pool counts",
                "1": "Attack / legendary / Glass cannon",
                "2": "Defense / BST / pool BST",
                "3": "Sp. Atk",
                "4": "Sp. Def / Tank",
                "5": "Speed / dual-type / Secondary slot / polarity / pool shares",
            },
            "notes": [
                "Bar charts must include 0 on the value axis (omit yDomain or set yDomain[0] <= 0).",
                "Sibling panels that share measures use the same scaleGroup + explicit yDomain.",
                "Do not place polarity metrics (Attack−Sp. Atk) beside raw means in the same component row.",
                "Do not mix counts and means (or BST totals vs six-stat means) as unlabeled siblings.",
                "Do not mix species counts with glass count_if as siblings — different magnitudes.",
                "Canonical grain is form × type slot — filter type_slot=Primary for per-species charts.",
                "Both-slot type charts use column `type`; they intentionally double-count dual-types.",
                "Type-1-only panels undercount types that appear mainly as Type 2 — prefer both-slot for identity.",
                "Team-pool speed shares use sum(pool_share_unit) by speed_tier (axis at 0); counts on a separate row.",
                "Default filters include record_kind=type_slot — long-form base_stat rows are for starter-final panels only.",
                "Starter-final stat panels share scaleGroup starter-final-stats with yDomain [0, 130].",
                "Prefer share / count_if / sum_if / mean_if for rates and conditional totals.",
                "Do not chart near-flat bands as trends without acknowledging flatness.",
                "mergeUserRows preserves createdBy:user rows (e.g. md-analyst-speed-tiers) across regen.",
            ],
        },
        "pages": [
            {
                "id": "page-overview",
                "label": "Overview",
                "order": 0,
                "tabIds": ["summary"],
            },
            {
                "id": "page-deep",
                "label": "Deep dive",
                "order": 1,
                "tabIds": [
                    "types",
                    "generations",
                    "starters",
                    "legendary",
                    "archetypes",
                    "team-pool",
                    "distributions",
                ],
            },
        ],
        "tabs": [
            {"id": "summary", "label": "Summary", "order": 0, "rows": summary_rows},
            {"id": "types", "label": "By type", "order": 1, "rows": types_rows},
            {"id": "generations", "label": "By generation", "order": 2, "rows": gen_rows},
            {"id": "starters", "label": "Starter finals", "order": 3, "rows": starter_rows},
            {"id": "legendary", "label": "Legendary", "order": 4, "rows": leg_rows},
            {"id": "archetypes", "label": "Archetypes", "order": 5, "rows": arch_rows},
            {"id": "team-pool", "label": "Team pool", "order": 6, "rows": pool_rows},
            {"id": "distributions", "label": "Distributions", "order": 7, "rows": dist_rows},
        ],
    }
    return book


def main() -> None:
    previous = None
    if ROWS_PATH.exists():
        try:
            previous = json.loads(ROWS_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            previous = None
    # Skip merging the init sample (no user rows we care about).
    if previous and previous.get("experimentId") == "init-sample":
        previous = None
    nxt = build_book()
    merged = merge_user_rows(previous, nxt)
    ROWS_PATH.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    n_charts = sum(
        1
        for t in merged["tabs"]
        for r in t["rows"]
        if r["type"] == "component"
        for c in r["components"]
        if not c.get("ref")
    )
    n_refs = sum(
        1
        for t in merged["tabs"]
        for r in t["rows"]
        if r["type"] == "component"
        for c in r["components"]
        if c.get("ref")
    )
    print(f"Wrote {ROWS_PATH} · charts={n_charts} · refs={n_refs} · tabs={len(merged['tabs'])}")


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(0)
