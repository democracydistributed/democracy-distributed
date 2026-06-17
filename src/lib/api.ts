// Gateway endpoints + typed fetch helpers.
//
// These are RELATIVE paths that hit our own origin and are proxied to the live
// gateway by a Next.js rewrite (see next.config.mjs). This sidesteps the gateway's
// broken CORS headers, which block direct browser fetches.
import type { ItemsResponse, OrgData, OrgsResponse, ProjectsResponse, SankeyData, TraceData } from './types';

const BASE = '/api/gateway';

export const SANKEY_ENDPOINT = `${BASE}/sankey`;
export const TRACE_ENDPOINT = `${BASE}/trace`;
export const ORG_ENDPOINT = `${BASE}/org`;
export const ORGS_ENDPOINT = `${BASE}/orgs`;
export const ITEMS_ENDPOINT = `${BASE}/items`;
export const PROJECTS_ENDPOINT = `${BASE}/projects`;

export const DEFAULT_ORG_ID = '490999320024186881';

export async function fetchSankey(orgId: string): Promise<SankeyData> {
  const res = await fetch(`${SANKEY_ENDPOINT}?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  if (raw == null) throw new Error('Server returned empty response');
  const data: SankeyData = typeof raw.sankeyJSON === 'string' ? JSON.parse(raw.sankeyJSON) : raw;
  if (!data || !data.revenue_data || !data.spending_data) {
    throw new Error('Unexpected data shape. Got: ' + JSON.stringify(data).slice(0, 300));
  }
  return data;
}

export async function fetchOrg(orgId: string): Promise<OrgData> {
  const res = await fetch(`${ORG_ENDPOINT}?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
}

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

export async function fetchProjects(orgId: string): Promise<ProjectsResponse> {
  const res = await fetch(`${PROJECTS_ENDPOINT}?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.projects)) throw new Error('Unexpected response shape');
  return data;
}
