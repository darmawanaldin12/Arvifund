'use client'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts'
import { C, fmtTick } from '../CarouselCharts'

// Ukuran font chart mengikuti lebar layar (TV biasanya 960–1920 px CSS)
export function useTvFont() {
  const [fs, setFs] = useState(14)
  useEffect(() => {
    const calc = () => setFs(Math.max(12, Math.round(window.innerWidth / 90)))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return fs
}

const grid = { strokeDasharray: '3 3', stroke: 'var(--border)', vertical: false }
const legendFmt = (v) => <span style={{ color: 'var(--text2)' }}>{v}</span>

export function TvIncExp({ data }) {
  const fs = useTvFont()
  const ax = { fontSize: fs, fill: 'var(--text3)' }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tvInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
            <stop offset="95%" stopColor={C.green} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="tvExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
            <stop offset="95%" stopColor={C.red} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={fs * 3.6} />
        <Legend iconType="circle" iconSize={fs * 0.7} wrapperStyle={{ fontSize: fs, paddingTop: 6 }} formatter={legendFmt} />
        <Area type="monotone" dataKey="Income" stroke={C.green} strokeWidth={3} fill="url(#tvInc)" dot={{ r: 4, fill: C.green, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="Pengeluaran" stroke={C.red} strokeWidth={3} fill="url(#tvExp)" dot={{ r: 4, fill: C.red, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function TvSaldo({ data }) {
  const fs = useTvFont()
  const ax = { fontSize: fs, fill: 'var(--text3)' }
  const last = data[data.length - 1]?.Saldo || 0
  const color = last >= 0 ? C.blue : C.red
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tvSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={fs * 3.6} />
        <ReferenceLine y={0} stroke={C.gray} strokeDasharray="4 3" />
        <Area type="monotone" dataKey="Saldo" stroke={color} strokeWidth={3.5} fill="url(#tvSaldo)" dot={{ r: 4, fill: color, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Donut saja — legenda dibuat sebagai HTML di halaman supaya besar & terbaca dari jauh
export function TvDonut({ pieData }) {
  if (!pieData.length) {
    return <div className="tv-empty">Belum ada data</div>
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius="58%" outerRadius="92%" dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
          {pieData.map((d, i) => <Cell key={i} fill={d.fill} stroke="var(--surface)" strokeWidth={3} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TvDow({ data }) {
  const fs = useTvFont()
  const ax = { fontSize: fs, fill: 'var(--text3)' }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid {...grid} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={fs * 3.6} />
        <Bar dataKey="value" name="Rata-rata" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.isPeak ? C.red : C.blue} opacity={d.isPeak ? 1 : 0.7} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TvMetode({ data }) {
  const fs = useTvFont()
  const ax = { fontSize: fs, fill: 'var(--text3)' }
  const keys = ['Cash', 'Transfer', 'QRIS']
  const colors = [C.yellow, C.accent, C.green]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid {...grid} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={fs * 3.6} />
        <Legend iconType="circle" iconSize={fs * 0.7} wrapperStyle={{ fontSize: fs, paddingTop: 6 }} formatter={legendFmt} />
        {keys.map((key, i) => (
          <Bar key={key} dataKey={key} stackId="a" fill={colors[i]} radius={i === keys.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
