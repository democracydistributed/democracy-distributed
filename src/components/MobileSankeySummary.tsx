'use client';

import { useMemo } from 'react';
import { CREDIT_COLOURS, DEBIT_COLOURS, sumTreeValue } from '@/lib/sankey';
import type { Formatter } from '@/lib/format';
import type { GraphNode, RawNode, SankeyData } from '@/lib/types';

const TOP_N = 8;

interface CategoryRow {
  label: string;
  amount: number;
  colour: string;
  dataNode: RawNode;
}

function topCategories(children: RawNode[], colours: string[]): { shown: CategoryRow[]; other: CategoryRow | null } {
  const rows: CategoryRow[] = children
    .map((cat, i) => ({
      label: cat.name.split(' → ').pop() as string,
      amount: sumTreeValue(cat),
      colour: colours[i % colours.length],
      dataNode: cat,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (rows.length <= TOP_N) return { shown: rows, other: null };

  const shown = rows.slice(0, TOP_N);
  const rest = rows.slice(TOP_N);
  const other: CategoryRow = {
    label: 'Other',
    amount: rest.reduce((s, r) => s + r.amount, 0),
    colour: 'var(--tm)',
    dataNode: { name: 'Other', children: rest.map((r) => r.dataNode) },
  };
  return { shown, other };
}

interface Props {
  data: SankeyData;
  fmt: Formatter;
  onOpenNode: (node: GraphNode & { value: number }) => void;
  onViewFullChart: () => void;
}

export default function MobileSankeySummary({ data, fmt, onOpenNode, onViewFullChart }: Props) {
  const revCats = useMemo(
    () => topCategories(data.revenue_data.children[0]?.children || [], CREDIT_COLOURS),
    [data],
  );
  const spendCats = useMemo(
    () => topCategories(data.spending_data.children[0]?.children || [], DEBIT_COLOURS),
    [data],
  );

  const allRevRows = revCats.other ? [...revCats.shown, revCats.other] : revCats.shown;
  const allSpendRows = spendCats.other ? [...spendCats.shown, spendCats.other] : spendCats.shown;
  const revTotal = allRevRows.reduce((s, r) => s + r.amount, 0) || 1;
  const spendTotal = allSpendRows.reduce((s, r) => s + r.amount, 0) || 1;

  function open(row: CategoryRow, type: 'credit-category' | 'debit-category') {
    onOpenNode({
      id: row.label,
      label: row.label,
      type,
      colour: row.colour,
      planned: 0,
      legalBasis: '',
      hasChain: false,
      dataNode: row.dataNode,
      value: row.amount,
    });
  }

  return (
    <div className="mob-sankey">
      <div className="mob-flow-bar">
        <div className="mob-flow-lbl">
          <span>REVENUE</span>
          <span className="mob-flow-amt mob-flow-amt-rev">{fmt(data.revenue)}</span>
        </div>
        <div className="mob-flow-track" role="img" aria-label="Revenue breakdown by source">
          {allRevRows.map((row, i) => (
            <button
              key={i}
              className="mob-flow-seg"
              style={{ width: `${Math.max((row.amount / revTotal) * 100, 1.5)}%`, background: row.colour }}
              onClick={() => open(row, 'credit-category')}
              aria-label={`${row.label}: ${fmt(row.amount)}`}
              title={`${row.label}: ${fmt(row.amount)}`}
            />
          ))}
        </div>
      </div>

      <div className="mob-cat-list">
        {allRevRows.map((row, i) => (
          <button key={i} className="mob-cat-row" onClick={() => open(row, 'credit-category')}>
            <span className="mob-cat-swatch" style={{ background: row.colour }} />
            <span className="mob-cat-name">{row.label}</span>
            <span className="mob-cat-amt">{fmt(row.amount)}</span>
          </button>
        ))}
      </div>

      <div className="mob-flow-bar" style={{ marginTop: 18 }}>
        <div className="mob-flow-lbl">
          <span>SPENDING</span>
          <span className="mob-flow-amt mob-flow-amt-spend">{fmt(data.spending)}</span>
        </div>
        <div className="mob-flow-track" role="img" aria-label="Spending breakdown by category">
          {allSpendRows.map((row, i) => (
            <button
              key={i}
              className="mob-flow-seg"
              style={{ width: `${Math.max((row.amount / spendTotal) * 100, 1.5)}%`, background: row.colour }}
              onClick={() => open(row, 'debit-category')}
              aria-label={`${row.label}: ${fmt(row.amount)}`}
              title={`${row.label}: ${fmt(row.amount)}`}
            />
          ))}
        </div>
      </div>

      <div className="mob-cat-list">
        {allSpendRows.map((row, i) => (
          <button key={i} className="mob-cat-row" onClick={() => open(row, 'debit-category')}>
            <span className="mob-cat-swatch" style={{ background: row.colour }} />
            <span className="mob-cat-name">{row.label}</span>
            <span className="mob-cat-amt">{fmt(row.amount)}</span>
          </button>
        ))}
      </div>

      <button className="mob-view-full" onClick={onViewFullChart}>
        View full chart →
      </button>
    </div>
  );
}
