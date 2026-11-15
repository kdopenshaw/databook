#!/usr/bin/env python3
"""Build pokemon-book/src/data/canonical.json from data/Pokemon.csv (stdlib only)."""

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
    rows_out: list[dict] = []
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

            phys_minus_spec = stats["attack"] - stats["sp_atk"]

            rows_out.append(
                {
                    "row_id": f"{dex}-{idx}",
                    "dex_number": int(dex),
                    "name": name,
                    "type_1": raw["Type 1"].strip(),
                    "type_2": type2 if type2 else None,
                    "total": total,
                    **stats,
                    "generation": generation,
                    "generation_label": f"Gen {generation}",
                    "legendary": legendary,
                    "status": "Legendary" if legendary else "Non-legendary",
                    "is_primary_form": primary,
                    "is_mega": mega,
                    "form_kind": form_kind,
                    "phys_minus_spec": phys_minus_spec,
                    # Pivot helpers so one groupBy can split legendary vs not without a pivot op.
                    "total_legendary": total if legendary else None,
                    "total_nonlegendary": total if not legendary else None,
                }
            )

    payload = {
        "grain": "one row per Pokémon form in Pokemon.csv (Gen 1–6); default charts filter is_primary_form",
        "hash": hashlib.sha256(
            json.dumps(rows_out, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()[:16],
        "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "status": "ready",
        "schema": [
            {"name": "row_id", "type": "categorical", "label": "Row id", "nullable": False},
            {"name": "dex_number", "type": "quantitative", "label": "National Dex #", "nullable": False},
            {"name": "name", "type": "categorical", "label": "Name", "nullable": False},
            {
                "name": "type_1",
                "type": "categorical",
                "label": "Type 1",
                "nullable": False,
                "description": "Primary type only; dual-types are not exploded.",
            },
            {"name": "type_2", "type": "categorical", "label": "Type 2", "nullable": True},
            {"name": "total", "type": "quantitative", "label": "Base stat total", "nullable": False},
            {"name": "hp", "type": "quantitative", "label": "HP", "nullable": False},
            {"name": "attack", "type": "quantitative", "label": "Attack", "nullable": False},
            {"name": "defense", "type": "quantitative", "label": "Defense", "nullable": False},
            {"name": "sp_atk", "type": "quantitative", "label": "Sp. Atk", "nullable": False},
            {"name": "sp_def", "type": "quantitative", "label": "Sp. Def", "nullable": False},
            {"name": "speed", "type": "quantitative", "label": "Speed", "nullable": False},
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
            {
                "name": "phys_minus_spec",
                "type": "quantitative",
                "label": "Attack − Sp. Atk",
                "nullable": False,
                "description": "Positive = physical lean.",
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
        "source": {"path": "data/Pokemon.csv", "sha256": source_hash, "rowCount": len(rows_out)},
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({len(rows_out)} rows, hash={payload['hash']})")


if __name__ == "__main__":
    main()
