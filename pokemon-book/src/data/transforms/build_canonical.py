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
import math
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

# Judgment thresholds (documented in understanding.md).
ARCHETYPE_GAP = 1.0
ARCHETYPE_FLOOR = 0.5


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def is_mega_name(name: str) -> bool:
    return "Mega " in name or "Primal " in name


def mean(xs: list[float]) -> float:
    return sum(xs) / len(xs) if xs else float("nan")


def stdev(xs: list[float], mu: float) -> float:
    if len(xs) < 2:
        return 0.0
    return math.sqrt(sum((x - mu) ** 2 for x in xs) / (len(xs) - 1))


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

            forms.append(
                {
                    "form_index": idx,
                    "dex_number": int(dex),
                    "name": name,
                    "type_1": raw["Type 1"].strip(),
                    "type_2": type2 if type2 else None,
                    "total": total,
                    **stats,
                    "offense": offense,
                    "bulk": bulk,
                    "generation": generation,
                    "generation_label": f"Gen {generation}",
                    "legendary": legendary,
                    "status": "Legendary" if legendary else "Non-legendary",
                    "is_primary_form": primary,
                    "is_mega": mega,
                    "form_kind": form_kind,
                    "phys_minus_spec": stats["attack"] - stats["sp_atk"],
                }
            )

    # Fit z-scores on primary forms only (721 species).
    base = [f for f in forms if f["is_primary_form"]]
    off_vals = [f["offense"] for f in base]
    bulk_vals = [f["bulk"] for f in base]
    spd_vals = [f["speed"] for f in base]
    mu_off, mu_bulk, mu_spd = mean(off_vals), mean(bulk_vals), mean(spd_vals)
    sd_off, sd_bulk, sd_spd = stdev(off_vals, mu_off), stdev(bulk_vals, mu_bulk), stdev(spd_vals, mu_spd)

    def z(v: float, mu: float, sd: float) -> float:
        return 0.0 if sd == 0 else (v - mu) / sd

    for f in forms:
        z_off = z(f["offense"], mu_off, sd_off)
        z_bulk = z(f["bulk"], mu_bulk, sd_bulk)
        z_spd = z(f["speed"], mu_spd, sd_spd)
        glass_score = z_off - z_bulk
        tank_score = z_bulk - max(z_off, z_spd)
        is_glass = glass_score >= ARCHETYPE_GAP and z_off >= ARCHETYPE_FLOOR
        is_tank = tank_score >= ARCHETYPE_GAP and z_bulk >= ARCHETYPE_FLOOR
        if is_glass and is_tank:
            # Prefer the larger gap; should be rare at these thresholds.
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
            }
        )

    rows_out: list[dict] = []
    for f in forms:
        slots = [("Primary", f["type_1"])]
        if f["type_2"]:
            slots.append(("Secondary", f["type_2"]))
        for slot, type_name in slots:
            legendary = f["legendary"]
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
                    "total": f["total"],
                    "hp": f["hp"],
                    "attack": f["attack"],
                    "defense": f["defense"],
                    "sp_atk": f["sp_atk"],
                    "sp_def": f["sp_def"],
                    "speed": f["speed"],
                    "offense": f["offense"],
                    "bulk": round(f["bulk"], 4),
                    "generation": f["generation"],
                    "generation_label": f["generation_label"],
                    "legendary": legendary,
                    "status": f["status"],
                    "is_primary_form": f["is_primary_form"],
                    "is_mega": f["is_mega"],
                    "form_kind": f["form_kind"],
                    "phys_minus_spec": f["phys_minus_spec"],
                    "z_offense": f["z_offense"],
                    "z_bulk": f["z_bulk"],
                    "z_speed": f["z_speed"],
                    "glass_score": f["glass_score"],
                    "tank_score": f["tank_score"],
                    "is_glass_cannon": f["is_glass_cannon"],
                    "is_tank": f["is_tank"],
                    "archetype": f["archetype"],
                    "total_legendary": f["total"] if legendary else None,
                    "total_nonlegendary": f["total"] if not legendary else None,
                }
            )

    n_primary_species = sum(1 for f in forms if f["is_primary_form"])
    n_glass = sum(1 for f in forms if f["is_primary_form"] and f["is_glass_cannon"])
    n_tank = sum(1 for f in forms if f["is_primary_form"] and f["is_tank"])

    payload = {
        "grain": (
            "one row per form × type slot (Primary, Secondary if dual-typed). "
            "Per-species charts: is_primary_form && type_slot=Primary. "
            "Type-participation charts: is_primary_form (any slot)."
        ),
        "hash": hashlib.sha256(
            json.dumps(rows_out, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()[:16],
        "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "status": "ready",
        "schema": [
            {"name": "row_id", "type": "categorical", "label": "Row id", "nullable": False},
            {"name": "form_index", "type": "quantitative", "label": "CSV row index", "nullable": False},
            {"name": "dex_number", "type": "quantitative", "label": "National Dex #", "nullable": False},
            {"name": "name", "type": "categorical", "label": "Name", "nullable": False},
            {"name": "type_1", "type": "categorical", "label": "Type 1", "nullable": False},
            {"name": "type_2", "type": "categorical", "label": "Type 2", "nullable": True},
            {
                "name": "type_slot",
                "type": "categorical",
                "label": "Type slot",
                "nullable": False,
                "levels": ["Primary", "Secondary"],
            },
            {
                "name": "type",
                "type": "categorical",
                "label": "Type (this slot)",
                "nullable": False,
                "description": "Type in type_slot; use for both-slot type charts.",
            },
            {"name": "in_primary_slot", "type": "boolean", "label": "Primary slot", "nullable": False},
            {"name": "in_secondary_slot", "type": "boolean", "label": "Secondary slot", "nullable": False},
            {"name": "total", "type": "quantitative", "label": "Base stat total", "nullable": False},
            {"name": "hp", "type": "quantitative", "label": "HP", "nullable": False},
            {"name": "attack", "type": "quantitative", "label": "Attack", "nullable": False},
            {"name": "defense", "type": "quantitative", "label": "Defense", "nullable": False},
            {"name": "sp_atk", "type": "quantitative", "label": "Sp. Atk", "nullable": False},
            {"name": "sp_def", "type": "quantitative", "label": "Sp. Def", "nullable": False},
            {"name": "speed", "type": "quantitative", "label": "Speed", "nullable": False},
            {
                "name": "offense",
                "type": "quantitative",
                "label": "Offense",
                "nullable": False,
                "description": "max(Attack, Sp. Atk)",
            },
            {
                "name": "bulk",
                "type": "quantitative",
                "label": "Bulk",
                "nullable": False,
                "description": "mean(HP, Defense, Sp. Def)",
            },
            {"name": "generation", "type": "quantitative", "label": "Generation", "nullable": False},
            {
                "name": "generation_label",
                "type": "categorical",
                "label": "Generation",
                "nullable": False,
                "levels": [f"Gen {i}" for i in range(1, 7)],
            },
            {"name": "legendary", "type": "boolean", "label": "Legendary flag", "nullable": False},
            {
                "name": "status",
                "type": "categorical",
                "label": "Legendary status",
                "nullable": False,
                "levels": ["Legendary", "Non-legendary"],
            },
            {"name": "is_primary_form", "type": "boolean", "label": "Primary form", "nullable": False},
            {"name": "is_mega", "type": "boolean", "label": "Mega/Primal", "nullable": False},
            {
                "name": "form_kind",
                "type": "categorical",
                "label": "Form kind",
                "nullable": False,
                "levels": ["Base", "Mega/Primal", "Alternate"],
            },
            {"name": "phys_minus_spec", "type": "quantitative", "label": "Attack − Sp. Atk", "nullable": False},
            {"name": "z_offense", "type": "quantitative", "label": "z(offense)", "nullable": False},
            {"name": "z_bulk", "type": "quantitative", "label": "z(bulk)", "nullable": False},
            {"name": "z_speed", "type": "quantitative", "label": "z(Speed)", "nullable": False},
            {"name": "glass_score", "type": "quantitative", "label": "Glass score", "nullable": False},
            {"name": "tank_score", "type": "quantitative", "label": "Tank score", "nullable": False},
            {"name": "is_glass_cannon", "type": "boolean", "label": "Glass cannon", "nullable": False},
            {"name": "is_tank", "type": "boolean", "label": "Tank", "nullable": False},
            {
                "name": "archetype",
                "type": "categorical",
                "label": "Archetype",
                "nullable": False,
                "levels": ["Glass cannon", "Tank", "Neither"],
            },
            {"name": "total_legendary", "type": "quantitative", "label": "Total if legendary", "nullable": True},
            {
                "name": "total_nonlegendary",
                "type": "quantitative",
                "label": "Total if non-legendary",
                "nullable": True,
            },
        ],
        "rows": rows_out,
        "source": {
            "path": "data/Pokemon.csv",
            "sha256": source_hash,
            "csvRowCount": len(forms),
            "canonicalRowCount": len(rows_out),
            "primarySpecies": n_primary_species,
            "archetypeParams": {
                "fitOn": "is_primary_form",
                "gap": ARCHETYPE_GAP,
                "floor": ARCHETYPE_FLOOR,
                "glassCount": n_glass,
                "tankCount": n_tank,
                "mu_offense": round(mu_off, 4),
                "sd_offense": round(sd_off, 4),
                "mu_bulk": round(mu_bulk, 4),
                "sd_bulk": round(sd_bulk, 4),
                "mu_speed": round(mu_spd, 4),
                "sd_speed": round(sd_spd, 4),
            },
        },
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT_PATH} ({len(rows_out)} slot-rows from {len(forms)} forms; "
        f"glass={n_glass} tank={n_tank}; hash={payload['hash']})"
    )


if __name__ == "__main__":
    main()
