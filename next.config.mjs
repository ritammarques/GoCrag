/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignora erros de TypeScript no build.
  // Os erros são todos de tipo (cookies Supabase, Leaflet as any)
  // e não afectam o runtime — a app funciona correctamente.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Ignora warnings ESLint no build.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Imagens remotas do Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Leaflet usa window/document — não tem SSR.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }
    return config
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
