// Arvifund Service Worker v2
const SHARE_TARGET_CACHE = 'arvifund-share-images-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Hapus semua cache lama
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHARE_TARGET_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  );
});

// HANYA intercept POST ke /api/share-target
// Semua request lain dibiarkan lewat langsung ke network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/api/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
  // Tidak ada else — request lain tidak di-intercept sama sekali
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const imageFile =
      formData.get('image') ||
      formData.get('file') ||
      formData.get('files');

    if (imageFile && typeof imageFile !== 'string') {
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
    }

    return Response.redirect('/input?shared=1', 303);
  } catch {
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
