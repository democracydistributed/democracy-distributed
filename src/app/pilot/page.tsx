import type { Metadata } from 'next';
import PilotPage from '@/components/PilotPage';

export const metadata: Metadata = {
  title: 'Pilot — Toronto',
  description:
    "Everyone can help. We're gauging interest from Toronto volunteer organizations and volunteers for a pilot of POD — a platform where organizations post microtasks and anyone can pick one up.",
};

export default function Page() {
  return <PilotPage />;
}
