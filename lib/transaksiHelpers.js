import { TrendingDown, TrendingUp, ArrowLeftRight, Landmark } from 'lucide-react'

// ── TIPE CONFIG — warna & icon konsisten dengan dashboard (RecentTransactionsCard) ──
export const TIPE_CONFIG = {
  expense:  { key: 'expense',  label: 'Pengeluaran', color: 'var(--red)',     bg: 'var(--red-bg)',       Icon: TrendingDown   },
  income:   { key: 'income',   label: 'Pemasukan',   color: 'var(--green)',   bg: 'var(--green-bg)',     Icon: TrendingUp     },
  transfer: { key: 'transfer', label: 'Transfer',    color: 'var(--accent)',  bg: 'var(--accent-light)', Icon: ArrowLeftRight },
  cash:     { key: 'cash',     label: 'Tarik Tunai',  color: 'var(--yellow)', bg: 'var(--yellow-bg)',    Icon: Landmark       },
}
export const TIPE_ORDER = ['expense', 'income', 'transfer', 'cash']

// ── Pure helpers (aman dipanggil di useMemo) ────────────────────────────────────
export function fmtJam(isoString) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
  } catch { return null }
}

export function isCatatTelat(tanggal, createdAt) {
  if (!tanggal || !createdAt) return false
  try {
    const tTrx   = tanggal.split('T')[0]
    const tInput = new Date(createdAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    return tTrx !== tInput
  } catch { return false }
}

// ── CSV EXPORT — kolom menyesuaikan tab aktif ────────────────────────
export function exportTransaksiCSV(rows, tab, getUserName) {
  const escape = v => {
    if (v == null) return ''
    const s = String(v)
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  let headers, body
  if (tab === 'expense') {
    headers = ['Tanggal', 'Bulan', 'Toko', 'Uraian', 'Kategori', 'Metode', 'Bank', 'User', 'Nilai']
    body = rows.map(r => [r.tanggal, r.bulan, r.toko, r.uraian, r.kategori, r.transaksi, r.bank, getUserName(r.user_id), r.nilai])
  } else if (tab === 'income') {
    headers = ['Tanggal', 'Bulan', 'Sumber', 'Keterangan', 'Metode', 'Bank', 'User', 'Jumlah']
    body = rows.map(r => [r.tanggal, r.bulan, r.sumber, r.items, r.metode, r.bank, getUserName(r.user_id), r.jumlah])
  } else if (tab === 'cash') {
    headers = ['Tanggal', 'Keterangan', 'Lokasi', 'Bank', 'User', 'Nilai']
    body = rows.map(r => [r.tanggal, r.transaksi, r.alamat, r.bank, getUserName(r.user_id), r.nilai])
  } else if (tab === 'transfer') {
    headers = ['Tanggal', 'Dari User', 'Dari Bank', 'Ke User', 'Ke Bank', 'Catatan', 'Jumlah']
    body = rows.map(r => [r.tanggal, getUserName(r.from_user), r.from_bank, getUserName(r.to_user), r.to_bank, r.catatan, r.jumlah])
  } else {
    headers = ['Tanggal', 'Tipe', 'Label', 'Keterangan', 'User', 'Jumlah']
    body = rows.map(r => [r.tanggal, TIPE_CONFIG[r.tipe]?.label || r.tipe, r.label, r.sub, r.userName, r.amount])
  }
  const csv = '\uFEFF' + [headers.join(','), ...body.map(row => row.map(escape).join(','))].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `arvifund-transaksi-${tab}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
