'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { fmt, fmtFull, fmtTanggalShort, BULAN_ORDER, KATEGORI_ICON, KATEGORI_COLOR, getMoMInfo, parseTanggal, buildPeriods } from '../../lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const { summaryPeriode, summaryAll, loading, loadData, periodIdx, setPeriodIdx, periods, payPeriodDate, expenses, income, cashRecords, budgetPlans, filteredExpenses, filteredIncome, filteredCashRecords, getUserName, profiles, user } = useData()
  const s  = summaryPeriode
  const sA = summaryAll

  const now = new Date()
  const bulanNama = BULAN_ORDER[now.getMonth()]

  const expBulanIni = s.byBulan[bulanNama] || 0
  const incBulanIni = s.incomeByBulan[bulanNama] || 0
  const hariIni = now.getDate()
  const totalHari = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const rataHarian = hariIni > 0 ? Math.round(expBulanIni / hariIni) : 0
  const proyeksi = rataHarian * totalHari
  const sisaHari = totalHari - hariIni

  const budgetBulan = (budgetPlans || [])
    .filter(p => p.bulan === bulanNama && p.tahun === now.getFullYear())
    .reduce((sum, p) => sum + (p.alokasi || 0), 0)
  const sisaBudget = budgetBulan - expBulanIni
  const pctBudget = budgetBulan > 0 ? Math.min(Math.round(expBulanIni / budgetBulan * 100), 100) : 0

  const bulanAda = BULAN_ORDER.filter(b => s.byBulan[b] || s.incomeByBulan[b])
  const bulanIniMom = bulanAda[bulanAda.length - 1]
  const bulanLaluMom = bulanAda[bulanAda.length - 2]
  const momIncome  = getMoMInfo(s.incomeByBulan[bulanIniMom] || 0, s.incomeByBulan[bulanLaluMom] || 0, 'income')
  const momExpense = getMoMInfo(s.byBulan[bulanIniMom] || 0, s.byBulan[bulanLaluMom] || 0, 'expense')
  const saldoIni   = (s.incomeByBulan[bulanIniMom] || 0) - (s.byBulan[bulanIniMom] || 0)
  const saldoLalu  = (s.incomeByBulan[bulanLaluMom] || 0) - (s.byBulan[bulanLaluMom] || 0)
  const momSaldo   = getMoMInfo(saldoIni, saldoLalu, 'income')

  const saldoTahun = (sA.totalIncome || 0) - (sA.totalExpenses || 0)
  const saldoTahunIni  = (sA.incomeByBulan[bulanIniMom] || 0) - (sA.byBulan[bulanIniMom] || 0)
  const saldoTahunLalu = (sA.incomeByBulan[bulanLaluMom] || 0) - (sA.byBulan[bulanLaluMom] || 0)
  const momSaldoTahun  = getMoMInfo(saldoTahunIni, saldoTahunLalu, 'income')

  const top5 = Object.entries(s.byKategori)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const avgNilai = filteredExpenses.length > 0
    ? filteredExpenses.reduce((sum, r) => sum + r.nilai, 0) / filteredExpenses.length : 0
  const anomali = filteredExpenses.filter(r => r.nilai > avgNilai * 3 && r.nilai > 100000).slice(0, 5)

  const recent = [...filteredExpenses]
    .sort((a, b) => {
      const da = parseTanggal(a.tanggal), db = parseTanggal(b.tanggal)
      return (db?.getTime() || 0) - (da?.getTime() || 0)
    }).slice(0, 10)

  function getWeekRange() {
    const d = new Date()
    const day = d.getDay()
    const start = new Date(d); start.setDate(d.getDate() - day)
    const end = new Date(start); end.setDate(start.getDate() + 6)
    return { start, end }
  }
  const { start: weekStart, end: weekEnd } = getWeekRange()
  const weeklyExp = filteredExpenses.filter(r => {
    const dt = parseTanggal(r.tanggal)
    return dt && dt >= weekStart && dt <= weekEnd
  })
  const weeklyTotal = weeklyExp.reduce((sum, r) => sum + r.nilai, 0)
  const weeklyCount = new Set(weeklyExp.map(r => r.tanggal?.split('T')[0])).size

  const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(weekStart.getDate() - 7)
  const prevWeekEnd   = new Date(weekEnd);   prevWeekEnd.setDate(weekEnd.getDate() - 7)
  const prevWeeklyExp = filteredExpenses.filter(r => {
    const dt = parseTanggal(r.tanggal)
    return dt && dt >= prevWeekStart && dt <= prevWeekEnd
  })
  const prevWeeklyTotal = prevWeeklyExp.reduce((sum, r) => sum + r.nilai, 0)
  const momWeekly = getMoMInfo(weeklyTotal, prevWeeklyTotal, 'expense')

  const userSplit = Object.entries(s.byUser).map(([uid, val]) => ({
    name: getUserName(uid), val, pct: s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
  }))

  function buildHeatmap() {
    const cells = []
    const today = new Date()
    const start = new Date(today); start.setDate(today.getDate() - 41)
    const expMap = {}
    filteredExpenses.forEach(r => {
      const dt = parseTanggal(r.tanggal)
      if (!dt) return
      const key = dt.toISOString().split('T')[0]
      expMap[key] = (expMap[key] || 0) + r.nilai
    })
    const vals = Object.values(expMap)
    const maxVal = vals.length ? Math.max(...vals) : 1
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i)
      const key = d.toISOString().split('T')[0]
      const val = expMap[key] || 0
      const ratio = maxVal > 0 ? val / maxVal : 0
      const lv = ratio > 0.75 ? 'lv4' : ratio > 0.5 ? 'lv3' : ratio > 0.25 ? 'lv2' : ratio > 0 ? 'lv1' : ''
      cells.push({ key, lv, val, d })
    }
    return cells
  }
  const heatmap = buildHeatmap()

  const periodLabel = periodIdx !== '' && periods[parseInt(periodIdx)]
    ? periods[parseInt(periodIdx)].label : 'Semua'

  if (loading) return <LoadingState />

  return (
    <>
      <AppHeader onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period Filter */}
        <div style={{ marginBottom: 16 }}>
          <div className="filter-bar">
            <div
              className={`filter-chip${periodIdx === '' ? ' active' : ''}`}
              onClick={() => setPeriodIdx('')}
            >Semua</div>
            {periods.map((p, i) => (
              <div
                key={i}
                className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`}
                onClick={() => setPeriodIdx(String(i))}
              >{p.label}</div>
            ))}
          </div>
          {periodIdx !== '' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Periode:</span>
              <span className="periode-badge">{periodLabel}</span>
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div className="kpi-grid">
          {/* Income */}
          <div className="kpi-card income" onClick={() => router.push('/income')} style={{ cursor: 'pointer' }}>
            <div className="kpi-top">
              <div className="kpi-icon income">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              </div>
              <span className="kpi-label">Total Pemasukan</span>
            </div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>{fmt(s.totalIncome)}</div>
            <div className="kpi-sub">tahun ini</div>
            {momIncome && <span className={`kpi-mom ${momIncome.cls}`}>{momIncome.label} vs {bulanLaluMom}</span>}
          </div>

          {/* Expense */}
          <div className="kpi-card expense" onClick={() => router.push('/expenses')} style={{ cursor: 'pointer' }}>
            <div className="kpi-top">
              <div className="kpi-icon expense">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                  <polyline points="17 18 23 18 23 12"/>
                </svg>
              </div>
              <span className="kpi-label">Total Pengeluaran</span>
            </div>
            <div className="kpi-value" style={{ color: 'var(--red)' }}>{fmt(s.totalExpenses)}</div>
            <div className="kpi-sub">{s.expensesCount} transaksi</div>
            {momExpense && <span className={`kpi-mom ${momExpense.cls}`}>{momExpense.label} vs {bulanLaluMom}</span>}
          </div>

          {/* Saldo Periode */}
          <div className="kpi-card saldo" onClick={() => router.push('/record')} style={{ cursor: 'pointer' }}>
            <div className="kpi-top">
              <div className="kpi-icon saldo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="kpi-label">Saldo Periode</span>
            </div>
            <div className="kpi-value" style={{ color: s.saldo >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(s.saldo)}</div>
            <div className="kpi-sub">income − pengeluaran periode</div>
            {momSaldo && <span className={`kpi-mom ${momSaldo.cls}`}>{momSaldo.label} vs {bulanLaluMom}</span>}
          </div>

          {/* Saldo Tahun */}
          <div className="kpi-card saldo-tahun" onClick={() => router.push('/record')} style={{ cursor: 'pointer' }}>
            <div className="kpi-top">
              <div className="kpi-icon saldo-tahun">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span className="kpi-label">Saldo Tahun Ini</span>
            </div>
            <div className="kpi-value" style={{ color: saldoTahun >= 0 ? 'var(--purple)' : 'var(--red)' }}>{fmt(saldoTahun)}</div>
            <div className="kpi-sub">total income − total pengeluaran</div>
            {momSaldoTahun && <span className={`kpi-mom ${momSaldoTahun.cls}`}>{momSaldoTahun.label} vs {bulanLaluMom}</span>}
          </div>

          {/* Tarik Tunai */}
          <div className="kpi-card cash" onClick={() => router.push('/cashrecord')} style={{ gridColumn: 'span 2', cursor: 'pointer' }}>
            <div className="kpi-top">
              <div className="kpi-icon cash">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M6 12h.01M18 12h.01"/>
                </svg>
              </div>
              <span className="kpi-label">Tarik Tunai</span>
            </div>
            <div className="kpi-value" style={{ color: 'var(--yellow)' }}>{fmt(s.totalCash)}</div>
            <div className="kpi-sub">{s.cashrecordCount} transaksi</div>
          </div>
        </div>

        {/* Scorecard */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="scorecard-grid">
            <div className="scorecard-item">
              <div className="scorecard-label">Pengeluaran {bulanNama}</div>
              <div className={`scorecard-value red`}>{fmt(expBulanIni)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>dari {fmt(incBulanIni)} pemasukan</div>
            </div>
            <div className="scorecard-item">
              <div className="scorecard-label">Rata-rata Harian</div>
              <div className="scorecard-value yellow">{fmt(rataHarian)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>per hari · {hariIni} hari data</div>
            </div>
            <div className="scorecard-item">
              <div className="scorecard-label">Proyeksi Akhir Bulan</div>
              <div className={`scorecard-value ${proyeksi > budgetBulan && budgetBulan > 0 ? 'red' : ''}`}>{fmt(proyeksi)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sisaHari > 0 ? `${sisaHari} hari tersisa` : 'bulan selesai'}</div>
            </div>
            <div className="scorecard-item" onClick={() => router.push('/budget')} style={{ cursor: 'pointer' }}>
              <div className="scorecard-label">Sisa Budget {bulanNama}</div>
              <div className={`scorecard-value ${sisaBudget < 0 ? 'red' : 'green'}`}>
                {budgetBulan > 0 ? fmt(Math.abs(sisaBudget)) : '—'}
              </div>
              {budgetBulan > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {sisaBudget < 0 ? '⚠ over budget · ' : ''}{pctBudget}% dari {fmt(budgetBulan)}
                  </div>
                  <div className="progress-wrap" style={{ marginTop: 6 }}>
                    <div className={`progress-bar ${pctBudget >= 100 ? 'danger' : pctBudget >= 80 ? 'warn' : 'ok'}`}
                      style={{ width: `${pctBudget}%` }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ringkasan Mingguan */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Ringkasan Mingguan
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'none' }}>
              {weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>{fmt(weeklyTotal)}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{weeklyCount} hari ada transaksi</div>
            </div>
            {momWeekly && (
              <span className={`kpi-mom ${momWeekly.cls}`}>{momWeekly.label} vs minggu lalu</span>
            )}
          </div>
        </div>

        {/* User Split */}
        {userSplit.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              Pengeluaran per User
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {userSplit.map(u => (
                <div key={u.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(u.val)} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({u.pct}%)</span></span>
                  </div>
                  <div className="progress-wrap">
                    <div className="progress-bar ok" style={{ width: `${u.pct}%`, background: u.name === 'Aldin' ? 'var(--accent)' : '#ec4899' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 5 Kategori */}
        {top5.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Top 5 Kategori
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top5.map(([kat, val]) => {
                const pct = s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
                const color = KATEGORI_COLOR[kat] || 'var(--accent)'
                return (
                  <div key={kat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {KATEGORI_ICON[kat] || '📦'} {kat}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(val)} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({pct}%)</span></span>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Budget vs Realisasi */}
        {s.budgetVsReal && s.budgetVsReal.length > 0 && (
          <div className="card" onClick={() => router.push('/budget')} style={{ marginBottom: 16, cursor: 'pointer' }}>
            <div className="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              Budget vs Realisasi
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {s.budgetVsReal.filter(b => b.alokasi > 0).map(b => (
                <div key={b.kategori}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{KATEGORI_ICON[b.kategori] || '📦'} {b.kategori}</span>
                    <span style={{ fontSize: 12, color: b.pct >= 100 ? 'var(--red)' : 'var(--text2)' }}>
                      {fmt(b.realisasi)} / {fmt(b.alokasi)}
                    </span>
                  </div>
                  <div className="progress-wrap">
                    <div
                      className={`progress-bar ${b.pct >= 100 ? 'danger' : b.pct >= 80 ? 'warn' : 'ok'}`}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {b.pct}% terpakai{b.pct >= 100 ? ' ⚠ over' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Aktivitas 6 Minggu
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
              <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--text3)', fontWeight: 700 }}>{d}</div>
            ))}
          </div>
          <div className="heatmap-grid">
            {heatmap.map((cell, i) => (
              <div key={i} className={`heatmap-cell${cell.lv ? ' ' + cell.lv : ''}`}
                title={cell.val > 0 ? `${cell.key}: ${fmtFull(cell.val)}` : cell.key} />
            ))}
          </div>
        </div>

        {/* Anomali */}
        {anomali.length > 0 && (
          <div className="card" onClick={() => router.push('/expenses')} style={{ marginBottom: 16, cursor: 'pointer' }}>
            <div className="section-title" style={{ color: 'var(--red)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Transaksi Anomali
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Toko / Uraian</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'right' }}>Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {anomali.map(r => (
                    <tr key={r.id} className="anomali-row">
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text3)' }}>{fmtTanggalShort(r.tanggal)}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.toko || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.uraian || ''}</div>
                      </td>
                      <td><span className="badge badge-gray">{r.kategori}</span></td>
                      <td className="amount" style={{ color: 'var(--red)' }}>{fmt(r.nilai)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Transaksi */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Transaksi Terakhir
          </div>
          {recent.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">📭</div>
              <p>Belum ada transaksi</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Toko / Uraian</th>
                    <th>Kategori</th>
                    <th>User</th>
                    <th style={{ textAlign: 'right' }}>Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text3)' }}>{fmtTanggalShort(r.tanggal)}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.toko || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.uraian || ''}</div>
                      </td>
                      <td>
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>
                          {KATEGORI_ICON[r.kategori] || ''} {r.kategori}
                        </span>
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
          )}
        </div>

      </div>
    </>
  )
}

function LoadingState() {
  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: 'var(--bg)', zIndex: 99, borderBottom: '1px solid var(--border)' }} />
      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, marginTop: 8 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
        </div>
        <div className="skeleton" style={{ height: 120, borderRadius: 14, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 14, marginBottom: 16 }} />
      </div>
    </>
  )
          }
