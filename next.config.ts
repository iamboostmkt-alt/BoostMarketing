import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" output is for Docker/VPS deployments.
  // Comment out for local development / Vercel deployment.
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
