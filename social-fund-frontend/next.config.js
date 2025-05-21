// next.config.js
// @ts-nocheck

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    reactRoot: true,
    runtime: "nodejs",
  }
};

module.exports = nextConfig;