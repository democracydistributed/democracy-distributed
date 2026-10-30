import { NextRequest } from 'next/server';
import { cache, isCacheEnabled, TTL_MS, type Entry } from '@/lib/gateway-proxy-cache';

// Reverse-proxy for the gateway.
//
// Why this exists: the upstream gateway emits a malformed CORS header, so the browser
// can't call it directly — we proxy server-side (same-origin to the browser).
//
// Caching is OFF by default (see GATEWAY_CACHE_ENABLED in .env.example / the docs repo's build/caching.md).
// With it off, every request is a plain pass-through — no Map, no TTL, always current.
// Flip it on only for a specific endpoint that's a proven, measured slowness problem;
// when on, this uses a plain TTL (see gateway-proxy-cache.ts) — no stale-while-revalidate,
// no background refresh. That older, fancier model added real complexity (a
// per-lambda-instance Map, a `_fresh=1` bypass, a sessionStorage workaround on the
// client) that wasn't proven to be worth it. If a specific endpoint's staleness ever
// matters again, solve it deliberately then — don't reach for that machinery by default.

export const dynamic = 'force-dynamic';

const GATEWAY = 'https://app.democracydistributed.com/api/gateway';

interface Upstream {
  ok: boolean;
  status: number;
  body: string;
  contentType: string;
}

// Fetch upstream, retrying once after a short delay to absorb cold-start blips.
// This is about reliability, not caching — kept regardless of the cache switch.
async function fetchUpstream(url: string): Promise<Upstream> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok && res.status >= 500 && attempt === 0) {
        // transient server error — retry once
        await delay(400);
        continue;
      }
      return {
        ok: res.ok,
        status: res.status,
        body: await res.text(),
        contentType: res.headers.get('content-type') || 'application/json',
      };
    } catch (e) {
      lastErr = e;
      if (attempt === 0) await delay(400);
    }
  }
  throw lastErr ?? new Error('gateway unreachable');
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// `no-store` on every response — this proxy's own cache (or lack of one) is the only
// caching decision that should exist. The browser must never independently cache a
// gateway response on top of that (see the docs repo's build/caching.md "browser cache" writeup).
function respond(body: string, status: number, contentType: string, hit: string): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': contentType, 'cache-control': 'no-store', 'x-dd-cache': hit },
  });
}

// This proxy is for reads. The only write it still relays is the pilot signup form,
// which hasn't moved to an authenticated route yet — every other POST is refused so
// the proxy can't be used as a backdoor around a dedicated write route (suggestions
// now go through src/app/api/suggestions, which attaches a real identity).
const POST_ALLOWED = new Set(['pilot/signup']);

// Writes must never be cached or retried silently — a retry could double-submit a form.
// Straight pass-through, unaffected by the cache switch.
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (params.path || []).join('/');
  if (!POST_ALLOWED.has(path)) {
    return respond(JSON.stringify({ error: 'method not allowed' }), 405, 'application/json', 'DENY');
  }
  const search = req.nextUrl.search;
  const url = `${GATEWAY}/${path}${search}`;
  const body = await req.text();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': req.headers.get('content-type') || 'application/json' },
      body,
      cache: 'no-store',
    });
    const text = await res.text();
    return respond(text, res.status, res.headers.get('content-type') || 'application/json', 'PASS');
  } catch {
    return respond(JSON.stringify({ error: 'gateway unreachable' }), 502, 'application/json', 'ERR');
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (params.path || []).join('/');
  const search = req.nextUrl.search;
  const url = `${GATEWAY}/${path}${search}`;

  if (!isCacheEnabled()) {
    try {
      const u = await fetchUpstream(url);
      return respond(u.body, u.status, u.contentType, 'DISABLED');
    } catch {
      return respond(JSON.stringify({ error: 'gateway unreachable' }), 502, 'application/json', 'ERR');
    }
  }

  const key = path + search;
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && now - cached.ts < TTL_MS) {
    return respond(cached.body, cached.status, cached.contentType, 'HIT');
  }

  try {
    const u = await fetchUpstream(url);
    if (u.ok) {
      const entry: Entry = { body: u.body, status: u.status, contentType: u.contentType, ts: now };
      cache.set(key, entry);
      return respond(entry.body, entry.status, entry.contentType, 'MISS');
    }
    // Upstream error — prefer a stale-but-good copy over surfacing the error.
    if (cached) return respond(cached.body, cached.status, cached.contentType, 'STALE-ERR');
    return respond(u.body, u.status, u.contentType, 'ERR');
  } catch {
    if (cached) return respond(cached.body, cached.status, cached.contentType, 'STALE-ERR');
    return respond(JSON.stringify({ error: 'gateway unreachable' }), 502, 'application/json', 'ERR');
  }
}
