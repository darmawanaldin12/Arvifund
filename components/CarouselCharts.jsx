'use client'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'

export const C = {
  green: '#22c55e', red: '#f43f5e', blue: '#38bdf8', accent: '#3b82f6',
  orange: '#f97316', pink: '#ec4899', purple: '#a855f7',
  teal: '#06b6d4', yellow: '#f59e0b', gray: '#94a3b8',
}
export const DONUT_COLORS = [C.accent, C.orange, C.pink, C.green, C.purple, C.teal, C.yellow]

export const fmtTick = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000)     return `${Math.round(v / 1_000)}rb`
  return String(v)
}

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', maxWidth: 180 }}>
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

export function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}>
      <div style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>{p.name}</div>
      <div style={{ color: 'var(--text3)' }}>
        {fmtTick(p.value)} <span style={{ color: p.payload.fill }}>{p.payload.percent ? `(${(p.payload.percent * 100).toFixed(1)}%)` : ''}</span>
      </div>
    </div>
  )
}

const ax = { fontSize: 9, fill: 'var(--text3)' }
const gr = { strokeDasharray: '3 3', stroke: 'var(--border)', vertical: false }

export function ChartIncExp({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.green} stopOpacity={0.18} />
            <stop offset="95%" stopColor={C.green} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.red} stopOpacity={0.18} />
            <stop offset="95%" stopColor={C.red} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gr} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={34} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Area type="monotone" dataKey="Income"      stroke={C.green} strokeWidth={2} fill="url(#gInc)" dot={{ r: 2.5, fill: C.green, strokeWidth: 0 }} activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="Pengeluaran" stroke={C.red}   strokeWidth={2} fill="url(#gExp)" dot={{ r: 2.5, fill: C.red,   strokeWidth: 0 }} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ChartSaldo({ data }) {
  const lastSaldo = data[data.length - 1]?.Saldo || 0
  const color     = lastSaldo >= 0 ? C.blue : C.red
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gr} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={34} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke={C.gray} strokeDasharray="4 3" />
        <Area type="monotone" dataKey="Saldo" stroke={color} strokeWidth={2.5} fill="url(#gSaldo)"
          dot={{ r: 2.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ChartKategori({ pieData }) {
  if (pieData.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: 13 }}>Belum ada data</div>
  )
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={pieData} cx="42%" cy="50%" innerRadius="52%" outerRadius="78%" dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
          {pieData.map((d, i) => <Cell key={i} fill={d.fill} stroke="var(--surface)" strokeWidth={2} />)}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
          wrapperStyle={{ fontSize: 10, lineHeight: '18px' }}
          formatter={(value) => <span style={{ color: 'var(--text3)' }}>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function ChartBudget({ data }) {
  if (data.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', gap: 8 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 36 }}>pie_chart</span>
      <p style={{ fontSize: 13 }}>Belum ada budget plan</p>
    </div>
  )
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid {...gr} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={34} />
        <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const item = data.find(d => d.label === label)
            const over = (item?.Realisasi || 0) > (item?.Alokasi || 0)
            return (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.14)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                  {item?.fullLabel || label}{over && <span style={{ marginLeft: 6, color: C.red, fontSize: 10 }}>⚠ Over</span>}
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
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Bar dataKey="Alokasi"   fill={C.gray}  opacity={0.6} radius={[3, 3, 0, 0]} />
        <Bar dataKey="Realisasi" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.Realisasi > d.Alokasi ? C.red : C.green} opacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ChartDow({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid {...gr} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={34} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
        <Bar dataKey="value" name="Rata-rata" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.isPeak ? C.red : C.blue} opacity={d.isPeak ? 1 : 0.65} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ChartMetode({ data }) {
  const keys   = ['Cash', 'Transfer', 'QRIS']
  const colors = [C.yellow, C.accent, C.green]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid {...gr} />
        <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtTick} tick={ax} tickLine={false} axisLine={false} width={34} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        {keys.map((key, i) => (
          <Bar key={key} dataKey={key} stackId="a" fill={colors[i]}
            radius={i === keys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
