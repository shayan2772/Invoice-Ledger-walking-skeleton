import type { NextConfig } from "next";

// Baseline security headers applied to every response. The policy is
// intentionally tight for a read-only app: no external scripts, no
// embedding, no referrer leaks. If a future feature needs to call an
// external origin (Sentry, analytics), add it explicitly rather than
// opening the policy up.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Emit a minimal self-contained Node server (`server.js` + only the
  // `node_modules` actually imported). The Dockerfile's runner stage copies
  // just `.next/standalone` + `.next/static` + `public/` — no build tools.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
