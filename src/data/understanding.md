# Understanding — Harbor / Market / Campus cafes (demo)

Synthetic H1 2025 line-item tickets for three cafes. Built so agents can show a real multi-tab DataBook with varied chart forms.

## Grain

One row per **line item** on a ticket (`date`, `cafe`, `category`, `item`, `amount`, …).

## Population

All tickets from 2025-01-01 through ~June (180 days). No refunds modeled.

## Patterns baked into the generator

- **Campus** volume ramps through the semester.
- **Harbor** spikes on weekends.
- **Member share** drifts upward over the half-year.
- Longer waits (esp. Food / weekends) pull ratings down slightly.

## Caveats

Demo data only — not a real POS export. Replace `canonical.json` and charts when pointing at a live experiment.
