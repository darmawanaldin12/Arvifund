import { fmtFull } from './utils'

/**
 * Minta Gemini merangkai angka-angka yang SUDAH DIHITUNG (lihat pdfReportData.js)
 * menjadi narasi 3-5 kalimat. Gemini TIDAK diminta menghitung/menebak angka apapun —
 * hanya merapikan angka yang sudah pasti benar jadi kalimat yang enak dibaca.
 * Ini untuk mencegah risiko hallucination pada laporan keuangan.
 */
export async function generateNarrative(reportData) {
  const {
    periodLabel, totalIncome, totalExpenses, saldo,
    momIncomePct, momExpensePct, topKategori, budgetVsReal, anomali,
  } = reportData

  const topKategoriText = topKategori.slice(0, 3).map(k => `${k.kategori} (${k.pct}%)`).join(', ')
  const overBudget = budgetVsReal.filter(b => b.pct > 100)

  const prompt = `Kamu adalah asisten analis keuangan pribadi. Berdasarkan DATA BERIKUT (semua angka SUDAH PASTI BENAR — jangan mengubah, membulatkan ulang, atau menghitung ulang angka apapun), tulis narasi 3-5 kalimat berbahasa Indonesia yang enak dibaca untuk laporan keuangan keluarga.

- Periode: ${periodLabel}
- Total pemasukan: ${fmtFull(totalIncome)}
- Total pengeluaran: ${fmtFull(totalExpenses)}
- Saldo periode: ${fmtFull(saldo)}
- Perubahan pengeluaran vs periode sebelumnya: ${momExpensePct !== null ? momExpensePct + '%' : 'tidak ada data pembanding'}
- Perubahan pemasukan vs periode sebelumnya: ${momIncomePct !== null ? momIncomePct + '%' : 'tidak ada data pembanding'}
- 3 kategori pengeluaran terbesar: ${topKategoriText || 'tidak ada data'}
- Kategori yang melebihi budget: ${overBudget.length ? overBudget.map(b => `${b.kategori} (${b.pct}% dari alokasi)`).join(', ') : 'tidak ada'}
- Jumlah transaksi anomali (nilai jauh di atas rata-rata): ${anomali.length}

ATURAN KETAT:
- Jangan menyebutkan angka selain yang tertulis di atas.
- Jangan memberi rekomendasi finansial spesifik (misal saran investasi/produk keuangan).
- Gaya bahasa hangat dan ringkas, seperti ringkasan eksekutif laporan keuangan keluarga.
- Kembalikan HANYA teks narasi polos, tanpa markdown, tanpa heading, tanpa bullet point, tanpa tanda kutip pembuka/penutup.`

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error || `Gemini error ${res.status}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Respon Gemini kosong')
  return text
}

/** Fallback rule-based kalau Gemini gagal/timeout — tetap akurat, cuma kalimatnya lebih kaku. */
export function buildFallbackNarrative(reportData) {
  const { totalIncome, totalExpenses, saldo, momExpensePct, topKategori, budgetVsReal } = reportData
  const top = topKategori[0]
  const overBudget = budgetVsReal.filter(b => b.pct > 100)

  let text = `Pada periode ini, tercatat total pemasukan ${fmtFull(totalIncome)} dan pengeluaran ${fmtFull(totalExpenses)}, dengan saldo periode ${fmtFull(saldo)}. `
  if (momExpensePct !== null) {
    text += `Pengeluaran ${momExpensePct >= 0 ? 'naik' : 'turun'} ${Math.abs(momExpensePct)}% dibanding periode sebelumnya. `
  }
  if (top) {
    text += `Kategori pengeluaran terbesar adalah ${top.kategori}, menyumbang ${top.pct}% dari total pengeluaran. `
  }
  if (overBudget.length) {
    text += `Kategori yang melebihi alokasi budget: ${overBudget.map(b => b.kategori).join(', ')}.`
  }
  return text.trim()
}
