'use client'
import { useState } from 'react'
import { useData } from '../DataContext'
import { supabase } from '../../lib/supabase'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'

export default function InputModal({ onClose, onSuccess }) {
  const { user, profiles, loadData } = useData()
  const [tipe, setTipe]     = useState('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [form, setForm] = useState({
    tanggal: today, toko: '', uraian: '', total: '',
    kategori: '', metode: 'Cash', bank: 'Cash',
    user_id: user?.id || '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function getBulan(tgl) {
    if (!tgl) return ''
    const d = new Date(tgl + 'T00:00:00'); return BULAN_ORDER[d.getMonth()]
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.total || isNaN(parseFloat(form.total))) { setError('Total harus diisi dengan angka'); return }
    if (!form.user_id) { setError('User harus dipilih'); return }
    setSaving(true)
    try {
      const bulan = getBulan(form.tanggal)
      const nilai = parseFloat(form.total)
      if (tipe === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{
          toko: form.toko, tanggal: form.tanggal, bulan,
          transaksi: form.metode, uraian: form.uraian,
          kategori: form.kategori || 'Lainnya', bank: form.bank,
          nilai, user_id: form.user_id,
        }])
        if (err) throw err
      } else if (tipe === 'income') {
        const { error: err } = await supabase.from('income').insert([{
          sumber: form.toko, tanggal: form.tanggal, bulan,
          jumlah: nilai, metode: form.metode, items: form.uraian,
          bank: form.bank, kategori: 'Pemasukan', user_id: form.user_id,
        }])
        if (err) throw err
      } else if (tipe === 'cash') {
        const { error: err } = await supabase.from('cash_records').insert([{
          tanggal: form.tanggal, bulan, transaksi: form.uraian || 'Tarik Tunai',
          kategori: 'Pengeluaran', bank: form.bank, nilai,
          alamat: form.toko, metode: 'Cash', user_id: form.user_id,
        }])
        if (err) throw err
      }
      await loadData()
      onSuccess?.()
      onClose()
    } catch (err) {
      setError('Gagal simpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const TIPE_LIST = [
    { id: 'expense', label: 'Pengeluaran', color: 'var(--red)',    icon: '💸' },
    { id: 'income',  label: 'Pemasukan',   color: 'var(--green)',  icon: '💰' },
    { id: 'cash',    label: 'Tarik Tunai', color: 'var(--yellow)', icon: '🏧' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <span className="modal-title">Input Manual</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="modal-body">
          {/* Tipe */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {TIPE_LIST.map(t => (
              <button key={t.id} type="button" onClick={() => setTipe(t.id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8,
                border: `2px solid ${tipe === t.id ? t.color : 'var(--border)'}`,
                background: tipe === t.id ? `${t.color}18` : 'var(--surface2)',
                color: tipe === t.id ? t.color : 'var(--text3)',
                fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input className="form-input" type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">{tipe === 'income' ? 'Sumber' : tipe === 'cash' ? 'Lokasi ATM' : 'Toko / Merchant'}</label>
              <input className="form-input" type="text" placeholder={tipe === 'income' ? 'Nama perusahaan' : tipe === 'cash' ? 'Nama ATM / lokasi' : 'Nama toko'} value={form.toko} onChange={e => set('toko', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{tipe === 'income' ? 'Keterangan' : 'Uraian / Items'}</label>
              <input className="form-input" type="text" placeholder="Deskripsi transaksi" value={form.uraian} onChange={e => set('uraian', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{tipe === 'income' ? 'Jumlah' : 'Total'}</label>
              <input className="form-input" type="number" inputMode="numeric" placeholder="0" value={form.total} onChange={e => set('total', e.target.value)} required min="0" />
            </div>
            {tipe === 'expense' && (
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-select" value={form.kategori} onChange={e => set('kategori', e.target.value)}>
                  <option value="">Pilih Kategori</option>
                  {KATEGORI_LIST.filter(k => k !== 'Pemasukan').map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
            )}
            {tipe !== 'cash' && (
              <div className="form-group">
                <label className="form-label">Metode</label>
                <select className="form-select" value={form.metode} onChange={e => set('metode', e.target.value)}>
                  {METODE_LIST.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Bank / Dompet</label>
              <select className="form-select" value={form.bank} onChange={e => set('bank', e.target.value)}>
                {BANK_LIST.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">User</label>
              <select className="form-select" value={form.user_id} onChange={e => set('user_id', e.target.value)} required>
                <option value="">Pilih User</option>
                {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
              </select>
            </div>
            {error && (
              <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', border: '1px solid var(--red)', borderColor: 'rgba(244,63,94,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                {saving ? 'Menyimpan...' : '✅ Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
