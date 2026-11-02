import { cookies } from 'next/headers';
import { encode, getToken, type JWT } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Server-side write helpers for Corteza's compose REST API.
//
// Every write goes through ONE code path; the only thing that differs between a
// logged-in member and an anonymous visitor is which bearer token is attached
// (see Documentation/feedback-write-path-spec_v4.md §2). Kept generic — not
// Suggestion-specific — so /pilot/signup and future write routes reuse it.
//
// A write route needs exactly one call: `const identity = await getWriteIdentity(req)`.
// Token renewal and saving the login cookie happen in here, never in the route.
//
// Only call this from a Route Handler or Server Action: renewal saves the login
// cookie via cookies().set(), which Next.js only allows there. It also reads the
// anonymous service account's client secret, so never import it client-side.
// (Those env vars have no NEXT_PUBLIC_ prefix, so Next.js won't ship their
// values to the browser even by mistake — they'd just be undefined.)

const CORTEZA = 'https://app.democracydistributed.com';
export const DD_NAMESPACE_ID = '375482071595876355';

/** `userId` is the member's Corteza user ID (the login's `sub`), used to find records they created. */
export type WriteIdentity = { kind: 'member'; token: string; userId?: string } | { kind: 'anonymous'; token: string };

export class ReauthRequired extends Error {
  /** Why — for server logs only, never shown to the user. */
  reason: string;
  constructor(reason: string) {
    super('Your login has expired, please log in again.');
    this.reason = reason;
  }
}

// ---- Anonymous service-account token (client_credentials) ----

let anonToken: { value: string; expiresAt: number } | null = null;

// Requests that arrive together (e.g. a drawer's several lookups) share one token
// request instead of each minting their own.
let anonTokenInFlight: Promise<string> | null = null;

export async function getAnonymousToken(): Promise<string> {
  // Reuse until a minute before expiry. Per-lambda-instance memory only; a cold
  // start just mints a fresh one, which is cheap.
  if (anonToken && Date.now() < anonToken.expiresAt - 60_000) return anonToken.value;
  if (!anonTokenInFlight) anonTokenInFlight = mintAnonymousToken().finally(() => { anonTokenInFlight = null; });
  return anonTokenInFlight;
}

async function mintAnonymousToken(): Promise<string> {
  const id = process.env.CORTEZA_ANON_CLIENT_ID;
  const secret = process.env.CORTEZA_ANON_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Anonymous write client is not configured');

  const res = await fetch(`${CORTEZA}/auth/oauth2/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'api' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Anonymous token request failed (HTTP ${res.status})`);
  const data = await res.json();
  if (!data?.access_token) throw new Error('Anonymous token response had no access_token');

  anonToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) || 300) * 1000 };
  return anonToken.value;
}

// ---- Identity resolution ----

/** Returns the member's own Corteza token if they're logged in, otherwise the
 *  anonymous service account's. Renews an expired member token and saves it back
 *  into the login cookie; if renewal fails, ends the login and throws
 *  ReauthRequired rather than quietly posting as anonymous under their nose.
 *
 *  Reads the token with getToken() rather than auth(): auth() only returns what
 *  the session callback returns, and putting the token there would also expose
 *  it to the browser at /api/auth/session (spec §5a). */
export async function getWriteIdentity(req: NextRequest): Promise<WriteIdentity> {
  const jwt = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    // Auth.js names the cookie `__Secure-...` on https; getToken defaults to the
    // non-secure name, so it has to be told which one to look for.
    secureCookie: isSecure(req),
  });

  if (jwt?.accessToken) {
    // Corteza access tokens last 2h while the website login lasts 30 days, so an
    // expired token is normal for a returning member.
    if (jwt.expiresAt && Date.now() / 1000 >= jwt.expiresAt - 30) {
      const renewed = await renewOnce(jwt, req);
      const token = renewed.accessToken as string;
      return { kind: 'member', token, userId: userIdFor(token, renewed.sub) };
    }
    return { kind: 'member', token: jwt.accessToken, userId: userIdFor(jwt.accessToken, jwt.sub) };
  }
  return { kind: 'anonymous', token: await getAnonymousToken() };
}

