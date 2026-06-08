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
      {
<<<<<<< HEAD
        protocol: 'https',
        hostname: 'assets.nyvara.com',
        pathname: '/products/**',
=======
        // Cloudflare R2 public development URL
        protocol: 'https',
        hostname: 'pub-96ecbfcde03642529999eddf062d31f5.r2.dev',
        pathname: '/**',
>>>>>>> a87fb02a84b1924bceb700243511fa91618d07e0
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
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://vkrgfqjsixjsieqzykcx.supabase.co https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev https://*.facebook.com https://*.facebook.net; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://vkrgfqjsixjsieqzykcx.supabase.co wss://vkrgfqjsixjsieqzykcx.supabase.co wss://*.supabase.co https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev https://*.r2.cloudflarestorage.com https://*.facebook.com https://*.facebook.net https://*.run.app https://*.on.aws; frame-src 'self' https://*.facebook.com;"
          }
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
