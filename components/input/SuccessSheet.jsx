'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, ArrowLeftRight } from 'lucide-react'
import KategoriIcon, { KATEGORI_ICON_MAP } from '../ui/KategoriIcon'
import { fmtFull, parseTanggal } from '../../lib/utils'

// Aman dipakai di server (tidak memicu peringatan useLayoutEffect)
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Ikon, warna, dan label per jenis transaksi
function metaOf(info) {
  if (info.tipe === 'income')   return { label: 'Pemasukan',   color: '#10b981', sign: '+', icon: <KategoriIcon kategori="Pemasukan" size={22} color="#fff" /> }
  if (info.tipe === 'cash')     return { label: 'Tarik Tunai', color: '#f59e0b', sign: '−', icon: <Landmark size={22} color="#fff" /> }
  if (info.tipe === 'transfer') return { label: 'Transfer',    color: '#3b82f6', sign: '',  icon: <ArrowLeftRight size={22} color="#fff" /> }
  const c = KATEGORI_ICON_MAP[info.kategori]?.color || '#f43f5e'
  return { label: 'Pengeluaran', color: c, sign: '−', icon: <KategoriIcon kategori={info.kategori || 'Lainnya'} size={22} color="#fff" /> }
}

// Titik warna kecil di sekeliling badge centang (koordinat dalam viewBox 200 x 120)
const CONFETTI = [
  { x: 46,  y: 30, c: '#34d399', r: 5 },   { x: 28,  y: 58, c: '#3b82f6', r: 6.5 }, { x: 44,  y: 92, c: '#a855f7', r: 5 },
  { x: 74,  y: 10, c: '#f59e0b', r: 3.5 }, { x: 116, y: 8,  c: '#34d399', r: 5 },   { x: 150, y: 22, c: '#f43f5e', r: 5 },
  { x: 172, y: 54, c: '#3b82f6', r: 6.5 }, { x: 160, y: 96, c: '#f59e0b', r: 5 },   { x: 20,  y: 26, c: '#f43f5e', r: 3 },
  { x: 182, y: 86, c: '#a855f7', r: 3 },
]

// Gaya claymorphism (sama dengan form konfirmasi & edit): sudut besar + "tepi" 3D
const CLAY_BTN = { height: 52, fontSize: 15, fontWeight: 700, borderRadius: 20 }

// Timeline animasi (ms)
const POP_MS      = 450   // badge centang muncul (pop)
const DRAW_DELAY  = 350   // mulai menggambar garis centang
const DRAW_MS     = 500   // durasi menggambar centang
const COUNT_DELAY = 450   // mulai nominal naik dari 0
const COUNT_MS    = 900   // durasi nominal naik
const HAPTIC_AT   = 1000  // getar singkat di akhir

