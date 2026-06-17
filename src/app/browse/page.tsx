import type { Metadata } from 'next';
import BrowsePage from '@/components/BrowsePage';

export const metadata: Metadata = {
  title: 'Browse Organizations — Democracy Distributed',
};

export default function Page() {
  return <BrowsePage />;
}
