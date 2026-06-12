'use client'
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { fmt } from '../lib/utils'
import {
  buildBulanIniData, buildRataHarianData,
  buildProyeksiData, buildSisaBudgetData,
} from '../lib/scorecard-data'

export const RED = '#f43f5e', ACCENT = '#3b82f6', YELLOW = '#d97706', GRAY = '#94a3b8', GREEN = '#22c55e'

export const fmtTick = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`
  return String(v)
}

export function CustomTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text1)' }}>{prefix}{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text3)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.fill, flexShrink: 0 }} />
          <span>{p.name}: </span>
          <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: color || 'var(--text1)' }}>{value}</div>
    </div>
  )
}

export function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />{label}
    </div>
  )
}

const statRowStyle = { display: 'flex', gap: 8, background: 'var(--bg)', borderRadius: 10, padding: '12px 8px', border: '1px solid var(--border)' }
const legendStyle  = { display: 'flex', gap: 12, flexWrap: 'wrap', padding: '4px 0' }

export function ChartBulanIni({ filteredExpenses }) {
  const data = buildBulanIniData(filteredExpenses)
  const total = data.reduce((s, d) => s + d.value, 0)
  const peak  = data.reduce((a, b) => b.value > a.value ? b : a, data[0])
  return (
    <>
      <div style={statRowStyle}>
        <Stat label="Total Bulan Ini" value={fmt(total)} color={RED} />
        <Stat label="Hari Tertinggi"  value={`Tgl ${peak.label}`} />
        <Stat label="Puncak"          value={fmt(peak.value)} color={RED} />
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

export function ChartRataHarian({ expenses }) {
  const data    = buildRataHarianData(expenses)
  const nonZero = data.filter(d => d.value > 0)
  const avg     = nonZero.length > 0 ? Math.round(nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length) : 0
  const peak    = data.reduce((a, b) => b.value > a.value ? b : a, data[0])
  return (
    <>
      <div style={statRowStyle}>
        <Stat label="Rata-rata"       value={fmt(avg)} color={YELLOW} />
        <Stat label="Bulan Tertinggi" value={peak.bulan} />
        <Stat label="Puncak"          value={fmt(peak.value)} color={RED} />
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

export function ChartProyeksi({ expenses, budgetPlans }) {
  const data = buildProyeksiData(expenses, budgetPlans)
  const cur  = data[data.length - 1]
  return (
    <>
      <div style={statRowStyle}>
        <Stat label="Actual Bulan Ini" value={fmt(cur?.Actual)} color={ACCENT} />
        <Stat label="Proyeksi"         value={fmt(cur?.Proyeksi)} color={RED} />
        <Stat label="Budget"           value={cur?.Budget ? fmt(cur.Budget) : '—'} color={GRAY} />
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

export function ChartSisaBudget({ filteredExpenses, budgetPlans }) {
  const data = buildSisaBudgetData(filteredExpenses, budgetPlans)
  if (data.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
      Belum ada budget plan bulan ini.<br />Atur di halaman Budget.
    </div>
  )
  const totalAlokasi   = data.reduce((s, d) => s + d.Alokasi, 0)
  const totalRealisasi = data.reduce((s, d) => s + d.Realisasi, 0)
  const sisa           = totalAlokasi - totalRealisasi
  return (
    <>
      <div style={statRowStyle}>
        <Stat label="Total Alokasi" value={fmt(totalAlokasi)} />
        <Stat label="Terpakai"      value={fmt(totalRealisasi)} color={RED} />
        <Stat label="Sisa"          value={fmt(Math.abs(sisa))} color={sisa >= 0 ? GREEN : RED} />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmtTick} tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={36} />
          <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const item = data.find(d => d.label === label)
              const over = (item?.Realisasi || 0) > (item?.Alokasi || 0)
              return (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text1)' }}>
                    {item?.fullLabel || label}
                    {over && <span style={{ marginLeft: 6, color: RED, fontSize: 10 }}>⚠ Over budget</span>}
                  </div>
                  {payload.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text3)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
                      <span>{p.name}: </span>
                      <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmt(p.value)}</span>
                    </div>
                  ))}
                </div>
              )
            }}
          />
          <Bar dataKey="Alokasi"   fill={GRAY}  radius={[3, 3, 0, 0]} opacity={0.7} />
          <Bar dataKey="Realisasi" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.Realisasi > d.Alokasi ? RED : ACCENT} opacity={0.9} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={legendStyle}>
        <LegendItem color={GRAY}   label="Alokasi" />
        <LegendItem color={ACCENT} label="Realisasi" />
        <LegendItem color={RED}    label="Over budget" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {data.map((d, i) => {
          const pct  = d.Alokasi > 0 ? Math.min(Math.round(d.Realisasi / d.Alokasi * 100), 100) : 0
          const over = d.Realisasi > d.Alokasi
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{d.fullLabel}</span>
                <span style={{ color: over ? RED : 'var(--text3)' }}>
                  {fmt(d.Realisasi)} / {fmt(d.Alokasi)}{over && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: over ? RED : ACCENT, borderRadius: 3, transition: 'width 0.6s' }} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
