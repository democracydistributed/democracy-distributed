import { NextRequest, NextResponse } from 'next/server';
import { createRecord, getWriteIdentity, recordExists, ReauthRequired, type RecordValue } from '@/lib/corteza-write';
import { getAnonId } from '@/lib/anon-id';

// The one write path for new Suggestions, logged in or not
// (Documentation/feedback-write-path-spec_v4.md). Replaces the old public
// Corteza gateway POST, which recorded every submission with no owner.

export const dynamic = 'force-dynamic';

const SUGGESTION_MODULE_ID = '404433918159355905';
const ORGANIZATION_MODULE_ID = '387847963242790913';
// Site-wide feedback (the footer form) has no org page, so it's filed here.
const DD_CENTRAL_ORG_ID = '394662382766391297';

// Must match the Suggestion module's Category select options exactly.
const CATEGORIES = new Set(['This data looks wrong', 'Feature idea', "Something's broken", 'Other']);
const MAX_TEXT = 5000;
const MAX_SUBJECT = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // Allow-list (spec §5c): only these fields are read from the request. Anything
  // else sent — Status, Anon_Fingerprint, whatever — is ignored, not passed along.
  // Org-page suggestions send a subject; footer feedback sends a category instead.
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const category = typeof body.category === 'string' ? body.category : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const orgId = (typeof body.orgId === 'string' && body.orgId.trim()) || DD_CENTRAL_ORG_ID;

  if (!text) return fail('Please write a suggestion first.', 400);
  if (text.length > MAX_TEXT) return fail(`Please keep it under ${MAX_TEXT} characters.`, 400);
  if (subject.length > MAX_SUBJECT) return fail(`Please keep the subject under ${MAX_SUBJECT} characters.`, 400);
  if (category && !CATEGORIES.has(category)) return fail('Unknown category', 400);
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) return fail("That email address doesn't look right.", 400);

  try {
    const identity = await getWriteIdentity(req);

    // The org ID comes from the page, so it's client-controlled: confirm it's a
    // real Organization record before attaching the suggestion to it (spec §7).
    if (!(await recordExists(identity, ORGANIZATION_MODULE_ID, orgId))) {
      return fail('Unknown organization', 400);
    }

    const values: RecordValue[] = [
      { name: 'Description', value: text },
      { name: 'Organization', value: orgId },
    ];
    if (subject) values.push({ name: 'Subject', value: subject });
    if (category) values.push({ name: 'Category', value: category });
    // Email is only for anonymous visitors who want a reply — a member's record
    // is already tied to their account, so ignore it even if one is sent.
    if (email && identity.kind === 'anonymous') values.push({ name: 'Email', value: email });
    // Status is left out on purpose: the module's own default sets it to "New".
    if (identity.kind === 'anonymous') values.push({ name: 'Anon_Fingerprint', value: getAnonId(req) });

    const id = await createRecord(identity, SUGGESTION_MODULE_ID, values);
    return NextResponse.json({ ok: true, id }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    if (e instanceof ReauthRequired) {
      console.warn('[api/suggestions] reauth required:', e.reason);
      return fail(e.message, 401, { reauth: true });
    }
    console.error('[api/suggestions] create failed:', e);
    return fail('Something went wrong, please try again.', 502);
  }
}
