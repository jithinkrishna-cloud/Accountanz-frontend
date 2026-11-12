import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

// cacheComponents / partialPrefetching are intentionally off: every portal page is behind auth
// and renders from client-side queries, so static shells and instant-navigation checks add nothing.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser calls /api/* on the frontend origin and Next forwards it to Express.
  // Same origin means the httpOnly auth cookies work without cross-site cookie settings.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
