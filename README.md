# DataBook

A fixed React scaffold plus an AI skill that profiles experiment data, writes one canonical JSON of normalized rows, and emits a row-based chart book (markdown + Recharts side-by-side charts).

**Skill entrypoint:** [`SKILL.md`](./SKILL.md) — invoke `/databook` after linking this clone with `./scripts/install-skill.sh`. Spec: [`chart-book-spec.md`](./chart-book-spec.md).

**Prerequisite:** Node.js **20+**.

## Quick start

In a chart-book directory (after `/databook` init):

```bash
npm install
npm run dev   # preview at http://127.0.0.1:5173/
npm run ok    # artifacts + live chart lint + query smoke
```
