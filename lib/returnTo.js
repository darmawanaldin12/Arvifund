// Helper: simpan & baca URL tujuan setelah login/biometric
const KEY = 'arvifund_return_to'

export function saveReturnTo(path) {
  if (typeof window === 'undefined') return
  // Jangan simpan halaman login/auth sendiri
  if (!path || path.startsWith('/login') || path.startsWith('/reset-password') || path === '/') return
  try { sessionStorage.setItem(KEY, path) } catch (_) {}
}

export function popReturnTo(fallback = '/dashboard') {
  if (typeof window === 'undefined') return fallback
  try {
    const val = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return val || fallback
  } catch (_) { return fallback }
}
