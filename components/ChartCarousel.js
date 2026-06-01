'use client'
import { useState, useRef, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend
)

const BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']

function useSwipe(onLeft, onRight) {
  const startX = useRef(null)
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (startX.current === null) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? onLeft() : onRight()
    startX.current = null
  }
  return { onTouchStart, onTouchEnd }
}

export default function ChartCarousel({ expenses, income, budgetPlans, summaryPeriode }) {
  const [idx, setIdx] = useState(0)
  const [animDir, setAnimDir] = useState(null) // 'left' | 'right'

  const go = useCallback((dir) => {
    setAnimDir(dir)
    setTimeout(() => {
      setIdx(i => {
        const next = i + (dir === 'left' ? 1 : -1)
        return Math.max(0, Math.min(charts.length - 1, next))
      })
      setAnimDir(null)
    }, 180)
  }, []) // eslint-disable-line

  const swipe = useSwipe(() => go('left'), () => go('right'))

  // ── Data preparation ──────────────────────────────────────

  // 1. Income vs Expense 12 bulan
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    return { label: BULAN_SHORT[d.getMonth()], year: d.getFullYear(), month: d.getMonth() }
  })
  const incomeByMonth = {}
  const expByMonth = {}
  income.forEach(r => {
    if (!r.tanggal) return
    const d = new Date(r.tanggal)
    const k = `${d.getFullYear()}-${d.getMonth()}`
    incomeByMonth[k] = (incomeByMonth[k] || 0) + (r.jumlah || 0)
  })
  expenses.forEach(r => {
    if (!r.tanggal) return
    const d = new Date(r.tanggal)
    const k = `${d.getFullYear()}-${d.getMonth()}`
    expByMonth[k] = (expByMonth[k] || 0) + (r.nilai || 0)
  })
  const incomeData12 = last12.map(m => (incomeByMonth[`${m.year}-${m.month}`] || 0) / 1000)
  const expData12    = last12.map(m => (expByMonth[`${m.year}-${m.month}`] || 0) / 1000)
  const labels12     = last12.map(m => m.label)

  // 2. Saldo kumulatif (running total)
  let running = 0
  const saldoData = last12.map(m => {
    const inc = incomeByMonth[`${m.year}-${m.month}`] || 0
    const exp = expByMonth[`${m.year}-${m.month}`] || 0
    running += inc - exp
    return Math.round(running / 1000)
  })

  // 3. Donut kategori
  const byKat = summaryPeriode.byKategori || {}
  const katEntries = Object.entries(byKat).sort((a, b) => b[1] - a[1]).slice(0, 7)
  const DONUT_COLORS = ['#3b82f6','#f97316','#ec4899','#22c55e','#a855f7','#06b6d4','#f59e0b']

  // 4. Budget vs Realisasi
  const now = new Date()
  const bulanNow = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][now.getMonth()]
  const budgetBulanIni = budgetPlans.filter(p => p.bulan === bulanNow && p.tahun === now.getFullYear())
  const realisasiMap = {}
  expenses.filter(r => {
    const d = new Date(r.tanggal)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).forEach(r => { realisasiMap[r.kategori] = (realisasiMap[r.kategori] || 0) + r.nilai })
  const budgetKat    = budgetBulanIni.map(p => p.kategori.split(' ')[0])
  const budgetAlokasi = budgetBulanIni.map(p => Math.round(p.alokasi / 1000))
  const budgetReal   = budgetBulanIni.map(p => Math.round((realisasiMap[p.kategori] || 0) / 1000))

  // 5. Pengeluaran per hari dalam seminggu (avg)
  const byDow = [0,0,0,0,0,0,0]
  const countDow = [0,0,0,0,0,0,0]
  expenses.forEach(r => {
    if (!r.tanggal) return
    const dow = new Date(r.tanggal).getDay()
    byDow[dow] += r.nilai || 0
    countDow[dow]++
  })
  const avgDow = byDow.map((v, i) => countDow[i] > 0 ? Math.round(v / countDow[i] / 1000) : 0)
  const dowLabels = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']

  // 6. Stacked metode per 6 bulan
  const last6 = last12.slice(6)
  const metodeKeys = ['Cash','Transfer','QRIS']
  const metodeColors = ['#f59e0b','#3b82f6','#22c55e']
  const metodeData = metodeKeys.map(m => ({
    label: m,
    data: last6.map(mo => {
      return expenses.filter(r => {
        if (!r.tanggal) return false
        const d = new Date(r.tanggal)
        return d.getMonth() === mo.month && d.getFullYear() === mo.year && r.transaksi === m
      }).reduce((s, r) => s + r.nilai, 0) / 1000
    })
  }))

  // ── Chart configs ──────────────────────────────────────────

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#737685' } },
      y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 10 }, color: '#737685', callback: v => `${v}rb` } }
    }
  }

  const charts = [
    {
      title: 'Income vs Pengeluaran',
      subtitle: '12 bulan terakhir (ribu)',
      icon: 'trending_up',
      render: () => (
        <Line
          data={{
            labels: labels12,
            datasets: [
              { label: 'Income', data: incomeData12, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#22c55e' },
              { label: 'Pengeluaran', data: expData12, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#f43f5e' },
            ]
          }}
          options={{ ...baseOpts, plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } } } }}
        />
      )
    },
    {
      title: 'Saldo Kumulatif',
      subtitle: '12 bulan terakhir (ribu)',
      icon: 'account_balance',
      render: () => (
        <Line
          data={{
            labels: labels12,
            datasets: [{
              label: 'Saldo', data: saldoData,
              borderColor: saldoData[saldoData.length-1] >= 0 ? '#38bdf8' : '#f43f5e',
              backgroundColor: saldoData[saldoData.length-1] >= 0 ? 'rgba(56,189,248,0.12)' : 'rgba(244,63,94,0.12)',
              fill: true, tension: 0.4, pointRadius: 3,
              pointBackgroundColor: saldoData[saldoData.length-1] >= 0 ? '#38bdf8' : '#f43f5e',
            }]
          }}
          options={{ ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: v => `${v}rb` } } } }}
        />
      )
    },
    {
      title: 'Top Kategori',
      subtitle: 'Periode aktif',
      icon: 'donut_large',
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <Doughnut
              data={{
                labels: katEntries.map(([k]) => k.split(' ')[0]),
                datasets: [{ data: katEntries.map(([,v]) => v), backgroundColor: DONUT_COLORS, borderWidth: 2, borderColor: 'var(--surface)' }]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } } },
                cutout: '62%',
              }}
            />
          </div>
        </div>
      )
    },
    {
      title: 'Budget vs Realisasi',
      subtitle: `Bulan ${bulanNow}`,
      icon: 'pie_chart',
      render: () => budgetBulanIni.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36 }}>pie_chart</span>
          <p style={{ fontSize: 13 }}>Belum ada budget plan</p>
        </div>
      ) : (
        <Bar
          data={{
            labels: budgetKat,
            datasets: [
              { label: 'Alokasi', data: budgetAlokasi, backgroundColor: 'rgba(56,189,248,0.5)', borderColor: '#38bdf8', borderWidth: 1, borderRadius: 4 },
              { label: 'Realisasi', data: budgetReal, backgroundColor: budgetReal.map((v, i) => v > budgetAlokasi[i] ? 'rgba(244,63,94,0.7)' : 'rgba(34,197,94,0.7)'), borderWidth: 0, borderRadius: 4 },
            ]
          }}
          options={{ ...baseOpts, plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } } } }}
        />
      )
    },
    {
      title: 'Hari Paling Boros',
      subtitle: 'Rata-rata pengeluaran (ribu)',
      icon: 'calendar_today',
      render: () => (
        <Bar
          data={{
            labels: dowLabels,
            datasets: [{
              data: avgDow,
              backgroundColor: avgDow.map(v => v === Math.max(...avgDow) ? '#f43f5e' : 'rgba(56,189,248,0.6)'),
              borderRadius: 6, borderWidth: 0,
            }]
          }}
          options={baseOpts}
        />
      )
    },
    {
      title: 'Metode Bayar',
      subtitle: '6 bulan terakhir (ribu)',
      icon: 'payments',
      render: () => (
        <Bar
          data={{
            labels: last6.map(m => m.label),
            datasets: metodeData.map((m, i) => ({
              label: m.label, data: m.data,
              backgroundColor: metodeColors[i],
              borderRadius: i === metodeKeys.length - 1 ? 4 : 0,
              borderWidth: 0,
            }))
          }}
          options={{
            ...baseOpts,
            scales: { ...baseOpts.scales, x: { ...baseOpts.scales.x, stacked: true }, y: { ...baseOpts.scales.y, stacked: true } },
            plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } } }
          }}
        />
      )
    },
  ]

  const current = charts[idx]

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--accent)', fontVariationSettings: "'FILL' 1" }}>{current.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{current.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{current.subtitle}</div>
          </div>
        </div>
        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {charts.map((_, i) => (
            <div key={i} onClick={() => { setAnimDir(i > idx ? 'left' : 'right'); setTimeout(() => { setIdx(i); setAnimDir(null) }, 180) }}
              style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? 'var(--accent)' : 'var(--border)', transition: 'all 0.3s', cursor: 'pointer' }} />
          ))}
        </div>
      </div>

      {/* Chart area with swipe */}
      <div
        {...swipe}
        style={{
          padding: '16px 16px 8px',
          height: 240,
          overflow: 'hidden',
          transform: animDir === 'left' ? 'translateX(-12px)' : animDir === 'right' ? 'translateX(12px)' : 'translateX(0)',
          opacity: animDir ? 0 : 1,
          transition: 'transform 0.18s ease, opacity 0.18s ease',
          userSelect: 'none',
        }}
      >
        {current.render()}
      </div>

      {/* Arrow navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 12px' }}>
        <button onClick={() => go('right')} disabled={idx === 0}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: idx === 0 ? 'var(--surface2)' : 'var(--surface)', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === 0 ? 'var(--border)' : 'var(--accent)', transition: 'all 0.15s', touchAction: 'manipulation' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
        </button>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{idx + 1} / {charts.length}</span>
        <button onClick={() => go('left')} disabled={idx === charts.length - 1}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: idx === charts.length - 1 ? 'var(--surface2)' : 'var(--surface)', cursor: idx === charts.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === charts.length - 1 ? 'var(--border)' : 'var(--accent)', transition: 'all 0.15s', touchAction: 'manipulation' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
        </button>
      </div>
    </div>
  )
}
