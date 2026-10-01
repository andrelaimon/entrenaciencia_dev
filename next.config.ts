import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep heavy browser packages out of the webpack bundle — loaded at runtime
  // by the Node.js API routes that need them.
  serverExternalPackages: ['playwright', 'puppeteer-core', '@sparticuz/chromium'],

  // Landing de venta del curso (sitio estático en public/vsl/, copiado con scripts/sync-vsl.sh).
  // /vsl sirve su index.html, que manda a la versión de celular o escritorio.
  async rewrites() {
    return [{ source: '/vsl', destination: '/vsl/index.html' }];
  },
};

export default nextConfig;
