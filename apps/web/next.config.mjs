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
      '../messages/vi.json': './messages/vi-shell.json',
    },
  },
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL || process.env.API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
