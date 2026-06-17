'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  const statusActive = org?.status?.toLowerCase() === 'active';

  return (
    <header className="page-header">
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
