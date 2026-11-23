import { NextRequest, NextResponse } from 'next/server';
import { createRecord, findRecords, getWriteIdentity, recordExists, ReauthRequired, type RecordValue } from '@/lib/corteza-write';
import { authorLabel } from '@/lib/reactions-server';
import { getAnonId, peekAnonId } from '@/lib/anon-id';
import { createVote, findMyVotes, SUGGESTION_MODULE_ID } from '@/lib/votes-server';
import { guessTeamName } from '@/lib/suggestion-team';

// The one write path for new Suggestions, logged in or not
// (Documentation/feedback-write-path-spec_v4.md). Replaces the old public
// Corteza gateway POST, which recorded every submission with no owner.

export const dynamic = 'force-dynamic';

const ORGANIZATION_MODULE_ID = '387847963242790913';
const DEPARTMENT_MODULE_ID = '406759284152467457';

type Dept = { id: string; name: string; parentId: string | null };

/** The org's own active Departments/Teams (one query). Used to turn a guessed team name into
 *  a record ID on create, and record IDs back into names on read. Never throws: the team is a
 *  nicety, so a failed lookup just means no team shows or gets set. */
async function loadDepartments(identity: Awaited<ReturnType<typeof getWriteIdentity>>, orgId: string): Promise<Dept[]> {
  try {
    const recs = await findRecords(identity, DEPARTMENT_MODULE_ID, `Organization='${orgId}'`, { limit: 200 });
    return recs
      .filter((r) => r.values.Department_Name && (!r.values.Status || r.values.Status === 'Active'))
      .map((r) => ({ id: r.recordID, name: r.values.Department_Name, parentId: r.values.Parent_Department || null }));
  } catch (e) {
    if (e instanceof ReauthRequired) throw e;
    console.error('[api/suggestions] could not load departments (continuing without teams):', e);
    return [];
  }
}
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
  // The org this suggestion is about, when that differs from who handles it
  // (e.g. a data request from the TTC page is filed under DD Central).
  const sourceOrgId = typeof body.sourceOrgId === 'string' ? body.sourceOrgId.trim() : '';

  if (!text) return fail('Please write a suggestion first.', 400);
  if (text.length > MAX_TEXT) return fail(`Please keep it under ${MAX_TEXT} characters.`, 400);
  if (subject.length > MAX_SUBJECT) return fail(`Please keep the subject under ${MAX_SUBJECT} characters.`, 400);
  if (sourceOrgId && !/^\d{1,20}$/.test(sourceOrgId)) return fail('Unknown organization', 400);
  if (category && !CATEGORIES.has(category)) return fail('Unknown category', 400);
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) return fail("That email address doesn't look right.", 400);

  try {
    const identity = await getWriteIdentity(req);

    // The org ID comes from the page, so it's client-controlled: confirm it's a
    // real Organization record before attaching the suggestion to it (spec §7).
    if (!(await recordExists(identity, ORGANIZATION_MODULE_ID, orgId))) {
      return fail('Unknown organization', 400);
    }

    if (sourceOrgId && !(await recordExists(identity, ORGANIZATION_MODULE_ID, sourceOrgId))) {
      return fail('Unknown organization', 400);
    }

    const values: RecordValue[] = [
      { name: 'Description', value: text },
      { name: 'Organization', value: orgId },
    ];
    if (sourceOrgId) values.push({ name: 'Source_Organization', value: sourceOrgId });
    if (subject) values.push({ name: 'Subject', value: subject });
    if (category) values.push({ name: 'Category', value: category });
    // Email is only for anonymous visitors who want a reply — a member's record
    // is already tied to their account, so ignore it even if one is sent.
    if (email && identity.kind === 'anonymous') values.push({ name: 'Email', value: email });
    // Status is left out on purpose: the module's own default sets it to "New".
    const anonId = identity.kind === 'anonymous' ? getAnonId(req) : null;
    if (anonId) values.push({ name: 'Anon_Fingerprint', value: anonId });

    // Rule-based team guess (lib/suggestion-team.ts), matched to one of this org's own top-level
    // teams. No clear match, or the org has no such team, means the field is left blank.
    const guess = guessTeamName({ subject, text, category });
    const dept = guess
      ? (await loadDepartments(identity, orgId)).find((d) => !d.parentId && d.name.toLowerCase() === guess.toLowerCase())
      : undefined;

    let id: string;
    let savedDepartment: string | null = dept?.name ?? null;
    try {
      id = await createRecord(identity, SUGGESTION_MODULE_ID, dept ? [...values, { name: 'Department', value: dept.id }] : values);
    } catch (e) {
      // If the team couldn't be saved (e.g. a permission on the new field), never lose the suggestion.
      if (!dept || e instanceof ReauthRequired) throw e;
      console.error('[api/suggestions] create with Department failed, retrying without it:', e);
      id = await createRecord(identity, SUGGESTION_MODULE_ID, values);
      savedDepartment = null;
    }

    // Like Reddit, a new suggestion starts with its author's own upvote (so it shows 1, not 0).
    // It is a real vote the author can take back. The workflow gives no reputation for it, since
    // writing the suggestion already earned that. A failure here must not lose the suggestion.
    let autoVoted = false;
    try {
      await createVote(identity, anonId, { id, orgId }, 'up');
      autoVoted = true;
    } catch (e) {
      console.error('[api/suggestions] author upvote failed (suggestion was saved):', e);
    }
    return NextResponse.json({ ok: true, id, autoVoted, department: savedDepartment }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    if (e instanceof ReauthRequired) {
      console.warn('[api/suggestions] reauth required:', e.reason);
      return fail(e.message, 401, { reauth: true });
    }
    console.error('[api/suggestions] create failed:', e);
    return fail('Something went wrong, please try again.', 502);
  }
}

