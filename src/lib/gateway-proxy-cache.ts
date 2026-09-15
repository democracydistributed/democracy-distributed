// Shared cache store for the gateway reverse-proxy (src/app/api/gateway/[...path]/route.ts).
//
// Pulled out of the route file so the admin clear-cache route can reach it too —
// Next.js route files may only export recognized handlers (GET, dynamic, etc.),
// not arbitrary helper functions.
//
// Gated entirely by GATEWAY_CACHE_ENABLED (see .env.example / CACHING.md) — the kill
// switch defaults OFF, meaning this cache does nothing until someone deliberately turns
// it on for a proven, measured slowness problem.
//
// NOTE: on Vercel this Map lives per lambda instance, not in one shared process.
// clearGatewayProxyCache() only clears whichever instance handles that request —
// if multiple instances are warm, others keep serving stale entries until they
// naturally recycle. Acceptable for now; revisit with a shared store (Redis/KV)
// only if that inconsistency becomes an actual visible problem.

export interface Entry {
  body: string;
  status: number;
  contentType: string;
  ts: number;
}

/** Plain TTL cache — no stale-while-revalidate. A miss (including an expired entry)
 *  always does a synchronous fetch. Simpler than the old fresh/stale/background-refresh
 *  model, which added complexity nothing here was proven to need. */
export const TTL_MS = 5 * 60 * 1000;

export function isCacheEnabled(): boolean {
  return process.env.GATEWAY_CACHE_ENABLED === 'true';
}

// Module-level cache: persists across requests in the same server process.
export const cache = new Map<string, Entry>();

export function clearGatewayProxyCache() {
  cache.clear();
}
