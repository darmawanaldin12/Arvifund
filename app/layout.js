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

export default function RootLayout({ children }) {
  return (
    <html lang="id" style={{ colorScheme: 'dark' }}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arvifund" />
        <meta name="color-scheme" content="dark" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body style={{ background: '#0f172a', colorScheme: 'dark' }}>{children}</body>
    </html>
  )
}
