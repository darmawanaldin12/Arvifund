'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fmt } from '../lib/utils'
import { Stat, LegendItem, fmtTick, RED, ACCENT, GREEN, GRAY } from './ScorecardCharts'

const statRowStyle = { display: 'flex', gap: 8, background: 'var(--bg)', borderRadius: 10, padding: '12px 8px', border: '1px solid var(--border)' }
const legendStyle  = { display: 'flex', gap: 12, flexWrap: 'wrap', padding: '4px 0' }

// Sisa budget per kategori untuk periode terpilih — data dari buildBudgetVsReal (lib/kategori.js),
// sama persis dengan halaman Budget Plan.
export function ChartSisaBudgetPeriode({ budgetPeriode }) {
  const items = budgetPeriode?.items || []
  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
      Belum ada budget plan di periode ini.<br />Atur di halaman Budget.
    </div>
  )

  const data = items.map(b => ({
    label: b.kategori.length > 8 ? b.kategori.slice(0, 7) + '…' : b.kategori,
    fullLabel: b.kategori,
    Alokasi: b.alokasi,
    Realisasi: b.realisasi,
  }))
  const totalAlokasi   = budgetPeriode.totalAlokasi
  const totalRealisasi = budgetPeriode.totalRealisasi
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
