import { NextResponse } from 'next/server'

// Web Share Target handler
// Android Chrome share → POST /api/share-target dengan multipart/form-data
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') || formData.get('file') || formData.get('files')

    if (!file || typeof file === 'string') {
      const text = formData.get('text') || ''
      const url  = formData.get('url') || ''
      const redirectUrl = new URL('/input', request.url)
      if (text) redirectUrl.searchParams.set('text', text)
      if (url)  redirectUrl.searchParams.set('url', url)
      return NextResponse.redirect(redirectUrl, 303)
    }

    // Ada file — encode base64, simpan di cookie, redirect ke /input?shared=1
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'
    const dataUrl = `data:${mimeType};base64,${base64}`

    const response = NextResponse.redirect(new URL('/input?shared=1', request.url), 303)

    // Cookie limit ~4KB per cookie, foto bisa besar — pakai chunked jika perlu
    // Untuk foto struk rata-rata setelah compress ~50-200KB (base64 ~70-270KB)
    // Ini terlalu besar untuk cookie. Gunakan multiple cookies jika > 3KB.
    const CHUNK_SIZE = 3500 // bytes per cookie (safe limit)
    const chunks = []
    for (let i = 0; i < dataUrl.length; i += CHUNK_SIZE) {
      chunks.push(dataUrl.slice(i, i + CHUNK_SIZE))
    }

    // Simpan jumlah chunk
    response.cookies.set('arvifund-share-chunks', String(chunks.length), {
      maxAge: 120, path: '/', sameSite: 'lax', httpOnly: false, secure: true,
    })

    // Simpan tiap chunk
    chunks.forEach((chunk, i) => {
      response.cookies.set(`arvifund-share-${i}`, chunk, {
        maxAge: 120, path: '/', sameSite: 'lax', httpOnly: false, secure: true,
      })
    })

    return response
  } catch (err) {
    console.error('share-target error:', err)
    return NextResponse.redirect(new URL('/input', request.url), 303)
  }
}
