import { NextRequest, NextResponse } from 'next/server';
import { getWriteIdentity, lookupUserHandle, ReauthRequired } from '@/lib/corteza-write';
import { isPublicHandle, loadMemberActivity } from '@/lib/member-activity';

// The signed-in member's own activity, for the account page. Never cached, and never
// answers for anyone else: it reads the caller's own login cookie.

export const dynamic = 'force-dynamic';

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function GET(req: NextRequest) {
  try {
    const identity = await getWriteIdentity(req);
    if (identity.kind !== 'member' || !identity.userId) return fail('Not signed in', 401);

    // ?brief=1 is for the nav menu and the owner bar, which only need to know whose page is whose.
    if (req.nextUrl.searchParams.get('brief')) {
      const handle = await lookupUserHandle(identity, identity.userId);
      return NextResponse.json({ ok: true, handle: isPublicHandle(handle) ? handle : null }, { headers: { 'cache-control': 'no-store' } });
    }

    const [handle, activity] = await Promise.all([lookupUserHandle(identity, identity.userId), loadMemberActivity(identity, identity.userId)]);
    return NextResponse.json(
      // `handle` is only set when it's safe to link to a public page.
      { ok: true, handle: isPublicHandle(handle) ? handle : null, ...activity },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (e) {
    if (e instanceof ReauthRequired) return fail(e.message, 401, { reauth: true });
    console.error('[api/me] failed:', e);
    return fail('Something went wrong, please try again.', 502);
  }
}
