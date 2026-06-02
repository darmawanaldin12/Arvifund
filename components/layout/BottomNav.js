'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import InputModal from '../modals/InputModal'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
    iconFill: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/transaksi',
    label: 'Transaksi',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
      </svg>
    ),
    iconFill: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
      </svg>
    ),
  },
  { isAction: true },
  {
    href: '/record',
    label: 'Wallet',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
        <circle cx="17" cy="15" r="1" fill="currentColor"/>
      </svg>
    ),
    iconFill: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
        <circle cx="17" cy="15" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    ),
    iconFill: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showInput, setShowInput] = useState(false)

  return (
    <>
      <nav style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(64px + env(safe-area-inset-bottom))',
      }} className="bottom-nav">

        {NAV_ITEMS.map((item, idx) => {
          // ── FAB tombol + di tengah ──
          if (item.isAction) {
            return (
              <button key="action" onClick={() => setShowInput(true)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '4px 8px', WebkitTapHighlightColor: 'transparent',
              }}>
                <div style={{
                  width: 52, height: 52,
                  background: 'linear-gradient(135deg, var(--accent), #60a5fa)',
                  borderRadius: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: -22,
                  boxShadow: '0 6px 20px rgba(56,189,248,0.4)',
                  border: '3px solid var(--bg)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
              </button>
            )
          }

          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : item.href === '/transaksi'
              ? (pathname.startsWith('/transaksi') || pathname.startsWith('/expenses') || pathname.startsWith('/income'))
              : pathname?.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, textDecoration: 'none', padding: '8px 10px',
              color: active ? 'var(--accent)' : 'var(--text3)',
              WebkitTapHighlightColor: 'transparent',
              minWidth: 52, position: 'relative',
              transition: 'color 0.18s ease',
            }}>
              {/* Active indicator dot */}
              {active && (
                <span style={{
                  position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)',
                }} />
              )}
              {/* Icon container dengan background saat active */}
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 28, borderRadius: 10,
                background: active ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                transition: 'background 0.18s ease',
              }}>
                {active ? item.iconFill : item.icon}
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, fontFamily: 'inherit' }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {showInput && (
        <InputModal
          onClose={() => setShowInput(false)}
          onSuccess={() => setShowInput(false)}
        />
      )}

      <style>{`
        @media (max-width: 767px) {
          .bottom-nav { display: flex !important; }
        }
        .bottom-nav a:active span:last-child,
        .bottom-nav button:active div {
          transform: scale(0.9);
        }
      `}</style>
    </>
  )
}
