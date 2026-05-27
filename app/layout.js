import './globals.css'

export const metadata = {
  title: 'Arvifund',
  description: 'Personal Finance Tracker',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Arvifund',
  },
}

// Script ini jalan sebelum render untuk cegah flash of wrong theme
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('arvifund-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', t);
    } catch(e) {}
  })();
`

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arvifund" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Anti-flash theme script */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
