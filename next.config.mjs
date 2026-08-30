/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate graph mount effects in dev
  serverExternalPackages: ['simple-git'],
};

export default nextConfig;
