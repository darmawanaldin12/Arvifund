'use client'
import { useState, useEffect } from 'react'
import { useData } from '../DataContext'
import { cn } from '../../lib/utils-cn'
import { Button } from '../ui/button'

export default function AppHeader({ title, subtitle, onRefresh, loading }) {
  const [time, setTime] = useState('')
  const { profile } = useData() || {}

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="app-header">
      {/* Left: logo (mobile) + title */}
      <div className="flex items-center gap-2.5">
        {/* Logo — mobile only */}
        <div className="hidden max-[767px]:flex items-center shrink-0">
          <img
            src="/logo.png"
            alt="Arvifund"
            className="w-7 h-7 rounded-lg object-contain bg-white p-0.5"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>

        <div>
          <div className="text-[16px] font-bold text-[var(--text1)] leading-tight">
            {title || 'Arvifund'}
          </div>
          <div className="text-[11px] text-[var(--text3)] tabular-nums">
            {subtitle || time}
          </div>
        </div>
      </div>

      {/* Right: refresh button */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className={cn(
              'w-9 h-9 rounded-lg shrink-0',
              'bg-[var(--surface2)] border-[var(--border)]',
              'text-[var(--text2)] hover:text-[var(--text1)]',
              'hover:bg-[var(--surface3)]',
              'transition-all duration-150',
            )}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                animation: loading ? 'spin 0.8s linear infinite' : 'none',
                display: 'block',
              }}
            >
              refresh
            </span>
          </Button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </header>
  )
}
