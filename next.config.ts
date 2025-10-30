import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 本番ビルド時に ESLint エラーで失敗させない
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
