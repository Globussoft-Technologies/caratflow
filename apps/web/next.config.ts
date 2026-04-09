import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/admin',
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@caratflow/ui', '@caratflow/shared-types', '@caratflow/utils'],
};

export default nextConfig;
