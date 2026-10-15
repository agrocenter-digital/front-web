/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    // Permite actuar como proxy inverso desde Vercel hacia la EC2 de AWS Academy
    // evitando bloqueos de "Mixed Content" (HTTPS en Vercel -> HTTP en IP de EC2).
    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!backendUrl) {
      return [];
    }

    const cleanBackendUrl = backendUrl.replace(/\/$/, "");
    return [
      {
        source: "/api/bff/:path*",
        destination: `${cleanBackendUrl}/api/bff/:path*`,
      },
    ];
  },
};

export default nextConfig;
