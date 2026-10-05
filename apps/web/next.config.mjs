import { securityHeaders } from "../../packages/config/next-security-headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      "argon2",
      "nodemailer",
      "stripe",
      "@aws-sdk/client-s3",
      "@aws-sdk/s3-request-presigner",
    ],
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
    "@platform/database",
    "@platform/auth",
  ],
};

export default nextConfig;
