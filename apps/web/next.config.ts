import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@caratflow/ui', '@caratflow/shared-types', '@caratflow/utils'],
  experimental: {
    // Enable optimized package imports
  },
};

export default nextConfig;
