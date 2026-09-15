# Caching ecosystem — as of 2026-09-14 (post-simplification)

This describes the caching setup **after** the 2026-09-14 simplification. For how it got here —
three uncoordinated caching layers, a browser-caching bug, a `sessionStorage` workaround, and the
timing data that justified this rewrite — see git history on this file (the previous version is
preserved there as the "before" snapshot).

## The short version

**Caching is off by default, everywhere, via one switch.** Every read goes straight to Corteza.
There is no invalidation logic to reason about, because there is nothing to invalidate.

```
Browser  →  Next.js proxy / Server Component  →  Corteza (source of truth)
                    (no caching unless GATEWAY_CACHE_ENABLED=true)
```

## Why: what we learned before simplifying

- Real Corteza response times, measured directly with `curl`: `/orgs` 0.3–1.2s, `/suggestions`
  0.4–0.5s, `/people` 1.0–1.5s, `/items` 1.1–2.4s, `/sankey` 1.6–2.5s, `/projects` 3.7–4.8s.
  `/projects`'s workflow is structurally as simple as `/items`'s — no joins, no loops — so the
  extra latency isn't a fixable query bug on our end; likely table size or DAL indexing on
  Corteza's side, invisible to this codebase.
- The old setup had **two independent 5-minute caches** on two different code paths (SSR via
  Next's Data Cache, client tabs via an in-process `Map`) that didn't know about each other.
- A real bug: posting a suggestion didn't invalidate anything, so other viewers kept seeing the
  pre-submission list for up to 5 minutes no matter how many times they refreshed. A per-poster
  `sessionStorage` workaround papered over this for the person who posted, but not for anyone else.
- A second real bug: the proxy's `Cache-Control` header (meant to describe the server-side cache
  to shared caches) was *also* a valid signal for the browser's own `fetch()` to cache responses
  client-side — which silently replayed the first-ever response to a URL forever, independent of
  either server-side cache.
- The deciding factor: **this app doesn't control the biggest source of staleness.** Organizations,
  items, projects, and financial data are edited directly in Corteza (CSV imports, admin edits),
  not through any endpoint this app owns. No "invalidate on write" scheme can react to those edits,
  because the app has no way to know they happened. Given that, and given caching had already cost
  more (in bugs and confusion) than it demonstrably saved, the simplest honest answer was: turn it
  off, and only turn it back on, deliberately, for a specific endpoint with a proven need.

## How it works now

**The switch:** `GATEWAY_CACHE_ENABLED` (env var, see `.env.example`). Unset or anything other than
`"true"` = fully off. This one variable controls both places caching could otherwise happen:

### 1. Client-side proxy — `src/app/api/gateway/[...path]/route.ts` + `src/lib/gateway-proxy-cache.ts`

- **Switch off (default):** every `GET` is a plain pass-through to Corteza. No `Map`, no TTL. The
  retry-once-on-5xx logic in `fetchUpstream` still runs — that's about absorbing Corteza cold-start
  blips, unrelated to caching, and stays on regardless of the switch.
- **Switch on:** a single flat TTL cache (`TTL_MS`, currently 5 minutes) — no stale-while-revalidate,
  no background refresh, no `_fresh=1` bypass. Just: is the cached entry younger than the TTL? If
  yes, serve it; if no, fetch and re-cache. Deliberately simpler than the old model.
- Every response — cached or not — carries `x-dd-cache` for inspection: `DISABLED`, `HIT`, `MISS`,
  or `STALE-ERR` (served a stale-but-good copy because a re-fetch failed).
- `POST` is always a pass-through, cached or not — writes are never cached or retried (a retry could
  double-submit a form).
- **Still-known limitation:** on Vercel this `Map` lives per lambda instance. If caching is ever
  turned on there and multiple instances are warm, they don't share a cache. Not addressed — only
  worth a shared store (Redis/KV) if that inconsistency becomes a real, observed problem for
  whatever endpoint the switch gets turned on for.

### 2. Server Components (SSR) — `src/lib/server-api.ts`

- **Switch off (default):** `cache: 'no-store'` on every fetch. Every server-rendered page load
  (org metadata, Sankey, etc.) gets current data.
- **Switch on:** uses Next.js's own built-in fetch Data Cache (`next: { revalidate: 300, tags:
  ['gateway-data'] }`) — not a second hand-rolled store. There's exactly one cache implementation in
  this app now (the `Map` above) plus Next's own built-in one; nothing custom was added for this path.

### 3. Browser caching — `src/lib/api.ts`

Every client-side fetch helper goes through one shared `gatewayFetch()` wrapper that always sets
`cache: 'no-store'`. This is unconditional — not gated by the switch — because the browser
independently caching a response is never something we want, whether or not the proxy itself is
caching. This is what closes the second bug described above, for every endpoint, not just the one
that first exposed it.

### 4. Admin clear-cache route — `src/app/api/admin/clear-cache/route.ts`

Unchanged in shape, `GET /api/admin/clear-cache?key=<ADMIN_CACHE_KEY>`. Clears both caches
described above. A no-op in practice while the switch is off — kept as the manual escape hatch for
if/when the switch is turned on and something needs a manual flush (e.g. right after a direct
Corteza edit, which this app has no automatic way to react to).

## What was removed

- The old two-tier fresh/stale/background-refresh cache model — replaced by a single flat TTL.
- The `_fresh=1` query-param bypass mechanism in the proxy route.
- The `sessionStorage`-based per-poster "show my own post" workaround in `SuggestionsTab.tsx`
  (`fetchSuggestions`'s `fresh` parameter, `fetchPilotCounts`'s `fresh` parameter). No longer
  needed — with caching off, there's nothing for a poster to be bypassing.
- The `revalidating` flag and background-refresh `.catch()` logic in the proxy cache entry type.

## If a specific page's slowness ever becomes a real problem again

1. Confirm it's actually Corteza that's slow (a `curl` timing check against
   `https://app.democracydistributed.com/api/gateway/<endpoint>` directly, bypassing this app
   entirely — see the numbers above for a baseline).
2. Set `GATEWAY_CACHE_ENABLED=true`.
3. If that specific endpoint needs a different TTL than the shared 5-minute default, that's a
   deliberate follow-up change to `TTL_MS` / `REVALIDATE_SECONDS` — not a reason to reach for the
   old multi-tier machinery again.
4. If the data behind that endpoint is something this app itself writes to (unlike organizations/
   items/projects/financial data, which are Corteza-direct edits), consider real invalidation on
   that specific write path rather than relying on the TTL alone to catch up.
