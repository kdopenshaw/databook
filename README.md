# DataBook

Repo-local **chart books**: a fixed React scaffold plus an AI skill that profiles experiment data, writes one canonical JSON of normalized rows, and emits a row-based document (markdown + side-by-side charts).

**Start here:** [`SKILL.md`](./SKILL.md) is the product entrypoint. Invoking the skill runs **databook init automatically**, then profiles → charts → emits `rows.json`. Spec: [`chart-book-spec.md`](./chart-book-spec.md).

Charts use **[Recharts](https://recharts.org/)** (locked). Markdown uses **[react-markdown](https://github.com/remarkjs/react-markdown)**. Typography uses the **[`geist`](https://www.npmjs.com/package/geist)** font package; **Tabs** are a Geist-styled scaffold primitive (`BookTabs`). Sidebar, page shell, row container, markdown block, and chart slot are custom. Dark mode is CSS variables + class `dark` on `<html>` — no theme-provider library.

## What’s in this repo

| Path | Role |
|------|------|
| [`SKILL.md`](./SKILL.md) | **Central** skill: auto-init, pipeline, reference router |
| [`chart-book-spec.md`](./chart-book-spec.md) | Product & implementation spec |
| [`references/`](./references/) | Bundled Anthropic data plugin + dataviz (read when the skill routes you there) |
| `src/components/` | Scaffold UI (layout, rows, theme toggle, Recharts helpers) |
| `src/data/` | `canonical.json`, `rows.json`, `understanding.md`, `runQuery.ts` |
| [`scripts/install-skill.sh`](./scripts/install-skill.sh) | Link this repo into Cursor / Codex skill folders |

## Install the skill

Clone this repo once, then link it so Cursor can discover `/databook`:

```bash
git clone https://github.com/kdopenshaw/databook.git
cd databook
./scripts/install-skill.sh
```

That writes `~/.cursor/skills/databook` and `${CODEX_HOME:-~/.codex}/skills/databook` (symlink package). Open a **new** Agent chat and invoke `/databook`.

### Skill package vs target project

| | |
|--|--|
| **Skill package** | This clone (and the linked folder under `~/.cursor/skills/databook`). Treat it as a **read-only template**: docs, references, and the scaffold to copy from. |
| **Target project** | The workspace where you want a chart book (your experiment repo). The skill **copies** the scaffold there and writes `canonical.json` / `rows.json` / analysis into **that** tree. |

Do **not** edit books or dump experiment data into `~/.cursor/skills/databook` (or into this product clone’s working tree unless you are developing DataBook itself).

### Team / repo install

To commit discovery into a project so teammates get the skill without a personal install:

```bash
./scripts/install-skill.sh --project
```

That creates `.cursor/skills/databook` with **relative** symlinks back into this repo (or into a nested checkout). Commit that folder with the project.

Flags: `--cursor-only`, `--codex-only`, `--help`.

A Cursor Marketplace plugin may ship later; it is **optional** and **not required**. Symlink install is the supported path today.

## How to use

Invoke `/databook` on your experiment workspace. **Init runs automatically** — there is no separate init command. The skill:

1. Copies the scaffold into the **target** workspace (if needed) and installs a **trivial** sample (Overview tab, “hello world” markdown, one exponential curve) so the app boots.
2. Profiles your data (routing into `references/anthropic-data-plugin/` as needed).
3. Writes `src/data/canonical.json` and self-describing rows with **inlined** query objects **in the target project**.
4. Chooses Recharts compositions using routed viz guidance under `references/anthropic-dataviz/`.

When the skill initializes a chart book **inside another project**, it does **not** generate a README in that folder. This root README is for the DataBook product repo only.

## Run a book

In the **target** chart-book directory (after init), not in the skill install folder:

```bash
npm install
npm run dev      # Vite
npm run build
npm test         # vitest (runQuery)
```

## Document model (short)

- **Tabs** — group rows into sections; every book includes them (synced with Sidebar).
- **Sidebar** — jump between tab sections when the book grows large.
- **Markdown row** — full width, react-markdown.
- **Component row** — flex container for one or more chart blocks.
- Each chart block is **self-describing**: title, flexible `recharts` spec, encoding, and **query object inlined** (no `queries.json` / recipe file).
