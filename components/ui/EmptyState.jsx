'use client'
import Link from 'next/link'

/* ─────────────────────────────────────────────────
   SVG illustrations — inline, zero dependency
───────────────────────────────────────────────── */

const IlluReceipt = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="16" y="8" width="48" height="60" rx="6" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5"/>
    <path d="M16 68 L22 62 L28 68 L34 62 L40 68 L46 62 L52 68 L58 62 L64 68" stroke="var(--border)" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
    <rect x="24" y="20" width="20" height="3" rx="1.5" fill="var(--surface3)"/>
    <rect x="24" y="27" width="32" height="3" rx="1.5" fill="var(--surface3)"/>
    <rect x="24" y="34" width="26" height="3" rx="1.5" fill="var(--surface3)"/>
    <rect x="24" y="44" width="32" height="4" rx="2" fill="var(--accent)" opacity="0.18"/>
    <circle cx="60" cy="20" r="10" fill="var(--accent)" opacity="0.12"/>
    <path d="M56 20h8M60 16v8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const IlluWallet = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="10" y="24" width="60" height="38" rx="8" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5"/>
    <rect x="10" y="24" width="60" height="14" rx="8" fill="var(--surface3)"/>
    <rect x="10" y="30" width="60" height="8" fill="var(--surface3)"/>
    <rect x="46" y="34" width="18" height="16" rx="5" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5"/>
    <circle cx="55" cy="42" r="3" fill="var(--accent)" opacity="0.5"/>
    <circle cx="40" cy="14" r="8" fill="var(--accent)" opacity="0.12"/>
    <path d="M37 14h6M40 11v6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const IlluChart = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="8" y="8" width="64" height="64" rx="10" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5"/>
    <rect x="18" y="46" width="10" height="18" rx="3" fill="var(--accent)" opacity="0.25"/>
    <rect x="33" y="34" width="10" height="30" rx="3" fill="var(--accent)" opacity="0.4"/>
    <rect x="48" y="22" width="10" height="42" rx="3" fill="var(--accent)" opacity="0.7"/>
    <path d="M18 46 Q28 36 38 34 Q48 32 53 22" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <circle cx="60" cy="16" r="7" fill="var(--green)" opacity="0.2"/>
    <path d="M57 16l2 2 4-4" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IlluBudget = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="40" cy="40" r="28" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5"/>
    <path d="M40 40 L40 14 A26 26 0 0 1 66 40 Z" fill="var(--accent)" opacity="0.15"/>
    <path d="M40 40 L66 40 A26 26 0 0 1 40 66 Z" fill="var(--green)" opacity="0.12"/>
    <circle cx="40" cy="40" r="14" fill="var(--surface)"/>
    <path d="M37 38h2v6h2" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="40" cy="35" r="1.5" fill="var(--accent)"/>
  </svg>
)

const IlluTransfer = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="8" y="18" width="28" height="18" rx="5" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5"/>
    <rect x="44" y="44" width="28" height="18" rx="5" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5"/>
    <path d="M36 27 H50 M44 21 L50 27 L44 33" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44 53 H30 M36 47 L30 53 L36 59" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="60" cy="20" r="6" fill="var(--accent)" opacity="0.15"/>
    <path d="M58 20h4M60 18v4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

/* ─────────────────────────────────────────────────
   VARIAN CONFIG
───────────────────────────────────────────────── */
const VARIANTS = {
  expenses: {
    Illu:    IlluReceipt,
    title:   'Belum ada pengeluaran',
    desc:    'Catat transaksi pertamamu — foto struk atau ketik manual.',
    cta:     '+ Catat Transaksi',
    href:    '/input',
  },
  wallet: {
    Illu:    IlluWallet,
    title:   'Belum ada transfer',
    desc:    'Pindah saldo antar rekening atau antar anggota keluarga.',
    cta:     '+ Catat Transfer',
    href:    '/input',
  },
  'dashboard-kategori': {
    Illu:    IlluChart,
    title:   'Belum ada data kategori',
    desc:    'Mulai catat pengeluaran, dan kategori akan muncul di sini.',
    cta:     '+ Catat Sekarang',
    href:    '/input',
  },
  'dashboard-budget': {
    Illu:    IlluBudget,
    title:   'Belum ada budget plan',
    desc:    'Buat rencana budget bulanan untuk pantau pengeluaran.',
    cta:     'Buat Budget Plan',
    href:    '/budget',
  },
  'dashboard-transfer': {
    Illu:    IlluTransfer,
    title:   'Belum ada data',
    desc:    'Catat transaksi pertamamu untuk mulai melihat ringkasan.',
    cta:     '+ Catat Sekarang',
    href:    '/input',
  },
}

/* ─────────────────────────────────────────────────
   KOMPONEN UTAMA
───────────────────────────────────────────────── */

/**
 * EmptyState — ilustrasi SVG inline + judul + deskripsi + CTA button
 *
 * @param {'expenses'|'wallet'|'dashboard-kategori'|'dashboard-budget'|'dashboard-transfer'} variant
 * @param {string}  [title]   - override judul
 * @param {string}  [desc]    - override deskripsi
 * @param {string}  [cta]     - override label tombol
 * @param {string}  [href]    - override URL tombol
 * @param {'sm'|'md'} [size]  - 'sm' untuk card kecil
 */
export default function EmptyState({ variant = 'expenses', title, desc, cta, href, size = 'md' }) {
  const v    = VARIANTS[variant] || VARIANTS.expenses
  const { Illu } = v

  const isSm = size === 'sm'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: isSm ? '20px 12px' : '32px 16px',
      gap: isSm ? 10 : 14,
      textAlign: 'center',
    }}>
      <div style={{ opacity: 0.85, transform: isSm ? 'scale(0.75)' : 'scale(1)', transformOrigin: 'center' }}>
        <Illu />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{
          fontSize: isSm ? 13 : 15, fontWeight: 700, color: 'var(--text1)',
          fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif',
        }}>
          {title || v.title}
        </div>
        <div style={{
          fontSize: isSm ? 11 : 12, color: 'var(--text3)', lineHeight: 1.55,
          maxWidth: 220,
          fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif',
        }}>
          {desc || v.desc}
        </div>
      </div>

      <Link href={href || v.href} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: isSm ? '7px 16px' : '9px 20px',
        borderRadius: 10,
        background: 'var(--accent)',
        color: 'white',
        fontSize: isSm ? 12 : 13,
        fontWeight: 700,
        textDecoration: 'none',
        fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif',
        transition: 'filter 150ms ease, transform 100ms ease',
        boxShadow: '0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent)',
      }}
        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = '' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = '' }}
      >
        {cta || v.cta}
      </Link>
    </div>
  )
}
