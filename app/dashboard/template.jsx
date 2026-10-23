'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isTvDevice } from '../../lib/tv'

// Di perangkat TV, /dashboard (tampilan HP) otomatis diarahkan ke /tv (tampilan presentasi).
// Kembali ke tampilan HP: buka /dashboard?tv=0
export default function DashboardTemplate({ children }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/dashboard' && isTvDevice()) router.replace('/tv')
  }, [pathname, router])

  return children
}
