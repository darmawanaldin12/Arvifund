'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import InputModal from '../modals/InputModal'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
  },
  {
    href: '/expenses',
    label: 'Pengeluaran',
    icon: 'trending_down',
  },
  {
    href: null,
    label: '',
    isAction: true,
  },
  {
    href: '/record',
    label: 'Wallet',
    icon: 'account_balance_wallet',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: 'settings',
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
          if (item.isAction) {
            return (
              <button key="action" onClick={() => setShowInput(true)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '4px 8px', WebkitTapHighlightColor: 'transparent',
              }}>
                <div style={{
                  width: 50, height: 50,
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: -20,
                  boxShadow: '0 4px 16px rgba(0,61,155,0.35)',
                  border: '3px solid var(--bg)',
                }}>
                  <span className="material-symbols-outlined" style={{
                    color: 'white', fontSize: 24,
                    fontVariationSettings: "'FILL' 1"
                  }}>add</span>
                </div>
              </button>
            )
          }
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, textDecoration: 'none', padding: '8px 10px',
              color: active ? 'var(--accent)' : 'var(--text3)',
              WebkitTapHighlightColor: 'transparent',
              minWidth: 52,
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: 22,
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0"
              }}>{item.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                fontFamily: 'inherit',
              }}>{item.label}</span>
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
      `}</style>
    </>
  )
}
