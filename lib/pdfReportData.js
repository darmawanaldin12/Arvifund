import { parseTanggal, filterByPeriod, buildSummary, KATEGORI_COLOR, BULAN_ORDER } from './utils'

// Hilangkan field `nilai` sintetis yang dipakai buat filterByPeriod (income aslinya pakai `jumlah`)
function withNilaiAlias(rows) {
  return rows.map(r => ({ ...r, nilai: r.jumlah }))
}
function stripNilaiAlias(rows) {
  return rows.map(({ nilai: _drop, ...r }) => r)
}

function filterIncome(income, periodIdx, payPeriodDate, overrides) {
  return stripNilaiAlias(filterByPeriod(withNilaiAlias(income), periodIdx, payPeriodDate, overrides))
}

/**
 * Hitung semua angka yang dibutuhkan laporan PDF untuk satu periode tertentu.
 * SEMUA angka di sini dihitung deterministik dari data asli — tidak ada AI di tahap ini.
 * Gemini nantinya HANYA merangkai angka-angka hasil fungsi ini jadi narasi (lihat pdfNarrative.js).
 */
export function buildReportData({
  periodIdx, periods, expenses, income, cashRecords, budgetPlans,
  payPeriodDate, overrides, getUserName,
}) {
  const isAllPeriod = periodIdx === '' || periodIdx === null || periodIdx === undefined
  const idx    = isAllPeriod ? null : parseInt(periodIdx)
  const period = isAllPeriod ? null : periods[idx]

  const fExpenses = filterByPeriod(expenses, periodIdx, payPeriodDate, overrides)
  const fIncome   = filterIncome(income, periodIdx, payPeriodDate, overrides)
  const fCash     = filterByPeriod(cashRecords, periodIdx, payPeriodDate, overrides)

  const summary = buildSummary(fExpenses, fIncome, fCash, budgetPlans)

  // ── MoM vs periode sebelumnya (index+1, karena index 0 = periode terbaru) ──
  // Tidak relevan kalau "Semua Periode" dipilih — tidak ada periode pembanding.
  let momIncomePct = null, momExpensePct = null
  if (!isAllPeriod) {
    const prevIdx = idx + 1
    if (periods[prevIdx]) {
      const pExpenses = filterByPeriod(expenses, String(prevIdx), payPeriodDate, overrides)
      const pIncome   = filterIncome(income, String(prevIdx), payPeriodDate, overrides)
      const pCash     = filterByPeriod(cashRecords, String(prevIdx), payPeriodDate, overrides)
      const pSummary  = buildSummary(pExpenses, pIncome, pCash, budgetPlans)
      if (pSummary.totalIncome)   momIncomePct  = Math.round((summary.totalIncome  - pSummary.totalIncome)  / pSummary.totalIncome  * 1000) / 10
      if (pSummary.totalExpenses) momExpensePct = Math.round((summary.totalExpenses - pSummary.totalExpenses) / pSummary.totalExpenses * 1000) / 10
    }
  }

  // ── Tren: 6 periode terakhir (kalau pilih periode spesifik), atau SELURUH
  // periode yang ada data-nya (kalau pilih "Semua Periode") — urut lama → baru ──
  const trendPeriods = []
  if (isAllPeriod) {
    for (let i = periods.length - 1; i >= 0; i--) {
      const pExpenses = filterByPeriod(expenses, String(i), payPeriodDate, overrides)
      const pIncome   = filterIncome(income, String(i), payPeriodDate, overrides)
      if (!pExpenses.length && !pIncome.length) continue // skip periode kosong biar chart tidak terlalu panjang
      trendPeriods.push({
        label: BULAN_ORDER[periods[i].start.getMonth()].slice(0, 3),
        income: pIncome.reduce((s, r) => s + (r.jumlah || 0), 0),
        expense: pExpenses.reduce((s, r) => s + (r.nilai || 0), 0),
      })
    }
  } else {
    const trendEnd = Math.min(idx + 5, periods.length - 1)
    for (let i = trendEnd; i >= idx; i--) {
      if (!periods[i]) continue
      const pExpenses = filterByPeriod(expenses, String(i), payPeriodDate, overrides)
      const pIncome   = filterIncome(income, String(i), payPeriodDate, overrides)
      trendPeriods.push({
        label: BULAN_ORDER[periods[i].start.getMonth()].slice(0, 3),
        income: pIncome.reduce((s, r) => s + (r.jumlah || 0), 0),
        expense: pExpenses.reduce((s, r) => s + (r.nilai || 0), 0),
      })
    }
  }

  // ── Top kategori (persentase dari total pengeluaran periode ini) ──
  const totalExpForPct = summary.totalExpenses || 1
  const topKategori = Object.entries(summary.byKategori)
    .sort((a, b) => b[1] - a[1])
    .map(([kategori, nilai]) => ({
      kategori, nilai,
      pct: Math.round((nilai / totalExpForPct) * 1000) / 10,
      color: KATEGORI_COLOR[kategori] || '#94a3b8',
    }))

  // ── Anomali (nilai jauh di atas rata-rata, sama seperti logic dashboard) ──
  const avgNilai = fExpenses.length ? fExpenses.reduce((s, r) => s + r.nilai, 0) / fExpenses.length : 0
  const anomali = fExpenses
    .filter(r => r.nilai > avgNilai * 3 && r.nilai > 100_000)
    .sort((a, b) => b.nilai - a.nilai)
    .slice(0, 8)

  // ── Budget vs realisasi (hanya kategori yang punya alokasi) ──
  const budgetVsReal = summary.budgetVsReal.filter(b => b.alokasi > 0)

  // ── Saldo "tahun ini" — total keseluruhan sepanjang data (konsisten dgn dashboard) ──
  const summaryAll = buildSummary(expenses, income, cashRecords, budgetPlans)
  const saldoTahun = summaryAll.totalIncome - summaryAll.totalExpenses

  // ── Lampiran transaksi lengkap (gabungan, urut tanggal terbaru dulu) ──
  const transactions = [
    ...fExpenses.map(r => ({ tanggal: r.tanggal, label: r.toko || 'Pengeluaran', kategori: r.kategori || 'Lainnya', user: getUserName(r.user_id), nilai: -(r.nilai || 0) })),
    ...fIncome.map(r => ({ tanggal: r.tanggal, label: r.sumber || 'Pemasukan', kategori: 'Pemasukan', user: getUserName(r.user_id), nilai: r.jumlah || 0 })),
    ...fCash.map(r => ({ tanggal: r.tanggal, label: r.transaksi || 'Tarik Tunai', kategori: 'Tarik Tunai', user: getUserName(r.user_id), nilai: -(r.nilai || 0) })),
  ].sort((a, b) => (parseTanggal(b.tanggal)?.getTime() || 0) - (parseTanggal(a.tanggal)?.getTime() || 0))

  return {
    periodLabel: period?.label || 'Semua Periode',
    generatedAt: new Date(),
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    saldo: summary.saldo,
    saldoTahun,
    expensesCount: summary.expensesCount,
    momIncomePct,
    momExpensePct,
    trendPeriods,
    topKategori,
    anomali,
    budgetVsReal,
    transactions,
  }
}
