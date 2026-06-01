'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Overview',  icon: 'dashboard' },
  { href: '/record',     label: 'Wallet',    icon: 'account_balance_wallet' },
  { href: null,          label: '',          isAction: true },
  { href: '/expenses',   label: 'Keluar',    icon: 'trending_down' },
  { href: '/settings',   label: 'Settings',  icon: 'settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item, idx) => {
        if (item.isAction) {
          return (
            <Link key="action" href="/input" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px',
              textDecoration: 'none'
            }}>
              <div style={{
                width: 48, height: 48,
                background: 'var(--accent)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: -18,
                boxShadow: '0 4px 16px rgba(0,61,155,0.3)',
                border: '3px solid var(--bg)',
              }}>
                <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>add</span>
              </div>
            </Link>
          )
        }
        const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, textDecoration: 'none', padding: '6px 10px',
            color: active ? 'var(--accent)' : 'var(--text3)',
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 22,
              fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0"
            }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
