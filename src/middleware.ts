import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TORONTO_ORG_ID } from '@/lib/api';

// Canonicalizes legacy query-param URLs to their dynamic-route equivalents.
//
// Doing this in middleware (rather than calling redirect() inside the page
// component) is what makes the response a real HTTP 308 — the root
// app/loading.tsx wraps every route in a Suspense boundary, so a redirect()
// thrown during rendering only produces a 200 + meta-refresh, which search
// engines don't treat as a true permanent redirect.
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/item-record') {
    const itemId = searchParams.get('itemId');
    if (itemId) return NextResponse.redirect(new URL(`/item/${encodeURIComponent(itemId)}`, request.url), 308);
  }

  if (pathname === '/project-record') {
    const projectId = searchParams.get('projectId');
    if (projectId) return NextResponse.redirect(new URL(`/project/${encodeURIComponent(projectId)}`, request.url), 308);
  }

  if (pathname === '/') {
    const orgId = searchParams.get('orgId');
    const org = searchParams.get('org');
    if (orgId) {
      const target = new URL(`/org/${encodeURIComponent(orgId)}`, request.url);
      if (org) target.searchParams.set('org', org);
      return NextResponse.redirect(target, 308);
    }
    if (org === 'toronto') {
      return NextResponse.redirect(new URL(`/org/${TORONTO_ORG_ID}?org=toronto`, request.url), 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/item-record', '/project-record'],
};
