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
  /** Index (into the nodes array) of this node's parent in the tree. Undefined for org-centre. */
  parent?: number;
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
  side: 'credit' | 'debit';
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

/** A suggestion from the /suggestions endpoint (org-page Suggestions tab). */
export interface Suggestion {
  suggestionId?: string;
  text?: string;
  category?: string;
  status?: string;
  createdAt?: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

/** A single item record from the /item gateway endpoint (API_Item Record workflow). */
export interface ItemRecordProject {
  projectId?: string;
  name?: string;
  phase?: string;
  endDate?: string;
  budget?: string | number | null;
}

export interface ItemRecordMeeting {
  meetingId?: string;
  committee?: string;
  date?: string;
  meetingNumber?: string;
}

/** The Suggestion that led to this Item, if any — Traces From. Only the first
 *  linked Suggestion is resolved; `count` carries the true total so the UI can
 *  show "+N more" and point to the full list in Corteza. */
export interface ItemRecordSuggestion {
  suggestionId?: string;
  subject?: string;
  count?: number;
}

/** The Voting Result that decided this Item, if any — Traces From. */
export interface ItemRecordVote {
  outcome?: string;
  yes?: number;
  no?: number;
}

/** The Constitution/Legal Basis record this Item authorized, if any — Leads To. */
export interface ItemRecordConstitution {
  id?: string;
  name?: string;
}

/** A Transaction/Ledger entry authorized by this Item — Leads To. */
export interface ItemRecordTransaction {
  transactionId?: string;
  description?: string;
  amount?: number | string | null;
  date?: string;
}

export interface ItemRecordData {
  itemId?: string;
  subject?: string;
  itemNumber?: string;
  status?: string;
  date?: string;
  plainSummary?: string;
  link?: string;
  suggestion?: ItemRecordSuggestion | null;
  vote?: ItemRecordVote | null;
  authorizedConstitution?: ItemRecordConstitution | null;
  projects?: ItemRecordProject[];
  transactions?: ItemRecordTransaction[];
  meetingDiscussedIn?: ItemRecordMeeting[];
  error?: string;
}

/** A single project record from the /project gateway endpoint (API_Project Record workflow). */
export interface ProjectLedgerEntry {
  ledgerId?: string;
  amount?: number | null;
  description?: string;
  date?: string;
}

export interface ProjectRecordData {
  projectId?: string;
  name?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  description?: string;
  reputationReward?: number | null;
  authorizingItem?: {
    itemId?: string;
    subject?: string;
    itemNumber?: string;
    date?: string;
  } | null;
  ledgerEntries?: ProjectLedgerEntry[];
  totalSpent?: number | null;
  error?: string;
}

/** An Item authorized by this Constitution via a Passed Amendment. */
export interface ConstitutionAuthorizedItem {
  itemId?: string;
  subject?: string;
  itemNumber?: string;
  date?: string;
  status?: string;
}

/** A single constitution/legal-basis record from the /constitution gateway endpoint (API_Constitution Record workflow). */
export interface ConstitutionRecordData {
  id?: string;
  name?: string;
  subTitle?: string;
  type?: string;
  number?: string;
  status?: string;
  enacted?: string;
  category?: string;
  description?: string;
  link?: string;
  authorizedItems?: ConstitutionAuthorizedItem[];
  error?: string;
}

/** People tab — /people gateway endpoint (API_People Endpoint v1). */
export type OfficialStatus = 'recorded' | 'role_not_recorded' | 'holder_not_recorded';

export interface Official {
  name: string | null;
  position: string | null;
  positionId: string | null;
  personId: string | null;
  startDate: string | null;
  endDate: string | null;
  status: OfficialStatus;
}

export interface OrgMember {
  name: string | null;
  userId: string | null;
  role: string | null;
  startDate: string | null;
}

export interface PeopleCounts {
  officials: number;
  recorded: number;
  gaps: number;
  members: number;
}

export interface PeopleResponse {
  orgId?: string;
  officials: Official[];
  members: OrgMember[];
  counts: PeopleCounts;
  nextCursor: string | null;
}

/** A single ledger entry record from the /ledger gateway endpoint (API_Ledger Record v1 workflow). */
export interface TreasuryAccountSummary {
  accountNumber?: string | null;
  nickname?: string | null;
}

export interface BudgetCategorySummary {
  name?: string | null;
  number?: string | null;
}

export interface LedgerTransactionSummary {
  transactionNumber?: string | null;
  from?: TreasuryAccountSummary | null;
  to?: TreasuryAccountSummary | null;
}

export interface LedgerDetailData {
  ledgerId?: string;
  amount?: number | string | null;
  date?: string | null;
  type?: string | null;
  merchant?: string | null;
  description?: string | null;
  referenceNumber?: string | null;
  currency?: string | null;
  budgetCategory?: BudgetCategorySummary | null;
  transaction?: LedgerTransactionSummary | null;
  /** Whether Item/Legal_Basis/Project are set DIRECTLY on this Ledger record,
   *  as opposed to resolved indirectly by /trace (e.g. Legal Basis -> Amendment -> Item). */
  hasDirectItem?: boolean;
  hasDirectLegalBasis?: boolean;
  hasDirectProject?: boolean;
  error?: string;
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
    project?: { id?: string; name?: string; status?: string };
    legalBasis?: { id?: string; name?: string; type?: string; number?: string; status?: string; link?: string };
  };
}
