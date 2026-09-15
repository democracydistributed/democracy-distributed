/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gateway calls are proxied by a Route Handler at
  // src/app/api/gateway/[...path]/route.ts (not a rewrite), so the browser makes
  // same-origin requests, avoiding the gateway's broken CORS headers. Caching there
  // is off by default — see GATEWAY_CACHE_ENABLED in CACHING.md.
};

export default nextConfig;
