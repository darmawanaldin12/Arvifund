'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import EditModal from '../../components/modals/EditModal'
import { useToast } from '../../hooks/useToast'
import { fmt, fmtTanggalShort, KATEGORI_LIST, KATEGORI_COLOR, KATEGORI_ICON } from '../../lib/utils'
import { updateExpense } from '../../lib/data'

export default function ExpensesPage() {
  const { filteredExpenses, expenses, loadData, loading, periodIdx, setPeriodIdx, periods, getUserName, user, setExpenses } = useData()
  const { showToast, ToastContainer } = useToast()

  const [filterKat, setFilterKat]   = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [search, setSearch]         = useState('')
  const [editData, setEditData]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [sortKey, setSortKey]       = useState('tanggal')
  const [sortDir, setSortDir]       = useState('desc')

  const rows = useMemo(() => {
    let r = filteredExpenses.filter(r =>
      (!filterKat  || r.kategori === filterKat) &&
      (!filterUser || getUserName(r.user_id) === filterUser) &&
      (!search     || (r.toko + ' ' + r.uraian).toLowerCase().includes(search.toLowerCase()))
    )
    r = [...r].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (sortKey === 'tanggal') { va = a.tanggal || ''; vb = b.tanggal || '' }
      if (sortKey === 'nilai')   { va = a.nilai || 0; vb = b.nilai || 0 }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return r
  }, [filteredExpenses, filterKat, filterUser, search, sortKey, sortDir, getUserName])

  const total = rows.reduce((s, r) => s + (r.nilai || 0), 0)

  // Anomali threshold
  const avgNilai = filteredExpenses.length > 0
    ? filteredExpenses.reduce((s, r) => s + r.nilai, 0) / filteredExpenses.length : 0
  const anomaliThreshold = avgNilai * 3

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  async function handleSave(form) {
    setSaving(true)
    try {
      const bulan = form.tanggal ? new Date(form.tanggal).toLocaleDateString('id-ID', { month: 'long' }) : form.bulan
      await updateExpense(form.id, {
        toko: form.toko,
        tanggal: form.tanggal?.split('T')[0],
        bulan,
        transaksi: form.transaksi,
        uraian: form.uraian,
        kategori: form.kategori,
        bank: form.bank,
        nilai: form.nilai,
        edited_note: form.edited_note,
      }, user?.id)
      showToast('✅ Berhasil disimpan')
      setEditData(null)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const userNames = [...new Set(filteredExpenses.map(r => getUserName(r.user_id)).filter(Boolean))]

  return (
    <>
      <AppHeader title="Pengeluaran" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period Filter */}
        <div className="filter-bar">
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              className="form-input"
              placeholder="🔍 Cari toko / uraian..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 12 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <select className="form-select" value={filterKat} onChange={e => setFilterKat(e.target.value)} style={{ flex: 1 }}>
            <option value="">Semua Kategori</option>
            {KATEGORI_LIST.filter(k => k !== 'Pemasukan').map(k => <option key={k}>{k}</option>)}
          </select>
          <select className="form-select" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ flex: 1 }}>
            <option value="">Semua User</option>
            {userNames.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>

        {/* Summary bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          marginBottom: 12, fontSize: 13,
        }}>
          <span style={{ color: 'var(--text2)' }}><strong style={{ color: 'var(--text1)' }}>{rows.length}</strong> transaksi</span>
          <span>Total: <strong style={{ color: 'var(--red)' }}>{fmt(total)}</strong></span>
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
                  <th>Toko / Uraian</th>
                  <th>Kategori</th>
                  <th>Metode</th>
                  <th>Bank</th>
                  <th>User</th>
                  <th onClick={() => toggleSort('nilai')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Nilai {sortKey === 'nilai' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="emoji">🔍</div>
                      <p>Tidak ada data</p>
                    </div>
                  </td></tr>
                ) : rows.map(r => {
                  const isAnom = r.nilai >= anomaliThreshold && r.nilai > 100000
                  const color  = KATEGORI_COLOR[r.kategori] || 'var(--text3)'
                  return (
                    <tr key={r.id} style={isAnom ? { background: 'rgba(244,63,94,0.04)', borderLeft: '3px solid var(--red)' } : {}}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtTanggalShort(r.tanggal)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {r.toko || '—'}
                          {isAnom && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>⚠</span>}
                          {r.edited_at && <span style={{ fontSize: 10, color: 'var(--yellow)' }}>✏️</span>}
                        </div>
                        {r.uraian && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.uraian}</div>}
                      </td>
                      <td>
                        <span className="badge" style={{ background: `${color}22`, color }}>
                          {KATEGORI_ICON[r.kategori] || ''} {r.kategori}
                        </span>
                      </td>
                      <td><span className="badge badge-gray">{r.transaksi || '—'}</span></td>
                      <td><span className="badge badge-blue">{r.bank || '—'}</span></td>
                      <td>
                        <span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>
                          {getUserName(r.user_id)}
                        </span>
                      </td>
                      <td className="amount" style={{ color: isAnom ? 'var(--orange)' : 'var(--red)' }}>
                        {fmt(r.nilai)}
                      </td>
                      <td>
                        <button className="edit-btn" onClick={() => setEditData(r)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {editData && (
        <EditModal
          type="expense"
          data={editData}
          onSave={handleSave}
          onClose={() => setEditData(null)}
          loading={saving}
        />
      )}

      <ToastContainer />
    </>
  )
}
