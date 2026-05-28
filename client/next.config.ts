import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true, // Enable gzip/brotli compression
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vkrgfqjsixjsieqzykcx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Image optimization settings
    formats: ['image/avif', 'image/webp'], // Modern formats
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree-shake unused icons
  },

  // HTTP Caching headers
  async headers() {
    return [
      // Cache API responses for 5 minutes
      {
        source: '/api/products',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/categories',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=172800' }, // 1 day
        ],
      },
      // Cache images for 1 year (they have content-based URLs)
      {
        source: '/storage/v1/object/public/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }, // 1 year
        ],
      },
      // Security headers
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },

  // Redirects and rewrites
  async rewrites() {
    return {
      beforeFiles: [
        // Cache-friendly API routing
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
