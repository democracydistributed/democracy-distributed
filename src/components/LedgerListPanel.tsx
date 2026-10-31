'use client';

import { useState } from 'react';
import type { Formatter } from '@/lib/format';
import { leafTitle } from '@/lib/sankey';
import type { DrawerCategoryFrame, RawNode } from '@/lib/types';

// Drawer view for a list of transactions (ledger entries): largest first, each
// row with its date, amount and a bar sized against the largest. Shows 5 at
// first, then loads more.

const FIRST_BATCH = 5;
const BATCH = 4;

interface Props {
  frame: DrawerCategoryFrame;
  fmt: Formatter;
  backBtn: React.ReactNode;
  onTrace: (idx: number) => void;
}

/** The transactions this frame lists. Same source the trace handler indexes into. */
export function ledgerEntries(frame: DrawerCategoryFrame): RawNode[] {
  const { entries, children } = frame.dataNode;
  return (entries?.length ? entries : children) || [];
}

function shortDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function LedgerListPanel({ frame, fmt, backBtn, onTrace }: Props) {
  const [shown, setShown] = useState(FIRST_BATCH);
  const { label, amount, eyebrow } = frame;

  const items = ledgerEntries(frame)
    .map((entry, idx) => ({ entry, idx, title: leafTitle(entry), date: shortDate(entry.date), value: entry.amount || 0 }))
    .sort((a, b) => b.value - a.value);

  const visible = Math.min(shown, items.length);
  const left = items.length - visible;
  const max = Math.max(...items.map((it) => Math.abs(it.value)), 0);
  const sum = items.reduce((s, it) => s + Math.max(it.value, 0), 0);
  const top = items[0];
  const insight =
    items.length > 1 && top.value > 0 && sum > 0
      ? `${items.length} transactions. The largest is ${top.title} at ${fmt(top.value)}, ${Math.max(1, Math.round((top.value / sum) * 100))}% of the total.`
      : null;

  return (
    <div className="sub">
      <div className="sub-head">
        {backBtn}
        <div className="drw-eyebrow">{eyebrow || 'Ledger Entry'}</div>
        <h2 className="sub-title">{label}</h2>
        <div className="sub-amount">{fmt(amount)}</div>
      </div>

      <section className="sub-body" aria-labelledby="led-h">
        {insight ? <p className="led-insight">{insight}</p> : null}
        <div className="sub-where-row">
          <h3 id="led-h" className="sub-section-label">Transactions</h3>
          <span className="sub-mono">{visible} of {items.length}</span>
        </div>
        {items.length === 0 ? (
          <div className="sub-mono" style={{ padding: '20px 0' }}>No transactions found for this category.</div>
        ) : (
          <div className="led-list">
            {items.slice(0, visible).map((it) => {
              const money = it.value < 0 ? `−${fmt(-it.value)}` : fmt(it.value);
              return (
                <button
                  key={it.idx}
                  className="led-row"
                  aria-label={`${it.title}, ${money}${it.date ? ', ' + it.date : ''}. Open.`}
                  onClick={() => onTrace(it.idx)}
                >
                  <span className="led-row-top">
                    <span className="led-row-left">
                      <span className="led-name" title={it.title}>{it.title}</span>
                      {it.date ? <span className="led-date">{it.date}</span> : null}
                    </span>
                    <span className="led-row-right">
                      <span className="led-amount">{money}</span>
                      {it.entry.hasChain ? <span className="chain-dot" title="Decision chain linked" /> : null}
                      <span className="led-arrow" aria-hidden="true">›</span>
                    </span>
                  </span>
                  <span className="led-bar" aria-hidden="true">
                    <span className="led-bar-fill" style={{ width: `${max > 0 ? Math.max(2, Math.round((Math.abs(it.value) / max) * 100)) : 0}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {left > 0 ? (
          <button className="sub-more" onClick={() => setShown(visible + Math.min(BATCH, left))}>
            Load {Math.min(BATCH, left)} more
          </button>
        ) : null}
      </section>
    </div>
  );
}
