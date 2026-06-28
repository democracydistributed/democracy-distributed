import type { Metadata } from 'next';
import BrowsePage from '@/components/BrowsePage';

export const metadata: Metadata = {
  title: 'Browse Organizations',
  description:
    "Browse organizations tracked by Democracy Distributed — explore each one's budget, spending, council decisions, and funded projects, traced from vote to invoice.",
};

export default function Page() {
  return <BrowsePage />;
}
