// Shared cache store for the gateway reverse-proxy (src/app/api/gateway/[...path]/route.ts).
//
// Pulled out of the route file so the admin clear-cache route can reach it too —
// Next.js route files may only export recognized handlers (GET, dynamic, etc.),
// not arbitrary helper functions.
//
// NOTE: on Vercel this Map lives per lambda instance, not in one shared process.
// clearGatewayProxyCache() only clears whichever instance handles that request —
// if multiple instances are warm, others keep serving stale entries until they
// naturally recycle. Fine for this app's traffic level; see /api/admin/clear-cache
// for the deliberately-simple tradeoff we made here instead of rearchitecting
// this cache onto Next's shared Data Cache.

export interface Entry {
  body: string;
  status: number;
  contentType: string;
  ts: number;
  revalidating?: boolean;
}

// Module-level cache: persists across requests in the same server process.
export const cache = new Map<string, Entry>();

export function clearGatewayProxyCache() {
  cache.clear();
}
