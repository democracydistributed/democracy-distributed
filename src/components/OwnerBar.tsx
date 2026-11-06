'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import styles from './Member.module.css';

// Shown on a member's page only to that member: the private extras (email, sign out).
// Everyone else, including search engines and the cached HTML, gets nothing from this.
// Whose page it is gets decided in the browser, from the visitor's own login.

export default function OwnerBar({ handle }: { handle: string }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await fetch('/api/me?brief=1', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
        if (!alive || !me?.handle || me.handle.toLowerCase() !== handle.toLowerCase()) return;
        const s = await fetch('/api/auth/session', { cache: 'no-store' }).then((r) => r.json());
        if (alive) setEmail(s?.user?.email ?? null);
      } catch {
        /* not the owner, or couldn't tell: show nothing */
      }
    })();
    return () => {
      alive = false;
    };
  }, [handle]);

  if (email === undefined) return null;
  return (
    <div className={styles.private}>
      <span>Only you see this{email ? ` · ${email}` : ''} · Signed in via Corteza</span>
      <button type="button" className={styles.signOut} onClick={() => signOut({ callbackUrl: '/' })}>
        Sign out
      </button>
    </div>
  );
}
