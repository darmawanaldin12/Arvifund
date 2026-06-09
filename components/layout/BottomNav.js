'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../../lib/utils-cn'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Keluar',
    activeColor: 'text-[var(--red)]',
    activeBg: 'bg-[var(--red-bg)]',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    ),
  },
  null, // FAB slot
  {
    href: '/wallet',
    label: 'Wallet',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
        <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
        <circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
      )}
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-stretch justify-around" style={{ height: 60, paddingInline: 4 }}>
        {NAV_ITEMS.map((item, idx) => {

          // ── FAB (center) ──
          if (item === null) {
            const isInputActive = pathname === '/input'
            return (
              <div key="fab" className="flex-1 flex items-center justify-center">
                <Link
                  href="/input"
                  aria-label="Tambah Transaksi"
                  className="flex items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    marginBottom: 10,
                    flexShrink: 0,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    background: isInputActive
                      ? 'var(--surface2)'
                      : 'var(--accent)',
                    boxShadow: isInputActive
                      ? 'none'
                      : '0 4px 14px color-mix(in srgb, var(--accent) 40%, transparent)',
                    outline: isInputActive ? '2px solid var(--accent)' : 'none',
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.90)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.90)' }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <svg
                    width="22" height="22"
                    viewBox="0 0 24 24" fill="none"
                    stroke={isInputActive ? 'var(--accent)' : 'white'}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </Link>
              </div>
            )
          }

          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href) ||
              (item.href === '/wallet' && pathname.startsWith('/record'))

          const activeColor = item.activeColor || 'text-[var(--accent)]'
          const activeBg    = item.activeBg    || 'bg-[var(--accent-light)]'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-[4px]',
                'relative py-1 rounded-xl no-underline',
                'transition-colors duration-200',
                isActive ? activeColor : 'text-[var(--text3)] hover:text-[var(--text2)]',
              )}
              style={{ touchAction: 'manipulation', minHeight: 44 }}
            >
              {/* Active pill background */}
              <span
                className={cn(
                  'absolute inset-x-1.5 rounded-xl',
                  'transition-opacity duration-200',
                  activeBg,
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
                style={{ top: 4, bottom: 4 }}
                aria-hidden="true"
              />

              {/* Icon */}
              <span
                className="relative z-10 flex items-center justify-center"
                style={{
                  transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {isActive ? item.activeIcon : item.icon}
              </span>

              {/* Label */}
              <span
                className="relative z-10 leading-none tracking-wide whitespace-nowrap"
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'font-weight 0.15s',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
