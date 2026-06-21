import { redirect } from 'next/navigation'

// Halaman /expenses sudah digabung ke /transaksi (tab "Pengeluaran").
// Redirect server-side ini menjaga link lama (dashboard, kartu anomali, bookmark)
// tetap berfungsi tanpa perlu mengubah setiap referensi satu per satu.
export default function ExpensesRedirect() {
  redirect('/transaksi')
}
