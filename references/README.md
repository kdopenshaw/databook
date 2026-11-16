# Bundled reference materials

These folders ship with DataBook. They are **not** ambient background.

**`SKILL.md` is the router:** it tells the agent *when* to open which file. Do not read this tree wholesale at session start. Canonical routing table lives in `SKILL.md` (see also `databook-spec.md` §11 for package layout).

| Path | What it is | Typical skill route |
|------|------------|---------------------|
| `anthropic-data-plugin/skills/` | Vendored [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) `data/` skills (Apache-2.0), trimmed for DataBook | Profiling, explore, validate, stats, chart-type tables (`create-viz`, `data-visualization`) |
| `anthropic-dataviz/` | `METHOD.md` form-first digest (+ `UPSTREAM.md`) | Chart form selection (then plugin `create-viz` / `data-visualization`) |

See each folder’s `UPSTREAM.md` for pin/provenance.
