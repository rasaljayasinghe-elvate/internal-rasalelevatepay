import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Every page here reads live DB state (calls, issues, activity sheet) —
     cacheComponents/PPR buys nothing for an internal tool like this. */
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
