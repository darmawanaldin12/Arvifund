import { NextResponse } from 'next/server'

// Catatan: handler POST untuk Web Share Target TIDAK diproses di sini.
// Service Worker (public/sw.js) intercept POST /api/share-target sebelum
// request ini sampai ke server. SW menyimpan gambar ke Cache API lalu
// redirect ke /input?shared=1. File ini hanya sebagai fallback jika SW
// belum aktif (misal kunjungan pertama setelah install).
export async function POST(request) {
  try {
    const formData = await request.formData()
    const text = formData.get('text') || ''
    const url  = formData.get('url')  || ''

    const redirectUrl = new URL('/input', request.url)
    if (text) redirectUrl.searchParams.set('text', text)
    if (url)  redirectUrl.searchParams.set('url',  url)

    return NextResponse.redirect(redirectUrl, 303)
  } catch {
    return NextResponse.redirect(new URL('/input', request.url), 303)
  }
}
