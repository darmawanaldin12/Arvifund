const BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
const BULAN_ID    = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export function getLast12() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i))
    return { label: BULAN_SHORT[d.getMonth()], year: d.getFullYear(), month: d.getMonth() }
  })
}

export function buildIncExpData(expenses, income) {
  const last12 = getLast12()
  const incMap = {}, expMap = {}
  income.forEach(r => {
    if (!r.tanggal) return
    const d = new Date(r.tanggal); const k = `${d.getFullYear()}-${d.getMonth()}`
    incMap[k] = (incMap[k] || 0) + (r.jumlah || 0)
  })
  expenses.forEach(r => {
    if (!r.tanggal) return
    const d = new Date(r.tanggal); const k = `${d.getFullYear()}-${d.getMonth()}`
    expMap[k] = (expMap[k] || 0) + (r.nilai || 0)
  })
  return { data12: last12.map(m => ({ label: m.label, Income: incMap[`${m.year}-${m.month}`] || 0, Pengeluaran: expMap[`${m.year}-${m.month}`] || 0 })), incMap, expMap }
}

export function buildSaldoData(incMap, expMap) {
  let running = 0
  return getLast12().map(m => {
    running += (incMap[`${m.year}-${m.month}`] || 0) - (expMap[`${m.year}-${m.month}`] || 0)
    return { label: m.label, Saldo: running }
  })
}

export function buildPieData(summaryPeriode, DONUT_COLORS) {
  const byKat = summaryPeriode.byKategori || {}
  const entries = Object.entries(byKat).sort((a, b) => b[1] - a[1]).slice(0, 7)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  return entries.map(([name, value], i) => ({
    name: name.length > 10 ? name.slice(0, 9) + '…' : name,
    fullName: name, value, fill: DONUT_COLORS[i],
    percent: total > 0 ? value / total : 0,
  }))
}

export function buildBudgetData(expenses, budgetPlans) {
  const now = new Date()
  const bulanNow = BULAN_ID[now.getMonth()]
  const plans = (budgetPlans || []).filter(p => p.bulan === bulanNow && p.tahun === now.getFullYear())
  const realMap = {}
  expenses.filter(r => {
    const d = new Date(r.tanggal); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).forEach(r => { realMap[r.kategori] = (realMap[r.kategori] || 0) + r.nilai })
  return { bulanNow, data: plans.map(p => ({
    label: p.kategori?.length > 7 ? p.kategori.slice(0, 6) + '…' : (p.kategori || '?'),
    fullLabel: p.kategori, Alokasi: p.alokasi || 0, Realisasi: realMap[p.kategori] || 0,
  }))}
}

export function buildDowData(expenses) {
  const byDow = [0,0,0,0,0,0,0], cntDow = [0,0,0,0,0,0,0]
  expenses.forEach(r => {
    if (!r.tanggal) return
    const dow = new Date(r.tanggal).getDay()
    byDow[dow] += r.nilai || 0; cntDow[dow]++
  })
  const maxDow = Math.max(...byDow.map((v, i) => cntDow[i] > 0 ? v / cntDow[i] : 0))
  return ['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((label, i) => ({
    label, value: cntDow[i] > 0 ? Math.round(byDow[i] / cntDow[i]) : 0,
    isPeak: cntDow[i] > 0 && (byDow[i] / cntDow[i]) === maxDow,
  }))
}

export function buildMetodeData(expenses) {
  const last6 = getLast12().slice(6)
  const keys  = ['Cash', 'Transfer', 'QRIS']
  return last6.map(m => {
    const row = { label: m.label }
    keys.forEach(met => {
      row[met] = expenses.filter(r => {
        if (!r.tanggal) return false
        const d = new Date(r.tanggal)
        return d.getMonth() === m.month && d.getFullYear() === m.year && r.transaksi === met
      }).reduce((s, r) => s + r.nilai, 0)
    })
    return row
  })
}
