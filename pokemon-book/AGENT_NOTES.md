# AGENT_NOTES — Pokémon reaudit R1

## Dev server

```bash
cd pokemon-book
npm install
npm run dev -- --port 5180 --host 127.0.0.1
```

URL: **http://127.0.0.1:5180/**

## Rebuild

```bash
python3 src/data/transforms/build_canonical.py
python3 src/data/transforms/build_rows.py
npm test
npm run lint:charts
```

## Friction vs skill (R1)

- Stock RechartsSpec was enough (horizontal bars, stackId, yDomain/xDomain, colorBy, xType/xShift). **No renderer/App/theme forks.**
- `scaffold-files.txt` does not copy `scripts/`; `package.json` still references `npm run check` → `scripts/check-book.mjs`. Visual `check` is unavailable unless scripts are copied manually.
- `conventions.template.test.ts` ships in the scaffold and stays soft on conventions; book-specific honesty lives in `book.test.ts`.
- Histogram empty-bin alignment works via `xType: "number"` + shared `xDomain` + `xShift` (half bin step) as documented — no custom mark needed.
- Pivot-style legendary counts use nullable helper columns + `count(column)` (non-null only); skill docs mention this pattern indirectly via aggregate helpers.

## Population reminder

Default charts: `is_primary_form = true`. Type charts: `type_1` only. See `src/data/understanding.md` and `BookDocument.conventions`.
