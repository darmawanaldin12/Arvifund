'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { DataProvider } from '../../components/DataContext'
import { useSessionTimeout } from '../../hooks/useSessionTimeout'

const BARS = [
  { color: '#3b82f6', delay: '0s'    },
  { color: '#6366f1', delay: '0.1s'  },
  { color: '#8b5cf6', delay: '0.2s'  },
  { color: '#a78bfa', delay: '0.3s'  },
  { color: '#c4b5fd', delay: '0.4s'  },
]

function AppShell({ children }) {
  useSessionTimeout()
  return (
    <div className="app-shell">
      <div className="app-main">{children}</div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => { router.replace('/login') }, 8000)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout)
        if (!session) router.replace('/login')
        else setChecking(false)
      })
      .catch(() => { clearTimeout(timeout); router.replace('/login') })
    return () => clearTimeout(timeout)
  }, [router])

  if (checking) return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', gap: 32,
    }}>

      {/* Logo */}
      <div style={{
        width: 72, height: 72, background: 'var(--accent)',
        borderRadius: 20, display: 'flex', alignItems: 'center',
        justifyContent: 'center', boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
        animation: 'logoIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <img src="/logo.png" alt="Arvifund"
          style={{ width: 52, height: 52, objectFit: 'contain' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      {/* Bar wave + label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 44 }}>
          {BARS.map((b, i) => (
            <div key={i} style={{
              width: 8, borderRadius: 4,
              background: b.color,
              animation: `barWave 1.1s ease-in-out ${b.delay} infinite`,
            }} />
          ))}
        </div>

        {/* Sliding progress bar */}
        <div style={{
          width: 140, height: 3,
          background: 'var(--surface2)',
          borderRadius: 99, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: '45%', borderRadius: 99,
            background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
            animation: 'ghostSlide 1.5s ease-in-out infinite',
          }} />
        </div>

        <p style={{ color: 'var(--text3)', fontSize: 12, letterSpacing: '0.04em' }}>Memuat Arvifund...</p>
      </div>

      <style>{`
        @keyframes logoIn {
          from { opacity: 0; transform: scale(0.7) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes barWave {
          0%,100% { height: 8px;  opacity: 0.4; }
          50%      { height: 40px; opacity: 1;   }
        }
        @keyframes ghostSlide {
          0%   { margin-left: -45%; }
          100% { margin-left: 100%; }
        }
      `}</style>
    </div>
  )

  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  )
}
