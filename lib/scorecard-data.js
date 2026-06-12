import { BULAN_ORDER, getLocalDate, parseTanggal } from './utils'

export function buildBulanIniData(filteredExpenses) {
  const now = getLocalDate()
  const year = now.getFullYear(), month = now.getMonth()
  const totalHari = new Date(year, month + 1, 0).getDate()
  const hariIni = now.getDate()
  const dayMap = {}
  filteredExpenses.forEach(r => {
    const dt = parseTanggal(r.tanggal)
    if (!dt || dt.getFullYear() !== year || dt.getMonth() !== month) return
    const d = dt.getDate(); dayMap[d] = (dayMap[d] || 0) + r.nilai
  })
  return Array.from({ length: totalHari }, (_, i) => {
    const d = i + 1
    return { label: String(d), value: dayMap[d] || 0, isToday: d === hariIni, isFuture: d > hariIni }
  })
}

export function buildRataHarianData(expenses) {
  const now = getLocalDate()
  return Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const y = dt.getFullYear(), mo = dt.getMonth()
    const bulanNama = BULAN_ORDER[mo]
    const totalHari = new Date(y, mo + 1, 0).getDate()
    const total = expenses.filter(r => {
      const d = parseTanggal(r.tanggal); return d && d.getFullYear() === y && d.getMonth() === mo
    }).reduce((s, r) => s + r.nilai, 0)
    return { label: bulanNama.slice(0, 3), value: total > 0 ? Math.round(total / totalHari) : 0, bulan: bulanNama }
  })
}

export function buildProyeksiData(expenses, budgetPlans) {
  const now = getLocalDate()
  return Array.from({ length: 6 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const y = dt.getFullYear(), mo = dt.getMonth()
    const bulanNama = BULAN_ORDER[mo]
    const totalHari = new Date(y, mo + 1, 0).getDate()
    const hariKe = (5 - i) === 0 ? now.getDate() : totalHari
    const actual = expenses.filter(r => {
      const d = parseTanggal(r.tanggal); return d && d.getFullYear() === y && d.getMonth() === mo
    }).reduce((s, r) => s + r.nilai, 0)
    const proyeksi = hariKe > 0 ? Math.round((actual / hariKe) * totalHari) : 0
    const budget = (budgetPlans || [])
      .filter(p => p.bulan === bulanNama && p.tahun === y)
      .reduce((s, p) => s + (p.alokasi || 0), 0)
    return { label: bulanNama.slice(0, 3), Actual: actual, Proyeksi: proyeksi, Budget: budget || undefined }
  })
}

export function buildSisaBudgetData(filteredExpenses, budgetPlans) {
  const now = getLocalDate()
  const bulanNama = BULAN_ORDER[now.getMonth()]
  const plans = (budgetPlans || []).filter(p => p.bulan === bulanNama && p.tahun === now.getFullYear())
  if (plans.length === 0) return []
  const expByKat = {}
  filteredExpenses.forEach(r => { expByKat[r.kategori] = (expByKat[r.kategori] || 0) + r.nilai })
  return plans.sort((a, b) => b.alokasi - a.alokasi).slice(0, 8).map(p => ({
    label: p.kategori?.length > 8 ? p.kategori.slice(0, 7) + '…' : (p.kategori || '?'),
    fullLabel: p.kategori || '?',
    Alokasi: p.alokasi || 0,
    Realisasi: expByKat[p.kategori] || 0,
  }))
}
