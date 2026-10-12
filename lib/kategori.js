import { KATEGORI_LIST } from './utils'

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
