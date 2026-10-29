import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  experimental: {
    optimizePackageImports: ['@jlpt/ui'],
  },
  async headers() {
    return [
      {
        source: '/phong-thi',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store, no-cache, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      crypto: './lib/stubs/crypto.js',
      'node:crypto': './lib/stubs/crypto.js',
      fs: './lib/stubs/fs.js',
      'node:fs': './lib/stubs/fs.js',
      module: './lib/stubs/module.js',
      'node:module': './lib/stubs/module.js',
      path: './lib/stubs/path.js',
      'node:path': './lib/stubs/path.js',
    },
  },
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL || process.env.API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        // Snapshot media keys are rendered as `/media/<file>` (images, listening audio).
        source: '/media/:path*',
        destination: `${apiUrl}/api/v1/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
