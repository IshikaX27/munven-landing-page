import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A separate build folder lets a preview build run next to `next dev` (NEXT_DIST_DIR=.next-preview)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The app must not be framed by other sites (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Invite/reset links carry a secret token in the URL: never send it to other sites
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
