# DataBook

A fixed React scaffold plus an AI skill that profiles experiment data, writes one canonical JSON of normalized rows, and emits a row-based DataBook (markdown + Recharts side-by-side charts).

**Skill entrypoint:** [`SKILL.md`](./SKILL.md) — invoke `/databook` after linking this clone with `./scripts/install-skill.sh`. Spec: [`databook-spec.md`](./databook-spec.md).

**Prerequisite:** Node.js **20+**.

## Quick start

In a databook directory (after `/databook` init):

```bash
npm install
npm run dev   # preview at http://127.0.0.1:5173/
npm run ok    # artifacts + live chart lint + query smoke
```
