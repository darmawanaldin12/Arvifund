'use client'
import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'

const BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']

const C = {
  green:  '#22c55e',
  red:    '#f43f5e',
  blue:   '#38bdf8',
  accent: '#3b82f6',
  orange: '#f97316',
  pink:   '#ec4899',
  purple: '#a855f7',
  teal:   '#06b6d4',
  yellow: '#f59e0b',
  gray:   '#94a3b8',
}

const DONUT_COLORS = [C.accent, C.orange, C.pink, C.green, C.purple, C.teal, C.yellow]

const fmtTick = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000)     return `${Math.round(v / 1_000)}rb`
  return String(v)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
      boxShadow: '0 4px 16px rgba(0,0,0,0.14)', maxWidth: 180,
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text1)' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text3)', marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.fill, flexShrink: 0 }} />
          <span>{p.name}:</span>
          <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmtTick(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
      boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>{p.name}</div>
      <div style={{ color: 'var(--text3)' }}>
        {fmtTick(p.value)} <span style={{ color: p.payload.fill }}>{p.payload.percent ? `(${(p.payload.percent * 100).toFixed(1)}%)` : ''}</span>
      </div>
    </div>
  )
}

const axisStyle = { fontSize: 9, fill: 'var(--text3)' }
const gridStyle = { strokeDasharray: '3 3', stroke: 'var(--border)', vertical: false }

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
  const [animDir, setAnimDir] = useState(null)

  const go = useCallback((dir) => {
    setAnimDir(dir)
    setTimeout(() => {
      setIdx(i => {
        const next = i + (dir === 'left' ? 1 : -1)
        return Math.max(0, Math.min(5, next))
      })
      setAnimDir(null)
    }, 180)
  }, [])

  const swipe = useSwipe(() => go('left'), () => go('right'))

  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    return { label: BULAN_SHORT[d.getMonth()], year: d.getFullYear(), month: d.getMonth() }
  })

  const incMap = {}, expMap = {}
  income.forEach(r => {
    if (!r.tanggal) return
    const d = new Date(r.tanggal)
    const k = `${d.getFullYear()}-${d.getMonth()}`
    incMap[k] = (incMap[k] || 0) + (r.jumlah || 0)
  })
  expenses.forEach(r => {
    if (!r.tanggal) return
    const d = new Date(r.tanggal)
    const k = `${d.getFullYear()}-${d.getMonth()}`
    expMap[k] = (expMap[k] || 0) + (r.nilai || 0)
  })

  const data12 = last12.map(m => ({
    label: m.label,
    Income: incMap[`${m.year}-${m.month}`] || 0,
    Pengeluaran: expMap[`${m.year}-${m.month}`] || 0,
  }))

  let running = 0
  const dataSaldo = last12.map(m => {
    const inc = incMap[`${m.year}-${m.month}`] || 0
    const exp = expMap[`${m.year}-${m.month}`] || 0
    running += inc - exp
    return { label: m.label, Saldo: running }
  })
  const lastSaldo = dataSaldo[dataSaldo.length - 1]?.Saldo || 0

  const byKat = summaryPeriode.byKategori || {}
  const katEntries = Object.entries(byKat).sort((a, b) => b[1] - a[1]).slice(0, 7)
  const totalKat = katEntries.reduce((s, [, v]) => s + v, 0)
  const pieData = katEntries.map(([name, value], i) => ({
    name: name.length > 10 ? name.slice(0, 9) + '\u2026' : name,
    fullName: name,
    value,
    fill: DONUT_COLORS[i],
    percent: totalKat > 0 ? value / totalKat : 0,
  }))

  const now = new Date()
  const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const bulanNow = BULAN_ID[now.getMonth()]
  const budgetBulanIni = (budgetPlans || []).filter(p => p.bulan === bulanNow && p.tahun === now.getFullYear())

  const realisasiMap = {}
  expenses.filter(r => {
    const d = new Date(r.tanggal)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).forEach(r => { realisasiMap[r.kategori] = (realisasiMap[r.kategori] || 0) + r.nilai })

  const dataBudget = budgetBulanIni.map(p => ({
    label: p.kategori?.length > 7 ? p.kategori.slice(0, 6) + '\u2026' : (p.kategori || '?'),
    fullLabel: p.kategori,
    Alokasi: p.alokasi || 0,
    Realisasi: realisasiMap[p.kategori] || 0,
  }))

  const byDow = [0,0,0,0,0,0,0]
  const cntDow = [0,0,0,0,0,0,0]
  expenses.forEach(r => {
    if (!r.tanggal) return
    const dow = new Date(r.tanggal).getDay()
    byDow[dow] += r.nilai || 0
    cntDow[dow]++
  })
  const maxDow = Math.max(...byDow.map((v, i) => cntDow[i] > 0 ? v / cntDow[i] : 0))
  const dataDow = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((label, i) => ({
    label,
    value: cntDow[i] > 0 ? Math.round(byDow[i] / cntDow[i]) : 0,
    isPeak: cntDow[i] > 0 && (byDow[i] / cntDow[i]) === maxDow,
  }))

  const last6 = last12.slice(6)
  const metodeKeys = ['Cash', 'Transfer', 'QRIS']
  const metodeColors = [C.yellow, C.accent, C.green]

  const dataMetode = last6.map(m => {
    const row = { label: m.label }
    metodeKeys.forEach(met => {
      row[met] = expenses.filter(r => {
        if (!r.tanggal) return false
        const d = new Date(r.tanggal)
        return d.getMonth() === m.month && d.getFullYear() === m.year && r.transaksi === met
      }).reduce((s, r) => s + r.nilai, 0)
    })
    return row
  })

  const charts = [
    {
      title: 'Income vs Pengeluaran',
      subtitle: '12 bulan terakhir',
      icon: 'trending_up',
      render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data12} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.green} stopOpacity={0.18} />
                <stop offset="95%" stopColor={C.green} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.red} stopOpacity={0.18} />
                <stop offset="95%" stopColor={C.red} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtTick} tick={axisStyle} tickLine={false} axisLine={false} width={34} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            <Area type="monotone" dataKey="Income" stroke={C.green} strokeWidth={2} fill="url(#gIncome)" dot={{ r: 2.5, fill: C.green, strokeWidth: 0 }} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="Pengeluaran" stroke={C.red} strokeWidth={2} fill="url(#gExp)" dot={{ r: 2.5, fill: C.red, strokeWidth: 0 }} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      )
    },
    {
      title: 'Saldo Kumulatif',
      subtitle: '12 bulan terakhir',
      icon: 'account_balance',
      render: () => {
        const color = lastSaldo >= 0 ? C.blue : C.red
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataSaldo} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={fmtTick} tick={axisStyle} tickLine={false} axisLine={false} width={34} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={C.gray} strokeDasharray="4 3" />
              <Area type="monotone" dataKey="Saldo" stroke={color} strokeWidth={2.5} fill="url(#gSaldo)"
                dot={{ r: 2.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )
      }
    },
    {
      title: 'Top Kategori',
      subtitle: 'Periode aktif',
      icon: 'donut_large',
      render: () => pieData.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: 13 }}>
          Belum ada data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="42%" cy="50%"
              innerRadius="52%" outerRadius="78%"
              dataKey="value"
              paddingAngle={2}
              startAngle={90} endAngle={-270}
            >
              {pieData.map((d, i) => <Cell key={i} fill={d.fill} stroke="var(--surface)" strokeWidth={2} />)}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              layout="vertical" align="right" verticalAlign="middle"
              iconType="circle" iconSize={8}
              wrapperStyle={{ fontSize: 10, lineHeight: '18px' }}
              formatter={(value) => <span style={{ color: 'var(--text3)' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )
    },
    {
      title: 'Budget vs Realisasi',
      subtitle: `Bulan ${bulanNow}`,
      icon: 'pie_chart',
      render: () => dataBudget.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36 }}>pie_chart</span>
          <p style={{ fontSize: 13 }}>Belum ada budget plan</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataBudget} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtTick} tick={axisStyle} tickLine={false} axisLine={false} width={34} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const item = dataBudget.find(d => d.label === label)
                const over = (item?.Realisasi || 0) > (item?.Alokasi || 0)
                return (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                      {item?.fullLabel || label}
                      {over && <span style={{ marginLeft: 6, color: C.red, fontSize: 10 }}>⚠ Over</span>}
                    </div>
                    {payload.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text3)', marginBottom: 2 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
                        <span>{p.name}:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmtTick(p.value)}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
              cursor={{ fill: 'var(--border)', opacity: 0.4 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            <Bar dataKey="Alokasi" fill={C.gray} opacity={0.6} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Realisasi" radius={[3, 3, 0, 0]}>
              {dataBudget.map((d, i) => (
                <Cell key={i} fill={d.Realisasi > d.Alokasi ? C.red : C.green} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    },
    {
      title: 'Hari Paling Boros',
      subtitle: 'Rata-rata pengeluaran per hari',
      icon: 'calendar_today',
      render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataDow} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtTick} tick={axisStyle} tickLine={false} axisLine={false} width={34} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
            <Bar dataKey="value" name="Rata-rata" radius={[4, 4, 0, 0]}>
              {dataDow.map((d, i) => (
                <Cell key={i} fill={d.isPeak ? C.red : C.blue} opacity={d.isPeak ? 1 : 0.65} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    },
    {
      title: 'Metode Pembayaran',
      subtitle: '6 bulan terakhir',
      icon: 'payments',
      render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataMetode} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtTick} tick={axisStyle} tickLine={false} axisLine={false} width={34} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            {metodeKeys.map((key, i) => (
              <Bar key={key} dataKey={key} stackId="a" fill={metodeColors[i]}
                radius={i === metodeKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
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
            <div key={i}
              onClick={() => { setAnimDir(i > idx ? 'left' : 'right'); setTimeout(() => { setIdx(i); setAnimDir(null) }, 180) }}
              style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? 'var(--accent)' : 'var(--border)', transition: 'all 0.3s', cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div
        {...swipe}
        style={{
          padding: '12px 12px 4px',
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

      {/* Arrow nav — pakai lucide-react bukan material symbols */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 12px' }}>
        <button
          onClick={() => go('right')}
          disabled={idx === 0}
          aria-label="Sebelumnya"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid var(--border)',
            background: idx === 0 ? 'var(--surface2)' : 'var(--surface)',
            cursor: idx === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: idx === 0 ? 'var(--border)' : 'var(--accent)',
            transition: 'all 0.15s', touchAction: 'manipulation',
          }}
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{idx + 1} / {charts.length}</span>
        <button
          onClick={() => go('left')}
          disabled={idx === charts.length - 1}
          aria-label="Berikutnya"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid var(--border)',
            background: idx === charts.length - 1 ? 'var(--surface2)' : 'var(--surface)',
            cursor: idx === charts.length - 1 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: idx === charts.length - 1 ? 'var(--border)' : 'var(--accent)',
            transition: 'all 0.15s', touchAction: 'manipulation',
          }}
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
