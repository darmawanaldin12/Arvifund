'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/wallet',
    label: 'Wallet',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
        <path d="M16 12a2 2 0 0 1 2-2h3v4h-3a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    href: '/record',
    label: 'Record',
    isAction: true,
    icon: () => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="url(#grad)" />
        <path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Keluar',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        <polyline points="17 18 23 18 23 12"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      zIndex: 100, backdropFilter: 'blur(12px)',
    }}>
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: item.isAction ? 0 : 4, textDecoration: 'none',
            padding: item.isAction ? '0 8px' : '4px 8px',
            marginTop: item.isAction ? -12 : 0,
          }}>
            {item.icon(active)}
            {!item.isAction && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: active ? 'var(--accent)' : 'var(--text3)',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
    }
