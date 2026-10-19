'use client'
import { X, Check, PenLine, TrendingDown, TrendingUp, Landmark, AlertTriangle, Calendar, Tag, CreditCard, User as UserIcon } from 'lucide-react'
import GeminiIcon from '../GeminiIcon'
import BottomSheet from './BottomSheet'
import { useAmountInput } from '../../hooks/useAmountInput'

// Gaya claymorphism: sudut membulat besar + "tepi" 3D di bawah kartu/tombol.
// Semua warna memakai token dari base.css, jadi otomatis mengikuti mode terang/gelap.
const CLAY_CARD = { background: 'var(--surface2)', borderRadius: 26, boxShadow: '0 6px 0 var(--surface3)' }
const CLAY_TILE = { background: 'var(--surface2)', borderRadius: 20, boxShadow: '0 4px 0 var(--surface3)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, minWidth: 0 }
const BUBBLE = { width: 32, height: 32, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const TILE_LABEL = { fontSize: 11, color: 'var(--text3)', fontWeight: 500 }
const TILE_VALUE = { fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

export default function ConfirmPopup({ parsedResult, setParsedResult, profiles, saving, error, onSave, onCancel, onEditManual }) {
  const tipeColorConfirm = parsedResult?.tipe === 'expense' ? 'var(--red)' : parsedResult?.tipe === 'income' ? 'var(--green)' : 'var(--yellow)'
  const tipeBgConfirm    = parsedResult?.tipe === 'expense' ? 'var(--red-bg)' : parsedResult?.tipe === 'income' ? 'var(--green-bg)' : 'var(--yellow-bg)'
  const TipeIconConfirm  = parsedResult?.tipe === 'income' ? TrendingUp : parsedResult?.tipe === 'cash' ? Landmark : TrendingDown

  const confirmAmt = useAmountInput(
    parsedResult?.total ?? '',
    v => setParsedResult(p => ({ ...p, total: v }))
  )

  if (!parsedResult) return null

  const tipeLabel = parsedResult.tipe === 'expense' ? 'Pengeluaran' : parsedResult.tipe === 'income' ? 'Pemasukan' : 'Tarik Tunai'
  const tokoLabel = parsedResult.tipe === 'income' ? 'Sumber' : parsedResult.tipe === 'cash' ? 'ATM / Lokasi' : 'Merchant'
  const tokoInitial = (parsedResult.toko || '?').trim().charAt(0).toUpperCase() || '?'

  // Tile info (tanpa tanggal & user, karena keduanya berupa input)
  const infoTiles = [
    ...(parsedResult.tipe === 'expense' ? [{ key: 'kategori', label: 'Kategori', value: parsedResult.kategori || 'Lainnya', Icon: Tag, bg: 'var(--accent-light)', color: 'var(--accent)' }] : []),
    { key: 'bank', label: 'Bank / Dompet', value: parsedResult.bank || 'Cash', Icon: Landmark, bg: 'var(--green-bg)', color: 'var(--green)' },
    { key: 'metode', label: 'Metode', value: parsedResult.metode || 'Cash', Icon: CreditCard, bg: 'var(--orange-bg)', color: 'var(--orange)' },
  ]
  // Tanggal + info tile; jika jumlahnya ganjil, tile terakhir melebar agar grid tetap rapi
  const totalTiles = 1 + infoTiles.length
  const lastSpansTwo = totalTiles % 2 === 1

  return (
    <BottomSheet onBackdropClick={onCancel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GeminiIcon size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Hasil Ekstraksi AI</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Periksa sebelum simpan</div>
          </div>
        </div>
        <button onClick={onCancel} aria-label="Tutup"
          style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--surface2)', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </button>
      </div>

      {/* Tanggal hasil baca AI tidak wajar → sudah diganti hari ini; beri tahu supaya bisa dicek */}
      {parsedResult.tanggalDikoreksi && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', marginBottom: 12, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 14, color: 'var(--yellow)', fontSize: 12, fontWeight: 600, lineHeight: 1.5 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Tanggal di struk terbaca "{parsedResult.tanggalDikoreksi}" dan tidak wajar, jadi diganti ke tanggal hari ini. Ketuk tanggal untuk mengubahnya bila perlu.</span>
        </div>
      )}

      {/* Kartu utama: merchant + jumlah */}
      <div style={{ ...CLAY_CARD, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 16, background: tipeBgConfirm, color: tipeColorConfirm, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
            {tokoInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{tokoLabel}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsedResult.toko || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsedResult.uraian || '—'}</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tipeBgConfirm, color: tipeColorConfirm, borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            <TipeIconConfirm size={12} /> {tipeLabel}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 16 }}>
          <input type="text" inputMode="numeric" aria-label="Jumlah"
            value={confirmAmt.display} onChange={confirmAmt.onChange} onKeyDown={confirmAmt.onKeyDown}
            style={{ background: 'var(--surface)', color: tipeColorConfirm, border: '1.5px solid var(--border2)', borderRadius: 16, padding: '8px 14px', fontSize: 30, fontWeight: 800, fontFamily: 'inherit', outline: 'none', textAlign: 'center', width: '100%', minHeight: 56 }} />
          {confirmAmt.formatted && (
            <span style={{ fontSize: 12, color: tipeColorConfirm, opacity: 0.85, fontWeight: 600 }}>{confirmAmt.formatted}</span>
          )}
        </div>
      </div>

      {/* Tile detail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
        <label style={{ ...CLAY_TILE, gridColumn: totalTiles === 1 ? 'span 2' : undefined }}>
          <span style={{ ...BUBBLE, background: 'var(--yellow-bg)', color: 'var(--yellow)' }}><Calendar size={16} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...TILE_LABEL, display: 'block' }}>Tanggal</span>
            <input type="date" value={parsedResult.tanggal || ''} aria-label="Tanggal transaksi"
              onChange={e => setParsedResult(p => ({ ...p, tanggal: e.target.value, tanggalDikoreksi: null }))}
              style={{ background: 'transparent', color: 'var(--text1)', border: 'none', padding: 0, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', outline: 'none', width: '100%', minHeight: 24 }} />
          </span>
        </label>

        {infoTiles.map(({ key, label, value, Icon, bg, color }, i) => (
          <div key={key} style={{ ...CLAY_TILE, gridColumn: lastSpansTwo && i === infoTiles.length - 1 ? 'span 2' : undefined }}>
            <span style={{ ...BUBBLE, background: bg, color }}><Icon size={16} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ ...TILE_LABEL, display: 'block' }}>{label}</span>
              <span style={{ ...TILE_VALUE, display: 'block' }}>{value}</span>
            </span>
          </div>
        ))}

        <label style={{ ...CLAY_TILE, gridColumn: 'span 2' }}>
          <span style={{ ...BUBBLE, background: 'var(--accent-light)', color: 'var(--accent)' }}><UserIcon size={16} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...TILE_LABEL, display: 'block', marginBottom: 2 }}>User</span>
            <select value={parsedResult.user_id}
              onChange={e => setParsedResult(p => ({ ...p, user_id: e.target.value }))}
              aria-label="Pilih user"
              style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1.5px solid var(--border2)', borderRadius: 10, padding: '5px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', outline: 'none', width: '100%', minHeight: 36 }}>
              <option value="">Pilih User</option>
              {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </span>
        </label>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 14, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onEditManual}
          style={{ flex: 1, gap: 6, height: 52, borderRadius: 20, background: 'var(--surface2)', border: 'none', boxShadow: '0 4px 0 var(--surface3)' }}>
          <PenLine size={14} /> Edit Manual
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}
          style={{ flex: 1.6, gap: 6, height: 52, borderRadius: 20, boxShadow: '0 5px 0 color-mix(in srgb, var(--accent) 70%, black)' }}>
          {saving ? 'Menyimpan...' : <><Check size={15} /> Konfirmasi &amp; Simpan</>}
        </button>
      </div>
    </BottomSheet>
  )
}
