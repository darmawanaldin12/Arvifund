import './globals.css'

export const metadata = {
  title: 'Arvifund',
  description: 'Personal Finance Tracker',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Arvifund" />
        <meta name="theme-color" content="#f9f9ff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        {/* Block pinch-zoom & double-tap zoom on iOS — viewport meta alone is not enough */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Block pinch-to-zoom (gesturestart / gesturechange)
            document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
            document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
            document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });

            // Block double-tap zoom via touchend timing
            var lastTouchEnd = 0;
            document.addEventListener('touchend', function(e) {
              var now = Date.now();
              if (now - lastTouchEnd < 300) {
                e.preventDefault();
              }
              lastTouchEnd = now;
            }, { passive: false });

            // Block multi-touch pinch via touchmove
            document.addEventListener('touchmove', function(e) {
              if (e.touches && e.touches.length > 1) {
                e.preventDefault();
              }
            }, { passive: false });
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
