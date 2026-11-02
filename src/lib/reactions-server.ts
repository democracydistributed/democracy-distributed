import { createHash } from 'crypto';
import { findRecords, lookupUserHandle, readRecord, recordExists, type FoundRecord, type WriteIdentity } from '@/lib/corteza-write';

// Shared by the reactions routes (src/app/api/reactions). Server-only.

export const REACTION_MODULE_ID = '519894597590056961';
export const ORGANIZATION_MODULE_ID = '387847963242790913';
const MAX_PATH = 500;

export interface Target {
  orgId: string;
  year: number | null;
  relatedTo: string;
}

/** Checks the fields that identify what's being reacted to. Returns an error message, or the target. */
export function parseTarget(src: Record<string, unknown>): Target | string {
  const orgId = typeof src.orgId === 'string' ? src.orgId.trim() : '';
  if (!/^\d{1,20}$/.test(orgId)) return 'Unknown organization';

  const relatedTo = typeof src.relatedTo === 'string' ? src.relatedTo : '';
  // Category paths always start with the org ID, which also ties the path to this org.
  if (!relatedTo || relatedTo.length > MAX_PATH || !relatedTo.startsWith(`${orgId} → `)) return 'Unknown item';

  let year: number | null = null;
  if (src.year !== undefined && src.year !== null && src.year !== '') {
    year = Number(src.year);
    if (!Number.isInteger(year) || year < 1990 || year > 2100) return 'Unknown year';
  }
  return { orgId, year, relatedTo };
}

// Each Corteza call costs 150-600 ms, so checks whose answer doesn't change (an org exists, a
// category belongs to it) are remembered per server instance instead of repeated on every save.
// A failed check is only remembered briefly, in case the record is created a moment later.
const OK_TTL_MS = 60 * 60_000;
const NO_TTL_MS = 60_000;
const checks = new Map<string, { ok: boolean; expiresAt: number }>();

async function cachedCheck(key: string, run: () => Promise<boolean>): Promise<boolean> {
  const hit = checks.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.ok;
  const ok = await run();
  checks.set(key, { ok, expiresAt: Date.now() + (ok ? OK_TTL_MS : NO_TTL_MS) });
  return ok;
}

/** True if this is a real Organization record. */
export function orgExists(identity: WriteIdentity, orgId: string): Promise<boolean> {
  return cachedCheck(`org:${orgId}`, () => recordExists(identity, ORGANIZATION_MODULE_ID, orgId));
}

export const BUDGET_CATEGORY_MODULE_ID = '413647630179237889';

/** Confirms a client-supplied Budget Category ID really is the category the path points at:
 *  it must exist, belong to this org, and be named like the last part of the path. Returns the
 *  ID if so, otherwise null (the reaction is still saved, just without the link). The check
 *  matters because the ID comes from the browser. */
export async function verifiedCategoryId(identity: WriteIdentity, t: Target, categoryId: unknown): Promise<string | null> {
  if (typeof categoryId !== 'string' || !/^\d{1,20}$/.test(categoryId)) return null;
  const lastPart = reactionKey(t.relatedTo.split(' → ').pop() ?? '');
  const ok = await cachedCheck(`bc:${t.orgId}:${categoryId}:${lastPart}`, async () => {
    const bc = await readRecord(identity, BUDGET_CATEGORY_MODULE_ID, categoryId);
    return !!bc && bc.Organization === t.orgId && reactionKey(bc.Budget_Category_Name ?? '') === lastPart;
  });
  return ok ? categoryId : null;
}

/** The value stored in a reaction's related_to field. Corteza's query language can't quote
 *  an apostrophe (or a backslash), so those are swapped for look-alikes; that way every
 *  item, e.g. "Children's Services", can be searched for exactly. The same function is
 *  used when saving and when searching, so the two always agree. */
export function reactionKey(path: string): string {
  return path.replace(/'/g, '’').replace(/\\/g, '/');
}

/** Search expression for the live (not hidden) reactions on one item. Every value in it is
 *  digits or comes out of reactionKey(), so it can't break out of its quotes. */
export function itemQuery(t: Target): string {
  return `Organization='${t.orgId}'${t.year !== null ? ` AND Year=${t.year}` : ''} AND related_to='${reactionKey(t.relatedTo)}'`;
}

/** A stable, anonymous handle for one anonymous visitor: the same browser always gets the
 *  same one, different browsers differ, and it can't be turned back into the cookie value. */
export function anonHandle(fingerprint: string): string {
  return `anon_${createHash('sha256').update(`dd_anon_label:${fingerprint}`).digest('hex').slice(0, 6)}`;
}

/** What to call the author of a reaction: their Corteza handle if they're a member, otherwise
 *  their anonymous handle. Never an email address, even if a handle was set to one. */
export async function authorLabel(identity: WriteIdentity, rec: FoundRecord): Promise<string> {
  const fingerprint = rec.values.Anon_Fingerprint;
  if (fingerprint) return anonHandle(fingerprint);

  const handle = await lookupUserHandle(identity, rec.createdBy);
  if (handle && !handle.includes('@')) return handle;
  return `member_${createHash('sha256').update(`dd_member_label:${rec.createdBy}`).digest('hex').slice(0, 4)}`;
}

/** The visitor's existing reaction record for this item, if any. Everything that goes
 *  into the search query is digits-only, a UUID from a signed cookie, or comes out of
 *  reactionKey(), so none of it can break out of its quotes. */
export async function findMine(identity: WriteIdentity, anonId: string | null, t: Target): Promise<FoundRecord | null> {
  let who: string;
  if (identity.kind === 'member') {
    if (!identity.userId || !/^\d{1,20}$/.test(identity.userId)) throw new Error('Member has no usable user ID');
    who = `createdBy='${identity.userId}'`;
  } else {
    if (!anonId) return null;
    who = `Anon_Fingerprint='${anonId}'`;
  }
  const found = await findRecords(identity, REACTION_MODULE_ID, `${who} AND ${itemQuery(t)}`);
  return found.find((r) => r.values.related_to === reactionKey(t.relatedTo) && r.values.Status !== 'Hidden') ?? null;
}
