'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import EditModal from '../../components/modals/EditModal'
import ExportPDF from '../../components/ExportPDF'
import { useToast } from '../../hooks/useToast'
import { fmt, fmtTanggalShort, KATEGORI_LIST, KATEGORI_COLOR, KATEGORI_ICON, BULAN_ORDER } from '../../lib/utils'
import { updateExpense, updateIncome } from '../../lib/data'
import AppSelect from '../../components/ui/AppSelect'

// ── CSV EXPORT ──────────────────────────────────────────────
function exportCSV(rows, getUserName, type) {
  const escape = v => {
    if (v == null) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const headers = type === 'expense'
    ? ['Tanggal', 'Bulan', 'Toko', 'Uraian', 'Kategori', 'Metode', 'Bank', 'User', 'Nilai']
    : ['Tanggal', 'Bulan', 'Sumber', 'Keterangan', 'Metode', 'Bank', 'User', 'Jumlah']
  const csvRows = [
    headers.join(','),
    ...rows.map(r => type === 'expense'
      ? [r.tanggal, r.bulan, r.toko, r.uraian, r.kategori, r.transaksi, r.bank, getUserName(r.user_id), r.nilai].map(escape).join(',')
      : [r.tanggal, r.bulan, r.sumber, r.items, r.metode, r.bank, getUserName(r.user_id), r.jumlah].map(escape).join(',')
    )
  ]
  const csv = '\uFEFF' + csvRows.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `arvifund-${type}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TransaksiPage() {
  const {
    filteredExpenses, filteredIncome,
    loadData, loading,
    periodIdx, setPeriodIdx, periods,
    getUserName, user,
  } = useData()
  const { showToast, ToastContainer } = useToast()

  const [tab, setTab]               = useState('expense') // 'expense' | 'income'
  const [filterKat, setFilterKat]   = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [search, setSearch]         = useState('')
  const [editData, setEditData]     = useState(null)
  const [editType, setEditType]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [sortKey, setSortKey]       = useState('tanggal')
  const [sortDir, setSortDir]       = useState('desc')
  const [exporting, setExporting]   = useState(false)

  // Reset filter saat ganti tab
  function switchTab(t) {
    setTab(t)
    setFilterKat('')
    setFilterUser('')
    setSearch('')
    setSortKey('tanggal')
    setSortDir('desc')
  }

  // ── Expense rows ──
  const expenseRows = useMemo(() => {
    let r = filteredExpenses.filter(r =>
      (!filterKat  || r.kategori === filterKat) &&
      (!filterUser || getUserName(r.user_id) === filterUser) &&
      (!search     || (r.toko + ' ' + (r.uraian || '')).toLowerCase().includes(search.toLowerCase()))
    )
    return [...r].sort((a, b) => {
      let va = sortKey === 'nilai' ? (a.nilai || 0) : (a[sortKey] || '')
      let vb = sortKey === 'nilai' ? (b.nilai || 0) : (b[sortKey] || '')
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredExpenses, filterKat, filterUser, search, sortKey, sortDir, getUserName])

  // ── Income rows ──
  const incomeRows = useMemo(() => {
    let r = filteredIncome.filter(r =>
      (!filterUser || getUserName(r.user_id) === filterUser) &&
      (!search || (r.sumber + ' ' + (r.items || '')).toLowerCase().includes(search.toLowerCase()))
    )
    return [...r].sort((a, b) => {
      let va = sortKey === 'jumlah' ? (a.jumlah || 0) : (a[sortKey] || '')
      let vb = sortKey === 'jumlah' ? (b.jumlah || 0) : (b[sortKey] || '')
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredIncome, filterUser, search, sortKey, sortDir, getUserName])

  const rows        = tab === 'expense' ? expenseRows : incomeRows
  const totalExp    = expenseRows.reduce((s, r) => s + (r.nilai || 0), 0)
  const totalInc    = incomeRows.reduce((s, r) => s + (r.jumlah || 0), 0)
  const activeTotal = tab === 'expense' ? totalExp : totalInc

  const avgNilai         = filteredExpenses.length > 0 ? filteredExpenses.reduce((s, r) => s + r.nilai, 0) / filteredExpenses.length : 0
  const anomaliThreshold = avgNilai * 3

  const userNamesExp = [...new Set(filteredExpenses.map(r => getUserName(r.user_id)).filter(Boolean))]
  const userNamesInc = [...new Set(filteredIncome.map(r => getUserName(r.user_id)).filter(Boolean))]
  const userNames    = tab === 'expense' ? userNamesExp : userNamesInc

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // ── Mini bar chart untuk income ──
  const byBulan = {}
  incomeRows.forEach(r => { byBulan[r.bulan] = (byBulan[r.bulan] || 0) + (r.jumlah || 0) })
  const bulanList = BULAN_ORDER.filter(b => byBulan[b])

  async function handleSaveExpense(form) {
    setSaving(true)
    try {
      const [, m] = (form.tanggal || '').split('-')
      const bulan = m ? BULAN_ORDER[parseInt(m) - 1] : form.bulan
      await updateExpense(form.id, {
        toko: form.toko, tanggal: form.tanggal?.split('T')[0], bulan,
        transaksi: form.transaksi, uraian: form.uraian,
        kategori: form.kategori, bank: form.bank,
        nilai: form.nilai, edited_note: form.edited_note,
      }, user?.id)
      showToast('✅ Berhasil disimpan')
      setEditData(null)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  async function handleSaveIncome(form) {
    setSaving(true)
    try {
      const [, m] = (form.tanggal || '').split('-')
      const bulan = m ? BULAN_ORDER[parseInt(m) - 1] : form.bulan
      await updateIncome(form.id, {
        sumber: form.sumber, tanggal: form.tanggal?.split('T')[0], bulan,
        jumlah: form.jumlah, metode: form.metode, kategori: form.kategori,
        items: form.items, bank: form.bank, edited_note: form.edited_note,
      }, user?.id)
      showToast('✅ Berhasil disimpan')
      setEditData(null)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  function handleExport() {
    if (rows.length === 0) { showToast('Tidak ada data untuk diekspor', 'error'); return }
    setExporting(true)
    try {
      exportCSV(rows, getUserName, tab)
      showToast(`✅ CSV berhasil diunduh (${rows.length} baris)`)
    } catch (e) {
      showToast('❌ Gagal export: ' + e.message, 'error')
    } finally { setExporting(false) }
  }

  return (
    <>
      <AppHeader title="Transaksi" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* ── Tabs Pengeluaran / Pemasukan ── */}
        <div style={{
          display: 'flex',
          background: 'var(--surface2)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 14,
          gap: 4,
        }}>
          {[
            { id: 'expense', label: '💸 Pengeluaran', color: 'var(--red)',   total: totalExp,  count: filteredExpenses.length },
            { id: 'income',  label: '💰 Pemasukan',  color: 'var(--green)', total: totalInc,  count: filteredIncome.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.18s ease',
                background: tab === t.id ? 'var(--surface)' : 'transparent',
                boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: tab === t.id ? t.color : 'var(--text3)', marginBottom: 2 }}>
                {t.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: tab === t.id ? t.color : 'var(--text3)' }}>
                {fmt(t.total)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{t.count} transaksi</div>
            </button>
          ))}
        </div>

        {/* Period Filter */}
        <div className="filter-bar">
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* Mini bar chart income */}
        {tab === 'income' && bulanList.length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="section-title">Pemasukan per Bulan</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 56 }}>
              {bulanList.map(b => {
                const val = byBulan[b] || 0
                const max = Math.max(...bulanList.map(b => byBulan[b] || 0))
                const pct = max > 0 ? (val / max) * 100 : 0
                return (
                  <div key={b} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ fontSize: 8, color: 'var(--text3)', fontWeight: 700 }}>{fmt(val)}</div>
                    <div style={{ width: '100%', height: `${pct}%`, minHeight: 4, background: 'var(--green)', borderRadius: 4 }} />
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>{b.substring(0, 3)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            className="form-input"
            placeholder={tab === 'expense' ? '🔍 Cari toko / uraian...' : '🔍 Cari sumber...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {tab === 'expense' && (
            <AppSelect
              value={filterKat}
              onChange={e => setFilterKat(e.target.value)}
              placeholder="Semua Kategori"
              options={KATEGORI_LIST.filter(k => k !== 'Pemasukan')}
              style={{ flex: 1 }}
            />
          )}
          <AppSelect
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            placeholder="Semua User"
            options={userNames}
            style={{ flex: 1 }}
          />
        </div>

        {/* Summary + Export — 2 baris agar muat di mobile */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          marginBottom: 12, fontSize: 13,
          overflow: 'hidden',
        }}>
          {/* Baris 1: info transaksi + tombol CSV */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', gap: 8,
          }}>
            <span><strong style={{ color: 'var(--text1)' }}>{rows.length}</strong> transaksi</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Total: <strong style={{ color: tab === 'expense' ? 'var(--red)' : 'var(--green)' }}>{fmt(activeTotal)}</strong></span>
              <button onClick={handleExport} disabled={exporting || rows.length === 0} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--surface2)',
                color: rows.length === 0 ? 'var(--text3)' : 'var(--accent)',
                fontSize: 12, fontWeight: 700, cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: rows.length === 0 ? 0.5 : 1,
              }}>
                {exporting
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                }
                CSV
              </button>
            </span>
          </div>
          {/* Baris 2: tombol Export PDF full width */}
          <div style={{
            padding: '0 14px 10px',
          }}>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <ExportPDF />
            </div>
          </div>
        </div>

        {/* ── Tabel Pengeluaran ── */}
        {tab === 'expense' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('tanggal')} style={{ cursor: 'pointer' }}>Tgl {sortKey === 'tanggal' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th>Toko / Uraian</th>
                    <th>Kat.</th>
                    <th>Bank</th>
                    <th>User</th>
                    <th onClick={() => toggleSort('nilai')} style={{ cursor: 'pointer', textAlign: 'right' }}>Nilai {sortKey === 'nilai' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="emoji">🔍</div><p>Tidak ada data</p></div></td></tr>
                  ) : expenseRows.map(r => {
                    const isAnom = r.nilai >= anomaliThreshold && r.nilai > 100000
                    const color  = KATEGORI_COLOR[r.kategori] || 'var(--text3)'
                    return (
                      <tr key={r.id} style={isAnom ? { background: 'rgba(244,63,94,0.04)' } : {}}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{fmtTanggalShort(r.tanggal)}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {r.toko || '—'}
                            {isAnom && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>⚠</span>}
                            {r.edited_at && <span style={{ fontSize: 10, color: 'var(--yellow)' }}>✏️</span>}
                          </div>
                          {r.uraian && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.uraian}</div>}
                        </td>
                        <td><span className="badge" style={{ background: `${color}22`, color }}>{KATEGORI_ICON[r.kategori] || ''} {r.kategori}</span></td>
                        <td><span className="badge badge-blue">{r.bank || '—'}</span></td>
                        <td><span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span></td>
                        <td className="amount" style={{ color: isAnom ? 'var(--orange)' : 'var(--red)' }}>{fmt(r.nilai)}</td>
                        <td>
                          <button className="edit-btn" onClick={() => { setEditData(r); setEditType('expense') }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tabel Pemasukan ── */}
        {tab === 'income' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('tanggal')} style={{ cursor: 'pointer' }}>Tgl {sortKey === 'tanggal' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th>Sumber / Ket.</th>
                    <th>Metode</th>
                    <th>Bank</th>
                    <th>User</th>
                    <th onClick={() => toggleSort('jumlah')} style={{ cursor: 'pointer', textAlign: 'right' }}>Jumlah {sortKey === 'jumlah' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {incomeRows.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="emoji">💰</div><p>Belum ada data</p></div></td></tr>
                  ) : incomeRows.map(r => (
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
                      <td><span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span></td>
                      <td className="amount" style={{ color: 'var(--green)' }}>{fmt(r.jumlah)}</td>
                      <td>
                        <button className="edit-btn" onClick={() => { setEditData(r); setEditType('income') }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {editData && editType && (
        <EditModal
          type={editType}
          data={editData}
          onSave={editType === 'expense' ? handleSaveExpense : handleSaveIncome}
          onClose={() => { setEditData(null); setEditType(null) }}
          loading={saving}
        />
      )}

      <ToastContainer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
