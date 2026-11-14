import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
/** Hosts other than localhost allowed to load the dev server (e.g. a dev tunnel), comma-separated. Dev only. */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""))
  .filter(Boolean);

// cacheComponents / partialPrefetching are intentionally off: every portal page is behind auth
// and renders from client-side queries, so static shells and instant-navigation checks add nothing.
const nextConfig: NextConfig = {
  allowedDevOrigins,
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
