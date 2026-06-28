# Democracy Distributed — WikiGov Org Page (Next.js)

A Next.js (App Router, TypeScript) port of the standalone `03_org-page` mockup,
including the D3 Sankey financial-flow chart, drill-down drawer, decision-chain
trace panel, and light/dark theming.

## Requirements

- **Node.js 18.18+** (Next.js 14).

## Run

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

- Live data is fetched from the gateway using `?orgId=<id>` (defaults to the
  Riverdale board id when omitted).
- `?org=toronto` loads the bundled City of Toronto 2024 demo dataset offline —
  handy if the gateway is unreachable.

## Architecture

| Concern | Where |
|---|---|
| Route entry | `src/app/page.tsx` → `OrgPage` |
| Orchestration (fetch, tabs, state) | `src/components/OrgPage.tsx` (client) |
| D3 Sankey (imperative render in `useEffect`) | `src/components/SankeyChart.tsx` |
| Drawer back-stack logic | `src/hooks/useDrawer.ts` |
| Drawer + trace UI (JSX, was `innerHTML`) | `src/components/Drawer.tsx` |
| Theme (class on `<html>`, no-flash inline script) | `src/context/ThemeContext.tsx` |
| Pure helpers (`buildGraph`, tree sums, `fmt`) | `src/lib/sankey.ts`, `src/lib/format.ts` |
| Gateway fetch helpers | `src/lib/api.ts` |
| Toronto fallback data | `src/lib/toronto.ts` |
| Styles (ported 1:1, `body.light` → `html.light`) | `src/app/globals.css` |

## Notes on the conversion

- **D3 stays imperative.** The `render()` routine is ported nearly line-for-line
  into a `useEffect` that re-runs on `data` / `theme` / window-resize. The chart
  is `dynamic(..., { ssr: false })` because D3 reads `window` during layout.
- **No globals.** `DATA`, `drawerStack`, and `isBillionScale` became React state /
  a custom hook / a memoized formatter.
- **Theme without flash.** A blocking inline script in `<head>` sets `html.light`
  before paint; the React context just syncs and toggles it. CSS selectors were
  rebased from `body.light` to `html.light` so the pre-paint class works.
- **XSS-safe drawer.** The old `escHtml(...) + innerHTML` strings are now plain
  JSX, which escapes by default — `escHtml` is no longer needed.
