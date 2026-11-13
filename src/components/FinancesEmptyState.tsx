'use client';

import { useEffect, useRef, useState } from 'react';
import { postSuggestion } from '@/lib/api';

// Shown in place of the Sankey when an org has no financial data to chart
// (the gateway returns an error / nothing usable). Design: "New DD – Finances
// Empty State.html".

const ADD_DATA_URL = 'https://democracy-distributed.gitbook.io/democracy-distributed-docs/contribute/adding-data';

// Decorative ghost of a classic 3-column Sankey (sources -> one hub ->
// destinations), laid out once at module load so every ribbon lines up with
// its nodes. Units are arbitrary; only the proportions matter.
const GHOST = (() => {
  const K = 3.5; // px per unit
  const sources = [62, 18];
  const dests = [18, 20, 14, 12, 3, 13];
  const LX = 40, MX = 530, RX = 1046, W = 14;
  const hubTop = 60;
  const total = sources.reduce((a, b) => a + b, 0) * K;

  // Stack node bars in a column, centred on y=200, with a gap between them.
  const stack = (vals: number[], gap: number) => {
    const h = vals.reduce((a, b) => a + b, 0) * K + gap * (vals.length - 1);
    let y = 200 - h / 2;
    return vals.map((v) => {
      const node = { y0: y, y1: y + v * K };
      y = node.y1 + gap;
      return node;
    });
  };
  const left = stack(sources, 30);
  const right = stack(dests, 10);

  const ribbon = (x0: number, a0: number, a1: number, x1: number, b0: number, b1: number) => {
    const m = (x0 + x1) / 2;
    return `M${x0} ${a0} C ${m} ${a0}, ${m} ${b0}, ${x1} ${b0} L${x1} ${b1} C ${m} ${b1}, ${m} ${a1}, ${x0} ${a1} Z`;
  };

  const ribbons: { d: string; hot: boolean }[] = [];
  let hub = hubTop;
  sources.forEach((v, i) => {
    ribbons.push({ d: ribbon(LX + W, left[i].y0, left[i].y1, MX, hub, hub + v * K), hot: false });
    hub += v * K;
  });
  hub = hubTop;
  dests.forEach((v, i) => {
    ribbons.push({ d: ribbon(MX + W, hub, hub + v * K, RX, right[i].y0, right[i].y1), hot: i === 0 || i === dests.length - 1 });
    hub += v * K;
  });

  const nodes = [
    ...left.map((n) => ({ x: LX, ...n })),
    { x: MX, y0: hubTop, y1: hubTop + total },
    ...right.map((n) => ({ x: RX, ...n })),
  ];
  return { ribbons, nodes, W };
})();

interface Props {
  orgId: string;
  orgName?: string;
}

// Remembers (per browser) that this visitor already asked, so they can't file
// a duplicate. It only mutes the Request Data button: the "Request sent" screen
// itself shows just once, right after clicking, never on a reload.
// Requests are filed under DD Central Government, so that's where "view it" goes.
const DD_CENTRAL_ORG_ID = '394662382766391297';
const viewUrl = (id: string | null) => `/org/${DD_CENTRAL_ORG_ID}?tab=suggestions${id ? `&suggestion=${id}` : ''}`;

const flagKey = (orgId: string) => `dd:finance-requested:${orgId}`;

