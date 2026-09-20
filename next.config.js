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
          destination: '/kds/',
        },
        {
          source: '/kitchen/',
          destination: '/kds/',
        },
      ],
    }
  },
}

module.exports = nextConfig
