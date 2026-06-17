// Pure graph-building + tree helpers. Ported 1:1 from the vanilla component.
import type { GraphLink, GraphNode, RawNode, SankeyData } from './types';

export const CREDIT_COLOURS = ['#2dd4bf', '#60a5fa', '#818cf8', '#34d399', '#22d3ee', '#a78bfa', '#4ade80', '#38bdf8', '#6ee7b7'];
export const DEBIT_COLOURS = ['#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#f97316', '#ec4899', '#84cc16'];
export const LEAF_CREDIT = '#0f4c5c';
export const LEAF_DEBIT = '#4a1942';

export function shortName(fullName: string): string {
  return fullName.split(' → ').pop() as string;
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
        const idx = getOrAdd(id, label, leafType, leafColour);
        nodes[idx].legalBasis = child.legalBasis || '';
        nodes[idx].hasChain = child.hasChain || false;
        nodes[idx].dataNode = child;
        links.push(
          side === 'credit'
            ? { source: idx, target: parentIdx, value: val, ledgerID: child.ledgerID, txnID: child.transactionID, hasChain: child.hasChain, legalBasis: child.legalBasis || '' }
            : { source: parentIdx, target: idx, value: val, ledgerID: child.ledgerID, txnID: child.transactionID, hasChain: child.hasChain, legalBasis: child.legalBasis || '' },
        );
      } else {
        const nodeType =
          side === 'credit' ? (depth === 0 ? 'credit-category' : 'credit-sub') : depth === 0 ? 'debit-category' : 'debit-sub';
        const idx = getOrAdd(id, label, nodeType, colour, 0, child);
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
    const idx = getOrAdd(catId, label, 'credit-category', colour, 0, cat);
    links.push({ source: idx, target: nodeIndex['org-centre'], value: val });
    walk(cat, 'credit', idx, colour, catId, 0);
  });

  (data.spending_data.children[0].children || []).forEach((cat, ci) => {
    const label = cat.name.split(' → ').pop() as string;
    const catId = 'bc-debit-' + ci;
    const colour = DEBIT_COLOURS[ci % DEBIT_COLOURS.length];
    const val = sumLeaves(cat);
    const idx = getOrAdd(catId, label, 'debit-category', colour, cat.planned || 0, cat);
    links.push({ source: nodeIndex['org-centre'], target: idx, value: val });
    walk(cat, 'debit', idx, colour, catId, 0);
  });

  return { nodes, links };
}
