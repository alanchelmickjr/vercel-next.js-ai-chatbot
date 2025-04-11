import type { NextConfig } from 'next';
import { execSync } from 'child_process';
import path from 'path';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Run migrations only once during build (on server build)
    if (isServer) {
      console.log('🔄 Running database migrations during build...');
      try {
        // Run the migration script with tsx
        execSync('pnpm exec tsx lib/db/migrate.ts', { stdio: 'inherit' });
        console.log('✅ Database migrations completed successfully');
      } catch (error) {
        console.error('❌ Error running migrations:', error);
        // Don't fail the build if migrations fail
      }
    }
    return config;
  },
};

export default nextConfig;
