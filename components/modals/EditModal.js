'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Calendar, Tag, CreditCard, Landmark, MapPin, FileText, X } from 'lucide-react'
import { KATEGORI_LIST, BULAN_ORDER } from '../../lib/utils'

const METODE_LIST_EDIT = ['Cash', 'QRIS', 'Transfer', 'Card', 'Cardless', 'Virtual Account Transfer']
const BANK_LIST_EDIT   = ['BCA', 'BRI', 'Mandiri', 'OVO', 'GoPay', 'ShopeePay', 'Cash']

// Gaya claymorphism (sama dengan ConfirmPopup): sudut besar + "tepi" 3D di bawah kartu/tombol.
// Semua warna memakai token dari base.css, jadi otomatis mengikuti mode terang/gelap.
const CLAY_CARD = { background: 'var(--surface2)', borderRadius: 26, boxShadow: '0 6px 0 var(--surface3)' }
const CLAY_TILE = { background: 'var(--surface2)', borderRadius: 20, boxShadow: '0 4px 0 var(--surface3)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, minWidth: 0 }
const BUBBLE = { width: 32, height: 32, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const TILE_LABEL = { fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 2 }
const FIELD = { background: 'var(--surface)', color: 'var(--text1)', border: '1.5px solid var(--border2)', borderRadius: 10, padding: '5px 10px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', outline: 'none', width: '100%', minHeight: 36 }
const HERO_FIELD = { ...FIELD, borderRadius: 12, padding: '8px 12px', fontSize: 14, minHeight: 44 }

function Tile({ id, label, Icon, bg, color, span, children }) {
  return (
    <div style={{ ...CLAY_TILE, gridColumn: span ? 'span 2' : undefined }}>
      <span style={{ ...BUBBLE, background: bg, color }}><Icon size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <label htmlFor={id} style={TILE_LABEL}>{label}</label>
        {children}
      </div>
    </div>
  )
}

export default function EditModal({ type, data, onSave, onClose, loading }) {
  const [form, setForm] = useState({})
  const [mounted, setMounted] = useState(false)
  const modalRef = useRef(null)
  const firstFieldRef = useRef(null)

  // Portal hanya bisa dibuat setelah komponen mount di client (document.body belum
  // tentu ada saat SSR).
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

  // Auto-focus field pertama + Escape untuk tutup + focus trap (Tab tidak bocor ke belakang modal)
  useEffect(() => {
    if (modalRef.current) modalRef.current.scrollTop = 0
    firstFieldRef.current?.focus({ preventScroll: true })

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll('input, select, textarea, button:not([disabled])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last  = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Kunci scroll body selagi modal terbuka (portal me-render di luar page,
  // jadi body masih bisa ke-scroll kalau tidak dikunci manual)
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
  }

  const title = type === 'expense' ? 'Edit Pengeluaran' : type === 'income' ? 'Edit Pemasukan' : 'Edit Tarik Tunai'
  const tipeColor = type === 'expense' ? 'var(--red)' : type === 'income' ? 'var(--green)' : 'var(--yellow)'
  const tipeBg    = type === 'expense' ? 'var(--red-bg)' : type === 'income' ? 'var(--green-bg)' : 'var(--yellow-bg)'

  // Kartu utama: dua field teks + jumlah (nama kolom data tetap sama seperti sebelumnya)
  const HERO = {
    expense: {
      primary:   { id: 'edit-toko',     label: 'Toko / Merchant', key: 'toko',   placeholder: 'Nama toko' },
      secondary: { id: 'edit-uraian',   label: 'Uraian / Items',  key: 'uraian', placeholder: 'Deskripsi' },
      amount:    { id: 'edit-nilai-exp', label: 'Nilai', key: 'nilai' },
    },
    income: {
      primary:   { id: 'edit-sumber', label: 'Sumber',             key: 'sumber', placeholder: 'Sumber pemasukan' },
      secondary: { id: 'edit-items',  label: 'Keterangan / Items', key: 'items',  placeholder: 'Keterangan' },
      amount:    { id: 'edit-jumlah', label: 'Jumlah', key: 'jumlah' },
    },
    cash: {
      primary:   { id: 'edit-ket-cash',   label: 'Keterangan', key: 'transaksi', placeholder: 'Keterangan' },
      secondary: null,
      amount:    { id: 'edit-nilai-cash', label: 'Nilai', key: 'nilai' },
    },
  }
  const hero = HERO[type] || HERO.cash

  const selectNode = (id, key, placeholder, options) => (
    <select id={id} style={FIELD} value={form[key] || ''} onChange={e => set(key, e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )

  const tanggalNode = (
    <input ref={firstFieldRef} id="edit-tanggal" style={FIELD} type="date" value={form.tanggal?.split('T')[0] || ''} onChange={e => set('tanggal', e.target.value)} required />
  )

  const tiles = [
    { key: 'tanggal', id: 'edit-tanggal', label: 'Tanggal', Icon: Calendar, bg: 'var(--yellow-bg)', color: 'var(--yellow)', node: tanggalNode },
    ...(type === 'expense' ? [
      { key: 'kategori', id: 'edit-kategori', label: 'Kategori', Icon: Tag, bg: 'var(--accent-light)', color: 'var(--accent)',
        node: selectNode('edit-kategori', 'kategori', 'Pilih Kategori', KATEGORI_LIST.filter(k => k !== 'Pemasukan')) },
      { key: 'metode', id: 'edit-metode-exp', label: 'Metode Bayar', Icon: CreditCard, bg: 'var(--orange-bg)', color: 'var(--orange)',
        node: selectNode('edit-metode-exp', 'transaksi', 'Pilih Metode', METODE_LIST_EDIT) },
      { key: 'bank', id: 'edit-bank-exp', label: 'Bank / Dompet', Icon: Landmark, bg: 'var(--green-bg)', color: 'var(--green)',
        node: selectNode('edit-bank-exp', 'bank', 'Pilih Bank', BANK_LIST_EDIT) },
    ] : []),
    ...(type === 'income' ? [
      { key: 'metode', id: 'edit-metode-inc', label: 'Metode', Icon: CreditCard, bg: 'var(--orange-bg)', color: 'var(--orange)',
        node: selectNode('edit-metode-inc', 'metode', 'Pilih Metode', METODE_LIST_EDIT) },
      { key: 'bank', id: 'edit-bank-inc', label: 'Bank Tujuan', Icon: Landmark, bg: 'var(--green-bg)', color: 'var(--green)',
        node: selectNode('edit-bank-inc', 'bank', 'Pilih Bank', BANK_LIST_EDIT) },
    ] : []),
    ...(type === 'cash' ? [
      { key: 'lokasi', id: 'edit-lokasi', label: 'Lokasi / Alamat ATM', Icon: MapPin, bg: 'var(--orange-bg)', color: 'var(--orange)',
        node: <input id="edit-lokasi" style={FIELD} type="text" value={form.alamat || ''} onChange={e => set('alamat', e.target.value)} placeholder="Lokasi ATM" /> },
      { key: 'bank', id: 'edit-bank-cash', label: 'Bank', Icon: Landmark, bg: 'var(--green-bg)', color: 'var(--green)',
        node: selectNode('edit-bank-cash', 'bank', 'Pilih Bank', BANK_LIST_EDIT) },
    ] : []),
  ]
  // Jika jumlah tile ganjil, tile terakhir melebar agar grid tetap rapi
  const lastSpansTwo = tiles.length % 2 === 1

  if (!mounted) return null

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: tipeBg, color: tipeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={18} />
            </div>
            <span className="modal-title" id="edit-modal-title">{title}</span>
          </div>
          <button onClick={onClose} aria-label="Tutup dialog"
            style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--surface2)', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>

            {/* Kartu utama: nama + uraian + jumlah */}
            <div style={{ ...CLAY_CARD, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="form-label" htmlFor={hero.primary.id} style={TILE_LABEL}>{hero.primary.label}</label>
                  <input id={hero.primary.id} style={HERO_FIELD} type="text" value={form[hero.primary.key] || ''}
                    onChange={e => set(hero.primary.key, e.target.value)} placeholder={hero.primary.placeholder} />
                </div>
                {hero.secondary && (
                  <div>
                    <label className="form-label" htmlFor={hero.secondary.id} style={TILE_LABEL}>{hero.secondary.label}</label>
                    <input id={hero.secondary.id} style={HERO_FIELD} type="text" value={form[hero.secondary.key] || ''}
                      onChange={e => set(hero.secondary.key, e.target.value)} placeholder={hero.secondary.placeholder} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 16 }}>
                <label htmlFor={hero.amount.id} style={{ ...TILE_LABEL, marginBottom: 0 }}>{hero.amount.label}</label>
                <input id={hero.amount.id} type="number" inputMode="numeric" required min="0"
                  value={form[hero.amount.key] || ''}
                  onChange={e => set(hero.amount.key, e.target.value === '' ? '' : parseFloat(e.target.value))}
                  style={{ background: 'var(--surface)', color: tipeColor, border: '1.5px solid var(--border2)', borderRadius: 16, padding: '8px 14px', fontSize: 30, fontWeight: 800, fontFamily: 'inherit', outline: 'none', textAlign: 'center', width: '100%', minHeight: 56 }} />
              </div>
            </div>

            {/* Tile detail */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
              {tiles.map(({ key, id, label, Icon, bg, color, node }, i) => (
                <Tile key={key} id={id} label={label} Icon={Icon} bg={bg} color={color} span={lastSpansTwo && i === tiles.length - 1}>
                  {node}
                </Tile>
              ))}
              <Tile id="edit-note" label="Catatan Perubahan" Icon={FileText} bg="var(--accent-light)" color="var(--accent)" span>
                <input id="edit-note" style={FIELD} type="text" value={form.edited_note || ''} onChange={e => set('edited_note', e.target.value)} placeholder="Alasan edit (opsional)" />
              </Tile>
            </div>

            {/* Edit info readonly */}
            {form.edited_at && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 14, fontSize: 12, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.5 }}>
                <Pencil size={13} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <span>
                  Terakhir diedit: {new Date(form.edited_at).toLocaleString('id-ID')}
                  {form.edited_note ? ` → ${form.edited_note}` : ''}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}
                style={{ flex: 1, height: 52, borderRadius: 20, background: 'var(--surface2)', border: 'none', boxShadow: '0 4px 0 var(--surface3)' }}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}
                style={{ flex: 1.6, height: 52, borderRadius: 20, boxShadow: '0 5px 0 color-mix(in srgb, var(--accent) 70%, black)' }}>
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
