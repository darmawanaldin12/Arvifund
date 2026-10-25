'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingDown, TrendingUp, ArrowLeftRight, Landmark } from 'lucide-react'
import { useData } from '../../components/DataContext'
import { TvIncExp, TvSaldo, TvDonut, TvDow, TvMetode, TV_COLORS } from '../../components/tv/TVCharts'
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
  { key: 'ringkasan', tab: 'Ringkasan', title: 'Ringkasan keuangan' },
  { key: 'tren',      tab: 'Tren',      title: 'Tren keuangan' },
  { key: 'kategori',  tab: 'Kategori',  title: 'Ke mana uang pergi' },
  { key: 'pola',      tab: 'Pola',      title: 'Kapan uang paling banyak keluar' },
  { key: 'aktivitas', tab: 'Aktivitas', title: 'Transaksi terbaru' },
]

const TIPE = {
  expense:  { color: '#ff7a66', bg: 'rgba(255,122,102,.16)', Icon: TrendingDown },
  income:   { color: '#7fd48a', bg: 'rgba(127,212,138,.16)', Icon: TrendingUp },
  transfer: { color: '#6ec6d9', bg: 'rgba(110,198,217,.16)', Icon: ArrowLeftRight },
  cash:     { color: '#f2c14e', bg: 'rgba(242,193,78,.16)',  Icon: Landmark },
}

function ChartBox({ children }) {
  return <div className="tv-chart"><div className="tv-chart-in">{children}</div></div>
}

