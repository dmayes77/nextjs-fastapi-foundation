/** @jest-environment node */

import nextConfig from "@/next.config";

describe("Next.js API rewrites", () => {
  const originalFastApiInternalUrl = process.env.FASTAPI_INTERNAL_URL;

  afterEach(() => {
    if (originalFastApiInternalUrl === undefined) {
      delete process.env.FASTAPI_INTERNAL_URL;
    } else {
      process.env.FASTAPI_INTERNAL_URL = originalFastApiInternalUrl;
    }
  });

  it("forwards same-origin browser Project requests to the configured FastAPI origin", async () => {
    process.env.FASTAPI_INTERNAL_URL = "https://backend.example.test";

    expect(typeof nextConfig.rewrites).toBe("function");
    const rewrites = await nextConfig.rewrites!();

    expect(rewrites).toEqual([
      {
        source: "/api/v1/:path*",
        destination: "https://backend.example.test/api/v1/:path*",
      },
    ]);
  });
});
