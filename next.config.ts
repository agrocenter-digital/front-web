/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    // Redirige las peticiones /api/* y /actuator/* desde el dominio seguro de Vercel (HTTPS)
    // hacia el backend en la EC2 por HTTP, evitando el error de Mixed Content y el 404 en actuator.
    const backendUrl = (
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://34.201.161.216:8080"
    ).replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/actuator/:path*",
        destination: `${backendUrl}/actuator/:path*`,
      },
    ];
  },
};

export default nextConfig;
