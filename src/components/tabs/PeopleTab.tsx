'use client';

import { useEffect, useState } from 'react';
import { fetchPeople, PEOPLE_PREVIEW_LIMIT } from '@/lib/api';
import { fmtMonthYear, initialsOf } from '@/lib/text';
import type { Department, Official, OrgMember, PeopleResponse } from '@/lib/types';

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

// Up to this many top-level departments show as circles; past MAX_ALL the last circle becomes "+N more".
const MAX_ALL = 12;
const SHOWN_WITH_MORE = 10;
const REVEAL_STEP = 20;
const REVEAL_LEFTOVER = 4;

// A circle's text is 12px. A name with one very long word shrinks a little so the word stays whole:
// 12+ letters (e.g. "Documentation") -> 11px; 14+ letters (e.g. "Communications") -> 10.5px.
// 10.5px is the floor; it never shrinks further (a longer word wraps instead).
const CIRCLE_FONT_PX = 12;
function circleFontPx(name: string | null): number {
  const longest = (name || '').split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  if (longest >= 14) return 10.5;
  if (longest >= 12) return 11;
  return CIRCLE_FONT_PX;
}

/** Departments (gov orgs) or Teams (POD groups) as plain circles above the people lists.
 *  They come in the same /people response. Renders nothing when the org has none (or the
 *  endpoint predates departments): it only adds to the page. */
function DepartmentsSection({ depts, isCommunity }: { depts?: Department[]; isCommunity: boolean }) {
  const [visible, setVisible] = useState(SHOWN_WITH_MORE);

  if (!depts) return null;
  // Circles are the top level. A department whose parent isn't in the list counts as top level too.
  const ids = new Set(depts.map((d) => d.id));
  const top = depts.filter((d) => (d.name || '').trim() && (!d.parentId || !ids.has(d.parentId)));
  if (top.length === 0) return null;

  const collapsible = top.length > MAX_ALL;
  const shown = collapsible ? top.slice(0, visible) : top;
  const remaining = collapsible ? Math.max(0, top.length - visible) : 0;
  // Each click reveals REVEAL_STEP more (a couple of rows), not everything at once, so the page
  // grows gradually. If only a few would be left over, take them now instead of a "+2 more" circle.
  const nextStep = remaining <= REVEAL_STEP + REVEAL_LEFTOVER ? remaining : REVEAL_STEP;

  return (
    <div className="dept-sec">
      <div className="sec-lbl">{isCommunity ? 'Teams' : 'Departments'}</div>
      <div className="dept-circles">
        {shown.map((d) => (
          <div className="dept-c" key={d.id} style={{ fontSize: circleFontPx(d.name) }}>
            <span>{d.name}</span>
          </div>
        ))}
        {remaining > 0 ? (
          <button type="button" className="dept-c more" onClick={() => setVisible((v) => v + nextStep)} aria-label={`Show ${nextStep} more of ${remaining} remaining`}>
            <span>+{remaining} more</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function PeopleTab({ orgId, isCommunity = false }: { orgId: string; isCommunity?: boolean }) {
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
        <div className="sec-lbl">{isCommunity ? 'Members & Followers' : 'Officials'}</div>
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
        <div className="sec-lbl">{isCommunity ? 'Members & Followers' : 'Officials'}</div>
        <div className="items-state">Loading people…</div>
      </>
    );
  }

  const { officials, members, counts } = data;
  const hasMoreOfficials = counts.officials > PEOPLE_PREVIEW_LIMIT;

  return (
    <>
      <DepartmentsSection depts={data.departments} isCommunity={isCommunity} />
      {/* ── Section 1: Officials (real-world axis). Hidden on POD / community pages, which have no
          government positions: they show Teams and Members & Followers only. ── */}
      {!isCommunity ? (
        <>
        <div className="sec-lbl">Officials</div>
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
        </>
      ) : null}

      {/* ── Section 2: Members & Followers (platform axis) ── */}
      <div className={`sec-lbl${isCommunity ? '' : ' ppl-sec2'}`}>Members &amp; Followers</div>
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
