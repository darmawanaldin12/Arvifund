'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import EditModal from '../../components/modals/EditModal'
import { useToast } from '../../hooks/useToast'
import { fmt, fmtTanggalShort } from '../../lib/utils'
import { updateCashRecord } from '../../lib/data'

export default function CashRecordPage() {
  const { filteredCashRecords, loadData, loading, periodIdx, setPeriodIdx, periods, getUserName, user, summaryPeriode } = useData()
  const { showToast, ToastContainer } = useToast()
  const [filterKat, setFilterKat]   = useState('')
  const [editData, setEditData]     = useState(null)
  const [saving, setSaving]         = useState(false)

  const rows = useMemo(() => {
    return filteredCashRecords
      .filter(r => !filterKat || r.kategori === filterKat)
      .sort((a, b) => (b.tanggal || '') > (a.tanggal || '') ? 1 : -1)
  }, [filteredCashRecords, filterKat])

  const total = rows.reduce((s, r) => s + (r.nilai || 0), 0)

  // Saldo cash per user
  const s = summaryPeriode
  const cashSaldoEntries = Object.entries(s.saldoCashByUser || {})

  async function handleSave(form) {
    setSaving(true)
    try {
      const bulan = form.tanggal
        ? new Date(form.tanggal).toLocaleDateString('id-ID', { month: 'long' })
        : form.bulan
      await updateCashRecord(form.id, {
        tanggal: form.tanggal?.split('T')[0],
        bulan,
        transaksi: form.transaksi,
        kategori: form.kategori,
        bank: form.bank,
        nilai: form.nilai,
        alamat: form.alamat,
        metode: form.metode,
        edited_note: form.edited_note,
      }, user?.id)
      showToast('✅ Berhasil disimpan')
      setEditData(null)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppHeader title="Tarik Tunai" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period Filter */}
        <div className="filter-bar">
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* Saldo Cash per User */}
        {cashSaldoEntries.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Saldo Cash per User</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {cashSaldoEntries.map(([uid, saldo]) => (
                <div key={uid} style={{ flex: 1, minWidth: 120, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                  <div className={`user-chip ${getUserName(uid)?.toLowerCase()}`} style={{ marginBottom: 6 }}>
                    {getUserName(uid)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmt(saldo)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>saldo cash</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    Tarik: {fmt(s.tarikTunaiByUser?.[uid] || 0)} · Pakai: {fmt(s.expensesCashByUser?.[uid] || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select className="form-select" value={filterKat} onChange={e => setFilterKat(e.target.value)}>
            <option value="">Semua Kategori</option>
            <option>Pengeluaran</option>
            <option>Pemasukan</option>
          </select>
        </div>

        {/* Summary */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          marginBottom: 12, fontSize: 13,
        }}>
          <span><strong>{rows.length}</strong> transaksi</span>
          <span>Total: <strong style={{ color: 'var(--yellow)' }}>{fmt(total)}</strong></span>
        </div>

        {/* Tabel */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan / Lokasi</th>
                  <th>Bank</th>
                  <th>User</th>
                  <th style={{ textAlign: 'right' }}>Nilai</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="emoji">🏧</div>
                      <p>Belum ada data tarik tunai</p>
                    </div>
                  </td></tr>
                ) : rows.map(r => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text3)' }}>{fmtTanggalShort(r.tanggal)}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {r.transaksi || '—'}
                        {r.edited_at && <span style={{ fontSize: 10, color: 'var(--yellow)' }}>✏️</span>}
                      </div>
                      {r.alamat && <div style={{ fontSize: 11, color: 'var(--text3)' }}>📍 {r.alamat}</div>}
                    </td>
                    <td><span className="badge badge-blue">{r.bank || '—'}</span></td>
                    <td>
                      <span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>
                        {getUserName(r.user_id)}
                      </span>
                    </td>
                    <td className="amount" style={{ color: 'var(--yellow)' }}>{fmt(r.nilai)}</td>
                    <td>
                      <button className="edit-btn" onClick={() => setEditData(r)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {editData && (
        <EditModal type="cash" data={editData} onSave={handleSave} onClose={() => setEditData(null)} loading={saving} />
      )}
      <ToastContainer />
    </>
  )
}
