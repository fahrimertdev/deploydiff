/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: output: "standalone" is intentionally omitted for Vercel deployment.
  // For self-hosted (Docker), add it back.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", ".prisma/client"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/deploydiff-assets/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      {
        // Cloudflare R2 public bucket (if using custom domain)
        protocol: "https",
        hostname: "*.cloudflarestorage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
