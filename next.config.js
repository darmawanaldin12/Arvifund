/** @type {import('next').NextConfig} */

// Header keamanan dasar. Sengaja tanpa Content-Security-Policy karena CSP yang terlalu
// ketat bisa merusak Next.js/PWA/web-push — tambahkan nanti setelah diuji.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // microphone dipakai input suara, camera dipakai ambil foto struk
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

module.exports = nextConfig
