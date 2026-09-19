/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@platform/ui",
    "@platform/types",
    "@platform/config",
    "@platform/validation",
    "@platform/api-client",
    "@platform/database",
  ],
};

export default nextConfig;
