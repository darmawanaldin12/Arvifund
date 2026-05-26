'use client'
import { useState, useEffect } from 'react'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'

export default function EditModal({ type, data, onSave, onClose, loading }) {
  const [form, setForm] = useState({})

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

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
      <div className="modal-content">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>

            {/* Tanggal */}
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input className="form-input" type="date" value={form.tanggal?.split('T')[0] || ''} onChange={e => set('tanggal', e.target.value)} required />
            </div>

            {/* Tipe spesifik */}
            {type === 'expense' && (
              <>
                <div className="form-group">
                  <label className="form-label">Toko / Merchant</label>
                  <input className="form-input" type="text" value={form.toko || ''} onChange={e => set('toko', e.target.value)} placeholder="Nama toko" />
                </div>
                <div className="form-group">
                  <label className="form-label">Uraian / Items</label>
                  <input className="form-input" type="text" value={form.uraian || ''} onChange={e => set('uraian', e.target.value)} placeholder="Deskripsi" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nilai</label>
                  <input className="form-input" type="number" value={form.nilai || ''} onChange={e => set('nilai', parseFloat(e.target.value))} required min="0" inputMode="numeric" />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="form-select" value={form.kategori || ''} onChange={e => set('kategori', e.target.value)}>
                    <option value="">Pilih Kategori</option>
                    {KATEGORI_LIST.filter(k => k !== 'Pemasukan').map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Metode Bayar</label>
                  <select className="form-select" value={form.transaksi || ''} onChange={e => set('transaksi', e.target.value)}>
                    <option value="">Pilih Metode</option>
                    {METODE_LIST.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bank / Dompet</label>
                  <select className="form-select" value={form.bank || ''} onChange={e => set('bank', e.target.value)}>
                    <option value="">Pilih Bank</option>
                    {BANK_LIST.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </>
            )}

            {type === 'income' && (
              <>
                <div className="form-group">
                  <label className="form-label">Sumber</label>
                  <input className="form-input" type="text" value={form.sumber || ''} onChange={e => set('sumber', e.target.value)} placeholder="Sumber pemasukan" />
                </div>
                <div className="form-group">
                  <label className="form-label">Keterangan / Items</label>
                  <input className="form-input" type="text" value={form.items || ''} onChange={e => set('items', e.target.value)} placeholder="Keterangan" />
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah</label>
                  <input className="form-input" type="number" value={form.jumlah || ''} onChange={e => set('jumlah', parseFloat(e.target.value))} required min="0" inputMode="numeric" />
                </div>
                <div className="form-group">
                  <label className="form-label">Metode</label>
                  <select className="form-select" value={form.metode || ''} onChange={e => set('metode', e.target.value)}>
                    <option value="">Pilih Metode</option>
                    {METODE_LIST.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Tujuan</label>
                  <select className="form-select" value={form.bank || ''} onChange={e => set('bank', e.target.value)}>
                    <option value="">Pilih Bank</option>
                    {BANK_LIST.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </>
            )}

            {type === 'cash' && (
              <>
                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <input className="form-input" type="text" value={form.transaksi || ''} onChange={e => set('transaksi', e.target.value)} placeholder="Keterangan" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nilai</label>
                  <input className="form-input" type="number" value={form.nilai || ''} onChange={e => set('nilai', parseFloat(e.target.value))} required min="0" inputMode="numeric" />
                </div>
                <div className="form-group">
                  <label className="form-label">Lokasi / Alamat ATM</label>
                  <input className="form-input" type="text" value={form.alamat || ''} onChange={e => set('alamat', e.target.value)} placeholder="Lokasi ATM" />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank</label>
                  <select className="form-select" value={form.bank || ''} onChange={e => set('bank', e.target.value)}>
                    <option value="">Pilih Bank</option>
                    {BANK_LIST.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Edit Note */}
            <div className="form-group">
              <label className="form-label">Catatan Perubahan</label>
              <input className="form-input" type="text" value={form.edited_note || ''} onChange={e => set('edited_note', e.target.value)} placeholder="Alasan edit (opsional)" />
            </div>

            {/* Edit info readonly */}
            {form.edited_at && (
              <div style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
                ✏️ Terakhir diedit: {new Date(form.edited_at).toLocaleString('id-ID')}
                {form.edited_note ? ` — ${form.edited_note}` : ''}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
