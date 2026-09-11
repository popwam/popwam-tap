import type { NextConfig } from "next";
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

const nextConfig: NextConfig = {
  experimental: { authInterrupts: true },
  transpilePackages: ["@popwam/auth", "@popwam/db", "@popwam/shared", "@popwam/storage"],
  webpack(config, { isServer }) {
    if (isServer) config.plugins.push(new PrismaPlugin());
    return config;
  },
  async headers() {
    const securityHeaders = [
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()" },
    ];
    return [
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
        ],
      },
      { source: "/:path*", headers: securityHeaders },
      { source: "/mobile-preview/:path*", headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" },
      ] },
      { source: "/dashboard/nearby", headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()" }] },
      { source: "/dashboard/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
