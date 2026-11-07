'use client';

import { useEffect, useState } from 'react';
import { fetchSuggestions } from '@/lib/api';
import { fmtRelativeTime, suggestionHeadline } from '@/lib/text';
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
        <div className="items-state">Loading suggestions…</div>
      </>
    );
  }

  // Drop any optimistic entry the real fetch already returned, so it isn't shown twice.
  const dedupedJustPosted = justPosted.filter((jp) => !suggestions.some((s) => s.suggestionId === jp.suggestionId));
  // Newest first. Records posted this session stay pinned at the top.
  const byNewest = [...suggestions].sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '') || 0);
  const list = [...dedupedJustPosted, ...byNewest];

  return (
    <>
      {!composerOpen ? (
        <div className="sugg-top">
          <div className="sugg-count">
            {list.length} suggestion{list.length === 1 ? '' : 's'}
          </div>
          <button className="sugg-new-btn" onClick={() => setComposerOpen(true)}>
            + New
          </button>
        </div>
      ) : null}

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
        list.map((s, i) => {
          const { title, preview } = suggestionHeadline(s);
          return (
          <div className={`sugg-card${dedupedJustPosted.includes(s) ? ' mine' : ''}`} key={s.suggestionId || i}>
            {dedupedJustPosted.includes(s) ? <div className="sugg-yours-tag">Yours</div> : null}
            <div className="sugg-subject-line">{title}</div>
            {preview ? <div className="sugg-text sugg-preview">{preview}</div> : null}
            <div className="sugg-meta-row">
              <div className="sugg-meta">
                {s.author ? (
                  <span className="sugg-author">
                    <span className={s.anonymous ? 'sugg-avatar-anon' : 'sugg-avatar'} aria-hidden="true">
                      {s.anonymous ? '?' : s.author[0].toUpperCase()}
                    </span>
                    {s.author}
                  </span>
                ) : null}
                {s.createdAt ? <span>{fmtRelativeTime(s.createdAt)}</span> : null}
                {s.category ? <span className="sugg-chip">{s.category}</span> : null}
                {s.status ? <span className="sugg-chip sugg-status">{s.status}</span> : null}
                {s.ref ? <span>{s.ref}</span> : null}
              </div>
            </div>
          </div>
          );
        })
      )}
    </>
  );
}
