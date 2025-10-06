/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'empoweringatt.ddns.net',
        port: '4070',
        pathname: '/**',
      },
    ],
  },
  
};

module.exports = nextConfig;
