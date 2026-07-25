import path from "node:path";
import type { NextConfig } from "next";

import { assertUrlVariables, validateOriginVariable } from "./lib/env/shared";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    const values = assertUrlVariables([
      validateOriginVariable("FASTAPI_INTERNAL_URL", process.env.FASTAPI_INTERNAL_URL),
    ]);

    return [
      {
        source: "/api/v1/:path*",
        destination: `${values.FASTAPI_INTERNAL_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
