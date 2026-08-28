import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["ssh2", "net-snmp"],
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
