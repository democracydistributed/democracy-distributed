import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

// `dd_anon_id`: a random per-browser ID for anonymous visitors (spec §8).
// Deliberately generic — not Suggestion-specific — so anonymous vote dedup can
// reuse it later. Set lazily, only when a browser first submits something.
//
// Stored as `<uuid>.<signature>` so a visitor can't forge or swap in someone
// else's ID; only the uuid part is ever written to a record (Anon_Fingerprint).
//
// Like getWriteIdentity(), only call this from a Route Handler or Server Action.

export const ANON_COOKIE = 'dd_anon_id';
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days, matching Wikipedia's temp accounts

function sign(id: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  // Labelled so this signature can never be confused with any other use of AUTH_SECRET.
  return createHmac('sha256', secret).update(`dd_anon_id:${id}`).digest('base64url');
}

/** Returns this browser's anon ID, minting one (and setting the cookie) if the
 *  browser doesn't have a validly signed one yet. */
export function getAnonId(req: NextRequest): string {
  const raw = req.cookies.get(ANON_COOKIE)?.value;
  if (raw) {
    const dot = raw.lastIndexOf('.');
    const id = raw.slice(0, dot);
    const sig = Buffer.from(raw.slice(dot + 1));
    const expected = Buffer.from(sign(id));
    if (dot > 0 && sig.length === expected.length && timingSafeEqual(sig, expected)) return id;
  }

  const id = randomUUID();
  cookies().set(ANON_COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    secure: req.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return id;
}