/** The Corteza user ID (digits) behind a member's login. Read from the access token's `sub`
 *  claim first: Corteza issues JWT access tokens whose `sub` is the numeric user ID, and the
 *  token is the very thing Corteza will act on. The login profile's copy of `sub` is only a
 *  fallback, since it didn't reliably hold a usable ID. This only decodes the token (it came
 *  out of our own encrypted cookie); Corteza itself rejects any forged token on use. */
function userIdFor(accessToken: string, fallback?: string): string | undefined {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8'));
    if (typeof payload?.sub === 'string' && /^\d{1,20}$/.test(payload.sub)) return payload.sub;
  } catch {
    /* not a JWT we can read: fall through to the profile's value */
  }
  return typeof fallback === 'string' && /^\d{1,20}$/.test(fallback) ? fallback : undefined;
}

// ---- Member token renewal ----
//
// Deliberately NOT done in auth.ts's jwt callback: that callback also runs while
// rendering pages, where Next.js can't save cookies. If Corteza treats refresh
// tokens as single-use, a renewal there would use up the old refresh token
// without storing the new one, silently breaking the login.

// Requests that arrive together for the same login share one renewal instead of
// each spending the (possibly single-use) refresh token. Per server instance only;
// a collision across instances just means that member logs in again.
const inFlight = new Map<string, Promise<JWT>>();

async function renewOnce(jwt: JWT, req: NextRequest): Promise<JWT> {
  const key = jwt.refreshToken;
  if (!key) {
    clearSessionCookies();
    throw new ReauthRequired('member token expired, no refresh token');
  }
  let pending = inFlight.get(key);
  if (!pending) {
    pending = refreshMemberToken(jwt).finally(() => setTimeout(() => inFlight.delete(key), 10_000));
    inFlight.set(key, pending);
  }
  try {
    const renewed = await pending;
    await saveSession(renewed, req);
    return renewed;
  } catch (e) {
    // Renewal failed (refresh token expired after ~72h, or revoked): end the login
    // so the site stops showing the member as signed in.
    clearSessionCookies();
    throw e;
  }
}

async function refreshMemberToken(jwt: JWT): Promise<JWT> {
  const id = process.env.CORTEZA_CLIENT_ID;
  const secret = process.env.CORTEZA_CLIENT_SECRET;
  const res = await fetch(`${CORTEZA}/auth/oauth2/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: jwt.refreshToken as string }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    throw new ReauthRequired(`refresh failed (HTTP ${res.status}: ${data?.error ?? 'no body'})`);
  }
  return {
    ...jwt,
    accessToken: data.access_token,
    // Keep the old refresh token if Corteza didn't issue a new one.
    refreshToken: data.refresh_token ?? jwt.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (Number(data.expires_in) || 3600),
  };
}

// ---- Saving / ending the login cookie ----
//
// Mirrors Auth.js's own cookie naming, size limit and lifetime (30-day default
// session) so the rewritten cookie is indistinguishable from one it set itself.

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const CHUNK_SIZE = 4096 - 160;

function isSecure(req: NextRequest) {
  return req.nextUrl.protocol === 'https:';
}

function sessionCookieName(req: NextRequest) {
  return isSecure(req) ? '__Secure-authjs.session-token' : 'authjs.session-token';
}

// Ends the website login by deleting its cookie. Auth.js splits large cookies
// into name.0, name.1, ...; every piece goes, since a stale one left behind would
// corrupt a login saved over it.
function clearSessionCookies() {
  const jar = cookies();
  for (const c of jar.getAll()) {
    if (/^(__Secure-)?authjs\.session-token(\.\d+)?$/.test(c.name)) jar.delete(c.name);
  }
}

/** Corteza refused a member's token before it was due to expire — e.g. the member
 *  was disabled or their sessions were revoked in Corteza admin. End the website
 *  login too, so they aren't left looking signed in with every write failing. */
function rejectedMemberToken(when: string): never {
  clearSessionCookies();
  throw new ReauthRequired(`Corteza rejected member token (401) on ${when}`);
}

async function saveSession(token: JWT, req: NextRequest) {
  const name = sessionCookieName(req);
  const value = await encode({ token, secret: process.env.AUTH_SECRET!, salt: name, maxAge: SESSION_MAX_AGE });
  const opts = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: isSecure(req), maxAge: SESSION_MAX_AGE };

  clearSessionCookies();
  const jar = cookies();
  if (value.length <= CHUNK_SIZE) {
    jar.set(name, value, opts);
  } else {
    for (let i = 0; i * CHUNK_SIZE < value.length; i++) {
      jar.set(`${name}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), opts);
    }
  }
}

