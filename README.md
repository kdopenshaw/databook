# DataBook

DataBook is a React starter and coding-agent skill for interactive data reports.
A book brings the analysis, charts, and source data together so readers can
follow a finding back to the rows that support it.

The included example uses a tiny synthetic dataset to show how the same table
and chart component can support a full view and a filtered view.
[Explore the live DataBook demo](https://my-site-five-mu.vercel.app/projects/databook).

## Run locally

Use [Node.js 24](https://nodejs.org/en/download).

```sh
git clone https://github.com/kdopenshaw/databook.git
cd databook
npm ci
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173). Setup needs no
credentials or external data. The development server writes book edits to
`src/data/rows.json`, so run it locally.

## Make a book

| File | What to change |
| --- | --- |
| `src/data/canonical.json` | The typed table shared by every chart |
| `src/data/understanding.md` | The source, grain, units, and assumptions |
| `src/data/rows.json` | Pages, tabs, Markdown, and each chart's query |
| `src/charts/` | React chart components that receive the query results |
| `index.html` | Browser title and description |

Use [SKILL.md](SKILL.md) with your coding agent for the full workflow. To
register the skill locally, run `./scripts/install-skill.sh` from this clone.
In-app prompt rows require a signed-in Codex CLI. Opening a prompt session in
the terminal uses Ghostty on macOS.

## Verify and share

```sh
npm test
npm run ok
npm run print-block -- early-steps
npm run build
```

`npm run ok` checks the book and runs each chart query. `print-block` prints
the rows for a specific chart. Publish the `dist/` directory on any static
host. For a deployment under a subpath, pass it to Vite with
`npm run build -- --base=/your-path/`. Edits on a static deployment are stored
in the visitor's browser.
