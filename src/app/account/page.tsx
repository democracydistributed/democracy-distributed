import { auth } from '@/auth';
import AccountPage, { LoggedOutView } from '@/components/AccountPage';

export default async function Account() {
  const session = await auth();

  if (!session) {
    return <LoggedOutView />;
  }

  return <AccountPage session={session} />;
}
