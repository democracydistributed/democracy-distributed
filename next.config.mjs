/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gateway calls are proxied + cached by a Route Handler at
  // src/app/api/gateway/[...path]/route.ts (not a rewrite), so the browser makes
  // same-origin requests (avoiding the gateway's broken CORS) AND gets
  // in-process caching with stale-while-revalidate.
};

export default nextConfig;
