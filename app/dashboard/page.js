'use client'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { fmt, fmtFull, fmtTanggalShort, BULAN_ORDER, KATEGORI_ICON, KATEGORI_COLOR, getMoMInfo, parseTanggal, getLocalDateStr, getLocalDate } from '../../lib/utils'

export default function DashboardPage() {
  const { summaryPeriode, summaryAll, loading, loadData, periodIdx, setPeriodIdx,
          periods, filteredExpenses, filteredIncome, filteredCashRecords,
          budgetPlans, getUserName, user, expenses, income } = useData()

  const s  = summaryPeriode
  const sA = summaryAll
  const now = getLocalDate()
  const bulanNama = BULAN_ORDER[now.getMonth()]

  const expBulanIni  = s.byBulan[bulanNama] || 0
  const incBulanIni  = s.incomeByBulan[bulanNama] || 0
  const hariIni      = now.getDate()
  const totalHari    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const rataHarian   = hariIni > 0 ? Math.round(expBulanIni / hariIni) : 0
  const proyeksi     = rataHarian * totalHari
  const sisaHari     = totalHari - hariIni

  const budgetBulan  = (budgetPlans || [])
    .filter(p => p.bulan === bulanNama && p.tahun === now.getFullYear())
    .reduce((sum, p) => sum + (p.alokasi || 0), 0)
  const sisaBudget   = budgetBulan - expBulanIni
  const pctBudget    = budgetBulan > 0 ? Math.min(Math.round(expBulanIni / budgetBulan * 100), 100) : 0

  const bulanAda     = BULAN_ORDER.filter(b => s.byBulan[b] || s.incomeByBulan[b])
  const bulanIniMom  = bulanAda[bulanAda.length - 1]
  const bulanLaluMom = bulanAda[bulanAda.length - 2]
  const momIncome    = getMoMInfo(s.incomeByBulan[bulanIniMom] || 0, s.incomeByBulan[bulanLaluMom] || 0, 'income')
  const momExpense   = getMoMInfo(s.byBulan[bulanIniMom] || 0, s.byBulan[bulanLaluMom] || 0, 'expense')
  const saldoTahun   = (sA.totalIncome || 0) - (sA.totalExpenses || 0)

  const top5         = Object.entries(s.byKategori).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const avgNilai     = filteredExpenses.length > 0 ? filteredExpenses.reduce((sum, r) => sum + r.nilai, 0) / filteredExpenses.length : 0
  const anomali      = filteredExpenses.filter(r => r.nilai > avgNilai * 3 && r.nilai > 100000).slice(0, 3)
  const recent       = [...filteredExpenses].sort((a, b) => (parseTanggal(b.tanggal)?.getTime() || 0) - (parseTanggal(a.tanggal)?.getTime() || 0)).slice(0, 10)

  // Weekly
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weeklyExp = filteredExpenses.filter(r => { const dt = parseTanggal(r.tanggal); return dt && dt >= weekStart && dt <= weekEnd })
  const weeklyTotal = weeklyExp.reduce((s, r) => s + r.nilai, 0)

  // Heatmap
  function buildHeatmap() {
    const cells = [], today = new Date(), start = new Date(today)
    start.setDate(today.getDate() - 41)
    const expMap = {}
    filteredExpenses.forEach(r => {
      const dt = parseTanggal(r.tanggal); if (!dt) return
      const key = getLocalDateStr(dt)
      expMap[key] = (expMap[key] || 0) + r.nilai
    })
    const maxVal = Math.max(...Object.values(expMap), 1)
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i)
      const key = getLocalDateStr(d)
      const val = expMap[key] || 0
      const ratio = val / maxVal
      const lv = ratio > 0.75 ? 'lv4' : ratio > 0.5 ? 'lv3' : ratio > 0.25 ? 'lv2' : ratio > 0 ? 'lv1' : ''
      cells.push({ key, lv, val })
    }
    return cells
  }
  const heatmap = buildHeatmap()

  // User split
  const userSplit = Object.entries(s.byUser).map(([uid, val]) => ({
    name: getUserName(uid), val, pct: s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
  }))

  if (loading) return <LoadingState />

  return (
    <>
      <AppHeader title="Financial Overview" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period Filter */}
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>
              {p.label}
            </div>
          ))}
        </div>

        {/* KPI Grid */}
        <div className="kpi-grid">
          <div className="kpi-card income">
            <div className="kpi-label">Total Pemasukan</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>{fmt(s.totalIncome)}</div>
            {momIncome && <span className={`kpi-mom ${momIncome.cls}`}>{momIncome.label} vs {bulanLaluMom}</span>}
          </div>
          <div className="kpi-card expense">
            <div className="kpi-label">Total Pengeluaran</div>
            <div className="kpi-value" style={{ color: 'var(--red)' }}>{fmt(s.totalExpenses)}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{s.expensesCount} transaksi</div>
            {momExpense && <span className={`kpi-mom ${momExpense.cls}`}>{momExpense.label} vs {bulanLaluMom}</span>}
          </div>
          <div className="kpi-card saldo">
            <div className="kpi-label">Saldo Periode</div>
            <div className="kpi-value" style={{ color: s.saldo >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(s.saldo)}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>income − pengeluaran</div>
          </div>
          <div className="kpi-card saldo-tahun">
            <div className="kpi-label">Saldo Tahun Ini</div>
            <div className="kpi-value" style={{ color: saldoTahun >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(saldoTahun)}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>total semua data</div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">

          {/* Scorecard 2x2 */}
          <div className="bento-4">
            <div className="scorecard-grid">
              {[
                { label: 'Bulan Ini', value: fmt(expBulanIni), cls: 'red', icon: 'calendar_today' },
                { label: 'Rata-rata Harian', value: fmt(rataHarian), cls: 'yellow', icon: 'query_stats' },
                { label: 'Proyeksi Akhir', value: fmt(proyeksi), cls: proyeksi > budgetBulan && budgetBulan > 0 ? 'red' : '', icon: 'insights' },
                { label: 'Sisa Budget', value: budgetBulan > 0 ? fmt(Math.abs(sisaBudget)) : '—', cls: sisaBudget < 0 ? 'red' : 'green', icon: 'account_balance' },
              ].map((item, i) => (
                <div key={i} className="scorecard-item">
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--accent)', marginBottom: 6, display: 'block' }}>{item.icon}</span>
                  <div className="scorecard-label">{item.label}</div>
                  <div className={`scorecard-value ${item.cls}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bento-4">
            <div className="card" style={{ height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Ringkasan Mingguan</div>
                <span className="badge badge-blue" style={{ fontSize: 10 }}>LIVE</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)' }}>{fmt(weeklyTotal)}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                {weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </div>
              {/* Mini bar chart */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 48 }}>
                {[0,1,2,3,4,5,6].map(d => {
                  const day = new Date(weekStart); day.setDate(weekStart.getDate() + d)
                  const key = getLocalDateStr(day)
                  const val = filteredExpenses.filter(r => r.tanggal?.startsWith(key)).reduce((s, r) => s + r.nilai, 0)
                  const maxDay = Math.max(...[0,1,2,3,4,5,6].map(x => {
                    const dx = new Date(weekStart); dx.setDate(weekStart.getDate() + x)
                    return filteredExpenses.filter(r => r.tanggal?.startsWith(getLocalDateStr(dx))).reduce((s,r) => s+r.nilai, 0)
                  }), 1)
                  const pct = (val / maxDay) * 100
                  return (
                    <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: pct > 70 ? 'var(--red)' : 'var(--accent)', borderRadius: '3px 3px 0 0', transition: 'height 0.6s', opacity: 0.7 + pct/300 }} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* User Spending */}
          <div className="bento-4">
            <div className="card" style={{ height: '100%' }}>
              <div className="section-title">Pengeluaran per User</div>
              {userSplit.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: 13 }}>Belum ada data</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {userSplit.map(u => (
                    <div key={u.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{u.pct}%</span>
                      </div>
                      <div className="progress-wrap" style={{ height: 8 }}>
                        <div className="progress-bar" style={{ width: `${u.pct}%`, background: u.name === 'Aldin' ? 'var(--accent)' : '#db2777' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Kategori */}
          <div className="bento-6">
            <div className="card">
              <div className="section-title">Top 5 Kategori Pengeluaran</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {top5.length === 0 ? (
                  <div style={{ color: 'var(--text3)', fontSize: 13 }}>Belum ada data</div>
                ) : top5.map(([kat, val]) => {
                  const pct = s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
                  const color = KATEGORI_COLOR[kat] || 'var(--accent)'
                  return (
                    <div key={kat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{KATEGORI_ICON[kat] || '📦'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{kat}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(val)} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({pct}%)</span></span>
                        </div>
                        <div className="progress-wrap" style={{ height: 6 }}>
                          <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Budget vs Realisasi */}
          <div className="bento-6">
            <div className="card">
              <div className="section-title">Budget vs Realisasi</div>
              {(s.budgetVsReal || []).filter(b => b.alokasi > 0).length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: 13 }}>Belum ada budget plan</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', fontWeight: 600, paddingBottom: 8, borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    <span>Kategori</span><span>Pemakaian (%)</span>
                  </div>
                  {(s.budgetVsReal || []).filter(b => b.alokasi > 0).map(b => (
                    <div key={b.kategori}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{b.kategori}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: b.pct >= 100 ? 'var(--red)' : b.pct >= 80 ? 'var(--yellow)' : 'var(--green)' }}>{b.pct}%</span>
                      </div>
                      <div className="progress-wrap" style={{ height: 10 }}>
                        <div className={`progress-bar ${b.pct >= 100 ? 'danger' : b.pct >= 80 ? 'warn' : 'ok'}`} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div className="bento-7">
            <div className="card">
              <div className="section-title">Heatmap Aktivitas Transaksi</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
                  <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>{d}</div>
                ))}
              </div>
              <div className="heatmap-grid">
                {heatmap.map((cell, i) => (
                  <div key={i} className={`heatmap-cell${cell.lv ? ' ' + cell.lv : ''}`}
                    title={cell.val > 0 ? `${cell.key}: ${fmtFull(cell.val)}` : cell.key} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text3)' }}>
                <span>Lebih sedikit</span><span>Lebih banyak</span>
              </div>
            </div>
          </div>

          {/* Anomali */}
          <div className="bento-5">
            <div className="card">
              <div className="section-title" style={{ color: 'var(--red)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>warning</span>
                Transaksi Anomali
              </div>
              {anomali.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="emoji">✅</div>
                  <p>Tidak ada anomali</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {anomali.map(r => (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', background: 'var(--red-bg)',
                      border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', borderColor: 'rgba(244,63,94,0.2)',
                    }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--red)', fontSize: 20, fontVariationSettings: "'FILL' 1", flexShrink: 0 }}>warning</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text1)' }}>{r.toko || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.uraian || fmtTanggalShort(r.tanggal)}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--red)', fontSize: 13, flexShrink: 0 }}>{fmt(r.nilai)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bento-12">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-title" style={{ marginBottom: 0 }}>10 Transaksi Terakhir</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Deskripsi</th>
                      <th>Kategori</th>
                      <th>User</th>
                      <th style={{ textAlign: 'right' }}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Belum ada transaksi</td></tr>
                    ) : recent.map(r => (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text3)', fontSize: 12 }}>{fmtTanggalShort(r.tanggal)}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.toko || '—'}</div>
                          {r.uraian && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.uraian}</div>}
                        </td>
                        <td>
                          <span className="badge badge-gray">{KATEGORI_ICON[r.kategori] || ''} {r.kategori}</span>
                        </td>
                        <td>
                          <span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>
                            {getUserName(r.user_id)}
                          </span>
                        </td>
                        <td className="amount" style={{ color: 'var(--red)' }}>{fmt(r.nilai)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

function LoadingState() {
  return (
    <>
      <div style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} />
      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />)}
        </div>
      </div>
    </>
  )
}
