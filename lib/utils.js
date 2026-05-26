// ── FORMAT RUPIAH ──────────────────────────────────────────
export function fmt(val) {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0'
  const n = Number(val)
  if (Math.abs(n) >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace('.', ',') + 'M'
  if (Math.abs(n) >= 1_000_000)     return 'Rp ' + (n / 1_000_000).toFixed(1).replace('.', ',') + 'jt'
  if (Math.abs(n) >= 1_000)         return 'Rp ' + (n / 1_000).toFixed(0) + 'rb'
  return 'Rp ' + n.toLocaleString('id-ID')
}

export function fmtFull(val) {
  if (!val && val !== 0) return 'Rp 0'
  return 'Rp ' + Number(val).toLocaleString('id-ID')
}

// ── PARSE TANGGAL ──────────────────────────────────────────
export function parseTanggal(s) {
  if (!s) return null
  // Format: YYYY-MM-DD (dari Supabase)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.split('T')[0].split('-')
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    return isNaN(dt.getTime()) ? null : dt
  }
  // Format: dd/MM/yyyy (legacy)
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [d, m, y] = s.split('/')
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    return isNaN(dt.getTime()) ? null : dt
  }
  return null
}

export function fmtTanggal(s) {
  const d = parseTanggal(s)
  if (!d) return s || '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtTanggalShort(s) {
  const d = parseTanggal(s)
  if (!d) return s || '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

// ── BULAN ──────────────────────────────────────────────────
export const BULAN_ORDER = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

export const BULAN_MAP = {
  'Januari':0,'Februari':1,'Maret':2,'April':3,'Mei':4,'Juni':5,
  'Juli':6,'Agustus':7,'September':8,'Oktober':9,'November':10,'Desember':11
}

export function getBulanFromDate(d) {
  return BULAN_ORDER[d.getMonth()]
}

// ── BUILD PERIODS ──────────────────────────────────────────
export function buildPeriods(payPeriodDate = 25) {
  const today = new Date()
  const periods = []
  for (let i = 11; i >= 0; i--) {
    const y = today.getFullYear()
    const m = today.getMonth() - i
    const startDate = new Date(y, m - 1, payPeriodDate)
    const endDate   = new Date(y, m, payPeriodDate - 1)
    endDate.setHours(23, 59, 59, 999)
    const startBulan = BULAN_ORDER[startDate.getMonth()]
    const endBulan   = BULAN_ORDER[endDate.getMonth()]
    const label = startDate.getMonth() === endDate.getMonth()
      ? `${startBulan} ${startDate.getFullYear()}`
      : `${payPeriodDate} ${startBulan} – ${payPeriodDate - 1} ${endBulan}`
    periods.push({ start: startDate, end: endDate, label, index: 11 - i })
  }
  return periods
}

export function getCurrentPeriodIndex(payPeriodDate = 25) {
  const periods = buildPeriods(payPeriodDate)
  const now = new Date()
  for (let i = periods.length - 1; i >= 0; i--) {
    if (now >= periods[i].start && now <= periods[i].end) return i
  }
  return periods.length - 1
}

export function filterByPeriod(rows, periodIdx, payPeriodDate = 25) {
  if (periodIdx === '' || periodIdx === null || periodIdx === undefined) return rows
  const idx = parseInt(periodIdx)
  if (isNaN(idx)) return rows
  const periods = buildPeriods(payPeriodDate)
  const p = periods[idx]
  if (!p) return rows
  return rows.filter(r => {
    const dt = parseTanggal(r.tanggal)
    if (!dt) return false
    return dt >= p.start && dt <= p.end
  })
}

// ── BUILD SUMMARY ──────────────────────────────────────────
export function buildSummary(expenses, income, cashrecord, planing) {
  let totalExpenses = 0, totalIncome = 0, totalCash = 0
  const byKategori = {}, byBulan = {}, incomeByBulan = {}, byUser = {}, byBank = {}

  expenses.forEach(r => {
    totalExpenses += r.nilai || 0
    if (r.kategori) byKategori[r.kategori] = (byKategori[r.kategori] || 0) + r.nilai
    if (r.bulan)    byBulan[r.bulan]       = (byBulan[r.bulan] || 0) + r.nilai
    if (r.user_id)  byUser[r.user_id]      = (byUser[r.user_id] || 0) + r.nilai
    if (r.bank)     byBank[r.bank]         = (byBank[r.bank] || 0) + r.nilai
  })

  income.forEach(r => {
    totalIncome += r.jumlah || 0
    if (r.bulan) incomeByBulan[r.bulan] = (incomeByBulan[r.bulan] || 0) + (r.jumlah || 0)
  })

  cashrecord.forEach(r => { totalCash += r.nilai || 0 })

  const tarikTunaiByUser = {}, expensesCashByUser = {}, saldoCashByUser = {}
  cashrecord.forEach(r => {
    if (r.user_id) tarikTunaiByUser[r.user_id] = (tarikTunaiByUser[r.user_id] || 0) + r.nilai
  })
  expenses.forEach(r => {
    if (r.user_id && r.transaksi === 'Cash')
      expensesCashByUser[r.user_id] = (expensesCashByUser[r.user_id] || 0) + r.nilai
  })
  Object.keys(tarikTunaiByUser).forEach(uid => {
    saldoCashByUser[uid] = (tarikTunaiByUser[uid] || 0) - (expensesCashByUser[uid] || 0)
  })

  const budgetVsReal = (planing || []).map(p => {
    const realisasi = byKategori[p.kategori] || 0
    return {
      kategori: p.kategori,
      alokasi: p.alokasi || 0,
      realisasi,
      pct: p.alokasi > 0 ? Math.round(realisasi / p.alokasi * 100) : 0
    }
  })

  const recent = [...expenses]
    .sort((a, b) => {
      const da = parseTanggal(a.tanggal), db = parseTanggal(b.tanggal)
      return (db?.getTime() || 0) - (da?.getTime() || 0)
    })
    .slice(0, 10)

  return {
    totalExpenses, totalIncome, totalCash,
    saldo: totalIncome - totalExpenses,
    byKategori, byBulan, incomeByBulan, byUser, byBank,
    budgetVsReal, recent,
    expensesCount: expenses.length,
    cashrecordCount: cashrecord.length,
    tarikTunaiByUser, expensesCashByUser, saldoCashByUser
  }
}

// ── KATEGORI & BANK ────────────────────────────────────────
export const KATEGORI_LIST = [
  'Makanan & Minuman','Transportasi','Kosmetik & Perawatan','Kesehatan',
  'Pakaian & Aksesoris','Elektronik','Rumah Tangga','Pendidikan',
  'Hiburan','Tagihan','Cicilan','Investasi','Bisnis','Lainnya','Pemasukan'
]

export const BANK_LIST = ['BCA','Mandiri','BRI','Cash','QRIS','Transfer','Card','Cardless']

export const METODE_LIST = ['Cash','Transfer','QRIS','Card','Cardless']

export const KATEGORI_ICON = {
  'Makanan & Minuman': '🍽️',
  'Transportasi': '🚗',
  'Kosmetik & Perawatan': '💄',
  'Kesehatan': '💊',
  'Pakaian & Aksesoris': '👕',
  'Elektronik': '📱',
  'Rumah Tangga': '🏠',
  'Pendidikan': '📚',
  'Hiburan': '🎮',
  'Tagihan': '📋',
  'Cicilan': '💳',
  'Investasi': '📈',
  'Bisnis': '💼',
  'Lainnya': '📦',
  'Pemasukan': '💰',
}

export const KATEGORI_COLOR = {
  'Makanan & Minuman': '#f97316',
  'Transportasi': '#3b82f6',
  'Kosmetik & Perawatan': '#ec4899',
  'Kesehatan': '#22c55e',
  'Pakaian & Aksesoris': '#a855f7',
  'Elektronik': '#06b6d4',
  'Rumah Tangga': '#84cc16',
  'Pendidikan': '#eab308',
  'Hiburan': '#f43f5e',
  'Tagihan': '#6366f1',
  'Cicilan': '#f59e0b',
  'Investasi': '#10b981',
  'Bisnis': '#8b5cf6',
  'Lainnya': '#94a3b8',
  'Pemasukan': '#34d399',
}

// ── MoM BADGE ─────────────────────────────────────────────
export function getMoMInfo(valIni, valLalu, mode = 'income') {
  if (!valLalu) return null
  const diff = valIni - valLalu
  const pct = Math.abs(diff / valLalu * 100)
  if (pct < 0.1) return { label: '→ Sama', cls: 'neutral', arrow: '→' }
  const naik = diff >= 0
  let cls, arrow
  if (mode === 'expense') {
    cls = naik ? 'bad' : 'good'
    arrow = naik ? '▲' : '▼'
  } else {
    cls = naik ? 'good' : 'bad'
    arrow = naik ? '▲' : '▼'
  }
  return { label: `${arrow} ${pct.toFixed(1)}%`, cls, arrow, pct }
}
