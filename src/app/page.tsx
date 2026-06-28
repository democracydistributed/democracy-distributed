import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'Democracy Distributed — Trace Government Spending from Vote to Invoice',
  description:
    "Democracy Distributed is the open civic database that lets you trace government money from the vote that authorized it to the invoice that paid it out. See Toronto's 2024 budget as an interactive Sankey diagram.",
};

// Org pages used to live at /?orgId=xxx; middleware.ts canonicalizes those
// (and the old ?org=toronto demo link) to /org/[id] with a real 308 before
// the request ever reaches this component.
export default function Page() {
  return <LandingPage />;
}
