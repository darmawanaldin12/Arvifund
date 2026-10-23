'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingDown, TrendingUp, ArrowLeftRight, Landmark } from 'lucide-react'
import { useData } from '../../components/DataContext'
import { DONUT_COLORS } from '../../components/CarouselCharts'
import { TvIncExp, TvSaldo, TvDonut, TvDow, TvMetode } from '../../components/tv/TVCharts'
import { AnimatedAmount } from '../../hooks/useCountUp'
import {
  fmt, fmtFull, fmtTanggalShort, BULAN_ORDER, getMoMInfo, parseTanggal,
  filterByPeriod, getCurrentPeriodIndex,
} from '../../lib/utils'
import { buildBudgetVsReal } from '../../lib/kategori'
import { periodDays, sumInPeriod, budgetOfPeriod } from '../../lib/scorecard-period'
import { buildPieData, buildDowData } from '../../lib/carousel-data'
import { buildIncExpPeriode, buildSaldoPeriode, buildMetodePeriode } from '../../lib/carousel-period'
import { setTvOverride } from '../../lib/tv'

const ROTATE_MS  = 15000          // ganti slide tiap 15 detik
const REFRESH_MS = 5 * 60 * 1000  // data diperbarui tiap 5 menit

const SLIDES = [
  { key: 'ringkasan', tab: 'Ringkasan',  title: 'Ringkasan Keuangan' },
  { key: 'tren',      tab: 'Tren',       title: 'Tren Keuangan',        sub: 'periode gajian terakhir' },
  { key: 'kategori',  tab: 'Kategori',   title: 'Kategori & Budget' },
  { key: 'pola',      tab: 'Pola',       title: 'Pola Pengeluaran' },
  { key: 'aktivitas', tab: 'Aktivitas',  title: 'Aktivitas Terbaru' },
]

const TIPE = {
  expense:  { color: 'var(--red)',    bg: 'rgba(244,63,94,.14)',  Icon: TrendingDown },
  income:   { color: 'var(--green)',  bg: 'rgba(34,197,94,.14)',  Icon: TrendingUp },
  transfer: { color: 'var(--accent)', bg: 'rgba(59,130,246,.16)', Icon: ArrowLeftRight },
  cash:     { color: 'var(--yellow)', bg: 'rgba(245,158,11,.14)', Icon: Landmark },
}

function ChartBox({ children }) {
  return <div className="tv-chart"><div className="tv-chart-in">{children}</div></div>
}

const momCls = (m) => (m && (m.cls === 'good' || m.cls === 'mom-good') ? 'good' : 'bad')

