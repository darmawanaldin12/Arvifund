import { BULAN_ORDER, getLocalDate, parseTanggal } from './utils'

// Data scorecard berbasis PERIODE GAJIAN (bukan bulan kalender).
// period = objek dari buildPeriods: { start, end, label }

const DAY = 86400000
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY)

// total = jumlah hari periode; elapsed = hari yang sudah berjalan
// (0 jika periode belum mulai, = total jika sudah lewat)
export function periodDays(period, today = getLocalDate()) {
  const total = daysBetween(period.start, period.end) + 1
  const t = startOfDay(today)
  const s = startOfDay(period.start)
  const e = startOfDay(period.end)
  const elapsed = t < s ? 0 : t > e ? total : daysBetween(s, t) + 1
  return { total, elapsed }
}

// Jumlahkan field `key` (default 'nilai'; pemasukan pakai 'jumlah') untuk baris yang tanggalnya di dalam periode
export function sumInPeriod(rows, period, key = 'nilai') {
  const s = startOfDay(period.start), e = startOfDay(period.end)
  return (rows || []).reduce((sum, r) => {
    const d = parseTanggal(r.tanggal)
    return d && startOfDay(d) >= s && startOfDay(d) <= e ? sum + (r[key] || 0) : sum
  }, 0)
}

// Budget (budget_plans) periode = bulan di tanggal AKHIR periode, sama seperti Budget Plan
export function budgetOfPeriod(budgetPlans, period) {
  const bulan = BULAN_ORDER[period.end.getMonth()]
  const tahun = period.end.getFullYear()
  return (budgetPlans || [])
    .filter(p => p.bulan === bulan && p.tahun === tahun)
    .reduce((s, p) => s + (p.alokasi || 0), 0)
}

// Grafik harian di dalam satu periode (dari tanggal mulai sampai akhir periode)
export function buildPeriodeIniData(expenses, period) {
  const s = startOfDay(period.start)
  const today = startOfDay(getLocalDate())
  const total = daysBetween(period.start, period.end) + 1
  const dayMap = {}
  ;(expenses || []).forEach(r => {
    const d = parseTanggal(r.tanggal)
    if (!d) return
    const k = daysBetween(s, d)
    if (k >= 0 && k < total) dayMap[k] = (dayMap[k] || 0) + (r.nilai || 0)
  })
  return Array.from({ length: total }, (_, i) => {
    const dt = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i)
    const diff = daysBetween(dt, today)
    return { label: String(dt.getDate()), value: dayMap[i] || 0, isToday: diff === 0, isFuture: diff < 0 }
  })
}

// Rata-rata pengeluaran per hari untuk periode-periode terakhir (lama → baru)
export function buildRataHarianPeriode(expenses, periods) {
  return [...periods].reverse().map(p => {
    const { total, elapsed } = periodDays(p)
    if (elapsed === 0) return null
    const sum = sumInPeriod(expenses, p)
    const bulanNama = BULAN_ORDER[p.end.getMonth()]
    return { label: bulanNama.slice(0, 3), value: sum > 0 ? Math.round(sum / elapsed) : 0, bulan: bulanNama }
  }).filter(Boolean)
}

// Actual vs proyeksi vs budget untuk 6 periode terakhir (lama → baru)
export function buildProyeksiPeriode(expenses, budgetPlans, periods) {
  return [...periods].reverse().map(p => {
    const { total, elapsed } = periodDays(p)
    if (elapsed === 0) return null
    const actual = sumInPeriod(expenses, p)
    const proyeksi = Math.round((actual / elapsed) * total)
    const budget = budgetOfPeriod(budgetPlans, p)
    return { label: BULAN_ORDER[p.end.getMonth()].slice(0, 3), Actual: actual, Proyeksi: proyeksi, Budget: budget || undefined }
  }).filter(Boolean).slice(-6)
}
