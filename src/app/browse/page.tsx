import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import BrowsePage from '@/components/BrowsePage';
import { COUNTRY_COOKIE } from '@/lib/country';

export const metadata: Metadata = {
  title: 'Browse Organizations',
  description:
    "Browse organizations tracked by Democracy Distributed. Explore each one's budget, spending, council decisions, and funded projects, traced from vote to invoice.",
};

export default function Page({ searchParams }: { searchParams: { country?: string; simulateCountry?: string } }) {
  // Vercel sets this on every request; it's absent locally, so dev can fake it with ?simulateCountry=GB.
  const simulated = process.env.NODE_ENV !== 'production' ? searchParams.simulateCountry : undefined;
  const ipCountry = simulated || headers().get('x-vercel-ip-country') || null;
  const savedCountry = cookies().get(COUNTRY_COOKIE)?.value || null;
  return <BrowsePage ipCountry={ipCountry} savedCountry={savedCountry} urlCountry={searchParams.country || null} />;
}
