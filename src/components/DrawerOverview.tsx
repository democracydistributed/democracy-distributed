'use client';

import { useEffect, useState } from 'react';
import type { Formatter } from '@/lib/format';
import type { DrawerDemo, FeelingKey } from '@/lib/drawer-demo';
import { sumTreeValue } from '@/lib/sankey';
import type { DrawerCategoryFrame, RawNode } from '@/lib/types';

// The redesigned top-level category drawer: big header, an insights carousel,
// and Engagement / Breakdown tabs. Breakdown is drawn from the real children;
// insights and engagement come from hardcoded demo content (lib/drawer-demo.ts).

interface Props {
  frame: DrawerCategoryFrame;
  demo: DrawerDemo;
  fmt: Formatter;
  hidden: boolean;
  onDrill: (idx: number) => void;
  onTrace: (idx: number) => void;
}

const FEELINGS: { key: FeelingKey; label: string; mouth: string; color: string }[] = [
  { key: 'reasonable', label: 'Reasonable', mouth: 'M15 29 Q24 38 33 29', color: 'var(--teal-text, var(--teal))' },
  { key: 'surprised', label: 'Surprised', mouth: 'M24 29 a3.6 4.6 0 1 0 0.01 0', color: 'var(--amber-text, var(--amber))' },
  { key: 'confused', label: 'Confused', mouth: 'M15 32 Q21 27 33 31', color: 'var(--purple)' },
  { key: 'concerned', label: 'Concerned', mouth: 'M15 34 Q24 26 33 34', color: 'var(--red)' },
];
const FEELING_BY_KEY = Object.fromEntries(FEELINGS.map((f) => [f.key, f])) as Record<FeelingKey, (typeof FEELINGS)[number]>;

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width:560px)');
    const fn = () => setNarrow(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return narrow;
}

