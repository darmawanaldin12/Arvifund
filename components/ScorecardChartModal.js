'use client'
import { useEffect, useState, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { fmt, BULAN_ORDER, getLocalDate, getLocalDateStr, parseTanggal } from '../lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useMount(open) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (open) { requestAnimationFrame(() => setMounted(true)) }
    else { const t = setTimeout(() => setMounted(false), 300); return () => clearTimeout(t) }
  }, [open])
  return mounted
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text1)' }}>
        {prefix}{label}
      </div>
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

// ─── Data builders ────────────────────────────────────────────────────────────

function buildBulanIniData(filteredExpenses) {
  const now = getLocalDate()
  const year = now.getFullYear()
  const month = now.getMonth()
  const totalHari = new Date(year, month + 1, 0).getDate()
  const hariIni = now.getDate()

  const dayMap = {}
  filteredExpenses.forEach(r => {
    const dt = parseTanggal(r.tanggal)
    if (!dt || dt.getFullYear() !== year || dt.getMonth() !== month) return
    const d = dt.getDate()
    dayMap[d] = (dayMap[d] || 0) + r.nilai
  })

  return Array.from({ length: totalHari }, (_, i) => {
    const d = i + 1
    return {
      label: String(d),
      value: dayMap[d] || 0,
      isToday: d === hariIni,
      isFuture: d > hariIni,
    }
  })
}

function buildRataHarianData(expenses) {
  const now = getLocalDate()
  const result = []
  for (let m = 11; m >= 0; m--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const y = dt.getFullYear()
    const mo = dt.getMonth()
    const bulanNama = BULAN_ORDER[mo]
    const totalHari = new Date(y, mo + 1, 0).getDate()
    const total = expenses.filter(r => {
      const d = parseTanggal(r.tanggal)
      return d && d.getFullYear() === y && d.getMonth() === mo
    }).reduce((s, r) => s + r.nilai, 0)
    const avg = total > 0 ? Math.round(total / totalHari) : 0
    result.push({ label: bulanNama.slice(0, 3), value: avg, bulan: bulanNama })
  }
  return result
}

function buildProyeksiData(expenses, budgetPlans) {
  const now = getLocalDate()
  const result = []
  for (let m = 5; m >= 0; m--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const y = dt.getFullYear()
    const mo = dt.getMonth()
    const bulanNama = BULAN_ORDER[mo]
    const totalHari = new Date(y, mo + 1, 0).getDate()
    const hariKe = m === 0 ? now.getDate() : totalHari

    const actual = expenses.filter(r => {
      const d = parseTanggal(r.tanggal)
      return d && d.getFullYear() === y && d.getMonth() === mo
    }).reduce((s, r) => s + r.nilai, 0)

    const rata = hariKe > 0 ? actual / hariKe : 0
    const proyeksi = Math.round(rata * totalHari)

    const budget = (budgetPlans || [])
      .filter(p => p.bulan === bulanNama && p.tahun === y)
      .reduce((s, p) => s + (p.alokasi || 0), 0)

    result.push({ label: bulanNama.slice(0, 3), Actual: actual, Proyeksi: proyeksi, Budget: budget || undefined })
  }
  return result
}

function buildSisaBudgetData(filteredExpenses, budgetPlans) {
  const now = getLocalDate()
  const bulanNama = BULAN_ORDER[now.getMonth()]
  const plans = (budgetPlans || []).filter(p => p.bulan === bulanNama && p.tahun === now.getFullYear())
  if (plans.length === 0) return []
  const expByKat = {}
  filteredExpenses.forEach(r => { expByKat[r.kategori] = (expByKat[r.kategori] || 0) + r.nilai })
  return plans
    .sort((a, b) => b.alokasi - a.alokasi)
    .slice(0, 8)
    .map(p => ({
      label: p.kategori?.length > 8 ? p.kategori.slice(0, 7) + '…' : (p.kategori || '?'),
      fullLabel: p.kategori || '?',
      Alokasi: p.alokasi || 0,
      Realisasi: expByKat[p.kategori] || 0,
    }))
}

// ─── Stat & Legend helpers ────────────────────────────────────────────────────

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: color || 'var(--text1)' }}>{value}</div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}
    </div>
  )
}

// ─── Chart tick formatters ────────────────────────────────────────────────────

