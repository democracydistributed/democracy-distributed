'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { fmtProjectDate, SHOW_SUGGESTION_STATUS, suggestionHeadline } from '@/lib/text';
import type { Suggestion } from '@/lib/types';
import VoteControl from './VoteControl';

/** The progress bar's stages, in order. These are the Suggestion module's Status options
 *  (New, Reviewed, Promoted, Dismissed) minus Dismissed, which ends a suggestion rather than
 *  moving it along, so it shows as a plain label with no bar. If the module's options change,
 *  change this list to match. */
const STAGES = ['New', 'Reviewed', 'Promoted'];

// Same link the item, project and transaction pages have, to this record in Corteza's own UI.
const CORTEZA_SUGGESTION_RECORD_URL = 'https://app.democracydistributed.com/compose/ns/DD/pages/404436937705783297/record';

/**
 * Suggestion detail: a right-hand panel on wide screens, a full-width bottom sheet on phones.
 * Same pattern (and the same pj-* styles) as the task panel on the Projects tab.
 * Prev/next step through the suggestions in the order the list shows them.
 */
export default function SuggestionPanel({
  orgId,
  list,
  index,
  onClose,
  onStep,
  onVote,
  votingIds,
}: {
  /** The org page this tab is on; the share link points back to it. */
  orgId: string;
  list: Suggestion[];
  index: number;
  onClose: () => void;
  onStep: (d: number) => void;
  onVote: (s: Suggestion, dir: 'up' | 'down') => void;
  /** Suggestions with a vote still being saved. */
  votingIds: Set<string>;
}) {
  // Play the exit animation, then unmount.
  const [closing, setClosing] = useState(false);
  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  }, [closing, onClose]);

  const closeRef = useRef<HTMLButtonElement>(null);

  // Share: the deep link (?tab=suggestions&suggestion=<id>) that opens this panel on load.
  // On phones and tablets (touch as the main input) it opens the device's native share sheet.
  // On desktop it just copies the link: the OS sheet there is slow and unfamiliar.
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const shareTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(shareTimer.current), []);
  const shareLink = async (suggestionId: string, shareTitle: string) => {
    const url = `${window.location.origin}/org/${encodeURIComponent(orgId)}?tab=suggestions&suggestion=${encodeURIComponent(suggestionId)}`;
    const data = { title: shareTitle, text: shareTitle, url };
    const touchFirst = window.matchMedia('(pointer: coarse)').matches;
    if (touchFirst && typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        // Closing the sheet is not an error; any other failure falls through to copying.
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    let next: 'copied' | 'failed' = 'copied';
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      next = 'failed';
    }
    setShareState(next);
    window.clearTimeout(shareTimer.current);
    shareTimer.current = window.setTimeout(() => setShareState('idle'), 2000);
  };

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
      else if (e.key === 'ArrowLeft' && index > 0) onStep(-1);
      else if (e.key === 'ArrowRight' && index < list.length - 1) onStep(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, onStep, index, list.length]);

  const s = list[index];
  if (!s) return null;

  const { title, body } = suggestionHeadline(s);
  const lines = body
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)
    // Older requests repeated the org's address and ID in the text; the Organization link below replaces both.
    .filter((t) => !(s.sourceOrgId && /^Org (page|ID):/i.test(t)))
    .map((t) => ({ text: t.replace(/^\*\s+/, ''), bullet: /^\*\s+/.test(t) }));

  const submitted = fmtProjectDate(s.createdAt);
  const stageIdx = SHOW_SUGGESTION_STATUS ? STAGES.findIndex((x) => x.toLowerCase() === (s.status ?? '').trim().toLowerCase()) : -1;
  // Blank values are left out, not shown as "—".
  const rows: { label: string; value: ReactNode }[] = [];
  if (s.ref) rows.push({ label: 'Reference', value: s.ref });

  // The org's name in the text is a link to its page. The name is the one saved in the subject
  // when the request was made ("Financial data request: <name>"), and the link goes by the org's
  // ID, so a later rename never breaks it: the link still works, it just shows the old name.
  const orgName = s.sourceOrgId ? title.replace(/^Financial data request:\s*/i, '').trim() : '';
  const withOrgLink = (t: string): ReactNode => {
    const at = orgName && orgName !== title ? t.indexOf(orgName) : -1;
    if (at < 0 || !s.sourceOrgId) return t;
    return (
      <>
        {t.slice(0, at)}
        <a className="sugg-org-link" href={`/org/${encodeURIComponent(s.sourceOrgId)}`}>
          {orgName}
        </a>
        {t.slice(at + orgName.length)}
      </>
    );
  };

  // Portal to <body>: an ancestor with a transform would otherwise anchor position:fixed to itself.
  return createPortal(
    <>
      <div className={'pj-scrim' + (closing ? ' out' : '')} onClick={requestClose} />
      <div className={'pj-panel sugg-panel' + (closing ? ' out' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="pj-panel-grab" aria-hidden="true">
          <span />
        </div>
        <div className="pj-panel-head">
          <div className="pj-panel-crumb">
            <span>Suggestion</span>
          </div>
          {list.length > 1 ? (
            <div className="pj-panel-nav">
              <button aria-label="Previous suggestion" disabled={index === 0} onClick={() => onStep(-1)}>
                ‹
              </button>
              <span>
                {index + 1}/{list.length}
              </span>
              <button aria-label="Next suggestion" disabled={index === list.length - 1} onClick={() => onStep(1)}>
                ›
              </button>
            </div>
          ) : null}
          <button ref={closeRef} className="pj-panel-x" aria-label="Close" onClick={requestClose}>
            ×
          </button>
        </div>

        <div className="pj-panel-body">
          <h3 className="pj-panel-title">{title}</h3>

          <div className="sugg-panel-meta">
            {s.author ? (
              <span className="sugg-author">
                <span className={s.anonymous ? 'sugg-avatar-anon' : 'sugg-avatar'} aria-hidden="true">
                  {s.anonymous ? '?' : s.author[0].toUpperCase()}
                </span>
                {s.author}
              </span>
            ) : null}
            {submitted ? <span>{submitted}</span> : null}
            {s.department || s.category ? <span className="sugg-chip">{s.department || s.category}</span> : null}
            {SHOW_SUGGESTION_STATUS && s.status ? <span className="sugg-status">{s.status}</span> : null}
          </div>

          {lines.length ? (
            lines.map((l, i) =>
              l.bullet ? (
                <div className="sugg-panel-bullet" key={i}>
                  <span aria-hidden="true" />
                  <span>{l.text}</span>
                </div>
              ) : (
                <p className="sugg-panel-desc" key={i}>
                  {withOrgLink(l.text)}
                </p>
              ),
            )
          ) : (
            <p className="sugg-panel-desc pj-empty">No description yet.</p>
          )}

          {stageIdx >= 0 || rows.length ? <div className="sugg-panel-rule" /> : null}

          {stageIdx >= 0 ? (
            <ol
              className="pj-steps"
              aria-label={`Status: ${s.status}`}
              style={{ gridTemplateColumns: `repeat(${STAGES.length}, 1fr)` }}
            >
              {STAGES.map((st, i) => (
                <li
                  key={st}
                  className={i < stageIdx ? 'past' : i === stageIdx ? 'now' : ''}
                  aria-current={i === stageIdx ? 'step' : undefined}
                >
                  <i />
                  {st}
                </li>
              ))}
            </ol>
          ) : null}

          {rows.map((r) => (
            <div className="sugg-panel-row" key={r.label}>
              <span className="pj-lbl">{r.label}</span>
              <span>{r.value}</span>
            </div>
          ))}
        </div>

        {s.suggestionId ? (
          <div className="pj-panel-foot sugg-panel-foot">
            <VoteControl horizontal score={s.score ?? 0} myVote={s.myVote} busy={votingIds.has(s.suggestionId)} onVote={(dir) => onVote(s, dir)} />
            <div className="sugg-foot-actions">
              <button type="button" className="sugg-corteza-link sugg-share" aria-label="Share this suggestion" onClick={() => shareLink(s.suggestionId!, title)} aria-live="polite">
                {shareState === 'idle' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                    <path d="M16 6l-4-4-4 4" />
                    <path d="M12 2v13" />
                  </svg>
                ) : null}
                {/* On phones the idle label is hidden (icon only) to keep the footer on one line. */}
                <span className={shareState === 'idle' ? 'sugg-share-label' : undefined}>
                  {shareState === 'copied' ? 'Link copied ✓' : shareState === 'failed' ? 'Copy failed' : 'Share'}
                </span>
              </button>
              <a
                className="sugg-corteza-link"
                href={`${CORTEZA_SUGGESTION_RECORD_URL}/${encodeURIComponent(s.suggestionId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View record ↗
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}
