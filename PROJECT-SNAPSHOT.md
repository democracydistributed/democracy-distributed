# Democracy Distributed — Next.js App Snapshot
_Auto-generated 2026-06-17 03:20. Regenerate with `python generate-snapshot.py`._

## Stack
Next.js app (`democracy-distributed-next` v0.1.0). Key deps: d3-sankey ^0.12.3, d3-selection ^3.0.0, next ^14.2.35, react ^18.3.1, react-dom ^18.3.1.

## Routes (pages)
- `/`
- `/browse`
- `/item-record`

## API endpoints
- `/api/gateway/[...path]`

## File tree (src/)
```
src/
  app/
    api/
      gateway/
        [...path]/
          route.ts
    browse/
      page.tsx
    globals.css
    item-record/
      page.tsx
    layout.tsx
    page.tsx
  components/
    Browse.module.css
    BrowsePage.tsx
    Drawer.tsx
    Footer.tsx
    ItemRecord.jsx
    Nav.tsx
    OrgPage.tsx
    PageHeader.tsx
    SankeyChart.tsx
    ThemeToggle.tsx
    tabs/
      ItemsTab.tsx
      MembersTab.tsx
      ProjectsTab.tsx
  context/
    ThemeContext.tsx
  hooks/
    useDrawer.ts
  lib/
    api.ts
    format.ts
    sankey.ts
    text.ts
    toronto.ts
    types.ts
```

## File purposes
- `src/app/api/gateway/[...path]/route.ts` — Caching reverse-proxy for the gateway.
- `src/app/browse/page.tsx` — Component/function: Page
- `src/app/globals.css` — ── TOKENS ─────────────────────────────────────────────
- `src/app/item-record/page.tsx` — Component/function: ItemRecordPage
- `src/app/layout.tsx` — Root layout: theme script, fonts, metadata
- `src/app/page.tsx` — Component/function: Page
- `src/components/Browse.module.css` — Browse route styles — scoped via CSS Module. Uses the app's global theme
- `src/components/BrowsePage.tsx`
- `src/components/Drawer.tsx` — Component/function: Drawer
- `src/components/Footer.tsx` — Component/function: Footer
- `src/components/ItemRecord.jsx` — ItemRecord.jsx — WikiGov / Democracy Distributed Item Record Page
- `src/components/Nav.tsx` — Component/function: Nav
- `src/components/OrgPage.tsx` — D3 reads window during render, so keep the chart client-only.
- `src/components/PageHeader.tsx` — Collapsible description, mirroring the original 150-char "Read more" toggle.
- `src/components/SankeyChart.tsx` — Component/function: SankeyChart
- `src/components/ThemeToggle.tsx` — Component/function: ThemeToggle
- `src/components/tabs/ItemsTab.tsx` — Component/function: ItemsTab
- `src/components/tabs/MembersTab.tsx` — Component/function: MembersTab
- `src/components/tabs/ProjectsTab.tsx` — Component/function: ProjectsTab
- `src/context/ThemeContext.tsx` — Reads the class set by the blocking inline script in layout.tsx (see
- `src/hooks/useDrawer.ts` — Exports: useDrawer
- `src/lib/api.ts` — Gateway endpoints + typed fetch helpers.
- `src/lib/format.ts` — Currency formatting. Mirrors the original fmt()/detectScale() behaviour:
- `src/lib/sankey.ts` — Recursively sums leaf amounts in the nested tree.
- `src/lib/text.ts` — Strip HTML tags + decode the few common entities. SSR-safe (no DOM).
- `src/lib/toronto.ts` — Demo fallback data, loaded when ?org=toronto is present in the URL.
- `src/lib/types.ts` — A node in the nested revenue/spending tree returned by the API.
