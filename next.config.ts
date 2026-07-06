import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "playwright-core", "jsdom"],
};

export default nextConfig;
