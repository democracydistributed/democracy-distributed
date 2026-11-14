import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import BrowsePage from '@/components/BrowsePage';
import { COUNTRY_COOKIE } from '@/lib/country';

export const metadata: Metadata = {
  title: 'Browse Organizations',
  description:
    "Browse organizations tracked by Democracy Distributed. Explore each one's budget, spending, council decisions, and funded projects, traced from vote to invoice.",
};

export default function Page({ searchParams }: { searchParams: { country?: string; region?: string; city?: string; simulateCountry?: string; simulateRegion?: string } }) {
  // Vercel sets this on every request; it's absent locally, so dev can fake it with ?simulateCountry=GB.
  const simulated = process.env.NODE_ENV !== 'production' ? searchParams.simulateCountry : undefined;
  const ipCountry = simulated || headers().get('x-vercel-ip-country') || null;
  // Province / state code (ISO 3166-2, e.g. 'ON'). Dev can fake it with ?simulateRegion=ON.
  const simulatedRegion = process.env.NODE_ENV !== 'production' ? searchParams.simulateRegion : undefined;
  const ipRegion = simulatedRegion || headers().get('x-vercel-ip-country-region') || null;
  const savedCountry = cookies().get(COUNTRY_COOKIE)?.value || null;
  return (
    <BrowsePage
      ipCountry={ipCountry}
      ipRegion={ipRegion}
      savedCountry={savedCountry}
      urlCountry={searchParams.country || null}
      urlRegion={searchParams.region || null}
      urlCity={searchParams.city || null}
    />
  );
}
