// Pure graph-building + tree helpers. Ported 1:1 from the vanilla component.
import type { GraphLink, GraphNode, RawNode, SankeyData } from './types';

export const CREDIT_COLOURS = ['#2dd4bf', '#60a5fa', '#818cf8', '#34d399', '#22d3ee', '#a78bfa', '#4ade80', '#38bdf8', '#6ee7b7'];
export const DEBIT_COLOURS = ['#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#f97316', '#ec4899', '#84cc16'];
export const LEAF_CREDIT = '#0f4c5c';
export const LEAF_DEBIT = '#4a1942';

export function shortName(fullName: string): string {
  return fullName.split(' → ').pop() as string;
}

/** Display title for a leaf entry: merchant > description (unless purely numeric) > reference > ledgerID > path-tail. */
export function leafTitle(node: RawNode): string {
  if (node.merchant) return node.merchant;
  const desc = node.description;
  if (desc && !/^\d+$/.test(desc)) return desc;
  if (node.reference) return node.reference;
  if (node.ledgerID) return `LDG-${node.ledgerID}`;
  return node.name.split(' → ').pop() as string;
}

/** Recursively sums leaf amounts in the nested tree. */
export function sumTreeValue(node: RawNode | null | undefined): number {
  if (node == null) return 0;
  if (node.amount !== undefined && !node.children) return Math.max(0, node.amount || 0);
  return (node.children || []).reduce((s, c) => s + sumTreeValue(c), 0);
}

