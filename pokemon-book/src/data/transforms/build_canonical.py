#!/usr/bin/env python3
"""Build src/data/canonical.json from data/Pokemon.csv (stdlib only).

Grain: one row per Pokémon form x type slot. Mono-type forms yield one row
(type_slot = "Primary"); dual-type forms yield two. Per-Pokémon charts must
filter type_slot = "Primary" so each form is counted once.

Usage (from the book root):  python3 src/data/transforms/build_canonical.py
"""

import csv
import hashlib
import json
import re
import statistics
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "data" / "Pokemon.csv"
OUT = ROOT / "src" / "data" / "canonical.json"
MANIFEST = Path(__file__).with_suffix(".manifest.json")

STATS = [
    ("HP", "hp", "HP"),
    ("Attack", "attack", "Attack"),
    ("Defense", "defense", "Defense"),
    ("Sp. Atk", "sp_atk", "Sp. Atk"),
    ("Sp. Def", "sp_def", "Sp. Def"),
    ("Speed", "speed", "Speed"),
]
TYPES = sorted(
    "Bug Dark Dragon Electric Fairy Fighting Fire Flying Ghost Grass Ground Ice "
    "Normal Poison Psychic Rock Steel Water".split()
)
GENS = [f"Gen {i}" for i in range(1, 7)]
FORM_KINDS = ["Base", "Mega/Primal", "Alternate form"]
ARCHETYPES = ["Glass cannon", "Tank", "Neither"]
# Archetype rule, in base-form standard deviations: the strong side must beat the
# weak side by ARCHETYPE_GAP and itself be at least ARCHETYPE_FLOOR above average.
ARCHETYPE_GAP = 1.0
ARCHETYPE_FLOOR = 0.5
# Analyst's team-building pool: non-legendary base stat total at or above this.
TEAM_POOL_MIN_TOTAL = 500
SPEED_TIERS = ["<60", "60–79", "80–99", "100+"]
SPEED_TIER_FLAGS = ["speed_lt60", "speed_60_79", "speed_80_99", "speed_100plus"]
TOTAL_BANDS = ["<300", "300–399", "400–499", "500+"]


GLUED_FORM = re.compile(r"^(.+?[a-z])(?=[A-Z0-9])(.*(?:Forme|Cloak|Mode|Size|Male|Confined))$")


def species_of(base_raw: str) -> str:
    """Base rows sometimes glue a form onto the species ("DeoxysNormal Forme")."""
    m = GLUED_FORM.match(base_raw)
    return m.group(1) if m else base_raw


def clean_name(raw: str, species: str) -> str:
    """Source names concatenate species + form ("VenusaurMega Venusaur")."""
    if raw == species or not raw.startswith(species):
        return raw
    suffix = raw[len(species):]
    if suffix.startswith(("Mega ", "Primal ")) or suffix.endswith(species):
        return suffix
    if suffix.startswith(species):
        suffix = suffix[len(species):].strip()
    return f"{species} ({suffix})"


