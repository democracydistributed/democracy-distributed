import Link from 'next/link';
import Nav from './Nav';
import Footer from './Footer';
import { signIn, signOut } from '@/auth';
import type { Session } from 'next-auth';
import styles from './Account.module.css';

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

  return (
    <div className={styles.page}>
      <Nav />

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.eyebrow}>Account</div>
          <h1 className={styles.title}>
            Welcome back, <em>{firstName}</em>
          </h1>
          <p className={styles.sub}>Manage what you follow and track your activity on Democracy Distributed.</p>
          {email && <div className={styles.meta}>Signed in via Corteza · {email}</div>}
          <form
            action={async () => {
              'use server';
              await signOut();
            }}
          >
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
        </div>

        <div className={styles.body}>
          <div className={styles.placeholder}>
            <div className={styles.placeholderLabel}>Nothing here yet</div>
            <div className={styles.placeholderText}>Your saved organizations and activity will show up here.</div>
            <div className={styles.placeholderLinks}>
              <Link href="/browse">Browse Organizations →</Link>
              <Link href="/contribute">Contribute →</Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export { LoggedOutView };