/* Layar "Transaksi Berhasil Disimpan!" — menggantikan toast sebelumnya */
export default function SuccessSheet({ info, onClose }) {
  const router = useRouter()
  const badgeRef = useRef(null)
  const checkRef = useRef(null)
  // null = tampilkan nominal asli; angka = nilai sementara saat hitung naik
  const [shownAmount, setShownAmount] = useState(null)
  const open   = !!info
  const amount = info?.amount

  useEffect(() => {
    if (!info) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [info, onClose])

  // Animasi: centang tergambar + nominal naik dari 0 + getar halus (haptic)
  useIsoLayoutEffect(() => {
    if (!open) return
    const badge = badgeRef.current
    const check = checkRef.current
    const showFinal = () => {
      setShownAmount(null)
      if (check) check.style.strokeDashoffset = '0'
    }

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !check?.animate) { showFinal(); return }

    const anims = []
    const timers = []
    let raf = 0

    // 1) Badge pop, lalu garis centang digambar pelan
    if (badge?.animate) {
      anims.push(badge.animate(
        [{ transform: 'scale(0)' }, { transform: 'scale(1.12)', offset: 0.7 }, { transform: 'scale(1)' }],
        { duration: POP_MS, easing: 'ease-out', fill: 'both' }
      ))
    }
    anims.push(check.animate(
      [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
      { duration: DRAW_MS, delay: DRAW_DELAY, easing: 'ease-out', fill: 'both' }
    ))

    // 3) Nominal naik dari 0 sampai nilai akhir (ease-out)
    const total = Math.round(Number(amount))
    if (Number.isFinite(total) && total > 0) {
      setShownAmount(0)
      timers.push(setTimeout(() => {
        const start = performance.now()
        const tick = now => {
          const t = Math.min(1, (now - start) / COUNT_MS)
          if (t < 1) {
            setShownAmount(Math.round(total * (1 - Math.pow(1 - t, 3))))
            raf = requestAnimationFrame(tick)
          } else {
            setShownAmount(null)
          }
        }
        raf = requestAnimationFrame(tick)
      }, COUNT_DELAY))
    }

    // 7) Getar halus (hanya di perangkat/browser yang mendukung)
    timers.push(setTimeout(() => {
      try { navigator.vibrate?.(30) } catch {}
    }, HAPTIC_AT))

    return () => {
      anims.forEach(a => a.cancel())
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
    }
  }, [open, amount])

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
  const subtitle = info.uraian ? `${m.label} · ${info.uraian}` : m.label

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
        {/* Badge centang clay + titik warna */}
        <svg viewBox="0 0 200 120" role="img" aria-label="Berhasil" style={{ display: 'block', width: '100%', maxWidth: 260, margin: '0 auto' }}>
          {CONFETTI.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} />)}
          <g ref={badgeRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <rect x="64" y="30" width="72" height="72" rx="26" fill="#0b9467" />
            <rect x="64" y="24" width="72" height="72" rx="26" fill="#10b981" />
            <path
              ref={checkRef}
              d="M85 61 L96 72 L116 49" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
            />
          </g>
        </svg>

        <h2 style={{ textAlign: 'center', margin: '4px 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.02em' }}>
          Transaksi Berhasil Disimpan!
        </h2>
        <p style={{ textAlign: 'center', margin: '0 0 20px', fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
          Data transaksi kamu telah berhasil ditambahkan ke dalam catatan.
        </p>

        {/* Ringkasan */}
        <div style={{ background: 'var(--surface)', borderRadius: 26, boxShadow: '0 6px 0 var(--surface3)', padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 46, height: 46, borderRadius: 16, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {m.icon}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nama}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right', lineHeight: 1.4, flexShrink: 0 }}>
              {tgl}<br />{jam}
            </div>
          </div>

          <div style={{ fontSize: 30, fontWeight: 800, color: amountColor, textAlign: 'center', margin: '18px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {m.sign}{m.sign ? ' ' : ''}{fmtFull(shownAmount ?? info.amount)}
          </div>

          {b && (
            <div style={{ background: `color-mix(in srgb, ${bColor} 12%, transparent)`, borderRadius: 18, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: bColor, marginBottom: 8 }}>
                {over ? `Over budget ${b.kategori}: ${fmtFull(Math.abs(b.sisa))}` : `Sisa budget ${b.kategori}: ${fmtFull(b.sisa)}`}
              </div>
              <div style={{ height: 14, borderRadius: 7, background: 'var(--surface3)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(Math.max(b.pct, 0), 100)}%`, background: bColor, borderRadius: 7 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{b.pct}% terpakai dari {fmtFull(b.alokasi)}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button" className="btn btn-primary btn-full"
            style={{ ...CLAY_BTN, boxShadow: '0 5px 0 color-mix(in srgb, var(--accent) 70%, black)' }}
            onClick={() => { onClose(); router.push('/transaksi') }}
          >
            Lihat Detail
          </button>
          <button
            type="button" className="btn btn-ghost btn-full"
            style={{ ...CLAY_BTN, background: 'var(--surface)', border: 'none', boxShadow: '0 4px 0 var(--surface3)' }}
            onClick={onClose}
          >
            Tambah Transaksi Lagi
          </button>
          <button
            type="button" className="btn btn-ghost btn-full"
            style={{ height: 48, fontSize: 15, fontWeight: 700, borderRadius: 20, border: 'none', color: 'var(--text2)' }}
            onClick={() => { onClose(); router.push('/dashboard') }}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
