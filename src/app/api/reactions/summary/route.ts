import { NextRequest, NextResponse } from 'next/server';
import { countRecords, findRecords, getWriteIdentity, ReauthRequired } from '@/lib/corteza-write';
import { FEELINGS } from '@/lib/feelings';
import { peekAnonId } from '@/lib/anon-id';
import { authorLabel, findMine, itemQuery, parseTarget, REACTION_MODULE_ID } from '@/lib/reactions-server';

// Totals and recent responses for one item, for the "N reacted" panel.
// Authors are shown as a Corteza handle (members) or an anonymous handle like
// anon_7f3a9c (anonymous visitors); never an email address or a cookie value.

export const dynamic = 'force-dynamic';

// How many recent responses to send. The panel shows the latest few for whichever
// face is selected, so this needs to be comfortably more than that.
const RECENT = 30;

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: { 'cache-control': 'no-store' } });
}

export async function GET(req: NextRequest) {
  const p = Object.fromEntries(req.nextUrl.searchParams) as Record<string, string>;
  const t = parseTarget({ orgId: p.orgId, year: p.year, relatedTo: p.relatedTo });
  if (typeof t === 'string') return fail(t, 400);

  try {
    const identity = await getWriteIdentity(req);
    const base = `${itemQuery(t)} AND Status!='Hidden'`;

    // One request answers everything the drawer needs, all fetched together: the four totals,
    // the most recent responses, and this visitor's own reaction (peek only: never sets a cookie).
    const [totals, recent, mine] = await Promise.all([
      Promise.all(FEELINGS.map((f) => countRecords(identity, REACTION_MODULE_ID, `${base} AND Reaction='${f.value}'`))),
      findRecords(identity, REACTION_MODULE_ID, base, { limit: RECENT, sort: 'createdAt DESC' }),
      findMine(identity, peekAnonId(req), t),
    ]);

    // Shown with the time of the latest change (a visitor who switched face counts as new),
    // so order by that, not by when the record was first created.
    const latest = (
      await Promise.all(
        recent.map(async (rec) => ({
          reaction: rec.values.Reaction,
          who: await authorLabel(identity, rec),
          when: rec.updatedAt ?? rec.createdAt,
        })),
      )
    ).sort((a, b) => (b.when ?? '').localeCompare(a.when ?? ''));

    const counts = Object.fromEntries(FEELINGS.map((f, i) => [f.value, totals[i]]));
    return NextResponse.json(
      { ok: true, total: totals.reduce((a, b) => a + b, 0), counts, latest, mine: mine?.values.Reaction ?? null },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (e) {
    if (e instanceof ReauthRequired) return fail(e.message, 401, { reauth: true });
    console.error('[api/reactions/summary] failed:', e);
    return fail('Something went wrong, please try again.', 502);
  }
}
