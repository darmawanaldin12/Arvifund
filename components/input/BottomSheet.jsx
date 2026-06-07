'use client'
import { TrendingDown, TrendingUp, Landmark, Check, ArrowLeftRight } from 'lucide-react'

// Bottom nav height — popup harus di atas ini
const BOTTOM_NAV_H = 60

// ── BottomSheet wrapper ────────────────────────────────────────────────────
export default function BottomSheet({ onBackdropClick, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && onBackdropClick?.()}
    >
      <div
        style={{
          position: 'absolute',
          bottom: BOTTOM_NAV_H,
          left: 0, right: 0,
          margin: '0 auto',
          maxWidth: 560,
          maxHeight: `calc(100dvh - ${BOTTOM_NAV_H}px - 24px)`,
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          padding: '20px 20px 24px',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── SavedToast ─────────────────────────────────────────────────────────────
export function SavedToast({ show, tipe, amount }) {
  if (!show) return null
  const label = tipe === 'income' ? 'Pemasukan'
    : tipe === 'cash'     ? 'Tarik Tunai'
    : tipe === 'transfer' ? 'Transfer'
    : 'Pengeluaran'
  const color = tipe === 'income' ? '#10b981'
    : tipe === 'cash'     ? '#f59e0b'
    : tipe === 'transfer' ? 'var(--accent)'
    : '#f43f5e'
  const Icon = tipe === 'income' ? TrendingUp
    : tipe === 'cash'     ? Landmark
    : tipe === 'transfer' ? ArrowLeftRight
    : TrendingDown

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 2000, animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '12px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        minWidth: 260, maxWidth: 'calc(100vw - 32px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `${color}18`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Check size={16} color={color} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={14} color={color} />{label} tersimpan
          </div>
          {amount && (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Rp {Number(amount).toLocaleString('id-ID')}
            </div>
          )}
        </div>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, height: 3,
          borderRadius: '0 0 16px 16px', background: color, opacity: 0.5,
          animation: 'toastProgress 2.5s linear 0.1s forwards', width: '100%',
        }} />
      </div>
    </div>
  )
}
