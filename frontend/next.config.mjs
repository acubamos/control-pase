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
  
  // AÑADE ESTA NUEVA SECCIÓN para desactivar verificación SSL solo en desarrollo
  webpack: (config, { isServer, dev }) => {
    // Desactivar verificación de certificados SSL solo en desarrollo
    if (dev) {
      console.log('⚠️  Modo desarrollo: Desactivando verificación SSL');
      process.env.NODE_TLS_REJECT_UUTHORIZED = '0';
    }
    
    return config;
  },
}

export default nextConfig;
