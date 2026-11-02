import { NextRequest, NextResponse } from 'next/server';
import { createRecord, getWriteIdentity, ReauthRequired, updateRecord, type RecordValue } from '@/lib/corteza-write';
import { getAnonId } from '@/lib/anon-id';
import { FEELINGS } from '@/lib/feelings';
import { findMine, orgExists, parseTarget, reactionKey, REACTION_MODULE_ID, verifiedCategoryId } from '@/lib/reactions-server';

// Saves a reaction (Reasonable / Surprised / Confused / Concerned) on a drawer screen.
// One reaction per visitor per item: reacting again changes the earlier one.
//   - Logged-in members are matched on who created the record.
//   - Anonymous visitors are matched on the signed dd_anon_id cookie, so a page
//     refresh can't react twice. (Clearing cookies can: that's inherent to anonymous.)
// Reading (the visitor's own reaction, totals, who reacted) is ./summary.

export const dynamic = 'force-dynamic';

const REACTIONS = new Set<string>(FEELINGS.map((f) => f.value));

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

  const t = parseTarget(body);
  if (typeof t === 'string') return fail(t, 400);

  const reaction = typeof body.reaction === 'string' ? body.reaction : '';
  if (!REACTIONS.has(reaction)) return fail('Unknown reaction', 400);

  // Optional: the amount the visitor was looking at. Anything that isn't a plain finite number is dropped.
  const amountSeen = typeof body.amountSeen === 'number' && Number.isFinite(body.amountSeen) ? body.amountSeen : null;

  try {
    const identity = await getWriteIdentity(req);
    const anonId = identity.kind === 'anonymous' ? getAnonId(req) : null;

    // Three independent Corteza lookups, each 150-600 ms, so run them together rather than one
    // after another. The org ID and category ID come from the page, so they're checked: the org
    // must be a real Organization, and the category ID a genuine Budget Category for this item
    // (otherwise the reaction is still saved, just without the link).
    const [orgOk, existing, categoryId] = await Promise.all([
      orgExists(identity, t.orgId),
      findMine(identity, anonId, t),
      verifiedCategoryId(identity, t, body.categoryId),
    ]);
    if (!orgOk) return fail('Unknown organization', 400);

    if (existing) {
      // Keep whatever else is on the record (Status, any Budget Category link), change only what changed.
      // An earlier reaction saved before the link existed picks it up here.
      const merged: Record<string, string> = { ...existing.values, Reaction: reaction };
      if (amountSeen !== null) merged.Amount_Seen = String(amountSeen);
      if (categoryId) merged.related_budget_category = categoryId;
      const values: RecordValue[] = Object.entries(merged).map(([name, value]) => ({ name, value }));
      await updateRecord(identity, REACTION_MODULE_ID, existing.recordID, values);
      return NextResponse.json({ ok: true, mine: reaction, id: existing.recordID, changed: true }, { headers: { 'cache-control': 'no-store' } });
    }

    // Status is left out on purpose: the module's own default sets it to "Active".
    const values: RecordValue[] = [
      { name: 'Reaction', value: reaction },
      { name: 'Organization', value: t.orgId },
      { name: 'related_to', value: reactionKey(t.relatedTo) },
    ];
    if (t.year !== null) values.push({ name: 'Year', value: String(t.year) });
    if (amountSeen !== null) values.push({ name: 'Amount_Seen', value: String(amountSeen) });
    if (anonId) values.push({ name: 'Anon_Fingerprint', value: anonId });
    if (categoryId) values.push({ name: 'related_budget_category', value: categoryId });

    const id = await createRecord(identity, REACTION_MODULE_ID, values);
    return NextResponse.json({ ok: true, mine: reaction, id, changed: false }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    if (e instanceof ReauthRequired) {
      console.warn('[api/reactions] reauth required:', e.reason);
      return fail(e.message, 401, { reauth: true });
    }
    console.error('[api/reactions] save failed:', e);
    return fail('Something went wrong, please try again.', 502);
  }
}
