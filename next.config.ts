import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // Allow ngrok tunnel origins during development
  allowedDevOrigins: [
    "barman-naming-spectrum.ngrok-free.dev",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.io",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      {
        source: "/(login|signup|forgot-password|dashboard|admin|api)/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/(login|signup|forgot-password|dashboard|admin)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;

