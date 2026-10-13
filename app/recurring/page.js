'use client'
import { useEffect, useState, useCallback } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { useToast } from '../../hooks/useToast'
import { fmtFull, fmtTanggalShort, BANK_LIST, METODE_LIST } from '../../lib/utils'
import { KATEGORI_EXPENSE } from '../../lib/kategori'
import {
  listRecurring, createRecurring, updateRecurring, deleteRecurring,
  getOccurrence, isTableMissing,
} from '../../lib/recurring'
import KategoriIcon from '../../components/ui/KategoriIcon'

const EMPTY = { toko: '', uraian: '', kategori: 'Tagihan', nilai: '', hari: '', metode: 'Transfer', bank: 'BCA' }

export default function RecurringPage() {
  const { user, payPeriodDate, overrides } = useData()
  const { showToast, ToastContainer } = useToast()

  const [rows, setRows]     = useState(null) // null = memuat, false = fitur belum aktif
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try { setRows(await listRecurring()) }
    catch (e) {
      if (isTableMissing(e)) setRows(false)
      else { setRows([]); showToast('❌ Gagal memuat: ' + e.message, 'error') }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAdd(e) {
    e.preventDefault()
    const nilai = parseFloat(form.nilai)
    const hari  = parseInt(form.hari)
    if (!form.toko.trim())            return showToast('❌ Nama tagihan harus diisi', 'error')
    if (isNaN(nilai) || nilai <= 0)   return showToast('❌ Nominal harus lebih dari 0', 'error')
    if (isNaN(hari) || hari < 1 || hari > 31) return showToast('❌ Tanggal harus 1–31', 'error')
    setSaving(true)
    try {
      await createRecurring({
        user_id: user?.id, toko: form.toko.trim(), uraian: form.uraian.trim(),
        kategori: form.kategori, nilai, hari_tiap_bulan: hari, metode: form.metode, bank: form.bank,
      })
      setForm(EMPTY)
      showToast('✅ Transaksi berulang ditambahkan')
      await load()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  async function handleToggle(t) {
    try { await updateRecurring(t.id, { aktif: !t.aktif }); await load() }
    catch (err) { showToast('❌ Gagal: ' + err.message, 'error') }
  }

  async function handleDelete(t) {
    if (!window.confirm(`Hapus "${t.toko}" dari transaksi berulang? Transaksi yang sudah tercatat tidak ikut terhapus.`)) return
    try { await deleteRecurring(t.id); showToast('🗑️ Dihapus'); await load() }
    catch (err) { showToast('❌ Gagal: ' + err.message, 'error') }
  }

  const mine = (rows || []).filter(r => !user?.id || r.user_id === user.id)

  return (
    <>
      <AppHeader title="Transaksi Berulang" />
      <div className="page-container" style={{ maxWidth: 560 }}>

        {rows === false && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Fitur belum aktif</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              Tabel <code>recurring_transactions</code> belum ada di database. Jalankan file{' '}
              <code>supabase/migrations/add_recurring_transactions.sql</code> di Supabase SQL Editor, lalu muat ulang halaman ini.
            </div>
          </div>
        )}

        {rows !== false && (
          <>
            <form onSubmit={handleAdd} className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Tambah tagihan rutin</div>

              <div className="form-group">
                <label className="form-label">Nama tagihan</label>
                <input className="form-input" value={form.toko} onChange={e => setF('toko', e.target.value)} placeholder="mis. Listrik PLN" />
              </div>
              <div className="form-group">
                <label className="form-label">Keterangan (opsional)</label>
                <input className="form-input" value={form.uraian} onChange={e => setF('uraian', e.target.value)} placeholder="mis. Token listrik" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Nominal</label>
                  <input className="form-input" type="number" inputMode="numeric" value={form.nilai} onChange={e => setF('nilai', e.target.value)} placeholder="350000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal tiap bulan</label>
                  <input className="form-input" type="number" inputMode="numeric" min="1" max="31" value={form.hari} onChange={e => setF('hari', e.target.value)} placeholder="5" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-input" value={form.kategori} onChange={e => setF('kategori', e.target.value)}>
                  {KATEGORI_EXPENSE.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Metode</label>
                  <select className="form-input" value={form.metode} onChange={e => setF('metode', e.target.value)}>
                    {METODE_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rekening</label>
                  <select className="form-input" value={form.bank} onChange={e => setF('bank', e.target.value)}>
                    {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Tambah'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows === null && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Memuat...</div>}
              {rows !== null && mine.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>Belum ada transaksi berulang.</div>
              )}
              {mine.map(t => {
                const occ = getOccurrence(t, payPeriodDate, overrides)
                const statusText = !t.aktif ? 'Dijeda'
                  : !occ ? '—'
                  : occ.status === 'done' ? `Sudah dicatat periode ini`
                  : occ.status === 'due' ? (occ.daysUntil === 0 ? 'Jatuh tempo hari ini' : `Lewat ${Math.abs(occ.daysUntil)} hari`)
                  : `Jatuh tempo ${fmtTanggalShort(occ.dateStr)}`
                const statusColor = t.aktif && occ?.status === 'due' ? 'var(--red)' : occ?.status === 'done' ? 'var(--green)' : 'var(--text3)'
                return (
                  <div key={t.id} className="card" style={{ opacity: t.aktif ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <KategoriIcon kategori={t.kategori} size={18} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.toko}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                            Tiap tanggal {t.hari_tiap_bulan} · {t.kategori} · {t.metode}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--red)', flexShrink: 0 }}>{fmtFull(t.nilai)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{statusText}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleToggle(t)}>{t.aktif ? 'Jeda' : 'Aktifkan'}</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(t)}>Hapus</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      <ToastContainer />
    </>
  )
}