export default function FinancesEmptyState({ orgId, orgName }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  // True for a moment after a successful request: a green "+1" floats up off the button.
  const [plusOne, setPlusOne] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(flagKey(orgId));
      setAlreadyRequested(!!saved);
      // Newer entries are JSON with the new record's id; older ones were just '1'.
      if (saved) setRequestId(JSON.parse(saved)?.id ?? null);
    } catch {}
  }, [orgId]);

  async function request() {
    setStatus('sending');
    setError(null);
    try {
      // No orgId on purpose: the server files it under DD Central Government
      // (394662382766391297), where the team triages. The org it's about goes
      // in Source_Organization, and in the subject and text for readability.
      const name = orgName || 'this organization';
      const res = await postSuggestion({
        sourceOrgId: orgId,
        subject: `Financial data request: ${name}`,
        text: `A visitor asked for financial data to be added for ${name}.

Org page: ${window.location.origin}/org/${orgId}
Org ID: ${orgId}`,
        category: 'Other',
      });
      try {
        localStorage.setItem(flagKey(orgId), JSON.stringify({ id: res.id ?? null }));
      } catch {}
      setRequestId(res.id ?? null);
      setAlreadyRequested(true);
      // Show the button turn into "Requested ✓" with the +1 floating up, then move
      // on to the "Request sent" screen. (People who prefer less motion get the same
      // beat, but the +1 just fades in and out without moving; see globals.css.)
      setStatus('idle');
      setPlusOne(true);
      timer.current = setTimeout(() => {
        setPlusOne(false);
        setStatus('sent');
      }, 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong, please try again.');
      setStatus('idle');
    }
  }

  return (
    <div className="fin-empty">
      {/* Decorative ghost of a Sankey: filled ribbons + node bars, kept faint
          so the card stays the focus. Filled shapes only (no strokes), so they
          stretch cleanly to any card size. */}
      <svg className="fin-empty-bg" aria-hidden="true" width="100%" height="100%" viewBox="0 0 1100 400" preserveAspectRatio="none">
        <g style={{ fill: 'var(--text)' }} opacity="0.07">
          {GHOST.ribbons.filter((r) => !r.hot).map((r, i) => (
            <path key={i} d={r.d} />
          ))}
        </g>
        <g style={{ fill: 'var(--accent)' }} opacity="0.2">
          {GHOST.ribbons.filter((r) => r.hot).map((r, i) => (
            <path key={i} d={r.d} />
          ))}
        </g>
        <g style={{ fill: 'var(--text)' }} opacity="0.2">
          {GHOST.nodes.map((n, i) => (
            <rect key={i} x={n.x} y={n.y0} width={GHOST.W} height={n.y1 - n.y0} rx="2" />
          ))}
        </g>
      </svg>
      <div className="fin-empty-wrap">
        <div className="fin-empty-card" role="status">
          {status === 'sent' ? (
            <>
              <svg className="fin-empty-check" aria-hidden="true" width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="24" fill="rgba(46,160,105,.18)" />
                <path d="M14 25l7 7 13-15" fill="none" stroke="var(--green)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h2>Request sent.</h2>
              <p>Thanks for letting us know you want to see this. Requests like yours show which data people want most.</p>
              <div className="fin-empty-actions fin-empty-after">
                <a className="fin-empty-primary" href={viewUrl(requestId)}>
                  View your request
                </a>
                <button type="button" className="fin-empty-back" onClick={() => setStatus('idle')}>
                  ← Back
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>No financial data yet.</h2>
              <p>This hasn&apos;t been added yet. Let us know if you want to see it, or add it yourself if you have some numbers.</p>
              <div className="fin-empty-actions">
                {alreadyRequested ? (
                  // Reopens the same "Request sent" screen, which has the link to the request.
                  <span className="fin-empty-btnwrap">
                    <button type="button" className="fin-empty-primary fin-empty-requested" onClick={() => setStatus('sent')}>
                      Requested ✓
                    </button>
                    {plusOne ? (
                      <span className="fin-empty-plus" aria-hidden="true">
                        +1
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <button type="button" className="fin-empty-primary" onClick={request} disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Request Data'}
                  </button>
                )}
                <a className="fin-empty-secondary" href={ADD_DATA_URL} target="_blank" rel="noopener noreferrer">
                  Add Data <span aria-hidden="true">→</span>
                  <span className="sr-only">(opens the guide in a new tab)</span>
                </a>
              </div>
              {error ? <p className="fin-empty-err" role="alert">{error}</p> : null}
              <div className="fin-empty-demo">
                <a href="?org=toronto">See a demo with sample data</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
