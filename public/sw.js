// Arvifund Service Worker v6
// Bump versi ini setiap kali ada perubahan SW agar browser update otomatis
const SW_VERSION = 'v6';
const SHARE_TARGET_CACHE = 'arvifund-share-images-v4';
// TTL cache share image: 30 menit (cukup untuk biometric + redirect)
const SHARE_IMAGE_TTL_MS = 30 * 60 * 1000;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHARE_TARGET_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] Activated:', SW_VERSION);
      return clients.claim();
    })
  );
});

// HANYA intercept POST ke /api/share-target
// Semua request lain dibiarkan lewat ke network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/api/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
  // Tidak ada else — request lain tidak di-intercept
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const imageFile =
      formData.get('image') ||
      formData.get('file') ||
      formData.get('files');

    if (imageFile && typeof imageFile !== 'string') {
      // Gambar diterima — simpan ke Cache API
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = bufferToBase64(arrayBuffer);
      const mimeType = imageFile.type || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const cache = await caches.open(SHARE_TARGET_CACHE);
      await cache.put(
        '/share-image-pending',
        new Response(JSON.stringify({ dataUrl, timestamp: Date.now() }), {
          headers: { 'Content-Type': 'application/json' },
        })
      );

      return Response.redirect('/input?shared=1', 303);
    }

    // Tidak ada gambar — cek teks/url dari formData
    const text = formData.get('text') || '';
    const url  = formData.get('url')  || '';
    const redirectUrl = new URL('/input', self.location.origin);
    if (text) redirectUrl.searchParams.set('text', text);
    if (url)  redirectUrl.searchParams.set('url',  url);
    return Response.redirect(redirectUrl.toString(), 303);

  } catch (err) {
    console.error('[SW] share-target error:', err);
    return Response.redirect('/input', 303);
  }
}

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── WEB PUSH: notifikasi pengingat "belum catat transaksi" ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Arvifund', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Arvifund';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'arvifund-reminder', // notifikasi baru menggantikan yang lama, tidak menumpuk
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
