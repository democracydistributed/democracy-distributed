'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import s from './FeedbackInsights.module.css';

// Feedback Insights — a port of the "Feedback Dashboard (Themed)" mockup.
// Everything below is illustrative demo data (Toronto); nothing is fetched yet.

type FbType = 'pain' | 'vendor' | 'praise' | 'spend';

interface Dept { id: string; name: string; spend: number; delta: number; trend: number[] }
interface Vendor { id: string; dept: string; name: string; spend: number; areas: string[]; rating: number; flags: number; reviews: number; contract: string; vote: string; trend: number[] }
interface Feedback { t: FbType; area: string; vendor: string; text: string; votes: number; date: string; verified: boolean; rate?: number }

const AREAS = ['Downtown', 'Scarborough', 'North York', 'Etobicoke', 'East York'];
const POP: Record<string, number> = { Downtown: 720, Scarborough: 630, 'North York': 690, Etobicoke: 370, 'East York': 120 }; // thousands
const DEPTS: Dept[] = [
  { id: 'transit', name: 'Transit & Roads', spend: 2140, delta: 6.2, trend: [1310, 1360, 1420, 1480, 1510, 1590, 1700, 1850, 2010, 2140] },
  { id: 'parks', name: 'Parks & Recreation', spend: 510, delta: 3.1, trend: [360, 372, 380, 395, 402, 418, 440, 470, 495, 510] },
  { id: 'water', name: 'Water & Wastewater', spend: 1385, delta: 8.9, trend: [820, 860, 910, 960, 1010, 1090, 1160, 1220, 1270, 1385] },
  { id: 'housing', name: 'Housing & Shelter', spend: 960, delta: 14.4, trend: [380, 410, 450, 490, 540, 600, 690, 770, 840, 960] },
  { id: 'waste', name: 'Solid Waste', spend: 420, delta: 1.2, trend: [340, 350, 355, 362, 370, 380, 392, 405, 415, 420] },
  { id: 'corp', name: 'Corporate Services', spend: 610, delta: 2.0, trend: [480, 490, 500, 515, 525, 540, 560, 580, 598, 610] },
];
const VENDORS: Vendor[] = [
  { id: 'v1', dept: 'transit', name: 'Dufferin Construction Co.', spend: 312, areas: ['Scarborough', 'Etobicoke', 'North York'], rating: 2.4, flags: 14, reviews: 188, contract: 'Road resurfacing program 2024–27', vote: 'Council item IE11.4 · carried 19–6 · Mar 2024', trend: [22, 24, 26, 30, 33, 35, 38, 41, 44, 48] },
  { id: 'v2', dept: 'transit', name: 'Alstom Transport Canada', spend: 276, areas: ['Downtown', 'Scarborough'], rating: 3.6, flags: 3, reviews: 142, contract: 'Light-rail vehicle maintenance', vote: 'Council item EX7.2 · carried 22–2 · Nov 2023', trend: [18, 19, 21, 22, 24, 25, 27, 28, 30, 31] },
  { id: 'v3', dept: 'transit', name: 'Coco Paving Inc.', spend: 148, areas: ['North York', 'East York'], rating: 3.1, flags: 6, reviews: 97, contract: 'Pothole & utility cut repair', vote: 'Council item IE9.1 · carried 23–1 · Jan 2024', trend: [9, 10, 10, 11, 12, 13, 14, 15, 16, 17] },
  { id: 'v4', dept: 'parks', name: 'Maple Leaf Landscaping', spend: 48, areas: ['Downtown', 'East York'], rating: 4.2, flags: 1, reviews: 76, contract: 'Park maintenance, central district', vote: 'Council item PE3.6 · carried 24–0 · Feb 2024', trend: [3.1, 3.3, 3.5, 3.6, 3.8, 4.0, 4.3, 4.5, 4.7, 4.8] },
  { id: 'v5', dept: 'parks', name: 'Clearwater Pools Ltd.', spend: 36, areas: ['Scarborough', 'North York'], rating: 2.1, flags: 9, reviews: 64, contract: 'Outdoor pool operations & repair', vote: 'Council item PE4.2 · carried 18–7 · Apr 2024', trend: [2.0, 2.2, 2.5, 2.6, 2.8, 3.0, 3.1, 3.3, 3.5, 3.6] },
  { id: 'v6', dept: 'water', name: 'Veolia Water Technologies', spend: 390, areas: ['Downtown', 'Etobicoke', 'Scarborough'], rating: 3.4, flags: 4, reviews: 51, contract: 'Ashbridges Bay treatment upgrades', vote: 'Council item IE10.7 · carried 21–3 · May 2024', trend: [20, 23, 25, 27, 30, 32, 34, 36, 38, 39] },
  { id: 'v7', dept: 'water', name: 'Kenaidan Contracting', spend: 214, areas: ['North York', 'East York'], rating: 2.8, flags: 7, reviews: 43, contract: 'Watermain replacement, north corridor', vote: 'Council item IE8.3 · carried 20–5 · Dec 2023', trend: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21] },
  { id: 'v8', dept: 'housing', name: 'Toronto Community Housing (RGI)', spend: 420, areas: AREAS, rating: 3.0, flags: 11, reviews: 230, contract: 'Rent-geared-to-income subsidy transfer', vote: 'Council item PH6.1 · carried 25–0 · Jun 2024', trend: [18, 20, 22, 25, 27, 30, 33, 36, 39, 42] },
  { id: 'v9', dept: 'housing', name: 'Dixon Hall Neighbourhood Services', spend: 62, areas: ['Downtown', 'East York'], rating: 4.4, flags: 0, reviews: 88, contract: 'Shelter operations & outreach', vote: 'Council item PH5.4 · carried 24–1 · Mar 2024', trend: [3, 3.4, 3.8, 4.1, 4.4, 4.8, 5.2, 5.5, 5.9, 6.2] },
  { id: 'v10', dept: 'waste', name: 'GFL Environmental', spend: 198, areas: ['Etobicoke', 'North York'], rating: 3.3, flags: 5, reviews: 120, contract: 'Curbside collection, west districts', vote: 'Council item IE6.9 · carried 19–6 · Sep 2023', trend: [15, 15.5, 16, 16.5, 17, 17.5, 18, 18.6, 19.2, 19.8] },
  { id: 'v11', dept: 'corp', name: 'Deloitte Canada', spend: 74, areas: ['Downtown'], rating: 2.0, flags: 8, reviews: 39, contract: 'ERP modernization advisory', vote: 'Council item GG4.1 · carried 15–10 · Jul 2024', trend: [2, 2.5, 3, 3.6, 4.2, 4.9, 5.6, 6.2, 6.8, 7.4] },
];
const INITIAL_FEEDBACK: Feedback[] = [
  { t: 'pain', area: 'Scarborough', vendor: 'v1', text: 'Resurfacing on Lawrence Ave E between Markham and McCowan cracked within 3 months. Second time in two years.', votes: 412, date: 'Oct 19', verified: true },
  { t: 'pain', area: 'North York', vendor: 'v5', text: 'Alexmuir pool closed 11 of 14 July days for ‘mechanical issues’. Kids had nowhere to go in the heat wave.', votes: 287, date: 'Aug 2', verified: true },
  { t: 'pain', area: 'Downtown', vendor: 'v11', text: '$74M in advisory fees and staff still file timesheets in the old system. Where is the delivered scope?', votes: 355, date: 'Sep 30', verified: false },
  { t: 'pain', area: 'East York', vendor: 'v7', text: 'Watermain cut on Cosburn left open 6 weeks. Signage says 3 days.', votes: 164, date: 'Oct 11', verified: true },
  { t: 'vendor', area: 'Scarborough', vendor: 'v1', text: 'Crews are responsive when called, but the materials don’t hold. Rating reflects outcome, not the people.', votes: 98, date: 'Oct 20', verified: false, rate: 2 },
  { t: 'vendor', area: 'Downtown', vendor: 'v4', text: 'Christie Pits looks the best it has in a decade. Mowing schedule actually matched the posted one.', votes: 141, date: 'Sep 14', verified: true, rate: 5 },
  { t: 'vendor', area: 'Etobicoke', vendor: 'v10', text: 'Missed pickups 3 weeks in a row on Royal York. App says ‘collected’. It was not.', votes: 220, date: 'Oct 8', verified: true, rate: 2 },
  { t: 'vendor', area: 'Downtown', vendor: 'v2', text: 'Streetcar reliability on 504 noticeably better since the maintenance contract changed.', votes: 76, date: 'Jul 22', verified: false, rate: 4 },
  { t: 'praise', area: 'East York', vendor: 'v9', text: 'Outreach team at Dixon Hall got two long-term rough sleepers on Danforth into housing. This is the money working.', votes: 308, date: 'Oct 3', verified: true },
  { t: 'praise', area: 'Scarborough', vendor: 'v6', text: 'Tap water clarity complaints in Guildwood dropped to zero after the upgrade. Thank you.', votes: 52, date: 'Aug 29', verified: false },
  { t: 'spend', area: 'North York', vendor: 'v1', text: '$48M/yr to Dufferin and the 10-yr trend is +118%. Is there a performance clause tied to pavement lifespan?', votes: 267, date: 'Oct 15', verified: false },
  { t: 'spend', area: 'Downtown', vendor: 'v8', text: 'RGI transfer is the single largest line and the only one with no outcome metric published. Add ‘households housed’ next to the dollar figure.', votes: 190, date: 'Sep 9', verified: true },
  { t: 'spend', area: 'Etobicoke', vendor: 'v6', text: 'Ashbridges upgrade came in under budget in 2024. Why did 2025 jump 9%? Link the change order.', votes: 84, date: 'Oct 1', verified: false },
  { t: 'spend', area: 'Scarborough', vendor: 'v5', text: '$36M for pools that are closed half the summer. Compare cost per open-day against Etobicoke.', votes: 131, date: 'Aug 5', verified: true },
];
const PAIN = [
  { k: 'Road surface failures', v: 92 }, { k: 'Pool / rec centre closures', v: 71 }, { k: 'Missed waste pickups', v: 64 },
  { k: 'Open utility cuts', v: 55 }, { k: 'No outcome metric on big lines', v: 49 }, { k: 'Consultant scope unclear', v: 38 },
];
const TYPE_LABEL: Record<FbType, string> = { pain: 'Pain points', vendor: 'Vendor critique', praise: 'Praise', spend: 'Spend comments' };
const SEG_LABEL: Record<FbType, string> = { pain: 'Pain point', vendor: 'Vendor review', spend: 'Spend comment', praise: 'Praise / idea' };
const CARD_CLS: Record<FbType, string> = { pain: s.cPain, vendor: s.cVendor, praise: s.cPraise, spend: s.cSpend };
const PILL_CLS: Record<FbType, string> = { pain: s.pCrit, vendor: s.pWarn, praise: s.pGood, spend: s.pSpend };
// feedback density per $1M, satisfaction, chain completeness, spend ($M)
const AREA_STATS: Record<string, { dens: number; sat: number; chain: number; spend: number }> = {
  Downtown: { dens: 1.9, sat: 3.6, chain: 78, spend: 1610 },
  Scarborough: { dens: 3.4, sat: 2.7, chain: 66, spend: 1120 },
  'North York': { dens: 2.6, sat: 3.0, chain: 70, spend: 1240 },
  Etobicoke: { dens: 2.2, sat: 3.2, chain: 74, spend: 720 },
  'East York': { dens: 2.8, sat: 3.5, chain: 69, spend: 335 },
};
const POLL_Q = 'Next year’s $120M road budget: what should move first?';
const POLL_OPTS: [string, number][] = [['Longer pavement warranty clauses', 46], ['More pothole crews, less resurfacing', 27], ['Shift 10% to transit priority lanes', 19], ['Keep as proposed', 8]];
const POLL_N = 3284;

