'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useTheme } from '@/context/ThemeContext';
import styles from './AccountMenu.module.css';

// The avatar in the nav and the menu it opens: who you are, a link to your account,
// the Light / Dark control, and sign out (or, logged out, Sign in / Create account).
//
// It asks /api/auth/session from the browser instead of calling auth() on the server, so
// pages that render the nav stay cacheable. That route never contains the Corteza token.

// Corteza has separate pages for logging in and signing up. "Sign in" starts the OAuth
// login (which lands on /auth/login); "Create account" goes straight to the signup page.
const SIGNUP_URL = 'https://app.democracydistributed.com/auth/signup';

interface Who {
  name: string | null;
  email: string | null;
}

// undefined = not asked yet, null = logged out. Kept at module level so moving between
// pages (each mounts its own nav) shows the right avatar immediately instead of flashing.
let known: Who | null | undefined;
// The member's own page, once known. Members without a usable public handle have none.
let knownHandle: string | null | undefined;

function initials(who: Who): string {
  const words = (who.name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  const single = words[0] ?? who.email ?? '';
  return single.slice(0, 2).toUpperCase() || '?';
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
    </svg>
  );
}

export default function AccountMenu() {
  const [who, setWho] = useState<Who | null | undefined>(known);
  const [handle, setHandle] = useState<string | null | undefined>(knownHandle);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { theme, setTheme } = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s) => {
        known = s?.user ? { name: s.user.name ?? null, email: s.user.email ?? null } : null;
      })
      .catch(() => {
        // Couldn't tell: treat as logged out for now, but don't remember it.
        if (known === undefined) known = null;
      })
      .then(async () => {
        if (known && knownHandle === undefined) {
          const me = await fetch('/api/me?brief=1', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          if (me?.ok) knownHandle = me.handle ?? null;
        }
        if (!known) knownHandle = undefined;
      })
      .finally(() => {
        if (alive) {
          setWho(known);
          setHandle(knownHandle);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // Come back to where you were after logging in or out.
  const login = () => {
    setBusy(true);
    signIn('corteza', { callbackUrl: window.location.href });
  };
  const logout = () => {
    setBusy(true);
    known = null;
    knownHandle = undefined;
    signOut({ callbackUrl: '/' });
  };

  const loggedIn = !!who;
  const label = loggedIn ? `Account menu for ${who.name ?? who.email ?? 'you'}` : 'Sign in or create an account';

  return (
    <div className={styles.root} ref={root}>
      <button
        ref={button}
        type="button"
        className={`${styles.avatar} ${loggedIn ? styles.avatarIn : ''}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        {loggedIn ? initials(who) : <PersonIcon />}
      </button>

      {open && (
        <div id={menuId} className={styles.menu} role="dialog" aria-label="Account menu">
          {who === undefined ? null : loggedIn ? (
            <>
              <div className={styles.identity}>
                <span className={`${styles.avatar} ${styles.avatarIn} ${styles.avatarLg}`} aria-hidden="true">
                  {initials(who)}
                </span>
                <div className={styles.who}>
                  <div className={styles.name}>{who.name ?? 'Your account'}</div>
                  {who.email && <div className={styles.email}>{who.email}</div>}
                </div>
              </div>
              <Link href={handle ? `/u/${encodeURIComponent(handle)}` : '/account'} className={styles.row} onClick={() => close()}>
                <span>Account</span>
                <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <div className={styles.guest}>
              <div className={styles.guestTitle}>Sign in</div>
              <p className={styles.guestSub}>Sign in to see your activity.</p>
              <div className={styles.guestActions}>
                <button type="button" className={styles.primary} onClick={login} disabled={busy}>
                  Sign in
                </button>
                <a href={SIGNUP_URL} className={styles.secondary}>
                  Create account
                </a>
              </div>
            </div>
          )}

          <div className={styles.appearance}>
            <span className={styles.appearanceLabel} id={`${menuId}-ap`}>
              Appearance
            </span>
            <div className={styles.seg} role="radiogroup" aria-labelledby={`${menuId}-ap`}>
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  aria-label={t === 'light' ? 'Light' : 'Dark'}
                  title={t === 'light' ? 'Light' : 'Dark'}
                  className={`${styles.segBtn} ${theme === t ? styles.segOn : ''}`}
                  onClick={() => setTheme(t)}
                >
                  <span aria-hidden="true">{t === 'light' ? '☀' : '🌙'}</span>
                </button>
              ))}
            </div>
          </div>

          {loggedIn && (
            <button type="button" className={`${styles.row} ${styles.signOut}`} onClick={logout} disabled={busy}>
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
