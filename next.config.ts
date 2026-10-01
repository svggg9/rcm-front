/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isolated navigation test server must not lock the developer's .next/dev.
  distDir: process.env.RCM_TEST_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.yandexcloud.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.yandexcloud.net",
        pathname: "/**",
      }
    ],
  },
};

module.exports = nextConfig;
