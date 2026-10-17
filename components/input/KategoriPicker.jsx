'use client'
import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Search, Check } from 'lucide-react'
import { KATEGORI_EXPENSE } from '../../lib/kategori'
import { KATEGORI_ICON_MAP } from '../ui/KategoriIcon'

/* Layar "Pilih Kategori" (layar penuh): pencarian + daftar kategori berikon berwarna */
export default function KategoriPicker({ open, value, onSelect, onClose }) {
  const [q, setQ] = useState('')

  // Kunci scroll halaman di belakang & tutup dengan tombol Esc
  useEffect(() => {
    if (!open) return
    setQ('')
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return KATEGORI_EXPENSE.filter(k => k.toLowerCase().includes(t))
  }, [q])

  if (!open) return null

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Pilih kategori"
      style={{
        position: 'fixed', inset: 0, zIndex: 1200, background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px 8px' }}>
        <button
          type="button" onClick={onClose} aria-label="Kembali"
          style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--text1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={22} />
        </button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text1)' }}>Pilih Kategori</h2>
      </div>

      {/* Pencarian */}
      <div style={{ padding: '4px 16px 12px', position: 'relative' }}>
        <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 30, top: 18, color: 'var(--text3)', pointerEvents: 'none' }} />
        <input
          className="form-input" type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Cari kategori..." aria-label="Cari kategori"
          style={{ paddingLeft: 40, height: 46, borderRadius: 12 }}
        />
      </div>

      {/* Daftar */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '0 16px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', margin: '8px 4px 8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Kategori Pengeluaran
        </div>

        {list.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '32px 0' }}>Kategori tidak ditemukan</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {list.map(k => {
            const entry = KATEGORI_ICON_MAP[k]
            const Icon  = entry?.Icon
            const color = entry?.color || '#94a3b8'
            const selected = value === k
            return (
              <button
                key={k} type="button"
                onClick={() => { onSelect(k); onClose() }}
                className="tappable"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 58,
                  padding: '8px 4px', background: 'transparent', border: 'none',
                  borderBottom: '1px solid var(--border2)', cursor: 'pointer', textAlign: 'left',
                  color: 'var(--text1)', fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 38, height: 38, borderRadius: 11, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {Icon && <Icon size={19} color="#fff" />}
                </span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: selected ? 800 : 600 }}>{k}</span>
                {selected
                  ? <Check size={18} color="var(--accent)" aria-hidden="true" />
                  : <ChevronRight size={18} color="var(--text3)" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
