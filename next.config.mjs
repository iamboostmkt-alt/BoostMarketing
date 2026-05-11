/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,

  // Log every server-side fetch URL + cache status in dev
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: '**' },
    ],
  },
};

export default nextConfig;
