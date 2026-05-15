import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk", "pg", "@prisma/adapter-pg"],
};

export default nextConfig;
