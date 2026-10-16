/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {
    resolveAlias: {
      fs: './lib/stubs/fs.js',
      module: './lib/stubs/module.js',
      path: './lib/stubs/path.js',
    },
  },
};

export default nextConfig;
