import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["ssh2"],
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