def main() -> None:
    raw_bytes = SRC.read_bytes()
    sha = hashlib.sha256(raw_bytes).hexdigest()
    src_rows = list(csv.DictReader(raw_bytes.decode("utf-8").splitlines()))

    first_by_dex: dict[str, str] = {}
    out = []
    for idx, r in enumerate(src_rows, start=1):
        dex = r["#"]
        is_first = dex not in first_by_dex
        if is_first:
            first_by_dex[dex] = r["Name"]
        base_raw = first_by_dex[dex]
        species = species_of(base_raw)
        name = clean_name(r["Name"], species)
        form_kind = (
            "Base" if is_first
            else "Mega/Primal" if name.startswith(("Mega ", "Primal "))
            else "Alternate form"
        )
        stats = {key: int(r[src]) for src, key, _ in STATS}
        total = int(r["Total"])
        assert total == sum(stats.values()), r["Name"]
        top_stat = max(STATS, key=lambda s: stats[s[1]])[2]
        legendary = r["Legendary"] == "True"
        type1, type2 = r["Type 1"], (r["Type 2"] or None)
        base = {
            "form_id": f"f{idx:03d}",
            "dex": int(dex),
            "name": name,
            "species": species,
            "form_kind": form_kind,
            "is_primary_form": is_first,
            "type1": type1,
            "type2": type2 or "None",
            "is_dual_type": type2 is not None,
            "generation": f"Gen {r['Generation']}",
            "legendary": legendary,
            "status": "Legendary" if legendary else "Non-legendary",
            "total": total,
            **stats,
            "phys_minus_spec": stats["attack"] - stats["sp_atk"],
            "top_stat": top_stat,
            "total_legendary": total if legendary else None,
            "total_nonlegendary": None if legendary else total,
        }
        for slot, t in (("Primary", type1), ("Secondary", type2)):
            if t is None:
                continue
            out.append({
                "row_id": f"{base['form_id']}-{slot[0].lower()}",
                "type": t,
                "type_slot": slot,
                "in_primary_slot": slot == "Primary",
                "in_secondary_slot": slot == "Secondary",
                **base,
            })

    base_total = {row["dex"]: row["total"] for row in out if row["form_kind"] == "Base"}
    mega_dex = {row["dex"] for row in out if row["form_kind"] == "Mega/Primal"}
    for row in out:
        row["has_mega_form"] = row["dex"] in mega_dex
        row["mega_uplift"] = row["total"] - base_total[row["dex"]] if row["form_kind"] == "Mega/Primal" else None
        row["offense"] = max(row["attack"], row["sp_atk"])
        row["bulk"] = round((row["hp"] + row["defense"] + row["sp_def"]) / 3, 1)

    # Archetypes: z-scores against the 721 base forms (one row per species), applied to every form.
    species_rows = [r for r in out if r["is_primary_form"] and r["type_slot"] == "Primary"]
    scale = {}
    for k in ("offense", "bulk", "speed"):
        vals = [r[k] for r in species_rows]
        scale[k] = (statistics.fmean(vals), statistics.pstdev(vals))
    z = lambda r, k: (r[k] - scale[k][0]) / scale[k][1]
    for row in out:
        glass = z(row, "offense") - z(row, "bulk")
        tank = z(row, "bulk") - max(z(row, "offense"), z(row, "speed"))
        row["glass_score"] = round(glass, 3)
        row["tank_score"] = round(tank, 3)
        row["is_glass_cannon"] = glass >= ARCHETYPE_GAP and z(row, "offense") >= ARCHETYPE_FLOOR
        row["is_tank"] = tank >= ARCHETYPE_GAP and z(row, "bulk") >= ARCHETYPE_FLOOR
        row["archetype"] = "Glass cannon" if row["is_glass_cannon"] else "Tank" if row["is_tank"] else "Neither"

        row["in_team_pool"] = not row["legendary"] and row["total"] >= TEAM_POOL_MIN_TOTAL
        sp = row["speed"]
        row["speed_tier"] = "<60" if sp < 60 else "60–79" if sp < 80 else "80–99" if sp < 100 else "100+"
        for tier, flag in zip(SPEED_TIERS, SPEED_TIER_FLAGS):
            row[flag] = row["speed_tier"] == tier
        t = row["total"]
        row["total_band"] = "<300" if t < 300 else "300–399" if t < 400 else "400–499" if t < 500 else "500+"
        row["total_mono"] = None if row["is_dual_type"] else t
        row["total_dual"] = t if row["is_dual_type"] else None

    q = lambda name, label, unit=None, **kw: {"name": name, "type": "quantitative", "label": label, "nullable": False, **({"unit": unit} if unit else {}), **kw}
    c = lambda name, label, levels=None, **kw: {"name": name, "type": "categorical", "label": label, "nullable": False, **({"levels": levels} if levels else {}), **kw}
    b = lambda name, label, **kw: {"name": name, "type": "boolean", "label": label, "nullable": False, **kw}
    schema = [
        c("row_id", "Row id", description="form_id + type slot (p/s); primary key"),
        c("type", "Type", TYPES, description="The type in this slot"),
        c("type_slot", "Type slot", ["Primary", "Secondary"], description="Filter to Primary for one row per form"),
        b("in_primary_slot", "In primary slot", description="Pivot helper: sum() counts primary-slot rows"),
        b("in_secondary_slot", "In secondary slot", description="Pivot helper: sum() counts secondary-slot rows"),
        c("form_id", "Form id", description="One per source CSV row (800 forms)"),
        q("dex", "National Dex #"),
        c("name", "Name", description="Cleaned display name (form suffix split from species)"),
        c("species", "Species"),
        c("form_kind", "Form kind", FORM_KINDS, description="Base = first CSV row for the dex number"),
        b("is_primary_form", "Base form", description="True for the 721 first-listed forms (one per species)"),
        c("type1", "Type 1", TYPES),
        c("type2", "Type 2", TYPES + ["None"]),
        b("is_dual_type", "Dual-type"),
        c("generation", "Generation", GENS),
        b("legendary", "Legendary", description="Source flag; mythicals are flagged inconsistently"),
        c("status", "Status", ["Non-legendary", "Legendary"]),
        q("total", "Base stat total", "points"),
        *[q(key, label, "points") for _, key, label in STATS],
        q("phys_minus_spec", "Attack − Sp. Atk", "points", description=">0 physical lean, <0 special lean"),
        c("top_stat", "Highest stat", [s[2] for s in STATS], description="Argmax of the six stats; ties go to the earlier stat in HP→Speed order"),
        q("total_legendary", "Total (legendary only)", "points", nullable=True, description="Pivot helper: total if legendary else null"),
        q("total_nonlegendary", "Total (non-legendary only)", "points", nullable=True, description="Pivot helper: total if not legendary else null"),
        b("has_mega_form", "Species has a Mega/Primal", description="True on every form of a dex number that has a Mega/Primal"),
        q("mega_uplift", "Mega/Primal uplift", "points", nullable=True, description="Total minus base form total; Mega/Primal rows only"),
        q("offense", "Offense", "points", description="max(Attack, Sp. Atk): the better attacking stat"),
        q("bulk", "Bulk", "points", description="mean(HP, Defense, Sp. Def), 1 decimal"),
        q("glass_score", "Glass-cannon score", "SD", description="z(offense) − z(bulk), z over the 721 base forms"),
        q("tank_score", "Tank score", "SD", description="z(bulk) − max(z(offense), z(speed)), z over the 721 base forms"),
        b("is_glass_cannon", "Glass cannon", description=f"glass_score ≥ {ARCHETYPE_GAP} and z(offense) ≥ {ARCHETYPE_FLOOR}"),
        b("is_tank", "Tank", description=f"tank_score ≥ {ARCHETYPE_GAP} and z(bulk) ≥ {ARCHETYPE_FLOOR}"),
        c("archetype", "Archetype", ARCHETYPES, description="Glass cannon / Tank / Neither (mutually exclusive)"),
        b("in_team_pool", "Team-building pool", description=f"Non-legendary and total ≥ {TEAM_POOL_MIN_TOTAL} (analyst's definition)"),
        c("speed_tier", "Speed tier", SPEED_TIERS),
        *[b(flag, f"Speed {tier}", description="Pivot helper: mean() gives the tier's share") for tier, flag in zip(SPEED_TIERS, SPEED_TIER_FLAGS)],
        c("total_band", "Total band", TOTAL_BANDS),
        q("total_mono", "Total (mono-type only)", "points", nullable=True, description="Pivot helper: total if mono-type else null"),
        q("total_dual", "Total (dual-type only)", "points", nullable=True, description="Pivot helper: total if dual-type else null"),
    ]

    built_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    body = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    dataset = {
        "grain": "one row per Pokémon form × type slot (filter type_slot = Primary for one row per form)",
        "hash": hashlib.sha256(body.encode()).hexdigest()[:12],
        "builtAt": built_at,
        "status": "ready",
        "schema": schema,
        "rows": out,
    }
    header = json.dumps({k: v for k, v in dataset.items() if k != "rows"}, ensure_ascii=False, indent=1)
    row_lines = ",\n".join("  " + json.dumps(row, ensure_ascii=False, separators=(",", ":")) for row in out)
    OUT.write_text(f'{header[:-2]},\n "rows": [\n{row_lines}\n ]\n}}\n', encoding="utf-8")
    MANIFEST.write_text(
        json.dumps(
            {
                "script": "src/data/transforms/build_canonical.py",
                "inputs": [{"path": "data/Pokemon.csv", "sha256": sha, "rows": len(src_rows)}],
                "params": {
                    "grain": "form x type slot",
                    "base_form_rule": "first CSV row per dex number",
                    "archetype_gap_sd": ARCHETYPE_GAP,
                    "archetype_floor_sd": ARCHETYPE_FLOOR,
                    "team_pool_min_total": TEAM_POOL_MIN_TOTAL,
                    "archetype_scale": {k: {"mean": round(m, 3), "sd": round(s, 3)} for k, (m, s) in scale.items()},
                },
                "output": {"path": "src/data/canonical.json", "rows": len(out), "hash": dataset["hash"]},
                "builtAt": built_at,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(out)} rows from {len(src_rows)} forms; hash {dataset['hash']}")


if __name__ == "__main__":
    main()