const momCls = (m) => (m && (m.cls === 'good' || m.cls === 'mom-good') ? 'good' : m && m.cls === 'bad' ? 'bad' : 'neutral')

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

  useEffect(() => {
    const tick = () => setClock(new Date())
    tick()
    const t = setInterval(tick, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (paused || loading) return
    const t = setTimeout(() => go(1), ROTATE_MS)
    return () => clearTimeout(t)
  }, [cycle, paused, loading, go])

  useEffect(() => {
    const t = setInterval(() => loadData(), REFRESH_MS)
    return () => clearInterval(t)
  }, [loadData])

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
        case 'ArrowUp':    goPeriod(-1); break
        case 'ArrowDown':  goPeriod(1); break
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
  const budgetItems   = [...budgetPeriode.items].sort((a, b) => b.pct - a.pct)
  const budgetAlerts  = budgetItems.filter(b => b.pct >= 80)
  const budgetPct     = budgetPeriode.totalAlokasi > 0 ? Math.round(budgetPeriode.totalRealisasi / budgetPeriode.totalAlokasi * 100) : null
  const timePct       = totalHari > 0 ? Math.min(100, Math.round(hariBerjalan / totalHari * 100)) : 0
  const budgetColor   = budgetPct === null ? 'var(--text3)' : budgetPct > timePct + 10 ? '#ff7a66' : budgetPct > timePct ? '#f2c14e' : '#7fd48a'

  const prevPeriod   = periods[refIdx + 1] || null
  const bulanLaluMom = prevPeriod ? BULAN_ORDER[prevPeriod.end.getMonth()] : ''
  const momIncome    = prevPeriod && refPeriod
    ? getMoMInfo(sumInPeriod(income, refPeriod, 'jumlah'), sumInPeriod(income, prevPeriod, 'jumlah'), 'income') : null
  const momExpense   = prevPeriod && refPeriod
    ? getMoMInfo(expPeriode, sumInPeriod(expenses, prevPeriod), 'expense') : null
  const saldoTahun   = (sA.totalIncome || 0) - (sA.totalExpenses || 0)

  const data12     = buildIncExpPeriode(expenses, income, periods)
  const dataSaldo  = buildSaldoPeriode(data12)
  const pieData    = buildPieData(s, TV_COLORS)
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

  const ledger = [
    { label: 'Pemasukan',          value: s.totalIncome,   cls: 'mint', mom: momIncome },
    { label: 'Pengeluaran',        value: s.totalExpenses, cls: 'coral', mom: momExpense },
    { label: 'Saldo tahun ini',    value: saldoTahun,      cls: saldoTahun >= 0 ? 'gold' : 'coral' },
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
          {error && <span className="tv-err">Gagal menyegarkan data</span>}
        </div>
        <div className="tv-clock">{timeStr}<small>{dateStr}</small></div>
      </header>

      <main className="tv-main" key={cur.key}>
        <div className="tv-title"><h1>{cur.title}</h1><span>{refPeriod?.label || 'Semua periode'}</span></div>

        {cur.key === 'ringkasan' && (
          <div className="tv-s1">
            <section className="tv-hero">
              <p className="tv-lab">Saldo periode ini</p>
              <div className={`tv-hero-num ${s.saldo >= 0 ? 'gold' : 'coral'}`}>
                {s.saldo < 0 ? '−' : ''}<AnimatedAmount value={Math.abs(s.saldo ?? 0)} formatter={fmt} duration={1100} />
              </div>
              <p className="tv-hero-sub">pemasukan dikurangi pengeluaran</p>

              <div className="tv-track">
                <div className="tv-track-top"><span>Waktu berjalan</span><b>hari ke-{hariBerjalan} dari {totalHari}</b></div>
                <div className="tv-bar"><i style={{ width: `${timePct}%`, background: 'var(--text3)' }} /></div>
              </div>
              {budgetPct !== null && (
                <div className="tv-track">
                  <div className="tv-track-top"><span>Budget terpakai</span><b>{budgetPct}%</b></div>
                  <div className="tv-bar"><i style={{ width: `${Math.min(budgetPct, 100)}%`, background: budgetColor }} /></div>
                </div>
              )}
              <p className="tv-hero-note">
                Rata-rata pengeluaran {fmt(rataHarian)} per hari, proyeksi akhir periode {fmt(proyeksi)}
                {budgetRef > 0 ? ` dari budget ${fmt(budgetRef)}` : ''}.
              </p>
            </section>

            <section className="tv-ledger">
              {ledger.map(r => (
                <div key={r.label} className="tv-lrow">
                  <span>{r.label}</span>
                  <b className={r.cls}>{(r.value ?? 0) < 0 ? '−' : ''}<AnimatedAmount value={Math.abs(r.value ?? 0)} formatter={fmt} duration={900} /></b>
                  {r.mom && <em className={momCls(r.mom)}>{r.mom.label} dibanding {bulanLaluMom}</em>}
                </div>
              ))}
              <div className="tv-lrow">
                <span>Jumlah transaksi</span>
                <b>{s.expensesCount}</b>
                <em className="neutral">pengeluaran periode ini</em>
              </div>
            </section>
          </div>
        )}

        {cur.key === 'tren' && (
          <div className="tv-grid s2">
            <div className="tv-card"><h3>Pemasukan dan pengeluaran</h3><ChartBox><TvIncExp data={data12} /></ChartBox></div>
            <div className="tv-card"><h3>Saldo kumulatif</h3><ChartBox><TvSaldo data={dataSaldo} /></ChartBox></div>
          </div>
        )}

        {cur.key === 'kategori' && (
          <div className="tv-grid s3">
            <div className="tv-card">
              <h3>Pengeluaran per kategori</h3>
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
              <h3>Budget terpakai</h3>
              {budgetItems.length === 0
                ? <div className="tv-empty">Budget belum diatur</div>
                : (
                  <div className="tv-bars">
                    {budgetItems.slice(0, 8).map(b => (
                      <div key={b.kategori}>
                        <div className="tv-bar-top">
                          <b>{b.kategori}</b>
                          <span>{fmt(b.realisasi)} dari {fmt(b.alokasi)}, {b.pct}%</span>
                        </div>
                        <div className="tv-bar">
                          <i style={{ width: `${Math.min(b.pct, 100)}%`, background: b.pct >= 100 ? '#ff7a66' : b.pct >= 80 ? '#f2c14e' : '#7fd48a' }} />
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
            <div className="tv-card"><h3>Rata-rata pengeluaran per hari<small>hari tertinggi berwarna coral</small></h3><ChartBox><TvDow data={dataDow} /></ChartBox></div>
            <div className="tv-card"><h3>Cara membayar<small>enam periode terakhir</small></h3><ChartBox><TvMetode data={dataMetode} /></ChartBox></div>
          </div>
        )}

        {cur.key === 'aktivitas' && (
          <div className="tv-grid s5">
            <div className="tv-card">
              <h3>10 transaksi terakhir</h3>
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
                            <small>{fmtTanggalShort(r.tanggal)}{r.sub ? `, ${r.sub}` : ''}</small>
                          </div>
                          <div className="tv-tx-amt" style={{ color: t.color }}>{r.tipe === 'income' ? '+' : '−'}{fmtFull(r.amount)}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
            <div className="tv-card">
              <h3>Perlu diperhatikan<small>budget sudah 80% atau lebih</small></h3>
              {budgetAlerts.length === 0
                ? <div className="tv-empty"><span className="tv-ok">Semua budget masih aman</span></div>
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
          <div>◀ ▶ slide   ▲ ▼ periode   OK {paused ? 'lanjutkan' : 'jeda'}   diperbarui {updStr}</div>
          <button className="tv-link" tabIndex={-1} onClick={exitTv}>Mode HP</button>
        </div>
      </footer>
    </div>
  )
}
