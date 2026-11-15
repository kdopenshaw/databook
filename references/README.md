# Bundled reference materials

These folders ship with DataBook. They are **not** ambient background.

**`skill.md` is the router:** it tells the agent *when* to open which file (e.g. data plugin during profiling, dataviz during chart selection). Do not read this tree wholesale at session start.

| Path | What it is | Typical skill route |
|------|------------|---------------------|
| `anthropic-data-plugin/` | Vendored [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) `data/` plugin (Apache-2.0) | Profiling, explore, validate, stats, transforms |
| `anthropic-dataviz/` | `METHOD.md` + `create-viz` / `data-visualization` | Chart form selection and encodings |

See each folder’s `UPSTREAM.md` for pin/provenance. Full routing table: `chart-book-spec.md` §11 and `skill.md`.
