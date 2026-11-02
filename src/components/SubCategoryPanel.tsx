'use client';

import { useState } from 'react';
import DrawerActionBar from './DrawerActionBar';
import type { ReactionTarget } from '@/lib/api';
import type { Formatter } from '@/lib/format';
import { countLeaves, sumTreeValue } from '@/lib/sankey';
import type { DrawerCategoryFrame, RawNode } from '@/lib/types';

// Drawer view for a sub-category: a two-column grid of tiles, largest first,
// with the biggest as a full-width hero. Shows 5 at first, then loads more.

const FIRST_BATCH = 5;
const BATCH = 4;

interface Props {
  frame: DrawerCategoryFrame;
  fmt: Formatter;
  backBtn: React.ReactNode;
  target: ReactionTarget;
  onDrill: (idx: number) => void;
  onTrace: (idx: number) => void;
}

/** True when this frame holds categories within a category, at any depth, so it gets tiles. */
export function isSubCategoryFrame(frame: DrawerCategoryFrame): boolean {
  const kids = frame.dataNode.children;
  return !frame.dataNode.entries?.length && !!kids?.some((c) => c.children || c.entries);
}

// How many of the two columns a tile takes. The first tile is always the hero;
// a lone last tile on an odd row stretches so the grid has no hole.
function span(i: number, shown: number): 1 | 2 {
  const first = Math.min(shown, FIRST_BATCH);
  if (i < first) {
    if (first <= 2 || i === 0) return 2;
    if (first === 4 && i === 3) return 2;
    return 1;
  }
  const j = i - first;
  const left = shown - first;
  return j === left - 1 && left % 2 === 1 && (j % 4) % 2 === 0 ? 2 : 1;
}

export default function SubCategoryPanel({ frame, fmt, backBtn, target, onDrill, onTrace }: Props) {
  const [shown, setShown] = useState(FIRST_BATCH);
  const { label, amount, eyebrow, dataNode } = frame;

  // Raw entry sums, not sumTreeValue or the leaf's amount: both clamp negatives
  // to 0, and a net credit line should show as one.
  const items = (dataNode.children || [])
    .map((child: RawNode, idx) => ({
      child,
      idx,
      name: child.name.split(' → ').pop() as string,
      count: child.entries ? child.entries.length : countLeaves(child),
      value: child.entries ? child.entries.reduce((s, e) => s + (e.amount || 0), 0) : sumTreeValue(child),
    }))
    .sort((a, b) => b.value - a.value);

  const visible = Math.min(shown, items.length);
  const left = items.length - visible;

  return (
    <div className="sub">
      <div className="sub-head">
        {backBtn}
        <div className="drw-eyebrow">{eyebrow || 'Sub-Category'}</div>
        <h2 className="sub-title">{label}</h2>
        <div className="sub-amount">{fmt(amount)}</div>
      </div>

      <section className="sub-body" aria-labelledby="sub-where">
        <div className="sub-where-row">
          <h3 id="sub-where" className="sub-section-label">Where it went</h3>
          <span className="sub-mono">{visible} of {items.length}</span>
        </div>
        <div className="sub-grid">
          {items.slice(0, visible).map((it, i) => {
            const hero = i === 0;
            const isLeaf = !it.child.children && !it.child.entries;
            const pct = it.value < 0 ? 'credit' : amount > 0 && it.value > 0 ? `${Math.max(1, Math.round((it.value / amount) * 100))}%` : '';
            const money = it.value < 0 ? `−${fmt(-it.value)}` : fmt(it.value);
            const meta = isLeaf ? '' : `${it.child.merchant ? 'Merchant group · ' : ''}${it.count} transaction${it.count !== 1 ? 's' : ''}`;
            return (
              <button
                key={it.idx}
                className={`sub-tile${hero ? ' hero' : ''}`}
                style={{ gridColumn: `span ${span(i, visible)}` }}
                aria-label={`${it.name}, ${money}${pct ? ', ' + pct : ''}${meta ? ', ' + meta : ''}. Open.`}
                onClick={() => (isLeaf ? onTrace(it.idx) : onDrill(it.idx))}
              >
                <span className="sub-tile-top">
                  <span className="sub-tile-label">
                    <span className="sub-tile-name">{it.name}</span>
                    {meta ? <span className="sub-tile-meta">{meta}</span> : null}
                  </span>
                  <span className="sub-tile-pct">{pct}</span>
                </span>
                <span className="sub-tile-bottom">
                  <span className="sub-tile-amount">{money}</span>
                  <span className="sub-tile-arrow" aria-hidden="true">›</span>
                </span>
              </button>
            );
          })}
        </div>
        {left > 0 ? (
          <button className="sub-more" onClick={() => setShown(visible + Math.min(BATCH, left))}>
            Load {Math.min(BATCH, left)} more
          </button>
        ) : null}
        <DrawerActionBar target={target} />
      </section>
    </div>
  );
}
