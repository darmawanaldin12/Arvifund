import './globals.css'

export const metadata = {
  title: 'Arvifund',
  description: 'Personal Finance Tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Arvifund',
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
            document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
            document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
            var lastTouchEnd = 0;
            document.addEventListener('touchend', function(e) {
              var now = Date.now();
              if (now - lastTouchEnd < 300) { e.preventDefault(); }
              lastTouchEnd = now;
            }, { passive: false });
            document.addEventListener('touchmove', function(e) {
              if (e.touches && e.touches.length > 1) { e.preventDefault(); }
            }, { passive: false });
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
