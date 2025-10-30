// next.config.ts
import type { NextConfig } from "next";

const repo = "boston-diagramm-of-academy-it";

const isProd = process.env.NODE_ENV === "production";
const config: NextConfig = {
  output: "export",
  basePath: isProd ? `/${repo}` : undefined,
  assetPrefix: isProd ? `/${repo}/` : undefined,
};

export default config;
