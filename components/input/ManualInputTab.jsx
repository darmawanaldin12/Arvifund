'use client'
import { Check, TrendingDown, TrendingUp, Landmark } from 'lucide-react'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST } from '../../lib/utils'
import { useAmountInput } from '../../hooks/useAmountInput'

const TIPE_LIST = [
  { id: 'expense', label: 'Pengeluaran', color: 'var(--red)',    Icon: TrendingDown },
  { id: 'income',  label: 'Pemasukan',   color: 'var(--green)',  Icon: TrendingUp },
  { id: 'cash',    label: 'Tarik Tunai', color: 'var(--yellow)', Icon: Landmark },
]

// Bank yang bisa jadi sumber tarik tunai (exclude Cash)
const BANK_ASAL_LIST = BANK_LIST.filter(b => b !== 'Cash')

export default function ManualInputTab({ tipe, setTipe, form, setF, profiles, saving, error, onSubmit }) {
  const manualAmt = useAmountInput(form.total, v => setF('total', v))

  const S = {
    typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 },
    typeBtn:  (selected, color) => ({
      padding: '14px 6px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      border: `2px solid ${selected ? color : 'var(--border)'}`,
      background: selected ? `${color}12` : 'var(--surface2)',
      color: selected ? color : 'var(--text3)',
      fontWeight: 700, fontSize: 11, touchAction: 'manipulation',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      transition: 'all 0.15s',
    }),
    errorBox: { padding: '10px 14px', marginBottom: 14, background: 'var(--red-bg)', borderRadius: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600 },
    ctaBtn:   (disabled) => ({ height: 50, fontSize: 15, fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }),
    infoBox: { padding: '10px 14px', marginBottom: 14, background: 'rgba(234,179,8,0.1)', borderRadius: 10, color: 'var(--yellow)', fontSize: 12, fontWeight: 600, border: '1px solid rgba(234,179,8,0.2)' },
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={S.typeGrid}>
        {TIPE_LIST.map(t => {
          const I = t.Icon
          return (
            <button key={t.id} type="button" onClick={() => setTipe(t.id)} style={S.typeBtn(tipe === t.id, t.color)}>
              <I size={22} />
              {t.label}
            </button>
          )
        })}
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label">Tanggal</label>
          <input className="form-input" type="date" value={form.tanggal} onChange={e => setF('tanggal', e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">
            {tipe === 'income' ? 'Sumber' : tipe === 'cash' ? 'Lokasi ATM' : 'Toko / Merchant'}
          </label>
          <input className="form-input" type="text"
            placeholder={tipe === 'income' ? 'Nama perusahaan / sumber' : tipe === 'cash' ? 'Nama ATM / lokasi' : 'Nama toko atau merchant'}
            value={form.toko} onChange={e => setF('toko', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{tipe === 'income' ? 'Keterangan' : 'Uraian / Items'}</label>
          <input className="form-input" type="text" placeholder="Deskripsi transaksi"
            value={form.uraian} onChange={e => setF('uraian', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{tipe === 'income' ? 'Jumlah' : 'Total'}</label>
          <input className="form-input" type="text" inputMode="numeric" placeholder="0"
            value={manualAmt.display} onChange={manualAmt.onChange} onKeyDown={manualAmt.onKeyDown}
            style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }} />
          {manualAmt.formatted && (
            <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: manualAmt.previewColor, textAlign: 'center', letterSpacing: '-0.02em', transition: 'color 0.2s' }}>
              {manualAmt.formatted}
            </div>
          )}
        </div>

        {tipe === 'expense' && (
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select className="form-select" value={form.kategori} onChange={e => setF('kategori', e.target.value)}>
              <option value="">Pilih Kategori</option>
              {KATEGORI_LIST.filter(k => k !== 'Pemasukan').map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
        )}

        {tipe !== 'cash' && (
          <div className="form-group">
            <label className="form-label">Metode</label>
            <select className="form-select" value={form.metode} onChange={e => setF('metode', e.target.value)}>
              {METODE_LIST.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            {tipe === 'cash' ? 'Bank Asal (sumber tarik tunai)' : 'Bank / Dompet'}
          </label>
          <select className="form-select" value={form.bank} onChange={e => setF('bank', e.target.value)}>
            {(tipe === 'cash' ? BANK_ASAL_LIST : BANK_LIST).map(b => <option key={b}>{b}</option>)}
          </select>
          {tipe === 'cash' && (
            <div style={S.infoBox}>
              💡 Saldo bank ini akan berkurang & saldo Cash otomatis bertambah
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">User</label>
          <select className="form-select" value={form.user_id} onChange={e => setF('user_id', e.target.value)} required>
            <option value="">Pilih User</option>
            {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
          </select>
        </div>

        {error && <div style={S.errorBox}>{error}</div>}

        <button type="submit" className="btn btn-primary btn-full" disabled={saving} style={S.ctaBtn(saving)}>
          <Check size={18} />{saving ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </form>
    </div>
  )
}
