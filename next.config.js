/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Firebase Hosting (uncomment for Firebase deployment)
  // output: 'export',
  // trailingSlash: true,
  // images: {
  //   unoptimized: true
  // },
  
  // Configure Turbopack (Next.js 16+ uses Turbopack by default)
  // Empty config to use default Turbopack behavior
  turbopack: {},
  
  // Configure allowed dev origins for network access
  allowedDevOrigins: ['192.168.20.242:3000', 'localhost:3000'],
  
  // Optimize for production
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Headers for all routes
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
          },
        ],
      },
    ];
  },
  
  // TypeScript configuration for deployment
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig;
