import { countRecords, findRecords, getAnonymousToken, readRecord, type WriteIdentity } from '@/lib/corteza-write';
import { fetchOrgsServer } from '@/lib/server-api';

// A member's reputation: their score and the events behind it, for their page. Server-only.
//
// Where it lives in Corteza: each member has a User_c record (matched on its user_id field)
// holding Reputation_Score; Reputation_Event records point at that User_c record.
//
// Privacy: a page shows the member's handle, score and events, and nothing else. The user
// and User_c records also hold a real name and an email address; neither is ever read out
// of here. Events are shown whatever their Visibility says (the owner chose that on
// purpose): to respect Visibility later, filter on it in loadMemberActivity.

const CORTEZA = 'https://app.democracydistributed.com';
const USER_C_MODULE_ID = '394593646591541249';
const REPUTATION_EVENT_MODULE_ID = '397557861678317569';
const JOB_MODULE_ID = '394663301000200193';
const SHOWN = 100;

export interface ReputationEvent {
  id: string;
  type: string;
  title: string;
  /** Extra context under the title: the job or organization it relates to. */
  detail: string | null;
  /** Points added to the score (negative if taken away). */
  amount: number;
  when: string | null;
}

export interface MemberActivity {
  /** null if the member has no reputation record yet. */
  score: number | null;
  /** All of the member's events, which can be more than `events` holds. */
  total: number;
  /** Most recent first, capped at SHOWN. */
  events: ReputationEvent[];
}

/** A handle that is safe to put in a URL and is not an email address. Members whose handle
 *  doesn't pass simply don't get a public page. */
export function isPublicHandle(handle: string | null | undefined): handle is string {
  return !!handle && /^[A-Za-z0-9._-]{1,64}$/.test(handle) && !handle.includes('@');
}

async function orgNames(): Promise<Map<string, string>> {
  try {
    const { orgs } = await fetchOrgsServer();
    return new Map(orgs.flatMap((o) => (o.name && (o.orgId || o.id) ? [[(o.orgId || o.id) as string, o.name] as [string, string]] : [])));
  } catch {
    return new Map(); // events just lose their organization line rather than failing the page
  }
}

// Job names don't change, so remember them per server instance (each lookup costs a Corteza call).
const JOB_TTL_MS = 10 * 60_000;
const jobNames = new Map<string, { name: string | null; expiresAt: number }>();

async function jobName(identity: WriteIdentity, jobId: string): Promise<string | null> {
  if (!/^\d{1,20}$/.test(jobId)) return null;
  const hit = jobNames.get(jobId);
  if (hit && hit.expiresAt > Date.now()) return hit.name;
  let name: string | null = null;
  try {
    name = (await readRecord(identity, JOB_MODULE_ID, jobId))?.Job_Name?.trim() || null;
  } catch {
    /* an unreadable job just shows without its name */
  }
  jobNames.set(jobId, { name, expiresAt: Date.now() + JOB_TTL_MS });
  return name;
}

const DEFAULT_TITLES: Record<string, string> = {
  'Job Completed': 'Completed a job',
  'Organization Created': 'Created an organization',
  Upvote: 'Received an upvote',
  Downvote: 'Received a downvote',
  Penalty: 'Penalty',
  'Field Updated': 'Updated a record',
  Reacted: 'Reacted to an item',
  'Suggestion Made': 'Made a suggestion',
};

export async function loadMemberActivity(identity: WriteIdentity, userId: string): Promise<MemberActivity> {
  if (!/^\d{1,20}$/.test(userId)) return { score: null, total: 0, events: [] };

  // The member's reputation record. Only the score is read out of it.
  const [account] = await findRecords(identity, USER_C_MODULE_ID, `user_id='${userId}'`, { limit: 1 });
  if (!account) return { score: null, total: 0, events: [] };
  const rawScore = account.values.Reputation_Score;
  const score = rawScore !== undefined && rawScore !== '' && Number.isFinite(Number(rawScore)) ? Number(rawScore) : null;

  const query = `User='${account.recordID}'`;
  const [total, found, orgs] = await Promise.all([
    countRecords(identity, REPUTATION_EVENT_MODULE_ID, query),
    findRecords(identity, REPUTATION_EVENT_MODULE_ID, query, { limit: SHOWN, sort: 'createdAt DESC' }),
    orgNames(),
  ]);

  const events = await Promise.all(
    found.map(async (rec): Promise<ReputationEvent> => {
      const type = rec.values.Event_Type ?? '';
      const orgName = rec.values.Organization ? orgs.get(rec.values.Organization) ?? null : null;
      const job = rec.values.Job ? await jobName(identity, rec.values.Job) : null;
      const amount = Number(rec.values.Amount);
      return {
        id: rec.recordID,
        type,
        title: rec.values.Title?.trim() || DEFAULT_TITLES[type] || 'Reputation event',
        detail: job ?? orgName,
        amount: Number.isFinite(amount) ? amount : 0,
        when: rec.createdAt,
      };
    }),
  );

  return { score, total, events };
}

/** Turns a handle from a URL into a member, or null if there's no such public member.
 *  The anonymous service account is a user too, but it stands for every anonymous visitor,
 *  so it never gets a page. */
export async function resolvePublicMember(handle: string): Promise<{ userId: string; handle: string; identity: WriteIdentity } | null> {
  if (!isPublicHandle(handle)) return null;

  const token = await getAnonymousToken();
  const res = await fetch(`${CORTEZA}/api/system/users/?handle=${encodeURIComponent(handle)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const set: { userID?: string; handle?: string; suspendedAt?: string }[] = data?.response?.set ?? [];
  // Handles are matched exactly (ignoring case), not by prefix.
  const hit = set.find((u) => typeof u.handle === 'string' && u.handle.toLowerCase() === handle.toLowerCase());
  if (!hit?.userID || !/^\d{1,20}$/.test(hit.userID) || hit.suspendedAt || !isPublicHandle(hit.handle)) return null;
  if (hit.userID === tokenSubject(token)) return null;

  return { userId: hit.userID, handle: hit.handle, identity: { kind: 'anonymous', token } };
}

function tokenSubject(token: string): string | null {
  try {
    const sub = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'))?.sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}
