# DataBook

A fixed React scaffold plus an AI skill that profiles experiment data, writes one canonical JSON of normalized rows, and emits a row-based DataBook (markdown + agent-authored chart components).

**Skill entrypoint:** [`SKILL.md`](./SKILL.md) — invoke `/databook` after linking this clone with `./scripts/install-skill.sh`. Spec: [`databook-spec.md`](./databook-spec.md).

**Prerequisite:** Node.js **20+**.

## Quick start

In a databook directory (after `/databook` init):

```bash
npm install
npm run dev                         # preview at http://127.0.0.1:5173/
npm run ok                          # artifacts + query smoke
npm run print-block -- <chartId>    # headless query preview (CSV to stdout)
```

Charts live in `src/charts/*.tsx` and are referenced from `rows.json` via `"component": "Name"`.