// Reading suggestions for one org. Runs as the visitor's own identity (a member, or the
// anonymous service account), so Corteza's permissions apply, and builds each card from an
// allow-list: Email and Anon_Fingerprint never leave the server. Authors are shown the same
// way as reactions: a member's handle, an anon_xxxxxx label, or member_xxxx as a fallback.

const MAX_SUGGESTIONS = 500;

export async function GET(req: NextRequest) {
  const orgId = (req.nextUrl.searchParams.get('orgId') ?? '').trim();
  // Digits only, so it can't break out of the quotes in the search query below.
  if (!/^\d{1,20}$/.test(orgId)) return fail('Unknown organization', 400);

  try {
    const identity = await getWriteIdentity(req);
    // The suggestions and this visitor's own votes on them, fetched together. peekAnonId never sets a cookie.
    const [records, myVotes] = await Promise.all([
      findRecords(identity, SUGGESTION_MODULE_ID, `Organization='${orgId}'`, {
        limit: MAX_SUGGESTIONS,
        sort: 'createdAt DESC',
      }),
      // Which arrows to highlight is a nicety: if this lookup fails the list still loads, just
      // without them. The cause is logged. A lapsed member login is still passed up so they're asked to sign in again.
      findMyVotes(identity, peekAnonId(req), orgId).catch((e) => {
        if (e instanceof ReauthRequired) throw e;
        console.error('[api/suggestions] could not load the visitor’s votes, showing the list without them:', e);
        return new Map<string, 'up' | 'down'>();
      }),
    ]);

    // One lookup per distinct author, not per suggestion.
    const labels = new Map<string, Promise<string | null>>();
    const labelFor = (rec: (typeof records)[number]) => {
      const fingerprint = rec.values.Anon_Fingerprint;
      // Records with no owner (made through the old public gateway) have creator 0: show no author.
      if (!fingerprint && (!rec.createdBy || rec.createdBy === '0')) return Promise.resolve(null);
      const key = fingerprint ? `a:${fingerprint}` : `u:${rec.createdBy}`;
      if (!labels.has(key)) labels.set(key, authorLabel(identity, rec));
      return labels.get(key)!;
    };

    // Team names: one lookup for the org's departments, only if some suggestion has one.
    const deptNames = new Map<string, string>();
    if (records.some((r) => r.values.Department)) {
      for (const d of await loadDepartments(identity, orgId)) deptNames.set(d.id, d.name);
    }

    const suggestions = await Promise.all(
      records.map(async (r) => ({
        suggestionId: r.recordID,
        subject: r.values.Subject || null,
        text: r.values.Description || null,
        category: r.values.Category || null,
        department: deptNames.get(r.values.Department) ?? null,
        status: r.values.Status || null,
        ref: r.values.Reference_Number || null,
        score: Number(r.values.Score) || 0,
        myVote: myVotes.get(r.recordID) ?? null,
        anonymous: !!r.values.Anon_Fingerprint,
        author: await labelFor(r),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    );
    return NextResponse.json({ suggestions, total: suggestions.length }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    if (e instanceof ReauthRequired) return fail(e.message, 401, { reauth: true });
    console.error('[api/suggestions] list failed:', e);
    return fail('Something went wrong, please try again.', 502);
  }
}
