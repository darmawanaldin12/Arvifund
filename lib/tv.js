// Deteksi mode TV (Android TV / Smart TV) + override manual.
//  - ?tv=1  → paksa mode TV (disimpan di perangkat)
//  - ?tv=0  → paksa mode HP/PC (disimpan di perangkat)
//  - tanpa parameter → pakai pilihan tersimpan, kalau belum ada → tebak dari perangkat
const KEY = 'arvifund:tv-mode'

export function getTvOverride() {
  try {
    const v = localStorage.getItem(KEY)
    if (v === '1') return true
    if (v === '0') return false
  } catch (_) {}
  return null
}

export function setTvOverride(on) {
  try {
    if (on === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, on ? '1' : '0')
  } catch (_) {}
}

const TV_UA = /(SMART-?TV|Tizen|Web0S|WebOS|BRAVIA|AFT[A-Z]+|Android ?TV|Google ?TV|GoogleTV|CrKey|HbbTV|NetCast|AppleTV|MIBOX|MITV|SHIELD Android TV|VIDAA|Hisense|Philips)/i

export function isTvDevice() {
  if (typeof window === 'undefined') return false

  const q = new URLSearchParams(window.location.search).get('tv')
  if (q === '1' || q === '0') {
    setTvOverride(q === '1')
    return q === '1'
  }

  const saved = getTvOverride()
  if (saved !== null) return saved

  const ua = navigator.userAgent || ''
  if (TV_UA.test(ua)) return true

  // Tidak ada perangkat penunjuk sama sekali (hanya remote) → TV
  try {
    if (window.matchMedia?.('(pointer: none)').matches) return true
  } catch (_) {}

  // Android tanpa layar sentuh dan layar lebar → hampir pasti Android TV / TV box
  // (berlaku juga untuk APK/WebView, yang user agent-nya sering tidak menyebut TV)
  const isAndroid = /Android/i.test(ua)
  const noTouch = (navigator.maxTouchPoints || 0) === 0
  const wide = Math.max(window.screen?.width || 0, window.screen?.height || 0) >= 960
  return isAndroid && noTouch && wide
}