export default function TvPage() {
  const router = useRouter()
  const {
    summaryPeriode: s, summaryAll: sA, loading, error, loadData, lastRefresh,
    periodIdx, setPeriodIdx, periods, payPeriodDate, overrides,
    expenses, income, cashRecords, transfers, budgetPlans, getUserName,
  } = useData()

  const [slide, setSlide]   = useState(0)
  const [cycle, setCycle]   = useState(0)   // dinaikkan tiap ganti slide / lanjut, untuk reset timer & progress bar
  const [paused, setPaused] = useState(false)
  const [clock, setClock]   = useState(null)

  const go = useCallback((delta) => {
    setSlide(i => (i + delta + SLIDES.length) % SLIDES.length)
    setCycle(c => c + 1)
  }, [])

  const goPeriod = useCallback((delta) => {
    const cur  = periodIdx !== '' ? parseInt(periodIdx) : getCurrentPeriodIndex(payPeriodDate, overrides)
    const next = Math.min(Math.max(cur + delta, 0), Math.max(periods.length - 1, 0))
    setPeriodIdx(String(next))
  }, [periodIdx, payPeriodDate, overrides, periods.length, setPeriodIdx])

  // Jam
  useEffect(() => {
    const tick = () => setClock(new Date())
    tick()
    const t = setInterval(tick, 30000)
    return () => clearInterval(t)
  }, [])

  // Auto-rotate slide
  useEffect(() => {
    if (paused || loading) return
    const t = setTimeout(() => go(1), ROTATE_MS)
    return () => clearTimeout(t)
  }, [cycle, paused, loading, go])

  // Segarkan data berkala (tanpa layar loading, DataContext sudah menanganinya)
  useEffect(() => {
    const t = setInterval(() => loadData(), REFRESH_MS)
    return () => clearInterval(t)
  }, [loadData])

  // Jaga layar tetap menyala (kalau browser/TV mendukung)
  useEffect(() => {
    let lock = null
    async function request() {
      try { lock = await navigator.wakeLock?.request('screen') } catch (_) {}
    }
    request()
    const onVis = () => { if (document.visibilityState === 'visible') request() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      try { lock?.release?.() } catch (_) {}
    }
  }, [])

  // Kontrol remote: ◀ ▶ slide, ▲ ▼ periode, OK jeda/lanjut
  useEffect(() => {
    function onKey(e) {
      const onButton = !!e.target?.closest?.('button')
      switch (e.key) {
        case 'ArrowRight': go(1); break
        case 'ArrowLeft':  go(-1); break
        case 'ArrowUp':    goPeriod(-1); break   // periode lebih baru
        case 'ArrowDown':  goPeriod(1); break    // periode lebih lama
        case 'Enter':
        case ' ':
        case 'MediaPlayPause':
          if (onButton && e.key !== 'MediaPlayPause') return
          setPaused(p => !p); setCycle(c => c + 1); break
        case 'r': case 'R': loadData(); break
        default: return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, goPeriod, loadData])

  if (loading) {
    return <div className="tv-root tv-center"><p className="tv-loading">Memuat data…</p></div>
  }

  /* ── Perhitungan (sama dengan halaman /dashboard) ── */
  const refIdx      = periodIdx !== '' ? parseInt(periodIdx) : getCurrentPeriodIndex(payPeriodDate, overrides)
  const refPeriod   = periods[refIdx] || periods[0]
  const refExpenses = refPeriod ? filterByPeriod(expenses, refIdx, payPeriodDate, overrides) : []
  const expPeriode  = refPeriod ? sumInPeriod(refExpenses, refPeriod) : 0
  const { total: totalHari, elapsed: hariBerjalan } = refPeriod ? periodDays(refPeriod) : { total: 0, elapsed: 0 }
  const rataHarian  = hariBerjalan > 0 ? Math.round(expPeriode / hariBerjalan) : 0
  const proyeksi    = rataHarian * totalHari
  const budgetRef   = refPeriod ? budgetOfPeriod(budgetPlans, refPeriod) : 0

  const budgetPeriode = buildBudgetVsReal({ budgetPlans, expenses: refExpenses, period: refPeriod || null })
  const sisaBudget    = budgetPeriode.totalAlokasi - budgetPeriode.totalRealisasi
  const budgetItems   = [...budgetPeriode.items].sort((a, b) => b.pct - a.pct)
  const budgetAlerts  = budgetItems.filter(b => b.pct >= 80)

  const prevPeriod   = periods[refIdx + 1] || null
  const bulanLaluMom = prevPeriod ? BULAN_ORDER[prevPeriod.end.getMonth()] : ''
  const momIncome    = prevPeriod && refPeriod
    ? getMoMInfo(sumInPeriod(income, refPeriod, 'jumlah'), sumInPeriod(income, prevPeriod, 'jumlah'), 'income') : null
  const momExpense   = prevPeriod && refPeriod
    ? getMoMInfo(expPeriode, sumInPeriod(expenses, prevPeriod), 'expense') : null
  const saldoTahun   = (sA.totalIncome || 0) - (sA.totalExpenses || 0)

  const data12     = buildIncExpPeriode(expenses, income, periods)
  const dataSaldo  = buildSaldoPeriode(data12)
  const pieData    = buildPieData(s, DONUT_COLORS)
  const dataDow    = buildDowData(expenses)
  const dataMetode = buildMetodePeriode(expenses, periods)
  const pieTotal   = pieData.reduce((a, d) => a + (d.value || 0), 0)

  const recent = []
  ;(expenses || []).forEach(r => recent.push({ id: 'e' + r.id, tipe: 'expense', tanggal: r.tanggal, label: r.toko || 'Pengeluaran', sub: r.uraian || r.kategori || '', amount: r.nilai }))
  ;(income || []).forEach(r => recent.push({ id: 'i' + r.id, tipe: 'income', tanggal: r.tanggal, label: r.sumber || 'Pemasukan', sub: r.items || r.kategori || '', amount: r.jumlah }))
  ;(cashRecords || []).forEach(r => recent.push({ id: 'c' + r.id, tipe: 'cash', tanggal: r.tanggal, label: r.transaksi || 'Tarik Tunai', sub: `dari ${r.bank}`, amount: r.nilai }))
  ;(transfers || []).forEach(r => recent.push({ id: 't' + r.id, tipe: 'transfer', tanggal: r.tanggal, label: `${getUserName(r.from_user)} → ${getUserName(r.to_user)}`, sub: r.catatan || `${r.from_bank} → ${r.to_bank}`, amount: r.jumlah }))
  const rows = recent
    .sort((a, b) => (parseTanggal(b.tanggal)?.getTime() || 0) - (parseTanggal(a.tanggal)?.getTime() || 0))
    .slice(0, 10)

  const kpis = [
    { label: 'Total Pemasukan',   value: s.totalIncome,   cls: 'green',  mom: momIncome },
    { label: 'Total Pengeluaran', value: s.totalExpenses, cls: 'red',    mom: momExpense, sub: `${s.expensesCount} transaksi` },
    { label: 'Saldo Periode',     value: s.saldo,         cls: s.saldo >= 0 ? 'accent' : 'red', sub: 'pemasukan − pengeluaran' },
    { label: 'Saldo Tahun Ini',   value: saldoTahun,      cls: saldoTahun >= 0 ? 'accent' : 'red', sub: 'total semua data' },
  ]

  const timeStr = clock ? clock.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''
  const dateStr = clock ? clock.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const updStr  = lastRefresh ? lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
  const cur     = SLIDES[slide]

  function exitTv() { setTvOverride(false); router.push('/dashboard?tv=0') }

  return (
    <div className="tv-root">
      <header className="tv-header">
        <div className="tv-brand">
          <img src="/logo.png" alt="" onError={e => { e.currentTarget.style.display = 'none' }} />
          Arvifund
        </div>
        <div className="tv-header-mid">
          <div className="tv-period">{refPeriod?.label || 'Semua periode'}</div>
          {error && <span className="tv-err">Gagal menyegarkan data</span>}
        </div>
        <div className="tv-clock">{timeStr}<small>{dateStr}</small></div>
      </header>

      <main className="tv-main" key={cur.key}>
        <div className="tv-title">{cur.title}{cur.sub && <span>{cur.sub}</span>}</div>

        {cur.key === 'ringkasan' && (
          <div className="tv-grid s1">
            {kpis.map(k => (
              <div key={k.label} className="tv-card">
                <h3>{k.label}</h3>
                <div className={`tv-big ${k.cls}`}><AnimatedAmount value={k.value ?? 0} formatter={fmt} duration={900} /></div>
                {k.sub && <div className="tv-sub">{k.sub}</div>}
                {k.mom && <div className={`tv-mom ${momCls(k.mom)}`}>{k.mom.label} vs {bulanLaluMom}</div>}
              </div>
            ))}
            <div className="tv-card">
              <h3>Rata-rata Harian</h3>
              <div className="tv-big md yellow"><AnimatedAmount value={rataHarian} formatter={fmt} duration={900} /></div>
              <div className="tv-sub">hari ke-{hariBerjalan} dari {totalHari}</div>
            </div>
            <div className="tv-card">
              <h3>Proyeksi Akhir Periode</h3>
              <div className={`tv-big md ${proyeksi > budgetRef && budgetRef > 0 ? 'red' : ''}`}><AnimatedAmount value={proyeksi} formatter={fmt} duration={900} /></div>
              <div className="tv-sub">{budgetRef > 0 ? `budget ${fmt(budgetRef)}` : 'budget belum diatur'}</div>
            </div>
            <div className="tv-card">
              <h3>Sisa Budget</h3>
              {budgetPeriode.totalAlokasi > 0
                ? <div className={`tv-big md ${sisaBudget < 0 ? 'red' : 'green'}`}>{sisaBudget < 0 ? '−' : ''}<AnimatedAmount value={Math.abs(sisaBudget)} formatter={fmt} duration={900} /></div>
                : <div className="tv-big md">—</div>}
              <div className="tv-sub">{sisaBudget < 0 && budgetPeriode.totalAlokasi > 0 ? 'melebihi budget' : 'dari total alokasi'}</div>
            </div>
            <div className="tv-card">
              <h3>Jumlah Transaksi</h3>
              <div className="tv-big md">{s.expensesCount}</div>
              <div className="tv-sub">pengeluaran periode ini</div>
            </div>
          </div>
        )}

        {cur.key === 'tren' && (
          <div className="tv-grid s2">
            <div className="tv-card"><h3>Income vs Pengeluaran</h3><ChartBox><TvIncExp data={data12} /></ChartBox></div>
            <div className="tv-card"><h3>Saldo Kumulatif</h3><ChartBox><TvSaldo data={dataSaldo} /></ChartBox></div>
          </div>
        )}

        {cur.key === 'kategori' && (
          <div className="tv-grid s3">
            <div className="tv-card">
              <h3>Top Kategori <small>periode aktif</small></h3>
              <div className="tv-donut">
                <ChartBox><TvDonut pieData={pieData} /></ChartBox>
                <div className="tv-legend">
                  {pieData.slice(0, 7).map((d, i) => (
                    <div key={i} className="tv-leg">
                      <i style={{ background: d.fill }} />
                      <b>{d.name}</b>
                      <span>{fmt(d.value)}</span>
                      <em>{pieTotal > 0 ? Math.round(d.value / pieTotal * 100) : 0}%</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="tv-card">
              <h3>Budget vs Realisasi <small>{refPeriod?.label}</small></h3>
              {budgetItems.length === 0
                ? <div className="tv-empty">Belum ada budget plan</div>
                : (
                  <div className="tv-bars">
                    {budgetItems.slice(0, 8).map(b => (
                      <div key={b.kategori}>
                        <div className="tv-bar-top">
                          <b>{b.kategori}</b>
                          <span>{fmt(b.realisasi)} / {fmt(b.alokasi)} · {b.pct}%</span>
                        </div>
                        <div className="tv-bar">
                          <i style={{ width: `${Math.min(b.pct, 100)}%`, background: b.pct >= 100 ? 'var(--red)' : b.pct >= 80 ? 'var(--yellow)' : 'var(--green)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {cur.key === 'pola' && (
          <div className="tv-grid s4">
            <div className="tv-card"><h3>Hari Paling Boros <small>rata-rata pengeluaran per hari</small></h3><ChartBox><TvDow data={dataDow} /></ChartBox></div>
            <div className="tv-card"><h3>Metode Pembayaran <small>6 periode terakhir</small></h3><ChartBox><TvMetode data={dataMetode} /></ChartBox></div>
          </div>
        )}

        {cur.key === 'aktivitas' && (
          <div className="tv-grid s5">
            <div className="tv-card">
              <h3>10 Transaksi Terakhir</h3>
              {rows.length === 0
                ? <div className="tv-empty">Belum ada transaksi</div>
                : (
                  <div className="tv-tx-list">
                    {rows.map(r => {
                      const t = TIPE[r.tipe] || TIPE.expense
                      const Ic = t.Icon
                      return (
                        <div key={r.id} className="tv-tx">
                          <div className="tv-tx-ic" style={{ background: t.bg }}><Ic size="1.2em" color={t.color} /></div>
                          <div className="tv-tx-info">
                            <b>{r.label}</b>
                            <small>{fmtTanggalShort(r.tanggal)}{r.sub ? ` · ${r.sub}` : ''}</small>
                          </div>
                          <div className="tv-tx-amt" style={{ color: t.color }}>{r.tipe === 'income' ? '+' : '−'}{fmtFull(r.amount)}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
            <div className="tv-card">
              <h3>Perlu Perhatian <small>budget ≥ 80%</small></h3>
              {budgetAlerts.length === 0
                ? <div className="tv-empty"><span className="tv-ok">✓ Semua budget masih aman</span></div>
                : (
                  <div className="tv-alerts">
                    {budgetAlerts.slice(0, 6).map(b => (
                      <div key={b.kategori} className={`tv-alert ${b.pct >= 100 ? 'danger' : 'warn'}`}>
                        <span>{b.kategori}</span>
                        <span>{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </main>

      <footer className="tv-footer">
        <div className={`tv-progress ${paused ? 'paused' : ''}`} style={{ '--dur': `${ROTATE_MS}ms` }}>
          <i key={cycle} style={paused ? { animationPlayState: 'paused' } : undefined} />
        </div>
        <div className="tv-footer-row">
          <div className="tv-tabs">
            {SLIDES.map((sl, i) => (
              <button key={sl.key} tabIndex={-1} className={`tv-tab ${i === slide ? 'active' : ''}`}
                onClick={() => { setSlide(i); setCycle(c => c + 1) }}>{sl.tab}</button>
            ))}
          </div>
          <div>◀ ▶ ganti slide · ▲ ▼ ganti periode · OK {paused ? 'lanjutkan' : 'jeda'} · diperbarui {updStr}</div>
          <button className="tv-link" tabIndex={-1} onClick={exitTv}>Mode HP</button>
        </div>
      </footer>
    </div>
  )
}
