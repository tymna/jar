import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Repo root, not frontend/ — lets us import indexer/ponder.schema.ts
    // (single source of truth for indexer table types).
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
