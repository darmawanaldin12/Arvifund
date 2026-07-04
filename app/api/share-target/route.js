import { NextResponse } from 'next/server'

// Catatan: idealnya POST Web Share Target di-intercept oleh Service Worker
// (public/sw.js) sebelum request ini sampai ke server. SW menyimpan gambar
// ke Cache API lalu redirect ke /input?shared=1.
//
// File ini adalah fallback untuk kondisi SW belum aktif/belum "claim" tab
// (misal kunjungan pertama setelah install, atau abis update SW). Sebelumnya
// fallback ini hanya meneruskan text/url dan MEMBUANG gambarnya. Sekarang
// gambar tetap disimpan lewat trik yang sama seperti SW: Cache API — bedanya
// ditulis dari script di halaman HTML (bukan dari service worker), karena
// Cache Storage adalah API level origin, bisa diakses dari context window
// juga. Key & nama cache-nya SENGAJA disamakan dengan public/sw.js dan
// components/input/useAIExtract.js supaya kompatibel tanpa ubah apapun di
// sisi client.
const SHARE_CACHE_NAME = 'arvifund-share-images-v4'
const SHARE_CACHE_KEY  = '/share-image-pending'

function escapeForScript(str) {
  return str.replace(/</g, '\\u003C')
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const text = formData.get('text') || ''
    const url  = formData.get('url')  || ''
    const imageFile =
      formData.get('image') ||
      formData.get('file') ||
      formData.get('files')

    if (imageFile && typeof imageFile !== 'string') {
      const arrayBuffer = await imageFile.arrayBuffer()
      const base64   = Buffer.from(arrayBuffer).toString('base64')
      const mimeType = imageFile.type || 'image/jpeg'
      const dataUrl  = `data:${mimeType};base64,${base64}`

      const payload = JSON.stringify({ dataUrl, timestamp: Date.now() })

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Arvifund</title></head>
<body>
<script>
(async () => {
  try {
    const cache = await caches.open(${JSON.stringify(SHARE_CACHE_NAME)});
    await cache.put(
      ${JSON.stringify(SHARE_CACHE_KEY)},
      new Response(${JSON.stringify(escapeForScript(payload))}, { headers: { 'Content-Type': 'application/json' } })
    );
  } catch (e) {
    console.error('[ShareFallback] Gagal simpan cache:', e);
  }
  location.replace('/input?shared=1');
})();
</script>
</body></html>`

      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const redirectUrl = new URL('/input', request.url)
    if (text) redirectUrl.searchParams.set('text', text)
    if (url)  redirectUrl.searchParams.set('url',  url)

    return NextResponse.redirect(redirectUrl, 303)
  } catch {
    return NextResponse.redirect(new URL('/input', request.url), 303)
  }
}
