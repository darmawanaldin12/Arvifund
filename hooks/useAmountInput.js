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