// ---- Compose API calls ----

export interface RecordValue {
  name: string;
  value: string;
}

/** Corteza's error message plus, for validation failures, what was wrong with which field
 *  (e.g. "6 issue(s) found [updateDenied: Reaction, Year]"). For server logs only. */
function describeError(error: { message?: string; details?: { kind?: string; meta?: { field?: string } }[] } | undefined, fallback: string): string {
  if (!error) return fallback;
  const parts = (error.details ?? []).map((d) => `${d.kind ?? 'issue'}: ${d.meta?.field ?? '?'}`);
  return (error.message || fallback) + (parts.length ? ` [${parts.join(', ')}]` : '');
}

function recordUrl(moduleId: string, recordId = '') {
  return `${CORTEZA}/api/compose/namespace/${DD_NAMESPACE_ID}/module/${moduleId}/record/${recordId}`;
}

/** True if the record exists and this identity can read it. */
export async function recordExists(identity: WriteIdentity, moduleId: string, recordId: string): Promise<boolean> {
  if (!/^\d{1,20}$/.test(recordId)) return false;
  const res = await fetch(recordUrl(moduleId, recordId), {
    headers: { authorization: `Bearer ${identity.token}` },
    cache: 'no-store',
  });
  if (res.status === 401 && identity.kind === 'member') rejectedMemberToken('read');
  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  return !!data?.response?.recordID && !data?.error;
}

