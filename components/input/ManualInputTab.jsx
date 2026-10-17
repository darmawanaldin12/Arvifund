'use client'
import { useState } from 'react'
import { Save, TrendingDown, TrendingUp, Landmark, ChevronDown, CalendarDays, Tag } from 'lucide-react'
import { BANK_LIST, METODE_LIST } from '../../lib/utils'
import { useAmountInput } from '../../hooks/useAmountInput'
import KategoriPicker from './KategoriPicker'
import { KATEGORI_ICON_MAP } from '../ui/KategoriIcon'

const TIPE_LIST = [
  { id: 'expense', label: 'Pengeluaran', Icon: TrendingDown },
  { id: 'income',  label: 'Pemasukan',   Icon: TrendingUp },
  { id: 'cash',    label: 'Tarik Tunai', Icon: Landmark },
]

// Pilihan Bank / Dompet khusus input manual (urutan sesuai preferensi pengguna)
const BANK_DOMPET_LIST = ['Mandiri', 'BCA', 'Cash'].filter(b => BANK_LIST.includes(b))

// Bank yang bisa jadi sumber tarik tunai (exclude Cash)
const BANK_ASAL_LIST = BANK_LIST.filter(b => b !== 'Cash')

export default function ManualInputTab({ tipe, setTipe, form, setF, profiles, saving, error, onSubmit }) {
  const manualAmt = useAmountInput(form.total, v => setF('total', v))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [bankPickerOpen, setBankPickerOpen] = useState(false)

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

        <div style={{ display: 'grid', gridTemplateColumns: tipe === 'cash' ? '1fr' : '1fr 1fr', gap: 10 }}>
          {tipe !== 'cash' && (
            <div className="form-group">
              <label className="form-label" htmlFor="manual-metode">Metode</label>
              <select id="manual-metode" className="form-select" value={form.metode} onChange={e => handleMetodeChange(e.target.value)} style={{ height: 48 }}>
                {METODE_LIST.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="manual-bank">
              {tipe === 'cash' ? 'Bank Asal (sumber tarik tunai)' : 'Bank / Dompet'}
            </label>
            {tipe === 'cash' ? (
              <select id="manual-bank" className="form-select" value={form.bank} onChange={e => setF('bank', e.target.value)} style={{ height: 48 }}>
                {BANK_ASAL_LIST.map(b => <option key={b}>{b}</option>)}
              </select>
            ) : (
              <div style={{ position: 'relative' }}>
                <button id="manual-bank" type="button" className="form-select" aria-haspopup="listbox" aria-expanded={bankPickerOpen}
                  onClick={() => setBankPickerOpen(v => !v)}
                  style={{ width: '100%', height: 48, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '0 12px', cursor: 'pointer' }}>
                  {form.bank === 'BCA' || form.bank === 'Mandiri' ? (
                    <img src={form.bank === 'BCA' ? '/images/bca-logo.svg' : '/images/mandiri-logo.svg'} alt="" style={{ width: 54, height: 28, objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <span aria-hidden="true" style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, background: 'rgba(16,185,129,.14)', color: '#059669', flexShrink: 0 }}>₨</span>
                  )}
                  <span style={{ flex: 1, fontWeight: 650 }}>{form.bank || 'Pilih bank / dompet'}</span>
                  <ChevronDown size={17} color="var(--text3)" />
                </button>
                {bankPickerOpen && (
                  <div role="listbox" aria-label="Pilih bank atau dompet" style={{ position: 'absolute', zIndex: 40, inset: 'calc(100% + 6px) 0 auto', padding: 6, border: '1px solid var(--border)', borderRadius: 14, background: 'var(--surface)', boxShadow: '0 16px 38px rgba(0,0,0,.18)' }}>
                    {BANK_DOMPET_LIST.map(b => (
                      <button key={b} type="button" role="option" aria-selected={form.bank === b}
                        onClick={() => { setF('bank', b); setBankPickerOpen(false) }}
                        style={{ width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', border: 0, borderRadius: 10, background: form.bank === b ? 'var(--accent-light)' : 'transparent', color: 'var(--text1)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {b === 'BCA' || b === 'Mandiri' ? (
                          <img src={b === 'BCA' ? '/images/bca-logo.svg' : '/images/mandiri-logo.svg'} alt="" style={{ width: 58, height: 30, objectFit: 'contain', flexShrink: 0 }} />
                        ) : (
                          <span aria-hidden="true" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 9, background: 'rgba(16,185,129,.14)', color: '#059669', fontSize: 18, flexShrink: 0 }}>₨</span>
                        )}
                        <span style={{ flex: 1, fontWeight: 650 }}>{b}</span>
                        {form.bank === b && <span aria-hidden="true" style={{ color: 'var(--accent)', fontWeight: 800 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {tipe === 'cash' && (
          <div style={{ ...S.infoBox, marginBottom: 14 }}>
            💡 Saldo bank ini akan berkurang & saldo Cash otomatis bertambah
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
