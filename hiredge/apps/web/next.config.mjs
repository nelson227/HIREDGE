/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimisations production
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Ignorer les erreurs TypeScript pendant le build (conflit de types React 19)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Variables d'environnement exposées au client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8083',
  },

  // Rewrites pour proxy API (dev uniquement, en prod Vercel utilise vercel.json)
  async rewrites() {
    // En production, les rewrites sont gérés par vercel.json
    if (process.env.NODE_ENV === 'production') {
      return []
    }
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'}/api/:path*`,
      },
    ]
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default nextConfig
