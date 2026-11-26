import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit は実行時に自身のデータファイルを読み込むため、バンドルせずに使う
  serverExternalPackages: ["pdfkit"],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // データ印（PNG、最大 1MB。spec.md 6）とフォーム項目を合わせて送れるようにする
      bodySizeLimit: "2mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
