'use client';

import { useEffect, useRef, useState } from 'react';
import Nav from './Nav';
import Footer from './Footer';
import styles from './Pilot.module.css';
import { PILOT_SIGNUP_ENDPOINT, fetchPilotCounts } from '@/lib/api';

const ORG_GOAL = 50;
const VOLUNTEER_GOAL = 500;

const CAUSES = [
  'Food security',
  'Housing & shelter',
  'Newcomer support',
  'Environment',
  'Youth & education',
  'Seniors',
  'Health',
  'Arts & culture',
];

type Track = 'org' | 'volunteer';

export default function PilotPage() {
  const [ready, setReady] = useState(false);
  const flowRef = useRef<SVGSVGElement>(null);

  const [orgs, setOrgs] = useState(0);
  const [vols, setVols] = useState(0);

  const [modal, setModal] = useState<Track | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (flowRef.current) {
      flowRef.current.querySelectorAll('path').forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });
    }
    const t = setTimeout(() => {
      setReady(true);
      if (flowRef.current) {
        flowRef.current.querySelectorAll('path').forEach((p) => {
          p.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)';
          p.style.strokeDashoffset = '0';
        });
      }
    }, 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  function fetchCounts(fresh = false) {
    fetchPilotCounts(fresh)
      .then((d) => {
        setOrgs(d.orgs);
        setVols(d.volunteers);
      })
      .catch(() => {
        /* counts are register-only — failure leaves the count at 0, never a guess */
      });
  }

  function open(track: Track) {
    setModal(track);
    setSent(false);
    setError('');
  }

  function close() {
    setModal(null);
    setSent(false);
    setError('');
    setSending(false);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const payload: Record<string, unknown> = { track: modal };
    fd.forEach((v, k) => {
      if (k === 'causes') payload.causes = ([...((payload.causes as string[]) || [])]).concat(String(v));
      else if (k === 'consentCall' || k === 'consentContact') payload[k] = true;
      else payload[k] = v;
    });
    payload.consentCall = !!payload.consentCall;
    payload.consentContact = !!payload.consentContact;

    setSending(true);
    setError('');
    fetch(PILOT_SIGNUP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json().catch(() => ({}));
      })
      .then(() => {
        setSending(false);
        setSent(true);
        fetchCounts(true);
      })
      .catch(() => {
        setSending(false);
        setError("Couldn't reach the register. Try again in a moment, or email us and we'll add you by hand.");
      });
  }

  const heroClass = `${styles.hero} ${ready ? styles.heroPlay : ''}`;
  const isOrg = modal === 'org';
  const orgLeft = Math.max(0, ORG_GOAL - orgs);
  const volLeft = Math.max(0, VOLUNTEER_GOAL - vols);
  const orgPct = Math.min(100, (orgs / ORG_GOAL) * 100);
  const volPct = Math.min(100, (vols / VOLUNTEER_GOAL) * 100);

  return (
    <div className={styles.page}>
      <Nav />

      {/* ── HERO ── */}
      <div className={heroClass}>
        <div className={styles.gridOverlay} aria-hidden="true" />
        <svg ref={flowRef} viewBox="0 0 1100 480" preserveAspectRatio="none" className={styles.flowBg} aria-hidden="true">
          <path d="M -50,90 C 250,90 300,200 600,200 C 850,200 900,60 1150,60" fill="none" stroke="var(--amber)" strokeOpacity="0.18" strokeWidth="1.5" />
          <path d="M -50,180 C 200,180 320,330 600,330 C 880,330 920,420 1150,420" fill="none" stroke="var(--teal)" strokeOpacity="0.16" strokeWidth="1.5" />
          <path d="M -50,300 C 280,300 260,140 560,140 C 820,140 950,260 1150,260" fill="none" stroke="var(--muted)" strokeOpacity="0.12" strokeWidth="1.5" />
          <path d="M -50,420 C 220,420 300,440 500,440 C 760,440 880,300 1150,300" fill="none" stroke="var(--amber)" strokeOpacity="0.10" strokeWidth="1.5" />
        </svg>

        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            <span className={styles.eyebrowText}>Toronto</span>
          </div>
          <h1 className={styles.heroH1}>Everyone can help.</h1>
          <p className={`${styles.heroDesc} ${styles.heroFade}`}>
            Volunteer organizations break their projects into microtasks and open them to anyone.
          </p>
          <p className={`${styles.heroDesc} ${styles.heroFade}`}>
            Anyone can see what needs doing across the city&apos;s volunteer organizations, and take the piece that fits their
            afternoon.
          </p>
          <p className={`${styles.heroSubdesc} ${styles.heroFade}`}>
            The platform we&apos;d build makes that possible: organizations post the pieces of work, anyone picks one up.
          </p>
        </div>
      </div>

      {/* ── TRACKS ── */}
      <div className={styles.trackGridOuter}>
      <div className={styles.trackGrid}>
        <div className={styles.trackCard}>
          <span className={styles.trackAccent} style={{ background: 'linear-gradient(90deg, var(--amber), transparent)' }} />
          <div className={styles.trackTop}>
            <span className={styles.trackEyebrow} style={{ color: 'var(--amber-text, var(--amber))' }}>
              Track 01
            </span>
            <span className={styles.liveTag}>
              <span className={styles.liveDot} style={{ background: 'var(--amber)' }} />
              Live count
            </span>
          </div>
          <h2 className={styles.trackH2}>Organizations</h2>
          <p className={styles.trackDesc}>Volunteer organizations in Toronto willing to post their work as microtasks.</p>
          <div className={styles.trackCount}>
            <span className={styles.trackNum} style={{ color: 'var(--amber-text, var(--amber))' }}>
              {orgs}
            </span>
            <span className={styles.trackGoalNum}>/ {ORG_GOAL}</span>
          </div>
          <div>
            <div className={styles.trackBar}>
              <div className={styles.trackBarFill} style={{ width: `${orgPct}%`, background: 'var(--amber)' }} />
            </div>
            <p className={styles.trackRemaining}>{orgLeft === 0 ? 'Goal reached' : `${orgLeft} more to reach the goal`}</p>
          </div>
          <button type="button" className={styles.trackBtn} onClick={() => open('org')}>
            Sign the letter of interest
          </button>
        </div>

        <div className={styles.trackCard}>
          <span className={styles.trackAccent} style={{ background: 'linear-gradient(90deg, var(--teal), transparent)' }} />
          <div className={styles.trackTop}>
            <span className={styles.trackEyebrow} style={{ color: 'var(--teal-text, var(--teal))' }}>
              Track 02
            </span>
            <span className={styles.liveTag}>
              <span className={styles.liveDot} style={{ background: 'var(--teal)' }} />
              Live count
            </span>
          </div>
          <h2 className={styles.trackH2}>Volunteers</h2>
          <p className={styles.trackDesc}>People who would pick up a microtask when one matches what they care about.</p>
          <div className={styles.trackCount}>
            <span className={styles.trackNum} style={{ color: 'var(--teal-text, var(--teal))' }}>
              {vols}
            </span>
            <span className={styles.trackGoalNum}>/ {VOLUNTEER_GOAL}</span>
          </div>
          <div>
            <div className={styles.trackBar}>
              <div className={styles.trackBarFill} style={{ width: `${volPct}%`, background: 'var(--teal)' }} />
            </div>
            <p className={styles.trackRemaining}>{volLeft === 0 ? 'Goal reached' : `${volLeft} more to reach the goal`}</p>
          </div>
          <button type="button" className={styles.trackBtn} onClick={() => open('volunteer')}>
            Add my name
          </button>
        </div>
      </div>
      </div>

      {/* ── THRESHOLD ── */}
      <div className={styles.sectionWrapAlt}>
        <div className={styles.thresholdSection}>
          <div className={styles.sectionLabel}>The threshold</div>
          <p className={styles.thresholdText}>
            When we get there, everyone who signed decides together what gets built.
          </p>
        </div>
      </div>

      {/* ── DATA NOTE ── */}
      <div className={styles.dataNote}>
        <div className={styles.dataNoteLabel}>What happens to your data</div>
        <p className={styles.dataNoteText}>
          Your answers are used to count the two goals and to contact you about the pilot; never sold, published, or shared.
        </p>
      </div>

      <Footer />

      {/* ── MODAL ── */}
      {modal && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Pledge form"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={styles.modalPanel} style={{ borderTopColor: isOrg ? 'var(--amber)' : 'var(--teal)' }}>
            <button type="button" className={styles.modalClose} aria-label="Close" onClick={close}>
              ✕
            </button>

            {sent ? (
              <div className={styles.sentBlock}>
                <span className={styles.modalEyebrow}>Recorded</span>
                <h3 className={styles.modalTitle}>You&apos;re counted.</h3>
                <p className={styles.modalCopy}>
                  The counter above updates from the register. We&apos;ll email you when both goals are met and the decision
                  opens — and nothing in between unless you asked for the conversation.
                </p>
                <button type="button" className={styles.btnGhost} onClick={close}>
                  Close
                </button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={submit} className={styles.form}>
                <div>
                  <span className={styles.modalEyebrow}>{isOrg ? 'Track 01 · Organizations' : 'Track 02 · Volunteers'}</span>
                  <h3 className={styles.modalTitle}>{isOrg ? 'Letter of interest' : 'Add my name'}</h3>
                  <p className={styles.modalCopy}>
                    {isOrg
                      ? 'Signing says your organization would post work to POD if it existed. It is not a commitment to use it.'
                      : 'Adding your name says you would pick up a microtask. It is not a commitment to any hours.'}
                  </p>
                </div>

                {isOrg ? (
                  <div className={styles.formFields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Organization name</span>
                      <input name="orgName" type="text" required placeholder="e.g. Parkdale Community Food Bank" className={styles.input} />
                    </label>
                    <div className={styles.fieldRow}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Contact name</span>
                        <input name="contactName" type="text" placeholder="Your name" className={styles.input} />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Email</span>
                        <input name="email" type="email" placeholder="you@org.ca" className={styles.input} />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Size — people you coordinate</span>
                      <select name="size" className={styles.input} defaultValue="">
                        <option value="" disabled>
                          Select…
                        </option>
                        <option value="1-5">1–5</option>
                        <option value="6-20">6–20</option>
                        <option value="21-50">21–50</option>
                        <option value="51-200">51–200</option>
                        <option value="200+">More than 200</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>What you coordinate with today</span>
                      <input
                        name="currentTools"
                        type="text"
                        placeholder="Spreadsheets, WhatsApp, a scheduling tool…"
                        className={styles.input}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Biggest coordination pain</span>
                      <textarea
                        name="pain"
                        rows={3}
                        placeholder="The thing that costs you the most time or volunteers."
                        className={styles.textarea}
                      />
                    </label>
                    <label className={styles.checkRow}>
                      <input name="consentCall" type="checkbox" className={styles.checkbox} />
                      <span>I&apos;m open to a 20-minute conversation about how we coordinate work today.</span>
                    </label>
                  </div>
                ) : (
                  <div className={styles.formFields}>
                    <div className={styles.fieldRow}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Name</span>
                        <input name="name" type="text" required placeholder="Your name" className={styles.input} />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Email</span>
                        <input name="email" type="email" placeholder="you@email.ca" className={styles.input} />
                      </label>
                    </div>
                    <div>
                      <span className={styles.fieldLabel}>Causes you&apos;d help with</span>
                      <div className={styles.causeWrap}>
                        {CAUSES.map((cause) => (
                          <label key={cause} className={styles.causePill}>
                            <input name="causes" type="checkbox" value={cause} className={styles.checkbox} />
                            <span>{cause}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Hours a month you could give</span>
                      <select name="hours" className={styles.input} defaultValue="">
                        <option value="" disabled>
                          Select…
                        </option>
                        <option value="1-2">1–2</option>
                        <option value="3-5">3–5</option>
                        <option value="6-10">6–10</option>
                        <option value="10+">More than 10</option>
                      </select>
                    </label>
                    <label className={styles.checkRow}>
                      <input name="consentCall" type="checkbox" className={styles.checkbox} />
                      <span>I&apos;m open to a 20-minute conversation about the kind of tasks I&apos;d pick up.</span>
                    </label>
                  </div>
                )}

                <label className={styles.checkRow}>
                  <input name="consentContact" type="checkbox" className={styles.checkbox} />
                  <span>
                    You may email me about POD and the outcome of this pilot.{' '}
                    <span className={styles.mutedInline}>It&apos;s how we tell you the decision has opened.</span>
                  </span>
                </label>

                {error && <p className={styles.errorText}>{error}</p>}

                <div className={styles.submitRow}>
                  <button type="submit" disabled={sending} className={styles.btnPrimary}>
                    {sending ? 'Sending…' : isOrg ? 'Sign the letter of interest' : 'Add my name'}
                  </button>
                  <span className={styles.submitNote}>No money asked for. No account created.</span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
