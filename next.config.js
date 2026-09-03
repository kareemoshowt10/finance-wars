/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Runs instrumentation.ts once at server boot — see lib/launchChecks.ts.
  experimental: { instrumentationHook: true },
};
module.exports = nextConfig;
