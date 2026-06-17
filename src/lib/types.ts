// Shared types for the WikiGov org page + Sankey.

/** A node in the nested revenue/spending tree returned by the API. */
export interface RawNode {
  name: string;
  amount?: number;
  children?: RawNode[];
  entries?: RawNode[];
  legalBasis?: string;
  hasChain?: boolean;
  ledgerID?: string;
  transactionID?: string;
  merchant?: string;
  description?: string;
  reference?: string;
  date?: string;
  side?: string;
  planned?: number;
}

/** Top-level Sankey payload. */
export interface SankeyData {
  org?: string;
  year?: number;
  revenue: number;
  spending: number;
  revenue_data: { name: string; children: RawNode[] };
  spending_data: { name: string; children: RawNode[] };
}

export type NodeType =
  | 'org'
  | 'credit-category'
  | 'credit-sub'
  | 'credit-leaf'
  | 'debit-category'
  | 'debit-sub'
  | 'debit-leaf';

/** A node before the d3-sankey layout runs. */
export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  colour: string;
  planned: number;
  legalBasis: string;
  hasChain: boolean;
  dataNode: RawNode | null;
  index?: number;
}

export interface GraphLink {
  source: number;
  target: number;
  value: number;
  ledgerID?: string;
  txnID?: string;
  hasChain?: boolean;
  legalBasis?: string;
}

/** Org metadata returned by the /org gateway endpoint. */
export interface OrgData {
  name?: string;
  type?: string;
  subType?: string;
  status?: string;
  jurisdiction?: string;
  website?: string;
  description?: string;
}

/** A frame in the drawer's drill-down back-stack. */
export interface DrawerCategoryFrame {
  kind: 'category';
  dataNode: RawNode;
  label: string;
  amount: number;
  side: 'credit' | 'debit';
  eyebrow: string;
}

export interface DrawerTraceFrame {
  kind: 'trace';
  entry: RawNode;
  label: string;
  traceData: TraceData | null;
  traceError: string | null;
}

export type DrawerFrame = DrawerCategoryFrame | DrawerTraceFrame;

/** A single org as returned by the /orgs list endpoint. */
export interface OrgSummary {
  orgId?: string;
  id?: string;
  name?: string;
  type?: string;
  subType?: string;
  status?: string;
  description?: string;
  jurisdiction?: string;
  city?: string;
  province?: string;
  state?: string;
  country?: string;
}

export interface OrgsResponse {
  orgs: OrgSummary[];
}

/** An item (agenda item / decision) from the /items endpoint. */
export interface Item {
  itemId?: string;
  itemNumber?: string;
  subject?: string;
  type?: string;
  date?: string;
  description?: string;
}

export interface ItemsResponse {
  items: Item[];
}

/** A project from the /projects endpoint. */
export interface Project {
  projectId?: string;
  name?: string;
  status?: string;
  dueDate?: string;
  financialReward?: number | null;
  description?: string;
}

export interface ProjectsResponse {
  projects: Project[];
}

/** Loosely-typed trace/chain payload from the /trace gateway endpoint. */
export interface TraceData {
  hasChain?: boolean;
  legalBasis?: string;
  transactionId?: string;
  chain?: {
    item?: { id?: string; number?: string; subject?: string };
    suggestion?: { count?: number; previewSubject?: string };
    vote?: { outcome?: string };
    project?: { name?: string; status?: string };
  };
}
