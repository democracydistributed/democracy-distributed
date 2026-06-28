'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { OrgData } from '@/lib/types';

/** Collapsible description, mirroring the original 150-char "Read more" toggle. */
function Description({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  if (text.length <= 150) return <p className="org-desc">{text}</p>;

  return (
    <p className="org-desc">
      {expanded ? text : text.slice(0, 150) + '…'}{' '}
      <button className="desc-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </p>
  );
}

export default function PageHeader({ org }: { org: OrgData | null }) {
  const [ready, setReady] = useState(false);
  const flowRef = useRef<SVGSVGElement>(null);
  const statusActive = org?.status?.toLowerCase() === 'active';

  useEffect(() => {
    // Set per-path dash lengths before animating
    if (flowRef.current) {
      flowRef.current.querySelectorAll('path').forEach((p) => {
        const el = p as SVGPathElement;
        const len = el.getTotalLength();
        el.style.strokeDasharray = String(len);
        el.style.strokeDashoffset = String(len);
      });
    }
    const t = setTimeout(() => {
      setReady(true);
      if (flowRef.current) {
        flowRef.current.querySelectorAll('path').forEach((p) => {
          const el = p as SVGPathElement;
          el.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)';
          el.style.strokeDashoffset = '0';
        });
      }
    }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <header className={`page-header${ready ? ' play' : ''}`}>
      {/* Flow-line SVG — 4 Sankey-echo curves, amber/teal/muted */}
      <svg
        ref={flowRef}
        viewBox="0 0 1100 200"
        preserveAspectRatio="none"
        className="ph-flow"
        aria-hidden="true"
      >
        <path d="M-50,50 C200,50 300,130 600,130 C850,130 900,40 1150,40"  fill="none" stroke="var(--amber)" strokeOpacity="0.09"  strokeWidth="1.5" />
        <path d="M-50,120 C200,120 320,60 600,60 C880,60 920,150 1150,150" fill="none" stroke="var(--teal)"  strokeOpacity="0.08"  strokeWidth="1.5" />
        <path d="M-50,180 C280,180 260,80 560,80 C820,80 950,120 1150,120" fill="none" stroke="var(--tm)"    strokeOpacity="0.055" strokeWidth="1.5" />
        <path d="M-50,90 C220,90 300,160 500,160 C760,160 880,60 1150,60"  fill="none" stroke="var(--amber)" strokeOpacity="0.05"  strokeWidth="1.5" />
      </svg>

      <div className="bc">
        <Link href="/browse">Browse</Link>
        {org ? (
          <>
            <span className="sep">›</span>
            <span>{org.name}</span>
          </>
        ) : null}
      </div>
      {org ? (
        <div className="org-id">
          <div className="org-seal">🏛</div>
          <div className="org-info">
            <h1>{org.name}</h1>
            <div className="org-tags">
              <span className={statusActive ? 'tag tag-amber' : 'tag tag-muted'}>{org.status}</span>
              {org.jurisdiction ? <span className="tag tag-muted">{org.jurisdiction}</span> : null}
            </div>
            <Description text={org.description ?? null} />
            {org.website ? (
              <a href={org.website} target="_blank" rel="noopener" className="org-website-link">
                Visit Website →
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
