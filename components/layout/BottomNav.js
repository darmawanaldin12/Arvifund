'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../../lib/utils-cn'
import InputModal from '../modals/InputModal'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Keluar',
    activeColor: 'text-red-400',
    activeBg: 'bg-red-500/10',
    activeDot: 'bg-red-400',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    ),
  },
  null, // FAB slot
  {
    href: '/record',
    label: 'Wallet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2"/><path d="M2 10h20"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showInput, setShowInput] = useState(false)

  return (
    <>
      <nav className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'bg-[var(--surface)] border-t border-[var(--border)]',
        'backdrop-blur-xl',
        'pb-[env(safe-area-inset-bottom)]',
      )}>
        <div className="flex items-stretch justify-around h-[60px] px-2">
          {NAV_ITEMS.map((item, idx) => {
            // FAB slot
            if (item === null) {
              return (
                <div key="fab" className="flex-1 flex items-center justify-center">
                  <button
                    onClick={() => setShowInput(v => !v)}
                    aria-label="Input Transaksi"
                    className={cn(
                      'w-[50px] h-[50px] rounded-2xl mb-2.5',
                      'flex items-center justify-center',
                      'transition-all duration-150 active:scale-90',
                      'shadow-[0_4px_16px_color-mix(in_srgb,var(--accent)_45%,transparent)]',
                      showInput
                        ? 'bg-[var(--red)] shadow-[0_4px_16px_color-mix(in_srgb,var(--red)_45%,transparent)]'
                        : 'bg-[var(--accent)]',
                    )}
                  >
                    <svg
                      width="24" height="24" viewBox="0 0 24 24"
                      fill="none" stroke="white" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      className={cn('transition-transform duration-250', showInput && 'rotate-45')}
                    >
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>
              )
            }

            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

            const activeColor = item.activeColor || 'text-[var(--accent)]'
            const activeBg    = item.activeBg    || 'bg-[var(--accent)]/10'
            const activeDot   = item.activeDot   || 'bg-[var(--accent)]'

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-[3px]',
                  'relative px-1 py-1.5 rounded-xl',
                  'transition-colors duration-150',
                  '-webkit-tap-highlight-color-transparent',
                  'no-underline',
                  isActive ? activeColor : 'text-[var(--text3)] hover:text-[var(--text1)]',
                )}
              >
                {/* Active dot */}
                <span className={cn(
                  'absolute top-1 left-1/2 -translate-x-1/2',
                  'w-1 h-1 rounded-full transition-opacity duration-150',
                  activeDot,
                  isActive ? 'opacity-100' : 'opacity-0',
                )} />

                {/* Icon wrap */}
                <span className={cn(
                  'flex items-center justify-center w-10 h-7 rounded-lg',
                  'transition-all duration-150 active:scale-90',
                  isActive && activeBg,
                )}>
                  {item.icon}
                </span>

                <span className="text-[10px] font-medium leading-none tracking-[0.01em] whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {showInput && (
        <InputModal
          onClose={() => setShowInput(false)}
          onSuccess={() => setShowInput(false)}
        />
      )}
    </>
  )
}
