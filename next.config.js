/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
      domains: [],
    },
    typescript: {
      // Set this to false in production
      ignoreBuildErrors: process.env.NODE_ENV === 'development',
    },
    eslint: {
      // Set this to false in production
      ignoreDuringBuilds: process.env.NODE_ENV === 'development',
    },
    env: {
      // Public environment variables that can be used in the browser
    },
    // Enable experimental app directory
    experimental: {
      appDir: true,
    },

   
  }
  
  module.exports = nextConfig