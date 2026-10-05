import { securityHeaders } from "../../packages/config/next-security-headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return securityHeaders();
  },
  transpilePackages: [
    "@platform/ui",
    "@platform/types",
    "@platform/config",
    "@platform/validation",
    "@platform/api-client",
  ],
};

export default nextConfig;
