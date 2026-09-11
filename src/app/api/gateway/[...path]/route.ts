import { NextRequest } from 'next/server';
import { cache, type Entry } from '@/lib/gateway-proxy-cache';

// Caching reverse-proxy for the gateway.
//
// Why this exists:
//  1. The upstream gateway emits a malformed CORS header, so the browser can't
//     call it directly — we proxy server-side (same-origin to the browser).
//  2. The data is near-static (budgets change ~monthly) but every uncached call
//     costs 200–400ms and the gateway cold-starts. So we cache in-process with
//     stale-while-revalidate semantics — no Redis/CDN required.
//
// Cache lives in the Node process: shared across all users on this instance,
// cleared on redeploy. Only successful (2xx) responses are cached, so a
// transient gateway 404/500 never poisons the cache.

export const dynamic = 'force-dynamic'; // we manage caching ourselves

const GATEWAY = 'https://app.democracydistributed.com/api/gateway';
const FRESH_MS = 5 * 60 * 1000; // serve from cache, no upstream call
const STALE_MS = 60 * 60 * 1000; // serve stale + refresh in background
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600';

interface Upstream {
  ok: boolean;
  status: number;
  body: string;
  contentType: string;
}

// Fetch upstream, retrying once after a short delay to absorb cold-start blips.
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

function respond(entry: Entry, hit: string): Response {
  return new Response(entry.body, {
    status: entry.status,
    headers: {
      'content-type': entry.contentType,
      'cache-control': CACHE_CONTROL,
      'x-dd-cache': hit,
    },
  });
}

function noStore(body: string, status: number, contentType: string, hit: string): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': contentType, 'cache-control': 'no-store', 'x-dd-cache': hit },
  });
}

// Pledge submissions (and any other writes) must never be cached or retried
// silently — a retry could double-submit a form. Straight pass-through.
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (params.path || []).join('/');
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
    return new Response(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'gateway unreachable' }), {
      status: 502,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (params.path || []).join('/');
  const reqUrl = new URL(req.url);
  // `_fresh=1` is a proxy-only signal, stripped before it reaches the cache
  // key or the upstream gateway — used right after a write (e.g. a pledge
  // submission) so the submitter's own refetch isn't served a stale count.
  const bypassCache = reqUrl.searchParams.get('_fresh') === '1';
  reqUrl.searchParams.delete('_fresh');
  const search = reqUrl.search; // includes leading '?', or '' if now empty
  const key = path + search;
  const url = `${GATEWAY}/${path}${search}`;
  const now = Date.now();
  const cached = cache.get(key);

  // Fresh hit.
  if (!bypassCache && cached && now - cached.ts < FRESH_MS) {
    return respond(cached, 'HIT');
  }

  // Stale hit: serve immediately, refresh in the background (once).
  if (!bypassCache && cached && now - cached.ts < STALE_MS) {
    if (!cached.revalidating) {
      cached.revalidating = true;
      fetchUpstream(url)
        .then((u) => {
          if (u.ok) cache.set(key, { body: u.body, status: u.status, contentType: u.contentType, ts: Date.now() });
          else cached.revalidating = false;
        })
        .catch(() => {
          cached.revalidating = false;
        });
    }
    return respond(cached, 'STALE');
  }

  // Miss (or fully expired): fetch synchronously.
  try {
    const u = await fetchUpstream(url);
    if (u.ok) {
      const entry: Entry = { body: u.body, status: u.status, contentType: u.contentType, ts: now };
      cache.set(key, entry);
      return respond(entry, 'MISS');
    }
    // Upstream error — prefer a stale-but-good copy over surfacing the error.
    if (cached) return respond(cached, 'STALE-ERR');
    return noStore(u.body, u.status, u.contentType, 'ERR');
  } catch {
    if (cached) return respond(cached, 'STALE-ERR');
    return noStore(JSON.stringify({ error: 'gateway unreachable' }), 502, 'application/json', 'ERR');
  }
}
