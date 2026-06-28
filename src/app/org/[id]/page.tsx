import type { Metadata } from 'next';
import OrgPage from '@/components/OrgPage';
import { fetchOrgServer, fetchSankeyServer } from '@/lib/server-api';
import { TORONTO_2024_DATA } from '@/lib/toronto';
import { stripHtml } from '@/lib/text';
import { SITE_URL } from '@/lib/site';
import type { OrgData, SankeyData } from '@/lib/types';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const org = await fetchOrgServer(params.id).catch(() => null);
  if (!org?.name) return { title: 'Organization — Democracy Distributed' };
  const description = org.description
    ? stripHtml(org.description).slice(0, 155)
    : `Explore ${org.name}'s budget, decisions, and projects — traced from vote to invoice on Democracy Distributed.`;
  return {
    title: org.name,
    description,
    openGraph: { title: `${org.name} — Democracy Distributed`, description },
  };
}

export default async function OrgRoutePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { org?: string };
}) {
  const orgId = params.id;

  const [org, sankeyResult] = await Promise.all([
    fetchOrgServer(orgId).catch(() => null as OrgData | null),
    searchParams.org === 'toronto'
      ? Promise.resolve({ data: TORONTO_2024_DATA as SankeyData | null, error: null as string | null })
      : fetchSankeyServer(orgId)
          .then((data) => ({ data, error: null as string | null }))
          .catch((e: Error) => ({ data: null as SankeyData | null, error: e.message })),
  ]);

  const datasetJsonLd = org?.name
    ? {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${org.name} — Government Spending & Decisions Dataset`,
        description: org.description
          ? stripHtml(org.description).slice(0, 300)
          : `Government finances, council decisions, and funded projects for ${org.name}, traced from vote to invoice.`,
        url: `${SITE_URL}/org/${orgId}`,
        ...(sankeyResult.data?.year ? { temporalCoverage: String(sankeyResult.data.year) } : {}),
        ...(org.jurisdiction ? { spatialCoverage: org.jurisdiction } : {}),
        creator: { '@type': 'Organization', name: 'Democracy Distributed' },
        keywords: ['government spending', 'civic accountability', 'municipal finance', 'open data', org.jurisdiction].filter(Boolean),
      }
    : null;

  return (
    <>
      <OrgPage orgId={orgId} initialOrg={org} initialSankey={sankeyResult.data} initialError={sankeyResult.error} />
      {datasetJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      ) : null}
    </>
  );
}
