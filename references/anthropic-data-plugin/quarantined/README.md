# Quarantined Anthropic plugin skills

These skills shipped with the upstream Anthropic `data/` plugin but **fight the DataBook model**. They stay in-tree for provenance / optional human reference; they are **not** under `skills/` so Cursor does not recursively discover them as agent skills.

| Folder | Why quarantined |
|--------|-----------------|
| `build-dashboard/` | Builds standalone HTML dashboards with filters — replaces DataBook’s `rows.json` + Recharts scaffold. Spec §11.4 forbids using Anthropic dashboard builders as a second layout system. |
| `data-context-extractor/` | Scaffolds *other* company data-analysis skills; not part of the DataBook init → profile → emit pipeline. |

Do **not** move these back under `skills/` without updating `SKILL.md` routing and accepting the product conflict.

Active viz / analysis skills remain under `skills/` (`create-viz`, `data-visualization`, `explore-data`, `validate-data`, `analyze`, …). Form-first digest: `../anthropic-dataviz/METHOD.md` (sibling folder under `references/`).
