'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import InputModal from '../modals/InputModal';

const navItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#38bdf8' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/record',
    label: 'Wallet',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#38bdf8' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
        <path d="M16 12a2 2 0 0 1 2-2h3v4h-3a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    href: null,
    label: '',
    isAction: true,
    icon: () => (
      <div style={{
        width: 52, height: 52,
        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(56,189,248,0.4)',
        marginTop: -20,
        border: '3px solid #0f172a',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
    ),
  },
  {
    href: '/expenses',
    label: 'Keluar',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f43f5e' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        <polyline points="17 18 23 18 23 12"/>
      </svg>
    ),
  },
  {
    href: '/income',
    label: 'Masuk',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#10b981' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#38bdf8' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showInput, setShowInput] = useState(false);

  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(30,41,59,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(148,163,184,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
        zIndex: 100,
        height: 'calc(64px + env(safe-area-inset-bottom))',
      }}>
        {navItems.map((item, idx) => {
          if (item.isAction) {
            return (
              <button key="action" type="button"
                onClick={() => setShowInput(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4px 8px',
                }}
              >
                {item.icon()}
              </button>
            )
          }
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, textDecoration: 'none', padding: '4px 8px',
            }}>
              {item.icon(active)}
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: active ? '#38bdf8' : '#64748b',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {showInput && (
        <InputModal
          onClose={() => setShowInput(false)}
          onSuccess={() => setShowInput(false)}
        />
      )}
    </>
  );
}
