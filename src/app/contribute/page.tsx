import type { Metadata } from 'next';
import ContributePage from '@/components/ContributePage';

export const metadata: Metadata = {
  title: 'Contribute',
  description: 'Connect public money to the decisions that authorized it. Every link you make is permanent, public, and credited to you.',
};

export default function Page() {
  return <ContributePage />;
}
