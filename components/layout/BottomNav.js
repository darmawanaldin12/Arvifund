'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Pengeluaran',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    ),
  },
  // Slot tengah — diisi FAB input
  null,
  {
    href: '/income',
    label: 'Pemasukan',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ),
  },
  {
    href: '/record',
    label: 'Wallet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M16 10h2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          display: none;
          padding: 0 8px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: var(--surface);
          border-top: 1px solid var(--border);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        @media (max-width: 768px) {
          .bottom-nav {
            display: flex;
          }
        }

        .bottom-nav-inner {
          display: flex;
          align-items: stretch;
          justify-content: space-around;
          width: 100%;
          height: 60px;
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 1;
          text-decoration: none;
          color: var(--text3);
          position: relative;
          padding: 6px 4px;
          border-radius: 10px;
          transition: color 0.18s ease;
          -webkit-tap-highlight-color: transparent;
          cursor: pointer;
        }

        .bottom-nav-item:hover {
          color: var(--text1);
        }

        .bottom-nav-item.active {
          color: var(--accent);
        }

        .bottom-nav-item.active .bottom-nav-icon-wrap {
          background: color-mix(in srgb, var(--accent) 12%, transparent);
        }

        .bottom-nav-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 28px;
          border-radius: 8px;
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .bottom-nav-item:active .bottom-nav-icon-wrap {
          transform: scale(0.88);
        }

        .bottom-nav-label {
          font-size: 10px;
          font-weight: 500;
          line-height: 1;
          letter-spacing: 0.01em;
          white-space: nowrap;
          transition: color 0.18s ease;
        }

        .bottom-nav-active-dot {
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .bottom-nav-item.active .bottom-nav-active-dot {
          opacity: 1;
        }

        /* FAB tombol input di tengah */
        .bottom-nav-fab-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .bottom-nav-fab {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 16px;
          background: var(--accent);
          color: white;
          border: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          text-decoration: none;
          box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 45%, transparent);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          margin-bottom: 10px;
        }

        .bottom-nav-fab:active {
          transform: scale(0.9);
          box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent);
        }

        .bottom-nav-fab svg {
          transition: transform 0.2s ease;
        }

        .bottom-nav-fab.fab-active {
          background: var(--accent);
        }
      `}</style>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.map((item, idx) => {
            // Slot tengah = FAB input
            if (item === null) {
              const isFabActive = pathname === '/input';
              return (
                <div key="fab" className="bottom-nav-fab-wrap">
                  <Link href="/input" className={`bottom-nav-fab${isFabActive ? ' fab-active' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </Link>
                </div>
              );
            }

            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`bottom-nav-item${isActive ? ' active' : ''}`}
              >
                <span className="bottom-nav-active-dot" />
                <span className="bottom-nav-icon-wrap">
                  {item.icon}
                </span>
                <span className="bottom-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
