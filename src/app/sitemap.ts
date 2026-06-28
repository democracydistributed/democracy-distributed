import type { MetadataRoute } from 'next';
import { fetchItemsServer, fetchOrgsServer, fetchProjectsServer } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';

// Regenerate at most once an hour — org/item/project counts change slowly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contribute`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const { orgs } = await fetchOrgsServer().catch(() => ({ orgs: [] }));
  const orgIds = orgs.map((o) => o.orgId || o.id).filter((id): id is string => Boolean(id));

  const orgRoutes: MetadataRoute.Sitemap = orgIds.map((id) => ({
    url: `${SITE_URL}/org/${id}`,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  // Items and projects aren't linked anywhere crawlable without visiting the
  // org page's client-side tabs, so the sitemap is the only way search
  // engines discover these record pages at all.
  const recordRoutesByOrg = await Promise.all(
    orgIds.map(async (orgId) => {
      const [items, projects] = await Promise.all([
        fetchItemsServer(orgId)
          .then((r) => r.items)
          .catch(() => []),
        fetchProjectsServer(orgId)
          .then((r) => r.projects)
          .catch(() => []),
      ]);
      const itemRoutes: MetadataRoute.Sitemap = items
        .filter((i) => i.itemId)
        .map((i) => ({ url: `${SITE_URL}/item/${i.itemId}`, changeFrequency: 'monthly', priority: 0.6 }));
      const projectRoutes: MetadataRoute.Sitemap = projects
        .filter((p) => p.projectId)
        .map((p) => ({ url: `${SITE_URL}/project/${p.projectId}`, changeFrequency: 'monthly', priority: 0.6 }));
      return [...itemRoutes, ...projectRoutes];
    }),
  );

  return [...staticRoutes, ...orgRoutes, ...recordRoutesByOrg.flat()];
}
