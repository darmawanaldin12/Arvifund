import { supabase } from './supabase'
import { buildPeriods, getCurrentPeriodIndex, getLocalDate, BULAN_ORDER } from './utils'
import { normalizeKategori } from './kategori'

// Transaksi berulang (tagihan rutin). Tabel dibuat lewat
// supabase/migrations/add_recurring_transactions.sql
const TABLE = 'recurring_transactions'

const pad   = n => String(n).padStart(2, '0')
const toStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const sod   = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Tabel belum dibuat di Supabase → fitur disembunyikan, bukan error
export function isTableMissing(err) {
  const msg = String(err?.message || '')
  return err?.code === '42P01' || err?.code === 'PGRST205' || /does not exist|schema cache|Could not find the table/i.test(msg)
}

export async function listRecurring() {
  const { data, error } = await supabase.from(TABLE).select('*').order('hari_tiap_bulan', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createRecurring(row) {
  const { data, error } = await supabase.from(TABLE).insert([row]).select().single()
  if (error) throw error
  return data
}

export async function updateRecurring(id, patch) {
  const { error } = await supabase.from(TABLE).update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteRecurring(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/**
 * Kapan transaksi berulang ini jatuh tempo di PERIODE GAJIAN yang sedang berjalan.
 * status: 'done' (sudah dicatat) | 'due' (hari ini / terlewat) | 'upcoming' (≤ 3 hari lagi) | 'later'
 * Kalau tanggalnya lebih besar dari jumlah hari di bulan itu (mis. 31 di Februari), dipakai hari terakhir bulan.
 */
export function getOccurrence(t, payPeriodDate, overrides, today = getLocalDate()) {
  const periods = buildPeriods(payPeriodDate, overrides)
  const p = periods[getCurrentPeriodIndex(payPeriodDate, overrides)]
  if (!p) return null
  const s = sod(p.start), e = sod(p.end)

  let occ = null
  for (let m = 0; m < 2 && !occ; m++) {
    const base = new Date(s.getFullYear(), s.getMonth() + m, 1)
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
    const cand = new Date(base.getFullYear(), base.getMonth(), Math.min(Number(t.hari_tiap_bulan) || 1, last))
    if (cand >= s && cand <= e) occ = cand
  }
  if (!occ) return null

  const dateStr   = toStr(occ)
  const daysUntil = Math.round((occ - sod(today)) / 86400000)
  let status
  if (t.terakhir_dicatat && String(t.terakhir_dicatat).slice(0, 10) >= dateStr) status = 'done'
  else if (daysUntil <= 0) status = 'due'
  else if (daysUntil <= 3) status = 'upcoming'
  else status = 'later'
  return { date: occ, dateStr, daysUntil, status }
}

/**
 * Catat transaksi berulang sebagai pengeluaran HARI INI, lalu tandai sudah dicatat
 * untuk jatuh tempo periode ini (terakhir_dicatat = tanggal jatuh tempo).
 */
export async function recordRecurring(t, occ, userId) {
  const today = getLocalDate()
  const { error: e1 } = await supabase.from('expenses').insert([{
    toko: t.toko,
    tanggal: toStr(today),
    bulan: BULAN_ORDER[today.getMonth()],
    transaksi: t.metode || 'Cash',
    uraian: t.uraian || '',
    kategori: normalizeKategori(t.kategori),
    bank: t.bank || 'Cash',
    nilai: Number(t.nilai),
    user_id: userId,
  }])
  if (e1) throw e1
  const { error: e2 } = await supabase.from(TABLE).update({ terakhir_dicatat: occ.dateStr }).eq('id', t.id)
  if (e2) throw e2
}
