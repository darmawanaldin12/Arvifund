'use client'
import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { C, DONUT_COLORS, ChartIncExp, ChartSaldo, ChartKategori, ChartBudget, ChartDow, ChartMetode } from './CarouselCharts'
import { buildIncExpData, buildSaldoData, buildPieData, buildBudgetData, buildDowData, buildMetodeData } from '../lib/carousel-data'

function useSwipe(onLeft, onRight) {
  const startX = useRef(null)
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (startX.current === null) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? onLeft() : onRight()
    startX.current = null
  }
  return { onTouchStart, onTouchEnd }
}

export default function ChartCarousel({ expenses, income, budgetPlans, summaryPeriode }) {
  const [idx, setIdx]         = useState(0)
  const [animDir, setAnimDir] = useState(null)

  const go = useCallback((dir) => {
    setAnimDir(dir)
    setTimeout(() => {
      setIdx(i => Math.max(0, Math.min(5, i + (dir === 'left' ? 1 : -1))))
      setAnimDir(null)
    }, 180)
  }, [])

  const swipe = useSwipe(() => go('left'), () => go('right'))

  const { data12, incMap, expMap } = buildIncExpData(expenses, income)
  const dataSaldo  = buildSaldoData(incMap, expMap)
  const pieData    = buildPieData(summaryPeriode, DONUT_COLORS)
  const { bulanNow, data: dataBudget } = buildBudgetData(expenses, budgetPlans)
  const dataDow    = buildDowData(expenses)
  const dataMetode = buildMetodeData(expenses)

  const charts = [
    { title: 'Income vs Pengeluaran', subtitle: '12 bulan terakhir',              icon: 'trending_up',    render: () => <ChartIncExp  data={data12} /> },
    { title: 'Saldo Kumulatif',       subtitle: '12 bulan terakhir',              icon: 'account_balance',render: () => <ChartSaldo   data={dataSaldo} /> },
    { title: 'Top Kategori',          subtitle: 'Periode aktif',                  icon: 'donut_large',    render: () => <ChartKategori pieData={pieData} /> },
    { title: 'Budget vs Realisasi',   subtitle: `Bulan ${bulanNow}`,             icon: 'pie_chart',      render: () => <ChartBudget  data={dataBudget} /> },
    { title: 'Hari Paling Boros',     subtitle: 'Rata-rata pengeluaran per hari', icon: 'calendar_today', render: () => <ChartDow     data={dataDow} /> },
    { title: 'Metode Pembayaran',     subtitle: '6 bulan terakhir',               icon: 'payments',       render: () => <ChartMetode  data={dataMetode} /> },
  ]

  const current = charts[idx]

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div {...swipe} style={{ padding: '12px 12px 4px', height: 240, overflow: 'hidden', transform: animDir === 'left' ? 'translateX(-12px)' : animDir === 'right' ? 'translateX(12px)' : 'translateX(0)', opacity: animDir ? 0 : 1, transition: 'transform 0.18s ease, opacity 0.18s ease', userSelect: 'none' }}>
        {current.render()}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 12px' }}>
        <button onClick={() => go('right')} disabled={idx === 0} aria-label="Sebelumnya"
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: idx === 0 ? 'var(--surface2)' : 'var(--surface)', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === 0 ? 'var(--border)' : 'var(--accent)', transition: 'all 0.15s', touchAction: 'manipulation' }}>
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{idx + 1} / {charts.length}</span>
        <button onClick={() => go('left')} disabled={idx === charts.length - 1} aria-label="Berikutnya"
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: idx === charts.length - 1 ? 'var(--surface2)' : 'var(--surface)', cursor: idx === charts.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === charts.length - 1 ? 'var(--border)' : 'var(--accent)', transition: 'all 0.15s', touchAction: 'manipulation' }}>
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
