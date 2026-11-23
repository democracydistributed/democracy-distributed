'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchSuggestions, postVote } from '@/lib/api';
import { fmtRelativeTime, SHOW_SUGGESTION_STATUS, suggestionHeadline } from '@/lib/text';
import type { Suggestion } from '@/lib/types';
import OrgSuggestionComposer from '../OrgSuggestionComposer';
import SuggestionPanel from '../SuggestionPanel';
import VoteControl from '../VoteControl';

type SortMode = 'top' | 'new' | 'old';
const SORTS: { value: SortMode; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'Newest' },
  { value: 'old', label: 'Oldest' },
];
const voteValue = (v: 'up' | 'down' | null | undefined) => (v === 'up' ? 1 : v === 'down' ? -1 : 0);
const time = (s: Suggestion) => Date.parse(s.createdAt || '') || 0;

export default function SuggestionsTab({ orgId }: { orgId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [sort, setSort] = useState<SortMode>('top');
  // Team filter: null shows everything, otherwise only that team's suggestions.
  const [team, setTeam] = useState<string | null>(null);
  // The scores the list was last ordered by. Ordering reads these, not the live scores, so a
  // card doesn't jump away from under your cursor the moment you vote; it moves next time you
  // load the list or change the sort.
  const rankScores = useRef<Record<string, number>>({});
  // Suggestions whose vote is still being saved, and the last vote error.
  const [voting, setVoting] = useState<Set<string>>(new Set());
  const [voteError, setVoteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  // Suggestions posted this session, shown immediately without waiting on a refetch.
  const [justPosted, setJustPosted] = useState<Suggestion[]>([]);
  // Which suggestion's detail panel is open (by key; see keyOf).
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchSuggestions(orgId)
      .then((d) => {
        if (!alive) return;
        rankScores.current = Object.fromEntries(d.suggestions.map((s) => [s.suggestionId ?? '', s.score ?? 0]));
        setSuggestions(d.suggestions);
        // Deep link (?suggestion=<id>), e.g. from a "View your request" link: open that one.
        const want = new URLSearchParams(window.location.search).get('suggestion');
        if (want && /^\d{1,20}$/.test(want) && d.suggestions.some((s) => s.suggestionId === want)) setOpenKey(want);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  function patch(id: string, change: Partial<Suggestion>) {
    const apply = (arr: Suggestion[]) => arr.map((s) => (s.suggestionId === id ? { ...s, ...change } : s));
    setSuggestions((prev) => (prev ? apply(prev) : prev));
    setJustPosted(apply);
  }

  // Shows the new vote and total straight away, then saves it. If saving fails the old numbers
  // come back and the error is shown. Pressing the arrow you already chose takes the vote back.
  async function castVote(s: Suggestion, dir: 'up' | 'down') {
    const id = s.suggestionId;
    if (!id || voting.has(id)) return;
    const was = s.myVote ?? null;
    const next = was === dir ? null : dir;
    const prevScore = s.score ?? 0;
    patch(id, { myVote: next, score: prevScore + voteValue(next) - voteValue(was) });
    setVoteError(null);
    setVoting((v) => new Set(v).add(id));
    try {
      const score = await postVote(id, next);
      if (score !== null) patch(id, { score });
    } catch (e) {
      patch(id, { myVote: was, score: prevScore });
      setVoteError((e as Error).message || 'Could not save your vote.');
    } finally {
      setVoting((v) => {
        const n = new Set(v);
        n.delete(id);
        return n;
      });
    }
  }

  function changeSort(mode: SortMode) {
    rankScores.current = Object.fromEntries((suggestions ?? []).map((s) => [s.suggestionId ?? '', s.score ?? 0]));
    setSort(mode);
  }

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
  // Records posted this session stay pinned at the top, whatever the sort.
  const rankOf = (s: Suggestion) => rankScores.current[s.suggestionId ?? ''] ?? s.score ?? 0;
  const ordered = [...suggestions].sort((a, b) =>
    sort === 'old' ? time(a) - time(b) : sort === 'new' ? time(b) - time(a) : rankOf(b) - rankOf(a) || time(b) - time(a),
  );
  const everything = [...dedupedJustPosted, ...ordered];
  // Pills for the teams that actually have suggestions, most first. Hidden when none are tagged yet.
  const teamCounts = new Map<string, number>();
  for (const s of everything) if (s.department) teamCounts.set(s.department, (teamCounts.get(s.department) ?? 0) + 1);
  const teamPills = [...teamCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const list = team ? everything.filter((s) => s.department === team) : everything;
  const keyOf = (s: Suggestion, i: number) => s.suggestionId || `#${i}`;
  const openIndex = openKey === null ? -1 : list.findIndex((s, i) => keyOf(s, i) === openKey);

  return (
    <>
      {!composerOpen ? (
        <div className="sugg-top">
          <div className="sugg-count">
            {list.length} suggestion{list.length === 1 ? '' : 's'}
          </div>
          <div className="sugg-top-actions">
            {list.length > 1 ? (
              <select className="sugg-sort" aria-label="Sort suggestions" value={sort} onChange={(e) => changeSort(e.target.value as SortMode)}>
                {SORTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : null}
            <button className="sugg-new-btn" onClick={() => setComposerOpen(true)}>
              + New
            </button>
          </div>
        </div>
      ) : null}

      {!composerOpen && teamPills.length > 0 ? (
        <div className="pj-chips" role="group" aria-label="Filter by team">
          <button type="button" className={'pj-chip' + (team === null ? ' on' : '')} aria-pressed={team === null} onClick={() => setTeam(null)}>
            All <span className="pj-chip-n">{everything.length}</span>
          </button>
          {teamPills.map(([name, n]) => (
            <button key={name} type="button" className={'pj-chip' + (team === name ? ' on' : '')} aria-pressed={team === name} onClick={() => setTeam(team === name ? null : name)}>
              {name} <span className="pj-chip-n">{n}</span>
            </button>
          ))}
        </div>
      ) : null}

      {voteError ? <div className="sugg-error sugg-vote-error">{voteError}</div> : null}

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
          <div
            className={`sugg-card clickable${dedupedJustPosted.includes(s) ? ' mine' : ''}${s.suggestionId ? ' has-vote' : ''}`}
            key={s.suggestionId || i}
            role="button"
            tabIndex={0}
            onClick={() => setOpenKey(keyOf(s, i))}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setOpenKey(keyOf(s, i));
              }
            }}
          >
            {s.suggestionId ? (
              <VoteControl score={s.score ?? 0} myVote={s.myVote} busy={voting.has(s.suggestionId)} onVote={(dir) => castVote(s, dir)} />
            ) : null}
            <div className="sugg-body">
              {dedupedJustPosted.includes(s) ? <div className="sugg-yours-tag">Yours</div> : null}
              {SHOW_SUGGESTION_STATUS && s.status ? <span className="sugg-status">{s.status}</span> : null}
              {/* The team is the useful label; the category (often just "Other") only shows when there's no team yet. */}
              {s.department || s.category ? <div className="sugg-cat">{s.department || s.category}</div> : null}
              <div className={`sugg-subject-line${SHOW_SUGGESTION_STATUS && s.status ? ' has-status' : ''}`}>{title}</div>
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
                  {s.ref ? <span>{s.ref}</span> : null}
                </div>
              </div>
            </div>
          </div>
          );
        })
      )}

      {openIndex >= 0 ? (
        <SuggestionPanel
          orgId={orgId}
          list={list}
          index={openIndex}
          onClose={() => setOpenKey(null)}
          onVote={castVote}
          votingIds={voting}
          onStep={(d) => {
            const n = list[openIndex + d];
            if (n) setOpenKey(keyOf(n, openIndex + d));
          }}
        />
      ) : null}
    </>
  );
}
