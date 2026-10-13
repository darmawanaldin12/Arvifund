import { periodDays, sumInPeriod, isInPeriod } from './scorecard-period'
import { buildBudgetVsReal } from './kategori'

// Data carousel dashboard berbasis PERIODE GAJIAN (bukan bulan kalender).
// Label periode = nama bulan di tanggal akhir periode (mis. 24 Sep – 23 Okt → "Okt"),
// sama dengan pemetaan budget di halaman Budget Plan.

const BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
const shortLabel = p => BULAN_SHORT[p.end.getMonth()]

// Periode yang sudah/sedang berjalan, urut lama → baru (periode yang belum mulai dibuang)
export function getPastPeriods(periods, n = 12) {
  return [...(periods || [])].reverse().filter(p => periodDays(p).elapsed > 0).slice(-n)
}

export function buildIncExpPeriode(expenses, income, periods) {
  return getPastPeriods(periods, 12).map(p => ({
    label: shortLabel(p),
    Income: sumInPeriod(income, p, 'jumlah'),
    Pengeluaran: sumInPeriod(expenses, p, 'nilai'),
  }))
}

export function buildSaldoPeriode(incExpData) {
  let running = 0
  return incExpData.map(d => {
    running += (d.Income || 0) - (d.Pengeluaran || 0)
    return { label: d.label, Saldo: running }
  })
}

export function buildMetodePeriode(expenses, periods) {
  const keys = ['Cash', 'Transfer', 'QRIS']
  return getPastPeriods(periods, 6).map(p => {
    const row = { label: shortLabel(p) }
    const inP = (expenses || []).filter(r => isInPeriod(r.tanggal, p))
    keys.forEach(met => {
      row[met] = inP.filter(r => r.transaksi === met).reduce((s, r) => s + (r.nilai || 0), 0)
    })
    return row
  })
}

// Budget vs realisasi untuk satu periode — data sama dengan halaman Budget Plan
export function buildBudgetPeriode(budgetPlans, refExpenses, refPeriod) {
  const { items } = buildBudgetVsReal({ budgetPlans, expenses: refExpenses, period: refPeriod })
  return items.map(b => ({
    label: b.kategori.length > 7 ? b.kategori.slice(0, 6) + '…' : b.kategori,
    fullLabel: b.kategori,
    Alokasi: b.alokasi,
    Realisasi: b.realisasi,
  }))
}
