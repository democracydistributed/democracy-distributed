import { createRecord, findRecords, updateRecord, type FoundRecord, type RecordValue, type WriteIdentity } from '@/lib/corteza-write';
import { REACTION_MODULE_ID } from '@/lib/reactions-server';

// Up/down votes on suggestions. A vote is a record in the Reaction module (Reaction = Upvote or
// Downvote), the same module the budget-category reactions use, so one visitor has one vote per
// suggestion. Server-only; used by /api/suggestions and /api/suggestions/vote.
//
// What fills in the rest, inside Corteza: the "Reaction: After Save" workflow recounts the live
// votes into the suggestion's Score and gives a member their participation point. This code
// only ever writes the vote record itself.
//
// Retracting never deletes (the anonymous account can't): it sets Status to Retracted, and
// voting again on the same suggestion switches the same record back to Active.

export const SUGGESTION_MODULE_ID = '404433918159355905';

export type Vote = 'up' | 'down';
const REACTION_VALUE: Record<Vote, string> = { up: 'Upvote', down: 'Downvote' };
const VOTE_OF: Record<string, Vote> = { Upvote: 'up', Downvote: 'down' };

/** Search clause for "records this visitor created": members by user ID, anonymous visitors by the
 *  signed cookie's ID. Both values are digits or a UUID, so they can't break out of their quotes.
 *  Null for an anonymous visitor with no cookie (they can't have voted yet). */
function whoClause(identity: WriteIdentity, anonId: string | null): string | null {
  if (identity.kind === 'member') {
    if (!identity.userId || !/^\d{1,20}$/.test(identity.userId)) throw new Error('Member has no usable user ID');
    return `createdBy='${identity.userId}'`;
  }
  return anonId ? `Anon_Fingerprint='${anonId}'` : null;
}

/** This visitor's vote record on one suggestion, in any state (Active, Retracted or Hidden). */
export async function findMyVote(identity: WriteIdentity, anonId: string | null, suggestionId: string): Promise<FoundRecord | null> {
  if (!/^\d{1,20}$/.test(suggestionId)) return null;
  const who = whoClause(identity, anonId);
  if (!who) return null;
  const found = await findRecords(identity, REACTION_MODULE_ID, `${who} AND related_to='${suggestionId}' AND (Reaction='Upvote' OR Reaction='Downvote')`);
  return found.find((r) => r.values.related_to === suggestionId) ?? null;
}

/** All of this visitor's live votes in one org, keyed by suggestion ID: one search for the
 *  whole list instead of one per card. */
export async function findMyVotes(identity: WriteIdentity, anonId: string | null, orgId: string): Promise<Map<string, Vote>> {
  const mine = new Map<string, Vote>();
  if (!/^\d{1,20}$/.test(orgId)) return mine;
  const who = whoClause(identity, anonId);
  if (!who) return mine;
  const found = await findRecords(
    identity,
    REACTION_MODULE_ID,
    `${who} AND Organization='${orgId}' AND (Reaction='Upvote' OR Reaction='Downvote') AND Status='Active'`,
    { limit: 500 },
  );
  for (const r of found) {
    const id = r.values.related_to;
    const v = VOTE_OF[r.values.Reaction];
    if (id && v) mine.set(id, v);
  }
  return mine;
}

/** Creates a visitor's first vote on a suggestion. Status is left out: the module default
 *  sets it to Active. The org comes from the suggestion record itself, never from the browser. */
export async function createVote(identity: WriteIdentity, anonId: string | null, suggestion: { id: string; orgId: string }, vote: Vote): Promise<string> {
  const values: RecordValue[] = [
    { name: 'Reaction', value: REACTION_VALUE[vote] },
    { name: 'Organization', value: suggestion.orgId },
    { name: 'related_to', value: suggestion.id },
    { name: 'Suggestion', value: suggestion.id },
  ];
  if (identity.kind === 'anonymous' && anonId) values.push({ name: 'Anon_Fingerprint', value: anonId });
  return createRecord(identity, REACTION_MODULE_ID, values);
}

/** Moves an existing vote record to the wanted state: up, down, or null (retracted).
 *  Does nothing, and so triggers nothing in Corteza, if it is already there. */
export async function changeVote(identity: WriteIdentity, existing: FoundRecord, want: Vote | null): Promise<void> {
  const active = existing.values.Status !== 'Retracted';
  if (want === null) {
    if (!active) return;
    await updateRecord(identity, REACTION_MODULE_ID, existing.recordID, toValues({ ...existing.values, Status: 'Retracted' }));
    return;
  }
  if (active && existing.values.Reaction === REACTION_VALUE[want]) return;
  await updateRecord(identity, REACTION_MODULE_ID, existing.recordID, toValues({ ...existing.values, Reaction: REACTION_VALUE[want], Status: 'Active' }));
}

function toValues(v: Record<string, string>): RecordValue[] {
  return Object.entries(v).map(([name, value]) => ({ name, value }));
}
