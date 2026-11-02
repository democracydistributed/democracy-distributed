'use client';

import { useEffect, useState } from 'react';
import type { ReactionSummary as Summary } from '@/lib/api';
import { FEELINGS, type FeelingValue } from '@/lib/feelings';

// "N reacted" under a drawer screen: a coloured stack, expanding to the split by face,
// filter chips, and the most recent responses with who gave them. Members appear by
// their Corteza handle; anonymous visitors by an anonymous handle (anon_7f3a9c) so
// one anonymous person can be told from another.

const SHOWN = 6;
const FEELING_BY_VALUE = Object.fromEntries(FEELINGS.map((f) => [f.value, f]));

function ago(iso: string | null): string {
  if (!iso) return '';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days`;
}

export default function ReactionSummary({ data, failed, resetKey }: { data: Summary | null; failed: boolean; resetKey: string }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FeelingValue | null>(null);

  // A different item starts closed and unfiltered.
  useEffect(() => {
    setOpen(false);
    setFilter(null);
  }, [resetKey]);

  if (failed && !data) return <div className="rs-note">Couldn&rsquo;t load reactions right now.</div>;
  if (!data) return <div className="rs-note">&nbsp;</div>;
  if (data.total === 0) return <div className="rs-note">No reactions yet. Be the first.</div>;

  const withCount = FEELINGS.filter((f) => (data.counts[f.value] ?? 0) > 0).sort((a, b) => data.counts[b.value] - data.counts[a.value]);
  const rows = data.latest.filter((r) => filter === null || r.reaction === filter).slice(0, SHOWN);

  return (
    <div className="rs">
      <button className="rs-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="rs-stack" aria-hidden="true">
          {withCount.slice(0, 3).map((f, i) => (
            <span key={f.value} className="rs-dot" style={{ background: f.color, marginLeft: i ? -6 : 0 }} />
          ))}
        </span>
        <span className="rs-count">{data.total.toLocaleString('en-US')} reacted</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open ? (
        <div className="rs-panel">
          <div className="rs-bar" aria-hidden="true">
            {withCount.map((f) => (
              <span key={f.value} style={{ flex: data.counts[f.value], background: f.color }} />
            ))}
          </div>
          <div className="rs-chips">
            {[{ value: null as FeelingValue | null, n: data.total }, ...FEELINGS.map((f) => ({ value: f.value as FeelingValue | null, n: data.counts[f.value] ?? 0 }))].map((c) => (
              <button key={c.value ?? 'all'} className={`rs-chip${filter === c.value ? ' on' : ''}`} aria-pressed={filter === c.value} onClick={() => setFilter(c.value)}>
                {c.value ?? 'All'} <span className="rs-chip-n">{c.n.toLocaleString('en-US')}</span>
              </button>
            ))}
          </div>
          <div className="rs-rows">
            {rows.length === 0 ? <div className="rs-note">No recent responses for this one.</div> : null}
            {rows.map((r, i) => (
              <div className="rs-row" key={i}>
                <span className="rs-face" style={{ '--feel': FEELING_BY_VALUE[r.reaction]?.color ?? 'var(--tm)' } as React.CSSProperties}>{r.reaction}</span>
                <span className="rs-who">{r.who}</span>
                <span className="rs-when">{ago(r.when)}</span>
              </div>
            ))}
          </div>
          <div className="rs-foot">
            <span>Latest responses. Members appear by username; anonymous visitors by an anonymous ID.</span>
            <button className="rs-hide" onClick={() => setOpen(false)}>Hide</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
