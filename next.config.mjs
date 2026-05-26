/** @type {import('next').NextConfig} */
const nextConfig = {
  // Netlify usa @netlify/plugin-nextjs que suporta SSR completo.
  // NÃO usar output:'export' — perde API routes, middleware e SSR.

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

  // Leaflet e leaflet.markercluster usam `window`/`document` — não têm
  // suporte a SSR. O webpack precisa de ignorar fs/path no bundle cliente.
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
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
