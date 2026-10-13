'use client'
import { useState } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import ChartCarousel from '../../components/ChartCarousel'
import ScorecardChartModal from '../../components/ScorecardChartModal'
import { fmt, BULAN_ORDER, getMoMInfo, parseTanggal, getLocalDateStr, getLocalDate, filterByPeriod, getCurrentPeriodIndex } from '../../lib/utils'
import { buildBudgetVsReal } from '../../lib/kategori'
import { periodDays, sumInPeriod, budgetOfPeriod } from '../../lib/scorecard-period'
import { cn } from '../../lib/utils-cn'
import Link from 'next/link'
import { TrendingUp, TrendingDown, BarChart2, Landmark, CalendarDays, Lightbulb } from 'lucide-react'
import DashboardLoadingState from '../../components/dashboard/DashboardLoadingState'
import ExportPDFButton from '../../components/dashboard/ExportPDFButton'
import { AnimatedAmount } from '../../hooks/useCountUp'
import {
  ScorecardCard, WeeklySummaryCard, UserSpendingCard,
  Top5KategoriCard, BudgetCard,
  AnomaliCard, RecentTransactionsCard,
} from '../../components/dashboard/DashboardCards'

export default function DashboardPage() {
  const {
    summaryPeriode, summaryAll, loading, loadData, periodIdx, setPeriodIdx,
    periods, filteredExpenses, budgetPlans, getUserName,
    expenses, income, cashRecords, transfers, payPeriodDate, overrides,
  } = useData()

  const s  = summaryPeriode
  const sA = summaryAll
  const now = getLocalDate()

  // Periode acuan untuk kartu Periode Ini / Rata-rata Harian / Proyeksi:
  // periode yang dipilih, atau periode berjalan kalau chip "Semua" aktif.
  const refIdx      = periodIdx !== '' ? parseInt(periodIdx) : getCurrentPeriodIndex(payPeriodDate, overrides)
  const refPeriod   = periods[refIdx] || periods[0]
  const refExpenses = refPeriod ? filterByPeriod(expenses, refIdx, payPeriodDate, overrides) : []
  const expPeriode  = refPeriod ? sumInPeriod(refExpenses, refPeriod) : 0
  const { total: totalHari, elapsed: hariBerjalan } = refPeriod ? periodDays(refPeriod) : { total: 0, elapsed: 0 }
  const rataHarian  = hariBerjalan > 0 ? Math.round(expPeriode / hariBerjalan) : 0
  const proyeksi    = rataHarian * totalHari
  const budgetRef   = refPeriod ? budgetOfPeriod(budgetPlans, refPeriod) : 0

  // Budget vs Realisasi mengikuti halaman Budget Plan: budget periode terpilih
  // (bulan di tanggal akhir periode), satu baris per kategori. periodIdx '' = Semua.
  const selectedPeriod = periodIdx !== '' ? periods[parseInt(periodIdx)] || null : null
  const budgetPeriode  = buildBudgetVsReal({ budgetPlans, expenses: filteredExpenses, period: selectedPeriod })
  const sisaBudget      = budgetPeriode.totalAlokasi - budgetPeriode.totalRealisasi

  const bulanAda     = BULAN_ORDER.filter(b => s.byBulan[b] || s.incomeByBulan[b])
  const bulanIniMom  = bulanAda[bulanAda.length - 1]
  const bulanLaluMom = bulanAda[bulanAda.length - 2]
  const momIncome    = getMoMInfo(s.incomeByBulan[bulanIniMom] || 0, s.incomeByBulan[bulanLaluMom] || 0, 'income')
  const momExpense   = getMoMInfo(s.byBulan[bulanIniMom] || 0, s.byBulan[bulanLaluMom] || 0, 'expense')
  const saldoTahun   = (sA.totalIncome || 0) - (sA.totalExpenses || 0)

  const top5     = Object.entries(s.byKategori).sort((a,b) => b[1]-a[1]).slice(0,5)
  const avgNilai = filteredExpenses.length > 0 ? filteredExpenses.reduce((s,r) => s+r.nilai, 0) / filteredExpenses.length : 0
  const anomali  = filteredExpenses.filter(r => r.nilai > avgNilai * 3 && r.nilai > 100000).slice(0,3)

  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weeklyTotal = filteredExpenses
    .filter(r => { const dt = parseTanggal(r.tanggal); return dt && dt >= weekStart && dt <= weekEnd })
    .reduce((s,r) => s+r.nilai, 0)

  const userSplit = Object.entries(s.byUser).map(([uid, val]) => ({
    name: getUserName(uid), val,
    pct: s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0,
  }))

  const scorecardItems = [
    { label: 'Periode Ini',      rawValue: expPeriode, value: fmt(expPeriode), cls: 'red',    Icon: CalendarDays, modalType: 'bulanIni' },
    { label: 'Rata-rata Harian', rawValue: rataHarian, value: fmt(rataHarian), cls: 'yellow', Icon: BarChart2,    modalType: 'rataHarian' },
    { label: 'Proyeksi Akhir',   rawValue: proyeksi,   value: fmt(proyeksi),   cls: proyeksi > budgetRef && budgetRef > 0 ? 'red' : '', Icon: Lightbulb, modalType: 'proyeksi' },
    {
      label: 'Sisa Budget',
      rawValue: budgetPeriode.totalAlokasi > 0 ? Math.abs(sisaBudget) : undefined,
      value: budgetPeriode.totalAlokasi > 0 ? fmt(Math.abs(sisaBudget)) : '—',
      cls: sisaBudget < 0 ? 'red' : 'green',
      Icon: Landmark, modalType: 'sisaBudget',
    },
  ]

  const kpiItems = [
    { href: '/income',   cls: 'income',      label: 'Total Pemasukan',   rawValue: s.totalIncome,   valueColor: 'kpi-value-green',  mom: momIncome,  icon: <TrendingUp size={16} /> },
    { href: '/expenses', cls: 'expense',     label: 'Total Pengeluaran', rawValue: s.totalExpenses, valueColor: 'kpi-value-red',    sub: `${s.expensesCount} transaksi`, mom: momExpense, icon: <TrendingDown size={16} /> },
    { href: '/record',   cls: 'saldo',       label: 'Saldo Periode',     rawValue: s.saldo,         valueColor: s.saldo >= 0 ? 'kpi-value-accent' : 'kpi-value-red', sub: 'income − pengeluaran', icon: <BarChart2 size={16} /> },
    { href: '/record',   cls: 'saldo-tahun', label: 'Saldo Tahun Ini',   rawValue: saldoTahun,      valueColor: saldoTahun >= 0 ? 'kpi-value-accent' : 'kpi-value-red', sub: 'total semua data', icon: <Landmark size={16} /> },
  ]

  const [modalType, setModalType] = useState(null)

  if (loading) return <DashboardLoadingState onRefresh={loadData} />

  return (
    <>
      <AppHeader title="Financial Overview" onRefresh={loadData} loading={loading} />
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="period-filter-bar" style={{ marginBottom: 0, flex: 1 }}>
            <button onClick={() => setPeriodIdx('')} className={cn('filter-chip', periodIdx === '' && 'active')}>Semua</button>
            {periods.map((p,i) => (
              <button key={i} onClick={() => setPeriodIdx(String(i))} className={cn('filter-chip', periodIdx === String(i) && 'active')}>{p.label}</button>
            ))}
          </div>
          <ExportPDFButton />
        </div>
        <div className="kpi-grid">
          {kpiItems.map(item => (
            <Link key={item.href+item.label} href={item.href} className="no-underline block">
              <div className={cn('kpi-card', item.cls)}>
                <div className="kpi-card-top">
                  <span className="kpi-label">{item.label}</span>
                  <span className={cn('kpi-icon', item.cls)}>{item.icon}</span>
                </div>
                <div className={cn('kpi-value', item.valueColor)}>
                  <AnimatedAmount value={item.rawValue ?? 0} formatter={fmt} duration={600} />
                </div>
                {item.sub && <div className="kpi-sub">{item.sub}</div>}
                {item.mom && (
                  <div className={cn('kpi-mom', item.mom.cls === 'good' || item.mom.cls === 'mom-good' ? 'good' : 'bad')}>
                    {item.mom.label} vs {bulanLaluMom}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
        <div className="bento-grid">
          <ScorecardCard items={scorecardItems} onItemClick={setModalType} />
          <WeeklySummaryCard weekStart={weekStart} weekEnd={weekEnd} weeklyTotal={weeklyTotal} filteredExpenses={filteredExpenses} now={now} />
          <UserSpendingCard userSplit={userSplit} />
          <Top5KategoriCard top5={top5} totalExpenses={s.totalExpenses} />
          <BudgetCard budgetVsReal={budgetPeriode.items} />
          <AnomaliCard anomali={anomali} />
          <div className="bento-12">
            <ChartCarousel expenses={expenses} income={income} budgetPlans={budgetPlans} summaryPeriode={summaryPeriode} />
          </div>
          <RecentTransactionsCard
            expenses={expenses}
            income={income}
            cashRecords={cashRecords}
            transfers={transfers}
            getUserName={getUserName}
          />
        </div>
      </div>
      <ScorecardChartModal
        open={modalType !== null} onClose={() => setModalType(null)}
        type={modalType}
        expenses={expenses} budgetPlans={budgetPlans}
        budgetPeriode={budgetPeriode}
        periods={periods} refPeriod={refPeriod} refExpenses={refExpenses}
      />
    </>
  )
}
