import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Consolidated routes — old bookmarks keep working.
    return [
      { source: "/tldr", destination: "/briefings", permanent: true },
      { source: "/crypto-briefings", destination: "/crypto", permanent: true },
    ];
  },
};

export default nextConfig;
