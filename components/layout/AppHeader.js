'use client'
import { useState, useEffect } from 'react'
import { useData } from '../DataContext'

export default function AppHeader({ title, subtitle, onRefresh, loading }) {
  const [time, setTime] = useState('')
  const { profile } = useData() || {}

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="app-header">
      {/* Mobile: logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'none' }} className="mobile-logo">
          <img src="/logo.png" alt="Arvifund" style={{ width: 28, height: 28, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 3 }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.2 }}>
            {title || 'Arvifund'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
            {subtitle || time}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onRefresh && (
          <button onClick={onRefresh} style={{
            width: 36, height: 36, background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)',
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 18,
              animation: loading ? 'spin 0.8s linear infinite' : 'none'
            }}>refresh</span>
          </button>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) { .mobile-logo { display: flex !important; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </header>
  )
}