const fmtTick = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `${Math.round(v / 1_000)}rb`
  return String(v)
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function ScorecardChartModal({
  open, onClose, type,
  filteredExpenses = [], expenses = [], budgetPlans = []
}) {
  const mounted = useMount(open)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open && !mounted) return null

  // ── Chart configs ──────────────────────────────────────────────────────────

  const RED    = '#f43f5e'
  const ACCENT = '#3b82f6'
  const YELLOW = '#d97706'
  const GRAY   = '#94a3b8'
  const GREEN  = '#22c55e'

  const configs = {

    // 1. Bulan Ini — bar per hari
    bulanIni: {
      title: 'Pengeluaran Bulan Ini',
      subtitle: 'Per hari — tabel expenses',
      icon: 'calendar_today',
      color: RED,
      render: () => {
        const data = buildBulanIniData(filteredExpenses)
        const total = data.reduce((s, d) => s + d.value, 0)
        const peak = data.reduce((a, b) => b.value > a.value ? b : a, data[0])
        return (
          <>
            <div style={styles.statRow}>
              <Stat label="Total Bulan Ini" value={fmt(total)} color={RED} />
              <Stat label="Hari Tertinggi" value={`Tgl ${peak.label}`} />
              <Stat label="Puncak" value={fmt(peak.value)} color={RED} />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'var(--text3)' }}
                  tickLine={false} axisLine={false}
                  interval={data.length > 20 ? 4 : 1}
                />
                <YAxis
                  tickFormatter={fmtTick}
                  tick={{ fontSize: 9, fill: 'var(--text3)' }}
                  tickLine={false} axisLine={false} width={36}
                />
                <Tooltip content={<CustomTooltip prefix="Tgl " />} cursor={{ fill: 'var(--border)', opacity: 0.5 }} />
                <Bar dataKey="value" name="Pengeluaran" radius={[3, 3, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.isToday ? ACCENT : d.isFuture ? 'var(--border)' : d.value > 0 ? RED : 'var(--border)'}
                      opacity={d.isFuture ? 0.3 : 0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
              <LegendItem color={RED} label="Pengeluaran" />
              <LegendItem color={ACCENT} label="Hari ini" />
              <LegendItem color="var(--border)" label="Belum terjadi" />
            </div>
          </>
        )
      }
    },

    // 2. Rata-rata Harian — line 12 bulan
    rataHarian: {
      title: 'Rata-rata Harian',
      subtitle: '12 bulan terakhir — tabel expenses',
      icon: 'query_stats',
      color: YELLOW,
      render: () => {
        const data = buildRataHarianData(expenses)
        const nonZero = data.filter(d => d.value > 0)
        const avg = nonZero.length > 0
          ? Math.round(nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length) : 0
        const peak = data.reduce((a, b) => b.value > a.value ? b : a, data[0])
        return (
          <>
            <div style={styles.statRow}>
              <Stat label="Rata-rata" value={fmt(avg)} color={YELLOW} />
              <Stat label="Bulan Tertinggi" value={peak.bulan} />
              <Stat label="Puncak" value={fmt(peak.value)} color={RED} />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtTick} tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={avg} stroke={YELLOW} strokeDasharray="4 4" strokeOpacity={0.6} />
                <Line
                  type="monotone" dataKey="value" name="Rata-rata Harian"
                  stroke={YELLOW} strokeWidth={2.5}
                  dot={{ r: 3, fill: YELLOW, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: YELLOW }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
              <LegendItem color={YELLOW} label="Rata-rata harian (Rp/hari)" />
            </div>
          </>
        )
      }
    },

    // 3. Proyeksi Akhir — composed bar+line 6 bulan
    proyeksi: {
      title: 'Proyeksi Akhir Bulan',
      subtitle: '6 bulan: actual vs proyeksi vs budget — expenses & budget_plans',
      icon: 'insights',
      color: ACCENT,
      render: () => {
        const data = buildProyeksiData(expenses, budgetPlans)
        const cur = data[data.length - 1]
        return (
          <>
            <div style={styles.statRow}>
              <Stat label="Actual Bulan Ini" value={fmt(cur?.Actual)} color={ACCENT} />
              <Stat label="Proyeksi" value={fmt(cur?.Proyeksi)} color={RED} />
              <Stat label="Budget" value={cur?.Budget ? fmt(cur.Budget) : '—'} color={GRAY} />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtTick} tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
                <Bar dataKey="Actual" fill={ACCENT} radius={[3, 3, 0, 0]} opacity={0.85} />
                <Line type="monotone" dataKey="Proyeksi" stroke={RED} strokeWidth={2} strokeDasharray="5 3"
                  dot={{ r: 3, fill: RED, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Budget" stroke={GRAY} strokeWidth={1.5}
                  dot={{ r: 3, fill: GRAY, strokeWidth: 0 }} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
              <LegendItem color={ACCENT} label="Actual" />
              <LegendItem color={RED} label="Proyeksi (garis)" />
              <LegendItem color={GRAY} label="Budget (garis)" />
            </div>
          </>
        )
      }
    },

    // 4. Sisa Budget — grouped bar per kategori
    sisaBudget: {
      title: 'Sisa Budget per Kategori',
      subtitle: 'Bulan ini: alokasi vs realisasi — budget_plans & expenses',
      icon: 'account_balance',
      color: GREEN,
      render: () => {
        const data = buildSisaBudgetData(filteredExpenses, budgetPlans)
        if (data.length === 0) return (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
            Belum ada budget plan bulan ini.<br />Atur di halaman Budget.
          </div>
        )
        const totalAlokasi = data.reduce((s, d) => s + d.Alokasi, 0)
        const totalRealisasi = data.reduce((s, d) => s + d.Realisasi, 0)
        const sisa = totalAlokasi - totalRealisasi
        return (
          <>
            <div style={styles.statRow}>
              <Stat label="Total Alokasi" value={fmt(totalAlokasi)} />
              <Stat label="Terpakai" value={fmt(totalRealisasi)} color={RED} />
              <Stat label="Sisa" value={fmt(Math.abs(sisa))} color={sisa >= 0 ? GREEN : RED} />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtTick} tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const item = data.find(d => d.label === label)
                    const over = (item?.Realisasi || 0) > (item?.Alokasi || 0)
                    return (
                      <div style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '8px 12px', fontSize: 12,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      }}>
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
                  cursor={{ fill: 'var(--border)', opacity: 0.4 }}
                />
                <Bar dataKey="Alokasi" fill={GRAY} radius={[3, 3, 0, 0]} opacity={0.7} />
                <Bar dataKey="Realisasi" radius={[3, 3, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.Realisasi > d.Alokasi ? RED : ACCENT} opacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
              <LegendItem color={GRAY} label="Alokasi" />
              <LegendItem color={ACCENT} label="Realisasi" />
              <LegendItem color={RED} label="Over budget" />
            </div>
            {/* Progress per kategori */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {data.map((d, i) => {
                const pct = d.Alokasi > 0 ? Math.min(Math.round(d.Realisasi / d.Alokasi * 100), 100) : 0
                const over = d.Realisasi > d.Alokasi
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>{d.fullLabel}</span>
                      <span style={{ color: over ? RED : 'var(--text3)' }}>
                        {fmt(d.Realisasi)} / {fmt(d.Alokasi)}
                        {over && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: over ? RED : ACCENT,
                        borderRadius: 3, transition: 'width 0.6s',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      }
    },
  }

  const cfg = configs[type] || configs.bulanIni
  const isVisible = open && mounted

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        ...styles.overlay,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.25s ease',
      }}
    >
      <div style={{
        ...styles.sheet,
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        <div style={styles.handle} />
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 22, color: cfg.color, fontVariationSettings: "'FILL' 1" }}>
              {cfg.icon}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{cfg.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{cfg.subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div style={styles.body}>
          {cfg.render()}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'flex-end',
    backdropFilter: 'blur(2px)',
  },
  sheet: {
    width: '100%', maxWidth: 560,
    margin: '0 auto',
    background: 'var(--surface)',
    borderRadius: '20px 20px 0 0',
    maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    background: 'var(--border)',
    margin: '12px auto 4px',
    flexShrink: 0,
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '12px 20px 12px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0, gap: 12,
  },
  closeBtn: {
    background: 'var(--border)', border: 'none', borderRadius: '50%',
    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text3)', flexShrink: 0, padding: 0,
  },
  body: {
    flex: 1, overflowY: 'auto',
    padding: '16px 20px 32px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  statRow: {
    display: 'flex', gap: 8,
    background: 'var(--bg)',
    borderRadius: 10, padding: '12px 8px',
    border: '1px solid var(--border)',
  },
  legend: {
    display: 'flex', gap: 12, flexWrap: 'wrap',
    padding: '4px 0',
  },
}
