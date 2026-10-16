/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {
    resolveAlias: {
      '@jlpt/exam-engine': '../../packages/exam-engine/dist/index.js',
      fs: './lib/stubs/fs.js',
      module: './lib/stubs/module.js',
      path: './lib/stubs/path.js',
    },
  },
};

export default nextConfig;
