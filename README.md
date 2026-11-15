# DataBook

Repo-local **chart books**: a fixed React scaffold plus an AI skill that profiles experiment data, writes one canonical JSON of normalized rows, and emits a row-based document (markdown + side-by-side charts).

Charts use **[Recharts](https://recharts.org/)** (locked). Markdown uses **[react-markdown](https://github.com/remarkjs/react-markdown)**. Chrome uses **[Geist](https://vercel.com/geist)** for typography/spacing tokens and **Tabs**; sidebar, page shell, row container, markdown block, and chart slot are custom primitives on those tokens. Dark mode is CSS variables + a class on the root element — no theme-provider library.

## What’s in this repo

| Path | Role |
|------|------|
| [`chart-book-spec.md`](./chart-book-spec.md) | Product & implementation spec |
| [`skill.md`](./skill.md) | Skill entrypoint: pipeline, **automatic init**, and **reference router** |
| [`references/`](./references/) | Bundled Anthropic data plugin + dataviz guidance (read when the skill routes you there) |
| `src/components/` | Scaffold UI (layout, rows, theme toggle, Recharts helpers) |
| `src/data/` | `canonical.json`, `rows.json`, understanding notes |

## How to use

Invoke the DataBook / chart-book skill on your experiment. **Init runs automatically** — there is no separate init command to remember. The skill:

1. Ensures the nested scaffold exists and installs a **trivial** sample (hello-world markdown + one exponential curve) so the app boots.
2. Profiles your data (routing into `references/anthropic-data-plugin/` as needed).
3. Writes `src/data/canonical.json` and self-describing rows with **inlined** query objects.
4. Chooses Recharts compositions using routed viz guidance under `references/anthropic-dataviz/`.

When the skill initializes a chart book **inside another project**, it does **not** generate a README in that folder. This root README is for the DataBook product repo only.

## Document model (short)

- **Tabs** (Geist) — group rows into sections; every book includes them.
- **Sidebar** — jump between tab groups/sections when the book grows large.
- **Markdown row** — full width, react-markdown.
- **Component row** — flex container for one or more chart blocks (charts may sit side by side).
- Each chart block is **self-describing**: title, Recharts wiring, encoding, and **query object inlined** (no separate query/recipe file).

See the spec for schemas, invariants, and acceptance criteria.
