'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtProjectDate, suggestionHeadline } from '@/lib/text';
import type { Suggestion } from '@/lib/types';

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
  list,
  index,
  onClose,
  onStep,
}: {
  list: Suggestion[];
  index: number;
  onClose: () => void;
  onStep: (d: number) => void;
}) {
  // Play the exit animation, then unmount.
  const [closing, setClosing] = useState(false);
  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  }, [closing, onClose]);

  const closeRef = useRef<HTMLButtonElement>(null);

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
    .map((t) => ({ text: t.replace(/^\*\s+/, ''), bullet: /^\*\s+/.test(t) }));

  const submitted = fmtProjectDate(s.createdAt);
  const edited = fmtProjectDate(s.updatedAt);
  const stageIdx = STAGES.findIndex((x) => x.toLowerCase() === (s.status ?? '').trim().toLowerCase());
  // Blank values are left out, not shown as "—".
  const rows: { label: string; value: string }[] = [];
  if (s.ref) rows.push({ label: 'Reference', value: s.ref });
  if (edited) rows.push({ label: 'Last edited', value: edited });

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
            {s.category ? <span className="sugg-chip">{s.category}</span> : null}
            {s.status ? <span className="sugg-status">{s.status}</span> : null}
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
                  {l.text}
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
          <div className="pj-panel-foot">
            <a
              className="sugg-corteza-link"
              href={`${CORTEZA_SUGGESTION_RECORD_URL}/${encodeURIComponent(s.suggestionId)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in Corteza ↗
            </a>
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}
