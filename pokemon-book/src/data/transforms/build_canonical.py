#!/usr/bin/env python3
"""Build pokemon-book/src/data/canonical.json from data/Pokemon.csv (stdlib only).

Grain: one row per form × type slot (Primary, and Secondary when dual-typed).
Primary-form flag = first CSV row per National Dex #.
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


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


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
                    "phys_minus_spec": stats["attack"] - stats["sp_atk"],
                }
            )

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
        },
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT_PATH} · forms={len(forms)} · primary={n_primary} · "
        f"type_part={n_type_part} · rows={len(rows_out)}"
    )


if __name__ == "__main__":
    main()
