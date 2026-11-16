# Anthropic dataviz method (summary)

Upstream: Anthropic’s chart/dashboard design skill (Claude Code `/dataviz`, also circulated as the open-artifacts `dataviz` skill). Rights remain with Anthropic; this file is a condensed implementer digest so agents in DataBook apply the same procedure without leaving the repo.

**Rule:** color comes last. Most bad charts pick colors first.

## Procedure (in order)

1. **Pick the form** from the data’s job — magnitude, identity, polarity, a single headline, change-over-time. Sometimes the answer is a stat tile, not a chart.
2. **Assign color by the job it does** — categorical (identity), sequential (magnitude), diverging (polarity), or status (state). Categorical hues in a fixed order; never cycle randomly.
3. **Validate the palette** with a computable check (CVD separation, chroma/lightness floors, contrast vs surface)—do not eyeball.
4. **Apply mark specs** — thin marks, clear baselines, gaps between fills, selective direct labels.
5. **Add hover by default** for interactive surfaces (tooltip / crosshair); hit targets larger than marks.
6. **Accessibility pass** — legend for ≥2 series; direct-label ≤4; never color-alone identity; offer a table view when useful.
7. **Render and look** — validators check color, not layout; catch collisions and overflow by inspection.

## Anti-patterns

Avoid pie/donut for fine comparisons (prefer bar); never 3D; prefer small multiples over dual axes; do not rotate axis labels 90° if avoidable; titles should name the metric (or insight) with units/period/source nearby.

## How DataBook uses this

- Before choosing chart types or encodings, read this method **and** the plugin skills:
  - `references/anthropic-data-plugin/skills/create-viz/`
  - `references/anthropic-data-plugin/skills/data-visualization/`
- Map recommendations onto DataBook’s **stock RechartsSpec** (`LineChart` / `BarChart` / `AreaChart` / `ScatterChart` and marks `Line` / `Bar` / `Area` / `Scatter`). Forms outside that set (heatmap, sankey, etc.) need a different cut or prose — do not invent unsupported marks.
- Runtime still renders via the DataBook stock renderer — these references guide *decisions*, not a second renderer.
