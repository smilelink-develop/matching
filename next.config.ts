import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse とその依存先 (pdfjs-dist) はバンドルせず Node.js 側で resolve させる。
  // バンドラに含めると "Cannot find module pdf.worker.mjs" や ENOENT が出るため。
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
