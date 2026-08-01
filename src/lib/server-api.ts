// Server-only fetch helpers for Server Components.
//
// These call the upstream gateway directly instead of going through our own
// /api/gateway proxy — server-side fetch isn't subject to the browser CORS
// restrictions the proxy exists to work around. Caching is delegated to
// Next's fetch Data Cache (revalidate matches the proxy's 5-minute freshness
// window) so repeat requests for the same record don't hit the gateway every time.
import { sanitizeSankeyData } from './sankey';
import type { ConstitutionRecordData, ItemRecordData, ItemsResponse, LedgerDetailData, OrgData, OrgsResponse, ProjectRecordData, ProjectsResponse, SankeyData, TraceData } from './types';

const GATEWAY = 'https://app.democracydistributed.com/api/gateway';
const REVALIDATE_SECONDS = 300;

const CACHE_TAG = 'gateway-data';

function get(url: string) {
  return fetch(url, { next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] } });
}

export async function fetchItemServer(itemId: string): Promise<ItemRecordData> {
  const res = await get(`${GATEWAY}/item?itemId=${encodeURIComponent(itemId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  const data: ItemRecordData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.error) throw new Error(data?.error || 'Item not found');
  return data;
}

export async function fetchProjectServer(projectId: string): Promise<ProjectRecordData> {
  const res = await get(`${GATEWAY}/project?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  const data: ProjectRecordData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.error) throw new Error(data?.error || 'Project not found');
  return data;
}

export async function fetchConstitutionServer(constitutionId: string): Promise<ConstitutionRecordData> {
  const res = await get(`${GATEWAY}/constitution?id=${encodeURIComponent(constitutionId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  const data: ConstitutionRecordData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.error) throw new Error(data?.error || 'Constitution record not found');
  return data;
}

export async function fetchLedgerServer(ledgerId: string): Promise<LedgerDetailData> {
  const res = await get(`${GATEWAY}/ledger?ledgerId=${encodeURIComponent(ledgerId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  const data: LedgerDetailData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || data.error) throw new Error(data?.error || 'Ledger entry not found');
  return data;
}

export async function fetchTraceServer(ledgerId: string): Promise<TraceData> {
  const res = await get(`${GATEWAY}/trace?ledgerId=${encodeURIComponent(ledgerId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function fetchOrgServer(orgId: string): Promise<OrgData> {
  const res = await get(`${GATEWAY}/org?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
}

export async function fetchOrgsServer(): Promise<OrgsResponse> {
  const res = await get(`${GATEWAY}/orgs`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return Array.isArray(data) ? { orgs: data } : data;
}

export async function fetchItemsServer(orgId: string): Promise<ItemsResponse> {
  const res = await get(`${GATEWAY}/items?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.items)) throw new Error('Unexpected response shape');
  return data;
}

export async function fetchProjectsServer(orgId: string): Promise<ProjectsResponse> {
  const res = await get(`${GATEWAY}/projects?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.projects)) throw new Error('Unexpected response shape');
  return data;
}

export async function fetchSankeyServer(orgId: string): Promise<SankeyData> {
  const res = await get(`${GATEWAY}/sankey?orgId=${encodeURIComponent(orgId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  const raw = await res.json();
  if (raw == null) throw new Error('Server returned empty response');
  const data: SankeyData = typeof raw.sankeyJSON === 'string' ? JSON.parse(raw.sankeyJSON) : raw;
  if (!data || !data.revenue_data || !data.spending_data) {
    throw new Error('Unexpected data shape. Got: ' + JSON.stringify(data).slice(0, 300));
  }
  return sanitizeSankeyData(data);
}
