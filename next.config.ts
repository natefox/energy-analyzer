import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/energy-analyzer",
  images: { unoptimized: true },
};

export default nextConfig;
