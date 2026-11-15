#!/usr/bin/env python3
"""Build pokemon-book/src/data/canonical.json from data/Pokemon.csv (stdlib only).

Grain: one row per form × type slot (Primary, and Secondary when dual-typed).
Archetype z-scores are fit on primary forms (first CSV row per dex #), then
copied onto every slot row for that form.
"""

from __future__ import annotations

import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

BOOK_ROOT = Path(__file__).resolve().parents[3]
CSV_PATH = BOOK_ROOT / "data" / "Pokemon.csv"
OUT_PATH = BOOK_ROOT / "src" / "data" / "canonical.json"

STAT_COLS = [
    ("HP", "hp"),
    ("Attack", "attack"),
    ("Defense", "defense"),
    ("Sp. Atk", "sp_atk"),
    ("Sp. Def", "sp_def"),
    ("Speed", "speed"),
]

TYPE_LEVELS = [
    "Bug",
    "Dark",
    "Dragon",
    "Electric",
    "Fairy",
    "Fighting",
    "Fire",
    "Flying",
    "Ghost",
    "Grass",
    "Ground",
    "Ice",
    "Normal",
    "Poison",
    "Psychic",
    "Rock",
    "Steel",
    "Water",
]

# Judgment thresholds (documented in understanding.md).
ARCHETYPE_GAP = 1.0
ARCHETYPE_FLOOR = 0.5
# Physical vs special lean: |Attack − Sp. Atk| ≥ this raw gap.
PHYS_SPEC_GAP = 15


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def mean(xs: list[float]) -> float:
    return sum(xs) / len(xs) if xs else float("nan")


def stdev(xs: list[float], mu: float) -> float:
    if len(xs) < 2:
        return 0.0
    return (sum((x - mu) ** 2 for x in xs) / (len(xs) - 1)) ** 0.5


def is_mega_name(name: str) -> bool:
    return "Mega " in name or "Primal " in name


