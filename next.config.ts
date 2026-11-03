import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Task uploads: 10 MB file + multipart overhead, above the 1 MB default.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
