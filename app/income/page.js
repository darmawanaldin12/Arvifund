'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import EditModal from '../../components/modals/EditModal'
import { useToast } from '../../hooks/useToast'
import { fmt, fmtTanggalShort, KATEGORI_LIST, BULAN_ORDER } from '../../lib/utils'
import { updateIncome } from '../../lib/data'
import AppSelect from '../../components/ui/AppSelect'

export default function IncomePage() {
  const { income, filteredIncome, loadData, loading, periodIdx, setPeriodIdx, periods, getUserName, user } = useData()
  const { showToast, ToastContainer } = useToast()

  const [search, setSearch]         = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [editData, setEditData]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [sortKey, setSortKey]       = useState('tanggal')
  const [sortDir, setSortDir]       = useState('desc')

  const rows = useMemo(() => {
    let r = filteredIncome.filter(r =>
      (!filterUser || getUserName(r.user_id) === filterUser) &&
      (!search || (r.sumber + ' ' + (r.items || '')).toLowerCase().includes(search.toLowerCase()))
    )
    r = [...r].sort((a, b) => {
      let va = sortKey === 'jumlah' ? (a.jumlah || 0) : (a[sortKey] || '')
      let vb = sortKey === 'jumlah' ? (b.jumlah || 0) : (b[sortKey] || '')
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return r
  }, [filteredIncome, filterUser, search, sortKey, sortDir, getUserName])

  const total = rows.reduce((s, r) => s + (r.jumlah || 0), 0)

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  async function handleSave(form) {
    setSaving(true)
    try {
      const bulan = form.tanggal
        ? new Date(form.tanggal).toLocaleDateString('id-ID', { month: 'long' })
        : form.bulan
      await updateIncome(form.id, {
        sumber: form.sumber,
        tanggal: form.tanggal?.split('T')[0],
        bulan,
        jumlah: form.jumlah,
        metode: form.metode,
        kategori: form.kategori,
        items: form.items,
        bank: form.bank,
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

  const userNames = [...new Set(filteredIncome.map(r => getUserName(r.user_id)).filter(Boolean))]

  // Monthly summary
  const byBulan = {}
  rows.forEach(r => { byBulan[r.bulan] = (byBulan[r.bulan] || 0) + (r.jumlah || 0) })
  const bulanList = BULAN_ORDER.filter(b => byBulan[b])

  return (
    <>
      <AppHeader title="Pemasukan" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period Filter */}
        <div className="filter-bar">
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* Monthly bar chart (mini) */}
        {bulanList.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Pemasukan per Bulan</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
              {bulanList.map(b => {
                const val = byBulan[b] || 0
                const max = Math.max(...bulanList.map(b => byBulan[b] || 0))
                const pct = max > 0 ? (val / max) * 100 : 0
                return (
                  <div key={b} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700 }}>{fmt(val)}</div>
                    <div style={{ width: '100%', height: `${pct}%`, minHeight: 4, background: 'var(--green)', borderRadius: 4, transition: 'height 0.6s' }} />
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>{b.substring(0, 3)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="form-input"
            placeholder="🔍 Cari sumber..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <AppSelect
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            placeholder="Semua User"
            options={userNames}
            style={{ flex: 1 }}
          />
        </div>

        {/* Summary */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          marginBottom: 12, fontSize: 13,
        }}>
          <span><strong style={{ color: 'var(--text1)' }}>{rows.length}</strong> transaksi</span>
          <span>Total: <strong style={{ color: 'var(--green)' }}>{fmt(total)}</strong></span>
        </div>

        {/* Tabel */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('tanggal')} style={{ cursor: 'pointer' }}>
                    Tanggal {sortKey === 'tanggal' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th>Sumber / Keterangan</th>
                  <th>Metode</th>
                  <th>Bank</th>
                  <th>User</th>
                  <th onClick={() => toggleSort('jumlah')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Jumlah {sortKey === 'jumlah' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="emoji">💰</div>
                      <p>Belum ada data</p>
                    </div>
                  </td></tr>
                ) : rows.map(r => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text3)' }}>{fmtTanggalShort(r.tanggal)}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {r.sumber || '—'}
                        {r.edited_at && <span style={{ fontSize: 10, color: 'var(--yellow)' }}>✏️</span>}
                      </div>
                      {r.items && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.items}</div>}
                    </td>
                    <td><span className="badge badge-gray">{r.metode || '—'}</span></td>
                    <td><span className="badge badge-blue">{r.bank || '—'}</span></td>
                    <td>
                      <span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>
                        {getUserName(r.user_id)}
                      </span>
                    </td>
                    <td className="amount" style={{ color: 'var(--green)' }}>{fmt(r.jumlah)}</td>
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
        <EditModal type="income" data={editData} onSave={handleSave} onClose={() => setEditData(null)} loading={saving} />
      )}
      <ToastContainer />
    </>
  )
}
