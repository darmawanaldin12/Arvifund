'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isTvDevice, setTvOverride } from '../../lib/tv'

// Di perangkat TV, /dashboard (tampilan HP) otomatis diarahkan ke /tv (tampilan presentasi).
// Kalau TV tidak terdeteksi (misal APK/PWA tanpa address bar), layar lebar menampilkan tombol
// "Mode TV" yang bisa dipilih dengan remote. Kembali ke tampilan HP: tombol "Mode HP" di /tv.
export default function DashboardTemplate({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [showBtn, setShowBtn] = useState(false)

  useEffect(() => {
    if (pathname !== '/dashboard') return
    if (isTvDevice()) { router.replace('/tv'); return }
    setShowBtn(window.innerWidth >= 900)
  }, [pathname, router])

  function openTv() {
    setTvOverride(true)
    router.push('/tv')
  }

  return (
    <>
      {children}
      {showBtn && pathname === '/dashboard' && (
        <button
          type="button"
          autoFocus
          onClick={openTv}
          style={{
            position: 'fixed', right: 20, bottom: 20, zIndex: 60,
            padding: '12px 20px', borderRadius: 999, border: '2px solid transparent',
            background: 'var(--accent)', color: '#fff', fontFamily: 'inherit',
            fontSize: 16, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#fff' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'transparent' }}
        >
          📺 Mode TV
        </button>
      )}
    </>
  )
}
