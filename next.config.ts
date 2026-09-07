import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Consolidated routes — old bookmarks keep working.
    return [
      { source: "/tldr", destination: "/briefings", permanent: true },
      // /crypto was retired; the crypto briefings live in the same archive as
      // everything else, so send old bookmarks there rather than to a route
      // that has not existed since the consolidation.
      { source: "/crypto-briefings", destination: "/briefings", permanent: true },
    ];
  },
};

export default nextConfig;
