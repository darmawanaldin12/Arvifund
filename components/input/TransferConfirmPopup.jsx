'use client'
import { useState } from 'react'
import { ArrowLeftRight, ArrowUpRight, ArrowDownLeft, Bot, Calendar, FileText, Landmark, X } from 'lucide-react'
import { useAmountInput } from '../../hooks/useAmountInput'
import BottomSheet from './BottomSheet'

const BANK_BY_USER = {
  '9f5a9e66-a47e-4cf1-bfe6-107da0574a2e': ['BCA', 'Mandiri', 'BRI', 'Cash'],
  '42b635cc-a32d-4b15-95d6-d9afb504a850': ['BCA', 'Mandiri', 'Cash'],
}
const DEFAULT_BANKS = ['BCA', 'Mandiri', 'BRI', 'Cash']

// Gaya claymorphism (sama dengan ConfirmPopup): sudut besar + "tepi" 3D di bawah kartu/tombol.
// Semua warna memakai token dari base.css, jadi otomatis mengikuti mode terang/gelap.
const CLAY_CARD = { background: 'var(--surface2)', borderRadius: 26, boxShadow: '0 6px 0 var(--surface3)' }
const CLAY_TILE = { background: 'var(--surface2)', borderRadius: 20, boxShadow: '0 4px 0 var(--surface3)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, minWidth: 0 }
const BUBBLE = { width: 32, height: 32, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const TILE_LABEL = { fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 2 }
const FIELD = { background: 'var(--surface)', color: 'var(--text1)', border: '1.5px solid var(--border2)', borderRadius: 10, padding: '5px 10px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', outline: 'none', width: '100%', minHeight: 36 }

export default function TransferConfirmPopup({ result, profiles, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState({ ...result })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fromBanks = form.from_user ? (BANK_BY_USER[form.from_user] || DEFAULT_BANKS) : DEFAULT_BANKS
  const toBanks   = form.to_user   ? (BANK_BY_USER[form.to_user]   || DEFAULT_BANKS) : DEFAULT_BANKS
  const isInternal = form.from_user === form.to_user && form.from_user !== ''
  const fromName = profiles.find(p => p.id === form.from_user)?.username || ''
  const toName   = profiles.find(p => p.id === form.to_user)?.username   || ''
  const routeReady = form.from_user && form.to_user && form.from_bank && form.to_bank

  const transferAmt = useAmountInput(form.jumlah, v => setF('jumlah', v))
  const amtColor = transferAmt.previewColor || 'var(--accent)'

  return (
    <BottomSheet onBackdropClick={onCancel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Transfer Terdeteksi</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Periksa detail transfer</div>
          </div>
        </div>
        <button onClick={onCancel} aria-label="Tutup"
          style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--surface2)', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </button>
      </div>

      {/* Kartu utama: rute + jumlah */}
      <div style={{ ...CLAY_CARD, padding: 16, marginBottom: 16 }}>
        {routeReady && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', marginBottom: 14, borderRadius: 14, background: isInternal ? 'var(--yellow-bg)' : 'var(--accent-light)', color: isInternal ? 'var(--yellow)' : 'var(--accent)', fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>
            <ArrowLeftRight size={13} style={{ flexShrink: 0 }} />
            <span>
              {isInternal
                ? `Pindah rekening ${fromName}: ${form.from_bank} → ${form.to_bank}`
                : `${fromName} (${form.from_bank}) → ${toName} (${form.to_bank})`}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <input type="text" inputMode="numeric" placeholder="0" aria-label="Jumlah transfer"
            value={transferAmt.display} onChange={transferAmt.onChange} onKeyDown={transferAmt.onKeyDown}
            style={{ background: 'var(--surface)', color: amtColor, border: '1.5px solid var(--border2)', borderRadius: 16, padding: '8px 14px', fontSize: 30, fontWeight: 800, fontFamily: 'inherit', outline: 'none', textAlign: 'center', width: '100%', minHeight: 56, letterSpacing: '-0.01em' }} />
          {transferAmt.formatted && (
            <span style={{ fontSize: 12, color: amtColor, opacity: 0.85, fontWeight: 600 }}>{transferAmt.formatted}</span>
          )}
        </div>
      </div>

      {/* Tile detail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
        <label style={{ ...CLAY_TILE, gridColumn: 'span 2' }}>
          <span style={{ ...BUBBLE, background: 'var(--yellow-bg)', color: 'var(--yellow)' }}><Calendar size={16} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={TILE_LABEL}>Tanggal</span>
            <input type="date" value={form.tanggal || ''} aria-label="Tanggal transfer"
              onChange={e => setF('tanggal', e.target.value)}
              style={{ background: 'transparent', color: 'var(--text1)', border: 'none', padding: 0, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', outline: 'none', width: '100%', minHeight: 24 }} />
          </span>
        </label>

        <label style={CLAY_TILE}>
          <span style={{ ...BUBBLE, background: 'var(--red-bg)', color: 'var(--red)' }}><ArrowUpRight size={16} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={TILE_LABEL}>Dari</span>
            <select value={form.from_user} aria-label="Pengirim" style={FIELD} onChange={e => {
              const b = BANK_BY_USER[e.target.value] || DEFAULT_BANKS
              setForm(f => ({ ...f, from_user: e.target.value, from_bank: b[0] || '' }))
            }}>
              <option value="">Pilih pengirim</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </span>
        </label>

        <label style={CLAY_TILE}>
          <span style={{ ...BUBBLE, background: 'var(--green-bg)', color: 'var(--green)' }}><ArrowDownLeft size={16} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={TILE_LABEL}>Ke</span>
            <select value={form.to_user} aria-label="Penerima" style={FIELD} onChange={e => {
              const b = BANK_BY_USER[e.target.value] || DEFAULT_BANKS
              setForm(f => ({ ...f, to_user: e.target.value, to_bank: b[0] || '' }))
            }}>
              <option value="">Pilih penerima</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </span>
        </label>

        <label style={CLAY_TILE}>
          <span style={{ ...BUBBLE, background: 'var(--accent-light)', color: 'var(--accent)' }}><Landmark size={16} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={TILE_LABEL}>Rekening asal</span>
            <select value={form.from_bank} aria-label="Rekening asal" style={{ ...FIELD, opacity: form.from_user ? 1 : 0.6 }}
              onChange={e => setF('from_bank', e.target.value)} disabled={!form.from_user}>
              {!form.from_user && <option value="">Pilih pengirim dulu</option>}
              {fromBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </span>
        </label>

        <label style={CLAY_TILE}>
          <span style={{ ...BUBBLE, background: 'var(--orange-bg)', color: 'var(--orange)' }}><Landmark size={16} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={TILE_LABEL}>Rekening tujuan</span>
            <select value={form.to_bank} aria-label="Rekening tujuan" style={{ ...FIELD, opacity: form.to_user ? 1 : 0.6 }}
              onChange={e => setF('to_bank', e.target.value)} disabled={!form.to_user}>
              {!form.to_user && <option value="">Pilih penerima dulu</option>}
              {toBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </span>
        </label>

        <label style={{ ...CLAY_TILE, gridColumn: 'span 2' }}>
          <span style={{ ...BUBBLE, background: 'var(--accent-light)', color: 'var(--accent)' }}><FileText size={16} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={TILE_LABEL}>Catatan (opsional)</span>
            <input type="text" placeholder="Contoh: buat belanja bulan ini" aria-label="Catatan"
              value={form.catatan || ''} onChange={e => setF('catatan', e.target.value)}
              style={{ background: 'transparent', color: 'var(--text1)', border: 'none', padding: 0, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', outline: 'none', width: '100%', minHeight: 24 }} />
          </span>
        </label>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 14, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ paddingBottom: 8 }}>
        <button
          onClick={() => onSave({ ...form, jumlah: form.jumlah })}
          disabled={saving}
          className="btn btn-primary btn-full"
          style={{ height: 52, fontSize: 15, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 5px 0 color-mix(in srgb, var(--accent) 70%, black)' }}
        >
          <ArrowLeftRight size={18} />{saving ? 'Menyimpan...' : 'Simpan Transfer'}
        </button>
      </div>
    </BottomSheet>
  )
}
