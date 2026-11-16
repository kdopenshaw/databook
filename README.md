# DataBook

A fixed React scaffold plus an AI skill that profiles experiment data, writes one canonical JSON of normalized rows, and presents analysis as tabbed markdown with agent-authored chart components.

**Skill entrypoint:** [`SKILL.md`](./SKILL.md) — invoke `/databook` after linking this clone with `./scripts/install-skill.sh`. Spec: [`databook-spec.md`](./databook-spec.md).

**Prerequisite:** Node.js **20+**.

## Quick start

In a databook directory (after `/databook` init):

```bash
npm install
npm run dev                         # preview at http://127.0.0.1:5173/
npm run ok                          # tabs + chart resolve + query smoke
npm run print-block -- <ChartName>  # headless query preview (CSV to stdout)
npm run snap -- --all               # PNG snapshots under .snaps/
```

## Authoring model

| Piece | Where |
|-------|--------|
| Book meta | `src/book/book.yaml` (`title`, `conventions`, optional `pages`, …) |
| Tabs | `src/book/NN-<id>.md` — front matter `id`/`label`/`page`, GFM body |
| Charts | `src/charts/<Name>.tsx` exports `meta` + default component |
| Wire-up | Fenced ` ```chart ` blocks naming components (optional flex weight) |

Adding a chart is two edits: create `src/charts/Name.tsx`, put `Name` in a `chart` fence.

Legacy `rows.json` books: `npm run rows-to-md` (keeps a converter under `scripts/`).
