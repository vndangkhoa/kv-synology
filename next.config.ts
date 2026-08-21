import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Allow self-signed certificates in local DSM instances if needed
};

export default nextConfig;