def main() -> None:
    source_hash = sha256_file(CSV_PATH)
    forms: list[dict] = []
    seen_dex: set[str] = set()

    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, raw in enumerate(reader):
            dex = str(raw["#"]).strip()
            name = raw["Name"].strip()
            primary = dex not in seen_dex
            seen_dex.add(dex)
            mega = is_mega_name(name)
            if primary:
                form_kind = "Base"
            elif mega:
                form_kind = "Mega/Primal"
            else:
                form_kind = "Alternate"

            type2 = raw["Type 2"].strip()
            legendary = raw["Legendary"].strip() == "True"
            generation = int(raw["Generation"])
            stats = {out: int(raw[src]) for src, out in STAT_COLS}
            total = int(raw["Total"])
            if total != sum(stats.values()):
                raise SystemExit(f"Total mismatch for {name}: {total} vs {sum(stats.values())}")

            offense = max(stats["attack"], stats["sp_atk"])
            bulk = (stats["hp"] + stats["defense"] + stats["sp_def"]) / 3.0
            dual = bool(type2)
            lean = stats["attack"] - stats["sp_atk"]
            if lean >= PHYS_SPEC_GAP:
                offense_lean = "Physical"
            elif lean <= -PHYS_SPEC_GAP:
                offense_lean = "Special"
            else:
                offense_lean = "Balanced"

            forms.append(
                {
                    "form_index": idx,
                    "dex_number": int(dex),
                    "name": name,
                    "type_1": raw["Type 1"].strip(),
                    "type_2": type2 if type2 else None,
                    "is_dual_type": dual,
                    "total": total,
                    **stats,
                    "offense": offense,
                    "bulk": round(bulk, 4),
                    "generation": generation,
                    "generation_label": f"Gen {generation}",
                    "legendary": legendary,
                    "status": "Legendary" if legendary else "Non-legendary",
                    "is_primary_form": primary,
                    "is_mega": mega,
                    "form_kind": form_kind,
                    "phys_minus_spec": lean,
                    "offense_lean": offense_lean,
                }
            )

    # Fit z-scores on primary forms only (721 species).
    base = [f for f in forms if f["is_primary_form"]]
    off_vals = [f["offense"] for f in base]
    bulk_vals = [f["bulk"] for f in base]
    spd_vals = [f["speed"] for f in base]
    mu_off, mu_bulk, mu_spd = mean(off_vals), mean(bulk_vals), mean(spd_vals)
    sd_off = stdev(off_vals, mu_off)
    sd_bulk = stdev(bulk_vals, mu_bulk)
    sd_spd = stdev(spd_vals, mu_spd)

    def z(v: float, mu: float, sd: float) -> float:
        return 0.0 if sd == 0 else (v - mu) / sd

    n_glass = n_tank = 0
    for f in forms:
        z_off = z(f["offense"], mu_off, sd_off)
        z_bulk = z(f["bulk"], mu_bulk, sd_bulk)
        z_spd = z(f["speed"], mu_spd, sd_spd)
        glass_score = z_off - z_bulk
        tank_score = z_bulk - max(z_off, z_spd)
        is_glass = glass_score >= ARCHETYPE_GAP and z_off >= ARCHETYPE_FLOOR
        is_tank = tank_score >= ARCHETYPE_GAP and z_bulk >= ARCHETYPE_FLOOR
        if is_glass and is_tank:
            if glass_score >= tank_score:
                is_tank = False
            else:
                is_glass = False
        if is_glass:
            archetype = "Glass cannon"
        elif is_tank:
            archetype = "Tank"
        else:
            archetype = "Neither"
        if f["is_primary_form"]:
            if is_glass:
                n_glass += 1
            if is_tank:
                n_tank += 1
        speed = f["speed"]
        if speed < 60:
            speed_tier, tier_rank = "<60", 0
        elif speed < 80:
            speed_tier, tier_rank = "60-79", 1
        elif speed < 100:
            speed_tier, tier_rank = "80-99", 2
        else:
            speed_tier, tier_rank = "100+", 3

        # Team-building pool: non-legendary primary form, BST ≥ 500.
        in_team_pool = bool(f["is_primary_form"] and (not f["legendary"]) and f["total"] >= 500)

        f.update(
            {
                "z_offense": round(z_off, 4),
                "z_bulk": round(z_bulk, 4),
                "z_speed": round(z_spd, 4),
                "glass_score": round(glass_score, 4),
                "tank_score": round(tank_score, 4),
                "is_glass_cannon": is_glass,
                "is_tank": is_tank,
                "archetype": archetype,
                "speed_tier": speed_tier,
                "speed_tier_rank": tier_rank,
                "in_team_pool": in_team_pool,
            }
        )

    n_pool = sum(1 for f in forms if f["in_team_pool"])
    pool_share_unit = (1.0 / n_pool) if n_pool else None
    for f in forms:
        f["pool_share_unit"] = pool_share_unit if f["in_team_pool"] else None

    rows_out: list[dict] = []
    for f in forms:
        slots = [("Primary", f["type_1"])]
        if f["type_2"]:
            slots.append(("Secondary", f["type_2"]))
        for slot, type_name in slots:
            rows_out.append(
                {
                    "row_id": f"{f['dex_number']}-{f['form_index']}-{slot[0]}",
                    "form_index": f["form_index"],
                    "dex_number": f["dex_number"],
                    "name": f["name"],
                    "type_1": f["type_1"],
                    "type_2": f["type_2"],
                    "type_slot": slot,
                    "type": type_name,
                    "in_primary_slot": slot == "Primary",
                    "in_secondary_slot": slot == "Secondary",
                    "is_dual_type": f["is_dual_type"],
                    "total": f["total"],
                    "hp": f["hp"],
                    "attack": f["attack"],
                    "defense": f["defense"],
                    "sp_atk": f["sp_atk"],
                    "sp_def": f["sp_def"],
                    "speed": f["speed"],
                    "offense": f["offense"],
                    "bulk": f["bulk"],
                    "phys_minus_spec": f["phys_minus_spec"],
                    "offense_lean": f["offense_lean"],
                    "z_offense": f["z_offense"],
                    "z_bulk": f["z_bulk"],
                    "z_speed": f["z_speed"],
                    "glass_score": f["glass_score"],
                    "tank_score": f["tank_score"],
                    "is_glass_cannon": f["is_glass_cannon"],
                    "is_tank": f["is_tank"],
                    "archetype": f["archetype"],
                    "speed_tier": f["speed_tier"],
                    "speed_tier_rank": f["speed_tier_rank"],
                    "in_team_pool": f["in_team_pool"],
                    "pool_share_unit": f["pool_share_unit"],
                    "generation": f["generation"],
                    "generation_label": f["generation_label"],
                    "legendary": f["legendary"],
                    "status": f["status"],
                    "is_primary_form": f["is_primary_form"],
                    "is_mega": f["is_mega"],
                    "form_kind": f["form_kind"],
                }
            )

    n_primary = sum(1 for r in rows_out if r["is_primary_form"] and r["type_slot"] == "Primary")
    n_type_part = sum(1 for r in rows_out if r["is_primary_form"])

    schema = [
        {"name": "row_id", "type": "categorical", "nullable": False},
        {"name": "form_index", "type": "quantitative", "nullable": False},
        {"name": "dex_number", "type": "quantitative", "label": "Dex #", "nullable": False},
        {"name": "name", "type": "categorical", "label": "Name", "nullable": False},
        {"name": "type_1", "type": "categorical", "label": "Type 1", "levels": TYPE_LEVELS, "nullable": False},
        {"name": "type_2", "type": "categorical", "label": "Type 2", "levels": TYPE_LEVELS, "nullable": True},
        {
            "name": "type_slot",
            "type": "categorical",
            "label": "Type slot",
            "levels": ["Primary", "Secondary"],
            "nullable": False,
            "description": "Primary = Type 1; Secondary = Type 2 when present.",
        },
        {
            "name": "type",
            "type": "categorical",
            "label": "Type (slot)",
            "levels": TYPE_LEVELS,
            "nullable": False,
            "description": "Type for this slot — use with is_primary_form for both-slot participation.",
        },
        {"name": "in_primary_slot", "type": "boolean", "nullable": False},
        {"name": "in_secondary_slot", "type": "boolean", "nullable": False},
        {"name": "is_dual_type", "type": "boolean", "nullable": False},
        {"name": "total", "type": "quantitative", "label": "BST", "nullable": False},
        {"name": "hp", "type": "quantitative", "label": "HP", "nullable": False},
        {"name": "attack", "type": "quantitative", "label": "Attack", "nullable": False},
        {"name": "defense", "type": "quantitative", "label": "Defense", "nullable": False},
        {"name": "sp_atk", "type": "quantitative", "label": "Sp. Atk", "nullable": False},
        {"name": "sp_def", "type": "quantitative", "label": "Sp. Def", "nullable": False},
        {"name": "speed", "type": "quantitative", "label": "Speed", "nullable": False},
        {"name": "offense", "type": "quantitative", "label": "Offense (max Atk/SpA)", "nullable": False},
        {"name": "bulk", "type": "quantitative", "label": "Bulk (mean HP/Def/SpD)", "nullable": False},
        {"name": "phys_minus_spec", "type": "quantitative", "label": "Attack − Sp. Atk", "nullable": False},
        {
            "name": "offense_lean",
            "type": "categorical",
            "label": "Offense lean",
            "levels": ["Physical", "Balanced", "Special"],
            "nullable": False,
            "description": f"|Attack−Sp.Atk| ≥ {PHYS_SPEC_GAP} → Physical/Special; else Balanced.",
        },
        {"name": "z_offense", "type": "quantitative", "nullable": False},
        {"name": "z_bulk", "type": "quantitative", "nullable": False},
        {"name": "z_speed", "type": "quantitative", "nullable": False},
        {"name": "glass_score", "type": "quantitative", "nullable": False},
        {"name": "tank_score", "type": "quantitative", "nullable": False},
        {"name": "is_glass_cannon", "type": "boolean", "nullable": False},
        {"name": "is_tank", "type": "boolean", "nullable": False},
        {
            "name": "archetype",
            "type": "categorical",
            "label": "Archetype",
            "levels": ["Glass cannon", "Tank", "Neither"],
            "nullable": False,
            "description": f"Z-score gap≥{ARCHETYPE_GAP}, floor≥{ARCHETYPE_FLOOR} on primary-form fit.",
        },
        {
            "name": "speed_tier",
            "type": "categorical",
            "label": "Speed tier",
            "levels": ["<60", "60-79", "80-99", "100+"],
            "nullable": False,
        },
        {"name": "speed_tier_rank", "type": "quantitative", "nullable": False},
        {
            "name": "in_team_pool",
            "type": "boolean",
            "nullable": False,
            "description": "Primary form ∧ non-legendary ∧ BST≥500.",
        },
        {
            "name": "pool_share_unit",
            "type": "quantitative",
            "nullable": True,
            "description": "1/n_pool on team-pool primary forms; null elsewhere. Sum by speed_tier → pool share.",
        },
        {"name": "generation", "type": "quantitative", "label": "Generation", "nullable": False},
        {
            "name": "generation_label",
            "type": "categorical",
            "label": "Generation",
            "levels": [f"Gen {i}" for i in range(1, 7)],
            "nullable": False,
        },
        {"name": "legendary", "type": "boolean", "nullable": False},
        {
            "name": "status",
            "type": "categorical",
            "label": "Status",
            "levels": ["Non-legendary", "Legendary"],
            "nullable": False,
        },
        {
            "name": "is_primary_form",
            "type": "boolean",
            "nullable": False,
            "description": "First CSV row per dex # (base species).",
        },
        {"name": "is_mega", "type": "boolean", "nullable": False},
        {
            "name": "form_kind",
            "type": "categorical",
            "levels": ["Base", "Mega/Primal", "Alternate"],
            "nullable": False,
        },
    ]

    payload = {
        "grain": "one row per Pokémon form × type slot (Primary / Secondary)",
        "hash": source_hash,
        "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "status": "ready",
        "schema": schema,
        "rows": rows_out,
        "meta": {
            "source": "data/Pokemon.csv",
            "sourceHash": source_hash,
            "nForms": len(forms),
            "nPrimarySpecies": n_primary,
            "nTypeParticipationRows": n_type_part,
            "nCanonicalRows": len(rows_out),
            "nGlassCannonPrimary": n_glass,
            "nTankPrimary": n_tank,
            "nTeamPool": n_pool,
            "archetypeGap": ARCHETYPE_GAP,
            "archetypeFloor": ARCHETYPE_FLOOR,
            "physSpecGap": PHYS_SPEC_GAP,
        },
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT_PATH} · forms={len(forms)} · primary={n_primary} · "
        f"type_part={n_type_part} · rows={len(rows_out)} · "
        f"glass={n_glass} · tank={n_tank} · pool={n_pool}"
    )


if __name__ == "__main__":
    main()
