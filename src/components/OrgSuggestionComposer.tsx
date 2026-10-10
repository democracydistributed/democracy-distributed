'use client';

import { useState } from 'react';
import { postSuggestion } from '@/lib/api';
import { useMemberName } from '@/hooks/useMemberName';
import type { Suggestion } from '@/lib/types';

/** "+ New" suggestion form on an org's Suggestions tab: a subject and a description,
 *  about this org. Deliberately no category chips — those belong to the footer's
 *  site-wide feedback form (FeedbackComposer). */
export default function OrgSuggestionComposer({
  orgId,
  onPosted,
  onClose,
}: {
  orgId: string;
  onPosted: (s: Suggestion) => void;
  onClose: () => void;
}) {
  const memberName = useMemberName();
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ready = !!subject.trim() && !!text.trim() && !submitting;

  async function submit() {
    if (!ready) return;
    const s = subject.trim();
    const t = text.trim();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await postSuggestion({
        orgId,
        subject: s,
        text: t,
        email: memberName ? undefined : email.trim() || undefined,
      });
      onPosted({ suggestionId: res.id, subject: s, text: t, status: 'New', createdAt: new Date().toISOString() });
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
          New suggestion
        </div>
        <button className="sugg-composer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <input
        className="sugg-subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        maxLength={200}
      />
      <textarea
        className="sugg-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe your suggestion…"
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
        <button className="sugg-submit-btn" onClick={submit} disabled={!ready}>
          {submitting ? 'Posting…' : 'Post suggestion →'}
        </button>
      </div>
    </div>
  );
}
