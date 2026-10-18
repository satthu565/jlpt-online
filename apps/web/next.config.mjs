import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
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
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