export interface FoundRecord {
  recordID: string;
  /** Field name to value, first value only (these modules' fields aren't multi-value). */
  values: Record<string, string>;
  /** Corteza user ID of whoever created the record. For records made through the anonymous
   *  service account this is that account's ID, the same for every anonymous visitor. */
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

async function searchRaw(identity: WriteIdentity, moduleId: string, params: Record<string, string>) {
  const res = await fetch(`${recordUrl(moduleId)}?${new URLSearchParams(params)}`, {
    headers: { authorization: `Bearer ${identity.token}` },
    cache: 'no-store',
  });
  if (res.status === 401 && identity.kind === 'member') rejectedMemberToken('search');
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new Error(data?.error?.message || `Record search failed (HTTP ${res.status})`);
  return data?.response ?? {};
}

/** Searches a module with a Corteza query expression, e.g. `Year=2024 AND Organization='123'`.
 *  Corteza's query language can't quote an apostrophe, so only put server-controlled or
 *  apostrophe-free values in `query`; filter anything else in code. */
export async function findRecords(
  identity: WriteIdentity,
  moduleId: string,
  query: string,
  opts: { limit?: number; sort?: string } = {},
): Promise<FoundRecord[]> {
  const params: Record<string, string> = { query, limit: String(opts.limit ?? 200) };
  if (opts.sort) params.sort = opts.sort;
  const resp = await searchRaw(identity, moduleId, params);
  const set: { recordID: string; createdBy: string; createdAt?: string; updatedAt?: string; values?: { name: string; value: string }[] }[] = resp.set ?? [];
  return set.map((r) => ({
    recordID: r.recordID,
    values: Object.fromEntries((r.values ?? []).map((v) => [v.name, v.value])),
    createdBy: r.createdBy,
    createdAt: r.createdAt ?? null,
    updatedAt: r.updatedAt ?? null,
  }));
}

/** How many records match, without fetching them. */
export async function countRecords(identity: WriteIdentity, moduleId: string, query: string): Promise<number> {
  const resp = await searchRaw(identity, moduleId, { query, limit: '1', incTotal: 'true' });
  return Number(resp.filter?.total ?? 0);
}

// ---- Users ----

const HANDLE_TTL_MS = 10 * 60_000;
const handleCache = new Map<string, { handle: string | null; expiresAt: number }>();

/** A member's public handle, or null if they have none or it can't be read. Only the
 *  handle is ever returned: the user record also holds their email, which must never
 *  reach a page. Cached per server instance for 10 minutes. */
export async function lookupUserHandle(identity: WriteIdentity, userId: string): Promise<string | null> {
  if (!/^\d{1,20}$/.test(userId)) return null;
  const hit = handleCache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.handle;

  let handle: string | null = null;
  try {
    const res = await fetch(`${CORTEZA}/api/system/users/${userId}`, {
      headers: { authorization: `Bearer ${identity.token}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const h = data?.response?.handle;
      handle = typeof h === 'string' && h.trim() ? h.trim().slice(0, 64) : null;
    }
  } catch {
    /* a failed lookup falls back to a generic label; don't fail the whole panel */
  }
  handleCache.set(userId, { handle, expiresAt: Date.now() + HANDLE_TTL_MS });
  return handle;
}

/** Replaces a record's values. Send every field you want kept, not just the changed ones.
 *  Corteza's compose API updates with POST on the record's own URL (PUT is refused with 405). */
export async function updateRecord(identity: WriteIdentity, moduleId: string, recordId: string, values: RecordValue[]): Promise<void> {
  const res = await fetch(recordUrl(moduleId, recordId), {
    method: 'POST',
    headers: { authorization: `Bearer ${identity.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values }),
    cache: 'no-store',
  });
  if (res.status === 401 && identity.kind === 'member') rejectedMemberToken('update');
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new Error(describeError(data?.error, `Record update failed (HTTP ${res.status})`));
}

/** One record's values (first value per field), or null if it doesn't exist or this identity can't read it. */
export async function readRecord(identity: WriteIdentity, moduleId: string, recordId: string): Promise<Record<string, string> | null> {
  if (!/^\d{1,20}$/.test(recordId)) return null;
  const res = await fetch(recordUrl(moduleId, recordId), {
    headers: { authorization: `Bearer ${identity.token}` },
    cache: 'no-store',
  });
  if (res.status === 401 && identity.kind === 'member') rejectedMemberToken('read');
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.response?.recordID || data?.error) return null;
  return Object.fromEntries(((data.response.values ?? []) as { name: string; value: string }[]).map((v) => [v.name, v.value]));
}

/** Creates a record and returns its ID. Throws with Corteza's own message on failure. */
export async function createRecord(identity: WriteIdentity, moduleId: string, values: RecordValue[]): Promise<string> {
  const res = await fetch(recordUrl(moduleId), {
    method: 'POST',
    headers: { authorization: `Bearer ${identity.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values }),
    cache: 'no-store',
  });
  if (res.status === 401 && identity.kind === 'member') rejectedMemberToken('create');
  const data = await res.json().catch(() => null);
  // Corteza returns 200 with an `error` object for many failures, so check both.
  if (!res.ok || data?.error || !data?.response?.recordID) {
    throw new Error(describeError(data?.error, `Record create failed (HTTP ${res.status})`));
  }
  return data.response.recordID as string;
}
