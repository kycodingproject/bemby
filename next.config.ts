import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Price-list photos and PDFs are sent to a server action (Vercel's own limit is 4.5 MB).
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