export default function DrawerOverview({ frame, demo, fmt, hidden, onDrill, onTrace }: Props) {
  const [tab, setTab] = useState<'engage' | 'break'>('engage');
  const [ins, setIns] = useState(0);
  const [feeling, setFeeling] = useState<FeelingKey | null>(null);
  const [comment, setComment] = useState('');
  const [posted, setPosted] = useState<string | null>(null);
  const [voted, setVoted] = useState<Set<number>>(() => new Set());

  const children: RawNode[] = (frame.dataNode.entries?.length ? frame.dataNode.entries : frame.dataNode.children) || [];
  const n = demo.insights.length;
  const insight = demo.insights[ins];

  const counts = { ...demo.reactions };
  if (feeling) counts[feeling] += 1;
  const responded = Object.values(counts).reduce((a, b) => a + b, 0);
  const ready = comment.trim().length > 0;

  const post = () => {
    if (!ready) return;
    setPosted(comment.trim());
    setComment('');
  };
  const toggleVote = (i: number) =>
    setVoted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="dov" hidden={hidden}>
      <div className="dov-head">
        <div className="drw-eyebrow">{frame.eyebrow || 'Category'}</div>
        <h2 className="dov-title">{frame.label}</h2>
        <div className="dov-amount">{fmt(frame.amount)}</div>
      </div>

      <section className="dov-insights" aria-label="Insights">
        <div className="dov-ins-label">{insight.label}</div>
        <p className="dov-ins-text" aria-live="polite">{insight.text}</p>
        <div className="dov-ins-nav">
          <button className="dov-round" onClick={() => setIns((ins + n - 1) % n)} aria-label="Previous insight">‹</button>
          <button className="dov-round" onClick={() => setIns((ins + 1) % n)} aria-label="Next insight">›</button>
          <div className="dov-dots">
            {demo.insights.map((x, i) => (
              <button key={i} className="dov-dot-btn" onClick={() => setIns(i)} aria-label={`Insight ${i + 1}: ${x.label}`} aria-current={i === ins}>
                <span className={`dov-dot${i === ins ? ' on' : ''}`} />
              </button>
            ))}
          </div>
          <span className="dov-ins-count">{ins + 1} / {n}</span>
        </div>
      </section>

      <div className="dov-tabs" role="tablist" aria-label={frame.label}>
        <button role="tab" id="dov-tab-engage" aria-selected={tab === 'engage'} aria-controls="dov-panel-engage" className={`dov-tab${tab === 'engage' ? ' on' : ''}`} onClick={() => setTab('engage')}>
          Engagement <span className="dov-pill">{responded.toLocaleString()}</span>
        </button>
        <button role="tab" id="dov-tab-break" aria-selected={tab === 'break'} aria-controls="dov-panel-break" className={`dov-tab${tab === 'break' ? ' on' : ''}`} onClick={() => setTab('break')}>
          Breakdown <span className="dov-pill">{children.length}</span>
        </button>
      </div>

      {tab === 'engage' ? (
        <section role="tabpanel" id="dov-panel-engage" aria-labelledby="dov-tab-engage" className="dov-panel dov-engage">
          <div className="dov-q-row">
            <div className="dov-q">How does this sit with you?</div>
            <div className="dov-mono">{responded.toLocaleString()} residents have responded</div>
          </div>

          <div className="dov-feelings">
            {FEELINGS.map((f) => {
              const on = feeling === f.key;
              return (
                <button
                  key={f.key}
                  className={`dov-feel${on ? ' on' : ''}`}
                  style={{ '--feel': f.color } as React.CSSProperties}
                  aria-pressed={on}
                  onClick={() => setFeeling(on ? null : f.key)}
                >
                  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="17" cy="19" r="2.4" fill="currentColor" />
                    <circle cx="31" cy="19" r="2.4" fill="currentColor" />
                    <path d={f.mouth} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <span className="dov-feel-label">{f.label}</span>
                  <span className="dov-mono dov-feel-share">{feeling ? `${Math.round((counts[f.key] / responded) * 100)}%` : ''}</span>
                </button>
              );
            })}
          </div>

          <div className="dov-compose">
            <textarea
              className="dov-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment. What stands out, what's unclear, what you'd ask the city."
              aria-label="Add a comment"
            />
            <div className="dov-compose-row">
              <span className="dov-mono">Anonymous · no account needed · {(demo.commentCount + (posted ? 1 : 0)).toLocaleString()} comments so far</span>
              <button className="dov-post" disabled={!ready} onClick={post}>Post comment</button>
            </div>
          </div>

          <div className="dov-comments">
            <div className="dov-section-label">Recent comments</div>
            {posted ? (
              <article className="dov-comment">
                <div className="dov-comment-meta">
                  {feeling ? <FeelingChip k={feeling} /> : null}
                  <span className="dov-mono">You · just now</span>
                </div>
                <p>{posted}</p>
              </article>
            ) : null}
            {demo.comments.map((c, i) => (
              <article className="dov-comment" key={i}>
                <div className="dov-comment-meta">
                  <FeelingChip k={c.feeling} />
                  <span className="dov-mono">{c.who} · {c.when}</span>
                </div>
                <p>{c.text}</p>
                <button className={`dov-vote${voted.has(i) ? ' on' : ''}`} aria-pressed={voted.has(i)} onClick={() => toggleVote(i)}>
                  ▲ {c.votes + (voted.has(i) ? 1 : 0)}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <Breakdown nodes={children} total={frame.amount} fmt={fmt} onDrill={onDrill} onTrace={onTrace} />
      )}
    </div>
  );
}

function FeelingChip({ k }: { k: FeelingKey }) {
  const f = FEELING_BY_KEY[k];
  return <span className="dov-chip" style={{ '--feel': f.color } as React.CSSProperties}>{f.label}</span>;
}

// Grid placement for the bento. Wide: a 6-column grid where the largest child
// takes a 4×4 block, the next two stack beside it, and the rest fill rows of
// two or three. Narrow: 2 columns, largest full width, then pairs.
function placements(count: number, narrow: boolean): string[] {
  const out: string[] = [];
  if (narrow) {
    for (let i = 0; i < count; i++) {
      const fullRow = i === 0 || (i === count - 1 && (count - 1) % 2 === 1);
      out.push(fullRow ? 'span 1 / span 2' : 'span 1 / span 1');
    }
    return out;
  }
  if (count === 1) return ['1 / 1 / 5 / 7'];
  out.push('1 / 1 / 5 / 5');
  if (count === 2) return [...out, '1 / 5 / 5 / 7'];
  out.push('1 / 5 / 3 / 7', '3 / 5 / 5 / 7');
  const rest = count - 3;
  const rows = Math.ceil(rest / 3);
  let row = 5;
  for (let r = 0; r < rows; r++) {
    const inRow = Math.floor(rest / rows) + (r < rest % rows ? 1 : 0);
    const span = 6 / inRow;
    for (let c = 0; c < inRow; c++) out.push(`${row} / ${1 + c * span} / ${row + 1} / ${1 + (c + 1) * span}`);
    row++;
  }
  return out;
}

function Breakdown({
  nodes,
  total,
  fmt,
  onDrill,
  onTrace,
}: {
  nodes: RawNode[];
  total: number;
  fmt: Formatter;
  onDrill: (idx: number) => void;
  onTrace: (idx: number) => void;
}) {
  const narrow = useNarrow();
  // Raw entry sums, not sumTreeValue or the leaf's amount: both clamp negatives
  // to 0, and a net credit line (e.g. TTC External Transfers) should show as one.
  const items = nodes
    .map((child, idx) => ({
      child,
      idx,
      name: child.name.split(' → ').pop() as string,
      value: child.entries ? child.entries.reduce((s, e) => s + (e.amount || 0), 0) : sumTreeValue(child),
    }))
    .sort((a, b) => b.value - a.value);
  const place = placements(items.length, narrow);

  return (
    <section role="tabpanel" id="dov-panel-break" aria-labelledby="dov-tab-break" className={`dov-panel dov-bento${narrow ? ' narrow' : ''}`}>
      {items.map((it, i) => {
        const tier = i === 0 ? 'big' : i <= 2 ? 'mid' : 'small';
        const isLeaf = !it.child.children && !it.child.entries;
        const pct = it.value < 0 ? 'credit' : total > 0 && it.value > 0 ? `${Math.max(1, Math.round((it.value / total) * 100))}%` : '';
        const amount = it.value < 0 ? `−${fmt(-it.value)}` : fmt(it.value);
        return (
          <button
            key={it.idx}
            className={`dov-tile ${tier}`}
            style={{ gridArea: place[i] }}
            onClick={() => (isLeaf ? onTrace(it.idx) : onDrill(it.idx))}
          >
            <span className="dov-tile-top">
              <span className="dov-tile-name">{it.name}</span>
              <span className="dov-tile-pct">{pct}</span>
            </span>
            <span className="dov-tile-bottom">
              <span className="dov-tile-amount">{amount}</span>
              <span className="dov-tile-arrow" aria-hidden="true">›</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
