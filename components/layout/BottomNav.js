'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Overview',  icon: 'dashboard' },
  { href: '/record',     label: 'Wallet',    icon: 'account_balance_wallet' },
  { href: '/input',      label: '',          isAction: true },
  { href: '/expenses',   label: 'Keluar',    icon: 'trending_down' },
  { href: '/settings',   label: 'Settings',  icon: 'settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item, idx) => {
        if (item.isAction) {
          const isActive = pathname === '/input'
          return (
            <Link key="action" href="/input" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '4px 8px', textDecoration: 'none',
            }}>
              <div style={{
                width: 48, height: 48,
                background: isActive ? '#0032a0' : 'var(--accent)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: -18,
                boxShadow: isActive
                  ? '0 4px 20px rgba(0,61,155,0.5)'
                  : '0 4px 16px rgba(0,61,155,0.3)',
                border: '3px solid var(--bg)',
                transition: 'all 0.2s',
              }}>
                <span className="material-symbols-outlined" style={{
                  color: 'white', fontSize: 22,
                  fontVariationSettings: "'FILL' 1",
                }}>add</span>
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
