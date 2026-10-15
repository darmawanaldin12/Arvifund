'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Progress } from '../ui/progress'
import KategoriIcon from '../ui/KategoriIcon'
import EmptyState from '../ui/EmptyState'
import { fmt, fmtFull, fmtTanggalShort, KATEGORI_COLOR } from '../../lib/utils'
import { normalizeKategori } from '../../lib/kategori'
import { cn } from '../../lib/utils-cn'

// Kelompokkan pengeluaran per kategori (terbaru di atas).
// normalize = true → pakai kategori resmi Budget Plan; false → nama kategori apa adanya.
function groupByKategori(rows, normalize) {
  const g = {}
  ;(rows || []).forEach(r => {
    const k = normalize ? normalizeKategori(r.kategori) : (r.kategori || 'Lainnya')
    ;(g[k] = g[k] || []).push(r)
  })
  Object.values(g).forEach(list => list.sort((a, b) => {
    const dc = (b.tanggal || '').localeCompare(a.tanggal || '')
    return dc !== 0 ? dc : (b.created_at || '').localeCompare(a.created_at || '')
  }))
  return g
}

/* Daftar transaksi satu kategori (muncul saat baris diketuk) */
function Rincian({ rows, footerHref, footerLabel }) {
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border2)' }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
        {rows.length} transaksi
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Belum ada pengeluaran di periode ini</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{r.toko || 'Pengeluaran'}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {fmtTanggalShort(r.tanggal)}
                  {r.uraian ? ` · ${r.uraian}` : ''}
                  {r.transaksi ? ` · ${r.transaksi}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>{fmtFull(r.nilai)}</div>
            </div>
          ))}
        </div>
      )}
      <Link href={footerHref} className="dash-see-all" style={{ display: 'inline-block', marginTop: 12, padding: '6px 0' }}>
        {footerLabel} →
      </Link>
    </div>
  )
}

// Animasi buka-tutup rincian (sama dengan kartu Anomali)
function Expand({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TapRow({ open, onToggle, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      className="tappable"
      onClick={onToggle}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
      style={{ cursor: 'pointer', minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      {children}
    </div>
  )
}

/* ── Top 5 Kategori — ketuk baris untuk melihat transaksinya ── */
export function Top5KategoriDetailCard({ top5, totalExpenses, expenses }) {
  const [openKat, setOpenKat] = useState(null)
  const grouped = useMemo(() => groupByKategori(expenses, false), [expenses])
  return (
    <div className="bento-4">
      <div className="dash-card">
        <div className="dash-card-header">Top 5 Kategori</div>
        {top5.length === 0
          ? <EmptyState variant="dashboard-kategori" size="sm" />
          : (
            <div className="progress-list">
              {top5.map(([kat, val]) => {
                const pct    = totalExpenses > 0 ? Math.round(val / totalExpenses * 100) : 0
                const color  = KATEGORI_COLOR[kat] || 'var(--accent)'
                const isOpen = openKat === kat
                return (
                  <div key={kat} className="progress-row">
                    <TapRow open={isOpen} onToggle={() => setOpenKat(isOpen ? null : kat)}>
                      <div className="progress-row-top">
                        <span className="progress-row-kat">
                          <KategoriIcon kategori={kat} size={16} />
                          <span className="progress-label">{kat}</span>
                          <ChevronDown size={14} aria-hidden="true" style={{ color: 'var(--text3)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                        </span>
                        <span className="progress-pct">
                          {fmt(val)}<span className="progress-pct-sub"> ({pct}%)</span>
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-[var(--surface2)]" style={{ '--progress-color': color }} />
                    </TapRow>
                    <Expand open={isOpen}>
                      <Rincian rows={grouped[kat] || []} footerHref="/expenses" footerLabel="Lihat semua pengeluaran" />
                    </Expand>
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}

/* ── Budget vs Realisasi — ketuk baris untuk melihat transaksinya ── */
export function BudgetDetailCard({ budgetVsReal, expenses }) {
  const [openKat, setOpenKat] = useState(null)
  const items   = (budgetVsReal || []).filter(b => b.alokasi > 0).slice(0, 5)
  const grouped = useMemo(() => groupByKategori(expenses, true), [expenses])
  return (
    <div className="bento-4">
      <div className="dash-card">
        <div className="dash-card-header">Budget vs Realisasi</div>
        {items.length === 0
          ? <EmptyState variant="dashboard-budget" size="sm" />
          : (
            <div className="progress-list">
              {items.map(b => {
                const isOpen = openKat === b.kategori
                return (
                  <div key={b.kategori} className="progress-row">
                    <TapRow open={isOpen} onToggle={() => setOpenKat(isOpen ? null : b.kategori)}>
                      <div className="progress-row-top">
                        <span className="progress-row-kat">
                          <span className="progress-label">{b.kategori}</span>
                          <ChevronDown size={14} aria-hidden="true" style={{ color: 'var(--text3)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                        </span>
                        <span className={cn('progress-pct', b.pct >= 100 ? 'danger' : b.pct >= 80 ? 'warn' : 'ok')}>{b.pct}%</span>
                      </div>
                      <Progress value={Math.min(b.pct, 100)} className="h-2 bg-[var(--surface2)]"
                        indicatorClassName={b.pct >= 100 ? 'bg-[var(--red)]' : b.pct >= 80 ? 'bg-[var(--yellow)]' : 'bg-[var(--green)]'} />
                    </TapRow>
                    <Expand open={isOpen}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
                        <span>Terpakai {fmt(b.realisasi)}</span>
                        <span>Alokasi {fmt(b.alokasi)}</span>
                      </div>
                      <Rincian rows={grouped[b.kategori] || []} footerHref="/budget" footerLabel="Buka Budget Plan" />
                    </Expand>
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}

/* ── Tombol untuk membuka/menutup kartu tambahan ── */
export function MoreToggle({ open, onToggle, anomaliCount = 0 }) {
  return (
    <div className="bento-12">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tappable"
        style={{
          width: '100%', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '8px 16px', borderRadius: 14, border: '1px dashed var(--border)', background: 'transparent',
          color: 'var(--text2)', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            {open ? 'Sembunyikan detail lainnya' : 'Tampilkan detail lainnya'}
            {!open && anomaliCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--red-bg)', color: 'var(--red)' }}>
                {anomaliCount} anomali
              </span>
            )}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Ringkasan mingguan, per anggota, transaksi anomali</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
      </button>
    </div>
  )
}