const money = (m: number) => (m >= 1000 ? `$${(m / 1000).toFixed(2)}B` : `$${m}M`);
const vendorById = (id: string) => VENDORS.find((v) => v.id === id)!;
const deptById = (id: string) => DEPTS.find((d) => d.id === id)!;
const growth = (t: number[]) => Math.round((t[t.length - 1] / t[0] - 1) * 100);
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

function Spark({ arr, color }: { arr: number[]; color: string }) {
  const w = 300, h = 60, max = Math.max(...arr), min = Math.min(...arr) * 0.9;
  const pts = arr.map((v, i) => [(i / (arr.length - 1)) * (w - 8) + 4, h - 6 - ((v - min) / (max - min)) * (h - 14)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg className={s.spark} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L${last[0]} ${h - 4} L4 ${h - 4} Z`} fill={color} opacity=".12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} />
    </svg>
  );
}

export default function FeedbackInsightsTab({ orgName }: { orgName?: string }) {
  const [area, setArea] = useState('All');
  const [dept, setDept] = useState('All');
  const [drill, setDrill] = useState<string | null>(null);
  const [tab, setTab] = useState<FbType>('pain');
  const [voted, setVoted] = useState<Set<number>>(() => new Set());
  const [polled, setPolled] = useState<number | null>(null);
  const [pollOpts, setPollOpts] = useState(POLL_OPTS);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [q, setQ] = useState('');
  const [feedback, setFeedback] = useState(INITIAL_FEEDBACK);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: FbType; vendor: string; area: string } | null>(null);
  const [fText, setFText] = useState('');
  const [fRate, setFRate] = useState(2);
  const flowRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  function toast(m: string) {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }

  const vendorsIn = useMemo(
    () => VENDORS.filter((v) => (dept === 'All' || v.dept === dept) && (area === 'All' || v.areas.includes(area)) && (!q || (v.name + v.contract).toLowerCase().includes(q))),
    [dept, area, q],
  );
  // Feedback scoped by area/dept/drill; the tab counts ignore the search box, the list honours it.
  const fbScoped = useMemo(
    () => feedback.filter((f) => { const v = vendorById(f.vendor); return (area === 'All' || f.area === area) && (dept === 'All' || v.dept === dept) && (!drill || f.vendor === drill); }),
    [feedback, area, dept, drill],
  );
  const fbIn = useMemo(
    () => fbScoped.filter((f) => !q || f.text.toLowerCase().includes(q) || vendorById(f.vendor).name.toLowerCase().includes(q)),
    [fbScoped, q],
  );

  function pickDept(id: string) { setDept(id); setDrill(null); }
  function traceVendor(id: string) {
    const v = vendorById(id);
    setDept(v.dept);
    setDrill(v.id);
    flowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function openAdd(type: FbType, vid?: string) {
    setModal({ type, vendor: vid || drill || VENDORS[0].id, area: area === 'All' ? AREAS[0] : area });
    setFText('');
  }
  function submitAdd(e: FormEvent) {
    e.preventDefault();
    if (!modal) return;
    const text = fText.trim();
    if (!text) { toast('Add a note first so others know what you saw.'); return; }
    setFeedback((prev) => [{ t: modal.type, area: modal.area, vendor: modal.vendor, text, votes: 1, date: 'Just now', verified: false, rate: modal.type === 'vendor' ? fRate : undefined }, ...prev]);
    setTab(modal.type);
    setModal(null);
    toast('Posted. Linked to the contract and visible to the city in the governance view.');
  }

  // ---------- KPIs ----------
  const spend = vendorsIn.reduce((a, v) => a + v.spend, 0) || 1;
  const flags = vendorsIn.reduce((a, v) => a + v.flags, 0);
  const reviews = vendorsIn.reduce((a, v) => a + v.reviews, 0) || 1;
  const friction = Math.round((flags / reviews) * 100);
  const chain = area === 'All' ? 71 : AREA_STATS[area].chain;
  const dens = (fbIn.length / spend) * 100;
  const kpis: { c: string; l: string; v: ReactNode; d: string; t: string; cls?: string }[] = [
    { c: s.kSpend, l: 'Traced spend in view', v: money(spend), d: `${vendorsIn.length} contracts · ${area === 'All' ? 'all areas' : area}`, t: '↑ vs 2024', cls: s.up },
    { c: s.kGood, l: 'Chain completeness', v: <>{chain}<small>%</small></>, d: 'Invoices linked to an authorizing council vote', t: '+4 pts this quarter', cls: s.up },
    { c: s.kWarn, l: 'Vendor friction index', v: <>{friction}<small>/100</small></>, d: 'Open flags per 100 resident reviews', t: friction > 6 ? 'Above city median (6)' : 'Within city median', cls: friction > 6 ? s.down : s.up },
    { c: s.kAcc, l: 'Public signal density', v: dens.toFixed(1), d: 'Structured inputs per $1M in view', t: 'Target ≥ 2.0', cls: dens >= 2 ? s.up : s.down },
    { c: s.kAcc, l: 'Micro-action conversion', v: <>18<small>%</small></>, d: 'Visitors who vote, flag or comment', t: '+3 pts · 30 d', cls: s.up },
    { c: s.kGood, l: 'Time to trace', v: <>11<small>s</small></>, d: 'Median, department → vendor → vote', t: 'Target < 15 s', cls: s.up },
    { c: s.kSpend, l: 'Resurfaced to council', v: '6', d: 'Feedback summaries presented in 2025', t: 'Next: Nov 12 budget committee' },
    { c: s.kWarn, l: 'Verification latency', v: <>2.1<small> d</small></>, d: 'Community correction → peer-verified', t: '−0.6 d vs Q2', cls: s.up },
  ];

  // ---------- flow ----------
  const visDepts = DEPTS.filter((d) => area === 'All' || VENDORS.some((v) => v.dept === d.id && v.areas.includes(area)));
  const maxDept = Math.max(...visDepts.map((d) => d.spend), 1);
  const flowVendors = [...vendorsIn].sort((a, b) => b.spend - a.spend);
  const maxVendor = Math.max(...flowVendors.map((v) => v.spend), 1);
  const drilled = drill ? vendorById(drill) : null;

  // ---------- feedback list ----------
  const fbList = fbIn.filter((f) => f.t === tab).sort((a, b) => b.votes - a.votes);

  // ---------- pain / poll / compare / gov ----------
  const heatMult = area === 'Scarborough' ? 1.15 : area === 'Downtown' ? 0.8 : 1;
  const pollTot = pollOpts.reduce((a, o) => a + o[1], 0);
  const areaRows = AREAS.map((a) => ({ a, per: Math.round((AREA_STATS[a].spend / POP[a]) * 1000), ...AREA_STATS[a] }));
  const maxPer = Math.max(...areaRows.map((r) => r.per));
  const cmpVendors = flowVendors.slice(0, 8);
  const painN = fbIn.filter((f) => f.t === 'pain').length;
  const praiseN = fbIn.filter((f) => f.t === 'praise').length;
  const worst = [...vendorsIn].sort((a, b) => b.flags / b.spend - a.flags / a.spend)[0];

  const deptLabel = dept === 'All' ? 'All departments' : deptById(dept).name;
  const place = orgName || 'Toronto';

  return (
    <div className={s.root}>
      <div className={s.context}>
        <div>
          <h2>Feedback Insights</h2>
          <p>
            {place} · {area === 'All' ? 'All areas' : area} · {deptLabel} · 2025. Where the money goes, who it goes to, and what residents say
            about it. Tap any department to trace it down to the vendor and the council vote that authorized it.
          </p>
        </div>
        <span className={s.demo}>Demo data · figures are illustrative</span>
      </div>

      <div className={s.filters}>
        <div className={s.fgroup}>
          <span className={s.eyebrow}>Area</span>
          {['All', ...AREAS].map((a) => (
            <button key={a} type="button" className={s.chip} aria-pressed={area === a} onClick={() => setArea(a)}>{a}</button>
          ))}
        </div>
        <div className={s.fgroup}>
          <span className={s.eyebrow}>Department</span>
          {[{ id: 'All', name: 'All' }, ...DEPTS].map((d) => (
            <button key={d.id} type="button" className={s.chip} aria-pressed={dept === d.id} onClick={() => pickDept(d.id)}>{d.name}</button>
          ))}
        </div>
        <label className={s.search}>
          <span aria-hidden="true">🔎</span>
          <input type="search" placeholder="Search vendors, contracts, feedback… e.g. ‘road resurfacing’" aria-label="Search vendors, contracts and feedback" value={q} onChange={(e) => setQ(e.target.value.trim().toLowerCase())} />
        </label>
        <div className={s.viewtog} role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button>
        </div>
      </div>

      <section className={s.kpis} aria-label="Key indicators">
        {kpis.map((k) => (
          <div key={k.l} className={cx(s.kpi, k.c)}>
            <span className={s.eyebrow}>{k.l}</span>
            <span className={s.v}>{k.v}</span>
            <span className={s.d}>{k.d}</span>
            <span className={cx(s.t, k.cls)}>{k.t}</span>
          </div>
        ))}
      </section>

      {view === 'map' ? (
        <div className={s.panel}>
          <header><h3>Signal by area</h3><span className={s.sub}>Feedback density per $1M spent · tap to filter</span></header>
          <div className={s.map}>
            {AREAS.map((a) => {
              const st = AREA_STATS[a];
              return (
                <button key={a} type="button" className={cx(s.tile, area === a && s.sel)} onClick={() => setArea(a)}>
                  <b>{a}</b>
                  <span className={s.num}>{money(st.spend)} · ★ {st.sat.toFixed(1)}</span>
                  <span>{st.dens.toFixed(1)} signals / $1M</span>
                  <div className={s.sig}><i style={{ width: `${(st.dens / 4) * 100}%` }} /></div>
                </button>
              );
            })}
            <button type="button" className={cx(s.tile, area === 'All' && s.sel)} onClick={() => setArea('All')}>
              <b>Whole city</b><span>Clear area filter</span>
            </button>
          </div>
        </div>
      ) : null}

      <div className={s.grid2}>
        <section className={s.panel} ref={flowRef} aria-labelledby="fi-flow-h">
          <header>
            <h3 id="fi-flow-h">Spending flow</h3>
            <span className={s.sub}>{dept === 'All' ? 'Department → vendor → council vote' : 'Orange bars: vendors above the friction median'}</span>
          </header>
          {dept === 'All' ? (
            <>
              <div className={s.crumb}><b>{place}</b> › departments · 2025 · 10-yr trend on hover</div>
              <div className={s.flow}>
                {visDepts.map((d) => (
                  <button key={d.id} type="button" className={s.row} title={`10-yr: ${d.trend[0]}→${d.trend[9]} $M`} onClick={() => pickDept(d.id)}>
                    <span className={s.lab}>{d.name}<small>{VENDORS.filter((v) => v.dept === d.id).length} vendors · +{d.delta}% YoY</small></span>
                    <span className={s.bar}><i style={{ width: `${(d.spend / maxDept) * 100}%` }} /></span>
                    <span className={s.amt}>{money(d.spend)}<small>10-yr +{growth(d.trend)}%</small></span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={s.crumb}>
                <button type="button" onClick={() => pickDept('All')}>{place}</button> › <b>{deptLabel}</b> › top vendors{area !== 'All' ? ` in ${area}` : ''}
              </div>
              <div className={s.flow}>
                {flowVendors.length ? flowVendors.map((v) => (
                  <button key={v.id} type="button" className={s.row} aria-pressed={drill === v.id} onClick={() => setDrill(drill === v.id ? null : v.id)}>
                    <span className={s.lab}>{v.name}<small>{v.contract}</small></span>
                    <span className={cx(s.bar, v.flags > 6 && s.hot)}><i style={{ width: `${(v.spend / maxVendor) * 100}%` }} /></span>
                    <span className={s.amt}>${v.spend}M<small>★ {v.rating.toFixed(1)} · {v.flags} flags</small></span>
                  </button>
                )) : <div className={s.empty}>No vendors match this filter.</div>}
              </div>
              {drilled ? (
                <div className={s.vendorDetail}>
                  <div className={s.head}>
                    <div><h4>{drilled.name}</h4><div className={s.meta}>{drilled.contract} · serves {drilled.areas.join(', ')}</div></div>
                    <span className={cx(s.pill, drilled.rating >= 3.8 ? s.pGood : drilled.rating >= 2.8 ? s.pWarn : s.pCrit)}>★ {drilled.rating.toFixed(1)} from {drilled.reviews} residents</span>
                  </div>
                  <div className={s.trace}>
                    <div className={s.node}><b>Council vote</b><span>{drilled.vote}</span></div>
                    <span className={s.arr}>→</span>
                    <div className={s.node}><b>Contract</b><span>{drilled.contract}</span></div>
                    <span className={s.arr}>→</span>
                    <div className={s.node}><b>2025 invoices</b><span className={s.num}>${drilled.spend}M across {drilled.areas.length} areas</span></div>
                  </div>
                  <div>
                    <span className={s.eyebrow}>10-year spend with this vendor, $M</span>
                    <Spark arr={drilled.trend} color="var(--blue)" />
                    <div className={s.rate}>
                      <span className={s.num}>{drilled.trend[0]} → {drilled.trend[9]}</span>
                      <span className={cx(s.pill, drilled.trend[9] / drilled.trend[0] > 1.8 ? s.pWarn : s.pSpend)}>+{growth(drilled.trend)}% over 10 yrs</span>
                    </div>
                  </div>
                  <div className={s.actions}>
                    <button type="button" className={s.btn} onClick={() => openAdd('vendor', drilled.id)}>Rate this vendor</button>
                    <button type="button" className={s.btn} onClick={() => openAdd('spend', drilled.id)}>Comment on spend</button>
                    <button type="button" className={s.btn} onClick={() => openAdd('pain', drilled.id)}>Flag an issue</button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className={s.panel} aria-labelledby="fi-fb-h">
          <header>
            <h3 id="fi-fb-h">What residents are saying</h3>
            <span className={s.sub}>{drilled ? `On ${drilled.name}` : 'Structured, linked to real line items'}</span>
          </header>
          <div className={s.tabs} role="tablist">
            {(Object.keys(TYPE_LABEL) as FbType[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {TYPE_LABEL[t]}<span className={s.c}>{fbScoped.filter((f) => f.t === t).length}</span>
              </button>
            ))}
          </div>
          <div className={s.fb}>
            {fbList.length ? fbList.map((f) => {
              const v = vendorById(f.vendor);
              const idx = feedback.indexOf(f);
              const on = voted.has(idx);
              return (
                <div key={idx} className={cx(s.card, CARD_CLS[f.t])}>
                  <div className={s.topLine}>
                    <span className={cx(s.pill, PILL_CLS[f.t])}>{TYPE_LABEL[f.t]}</span>
                    <span>{f.area}</span>·<span>{f.date}</span>
                    {f.verified ? <>·<span className={cx(s.pill, s.pGood)}>✓ verified on site</span></> : null}
                    {f.rate ? <>·<span className={s.num}>★ {f.rate}/5</span></> : null}
                  </div>
                  <p>{f.text}</p>
                  <div className={s.foot}>
                    <button type="button" className={cx(s.vote, on && s.on)} aria-pressed={on} onClick={() => setVoted((prev) => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; })}>
                      ▲ {f.votes + (on ? 1 : 0)}
                    </button>
                    <button type="button" className={s.link} onClick={() => traceVendor(v.id)}>{v.name} · ${v.spend}M</button>
                  </div>
                </div>
              );
            }) : <div className={s.empty}>Nothing filed here yet for this view. Be the first.</div>}
          </div>
          <div className={s.actions}>
            <button type="button" className={cx(s.btn, s.btnPrimary)} onClick={() => openAdd(tab)}>＋ Add feedback</button>
            <button type="button" className={s.btn} onClick={() => toast(`Summary of ${fbIn.length} items queued for the Nov 12 budget committee.`)}>Send summary to council</button>
          </div>
        </section>
      </div>

      <div className={s.grid2}>
        <section className={s.panel}>
          <header><h3>Pain points surfaced</h3><span className={s.sub}>Most-reported issues, weighted by votes</span></header>
          <div className={s.heat}>
            {PAIN.map((p) => {
              const v = Math.min(100, Math.round(p.v * heatMult));
              return (
                <div key={p.k} className={s.hrow}>
                  <span>{p.k}</span>
                  <span className={s.hbar}><i style={{ width: `${v}%` }} /></span>
                  <span className={s.num} style={{ textAlign: 'right' }}>{v}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className={s.panel}>
          <header><h3>Quick poll</h3><span className={s.sub}>Resurfaces to council every 2 weeks</span></header>
          <div className={s.poll}>
            <div className={s.q}>{POLL_Q}</div>
            {pollOpts.map((o, i) => (
              <button
                key={o[0]}
                type="button"
                className={s.opt}
                disabled={polled !== null}
                onClick={() => {
                  setPolled(i);
                  setPollOpts((prev) => prev.map((p, j) => (j === i ? [p[0], p[1] + 1] : p)));
                  toast('Vote recorded. It will be resurfaced to council with the summary.');
                }}
              >
                <i style={{ width: polled !== null ? `${(o[1] / pollTot) * 100}%` : 0 }} />
                <span>{o[0]}{polled === i ? ' ✓' : ''}</span>
                <b>{polled !== null ? `${Math.round((o[1] / pollTot) * 100)}%` : ''}</b>
              </button>
            ))}
            <div className={s.pollN}>
              {polled !== null ? `${POLL_N + 1} responses · results go to the Nov 12 budget committee` : `${POLL_N} responses so far · one tap, no account needed`}
            </div>
          </div>
        </section>
      </div>

      <section className={s.panel}>
        <header><h3>Compare areas</h3><span className={s.sub}>Spend per resident vs. what people report back</span></header>
        <div className={s.tbl}>
          <table>
            <thead>
              <tr><th>Area</th><th className={s.n}>Spend / resident</th><th>Satisfaction (★5)</th><th className={s.n}>Signal / $1M</th><th>Chain linked</th><th>Read</th></tr>
            </thead>
            <tbody>
              {areaRows.map((r) => (
                <tr key={r.a} className={area === r.a ? s.me : undefined}>
                  <td><b>{r.a}</b></td>
                  <td className={cx(s.n, s.num)}>${r.per.toLocaleString()}</td>
                  <td><span className={cx(s.mini, r.sat >= 3.4 ? s.mG : r.sat < 3 && s.mW)}><i style={{ width: `${(r.sat / 5) * 100}%` }} /></span><span className={s.num}>{r.sat.toFixed(1)}</span></td>
                  <td className={cx(s.n, s.num)}>{r.dens.toFixed(1)}</td>
                  <td><span className={s.mini}><i style={{ width: `${r.chain}%` }} /></span><span className={s.num}>{r.chain}%</span></td>
                  <td style={{ color: 'var(--tm)' }}>
                    {r.per > maxPer * 0.85 && r.sat < 3 ? 'High spend, low satisfaction — look at vendors' : r.sat >= 3.4 ? 'Spend is landing' : r.dens > 3 ? 'Loud and under-served' : 'Average'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.panel}>
        <header><h3>Compare vendors</h3><span className={s.sub}>{deptLabel}{area !== 'All' ? ` · ${area}` : ''}</span></header>
        <div className={s.tbl}>
          <table>
            <thead>
              <tr><th>Vendor</th><th>Department</th><th className={s.n}>2025 $M</th><th className={s.n}>10-yr change</th><th>Resident rating</th><th className={s.n}>Open flags</th><th className={s.n}>Flags / $10M</th></tr>
            </thead>
            <tbody>
              {cmpVendors.map((v) => {
                const g = growth(v.trend);
                const fpm = (v.flags / v.spend) * 10;
                return (
                  <tr key={v.id} className={drill === v.id ? s.me : undefined}>
                    <td><button type="button" className={s.link} onClick={() => traceVendor(v.id)}>{v.name}</button></td>
                    <td>{deptById(v.dept).name}</td>
                    <td className={cx(s.n, s.num)}>{v.spend}</td>
                    <td className={cx(s.n, s.num)} style={{ color: g > 100 ? 'var(--amber-text, var(--amber))' : undefined }}>+{g}%</td>
                    <td><span className={cx(s.mini, v.rating >= 3.8 ? s.mG : v.rating < 2.8 && s.mW)}><i style={{ width: `${(v.rating / 5) * 100}%` }} /></span><span className={s.num}>{v.rating.toFixed(1)}</span></td>
                    <td className={cx(s.n, s.num)}>{v.flags}</td>
                    <td className={cx(s.n, s.num)} style={{ color: fpm > 1.5 ? 'var(--red)' : undefined }}>{fpm.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.panel}>
        <header><h3>Governance signal (what the city sees)</h3><span className={s.sub}>The same data, read from the official side</span></header>
        <div className={s.gov}>
          <div className={s.g}><span className={s.eyebrow}>Priority signal</span><b>{painN} pain points vs {praiseN} praise</b><span>Ratio {praiseN ? (painN / praiseN).toFixed(1) : painN}:1 in this view. City median 1.4:1.</span></div>
          <div className={s.g}><span className={s.eyebrow}>Highest-risk relationship</span><b>{worst ? worst.name : '—'}</b><span>{worst ? `${worst.flags} open flags on $${worst.spend}M · rating ${worst.rating.toFixed(1)}` : ''}</span></div>
          <div className={s.g}><span className={s.eyebrow}>Where residents care most</span><b>Transit &amp; Roads</b><span>41% of all structured input, 24% of spend.</span></div>
          <div className={s.g}><span className={s.eyebrow}>Ready to resurface</span><b className={s.num}>{fbIn.filter((f) => f.verified).length} verified items</b><span>Exportable as a 1-page brief for the next committee.</span></div>
        </div>
      </section>

      {modal ? (
        <div className={s.scrim} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <form className={s.modal} onSubmit={submitAdd} aria-label="Add feedback">
            <h3>Add feedback</h3>
            <div className={s.seg}>
              {(['pain', 'vendor', 'spend', 'praise'] as FbType[]).map((t) => (
                <button key={t} type="button" aria-pressed={modal.type === t} onClick={() => setModal({ ...modal, type: t })}>{SEG_LABEL[t]}</button>
              ))}
            </div>
            <label className={s.field}>Link it to a line item
              <select value={modal.vendor} onChange={(e) => setModal({ ...modal, vendor: e.target.value })}>
                {VENDORS.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.contract}</option>)}
              </select>
            </label>
            <label className={s.field}>Area
              <select value={modal.area} onChange={(e) => setModal({ ...modal, area: e.target.value })}>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <label className={s.field}>Your note (what happened, where, when)
              <textarea autoFocus value={fText} onChange={(e) => setFText(e.target.value)} placeholder="e.g. Resurfacing on Danforth between Pape and Jones cracked within 3 months of completion." />
            </label>
            <label className={s.field}>Rating of outcome (1–5)
              <input type="range" min={1} max={5} value={fRate} onChange={(e) => setFRate(+e.target.value)} />
            </label>
            <div className={s.actions}>
              <button type="submit" className={cx(s.btn, s.btnPrimary)}>Post feedback</button>
              <button type="button" className={s.btn} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}

      {toastMsg ? <div className={s.toast} role="status">{toastMsg}</div> : null}
    </div>
  );
}
