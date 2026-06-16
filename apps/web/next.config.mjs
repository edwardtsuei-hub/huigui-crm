/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  output: "standalone",
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
