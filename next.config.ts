// next.config.ts
import type { NextConfig } from "next";

const repo = "YOUR_REPO_NAME"; // <— имя вашего репозитория

const isProd = process.env.NODE_ENV === "production";
const config: NextConfig = {
  output: "export",
  // НУЖНО для Project Pages: https://username.github.io/<repo>/
  basePath: isProd ? `/${repo}` : undefined,
  assetPrefix: isProd ? `/${repo}/` : undefined,
};

export default config;
