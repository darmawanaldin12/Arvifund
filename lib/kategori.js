import { KATEGORI_LIST, BULAN_ORDER, buildPeriods, parseTanggal } from './utils'

// Patokan kategori pengeluaran = KATEGORI_LIST (sama dengan halaman Budget Plan)
export const KATEGORI_EXPENSE = KATEGORI_LIST.filter(k => k !== 'Pemasukan')

const clean = s => String(s || '').toLowerCase().replace(/\s*&\s*/g, ' & ').replace(/\s+/g, ' ').trim()

/**
 * Samakan nama kategori apa pun (hasil AI, data lama, salah ketik) dengan
 * kategori resmi di Budget Plan. Kalau tidak ada yang cocok → 'Lainnya'.
 */
export function normalizeKategori(raw) {
  const c = clean(raw)
  if (!c) return 'Lainnya'
  const exact = KATEGORI_EXPENSE.find(k => clean(k) === c)
  if (exact) return exact
  if (c.length >= 3) {
    const partial = KATEGORI_EXPENSE.find(k => {
      const kc = clean(k)
      return kc.startsWith(c) || c.startsWith(kc)
    })
    if (partial) return partial
  }
  return 'Lainnya'
}

/**
 * Hitung sisa budget kategori untuk sebuah pengeluaran BARU (sebelum disimpan).
 * Periode ditentukan dari tanggal transaksi mengikuti tanggal gajian; alokasi
 * diambil dari budget bulan di tanggal akhir periode (sama seperti Budget Plan).
 * Mengembalikan null kalau budget kategori itu belum diset.
 */
export function getBudgetStatus({ kategori, tanggal, nilai, expenses = [], budgetPlans = [], payPeriodDate, overrides }) {
  const kat = normalizeKategori(kategori)
  const dt = parseTanggal(tanggal)
  if (!dt) return null
  const p = buildPeriods(payPeriodDate, overrides).find(x => dt >= x.start && dt <= x.end)
  if (!p) return null

  const bulan = BULAN_ORDER[p.end.getMonth()]
  const tahun = p.end.getFullYear()
  const alokasi = budgetPlans
    .filter(b => b.bulan === bulan && b.tahun === tahun && normalizeKategori(b.kategori) === kat)
    .reduce((s, b) => s + (b.alokasi || 0), 0)
  if (alokasi <= 0) return null

  const terpakai = expenses
    .filter(r => {
      const d = parseTanggal(r.tanggal)
      return d && d >= p.start && d <= p.end && normalizeKategori(r.kategori) === kat
    })
    .reduce((s, r) => s + (r.nilai || 0), 0) + (Number(nilai) || 0)

  return { kategori: kat, alokasi, terpakai, sisa: alokasi - terpakai, pct: Math.round(terpakai / alokasi * 100) }
}
