'use client'
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { fmt } from '../lib/utils'
import {
  buildPeriodeIniData, buildRataHarianPeriode, buildProyeksiPeriode,
} from '../lib/scorecard-period'
import { Stat, LegendItem, CustomTooltip, fmtTick, RED, ACCENT, YELLOW, GRAY } from './ScorecardCharts'

const statRowStyle = { display: 'flex', gap: 8, background: 'var(--bg)', borderRadius: 10, padding: '12px 8px', border: '1px solid var(--border)' }
const legendStyle  = { display: 'flex', gap: 12, flexWrap: 'wrap', padding: '4px 0' }

// Pengeluaran per hari dalam satu periode gajian
export function ChartPeriodeIni({ expenses, period }) {
  if (!period) return null
  const data  = buildPeriodeIniData(expenses, period)
  const total = data.reduce((s, d) => s + d.value, 0)
  const peak  = data.reduce((a, b) => b.value > a.value ? b : a, data[0])
  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{period.label}</div>
      <div style={statRowStyle}>
        <Stat label="Total Periode Ini" value={fmt(total)} color={RED} />
        <Stat label="Hari Tertinggi"    value={`Tgl ${peak.label}`} />
        <Stat label="Puncak"            value={fmt(peak.value)} color={RED} />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} interval={data.length > 20 ? 4 : 1} />
          <YAxis tickFormatter={fmtTick} tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<CustomTooltip prefix="Tgl " />} cursor={{ fill: 'var(--border)', opacity: 0.5 }} />
          <Bar dataKey="value" name="Pengeluaran" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.isToday ? ACCENT : d.isFuture ? 'var(--border)' : d.value > 0 ? RED : 'var(--border)'} opacity={d.isFuture ? 0.3 : 0.9} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={legendStyle}>
        <LegendItem color={RED} label="Pengeluaran" />
        <LegendItem color={ACCENT} label="Hari ini" />
        <LegendItem color="var(--border)" label="Belum terjadi" />
      </div>
    </>
  )
}

// Rata-rata harian per periode gajian
export function ChartRataHarianPeriode({ expenses, periods }) {
  const data = buildRataHarianPeriode(expenses, periods || [])
  if (data.length === 0) return null
  const nonZero = data.filter(d => d.value > 0)
  const avg     = nonZero.length > 0 ? Math.round(nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length) : 0
  const peak    = data.reduce((a, b) => b.value > a.value ? b : a, data[0])
  return (
    <>
      <div style={statRowStyle}>
        <Stat label="Rata-rata"        value={fmt(avg)} color={YELLOW} />
        <Stat label="Periode Tertinggi" value={peak.bulan} />
        <Stat label="Puncak"           value={fmt(peak.value)} color={RED} />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmtTick} tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avg} stroke={YELLOW} strokeDasharray="4 4" strokeOpacity={0.6} />
          <Line type="monotone" dataKey="value" name="Rata-rata Harian" stroke={YELLOW} strokeWidth={2.5}
            dot={{ r: 3, fill: YELLOW, strokeWidth: 0 }} activeDot={{ r: 5, fill: YELLOW }} />
        </LineChart>
      </ResponsiveContainer>
      <div style={legendStyle}><LegendItem color={YELLOW} label="Rata-rata harian (Rp/hari)" /></div>
    </>
  )
}

// Actual vs proyeksi vs budget per periode gajian
export function ChartProyeksiPeriode({ expenses, budgetPlans, periods }) {
  const data = buildProyeksiPeriode(expenses, budgetPlans, periods || [])
  if (data.length === 0) return null
  const cur = data[data.length - 1]
  return (
    <>
      <div style={statRowStyle}>
        <Stat label="Actual Periode Ini" value={fmt(cur?.Actual)} color={ACCENT} />
        <Stat label="Proyeksi"           value={fmt(cur?.Proyeksi)} color={RED} />
        <Stat label="Budget"             value={cur?.Budget ? fmt(cur.Budget) : '—'} color={GRAY} />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmtTick} tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
          <Bar dataKey="Actual" fill={ACCENT} radius={[3, 3, 0, 0]} opacity={0.85} />
          <Line type="monotone" dataKey="Proyeksi" stroke={RED}  strokeWidth={2}   strokeDasharray="5 3" dot={{ r: 3, fill: RED,  strokeWidth: 0 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="Budget"   stroke={GRAY} strokeWidth={1.5}                      dot={{ r: 3, fill: GRAY, strokeWidth: 0 }} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={legendStyle}>
        <LegendItem color={ACCENT} label="Actual" />
        <LegendItem color={RED}    label="Proyeksi (garis)" />
        <LegendItem color={GRAY}   label="Budget (garis)" />
      </div>
    </>
  )
}
