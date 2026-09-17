/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          destination: '/index.html',
        },
        {
          source: '/kitchen',
          destination: '/kitchen/index.html',
        },
        {
          source: '/kitchen/',
          destination: '/kitchen/index.html',
        },
      ],
    }
  },
}

module.exports = nextConfig
