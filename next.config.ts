import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Allow any HTTPS image source — users can store images from any CDN/host
    remotePatterns: [
      { protocol: 'https', hostname: '**', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '**', port: '', pathname: '' },
      { protocol: 'http',  hostname: '**', port: '', pathname: '/**' },
    ],
  },
};

export default nextConfig;
