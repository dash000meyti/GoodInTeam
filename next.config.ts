import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Native module: must stay a runtime require, never bundled.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/brand/**" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Streaming needs proxies (nginx, Traefik) to not buffer responses.
        source: "/:path*",
        headers: [{ key: "X-Accel-Buffering", value: "no" }],
      },
    ];
  },
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
