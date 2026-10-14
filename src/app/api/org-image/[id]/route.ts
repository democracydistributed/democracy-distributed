import { NextRequest, NextResponse } from 'next/server';
import { DD_NAMESPACE_ID, getAnonymousToken } from '@/lib/corteza-write';

// Serves an org's coverPhoto (a Corteza File-field attachment) to anyone.
//
// Corteza only serves attachments to an authenticated caller, and the public site
// has no login, so this fetches server-side with the anonymous service account and
// streams the bytes back. Always the anonymous identity — never a member's token —
// so the response is identical for everyone and safe to cache publicly.

export const dynamic = 'force-dynamic';

const CORTEZA = 'https://app.democracydistributed.com';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^\d{1,20}$/.test(params.id)) return new NextResponse('Not found', { status: 404 });

  try {
    const token = await getAnonymousToken();
    const auth = { authorization: `Bearer ${token}` };
    const base = `${CORTEZA}/api/compose/namespace/${DD_NAMESPACE_ID}`;

    // Corteza refuses unsigned attachment URLs, so first ask for the attachment's
    // metadata, which includes a signed link to the original file.
    const metaRes = await fetch(`${base}/attachment/record/${params.id}`, { headers: auth, cache: 'no-store' });
    const signedPath: unknown = (await metaRes.json().catch(() => null))?.response?.url;
    if (!metaRes.ok || typeof signedPath !== 'string') return new NextResponse('Not found', { status: 404 });

    // `url` is relative to the compose API root (/api/compose).
    const upstream = await fetch(`${CORTEZA}/api/compose${signedPath}`, { headers: auth, cache: 'no-store' });
    const type = upstream.headers.get('content-type') ?? '';
    // Only ever relay images — never an upstream error page or other file type.
    if (!upstream.ok || !type.startsWith('image/')) return new NextResponse('Not found', { status: 404 });

    return new NextResponse(upstream.body, {
      headers: {
        'content-type': type,
        // Attachment IDs are immutable (a new upload gets a new ID), so cache hard.
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new NextResponse('Unavailable', { status: 502 });
  }
}
