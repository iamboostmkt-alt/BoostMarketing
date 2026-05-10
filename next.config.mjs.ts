const nextConfig = {
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;