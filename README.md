# DataBook

A fixed React scaffold plus an AI skill: one canonical JSON table, markdown tabs, and agent-authored charts in `src/charts/`.

**Skill:** [`SKILL.md`](./SKILL.md) · Node **20+**.

```bash
npm install
npm run dev                         # http://127.0.0.1:5173/
npm run ok                          # artifacts + query smoke
npm run print-block -- <chartId>
```

Init sample: hello-world markdown and an exponential curve (`y = 2^x`). Real books: commit a short transform and `understanding.md`, not a pretty-printed fact dump in `canonical.json`.