export function countLeaves(node: RawNode): number {
  if (!node.children) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

export function treeDepth(node: RawNode | undefined): number {
  if (!node || !node.children || !node.children.length) return 0;
  return 1 + Math.max(...node.children.map((c) => treeDepth(c)));
}

// Placeholder/test records (e.g. a leftover "Test $10" entry) shouldn't reach
// the production chart. This is a frontend safety net — the durable fix is
// removing the record at the data source.
function isTestPlaceholder(name: string): boolean {
  const seg = (name.split(' → ').pop() || '').trim();
  return /^test(\s*[$]?\s*10(\.00)?)?$/i.test(seg);
}

function stripTestPlaceholders(node: RawNode): RawNode {
  if (!node.children && !node.entries) return node;
  return {
    ...node,
    children: node.children?.filter((c) => !isTestPlaceholder(c.name)).map(stripTestPlaceholders),
    entries: node.entries?.filter((e) => !isTestPlaceholder(e.name)),
  };
}

/** Drops test/placeholder records from the revenue and spending trees before charting. */
export function sanitizeSankeyData(data: SankeyData): SankeyData {
  return {
    ...data,
    revenue_data: { ...data.revenue_data, children: data.revenue_data.children.map(stripTestPlaceholders) },
    spending_data: { ...data.spending_data, children: data.spending_data.children.map(stripTestPlaceholders) },
  };
}

// ── Year filtering ──────────────────────────────────────────────────────────
// The API returns every year in one payload. Leaves carry their ledger
// `entries[]`, each with its own `date`; a leaf's `amount` is the sum of those
// entries, so filtering by year means re-summing, not just hiding nodes.
// Calendar year of the entry date (UTC slice — dates arrive as ISO strings).

function entryYear(e: RawNode): number | null {
  const y = e.date ? parseInt(e.date.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) ? y : null;
}

function leafNodes(node: RawNode, out: RawNode[] = []): RawNode[] {
  if (node.entries) out.push(node);
  (node.children || []).forEach((c) => leafNodes(c, out));
  return out;
}

/** Sum of entry amounts per calendar year, per side. */
function yearTotals(data: SankeyData): Map<number, { revenue: number; spending: number }> {
  const totals = new Map<number, { revenue: number; spending: number }>();
  const add = (root: { children: RawNode[] }, side: 'revenue' | 'spending') => {
    root.children.forEach((n) =>
      leafNodes(n).forEach((leaf) =>
        leaf.entries!.forEach((e) => {
          const y = entryYear(e);
          if (y === null) return;
          const t = totals.get(y) || { revenue: 0, spending: 0 };
          t[side] += Math.max(0, e.amount || 0);
          totals.set(y, t);
        }),
      ),
    );
  };
  add(data.revenue_data, 'revenue');
  add(data.spending_data, 'spending');
  return totals;
}

/** Distinct calendar years present in the entry dates, ascending. Empty when the data carries no dated entries. */
export function listYears(data: SankeyData): number[] {
  return [...yearTotals(data).keys()].sort((a, b) => a - b);
}

/**
 * Year the chart opens on: the latest year in which BOTH sides hold at least
 * 1% of their all-time total. That skips a trailing year that is just a stray
 * entry or two (Toronto: 2024) while still picking the latest year for orgs
 * whose data is complete. Falls back to the latest year.
 */
export function defaultYear(data: SankeyData): number | null {
  const years = listYears(data);
  if (!years.length) return null;
  const totals = yearTotals(data);
  const sum = (k: 'revenue' | 'spending') => [...totals.values()].reduce((s, t) => s + t[k], 0);
  const minRev = sum('revenue') * 0.01;
  const minSpend = sum('spending') * 0.01;
  const substantial = years.filter((y) => totals.get(y)!.revenue >= minRev && totals.get(y)!.spending >= minSpend);
  return substantial.length ? substantial[substantial.length - 1] : years[years.length - 1];
}

function filterNodeByYear(node: RawNode, year: number): RawNode | null {
  if (node.entries) {
    const entries = node.entries.filter((e) => entryYear(e) === year);
    if (!entries.length) return null;
    return { ...node, entries, amount: entries.reduce((s, e) => s + Math.max(0, e.amount || 0), 0) };
  }
  if (node.children) {
    const children = node.children.map((c) => filterNodeByYear(c, year)).filter((c): c is RawNode => c !== null);
    return children.length ? { ...node, children } : null;
  }
  return null; // undated leaf — can't be placed in a year
}

/**
 * Returns the payload restricted to one calendar year, with leaf amounts and
 * the top-level revenue/spending totals recomputed. The two wrapper levels
 * (root, org) are kept even when empty — buildGraph indexes children[0].
 */
export function filterByYear(data: SankeyData, year: number): SankeyData {
  const side = (root: { name: string; children: RawNode[] }) => ({
    ...root,
    children: root.children.map((org) => ({
      ...org,
      children: (org.children || []).map((c) => filterNodeByYear(c, year)).filter((c): c is RawNode => c !== null),
    })),
  });
  const revenue_data = side(data.revenue_data);
  const spending_data = side(data.spending_data);
  return {
    ...data,
    year,
    revenue_data,
    spending_data,
    revenue: revenue_data.children.reduce((s, o) => s + sumTreeValue(o), 0),
    spending: spending_data.children.reduce((s, o) => s + sumTreeValue(o), 0),
  };
}

export function buildGraph(data: SankeyData): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeIndex: Record<string, number> = {};

  function getOrAdd(
    id: string,
    label: string,
    type: GraphNode['type'],
    colour: string,
    planned?: number,
    dataNode?: RawNode | null,
    parent?: number,
  ): number {
    if (nodeIndex[id] === undefined) {
      nodeIndex[id] = nodes.length;
      nodes.push({
        id,
        label,
        type,
        colour,
        planned: planned || 0,
        legalBasis: '',
        hasChain: false,
        dataNode: dataNode || null,
        parent,
      });
    }
    return nodeIndex[id];
  }

  function sumLeaves(node: RawNode): number {
    if (node.amount !== undefined) return Math.max(0, node.amount);
    return (node.children || []).reduce((s, c) => s + sumLeaves(c), 0);
  }

  function walk(node: RawNode, side: 'credit' | 'debit', parentIdx: number, colour: string, prefix: string, depth: number) {
    (node.children || []).forEach((child, ci) => {
      const label = child.name.split(' → ').pop() as string;
      const id = prefix + '-' + ci;
      const val = sumLeaves(child);
      if (!child.children) {
        const leafType = side === 'credit' ? 'credit-leaf' : 'debit-leaf';
        const leafColour = side === 'credit' ? LEAF_CREDIT : LEAF_DEBIT;
        const idx = getOrAdd(id, label, leafType, leafColour, undefined, undefined, parentIdx);
        nodes[idx].legalBasis = child.legalBasis || '';
        nodes[idx].hasChain = child.hasChain || false;
        nodes[idx].dataNode = child;
        links.push(
          side === 'credit'
            ? { source: idx, target: parentIdx, value: val, ledgerID: child.ledgerID, txnID: child.transactionID, hasChain: child.hasChain, legalBasis: child.legalBasis || '' }
            : { source: parentIdx, target: idx, value: val, ledgerID: child.ledgerID, txnID: child.transactionID, hasChain: child.hasChain, legalBasis: child.legalBasis || '' },
        );
      } else {
        // Always a sub-category here: the true top-level category node is
        // created by the caller before walk() is ever invoked, so anything
        // walk() encounters — no matter how shallow — is one level below it.
        const nodeType = side === 'credit' ? 'credit-sub' : 'debit-sub';
        const idx = getOrAdd(id, label, nodeType, colour, 0, child, parentIdx);
        links.push(side === 'credit' ? { source: idx, target: parentIdx, value: val } : { source: parentIdx, target: idx, value: val });
        walk(child, side, idx, colour, id, depth + 1);
      }
    });
  }

  getOrAdd('org-centre', data.org || 'Organization', 'org', '#ffffff');

  (data.revenue_data.children[0].children || []).forEach((cat, ci) => {
    const label = cat.name.split(' → ').pop() as string;
    const catId = 'bc-credit-' + ci;
    const colour = CREDIT_COLOURS[ci % CREDIT_COLOURS.length];
    const val = sumLeaves(cat);
    const idx = getOrAdd(catId, label, 'credit-category', colour, 0, cat, nodeIndex['org-centre']);
    links.push({ source: idx, target: nodeIndex['org-centre'], value: val });
    walk(cat, 'credit', idx, colour, catId, 0);
  });

  (data.spending_data.children[0].children || []).forEach((cat, ci) => {
    const label = cat.name.split(' → ').pop() as string;
    const catId = 'bc-debit-' + ci;
    const colour = DEBIT_COLOURS[ci % DEBIT_COLOURS.length];
    const val = sumLeaves(cat);
    const idx = getOrAdd(catId, label, 'debit-category', colour, cat.planned || 0, cat, nodeIndex['org-centre']);
    links.push({ source: nodeIndex['org-centre'], target: idx, value: val });
    walk(cat, 'debit', idx, colour, catId, 0);
  });

  return { nodes, links };
}
