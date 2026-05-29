'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { DataProvider } from '../../components/DataContext'
import BottomNav from '../../components/layout/BottomNav'
import Sidebar from '../../components/layout/Sidebar'
import { useSessionTimeout } from '../../hooks/useSessionTimeout'

function AppShell({ children }) {
  useSessionTimeout()
  return (
    <div className="app-shell">
      {/* Sidebar - desktop only */}
      <div className="app-sidebar-wrap">
        <Sidebar />
      </div>
      {/* Main */}
      <div className="app-main">
        {children}
      </div>
      {/* Bottom Nav - mobile only */}
      <BottomNav />
    </div>
  )
}

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
      else setChecking(false)
    })
  }, [router])

  if (checking) return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, background: 'var(--accent)',
          borderRadius: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 12px',
          animation: 'pulse 1.5s ease infinite',
        }}>
          <img src="/logo.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain', padding: 4 }} />
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>Memuat...</p>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )

  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  )
}
