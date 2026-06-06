'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useData } from '../DataContext'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils-cn'
import { Separator } from '../ui/separator'
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  Landmark, PieChart, Wallet, Settings, LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
  { href: '/expenses',   label: 'Pengeluaran', Icon: TrendingDown,   color: 'var(--red)' },
  { href: '/income',     label: 'Pemasukan',   Icon: TrendingUp,     color: 'var(--green)' },
  { href: '/cashrecord', label: 'Tarik Tunai', Icon: Landmark,       color: 'var(--yellow)' },
  { href: '/budget',     label: 'Budget Plan', Icon: PieChart },
  { href: '/record',     label: 'Wallet',      Icon: Wallet },
  { href: '/settings',   label: 'Settings',    Icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { profile, user } = useData()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initials = profile?.username?.[0]?.toUpperCase() || '?'

  return (
    <aside className={cn(
      'sidebar',
      'flex flex-col h-full',
    )}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src="/logo.png"
          alt="Arvifund"
          onError={e => { e.target.style.display = 'none' }}
        />
        <span className="sidebar-logo-text">Arvifund</span>
      </div>

      <Separator className="mx-3 mb-3 w-auto opacity-50" />

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-item', active && 'active')}
              style={active && item.color ? { color: item.color, background: `${item.color}15`, borderRightColor: item.color } : {}}
            >
              <item.Icon
                size={18}
                style={{ color: active && item.color ? item.color : undefined }}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '16px 12px 0' }}>
        <Separator className="mb-3 opacity-50" />

        {/* User card */}
        <div className={cn(
          'sidebar-user',
          'group transition-colors duration-150',
          'hover:bg-[var(--surface3)] cursor-default',
        )}>
          {/* Avatar */}
          <div className={cn(
            'sidebar-avatar',
            'select-none shrink-0',
          )}>
            {initials}
          </div>

          {/* Info */}
          <div className="overflow-hidden flex-1 min-w-0">
            <div className="text-[13px] font-bold text-[var(--text1)] truncate leading-tight">
              {profile?.username || '—'}
            </div>
            <div className="text-[11px] text-[var(--text3)] truncate mt-0.5">
              {user?.email}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Logout"
            className={cn(
              'p-1 rounded-md shrink-0',
              'text-[var(--text3)] hover:text-[var(--red)]',
              'hover:bg-[var(--red-bg)]',
              'transition-all duration-150',
              'border-none bg-transparent cursor-pointer',
            )}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
