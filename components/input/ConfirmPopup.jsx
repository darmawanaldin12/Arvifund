'use client'
import { X, Check, PenLine, TrendingDown, TrendingUp, Landmark } from 'lucide-react'
import GeminiIcon from '../GeminiIcon'
import BottomSheet from './BottomSheet'
import { useAmountInput } from '../../hooks/useAmountInput'

export default function ConfirmPopup({ parsedResult, setParsedResult, profiles, saving, error, onSave, onCancel, onEditManual }) {
  const tipeColorConfirm = parsedResult?.tipe === 'expense' ? 'var(--red)' : parsedResult?.tipe === 'income' ? 'var(--green)' : 'var(--yellow)'
  const TipeIconConfirm  = parsedResult?.tipe === 'income' ? TrendingUp : parsedResult?.tipe === 'cash' ? Landmark : TrendingDown

  const confirmAmt = useAmountInput(
    parsedResult?.total ?? '',
    v => setParsedResult(p => ({ ...p, total: v }))
  )

  if (!parsedResult) return null

  const rows = [
    { label: 'Tipe', value: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: tipeColorConfirm }}>
        <TipeIconConfirm size={14} />
        {parsedResult.tipe === 'expense' ? 'Pengeluaran' : parsedResult.tipe === 'income' ? 'Pemasukan' : 'Tarik Tunai'}
      </span>
    )},
    { label: 'Tanggal', value: parsedResult.tanggal },
    { label: parsedResult.tipe === 'income' ? 'Sumber' : parsedResult.tipe === 'cash' ? 'ATM / Lokasi' : 'Merchant', value: parsedResult.toko || '—' },
    { label: 'Uraian', value: parsedResult.uraian || '—' },
    { label: 'Jumlah', isAmountInput: true },
    ...(parsedResult.tipe === 'expense' ? [{ label: 'Kategori', value: parsedResult.kategori || 'Lainnya' }] : []),
    { label: 'Bank / Dompet', value: parsedResult.bank || 'Cash' },
    { label: 'Metode', value: parsedResult.metode || 'Cash' },
    { label: 'User', isUserSelect: true },
  ]

  return (
    <BottomSheet onBackdropClick={onCancel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GeminiIcon size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Hasil Ekstraksi AI</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Periksa sebelum simpan</div>
          </div>
        </div>
        <button onClick={onCancel}
          style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface2)', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
        {rows.map((row, i, arr) => (
          <div key={row.label}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
            <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{row.label}</span>

            {row.isAmountInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <input type="text" inputMode="numeric"
                  value={confirmAmt.display} onChange={confirmAmt.onChange} onKeyDown={confirmAmt.onKeyDown}
                  style={{ background: 'var(--bg)', color: tipeColorConfirm, border: '1.5px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 16, fontWeight: 800, fontFamily: 'inherit', outline: 'none', textAlign: 'right', width: 140 }} />
                {confirmAmt.formatted && (
                  <span style={{ fontSize: 10, color: tipeColorConfirm, opacity: 0.8 }}>{confirmAmt.formatted}</span>
                )}
              </div>
            ) : row.isUserSelect ? (
              <select value={parsedResult.user_id}
                onChange={e => setParsedResult(p => ({ ...p, user_id: e.target.value }))}
                style={{ background: 'var(--bg)', color: 'var(--text1)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Pilih User</option>
                {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
              </select>
            ) : typeof row.value === 'string' ? (
              <span style={{ fontWeight: 600, color: 'var(--text1)', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
            ) : row.value}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={onEditManual}
          style={{ flex: 1, gap: 6, borderRadius: 12 }}>
          <PenLine size={14} /> Edit Manual
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}
          style={{ flex: 2, gap: 6, borderRadius: 12, height: 44 }}>
          {saving ? 'Menyimpan...' : <><Check size={15} /> Konfirmasi &amp; Simpan</>}
        </button>
      </div>
    </BottomSheet>
  )
}
