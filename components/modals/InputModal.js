'use client'
import { useState } from 'react'
import { useData } from '../DataContext'
import { supabase } from '../../lib/supabase'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'

export default function InputModal({ onClose, onSuccess }) {
  const { user, profiles, loadData } = useData()
  const [tipe, setTipe]         = useState('expense')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    tanggal:   today,
    toko:      '',
    uraian:    '',
    total:     '',
    kategori:  '',
    metode:    'Cash',
    bank:      'Cash',
    user_id:   user?.id || '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function getBulan(tgl) {
    if (!tgl) return ''
    const d = new Date(tgl)
    return BULAN_ORDER[d.getMonth()]
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.total || isNaN(parseFloat(form.total))) {
      setError('Total harus diisi dengan angka'); return
    }
    if (!form.user_id) {
      setError('User harus dipilih'); return
    }
    setSaving(true)
    try {
      const bulan = getBulan(form.tanggal)
      const nilai = parseFloat(form.total)

      if (tipe === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{
          toko:      form.toko,
          tanggal:   form.tanggal,
          bulan,
          transaksi: form.metode,
          uraian:    form.uraian,
          kategori:  form.kategori || 'Lainnya',
          bank:      form.bank,
          nilai,
          user_id:   form.user_id,
        }])
        if (err) throw err
      } else if (tipe === 'income') {
        const { error: err } = await supabase.from('income').insert([{
          sumber:  form.toko,
          tanggal: form.tanggal,
          bulan,
          jumlah:  nilai,
          metode:  form.metode,
          items:   form.uraian,
          bank:    form.bank,
          kategori:'Pemasukan',
          user_id: form.user_id,
        }])
        if (err) throw err
      } else if (tipe === 'cash') {
        const { error: err } = await supabase.from('cash_records').insert([{
          tanggal:   form.tanggal,
          bulan,
          transaksi: form.uraian || 'Tarik Tunai',
          kategori:  'Pengeluaran',
          bank:      form.bank,
          nilai,
          alamat:    form.toko,
          metode:    'Cash',
          user_id:   form.user_id,
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
    { id: 'expense', label: 'Pengeluaran', color: '#f43f5e', icon: '💸' },
    { id: 'income',  label: 'Pemasukan',   color: '#10b981', icon: '💰' },
    { id: 'cash',    label: 'Tarik Tunai', color: '#f59e0b', icon: '🏧' },
  ]

  const katList = tipe === 'income'
    ? ['Pemasukan']
    : KATEGORI_LIST.filter(k => k !== 'Pemasukan')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <span className="modal-title">Input Manual</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Pilih Tipe */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {TIPE_LIST.map(t => (
              <button key={t.id} type="button"
                onClick={() => setTipe(t.id)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: '2px solid',
                  borderColor: tipe === t.id ? t.color : 'var(--border)',
                  background: tipe === t.id ? `${t.color}18` : 'var(--surface2)',
                  color: tipe === t.id ? t.color : 'var(--text3)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tanggal */}
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input className="form-input" type="date" value={form.tanggal}
                onChange={e => set('tanggal', e.target.value)} required />
            </div>

            {/* Toko / Sumber / Lokasi ATM */}
            <div className="form-group">
              <label className="form-label">
                {tipe === 'income' ? 'Sumber' : tipe === 'cash' ? 'Lokasi ATM' : 'Toko / Merchant'}
              </label>
              <input className="form-input" type="text"
                placeholder={tipe === 'income' ? 'Nama perusahaan / sumber' : tipe === 'cash' ? 'Nama ATM / lokasi' : 'Nama toko'}
                value={form.toko} onChange={e => set('toko', e.target.value)} />
            </div>

            {/* Uraian */}
            <div className="form-group">
              <label className="form-label">
                {tipe === 'income' ? 'Keterangan' : tipe === 'cash' ? 'Keterangan' : 'Uraian / Items'}
              </label>
              <input className="form-input" type="text"
                placeholder={tipe === 'income' ? 'Gaji, Bonus, dll' : 'Deskripsi transaksi'}
                value={form.uraian} onChange={e => set('uraian', e.target.value)} />
            </div>

            {/* Total */}
            <div className="form-group">
              <label className="form-label">
                {tipe === 'income' ? 'Jumlah' : 'Total'}
              </label>
              <input className="form-input" type="number" inputMode="numeric"
                placeholder="0" value={form.total}
                onChange={e => set('total', e.target.value)} required min="0" />
            </div>

            {/* Kategori - hanya untuk expenses */}
            {tipe === 'expense' && (
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-select" value={form.kategori}
                  onChange={e => set('kategori', e.target.value)}>
                  <option value="">Pilih Kategori</option>
                  {katList.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
            )}

            {/* Metode - tidak untuk cash */}
            {tipe !== 'cash' && (
              <div className="form-group">
                <label className="form-label">Metode</label>
                <select className="form-select" value={form.metode}
                  onChange={e => set('metode', e.target.value)}>
                  {METODE_LIST.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Bank */}
            <div className="form-group">
              <label className="form-label">Bank / Dompet</label>
              <select className="form-select" value={form.bank}
                onChange={e => set('bank', e.target.value)}>
                {BANK_LIST.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>

            {/* User */}
            <div className="form-group">
              <label className="form-label">User</label>
              <select className="form-select" value={form.user_id}
                onChange={e => set('user_id', e.target.value)} required>
                <option value="">Pilih User</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.username}</option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{
                padding: '10px 12px', marginBottom: 12,
                background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600,
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
                Batal
              </button>
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
