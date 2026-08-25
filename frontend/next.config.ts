import type { NextConfig } from "next";

const apiInternalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? "http://localhost:3000/api/v1";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiInternalBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
