'use client'
import { useState } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import ChartCarousel from '../../components/ChartCarousel'
import ScorecardChartModal from '../../components/ScorecardChartModal'
import KategoriIcon from '../../components/ui/KategoriIcon'
import { fmt, fmtFull, fmtTanggalShort, BULAN_ORDER, KATEGORI_COLOR, getMoMInfo, parseTanggal, getLocalDateStr, getLocalDate } from '../../lib/utils'
import { cn } from '../../lib/utils-cn'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { AlertTriangle, CalendarDays, BarChart2, Lightbulb, Landmark, TrendingUp, TrendingDown } from 'lucide-react'

export default function DashboardPage() {
  const { summaryPeriode, summaryAll, loading, loadData, periodIdx, setPeriodIdx,
          periods, filteredExpenses, filteredIncome, filteredCashRecords,
          budgetPlans, getUserName, user, expenses, income } = useData()

  const s  = summaryPeriode
  const sA = summaryAll
  const now = getLocalDate()
  const bulanNama = BULAN_ORDER[now.getMonth()]

  const expBulanIni  = s.byBulan[bulanNama] || 0
  const hariIni      = now.getDate()
  const totalHari    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const rataHarian   = hariIni > 0 ? Math.round(expBulanIni / hariIni) : 0
  const proyeksi     = rataHarian * totalHari

  const budgetBulan  = (budgetPlans || [])
    .filter(p => p.bulan === bulanNama && p.tahun === now.getFullYear())
    .reduce((sum, p) => sum + (p.alokasi || 0), 0)
  const sisaBudget   = budgetBulan - expBulanIni

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

  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weeklyTotal = filteredExpenses
    .filter(r => { const dt = parseTanggal(r.tanggal); return dt && dt >= weekStart && dt <= weekEnd })
    .reduce((s, r) => s + r.nilai, 0)

  function buildHeatmap() {
    const cells = [], todayLocal = getLocalDate(), start = new Date(todayLocal)
    start.setDate(todayLocal.getDate() - 41)
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

  const userSplit = Object.entries(s.byUser).map(([uid, val]) => ({
    name: getUserName(uid), val, pct: s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
  }))

  const [modalType, setModalType] = useState(null)

  if (loading) return <LoadingState onRefresh={loadData} loading={loading} />

  const SCORECARD_ITEMS = [
    { label: 'Bulan Ini',        value: fmt(expBulanIni), cls: 'red',    Icon: CalendarDays, modalType: 'bulanIni' },
    { label: 'Rata-rata Harian', value: fmt(rataHarian),  cls: 'yellow', Icon: BarChart2,    modalType: 'rataHarian' },
    { label: 'Proyeksi Akhir',   value: fmt(proyeksi),    cls: proyeksi > budgetBulan && budgetBulan > 0 ? 'red' : '', Icon: Lightbulb, modalType: 'proyeksi' },
    { label: 'Sisa Budget',      value: budgetBulan > 0 ? fmt(Math.abs(sisaBudget)) : '\u2014', cls: sisaBudget < 0 ? 'red' : 'green', Icon: Landmark, modalType: 'sisaBudget' },
  ]

  return (
    <>
      <AppHeader title="Financial Overview" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* \u2500\u2500 Period Filter \u2500\u2500 */}
        <div className="period-filter-bar">
          <button
            onClick={() => setPeriodIdx('')}
            className={cn('filter-chip', periodIdx === '' && 'active')}
          >
            Semua
          </button>
          {periods.map((p, i) => (
            <button
              key={i}
              onClick={() => setPeriodIdx(String(i))}
              className={cn('filter-chip', periodIdx === String(i) && 'active')}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* \u2500\u2500 KPI Grid \u2500\u2500 */}
        <div className="kpi-grid">
          {[
            {
              href: '/income',
              cls: 'income',
              label: 'Total Pemasukan',
              value: fmt(s.totalIncome),
              valueColor: 'kpi-value-green',
              mom: momIncome,
              icon: <TrendingUp size={16} />,
            },
            {
              href: '/expenses',
              cls: 'expense',
              label: 'Total Pengeluaran',
              value: fmt(s.totalExpenses),
              valueColor: 'kpi-value-red',
              sub: `${s.expensesCount} transaksi`,
              mom: momExpense,
              icon: <TrendingDown size={16} />,
            },
            {
              href: '/record',
              cls: 'saldo',
              label: 'Saldo Periode',
              value: fmt(s.saldo),
              valueColor: s.saldo >= 0 ? 'kpi-value-accent' : 'kpi-value-red',
              sub: 'income \u2212 pengeluaran',
              icon: <BarChart2 size={16} />,
            },
            {
              href: '/record',
              cls: 'saldo-tahun',
              label: 'Saldo Tahun Ini',
              value: fmt(saldoTahun),
              valueColor: saldoTahun >= 0 ? 'kpi-value-accent' : 'kpi-value-red',
              sub: 'total semua data',
              icon: <Landmark size={16} />,
            },
          ].map(item => (
            <Link key={item.href + item.label} href={item.href} className="no-underline block">
              <div className={cn('kpi-card', item.cls)}>
                <div className="kpi-card-top">
                  <span className="kpi-label">{item.label}</span>
                  <span className={cn('kpi-icon', item.cls)}>{item.icon}</span>
                </div>
                <div className={cn('kpi-value', item.valueColor)}>{item.value}</div>
                {item.sub && <div className="kpi-sub">{item.sub}</div>}
                {item.mom && (
                  <div className={cn(
                    'kpi-mom',
                    item.mom.cls === 'good' || item.mom.cls === 'mom-good' ? 'good' : 'bad',
                  )}>
                    {item.mom.label} vs {bulanLaluMom}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* \u2500\u2500 Bento Grid \u2500\u2500 */}
        <div className="bento-grid">

          {/* Scorecard */}
          <div className="bento-4">
            <div className="dash-card">
              <div className="dash-card-header">Pengeluaran Bulan Ini</div>
              <div className="scorecard-grid">
                {SCORECARD_ITEMS.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setModalType(item.modalType)}
                    className={cn('scorecard-item', 'scorecard-item-btn')}
                    aria-label={`${item.label}: ${item.value}, tap untuk grafik`}
                  >
                    <div className="scorecard-item-icon">
                      <item.Icon size={18} />
                    </div>
                    <div className="scorecard-label">{item.label}</div>
                    <div className={`scorecard-value ${item.cls}`}>{item.value}</div>
                    <div className="scorecard-hint">tap untuk grafik</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bento-4">
            <Link href="/expenses" className="no-underline block h-full">
              <div className="dash-card dash-card-link">
                <div className="dash-card-header-row">
                  <span className="dash-card-header">Ringkasan Mingguan</span>
                  <span className="dash-badge-live">LIVE</span>
                </div>
                <div className="weekly-amount">{fmt(weeklyTotal)}</div>
                <div className="weekly-range">
                  {weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} \u2013 {weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </div>
                <div className="weekly-bars">
                  {[0,1,2,3,4,5,6].map(d => {
                    const day = new Date(weekStart); day.setDate(weekStart.getDate() + d)
                    const key = getLocalDateStr(day)
                    const val = filteredExpenses.filter(r => r.tanggal?.startsWith(key)).reduce((s, r) => s + r.nilai, 0)
                    const maxDay = Math.max(...[0,1,2,3,4,5,6].map(x => {
                      const dx = new Date(weekStart); dx.setDate(weekStart.getDate() + x)
                      return filteredExpenses.filter(r => r.tanggal?.startsWith(getLocalDateStr(dx))).reduce((s,r) => s+r.nilai, 0)
                    }), 1)
                    const pct = (val / maxDay) * 100
                    const isToday = getLocalDateStr(day) === getLocalDateStr(now)
                    const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
                    return (
                      <div key={d} className="weekly-bar-col">
                        <div
                          className="weekly-bar-fill"
                          style={{
                            height: `${Math.max(pct, 6)}%`,
                            background: isToday ? 'var(--accent)' : pct > 70 ? 'var(--red)' : 'var(--surface3)',
                          }}
                        />
                        <div className={cn('weekly-bar-label', isToday && 'today')}>{days[d]}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Link>
          </div>

          {/* User Spending */}
          <div className="bento-4">
            <div className="dash-card">
              <div className="dash-card-header">Pengeluaran per Anggota</div>
              {userSplit.length === 0 ? (
                <p className="dash-empty">Belum ada data</p>
              ) : (
                <div className="progress-list">
                  {userSplit.map(u => (
                    <div key={u.name} className="progress-row">
                      <div className="progress-row-top">
                        <span className="progress-label">{u.name}</span>
                        <span className="progress-pct">{u.pct}%</span>
                      </div>
                      <Progress
                        value={u.pct}
                        className="h-2 bg-[var(--surface2)]"
                        indicatorClassName={u.name === 'Aldin' ? 'bg-[var(--accent)]' : 'bg-[#db2777]'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Kategori */}
          <div className="bento-4">
            <Link href="/expenses" className="no-underline block">
              <div className="dash-card dash-card-link">
                <div className="dash-card-header">Top 5 Kategori</div>
                <div className="progress-list">
                  {top5.length === 0 ? (
                    <p className="dash-empty">Belum ada data</p>
                  ) : top5.map(([kat, val]) => {
                    const pct   = s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
                    const color = KATEGORI_COLOR[kat] || 'var(--accent)'
                    return (
                      <div key={kat} className="progress-row">
                        <div className="progress-row-top">
                          <span className="progress-row-kat">
                            <KategoriIcon kategori={kat} size={16} />
                            <span className="progress-label">{kat}</span>
                          </span>
                          <span className="progress-pct">
                            {fmt(val)}
                            <span className="progress-pct-sub"> ({pct}%)</span>
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5 bg-[var(--surface2)]" style={{ '--progress-color': color }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </Link>
          </div>

          {/* Budget vs Realisasi */}
          <div className="bento-4">
            <Link href="/budget" className="no-underline block">
              <div className="dash-card dash-card-link">
                <div className="dash-card-header">Budget vs Realisasi</div>
                {(s.budgetVsReal || []).filter(b => b.alokasi > 0).length === 0 ? (
                  <p className="dash-empty">Belum ada budget plan</p>
                ) : (
                  <div className="progress-list">
                    {(s.budgetVsReal || []).filter(b => b.alokasi > 0).slice(0, 5).map(b => (
                      <div key={b.kategori} className="progress-row">
                        <div className="progress-row-top">
                          <span className="progress-label">{b.kategori}</span>
                          <span className={cn(
                            'progress-pct',
                            b.pct >= 100 ? 'danger' : b.pct >= 80 ? 'warn' : 'ok',
                          )}>{b.pct}%</span>
                        </div>
                        <Progress
                          value={Math.min(b.pct, 100)}
                          className="h-2 bg-[var(--surface2)]"
                          indicatorClassName={b.pct >= 100 ? 'bg-[var(--red)]' : b.pct >= 80 ? 'bg-[var(--yellow)]' : 'bg-[var(--green)]'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Heatmap */}
          <div className="bento-4">
            <Link href="/expenses" className="no-underline block">
              <div className="dash-card dash-card-link">
                <div className="dash-card-header">Heatmap Aktivitas</div>
                <div className="heatmap-days">
                  {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
                    <div key={d} className="heatmap-day-label">{d}</div>
                  ))}
                </div>
                <div className="heatmap-grid">
                  {heatmap.map((cell, i) => (
                    <div
                      key={i}
                      className={`heatmap-cell${cell.lv ? ' ' + cell.lv : ''}`}
                      title={cell.val > 0 ? `${cell.key}: ${fmtFull(cell.val)}` : cell.key}
                    />
                  ))}
                </div>
                <div className="heatmap-legend">
                  <span>Sedikit</span><span>Banyak</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Anomali */}
          <div className="bento-4">
            <Link href="/expenses" className="no-underline block">
              <div className="dash-card dash-card-link">
                <div className="dash-card-header dash-card-header-danger">
                  <AlertTriangle size={15} />
                  Transaksi Anomali
                </div>
                {anomali.length === 0 ? (
                  <div className="dash-empty-center">
                    <div className="dash-empty-icon">\u2705</div>
                    <p>Tidak ada anomali</p>
                  </div>
                ) : (
                  <div className="anomali-list">
                    {anomali.map(r => (
                      <div key={r.id} className="anomali-item">
                        <AlertTriangle size={18} className="anomali-icon" />
                        <div className="anomali-info">
                          <div className="anomali-toko">{r.toko || '-'}</div>
                          <div className="anomali-uraian">{r.uraian || fmtTanggalShort(r.tanggal)}</div>
                        </div>
                        <span className="anomali-nilai">{fmt(r.nilai)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Chart Carousel */}
          <div className="bento-12">
            <ChartCarousel
              expenses={expenses}
              income={income}
              budgetPlans={budgetPlans}
              summaryPeriode={summaryPeriode}
            />
          </div>

          {/* Recent Transactions */}
          <div className="bento-12">
            <div className="dash-card dash-card-flush">
              <div className="dash-table-header">
                <span className="dash-card-header mb-0">10 Transaksi Terakhir</span>
                <Link href="/expenses" className="dash-see-all">Lihat semua \u2197</Link>
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
                      <tr><td colSpan={5} className="text-center py-8 text-[var(--text3)]">Belum ada transaksi</td></tr>
                    ) : recent.map(r => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap text-[var(--text3)] text-[12px] tabular-nums">{fmtTanggalShort(r.tanggal)}</td>
                        <td>
                          <div className="font-semibold text-[13px]">{r.toko || '\u2014'}</div>
                          {r.uraian && <div className="text-[11px] text-[var(--text3)]">{r.uraian}</div>}
                        </td>
                        <td>
                          <Badge variant="secondary" className="text-[11px] bg-[var(--surface2)] text-[var(--text2)] border-0 gap-1.5">
                            <KategoriIcon kategori={r.kategori} size={12} />
                            {r.kategori}
                          </Badge>
                        </td>
                        <td>
                          <span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>
                            {getUserName(r.user_id)}
                          </span>
                        </td>
                        <td className="amount text-[var(--red)]">{fmt(r.nilai)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ScorecardChartModal
        open={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType}
        filteredExpenses={filteredExpenses}
        expenses={expenses}
        budgetPlans={budgetPlans}
      />
    </>
  )
}

// ── Skeleton helper ──────────────────────────────────────────────────────────
function Sk({ w = '100%', h = 14, r = 8, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--surface2) 25%,var(--surface3) 50%,var(--surface2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      marginBottom: mb,
      flexShrink: 0,
    }} />
  )
}

function CardSk({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 16,
      ...style,
    }}>
      {children}
    </div>
  )
}

function LoadingState({ onRefresh, loading }) {
  return (
    <>
      {/* Header skeleton — sama persis struktur AppHeader */}
      <AppHeader title="Financial Overview" onRefresh={onRefresh} loading={true} />

      <div className="page-container">

        {/* Period chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflow: 'hidden' }}>
          {[72, 88, 80, 76, 84].map((w, i) => (
            <Sk key={i} w={w} h={32} r={99} />
          ))}
        </div>

        {/* KPI 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[0,1,2,3].map(i => (
            <CardSk key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <Sk w="55%" h={10} />
                <Sk w={28} h={28} r={9} />
              </div>
              <Sk w="75%" h={20} mb={6} />
              <Sk w="50%" h={10} />
            </CardSk>
          ))}
        </div>

        {/* Scorecard 2x2 */}
        <CardSk style={{ marginBottom: 12 }}>
          <Sk w="45%" h={11} mb={12} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 13, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <Sk w={28} h={28} r={9} />
                <Sk w="60%" h={9} />
                <Sk w="80%" h={16} />
              </div>
            ))}
          </div>
        </CardSk>

        {/* Weekly bars */}
        <CardSk style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Sk w="40%" h={11} />
            <Sk w={40} h={20} r={99} />
          </div>
          <Sk w="35%" h={22} mb={2} />
          <Sk w="28%" h={10} mb={14} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 56 }}>
            {[40,65,50,85,35,20,60].map((pct, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${pct}%`, borderRadius: '4px 4px 0 0', background: 'var(--surface3)' }} />
                <Sk w="90%" h={9} r={3} />
              </div>
            ))}
          </div>
        </CardSk>

        {/* 3 progress cards */}
        {[3, 5, 4].map((rows, ci) => (
          <CardSk key={ci} style={{ marginBottom: 12 }}>
            <Sk w="40%" h={11} mb={14} />
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} style={{ marginBottom: i < rows - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Sk w="38%" h={11} />
                  <Sk w="18%" h={11} />
                </div>
                <Sk w="100%" h={5} r={99} />
              </div>
            ))}
          </CardSk>
        ))}

        {/* Heatmap */}
        <CardSk style={{ marginBottom: 12 }}>
          <Sk w="38%" h={11} mb={12} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: 42 }).map((_, i) => (
              <Sk key={i} w="100%" h={14} r={3} />
            ))}
          </div>
        </CardSk>

        {/* Chart placeholder */}
        <CardSk style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <Sk w="42%" h={13} />
            <div style={{ display: 'flex', gap: 5 }}>
              {[0,1,2,3,4,5].map(i => <Sk key={i} w={i===1?16:6} h={6} r={3} />)}
            </div>
          </div>
          <Sk w="100%" h={160} r={8} mb={12} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Sk w={32} h={32} r={8} />
            <Sk w={40} h={11} />
            <Sk w={32} h={32} r={8} />
          </div>
        </CardSk>

        {/* Table */}
        <CardSk style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <Sk w="45%" h={13} />
            <Sk w={64} h={13} />
          </div>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <Sk w={36} h={36} r={11} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Sk w="55%" h={12} />
                <Sk w="35%" h={10} />
              </div>
              <Sk w={60} h={13} />
            </div>
          ))}
        </CardSk>

      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}
