'use client';

import { useEffect, useState } from 'react';
import FeedbackComposer from './FeedbackComposer';

/** Footer "Feedback" link: opens the suggestion form in a pop-up for site-wide
 *  feedback. No orgId is sent, so the server files it under DD Central Government. */
export default function FeedbackLink() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function show() {
    setSent(false);
    setOpen(true);
  }

  return (
    <>
      <button type="button" className="f-link-btn" onClick={show}>
        Feedback
      </button>
      {open ? (
        <div className="fb-overlay" onClick={() => setOpen(false)}>
          <div
            className="fb-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Send feedback"
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <div className="sugg-composer fb-sent">
                <div className="sugg-text">Thanks, your feedback was sent.</div>
                <div className="sugg-composer-footer">
                  <button className="sugg-submit-btn" onClick={() => setOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <FeedbackComposer onSent={() => setSent(true)} onClose={() => setOpen(false)} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
