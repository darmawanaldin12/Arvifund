// Arvifund Service Worker
const CACHE_NAME = 'arvifund-v1';
const SHARE_TARGET_CACHE = 'arvifund-share-images';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle fetch: intercept share-target POST
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept POST ke /api/share-target
  if (url.pathname === '/api/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Semua request lain: network first
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') || formData.get('file') || formData.get('files');

    if (imageFile && typeof imageFile !== 'string') {
      // Simpan file di Cache Storage sementara
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = bufferToBase64(arrayBuffer);
      const mimeType = imageFile.type || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Simpan ke cache dengan key tetap
      const cache = await caches.open(SHARE_TARGET_CACHE);
      const response = new Response(JSON.stringify({ dataUrl, timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put('/share-image-pending', response);
    }

    // Redirect ke halaman input
    return Response.redirect('/input?shared=1', 303);
  } catch (err) {
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
