/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost', 'apicp.acubamos.cu', 'control.acubamos.cu'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://apicp.acubamos.cu/api/:path*',
      },
    ]
  },
}

export default nextConfig
