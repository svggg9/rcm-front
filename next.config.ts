/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.yandexcloud.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.storage.yandexcloud.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.yandexcloud.net",
        port: "",
        pathname: "/**",
      }
    ],
  },
};

module.exports = nextConfig;
