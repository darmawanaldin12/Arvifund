'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useData } from '../DataContext'
import { supabase } from '../../lib/supabase'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',    icon: 'dashboard' },
  { href: '/expenses',    label: 'Pengeluaran',  icon: 'trending_down' },
  { href: '/income',      label: 'Pemasukan',    icon: 'trending_up' },
  { href: '/cashrecord',  label: 'Tarik Tunai',  icon: 'local_atm' },
  { href: '/budget',      label: 'Budget Plan',  icon: 'pie_chart' },
  { href: '/record',      label: 'Wallet',       icon: 'account_balance_wallet' },
  { href: '/settings',    label: 'Settings',     icon: 'settings' },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { profile, user } = useData()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initials = profile?.username?.[0]?.toUpperCase() || '?'

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Arvifund" />
        <span className="sidebar-logo-text">Arvifund</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className={`sidebar-item${active ? ' active' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div style={{ padding: '16px 12px 0' }}>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.username || '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
          <button onClick={handleLogout} title="Logout" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', padding: 4, display: 'flex',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
