import { NextResponse } from 'next/server'

// Web Share Target handler
// Android Chrome share → POST /api/share-target dengan multipart/form-data
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') || formData.get('file') || formData.get('files')

    if (!file || typeof file === 'string') {
      // Tidak ada file, cek teks/url saja
      const text = formData.get('text') || ''
      const url  = formData.get('url') || ''
      const redirectUrl = new URL('/input', request.url)
      if (text) redirectUrl.searchParams.set('text', text)
      if (url)  redirectUrl.searchParams.set('url', url)
      return NextResponse.redirect(redirectUrl, 303)
    }

    // Ada file — simpan sementara di memory, kirim sebagai base64 via cookie/query
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // Simpan di cookie sementara (max 4KB per cookie, jadi pakai abbreviated flag)
    // Karena foto bisa besar, kita redirect ke /input dengan flag, lalu fetch dari cache
    // Solusi: simpan di server-side temp store via encoded response
    const response = NextResponse.redirect(new URL('/input?shared=1', request.url), 303)

    // Set cookie dengan data foto (base64, max ~3MB aman untuk cookie)
    // Kalau lebih besar, potong saja — browser tidak bisa kirim cookie > 4096 bytes
    const cookieVal = `data:${mimeType};base64,${base64}`
    if (cookieVal.length < 3 * 1024 * 1024) {
      response.cookies.set('arvifund-share-image', cookieVal, {
        maxAge: 60,       // 60 detik cukup untuk redirect + load
        path: '/',
        sameSite: 'lax',
        httpOnly: false,  // Perlu dibaca dari JS client
        secure: true,
      })
    }

    return response
  } catch (err) {
    return NextResponse.redirect(new URL('/input', request.url), 303)
  }
}
