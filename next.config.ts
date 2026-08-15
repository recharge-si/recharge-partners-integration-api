import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server bundle for the Docker image.
  output: "standalone",
  // Mongoose is a server-only dependency; keep it external to the bundle.
  serverExternalPackages: ["mongoose"],
  // The Unifiber master export is read from disk at runtime (see
  // src/lib/sources/unifiber.ts). File tracing can't see a runtime readFile, so
  // include data/ in every server trace. The Dockerfile also copies it verbatim.
  outputFileTracingIncludes: {
    "/*": ["data/**"],
  },
};

export default nextConfig;
