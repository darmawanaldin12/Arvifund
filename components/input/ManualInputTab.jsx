'use client'
import { useState } from 'react'
import { Save, TrendingDown, TrendingUp, Landmark, ChevronDown, CalendarDays, Tag } from 'lucide-react'
import { METODE_LIST } from '../../lib/utils'
import { useAmountInput } from '../../hooks/useAmountInput'
import KategoriPicker from './KategoriPicker'
import BankPicker from './BankPicker'
import { KATEGORI_ICON_MAP } from '../ui/KategoriIcon'

const TIPE_LIST = [
  { id: 'expense', label: 'Pengeluaran', Icon: TrendingDown },
  { id: 'income',  label: 'Pemasukan',   Icon: TrendingUp },
  { id: 'cash',    label: 'Tarik Tunai', Icon: Landmark },
]

// Pilihan menu "Bank / Dompet" di form input: hanya BCA, Mandiri, dan Cash.
// (QRIS/Transfer/Card/Cardless adalah METODE pembayaran, bukan bank — ada di menu Metode.)
const BANK_PILIHAN      = ['BCA', 'Mandiri', 'Cash']
// Sumber tarik tunai: bank saja (tanpa Cash)
const BANK_ASAL_PILIHAN = ['BCA', 'Mandiri']

export default function ManualInputTab({ tipe, setTipe, form, setF, profiles, saving, error, onSubmit }) {
  const manualAmt = useAmountInput(form.total, v => setF('total', v))
  const [pickerOpen, setPickerOpen] = useState(false)

  // Kalau nilai bank yang sedang terisi di luar daftar (mis. dari hasil AI "Edit Manual"),
  // tetap ditampilkan sebagai satu pilihan tambahan supaya nilainya tidak berubah diam-diam.
  const baseBankOptions = tipe === 'cash' ? BANK_ASAL_PILIHAN : BANK_PILIHAN
  const bankOptions = !form.bank || baseBankOptions.includes(form.bank) ? baseBankOptions : [...baseBankOptions, form.bank]

  // Saat user ganti metode ke Cash, otomatis set bank = Cash
  function handleMetodeChange(val) {
    setF('metode', val)
    if (val === 'Cash') setF('bank', 'Cash')
  }

  // Saat user ganti tipe, reset bank ke default yang sesuai
  function handleTipeChange(val) {
    setTipe(val)
    if (val === 'cash') {
      // Tarik tunai: bank asal default BCA
      setF('bank', 'BCA')
      setF('metode', 'Cardless')
    } else {
      // Expense/income: default Cash (paling umum transaksi harian)
      setF('bank', 'Cash')
      setF('metode', 'Cash')
    }
  }

  const kategoriEntry = KATEGORI_ICON_MAP[form.kategori]
  const KatIcon = kategoriEntry?.Icon

  const S = {
    typeRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 },
    typeBtn: (selected) => ({
      height: 46, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation',
      border: selected ? 'none' : '1px solid var(--border)',
      background: selected ? 'var(--accent)' : 'var(--surface2)',
      color: selected ? '#fff' : 'var(--text2)',
      fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      transition: 'all 0.15s',
    }),
    fieldBtn: {
      width: '100%', minHeight: 48, padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text1)',
      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', fontSize: 14, touchAction: 'manipulation',
    },
    errorBox: { padding: '10px 14px', marginBottom: 14, background: 'var(--red-bg)', borderRadius: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600 },
    infoBox:  { padding: '10px 14px', marginTop: 8, background: 'rgba(234,179,8,0.1)', borderRadius: 10, color: 'var(--yellow)', fontSize: 12, fontWeight: 600, border: '1px solid rgba(234,179,8,0.2)' },
    sectionTitle: { fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '22px 0 12px' },
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      {/* Jenis transaksi */}
      <div style={S.typeRow} role="tablist" aria-label="Jenis transaksi">
        {TIPE_LIST.map(t => {
          const I = t.Icon
          return (
            <button key={t.id} type="button" role="tab" aria-selected={tipe === t.id}
              onClick={() => handleTipeChange(t.id)} style={S.typeBtn(tipe === t.id)}>
              <I size={15} />{t.label}
            </button>
          )
        })}
      </div>

      <form onSubmit={onSubmit}>
        {/* Kategori (hanya pengeluaran) */}
        {tipe === 'expense' && (
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <button type="button" style={S.fieldBtn} onClick={() => setPickerOpen(true)} aria-haspopup="dialog">
              {form.kategori ? (
                <>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: kategoriEntry?.color || '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {KatIcon && <KatIcon size={15} color="#fff" />}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{form.kategori}</span>
                </>
              ) : (
                <>
                  <Tag size={18} color="var(--text3)" />
                  <span style={{ flex: 1, color: 'var(--text3)' }}>Pilih kategori</span>
                </>
              )}
              <ChevronDown size={18} color="var(--text3)" />
            </button>
          </div>
        )}

        {/* Nominal */}
        <div className="form-group">
          <label className="form-label" htmlFor="manual-total">{tipe === 'income' ? 'Jumlah' : 'Nominal'}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ minWidth: 52, height: 50, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Rp</div>
            <input
              id="manual-total" className="form-input" type="text" inputMode="numeric" placeholder="Masukkan nominal"
              value={manualAmt.display} onChange={manualAmt.onChange} onKeyDown={manualAmt.onKeyDown}
              style={{ flex: 1, height: 50, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}
            />
          </div>
        </div>

        {/* Tanggal */}
        <div className="form-group">
          <label className="form-label" htmlFor="manual-tanggal">Tanggal</label>
          <div style={{ position: 'relative' }}>
            <CalendarDays size={18} aria-hidden="true" style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text3)', pointerEvents: 'none' }} />
            <input id="manual-tanggal" className="form-input" type="date" value={form.tanggal} onChange={e => setF('tanggal', e.target.value)} required
              style={{ paddingLeft: 42, height: 48 }} />
          </div>
        </div>

        {/* Toko / sumber / lokasi */}
        <div className="form-group">
          <label className="form-label" htmlFor="manual-toko">
            {tipe === 'income' ? 'Sumber' : tipe === 'cash' ? 'Lokasi ATM' : 'Toko / Merchant'}
          </label>
          <input id="manual-toko" className="form-input" type="text" style={{ height: 48 }}
            placeholder={tipe === 'income' ? 'Nama perusahaan / sumber' : tipe === 'cash' ? 'Nama ATM / lokasi' : 'Nama toko atau merchant'}
            value={form.toko} onChange={e => setF('toko', e.target.value)} />
        </div>

        {/* Deskripsi */}
        <div className="form-group">
          <label className="form-label" htmlFor="manual-uraian">Deskripsi (Opsional)</label>
          <textarea id="manual-uraian" className="form-input" rows={3} placeholder="Tambahkan catatan..."
            value={form.uraian} onChange={e => setF('uraian', e.target.value)}
            style={{ resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
        </div>

        {/* Detail pembayaran */}
        <div style={S.sectionTitle}>Detail pembayaran</div>

        {/* Bank / Dompet — kartu berlogo */}
        <div className="form-group">
          <label className="form-label" id="manual-bank-label">
            {tipe === 'cash' ? 'Bank Asal (sumber tarik tunai)' : 'Bank / Dompet'}
          </label>
          <BankPicker options={bankOptions} value={form.bank} onChange={v => setF('bank', v)} labelledBy="manual-bank-label" />
        </div>
        {tipe === 'cash' && (
          <div style={{ ...S.infoBox, marginBottom: 14 }}>
            💡 Saldo bank ini akan berkurang & saldo Cash otomatis bertambah
          </div>
        )}

        {tipe !== 'cash' && (
          <div className="form-group">
            <label className="form-label" htmlFor="manual-metode">Metode</label>
            <select id="manual-metode" className="form-select" value={form.metode} onChange={e => handleMetodeChange(e.target.value)} style={{ height: 48 }}>
              {METODE_LIST.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="manual-user">User</label>
          <select id="manual-user" className="form-select" value={form.user_id} onChange={e => setF('user_id', e.target.value)} required style={{ height: 48 }}>
            <option value="">Pilih User</option>
            {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
          </select>
        </div>

        {error && <div style={S.errorBox}>{error}</div>}

        <button type="submit" className="btn btn-primary btn-full" disabled={saving}
          style={{ height: 52, fontSize: 15, fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.5 : 1, marginTop: 6 }}>
          <Save size={18} />{saving ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </form>

      <KategoriPicker
        open={pickerOpen} value={form.kategori}
        onSelect={k => setF('kategori', k)} onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
