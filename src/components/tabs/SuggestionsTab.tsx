'use client';

import { useEffect, useState } from 'react';
import { fetchSuggestions, postSuggestion } from '@/lib/api';
import { fmtRelativeTime } from '@/lib/text';
import type { Suggestion } from '@/lib/types';

const CATEGORIES = ["This data looks wrong", 'Feature idea', "Something's broken", 'Other'];

export default function SuggestionsTab({ orgId }: { orgId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await postSuggestion({ orgId, text: trimmed, category, email: email.trim() || undefined });
      setJustPosted((prev) => [
        { suggestionId: res.id, text: trimmed, category, status: 'New', createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setText('');
      setEmail('');
      setComposerOpen(false);
    } catch (e) {
      setSubmitError((e as Error).message || 'Something went wrong — try again.');
    } finally {
      setSubmitting(false);
    }
  }

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
        <div className="sugg-composer">
          <div className="sugg-composer-hd">
            <div className="items-state-sub" style={{ padding: 0 }}>
              What&apos;s the suggestion?
            </div>
            <button className="sugg-composer-close" onClick={() => setComposerOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <div className="sugg-cats">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`sugg-cat-chip${category === c ? ' active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <textarea
            className="sugg-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell us more…"
          />
          <div className="sugg-email-row">
            <input
              className="sugg-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <div className="sugg-email-optional">Optional</div>
          </div>
          {submitError ? <div className="sugg-error">{submitError}</div> : null}
          <div className="sugg-composer-footer">
            <button className="sugg-submit-btn" onClick={submit} disabled={!text.trim() || submitting}>
              {submitting ? 'Posting…' : 'Post suggestion →'}
            </button>
          </div>
        </div>
      ) : null}

      {list.length === 0 ? (
        <div className="items-state">No suggestions yet — be the first.</div>
      ) : (
        list.map((s, i) => (
          <div className={`sugg-card${dedupedJustPosted.includes(s) ? ' mine' : ''}`} key={s.suggestionId || i}>
            {dedupedJustPosted.includes(s) ? <div className="sugg-yours-tag">Yours</div> : null}
            <div className="sugg-text">{s.text}</div>
            <div className="sugg-meta-row">
              <div className="sugg-meta">
                {s.category}
                {s.createdAt ? ` · ${fmtRelativeTime(s.createdAt)}` : ''}
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
