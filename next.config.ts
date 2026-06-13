import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep heavy browser packages out of the webpack bundle — loaded at runtime
  // by the Node.js API routes that need them.
  serverExternalPackages: ['playwright', 'puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;
