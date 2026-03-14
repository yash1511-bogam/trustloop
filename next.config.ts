import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX({
  configPath: "./source.config.ts",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  rewrites: async () => {
    // Path-based workspace routing for MANAGER/AGENT: /<slug>/dashboard → /dashboard
    const appPaths = [
      "dashboard",
      "executive",
      "settings",
      "settings/:path*",
      "incidents/:path*",
    ];
    return appPaths.map((p) => ({
      source: `/:slug((?!api|_next|docs|status|login|register|forgot-access|choose-plan|changelog)[a-z0-9-]+)/${p}`,
      destination: `/${p}`,
    }));
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://api.anthropic.com https://*.stytch.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    },
  ],
};

export default withMDX(nextConfig);
