'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Landmark, ArrowLeftRight } from 'lucide-react'
import KategoriIcon, { KATEGORI_ICON_MAP } from '../ui/KategoriIcon'
import { fmtFull, parseTanggal } from '../../lib/utils'

// Ikon, warna, dan label per jenis transaksi
function metaOf(info) {
  if (info.tipe === 'income')   return { label: 'Pemasukan',   color: '#10b981', sign: '+', icon: <KategoriIcon kategori="Pemasukan" size={22} color="#fff" /> }
  if (info.tipe === 'cash')     return { label: 'Tarik Tunai', color: '#f59e0b', sign: '−', icon: <Landmark size={22} color="#fff" /> }
  if (info.tipe === 'transfer') return { label: 'Transfer',    color: '#3b82f6', sign: '',  icon: <ArrowLeftRight size={22} color="#fff" /> }
  const c = KATEGORI_ICON_MAP[info.kategori]?.color || '#f43f5e'
  return { label: 'Pengeluaran', color: c, sign: '−', icon: <KategoriIcon kategori={info.kategori || 'Lainnya'} size={22} color="#fff" /> }
}

const CONFETTI = [
  { x: 8,  y: 30, c: '#3b82f6', r: 4 }, { x: 22, y: 8,  c: '#10b981', r: 3 }, { x: 40, y: 22, c: '#f59e0b', r: 3 },
  { x: 112, y: 12, c: '#f43f5e', r: 3 }, { x: 128, y: 34, c: '#3b82f6', r: 4 }, { x: 98, y: 4, c: '#10b981', r: 3 },
  { x: 14, y: 62, c: '#a855f7', r: 3 }, { x: 134, y: 64, c: '#f59e0b', r: 3 },
]

/* Layar "Transaksi Berhasil Disimpan!" — menggantikan toast sebelumnya */
export default function SuccessSheet({ info, onClose }) {
  const router = useRouter()

  useEffect(() => {
    if (!info) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [info, onClose])

  if (!info) return null

  const m    = metaOf(info)
  const dt   = parseTanggal(info.tanggal)
  const tgl  = dt ? dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const jam  = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':')
  const nama = info.toko || info.kategori || m.label
  const b    = info.budget
  const over = b && b.sisa < 0
  const bColor = !b ? 'var(--text3)' : over ? 'var(--red)' : b.pct >= 80 ? 'var(--yellow)' : 'var(--green)'
  const amountColor = info.tipe === 'income' ? 'var(--green)' : info.tipe === 'transfer' ? 'var(--text1)' : 'var(--red)'

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Transaksi berhasil disimpan"
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, background: 'var(--bg)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Centang + confetti */}
        <div style={{ position: 'relative', width: 144, height: 100, margin: '0 auto 8px' }}>
          <svg width="144" height="100" viewBox="0 0 144 100" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
            {CONFETTI.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity="0.85" />)}
          </svg>
          <div style={{ position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)', width: 84, height: 84, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
            <Check size={44} color="#fff" strokeWidth={3} />
          </div>
        </div>

        <h2 style={{ textAlign: 'center', margin: '8px 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.02em' }}>
          Transaksi Berhasil Disimpan!
        </h2>
        <p style={{ textAlign: 'center', margin: '0 0 22px', fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
          Data transaksi kamu telah berhasil ditambahkan ke dalam catatan.
        </p>

        {/* Ringkasan */}
        <div className="card" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 46, height: 46, borderRadius: 14, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {m.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nama}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{m.label}</div>
            </div>
          </div>

          <div style={{ fontSize: 24, fontWeight: 800, color: amountColor, margin: '16px 0 4px', letterSpacing: '-0.02em' }}>
            {m.sign}{m.sign ? ' ' : ''}{fmtFull(info.amount)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{tgl} · {jam}</div>
          {info.uraian ? <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>{info.uraian}</div> : null}

          {b && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border2)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: bColor }}>
                {over ? `Over budget ${b.kategori}: ${fmtFull(Math.abs(b.sisa))}` : `Sisa budget ${b.kategori}: ${fmtFull(b.sisa)}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{b.pct}% terpakai dari {fmtFull(b.alokasi)}</div>
            </div>
          )}
        </div>

        <button
          type="button" className="btn btn-primary btn-full"
          style={{ height: 50, fontSize: 15, fontWeight: 700, borderRadius: 12 }}
          onClick={() => { onClose(); router.push('/transaksi') }}
        >
          Lihat Detail
        </button>
        <button
          type="button" className="btn btn-ghost btn-full"
          style={{ height: 50, fontSize: 15, fontWeight: 700, borderRadius: 12, marginTop: 10 }}
          onClick={onClose}
        >
          Tambah Transaksi Lagi
        </button>
      </div>
    </div>
  )
}
