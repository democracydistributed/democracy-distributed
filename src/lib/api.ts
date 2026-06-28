// Gateway endpoints + typed fetch helpers.
//
// These are RELATIVE paths that hit our own origin and are proxied to the live
// gateway by a Next.js rewrite (see next.config.mjs). This sidesteps the gateway's
// broken CORS headers, which block direct browser fetches.
import type { ItemRecordData, ItemsResponse, OrgsResponse, PeopleResponse, ProjectRecordData, ProjectsResponse, TraceData } from './types';

const BASE = '/api/gateway';

export const TRACE_ENDPOINT = `${BASE}/trace`;
export const ORGS_ENDPOINT = `${BASE}/orgs`;
export const ITEMS_ENDPOINT = `${BASE}/items`;
export const ITEM_ENDPOINT = `${BASE}/item`;
export const PROJECTS_ENDPOINT = `${BASE}/projects`;
export const PROJECT_ENDPOINT = `${BASE}/project`;
export const PEOPLE_ENDPOINT = `${BASE}/people`;

/** Org-page preview cap on the officials list. The endpoint's counts.officials
 *  stays the true (pre-cap) total, so we can show "View all N" when it's bigger. */
export const PEOPLE_PREVIEW_LIMIT = 12;

/** Toronto is the only org with live data today — used as the demo/default org link. */
export const TORONTO_ORG_ID = '406019364987666433';

export async function fetchTrace(ledgerId: string): Promise<TraceData> {
  const res = await fetch(`${TRACE_ENDPOINT}?ledgerId=${encodeURIComponent(ledgerId)}`);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + res.statusText);
  return res.json();
}

export async function fetchOrgs(): Promise<OrgsResponse> {
  const res = await fetch(ORGS_ENDPOINT);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return Array.isArray(data) ? { orgs: data } : data;
}

export async function fetchItems(orgId: string): Promise<ItemsResponse> {
  const res = await fetch(`${ITEMS_ENDPOINT}?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.items)) throw new Error('Unexpected response shape');
  return data;
}

export async function fetchItem(itemId: string): Promise<ItemRecordData> {
  const res = await fetch(`${ITEM_ENDPOINT}?itemId=${encodeURIComponent(itemId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  // Gateway may return the assembled record as a JSON string.
  const data: ItemRecordData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.error) throw new Error(data?.error || 'Item not found');
  return data;
}

export async function fetchProject(projectId: string): Promise<ProjectRecordData> {
  const res = await fetch(`${PROJECT_ENDPOINT}?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  const data: ProjectRecordData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.error) throw new Error(data?.error || 'Project not found');
  return data;
}

export async function fetchPeople(orgId: string, limit: number = PEOPLE_PREVIEW_LIMIT): Promise<PeopleResponse> {
  const res = await fetch(`${PEOPLE_ENDPOINT}?orgId=${encodeURIComponent(orgId)}&limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  // Gateway may hand back the assembled payload as a JSON string.
  const data: PeopleResponse = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || !Array.isArray(data.officials) || !Array.isArray(data.members)) {
    throw new Error('Unexpected response shape');
  }
  return data;
}

export async function fetchProjects(orgId: string): Promise<ProjectsResponse> {
  const res = await fetch(`${PROJECTS_ENDPOINT}?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.projects)) throw new Error('Unexpected response shape');
  return data;
}
