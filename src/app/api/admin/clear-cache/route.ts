import { timingSafeEqual } from 'crypto';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { clearGatewayProxyCache } from '@/lib/gateway-proxy-cache';

export const dynamic = 'force-dynamic';

function isAuthorized(key: string | null): boolean {
  const expected = process.env.ADMIN_CACHE_KEY;
  if (!expected || !key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!isAuthorized(key)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  revalidateTag('gateway-data');
  clearGatewayProxyCache();

  return NextResponse.json({ ok: true, cleared: ['next-data-cache', 'gateway-proxy-cache'] });
}
