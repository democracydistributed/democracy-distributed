'use client';

import { useEffect, useState } from 'react';
import { fetchSuggestions } from '@/lib/api';
import { fmtRelativeTime } from '@/lib/text';
import type { Suggestion } from '@/lib/types';
import OrgSuggestionComposer from '../OrgSuggestionComposer';

export default function SuggestionsTab({ orgId }: { orgId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  // Suggestions posted this session, shown immediately without waiting on a refetch.
  const [justPosted, setJustPosted] = useState<Suggestion[]>([]);

  useEffect(() => {
    let alive = true;
    fetchSuggestions(orgId)
      .then((d) => {
        if (alive) setSuggestions(d.suggestions);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  if (error) {
    return (
      <>
        <div className="sec-lbl">Suggestions</div>
        <div className="items-state">
          <span className="items-state-err">⚠ Failed to load suggestions</span>
          <span className="items-state-sub">{error}</span>
        </div>
      </>
    );
  }

  if (!suggestions) {
    return (
      <>
        <div className="sec-lbl">Suggestions</div>
        <div className="items-state">Loading suggestions…</div>
      </>
    );
  }

  // Drop any optimistic entry the real fetch already returned, so it isn't shown twice.
  const dedupedJustPosted = justPosted.filter((jp) => !suggestions.some((s) => s.suggestionId === jp.suggestionId));
  const list = [...dedupedJustPosted, ...suggestions];

  return (
    <>
      <div className="sugg-top">
        <div className="sec-lbl" style={{ marginBottom: 0 }}>
          Suggestions
        </div>
        {!composerOpen ? (
          <button className="sugg-new-btn" onClick={() => setComposerOpen(true)}>
            + New
          </button>
        ) : null}
      </div>

      {composerOpen ? (
        <OrgSuggestionComposer
          orgId={orgId}
          onPosted={(posted) => {
            setJustPosted((prev) => [posted, ...prev]);
            setComposerOpen(false);
          }}
          onClose={() => setComposerOpen(false)}
        />
      ) : null}

      {list.length === 0 ? (
        <div className="items-state">No suggestions yet — be the first.</div>
      ) : (
        list.map((s, i) => (
          <div className={`sugg-card${dedupedJustPosted.includes(s) ? ' mine' : ''}`} key={s.suggestionId || i}>
            {dedupedJustPosted.includes(s) ? <div className="sugg-yours-tag">Yours</div> : null}
            {s.subject ? <div className="sugg-subject-line">{s.subject}</div> : null}
            <div className="sugg-text">{s.text}</div>
            <div className="sugg-meta-row">
              <div className="sugg-meta">
                {[s.category, s.createdAt ? fmtRelativeTime(s.createdAt) : null].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
