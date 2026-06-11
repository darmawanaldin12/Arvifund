/**
 * useAmountInput
 * Hook untuk input nominal Rupiah dengan live formatting.
 *
 * - rawValue  : string angka bersih (e.g. "250000") — ini yang disimpan ke state form
 * - display   : string yang ditampilkan di input (e.g. "250.000")
 * - formatted : string lengkap untuk preview (e.g. "Rp 250.000")
 * - onChange  : handler untuk input[type=text]
 * - onKeyDown : blokir karakter non-numerik
 *
 * Usage:
 *   const amt = useAmountInput(form.total, v => setF('total', v))
 *   <input value={amt.display} onChange={amt.onChange} onKeyDown={amt.onKeyDown} inputMode="numeric" />
 *   {amt.formatted && <div>{amt.formatted}</div>}
 */
export function useAmountInput(rawValue, onChange) {
  // rawValue: string angka murni dari state form (e.g. "250000")

  // Ubah raw → tampilan (e.g. "250000" → "250.000")
  const display = rawValue
    ? Number(rawValue).toLocaleString('id-ID')
    : ''

  // Preview lengkap
  const num = parseFloat(rawValue)
  const formatted = rawValue && !isNaN(num)
    ? 'Rp\u00a0' + num.toLocaleString('id-ID')
    : ''

  // Warna preview berdasarkan nominal
  const previewColor =
    !rawValue || isNaN(num)   ? 'var(--text3)' :
    num >= 1_000_000          ? 'var(--red)'   :
    num >= 100_000            ? 'var(--yellow)' :
                                'var(--green)'

  function handleChange(e) {
    // Ambil hanya digit dari input
    const digits = e.target.value.replace(/\D/g, '')
    onChange(digits)
  }

  function handleKeyDown(e) {
    // Izinkan: angka, Backspace, Delete, Arrow, Tab, Enter
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter','Home','End']
    if (allowed.includes(e.key)) return
    if (/^\d$/.test(e.key)) return
    e.preventDefault()
  }

  return { display, formatted, previewColor, onChange: handleChange, onKeyDown: handleKeyDown }
}

/**
 * parseRupiahToInt
 * Konversi nilai nominal dari AI/OCR ke integer bersih.
 *
 * Menangani format:
 *   - "56.600"  → 56600   (titik sebagai pemisah ribuan Indonesia)
 *   - "56,600"  → 56600   (koma sebagai pemisah ribuan)
 *   - 56.6      → 56600   (float hasil salah parse — dikali 1000 jika < 10000 dan ada desimal)
 *   - "56600"   → 56600   (sudah benar)
 *   - 1500000   → 1500000 (number sudah benar)
 */
export function parseRupiahToInt(value) {
  if (value === null || value === undefined || value === '') return ''

  const str = String(value).trim()

  // Jika ada titik DAN tidak ada koma: titik = pemisah ribuan (format Indonesia)
  // Contoh: "56.600" → 56600, "1.500.000" → 1500000
  if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.')
    // Jika semua bagian setelah titik pertama adalah 3 digit → pemisah ribuan
    const allThreeDigits = parts.slice(1).every(p => p.length === 3 && /^\d+$/.test(p))
    if (allThreeDigits && /^\d+$/.test(parts[0])) {
      return str.replace(/\./g, '')
    }
    // Jika bagian desimal < 3 digit → kemungkinan float yang salah (56.6 harusnya 56600)
    const lastPart = parts[parts.length - 1]
    if (lastPart.length < 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(lastPart)) {
      // Buang titik dan pad dengan nol sampai minimal 3 digit desimal
      const cleaned = parts[0] + lastPart.padEnd(3, '0')
      return cleaned
    }
  }

  // Jika ada koma: koma = pemisah ribuan (format lain) atau desimal
  if (str.includes(',')) {
    const parts = str.split(',')
    const lastPart = parts[parts.length - 1]
    // Koma sebagai pemisah ribuan jika bagian terakhir 3 digit
    if (lastPart.length === 3 && /^\d+$/.test(lastPart)) {
      return str.replace(/,/g, '')
    }
    // Koma sebagai desimal → bulatkan
    return String(Math.round(parseFloat(str.replace(',', '.'))))
  }

  // Tidak ada titik/koma: ambil digit saja
  return str.replace(/\D/g, '')
}

/**
 * sanitizeBankField
 * Pastikan field "bank"/"from_bank"/"to_bank" hanya berisi nama rekening valid:
 * BCA, Mandiri, BRI, Cash.
 *
 * Kadang AI salah mengisi field ini dengan METODE pembayaran (QRIS, Card,
 * Cardless, Transfer, E-Wallet, Debit, dll) padahal seharusnya nama rekening.
 * Fungsi ini jadi safety-net terakhir di sisi client sebelum data disimpan:
 *   - "Cash" / "Tunai"            → "Cash"
 *   - "BCA" / "Mandiri" / "BRI"    → dipertahankan (case-insensitive → proper case)
 *   - selain itu (QRIS, Card,
 *     Cardless, Transfer, dll)     → default "BCA"
 */
export function sanitizeBankField(bank) {
  const VALID_BANKS = ['BCA', 'Mandiri', 'BRI', 'Cash']
  if (!bank) return 'BCA'
  const b = String(bank).trim()
  if (VALID_BANKS.includes(b)) return b
  const lower = b.toLowerCase()
  if (lower === 'cash' || lower === 'tunai') return 'Cash'
  if (lower === 'bca') return 'BCA'
  if (lower === 'mandiri') return 'Mandiri'
  if (lower === 'bri') return 'BRI'
  // QRIS, Card, Cardless, Transfer, E-Wallet, Debit, dll → default BCA
  return 'BCA'
}
