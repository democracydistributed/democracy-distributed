'use client';

import { useState } from 'react';
import { postSuggestion } from '@/lib/api';
import { useMemberName } from '@/hooks/useMemberName';

const CATEGORIES = ["This data looks wrong", 'Feature idea', "Something's broken", 'Other'];

/** Site-wide feedback form, opened from the footer. Asks what kind of feedback it is
 *  (category chips). No org is sent, so the server files it under DD Central Government.
 *  The org pages use a different form — see OrgSuggestionComposer. */
export default function FeedbackComposer({ onSent, onClose }: { onSent: () => void; onClose: () => void }) {
  const memberName = useMemberName();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await postSuggestion({ text: trimmed, category, email: memberName ? undefined : email.trim() || undefined });
      onSent();
    } catch (e) {
      setSubmitError((e as Error).message || 'Something went wrong — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sugg-composer">
      <div className="sugg-composer-hd">
        <div className="items-state-sub" style={{ padding: 0 }}>
          Feedback about Democracy Distributed
        </div>
        <button className="sugg-composer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="sugg-cats">
        {CATEGORIES.map((c) => (
          <button key={c} className={`sugg-cat-chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>
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
      {memberName === null ? (
        <div className="sugg-email-row">
          <input className="sugg-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <div className="sugg-email-optional">Optional</div>
        </div>
      ) : memberName ? (
        <div className="items-state-sub" style={{ padding: 0, marginTop: 8 }}>
          Posting as {memberName}
        </div>
      ) : null}
      {submitError ? <div className="sugg-error">{submitError}</div> : null}
      <div className="sugg-composer-footer">
        <button className="sugg-submit-btn" onClick={submit} disabled={!text.trim() || submitting}>
          {submitting ? 'Sending…' : 'Send feedback →'}
        </button>
      </div>
    </div>
  );
}
