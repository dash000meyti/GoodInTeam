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
  // Runtime data (SQLite DB, uploads) must never be copied into the build output
  // (file tracing otherwise picks up ./data via DATA_DIR's default).
  outputFileTracingExcludes: { "*": ["./data/**/*"], "/**": ["./data/**/*"] },
  experimental: {
    // Every server action is a public POST endpoint, signed in or not, so the
    // limit is what the largest ordinary save needs (a 500,000-character page,
    // a vault item), not what an upload needs. Files go to `POST /api/media`,
    // which streams with its own limit. Keep it equal to
    // ACTION_BODY_LIMIT_BYTES in src/lib/limits.ts (proxy.test.ts compares the two).
    serverActions: { bodySizeLimit: "2mb" },
    // src/proxy.ts runs on every path and Next buffers the body for it; keep
    // this ≥ one upload (a 20 MB file plus its multipart framing) or uploads
    // get truncated.
    proxyClientMaxBodySize: "21mb",
    // `next dev`/`next build` remind (and `next upgrade --agent` defaults) to
    // security releases only.
    agentUpgrade: "security",
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
