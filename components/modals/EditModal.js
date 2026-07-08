'use client'
import { useState, useEffect, useRef } from 'react'
import { KATEGORI_LIST, BULAN_ORDER } from '../../lib/utils'

const METODE_LIST_EDIT = ['Cash', 'QRIS', 'Transfer', 'Card', 'Cardless', 'Virtual Account Transfer']
const BANK_LIST_EDIT   = ['BCA', 'BRI', 'Mandiri', 'OVO', 'GoPay', 'ShopeePay', 'Cash']

export default function EditModal({ type, data, onSave, onClose, loading }) {
  const [form, setForm] = useState({})
  const modalRef = useRef(null)
  const firstFieldRef = useRef(null)

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

  // Auto-focus field pertama + Escape untuk tutup + focus trap (Tab tidak bocor ke belakang modal)
  useEffect(() => {
    // Pastikan modal selalu terbuka dari posisi paling atas.
    // Beberapa browser mobile (terutama untuk <input type="date">) melakukan
    // scroll-into-view otomatis saat elemen di-focus, dan karena modal ini
    // adalah overlay dengan scroll sendiri (overflow-y: auto), itu bisa bikin
    // modal-content ke-scroll ke bawah saat pertama kali muncul.
    // preventScroll menghentikan auto-scroll bawaan browser, lalu kita reset
    // scroll position secara manual.
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

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
  }

  const title = type === 'expense' ? 'Edit Pengeluaran' : type === 'income' ? 'Edit Pemasukan' : 'Edit Tarik Tunai'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
        <div className="modal-header">
          <span className="modal-title" id="edit-modal-title">{title}</span>
          <button onClick={onClose} aria-label="Tutup dialog" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>

            {/* Tanggal */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-tanggal">Tanggal</label>
              <input ref={firstFieldRef} id="edit-tanggal" className="form-input" type="date" value={form.tanggal?.split('T')[0] || ''} onChange={e => set('tanggal', e.target.value)} required />
            </div>

            {/* Tipe spesifik */}
            {type === 'expense' && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-toko">Toko / Merchant</label>
                  <input id="edit-toko" className="form-input" type="text" value={form.toko || ''} onChange={e => set('toko', e.target.value)} placeholder="Nama toko" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-uraian">Uraian / Items</label>
                  <input id="edit-uraian" className="form-input" type="text" value={form.uraian || ''} onChange={e => set('uraian', e.target.value)} placeholder="Deskripsi" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-nilai-exp">Nilai</label>
                  <input id="edit-nilai-exp" className="form-input" type="number" value={form.nilai || ''} onChange={e => set('nilai', e.target.value === '' ? '' : parseFloat(e.target.value))} required min="0" inputMode="numeric" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-kategori">Kategori</label>
                  <select id="edit-kategori" className="form-select" value={form.kategori || ''} onChange={e => set('kategori', e.target.value)}>
                    <option value="">Pilih Kategori</option>
                    {KATEGORI_LIST.filter(k => k !== 'Pemasukan').map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-metode-exp">Metode Bayar</label>
                  <select id="edit-metode-exp" className="form-select" value={form.transaksi || ''} onChange={e => set('transaksi', e.target.value)}>
                    <option value="">Pilih Metode</option>
                    {METODE_LIST_EDIT.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-bank-exp">Bank / Dompet</label>
                  <select id="edit-bank-exp" className="form-select" value={form.bank || ''} onChange={e => set('bank', e.target.value)}>
                    <option value="">Pilih Bank</option>
                    {BANK_LIST_EDIT.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </>
            )}

            {type === 'income' && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-sumber">Sumber</label>
                  <input id="edit-sumber" className="form-input" type="text" value={form.sumber || ''} onChange={e => set('sumber', e.target.value)} placeholder="Sumber pemasukan" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-items">Keterangan / Items</label>
                  <input id="edit-items" className="form-input" type="text" value={form.items || ''} onChange={e => set('items', e.target.value)} placeholder="Keterangan" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-jumlah">Jumlah</label>
                  <input id="edit-jumlah" className="form-input" type="number" value={form.jumlah || ''} onChange={e => set('jumlah', e.target.value === '' ? '' : parseFloat(e.target.value))} required min="0" inputMode="numeric" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-metode-inc">Metode</label>
                  <select id="edit-metode-inc" className="form-select" value={form.metode || ''} onChange={e => set('metode', e.target.value)}>
                    <option value="">Pilih Metode</option>
                    {METODE_LIST_EDIT.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-bank-inc">Bank Tujuan</label>
                  <select id="edit-bank-inc" className="form-select" value={form.bank || ''} onChange={e => set('bank', e.target.value)}>
                    <option value="">Pilih Bank</option>
                    {BANK_LIST_EDIT.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </>
            )}

            {type === 'cash' && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-ket-cash">Keterangan</label>
                  <input id="edit-ket-cash" className="form-input" type="text" value={form.transaksi || ''} onChange={e => set('transaksi', e.target.value)} placeholder="Keterangan" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-nilai-cash">Nilai</label>
                  <input id="edit-nilai-cash" className="form-input" type="number" value={form.nilai || ''} onChange={e => set('nilai', e.target.value === '' ? '' : parseFloat(e.target.value))} required min="0" inputMode="numeric" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-lokasi">Lokasi / Alamat ATM</label>
                  <input id="edit-lokasi" className="form-input" type="text" value={form.alamat || ''} onChange={e => set('alamat', e.target.value)} placeholder="Lokasi ATM" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-bank-cash">Bank</label>
                  <select id="edit-bank-cash" className="form-select" value={form.bank || ''} onChange={e => set('bank', e.target.value)}>
                    <option value="">Pilih Bank</option>
                    {BANK_LIST_EDIT.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Edit Note */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-note">Catatan Perubahan</label>
              <input id="edit-note" className="form-input" type="text" value={form.edited_note || ''} onChange={e => set('edited_note', e.target.value)} placeholder="Alasan edit (opsional)" />
            </div>

            {/* Edit info readonly */}
            {form.edited_at && (
              <div style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
                ✏️ Terakhir diedit: {new Date(form.edited_at).toLocaleString('id-ID')}
                {form.edited_note ? ` → ${form.edited_note}` : ''}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading} style={{ flex: 2 }}>
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
