'use client'
import './tv.css'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { DataProvider } from '../../components/DataContext'
import { saveReturnTo } from '../../lib/returnTo'

// Layout khusus TV: cek login seperti /dashboard, TAPI tanpa useSessionTimeout (auto-logout 1 jam)
// dan tanpa BottomNav — layar presentasi harus tetap menyala dan tidak keluar sendiri.
export default function TvLayout({ children }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    function goToLogin() {
      saveReturnTo('/tv')
      router.replace('/login')
    }
    const timeout = setTimeout(goToLogin, 8000)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout)
        if (!session) goToLogin()
        else setChecking(false)
      })
      .catch(() => { clearTimeout(timeout); goToLogin() })
    return () => clearTimeout(timeout)
  }, [router])

  if (checking) {
    return (
      <div className="tv-root tv-center">
        <p className="tv-loading">Memuat Arvifund TV…</p>
      </div>
    )
  }

  return <DataProvider>{children}</DataProvider>
}
