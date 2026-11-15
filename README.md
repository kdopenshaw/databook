# DataBook

Repo-local **chart books**: a fixed React scaffold plus an AI skill that profiles experiment data, writes one canonical JSON of normalized rows, and emits a row-based document (markdown + side-by-side charts).

**Start here:** [`SKILL.md`](./SKILL.md) is the product entrypoint. Invoking the skill runs **databook init automatically** (or the **extend existing book** path), then profiles → charts → emits `rows.json`. Spec: [`chart-book-spec.md`](./chart-book-spec.md). Live types: [`src/data/types.ts`](./src/data/types.ts).

Charts use **[Recharts](https://recharts.org/)** (locked). Markdown uses **[react-markdown](https://github.com/remarkjs/react-markdown)**. Typography uses the **[`geist`](https://www.npmjs.com/package/geist)** font package; **Tabs** are a Geist-styled scaffold primitive (`BookTabs`). Dark mode is CSS variables + class `dark` on `<html>` — no theme-provider library.

**Prerequisite:** Node.js **20+** on PATH.

## What’s in this repo

| Path | Role |
|------|------|
| [`SKILL.md`](./SKILL.md) | **Central** skill: auto-init, extend path, pipeline, RechartsSpec, reference router |
| [`chart-book-spec.md`](./chart-book-spec.md) | Product & implementation spec |
| [`references/`](./references/) | Bundled Anthropic data plugin + dataviz (read when the skill routes you there) |
| `src/components/` | Scaffold UI (layout, rows, theme toggle, Recharts helpers) |
| `src/data/` | `canonical.json`, `rows.json`, `understanding.md`, `runQuery.ts`, `chartLint.ts` |
| [`scripts/install-skill.sh`](./scripts/install-skill.sh) | Link this repo into Cursor / Codex skill folders |
| [`scripts/check-book.mjs`](./scripts/check-book.mjs) | Blocking lint + optional HTTP / Playwright visual check |
| [`scripts/extend-check.mjs`](./scripts/extend-check.mjs) | Fail-closed extend-path gate (understanding + conventions + check script) |

## Install the skill

Clone this repo once, then link it so Cursor can discover `/databook`:

```bash
git clone https://github.com/kdopenshaw/databook.git
cd databook
./scripts/install-skill.sh
```

That writes `~/.cursor/skills/databook` and `${CODEX_HOME:-~/.codex}/skills/databook` (symlink package). Open a **new** Agent chat and invoke `/databook`.

**Never run `npm install` inside the skill install folder** — symlinks would write `node_modules` into this clone. Copy the scaffold into your target book, then install there.

### Skill package vs target project

| | |
|--|--|
| **Skill package** | This clone (and the linked folder under `~/.cursor/skills/databook`). Treat it as a **read-only template**: docs, references, and the scaffold to copy from. |
| **Target project** | The workspace where you want a chart book (your experiment repo). The skill **copies** the scaffold there and writes `canonical.json` / `rows.json` / analysis into **that** tree. |

### Team / repo install

To commit discovery into a **target** project so teammates get the skill without a personal install:

```bash
# from the target project directory (not only from inside this clone)
/path/to/databook/scripts/install-skill.sh --project
```

That creates **`$PWD/.cursor/skills/databook`** with relative symlinks back to the DataBook clone. Commit that folder with the project.

Flags: `--cursor-only`, `--codex-only`, `--help`.

## How to use

Invoke `/databook` on your experiment workspace. **Init runs automatically** when no book exists. If a book already exists, follow the skill’s **fail-closed extend** path (`understanding.md` → conventions → `extend-check` → validate-data/create-viz → lint → **`npm run check`**).

When the skill initializes a chart book **inside another project**, it does **not** generate a README in that folder. This root README is for the DataBook product repo only. Init copies **`scripts/`** so `npm run check` works in every book.

## Run a book

In the **target** chart-book directory (after init), not in the skill install folder:

```bash
npm install
npm run dev         # Vite
npm run build
npm test            # vitest (runQuery, chart lint, merge helpers)
npm run lint:charts # chart honesty lint only
npm run check       # lint:charts (blocking on extend)
npm run extend-check
npm run check:visual -- --url http://127.0.0.1:5173/   # Playwright / chromium screenshot
```

## Document model (short)

- **Tabs** — primary section nav (`BookTabs`, sticky, keyboard arrows, overflow fade + scroll cue, `?tab=` history).
- **Pages** (optional) — Sidebar on desktop; mobile page switcher when sidebar is hidden. Tabs show that page’s sections. Without pages, no sidebar (avoids duplicating tabs).
- **Markdown row** — full width; `createdBy: "user"` gets an analyst callout.
- **Component row** — flex/wrap container for one or more chart blocks (aligned headers). Related measures use **`scaleGroup`** + shared `yDomain`.
- Each chart block is **self-describing** or a **`ref`** to another chart id (Summary without copied queries).
- Query helpers: **`share` / `count_if` / `sum_if` / `mean_if`** for rates and conditional aggregates.
- **`npm run lint:charts`** rejects truncated bar axes, unstated line zooms, unshared sibling scales, unknown marks, and near-flat “trend” bands.
