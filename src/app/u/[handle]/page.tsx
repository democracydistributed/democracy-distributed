import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import MemberActivity from '@/components/MemberActivity';
import OwnerBar from '@/components/OwnerBar';
import { loadMemberActivity, resolvePublicMember } from '@/lib/member-activity';
import styles from '@/components/Member.module.css';

// A member's public page: their handle and their reactions, visible to anyone. Never their
// name or email (see src/lib/member-activity.ts).

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  // Member pages are for people who follow a link, not for search results.
  return { title: decodeURIComponent(params.handle), robots: { index: false, follow: false } };
}

export default async function MemberPage({ params }: { params: { handle: string } }) {
  let handle: string;
  try {
    handle = decodeURIComponent(params.handle);
  } catch {
    notFound();
  }

  const member = await resolvePublicMember(handle);
  if (!member) notFound();

  const activity = await loadMemberActivity(member.identity, member.userId);

  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.head}>
            <div className={styles.avatar} aria-hidden="true">
              {member.handle.slice(0, 2).toUpperCase()}
            </div>
            <h1 className={styles.title}>{member.handle}</h1>
          </div>
          <OwnerBar handle={member.handle} />
          <MemberActivity activity={activity} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
