import { NextRequest, NextResponse } from 'next/server';
import { getWriteIdentity, readRecord, ReauthRequired } from '@/lib/corteza-write';
import { getAnonId } from '@/lib/anon-id';
import { changeVote, createVote, findMyVote, SUGGESTION_MODULE_ID, type Vote } from '@/lib/votes-server';

// Casts, switches or retracts the visitor's vote on one suggestion.
//   body: { suggestionId: "123…", vote: "up" | "down" | null }   (null = take the vote back)
// The body says what state the visitor wants to end up in, so sending the same thing twice is
// harmless. One vote per visitor per suggestion: members are matched on who created the record,
// anonymous visitors on the signed dd_anon_id cookie (clearing cookies can vote again, inherent
// to anonymous). The suggestion's org is read from the suggestion, not taken from the browser.
// The Score total and the voter's reputation are handled by the Reaction workflow in Corteza.

export const dynamic = 'force-dynamic';

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid request body', 400);
  }

  const suggestionId = typeof body.suggestionId === 'string' ? body.suggestionId.trim() : '';
  if (!/^\d{1,20}$/.test(suggestionId)) return fail('Unknown suggestion', 400);
  const raw = body.vote;
  if (raw !== 'up' && raw !== 'down' && raw !== null) return fail('Unknown vote', 400);
  const want: Vote | null = raw;

  try {
    const identity = await getWriteIdentity(req);
    // Only mint the anonymous cookie for a visitor who is actually voting.
    const anonId = identity.kind === 'anonymous' ? getAnonId(req) : null;

    const suggestion = await readRecord(identity, SUGGESTION_MODULE_ID, suggestionId);
    if (!suggestion) return fail('Unknown suggestion', 404);
    const orgId = suggestion.Organization;
    if (!orgId || !/^\d{1,20}$/.test(orgId)) return fail('Unknown suggestion', 404);

    const existing = await findMyVote(identity, anonId, suggestionId);
    if (existing?.values.Status === 'Hidden') return fail('Your vote on this suggestion was removed by a moderator.', 403);

    if (existing) await changeVote(identity, existing, want);
    else if (want) await createVote(identity, anonId, { id: suggestionId, orgId }, want);
    // else: asked to retract a vote that was never cast, nothing to do.

    // The workflow recounts as part of the save; read the total back so the page shows the real number.
    const after = await readRecord(identity, SUGGESTION_MODULE_ID, suggestionId);
    const score = Number(after?.Score);
    return NextResponse.json({ ok: true, vote: want, score: Number.isFinite(score) ? score : null }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    if (e instanceof ReauthRequired) {
      console.warn('[api/suggestions/vote] reauth required:', e.reason);
      return fail(e.message, 401, { reauth: true });
    }
    console.error('[api/suggestions/vote] failed:', e);
    return fail('Something went wrong, please try again.', 502);
  }
}
