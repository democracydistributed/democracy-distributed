import type { Metadata } from 'next';
import ContributePage from '@/components/ContributePage';
import { fetchOrgServer, fetchOrgsServer } from '@/lib/server-api';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Contribute',
  description: 'Join us on the Civic Tech Toronto Slack and help connect public money to the decisions that authorized it.',
};

// DD Central Government is Democracy Distributed's own org. Prefer its stable ID
// (env override, else the known one) and fall back to a lookup by name if that
// ID no longer resolves.
const DD_GOV_ORG_ID = process.env.NEXT_PUBLIC_DD_GOV_ORG_ID || '394662382766391297';
const DD_GOV_ORG_NAME = 'DD Central Government';

async function findGovOrgId(): Promise<string | null> {
  const byId = await fetchOrgServer(DD_GOV_ORG_ID).catch(() => null);
  if (byId?.name) return DD_GOV_ORG_ID;
  const orgs = await fetchOrgsServer().catch(() => null);
  const gov = orgs?.orgs.find((o) => o.name === DD_GOV_ORG_NAME);
  return gov?.orgId || gov?.id || null;
}

export default async function Page() {
  return <ContributePage govOrgId={await findGovOrgId()} />;
}
