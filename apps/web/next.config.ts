import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@popwam/auth", "@popwam/db", "@popwam/shared", "@popwam/storage"],
};

export default nextConfig;
