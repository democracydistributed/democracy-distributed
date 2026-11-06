import Nav from './Nav';
import Footer from './Footer';
import { signIn, signOut } from '@/auth';
import type { Session } from 'next-auth';
import AccountActivity from './AccountActivity';
import styles from './Account.module.css';
import member from './Member.module.css';

function LoggedOutView() {
  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.loginCard}>
          <div className={styles.title}>Log in to your account</div>
          <p className={styles.sub}>Democracy Distributed accounts are managed through Corteza.</p>
          <form
            action={async () => {
              'use server';
              await signIn('corteza');
            }}
          >
            <button type="submit" className={styles.loginBtn}>
              Log in with Corteza
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AccountPage({ session }: { session: Session }) {
  const name = session.user?.name ?? 'there';
  const firstName = name.split(' ')[0];
  const email = session.user?.email;
  const words = (session.user?.name ?? '').trim().split(/\s+/).filter(Boolean);
  const initials = (words.length >= 2 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? email ?? '?').slice(0, 2)).toUpperCase();

  return (
    <div className={member.page}>
      <Nav />

      <main className={member.main}>
        <div className={member.inner}>
          <div className={member.head}>
            <div className={member.avatar} aria-hidden="true">
              {initials}
            </div>
            <h1 className={member.title}>
              Welcome back, <em>{firstName}</em>
            </h1>
          </div>

          <div className={member.private}>
            <span>Only you see this{email ? ` · ${email}` : ''} · Signed in via Corteza</span>
          </div>

          <AccountActivity />

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
            style={{ marginTop: 36 }}
          >
            <button type="submit" className={member.signOut}>
              Sign out
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export { LoggedOutView };
