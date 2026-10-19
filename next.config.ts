/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/checkout/result/:orderId([1-9]\\d*)",
        destination: "/account?tab=orders&orderId=:orderId",
        permanent: false,
      },
      {
        source: "/checkout/result",
        has: [{ type: "query", key: "orderId", value: "(?<orderId>[1-9]\\d*)" }],
        destination: "/account?tab=orders&orderId=:orderId",
        permanent: false,
      },
      { source: "/checkout/result", destination: "/account?tab=orders", permanent: false },
    ];
  },
  // Isolated navigation test server must not lock the developer's .next/dev.
  distDir: process.env.RCM_TEST_DIST_DIR || ".next",
  images: {
    // Development only: the local seed and image namespaces uploaded by the backend.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development" && process.env.RCM_LOCAL_CATALOG_IMAGES === "true",
    remotePatterns: [
      ...(process.env.NODE_ENV === "development" && process.env.RCM_LOCAL_CATALOG_IMAGES === "true" ? [
        "catalog-v1", "products", "brands", "storefront",
      ].map((folder) => ({
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: `/rcm-windows-local/${folder}/**`,
        search: "",
      })) : []),
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
