'use client'
import { useState } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import ChartCarousel from '../../components/ChartCarousel'
import ScorecardChartModal from '../../components/ScorecardChartModal'
import { fmt, fmtFull, fmtTanggalShort, BULAN_ORDER, KATEGORI_ICON, KATEGORI_COLOR, getMoMInfo, parseTanggal, getLocalDateStr, getLocalDate } from '../../lib/utils'
import { cn } from '../../lib/utils-cn'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { Progress } from '../../components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Separator } from '../../components/ui/separator'

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

  // Weekly
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weeklyTotal = filteredExpenses
    .filter(r => { const dt = parseTanggal(r.tanggal); return dt && dt >= weekStart && dt <= weekEnd })
    .reduce((s, r) => s + r.nilai, 0)

  // Heatmap
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

  if (loading) return <LoadingState />

  return (
    <>
      <AppHeader title="Financial Overview" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* ── Period Filter — shadcn Tabs ── */}
        <div className="mb-5 overflow-x-auto pb-1 hide-scrollbar">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setPeriodIdx('')}
              className={cn(
                'filter-chip',
                periodIdx === '' && 'active',
              )}
            >
              Semua
            </button>
            {periods.map((p, i) => (
              <button
                key={i}
                onClick={() => setPeriodIdx(String(i))}
                className={cn(
                  'filter-chip',
                  periodIdx === String(i) && 'active',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Grid — shadcn Card ── */}
        <div className="kpi-grid mb-5">
          {[
            {
              href: '/income',
              cls: 'income',
              label: 'Total Pemasukan',
              value: fmt(s.totalIncome),
              valueColor: 'text-[var(--green)]',
              mom: momIncome,
            },
            {
              href: '/expenses',
              cls: 'expense',
              label: 'Total Pengeluaran',
              value: fmt(s.totalExpenses),
              valueColor: 'text-[var(--red)]',
              sub: `${s.expensesCount} transaksi`,
              mom: momExpense,
            },
            {
              href: '/record',
              cls: 'saldo',
              label: 'Saldo Periode',
              value: fmt(s.saldo),
              valueColor: s.saldo >= 0 ? 'text-[var(--accent)]' : 'text-[var(--red)]',
              sub: 'income − pengeluaran',
            },
            {
              href: '/record',
              cls: 'saldo-tahun',
              label: 'Saldo Tahun Ini',
              value: fmt(saldoTahun),
              valueColor: saldoTahun >= 0 ? 'text-[var(--accent)]' : 'text-[var(--red)]',
              sub: 'total semua data',
            },
          ].map(item => (
            <Link key={item.href + item.label} href={item.href} className="no-underline block">
              <div className={cn(
                'kpi-card', item.cls,
                'transition-all duration-200 hover:-translate-y-0.5',
                'hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)]',
                'cursor-pointer',
              )}>
                <div className="kpi-label">{item.label}</div>
                <div className={cn('kpi-value', item.valueColor)}>{item.value}</div>
                {item.sub && <div className="text-[11px] text-[var(--text3)] mb-1">{item.sub}</div>}
                {item.mom && (
                  <Badge variant="outline" className={cn(
                    'text-[10px] font-semibold border-0 px-2 py-0.5',
                    item.mom.cls === 'good' || item.mom.cls === 'mom-good'
                      ? 'bg-[var(--green-bg)] text-[var(--green)]'
                      : 'bg-[var(--red-bg)] text-[var(--red)]',
                  )}>
                    {item.mom.label} vs {bulanLaluMom}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* ── Bento Grid ── */}
        <div className="bento-grid">

          {/* Scorecard 2x2 */}
          <div className="bento-4">
            <div className="scorecard-grid">
              {[
                { label: 'Bulan Ini',        value: fmt(expBulanIni), cls: 'red',    icon: 'calendar_today',  modalType: 'bulanIni' },
                { label: 'Rata-rata Harian', value: fmt(rataHarian),  cls: 'yellow', icon: 'query_stats',     modalType: 'rataHarian' },
                { label: 'Proyeksi Akhir',   value: fmt(proyeksi),    cls: proyeksi > budgetBulan && budgetBulan > 0 ? 'red' : '', icon: 'insights',         modalType: 'proyeksi' },
                { label: 'Sisa Budget',      value: budgetBulan > 0 ? fmt(Math.abs(sisaBudget)) : '—', cls: sisaBudget < 0 ? 'red' : 'green', icon: 'account_balance', modalType: 'sisaBudget' },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={() => setModalType(item.modalType)}
                  className={cn(
                    'scorecard-item cursor-pointer',
                    'transition-all duration-150',
                    'hover:-translate-y-0.5 hover:shadow-md',
                    'active:scale-[0.97]',
                  )}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--accent)', marginBottom: 6, display: 'block' }}>
                    {item.icon}
                  </span>
                  <div className="scorecard-label">{item.label}</div>
                  <div className={`scorecard-value ${item.cls}`}>{item.value}</div>
                  <div className="text-[9px] text-[var(--text3)] mt-1 opacity-60">tap untuk grafik</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bento-4">
            <Link href="/expenses" className="no-underline block h-full">
              <Card className={cn(
                'h-full border-[var(--border)] bg-[var(--surface)]',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
              )}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="section-title mb-0">Ringkasan Mingguan</div>
                    <Badge className="text-[10px] bg-[var(--accent)] text-white border-0">LIVE</Badge>
                  </div>
                  <div className="text-[22px] font-extrabold text-[var(--text1)]">{fmt(weeklyTotal)}</div>
                  <div className="text-[12px] text-[var(--text3)] mb-4">
                    {weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </div>
                  {/* Mini bar */}
                  <div className="flex gap-[3px] items-end h-12">
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
                        <div key={d} className="flex-1 flex flex-col items-center gap-0.5">
                          <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: pct > 70 ? 'var(--red)' : 'var(--accent)', borderRadius: '3px 3px 0 0', transition: 'height 0.6s' }} />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* User Spending */}
          <div className="bento-4">
            <Card className="h-full border-[var(--border)] bg-[var(--surface)]">
              <CardContent className="p-4">
                <div className="section-title">Pengeluaran per User</div>
                {userSplit.length === 0 ? (
                  <p className="text-[var(--text3)] text-[13px]">Belum ada data</p>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {userSplit.map(u => (
                      <div key={u.name}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[13px] font-semibold">{u.name}</span>
                          <span className="text-[12px] text-[var(--text3)]">{u.pct}%</span>
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
              </CardContent>
            </Card>
          </div>

          {/* Top 5 Kategori */}
          <div className="bento-4">
            <Link href="/expenses" className="no-underline block">
              <Card className={cn(
                'border-[var(--border)] bg-[var(--surface)]',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
              )}>
                <CardContent className="p-4">
                  <div className="section-title">Top 5 Kategori</div>
                  <div className="flex flex-col gap-3.5">
                    {top5.length === 0 ? (
                      <p className="text-[var(--text3)] text-[13px]">Belum ada data</p>
                    ) : top5.map(([kat, val]) => {
                      const pct   = s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
                      const color = KATEGORI_COLOR[kat] || 'var(--accent)'
                      return (
                        <div key={kat} className="flex items-center gap-3">
                          <span className="text-[20px] shrink-0">{KATEGORI_ICON[kat] || '📦'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1.5">
                              <span className="text-[13px] font-semibold truncate">{kat}</span>
                              <span className="text-[13px] font-bold shrink-0 ml-2">
                                {fmt(val)} <span className="text-[var(--text3)] text-[11px]">({pct}%)</span>
                              </span>
                            </div>
                            <Progress value={pct} className="h-1.5 bg-[var(--surface2)]" style={{ '--progress-color': color } as any} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Budget vs Realisasi */}
          <div className="bento-4">
            <Link href="/budget" className="no-underline block">
              <Card className={cn(
                'border-[var(--border)] bg-[var(--surface)]',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
              )}>
                <CardContent className="p-4">
                  <div className="section-title">Budget vs Realisasi</div>
                  {(s.budgetVsReal || []).filter(b => b.alokasi > 0).length === 0 ? (
                    <p className="text-[var(--text3)] text-[13px]">Belum ada budget plan</p>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      {(s.budgetVsReal || []).filter(b => b.alokasi > 0).slice(0, 5).map(b => (
                        <div key={b.kategori}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[13px] font-semibold">{b.kategori}</span>
                            <span className={cn(
                              'text-[13px] font-bold',
                              b.pct >= 100 ? 'text-[var(--red)]' : b.pct >= 80 ? 'text-[var(--yellow)]' : 'text-[var(--green)]'
                            )}>{b.pct}%</span>
                          </div>
                          <Progress
                            value={Math.min(b.pct, 100)}
                            className="h-2.5 bg-[var(--surface2)]"
                            indicatorClassName={b.pct >= 100 ? 'bg-[var(--red)]' : b.pct >= 80 ? 'bg-[var(--yellow)]' : 'bg-[var(--green)]'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Heatmap */}
          <div className="bento-4">
            <Link href="/expenses" className="no-underline block">
              <Card className={cn(
                'border-[var(--border)] bg-[var(--surface)]',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
              )}>
                <CardContent className="p-4">
                  <div className="section-title">Heatmap Aktivitas</div>
                  <div className="flex gap-1 mb-2">
                    {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
                      <div key={d} className="flex-1 text-center text-[9px] text-[var(--text3)] font-semibold">{d}</div>
                    ))}
                  </div>
                  <div className="heatmap-grid">
                    {heatmap.map((cell, i) => (
                      <div key={i} className={`heatmap-cell${cell.lv ? ' ' + cell.lv : ''}`}
                        title={cell.val > 0 ? `${cell.key}: ${fmtFull(cell.val)}` : cell.key} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-[var(--text3)]">
                    <span>Sedikit</span><span>Banyak</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Anomali */}
          <div className="bento-4">
            <Link href="/expenses" className="no-underline block">
              <Card className={cn(
                'border-[var(--border)] bg-[var(--surface)]',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
              )}>
                <CardContent className="p-4">
                  <div className="section-title text-[var(--red)]">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>warning</span>
                    Transaksi Anomali
                  </div>
                  {anomali.length === 0 ? (
                    <div className="empty-state py-6">
                      <div className="emoji">✅</div>
                      <p>Tidak ada anomali</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {anomali.map(r => (
                        <div key={r.id} className={cn(
                          'flex items-center gap-2.5 p-2.5 rounded-lg',
                          'bg-[var(--red-bg)] border border-[rgba(244,63,94,0.2)]',
                        )}>
                          <span className="material-symbols-outlined shrink-0" style={{ color: 'var(--red)', fontSize: 20, fontVariationSettings: "'FILL' 1" }}>warning</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[13px] text-[var(--text1)] truncate">{r.toko || '-'}</div>
                            <div className="text-[11px] text-[var(--text3)] truncate">{r.uraian || fmtTanggalShort(r.tanggal)}</div>
                          </div>
                          <span className="font-bold text-[var(--red)] text-[13px] shrink-0">{fmt(r.nilai)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
            <Link href="/expenses" className="no-underline block">
              <Card className={cn(
                'border-[var(--border)] bg-[var(--surface)] overflow-hidden p-0',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
              )}>
                <CardHeader className="px-5 py-4 border-b border-[var(--border)] flex-row items-center justify-between space-y-0">
                  <CardTitle className="section-title mb-0 text-[13px]">10 Transaksi Terakhir</CardTitle>
                  <span className="text-[12px] text-[var(--accent)] font-semibold">Lihat semua ↗</span>
                </CardHeader>
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
                            <div className="font-semibold text-[13px]">{r.toko || '—'}</div>
                            {r.uraian && <div className="text-[11px] text-[var(--text3)]">{r.uraian}</div>}
                          </td>
                          <td>
                            <Badge variant="secondary" className="text-[11px] bg-[var(--surface2)] text-[var(--text2)] border-0">
                              {KATEGORI_ICON[r.kategori] || ''} {r.kategori}
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
              </Card>
            </Link>
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

function LoadingState() {
  return (
    <>
      <div className="h-14 bg-[var(--surface)] border-b border-[var(--border)]" />
      <div className="page-container">
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-[var(--surface2)]" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 rounded-xl bg-[var(--surface2)]" />)}
        </div>
      </div>
    </>
  )
}
