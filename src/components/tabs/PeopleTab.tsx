'use client';

import { useEffect, useState } from 'react';
import { fetchPeople, PEOPLE_PREVIEW_LIMIT } from '@/lib/api';
import { fmtMonthYear, initialsOf } from '@/lib/text';
import type { Official, OrgMember, PeopleResponse } from '@/lib/types';

function OfficialRow({ o }: { o: Official }) {
  // recorded → name + amber role + "Since {month}"
  if (o.status === 'recorded') {
    const since = fmtMonthYear(o.startDate);
    return (
      <div className="mem-row">
        <div className="av">{initialsOf(o.name)}</div>
        <div>
          <div className="m-name">{o.name || '—'}</div>
          {o.position ? <div className="m-role amber">{o.position}</div> : null}
        </div>
        {since ? <div className="m-since">Since {since}</div> : null}
      </div>
    );
  }

  // holder_not_recorded → role known, holder unknown
  if (o.status === 'holder_not_recorded') {
    return (
      <div className="mem-row">
        <div className="av empty">+</div>
        <div>
          <div className="m-name vacant">Holder not yet recorded</div>
          {o.position ? <div className="m-role amber">{o.position}</div> : null}
        </div>
        <div className="ppl-right">
          <span className="ppl-pill">Help fill this in</span>
        </div>
      </div>
    );
  }

  // role_not_recorded → person known, role unknown
  return (
    <div className="mem-row">
      <div className="av">{initialsOf(o.name)}</div>
      <div>
        <div className="m-name">{o.name || '—'}</div>
        <div className="m-role">Role not recorded</div>
      </div>
      <div className="ppl-right">
        <span className="ppl-pill">Help fill this in</span>
      </div>
    </div>
  );
}

function MemberRow({ m }: { m: OrgMember }) {
  const since = fmtMonthYear(m.startDate);
  return (
    <div className="mem-row">
      <div className="av teal">{initialsOf(m.name)}</div>
      <div>
        <div className="m-name">{m.name || '—'}</div>
        <div className="m-role teal">{m.role || 'Member'}</div>
      </div>
      {since ? <div className="m-since">Since {since}</div> : null}
    </div>
  );
}

export default function PeopleTab({ orgId }: { orgId: string }) {
  const [data, setData] = useState<PeopleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchPeople(orgId)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  if (error) {
    return (
      <>
        <div className="sec-lbl">Officials &amp; People</div>
        <div className="items-state">
          <span className="items-state-err">⚠ Failed to load people</span>
          <span className="items-state-sub">{error}</span>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="sec-lbl">Officials &amp; People</div>
        <div className="items-state">Loading people…</div>
      </>
    );
  }

  const { officials, members, counts } = data;
  const hasMoreOfficials = counts.officials > PEOPLE_PREVIEW_LIMIT;

  return (
    <>
      {/* ── Section 1: Officials (real-world axis) ── */}
      <div className="sec-lbl">Officials &amp; People</div>
      {officials.length === 0 ? (
        <div className="items-state">No positions on record yet.</div>
      ) : (
        <>
          <div className="mem-list">
            {officials.map((o, i) => (
              <OfficialRow o={o} key={o.positionId || o.personId || i} />
            ))}
          </div>
          <p className="ppl-foot">
            Showing {officials.length} of {counts.officials} · recorded holders first, then people awaiting role data, then positions awaiting a holder.
          </p>
          {hasMoreOfficials ? (
            // Disabled until the View-all page exists.
            <span className="ppl-viewall ppl-viewall--disabled" aria-disabled="true">
              View all {counts.officials} officials — page coming soon
            </span>
          ) : null}
        </>
      )}

      {/* ── Section 2: Members & Followers (platform axis) ── */}
      <div className="sec-lbl ppl-sec2">Members &amp; Followers</div>
      {members.length === 0 ? (
        <div className="ppl-empty">
          <p>No one is following this org yet.</p>
          {/* Disabled until the follow flow exists. */}
          <button className="cs-btn" type="button" disabled aria-disabled="true" style={{ opacity: 0.45, cursor: 'not-allowed' }}>
            Follow this org
          </button>
        </div>
      ) : (
        <div className="mem-list">
          {members.map((m, i) => (
            <MemberRow m={m} key={m.userId || i} />
          ))}
        </div>
      )}
    </>
  );
}
