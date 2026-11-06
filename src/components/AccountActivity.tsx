'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import MemberActivity from './MemberActivity';
import type { MemberActivity as Activity } from '@/lib/member-activity';
import styles from './Member.module.css';

// The signed-in member's own reactions on /account, plus the link to their public page.
// Loaded in the browser from /api/me so the account page itself stays simple to render.

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'reauth' }
  | { status: 'ready'; handle: string | null; activity: Activity };

export default function AccountActivity() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    fetch('/api/me', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!alive) return;
        if (r.ok && data?.ok) {
          // Your page lives at /u/<handle>; /account is only the way in (and the fallback
          // for members without a usable public handle).
          if (data.handle) {
            router.replace(`/u/${encodeURIComponent(data.handle)}`);
            return;
          }
          setState({ status: 'ready', handle: data.handle ?? null, activity: { score: data.score, total: data.total, events: data.events } });
        } else {
          setState({ status: data?.reauth ? 'reauth' : 'error' });
        }
      })
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [router]);

  if (state.status === 'loading') return <div className={styles.loading}>Loading your activity…</div>;
  if (state.status === 'error') return <div className={styles.loading}>Couldn&rsquo;t load your activity right now. Please try again in a moment.</div>;
  if (state.status === 'reauth') {
    return (
      <div className={styles.loading}>
        Your login has expired.{' '}
        <button type="button" className={styles.signOut} onClick={() => signIn('corteza', { callbackUrl: '/account' })}>
          Log in again
        </button>
      </div>
    );
  }

  return (
    <>
      {state.handle ? (
        <div className={styles.actions}>
          <Link href={`/u/${encodeURIComponent(state.handle)}`} className={styles.org}>
            View your public page →
          </Link>
        </div>
      ) : null}
      <MemberActivity activity={state.activity} />
    </>
  );
}
