import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true, // Enable gzip/brotli compression
  
  images: {
    remotePatterns: [
      // Supabase storage removed — images now served from R2 and assets.nyvara.com
      {
        // Cloudflare R2 public development URL
        protocol: 'https',
        hostname: 'pub-96ecbfcde03642529999eddf062d31f5.r2.dev',
        pathname: '/**',
      },
      {
        // Cloudflare R2 / CDN custom domain (production)
        protocol: 'https',
        hostname: 'assets.nyvara.com',
        pathname: '/**',
      },
    ],
    // Image optimization settings
    formats: ['image/avif', 'image/webp'], // Modern formats
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images for 1 hour in dev — prevents hammering R2
    // on every request and stops the timeout/retry CPU loop.
    minimumCacheTTL: 3600,
  },

  experimental: {
    optimizePackageImports: ['lucide-react'], // Tree-shake unused icons
  },

  // HTTP Caching headers
  async headers() {
    return [
      // ── Meta catalog feed: open to all crawlers (no CSP, no frame restrictions) ──
      {
        source: '/api/meta/feed',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          // Remove X-Frame-Options for this route so Meta crawler is not blocked
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
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
      // Security headers for all other routes
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
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: http://*.sslip.io https://*.sslip.io ${process.env.NEXT_PUBLIC_API_URL || ''} https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev https://assets.nyvara.com https://*.facebook.com https://*.facebook.net https://*.fbcdn.net; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:* ws://localhost:* http://*.sslip.io https://*.sslip.io ws://*.sslip.io wss://*.sslip.io ${process.env.NEXT_PUBLIC_API_URL || ''} https://pub-96ecbfcde03642529999eddf062d31f5.r2.dev https://*.r2.cloudflarestorage.com https://assets.nyvara.com https://*.facebook.com https://*.facebook.net https://*.fbcdn.net https://*.run.app https://*.on.aws; frame-src 'self' https://*.facebook.com;`
          }
        ],
      },
    ];
  },

  // No rewrites needed — removed no-op /api/* → /api/* rule that added overhead
};

export default nextConfig;
