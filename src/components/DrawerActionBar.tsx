'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchReactionSummary, postReaction, type ReactionSummary as Summary, type ReactionTarget } from '@/lib/api';
import { FEELINGS, NEUTRAL_MOUTH, type FeelingValue } from '@/lib/feelings';
import ReactionSummary from './ReactionSummary';

// The reactions area under a drawer screen: the "N reacted" panel and the row of actions
// (React, Comment, Share, Flag). React is live and saved to Corteza (one reaction per
// visitor per item; picking again changes it, and the server remembers who you are across
// a refresh). The other three are placeholders until they're built.
//
// Corteza calls are slow (hundreds of ms each), so this component never makes you wait for
// them: one request loads everything when the drawer opens, and tapping a face updates the
// button and the counts immediately, then confirms with the server in the background.

function Face({ mouth, size }: { mouth: string; size: number }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ width: size, height: size }}>
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="19" r="2.4" fill="currentColor" />
      <circle cx="31" cy="19" r="2.4" fill="currentColor" />
      <path d={mouth} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const SOON = [
  { label: 'Comment', icon: <path d="M4 5h16v11H9l-5 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /> },
  { label: 'Share', icon: <path d="M5 12v7h14v-7M12 15V4M7.5 8.5L12 4l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> },
  { label: 'Flag', icon: <path d="M6 21V4M6 5h12l-2.5 4L18 13H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> },
];

const asFeeling = (v: string | null): FeelingValue | null => FEELINGS.find((f) => f.value === v)?.value ?? null;

/** What the summary will look like once this visitor's pick is counted, shown before the server confirms. */
function withMyPick(s: Summary, previous: FeelingValue | null, next: FeelingValue): Summary {
  const counts = { ...s.counts, [next]: (s.counts[next] ?? 0) + 1 };
  if (previous) counts[previous] = Math.max(0, (counts[previous] ?? 0) - 1);
  return {
    ...s,
    counts,
    total: previous ? s.total : s.total + 1,
    mine: next,
    latest: [{ reaction: next, who: 'You', when: new Date().toISOString() }, ...s.latest.filter((r) => r.who !== 'You')],
  };
}

export default function DrawerActionBar({ target }: { target: ReactionTarget }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [feeling, setFeeling] = useState<FeelingValue | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Counts each pick, so a slow confirmation for an older pick can't overwrite a newer one;
  // `touched` stops the opening load from overwriting a face the visitor picked meanwhile.
  const pickSeq = useRef(0);
  const touched = useRef(false);
  const current = FEELINGS.find((f) => f.value === feeling) || null;

  const { orgId, year, relatedTo } = target;
  useEffect(() => {
    let live = true;
    setSummary(null);
    setFeeling(null);
    setLoadFailed(false);
    setError(null);
    touched.current = false;
    fetchReactionSummary({ orgId, year, relatedTo })
      .then((d) => {
        if (!live) return;
        setSummary(d);
        if (!touched.current) setFeeling(asFeeling(d.mine));
      })
      .catch(() => {
        if (live) setLoadFailed(true);
      });
    return () => {
      live = false;
    };
  }, [orgId, year, relatedTo]);

  const pick = (value: FeelingValue) => {
    if (saving) return;
    const previous = feeling;
    const previousSummary = summary;
    setOpen(false);
    if (value === previous) return;

    const seq = ++pickSeq.current;
    touched.current = true;
    setFeeling(value);
    setError(null);
    setSaving(true);
    if (summary) setSummary(withMyPick(summary, previous, value));

    postReaction(target, value).then(
      () => {
        setSaving(false);
        // Quietly swap the guess for the real numbers, unless the visitor has picked again since.
        fetchReactionSummary({ orgId, year, relatedTo })
          .then((d) => {
            if (seq === pickSeq.current) setSummary(d);
          })
          .catch(() => {
            /* the on-screen guess stays; it was already right for this visitor */
          });
      },
      (e: Error) => {
        setSaving(false);
        if (seq !== pickSeq.current) return;
        setFeeling(previous);
        setSummary(previousSummary);
        setError(e.message || "Couldn't save your reaction. Please try again.");
      },
    );
  };

  return (
    <>
      <ReactionSummary data={summary} failed={loadFailed} resetKey={`${orgId}|${year}|${relatedTo}`} />
      {/* Sticks to the bottom of the drawer while the content above is long enough to push it
          off-screen, and sits in its normal place once you've scrolled down to it. */}
      <div className="act-dock">
      <div className="act-status" role="status">
        {error ? <span className="act-error">{error}</span> : saving ? 'Saving…' : null}
      </div>
      <div className="act-bar" role="group" aria-label="Actions">
        <div className="act-react-wrap">
          {open ? (
            <>
              <button className="act-scrim" aria-label="Close reactions" onClick={() => setOpen(false)} />
              <div className="act-pop" role="group" aria-label="How does this sit with you?">
                {FEELINGS.map((f) => {
                  const on = f.value === feeling;
                  return (
                    <button
                      key={f.value}
                      className={`act-pick${on ? ' on' : ''}`}
                      style={{ '--feel': f.color } as React.CSSProperties}
                      aria-pressed={on}
                      onClick={() => pick(f.value)}
                    >
                      <Face mouth={f.mouth} size={36} />
                      <span>{f.value}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
          <button
            className="act-btn"
            style={current ? ({ color: current.color, fontWeight: 600 } as React.CSSProperties) : undefined}
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Face mouth={current ? current.mouth : NEUTRAL_MOUTH} size={28} />
            <span>{current ? current.value : 'React'}</span>
          </button>
        </div>

        {SOON.map((s) => (
          <button key={s.label} className="act-btn soon" disabled aria-label={`${s.label}, coming soon`}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 26, height: 26 }}>{s.icon}</svg>
            <span>{s.label}</span>
            <span className="act-soon">Soon</span>
          </button>
        ))}
      </div>
      </div>
    </>
  );
}
