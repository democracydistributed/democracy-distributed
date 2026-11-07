// Gateway endpoints + typed fetch helpers.
//
// These are RELATIVE paths that hit our own origin and are proxied to the live
// gateway by a Next.js rewrite (see next.config.mjs). This sidesteps the gateway's
// broken CORS headers, which block direct browser fetches.
import type { ItemRecordData, ItemsResponse, OrgsResponse, PeopleResponse, ProjectRecordData, ProjectsResponse, SuggestionsResponse, TraceData } from './types';

const BASE = '/api/gateway';

export const TRACE_ENDPOINT = `${BASE}/trace`;
export const ORGS_ENDPOINT = `${BASE}/orgs`;
export const ITEMS_ENDPOINT = `${BASE}/items`;
export const ITEM_ENDPOINT = `${BASE}/item`;
export const PROJECTS_ENDPOINT = `${BASE}/projects`;
export const PROJECT_ENDPOINT = `${BASE}/project`;
export const PEOPLE_ENDPOINT = `${BASE}/people`;
export const PILOT_COUNTS_ENDPOINT = `${BASE}/pilot/counts`;
export const PILOT_SIGNUP_ENDPOINT = `${BASE}/pilot/signup`;

/** Org-page preview cap on the officials list. The endpoint's counts.officials
 *  stays the true (pre-cap) total, so we can show "View all N" when it's bigger. */
export const PEOPLE_PREVIEW_LIMIT = 12;

/** Toronto is the only org with live data today — used as the demo/default org link. */
export const TORONTO_ORG_ID = '406019364987666433';

/** Every client-side call to our gateway proxy goes through this. `cache: 'no-store'` is
 *  non-negotiable here: whether a response is cacheable is entirely the proxy's decision
 *  (see GATEWAY_CACHE_ENABLED in the docs repo's build/caching.md) — the browser must never independently cache
 *  a gateway response on top of that, or it can end up replaying a response from long
 *  before the proxy's own cache (if any) would have expired. This bit us once already
 *  (see git history on fetchSuggestions) when only one endpoint had this set explicitly. */
function gatewayFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, cache: 'no-store' });
}

export async function fetchTrace(ledgerId: string): Promise<TraceData> {
  const res = await gatewayFetch(`${TRACE_ENDPOINT}?ledgerId=${encodeURIComponent(ledgerId)}`);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + res.statusText);
  return res.json();
}

export async function fetchOrgs(): Promise<OrgsResponse> {
  const res = await gatewayFetch(ORGS_ENDPOINT);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return Array.isArray(data) ? { orgs: data } : data;
}

export async function fetchItems(orgId: string): Promise<ItemsResponse> {
  const res = await gatewayFetch(`${ITEMS_ENDPOINT}?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.items)) throw new Error('Unexpected response shape');
  return data;
}

export async function fetchItem(itemId: string): Promise<ItemRecordData> {
  const res = await gatewayFetch(`${ITEM_ENDPOINT}?itemId=${encodeURIComponent(itemId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  // Gateway may return the assembled record as a JSON string.
  const data: ItemRecordData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.error) throw new Error(data?.error || 'Item not found');
  return data;
}

export async function fetchProject(projectId: string): Promise<ProjectRecordData> {
  const res = await gatewayFetch(`${PROJECT_ENDPOINT}?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  const data: ProjectRecordData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.error) throw new Error(data?.error || 'Project not found');
  return data;
}

export async function fetchPeople(orgId: string, limit: number = PEOPLE_PREVIEW_LIMIT): Promise<PeopleResponse> {
  const res = await gatewayFetch(`${PEOPLE_ENDPOINT}?orgId=${encodeURIComponent(orgId)}&limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  // Gateway may hand back the assembled payload as a JSON string.
  const data: PeopleResponse = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || !Array.isArray(data.officials) || !Array.isArray(data.members)) {
    throw new Error('Unexpected response shape');
  }
  return data;
}

export interface PilotCounts {
  orgs: number;
  volunteers: number;
}

export async function fetchPilotCounts(): Promise<PilotCounts> {
  const res = await gatewayFetch(PILOT_COUNTS_ENDPOINT, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const orgs = Number(data?.orgs ?? data?.organizations) || 0;
  const volunteers = Number(data?.volunteers ?? data?.vols) || 0;
  return { orgs: Math.max(0, Math.floor(orgs)), volunteers: Math.max(0, Math.floor(volunteers)) };
}

export async function fetchProjects(orgId: string): Promise<ProjectsResponse> {
  const res = await gatewayFetch(`${PROJECTS_ENDPOINT}?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.projects)) throw new Error('Unexpected response shape');
  return data;
}

/** Reads suggestions through our own server route (src/app/api/suggestions), the same way
 *  reactions work, not the gateway: the server adds the author's handle and keeps Email and
 *  the anonymous fingerprint out of the response. */
export async function fetchSuggestions(orgId: string): Promise<SuggestionsResponse> {
  const res = await gatewayFetch(`/api/suggestions?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.suggestions)) throw new Error('Unexpected response shape');
  return data;
}

export interface NewSuggestion {
  /** Omitted for site-wide (footer) feedback — the server files it under DD Central Government. */
  orgId?: string;
  /** Org-page suggestions have a subject; footer feedback has a category instead. */
  subject?: string;
  text: string;
  category?: string;
  email?: string;
}

/** Posts a new suggestion through our own server route (src/app/api/suggestions),
 *  not the gateway — the server attaches the member's or the anonymous account's
 *  identity so the record has a real owner. */
export async function postSuggestion(payload: NewSuggestion): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await fetch('/api/suggestions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/** What a reaction is attached to. `relatedTo` is the category's full path (dataNode.name). */
export interface ReactionTarget {
  orgId: string;
  year: number | null;
  relatedTo: string;
  /** The amount shown in the drawer header when the visitor reacted. */
  amount?: number;
  /** The category's Budget Category record ID, when the data carries one. */
  categoryId?: string;
}

/** Saves a reaction. Reacting again to the same item changes the earlier one. */
export async function postReaction(t: ReactionTarget, reaction: string): Promise<void> {
  const res = await fetch('/api/reactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orgId: t.orgId, year: t.year, relatedTo: t.relatedTo, reaction, amountSeen: t.amount, categoryId: t.categoryId }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
}

export interface ReactionSummary {
  total: number;
  /** Count per face, keyed by the face's name (Reasonable, Surprised, Confused, Concerned). */
  counts: Record<string, number>;
  /** Most recent first. `who` is a member's handle or an anonymous handle like anon_7f3a9c. */
  latest: { reaction: string; who: string; when: string | null }[];
  /** This visitor's own reaction to the item, or null. */
  mine: string | null;
}

/** Everything a drawer needs about reactions to one item, in one request: totals, recent
 *  responses, and this visitor's own reaction. Goes through our own server route. */
export async function fetchReactionSummary(t: ReactionTarget): Promise<ReactionSummary> {
  const qs = new URLSearchParams({ orgId: t.orgId, relatedTo: t.relatedTo });
  if (t.year !== null) qs.set('year', String(t.year));
  const res = await fetch(`/api/reactions/summary?${qs}`, { cache: 'no-store' });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return { total: data.total, counts: data.counts, latest: data.latest, mine: data.mine ?? null };
}
