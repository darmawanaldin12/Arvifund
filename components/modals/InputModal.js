'use client'
import { useState } from 'react'
import { useData } from '../DataContext'
import { supabase } from '../../lib/supabase'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'

export default function InputModal({ onClose, onSuccess }) {
  const { user, profiles, loadData } = useData()
  const [mode, setMode]     = useState('manual') // 'manual' | 'ai'
  const [tipe, setTipe]     = useState('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    tanggal: today, toko: '', uraian: '', total: '',
    kategori: '', metode: 'Cash', bank: 'Cash',
    user_id: user?.id || '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function getBulan(tgl) {
    if (!tgl) return ''
    return BULAN_ORDER[new Date(tgl).getMonth()]
  }

  async function handleAIExtract() {
    if (!aiText.trim()) return
    setAiLoading(true)
    setError('')
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) throw new Error('API Key Gemini tidak ditemukan di .env.local')

      const systemInstruction = `Kamu adalah asisten keuangan pintar untuk aplikasi Arvifund. Tugasmu adalah mengekstrak data dari kalimat bahasa natural tentang transaksi keuangan menjadi format JSON terstruktur.
Hari ini adalah: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('id-ID', { weekday: 'long' })}).

Daftar Kategori yang valid: ${JSON.stringify(KATEGORI_LIST.filter(k => k !== 'Pemasukan'))}
Daftar Bank/Dompet yang valid: ${JSON.stringify(BANK_LIST)}
Daftar Metode yang valid: ${JSON.stringify(METODE_LIST)}
Daftar User yang tersedia (gunakan username untuk mencocokkan): ${JSON.stringify((profiles || []).map(p => ({ id: p.id, username: p.username })))}

Aturan ekstraksi:
1. "tipe": Tentukan apakah "expense" (jika pengeluaran/beli/bayar), "income" (jika pemasukan/gaji/transfer masuk), atau "cash" (jika tarik tunai/pengeluaran tunai mandiri).
2. "tanggal": Format "YYYY-MM-DD". Sesuaikan dengan kata penunjuk waktu seperti "kemarin", "hari ini", "2 hari lalu", atau tanggal spesifik.
3. "toko": Nama toko/merchant/sumber pemasukan/lokasi ATM.
4. "uraian": Deskripsi barang atau uraian transaksi secara singkat.
5. "total": Nominal angka murni tanpa simbol (misal 50000).
6. "kategori": Harus persis sama dengan salah satu di Daftar Kategori jika bertipe expense (bisa dikosongkan/diabaikan jika tipe income/cash).
7. "metode": Harus persis sama dengan salah satu di Daftar Metode (jika bertipe cash, default ke Cash).
8. "bank": Harus persis sama dengan salah satu di Daftar Bank/Dompet.
9. "user_id": Cari ID user yang paling cocok berdasarkan nama orang yang bertransaksi dari Daftar User. Jika tidak ada yang cocok, gunakan user yang sedang aktif.

Kembalikan HANYA objek JSON dengan skema berikut tanpa markdown block, kutipan, atau teks tambahan:
{
  "tipe": "expense" | "income" | "cash",
  "tanggal": "YYYY-MM-DD",
  "toko": "string",
  "uraian": "string",
  "total": number,
  "kategori": "string",
  "metode": "string",
  "bank": "string",
  "user_id": "string"
}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemInstruction}\n\nKalimat transaksi: "${aiText}"`
            }]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const resData = await response.json()
      const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResult) throw new Error('Gagal mendapatkan respon dari AI')

      const result = JSON.parse(textResult)

      // Pre-fill form
      setTipe(result.tipe || 'expense')
      setForm({
        tanggal: result.tanggal || today,
        toko: result.toko || '',
        uraian: result.uraian || '',
        total: result.total ? String(result.total) : '',
        kategori: result.kategori || '',
        metode: result.metode || 'Cash',
        bank: result.bank || 'Cash',
        user_id: result.user_id || user?.id || '',
      })

      // Switch back to manual tab so user can review
      setMode('manual')
    } catch (err) {
      setError('AI Gagal memproses kalimat: ' + err.message)
    } finally {
      setAiLoading(false)
    }
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
          <span className="modal-title">Input Transaksi</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="modal-body">
          {/* Mode Selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            <button type="button" onClick={() => setMode('manual')} style={{
              flex: 1, padding: '10px', background: 'none', border: 'none',
              borderBottom: mode === 'manual' ? '2px solid var(--accent)' : 'none',
              color: mode === 'manual' ? 'var(--accent)' : 'var(--text3)',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}>✍️ Input Manual</button>
            <button type="button" onClick={() => setMode('ai')} style={{
              flex: 1, padding: '10px', background: 'none', border: 'none',
              borderBottom: mode === 'ai' ? '2px solid var(--accent)' : 'none',
              color: mode === 'ai' ? 'var(--accent)' : 'var(--text3)',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}>🤖 Input AI</button>
          </div>

          {mode === 'ai' ? (
            <div>
              <div className="form-group">
                <label className="form-label">Tulis transaksi Anda dengan bahasa alami</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Contoh: Beli bakso kemarin habis 50.000 di warung berkah pakai BCA oleh Aldin"
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  style={{ resize: 'vertical', width: '100%', fontFamily: 'inherit' }}
                />
              </div>
              {error && (
                <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', border: '1px solid var(--red)', borderColor: 'rgba(244,63,94,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
                <button type="button" className="btn btn-primary" onClick={handleAIExtract} disabled={aiLoading} style={{ flex: 2 }}>
                  {aiLoading ? 'Sedang Memproses...' : '🤖 Ekstrak Data'}
                </button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
