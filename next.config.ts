/** @type {import('next').NextConfig} */
const nextConfig = {
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
      },
    ],
  },
};

module.exports = nextConfig;