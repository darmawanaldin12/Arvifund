'use client'
import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, Landmark, PieChart, Target, CalendarDays, CreditCard } from 'lucide-react'
import { C, DONUT_COLORS, ChartIncExp, ChartSaldo, ChartKategori, ChartBudget, ChartDow, ChartMetode } from './CarouselCharts'
import { buildIncExpData, buildSaldoData, buildPieData, buildBudgetData, buildDowData, buildMetodeData } from '../lib/carousel-data'

const CHART_ICONS = {
  trending_up:     TrendingUp,
  account_balance: Landmark,
  donut_large:     PieChart,
  pie_chart:       Target,
  calendar_today:  CalendarDays,
  payments:        CreditCard,
}

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
  const Icon    = CHART_ICONS[current.icon] || TrendingUp

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header: icon + judul + subtitle, supaya jelas chart ini nampilin data apa */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 12px 4px',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(59,130,246,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} color="var(--accent)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)', lineHeight: 1.25 }}>
            {current.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.2 }}>
            {current.subtitle}
          </div>
        </div>
      </div>

      <div {...swipe} style={{ padding: '8px 12px 4px', height: 224, overflow: 'hidden', transform: animDir === 'left' ? 'translateX(-12px)' : animDir === 'right' ? 'translateX(12px)' : 'translateX(0)', opacity: animDir ? 0 : 1, transition: 'transform 0.18s ease, opacity 0.18s ease', userSelect: 'none' }}>
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
