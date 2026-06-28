import type { Metadata } from 'next';
import AboutPage from '@/components/AboutPage';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Democracy Distributed is an open, crowdsourced record of how government spends and decides — built so the public can understand it, and organize around it. Built in the open, in Toronto.',
};

export default function Page() {
  return <AboutPage />;
}
