'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
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
    accentVar: '--red',
    accentAlpha: 'rgba(var(--red-rgb, 248 113 113) / 0.15)',
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
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        // Glass effect: semi-transparent + blur
        background: 'rgba(var(--surface-rgb, 18 18 28) / 0.75)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Subtle top glow line
        boxShadow: '0 -1px 0 0 rgba(255,255,255,0.04), 0 -8px 32px rgba(0,0,0,0.3)',
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
                      ? 'rgba(255,255,255,0.06)'
                      : 'var(--accent)',
                    boxShadow: isInputActive
                      ? 'inset 0 0 0 1.5px var(--accent)'
                      : '0 4px 18px color-mix(in srgb, var(--accent) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)',
                  }}
                  onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.88)' }}
                  onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.88)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
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

          // Per-item accent (Keluar = red, others = accent)
          const pillColor  = item.accentVar  ? `var(${item.accentVar})`  : 'var(--accent)'
          const pillBg     = item.accentAlpha ? item.accentAlpha : 'color-mix(in srgb, var(--accent) 15%, transparent)'

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-[4px] relative py-1 no-underline"
              style={{
                color: isActive ? pillColor : 'var(--text3)',
                transition: 'color 0.2s',
                minHeight: 44,
                touchAction: 'manipulation',
              }}
            >
              {/* Animated pill indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    key="pill"
                    layoutId={`nav-pill-${item.href}`}
                    initial={{ opacity: 0, scaleX: 0.6, scaleY: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleX: 0.6, scaleY: 0.8 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: '4px 6px',
                      borderRadius: 12,
                      background: pillBg,
                      border: `1px solid color-mix(in srgb, ${pillColor} 25%, transparent)`,
                      zIndex: 0,
                      transformOrigin: 'center',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.span
                className="relative z-10 flex items-center justify-center"
                animate={{
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              >
                {isActive ? item.activeIcon : item.icon}
              </motion.span>

              {/* Label */}
              <span
                className="relative z-10 leading-none tracking-wide whitespace-nowrap"
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'font-weight 0.15s, opacity 0.2s',
                  opacity: isActive ? 1 : 0.6,
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
