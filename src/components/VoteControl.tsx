'use client';

/** The up arrow, score and down arrow for one suggestion. Pressing the arrow you already chose
 *  takes your vote back. Clicks never reach the card behind it, which opens the detail panel. */
export default function VoteControl({
  score,
  myVote,
  busy,
  onVote,
  horizontal,
}: {
  score: number;
  myVote: 'up' | 'down' | null | undefined;
  busy?: boolean;
  onVote: (dir: 'up' | 'down') => void;
  horizontal?: boolean;
}) {
  const press = (dir: 'up' | 'down') => (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onVote(dir);
  };
  return (
    <div
      className={`vote-col${horizontal ? ' horizontal' : ''}`}
      role="group"
      aria-label="Vote on this suggestion"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`vote-btn up${myVote === 'up' ? ' on' : ''}`}
        aria-label="Upvote"
        aria-pressed={myVote === 'up'}
        disabled={busy}
        onClick={press('up')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 10l4.5-4.5 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className={`vote-score${myVote === 'up' ? ' up' : myVote === 'down' ? ' down' : ''}`} aria-live="polite">
        {score}
      </span>
      <button
        type="button"
        className={`vote-btn down${myVote === 'down' ? ' on' : ''}`}
        aria-label="Downvote"
        aria-pressed={myVote === 'down'}
        disabled={busy}
        onClick={press('down')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
