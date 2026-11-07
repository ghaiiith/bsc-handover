import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:locale(ar|en)/home',
        destination: '/:locale',
        permanent: false,
      },
      {
        source: '/:locale(ar|en)/admin/coupons',
        destination: '/:locale/admin/discounts',
        permanent: true,
      },
      {
        source: '/admin/coupons',
        destination: '/ar/admin/discounts',
        permanent: true,
      },
    ]
  },
  experimental: {
    // Report BS-28: barrel imports (lucide-react, framer-motion, …) pulled whole
    // libraries into the first load. This rewrites them to per-module imports.
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      'recharts',
      'sonner',
      '@base-ui-components/react',
    ],
    serverActions: {
      // Server Actions only handle form/JSON submissions here; large video uploads
      // go directly to Cloudflare R2 via presigned multipart URLs (see
      // src/lib/storage), which are not governed by this limit. Keep this modest
      // to avoid a payload-DoS vector.
      bodySizeLimit: '10mb',
    },
    // Disabled: caused corrupted .next/dev/types/routes.d.ts and widespread 404s
    // (e.g. /instructor, /login) after incremental route changes in dev.
    // turbopackFileSystemCacheForDev: true,
  },
  images: {
    // Report BS-28: serve modern formats and cache the optimised output for a
    // day — course thumbnails and avatars are the heaviest assets on a listing.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    // Report BS-28: NEXT_PUBLIC_SUPABASE_URL is baked at build time.
    // Next.js 16 SSRF guard rejects upstream fetches when DNS resolves to private
    // or NAT64 addresses. Supabase public storage hostnames can hit this on some
    // networks even though remotePatterns already limits allowed hostnames.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      // Self-hosted Supabase is served under /supabase on the app domain, so
      // storage public URLs look like
      // https://<app-host>/supabase/storage/v1/object/public/<bucket>/...
      // Without this, next/image rejects the upstream and service portfolio
      // images render as broken placeholders (report BS-21).
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? (() => {
            try {
              const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
              return [
                {
                  protocol: u.protocol.replace(':', '') as 'http' | 'https',
                  hostname: u.hostname,
                  pathname: `${u.pathname.replace(/\/$/, '')}/storage/v1/object/public/**`,
                },
              ]
            } catch {
              return []
            }
          })()
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // frame-ancestors is the modern, multi-origin clickjacking control
          // (supersedes X-Frame-Options); object-src/base-uri are safe hardening.
          // Deliberately no script-src restriction so Next.js inline runtime keeps working.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), usb=(), payment=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      // Supabase checks process.version behind runtime guards; safe in Edge middleware.
      {
        module: /node_modules\/@supabase\/supabase-js/,
        message: /Edge Runtime/,
      },
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Edge Runtime/,
      },
      // Large locale JSON from next-intl — harmless webpack cache advisory.
      { message: /Serializing big strings/ },
    ]
    return config
  },
}

export default withNextIntl(nextConfig)
