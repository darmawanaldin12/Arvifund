'use client'
import { useState, useEffect } from 'react'
import { useData } from '../DataContext'
import { cn } from '../../lib/utils-cn'
import { Button } from '../ui/button'
import { RefreshCw } from 'lucide-react'

export default function AppHeader({ title, subtitle, onRefresh, loading }) {
  const [time, setTime] = useState('')
  const { profile, user, profiles } = useData() || {}

  // Jam WIB
  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        })
      )
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // Ambil nama user yang sedang login
  const currentProfile = profiles?.find(p => p.id === user?.id)
  const username = currentProfile?.username || profile?.username || ''
  const initial  = username?.[0]?.toUpperCase() || '?'

  // Warna avatar — biru untuk Aldin, pink untuk Solikhatun
  const isAldin  = username?.toLowerCase().startsWith('al')
  const avatarBg = isAldin ? 'var(--accent)' : '#db2777'
  const avatarBgLight = isAldin ? 'var(--accent-light)' : 'rgba(219,39,119,0.12)'

  return (
    <header className="app-header" style={{ gap: 0 }}>
      {/* Left: logo (mobile) + title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Logo — mobile only */}
        <div className="hidden max-[767px]:flex items-center shrink-0">
          <img
            src="/logo.png"
            alt="Arvifund"
            className="w-7 h-7 rounded-lg object-contain bg-white p-0.5"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>

        <div className="min-w-0">
          <h1 className="text-[16px] font-bold text-[var(--text1)] leading-tight truncate m-0">
            {title || 'Arvifund'}
          </h1>
          {subtitle ? (
            <div className="text-[11px] text-[var(--text3)]">{subtitle}</div>
          ) : (
            <div className="text-[11px] text-[var(--text3)] tabular-nums">{time} WIB</div>
          )}
        </div>
      </div>

      {/* Right: user chip + refresh */}
      <div className="flex items-center gap-2 shrink-0">

        {/* User identity chip */}
        {username && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px 4px 4px',
              borderRadius: 99,
              background: avatarBgLight,
              border: `1px solid ${isAldin ? 'var(--accent-dim)' : 'rgba(219,39,119,0.25)'}`,
            }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: avatarBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
                letterSpacing: 0,
              }}
            >
              {initial}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: isAldin ? 'var(--accent)' : '#db2777',
                maxWidth: 72,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {username}
            </span>
          </div>
        )}

        {/* Refresh button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            aria-label="Muat ulang data"
            className={cn(
              'w-9 h-9 rounded-lg shrink-0',
              'bg-[var(--surface2)] border-[var(--border)]',
              'text-[var(--text2)] hover:text-[var(--text1)]',
              'hover:bg-[var(--surface3)]',
              'transition-all duration-150',
            )}
          >
            <RefreshCw
              size={16}
              className={cn(
                'transition-transform',
                loading && 'animate-spin',
              )}
            />
          </Button>
        )}
      </div>
    </header>
  )
}
