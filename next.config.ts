import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "shop-phinf.pstatic.net",
      },
      {
        protocol: "https",
        hostname: "*.kakaocdn.net",
      },
      {
        protocol: "http",
        hostname: "*.kakaocdn.net",
      },
    ],
  },
};

export default nextConfig;
