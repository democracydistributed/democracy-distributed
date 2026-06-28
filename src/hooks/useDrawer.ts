'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTrace } from '@/lib/api';
import { sumTreeValue } from '@/lib/sankey';
import type { DrawerFrame, DrawerTraceFrame, GraphNode } from '@/lib/types';

type Seed = GraphNode & { value: number };

export function useDrawer() {
  const [stack, setStack] = useState<DrawerFrame[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const stackRef = useRef(stack);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  // Replace a specific (by reference) trace frame with a patched copy.
  const patchFrame = useCallback((target: DrawerTraceFrame, patch: Partial<DrawerTraceFrame>) => {
    setStack((prev) => {
      const i = prev.indexOf(target);
      if (i === -1) return prev;
      const copy = [...prev];
      copy[i] = { ...target, ...patch };
      return copy;
    });
  }, []);

  const openNode = useCallback((node: Seed) => {
    if (!node || !node.dataNode) return;
    const isDebit = node.type.startsWith('debit');
    const side: 'credit' | 'debit' = isDebit ? 'debit' : 'credit';
    const eyebrow =
      node.type === 'debit-category'
        ? 'Expense Category'
        : node.type === 'credit-category'
          ? 'Revenue Category'
          : node.type === 'debit-leaf'
            ? 'Ledger Entry'
            : node.type === 'credit-leaf'
              ? 'Ledger Entry'
              : isDebit
                ? 'Sub-Category'
                : 'Revenue Sub-Category';
    setStack([{ kind: 'category', dataNode: node.dataNode, label: node.label, amount: node.value, side, eyebrow }]);
    setIsOpen(true);
  }, []);

  const drill = useCallback((idx: number) => {
    const frame = stackRef.current[stackRef.current.length - 1];
    if (!frame || frame.kind !== 'category') return;
    const child = (frame.dataNode.children || [])[idx];
    if (!child) return;
    const childLabel = child.name.split(' → ').pop() as string;
    const childAmount = sumTreeValue(child);
    const side = frame.side;
    const eyebrow = child.merchant
      ? 'Merchant Group'
      : child.children
        ? side === 'debit'
          ? 'Sub-Category'
          : 'Revenue Sub-Category'
        : 'Ledger Entry';
    setStack((prev) => [...prev, { kind: 'category', dataNode: child, label: childLabel, amount: childAmount, side, eyebrow }]);
  }, []);

  const trace = useCallback(
    (idx: number) => {
      const frame = stackRef.current[stackRef.current.length - 1];
      if (!frame || frame.kind !== 'category') return;
      const entry = (frame.dataNode.entries || frame.dataNode.children || [])[idx];
      if (!entry) return;
      const entryLabel = entry.name.split(' → ').pop() as string;
      const traceFrame: DrawerTraceFrame = { kind: 'trace', entry, label: entryLabel, side: frame.side, traceData: null, traceError: null };
      setStack((prev) => [...prev, traceFrame]);

      if (!entry.ledgerID) {
        patchFrame(traceFrame, { traceError: 'No ledger ID on this entry.' });
        return;
      }
      fetchTrace(entry.ledgerID)
        .then((data) => patchFrame(traceFrame, { traceData: data, traceError: null }))
        .catch((err: Error) => patchFrame(traceFrame, { traceError: err.message }));
    },
    [patchFrame],
  );

  const back = useCallback(() => {
    setStack((prev) => {
      if (prev.length > 1) return prev.slice(0, -1);
      setIsOpen(false);
      return [];
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setStack([]);
  }, []);

  return { stack, isOpen, openNode, drill, trace, back, close };
}
