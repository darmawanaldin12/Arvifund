'use client'
import { useState } from 'react'
import { ArrowLeftRight, Bot, X } from 'lucide-react'
import { useAmountInput } from '../../hooks/useAmountInput'
import BottomSheet from './BottomSheet'

const BANK_BY_USER = {
  '9f5a9e66-a47e-4cf1-bfe6-107da0574a2e': ['BCA', 'Mandiri', 'BRI', 'Cash'],
  '42b635cc-a32d-4b15-95d6-d9afb504a850': ['BCA', 'Mandiri', 'Cash'],
}
const DEFAULT_BANKS = ['BCA', 'Mandiri', 'BRI', 'Cash']

export default function TransferConfirmPopup({ result, profiles, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState({ ...result })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fromBanks = form.from_user ? (BANK_BY_USER[form.from_user] || DEFAULT_BANKS) : DEFAULT_BANKS
  const toBanks   = form.to_user   ? (BANK_BY_USER[form.to_user]   || DEFAULT_BANKS) : DEFAULT_BANKS
  const isInternal = form.from_user === form.to_user && form.from_user !== ''
  const fromName = profiles.find(p => p.id === form.from_user)?.username || ''
  const toName   = profiles.find(p => p.id === form.to_user)?.username   || ''

  const transferAmt = useAmountInput(form.jumlah, v => setF('jumlah', v))

  return (
    <BottomSheet onBackdropClick={onCancel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={22} color="var(--accent)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Transfer Terdeteksi</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Periksa detail transfer</div>
          </div>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
          <X size={20} />
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">Tanggal</label>
        <input className="form-input" type="date" value={form.tanggal} onChange={e => setF('tanggal', e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <label className="form-label">Dari</label>
          <select className="form-select" value={form.from_user} onChange={e => {
            const b = BANK_BY_USER[e.target.value] || DEFAULT_BANKS
            setForm(f => ({ ...f, from_user: e.target.value, from_bank: b[0] || '' }))
          }}>
            <option value="">Pilih pengirim</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
          </select>
        </div>
        <div style={{ paddingBottom: 10, color: 'var(--text3)' }}><ArrowLeftRight size={16} /></div>
        <div>
          <label className="form-label">Ke</label>
          <select className="form-select" value={form.to_user} onChange={e => {
            const b = BANK_BY_USER[e.target.value] || DEFAULT_BANKS
            setForm(f => ({ ...f, to_user: e.target.value, to_bank: b[0] || '' }))
          }}>
            <option value="">Pilih penerima</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
        <div>
          <label className="form-label">Rekening asal</label>
          <select className="form-select" value={form.from_bank} onChange={e => setF('from_bank', e.target.value)} disabled={!form.from_user}>
            {!form.from_user && <option value="">Pilih pengirim dulu</option>}
            {fromBanks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ paddingBottom: 10, color: 'var(--text3)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
        <div>
          <label className="form-label">Rekening tujuan</label>
          <select className="form-select" value={form.to_bank} onChange={e => setF('to_bank', e.target.value)} disabled={!form.to_user}>
            {!form.to_user && <option value="">Pilih penerima dulu</option>}
            {toBanks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {form.from_user && form.to_user && form.from_bank && form.to_bank && (
        <div style={{
          padding: '8px 12px', marginBottom: 14,
          background: isInternal ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)',
          border: `1px solid ${isInternal ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}`,
          borderRadius: 8, fontSize: 12, color: 'var(--text2)'
        }}>
          {isInternal
            ? `Pindah rekening ${fromName}: ${form.from_bank} → ${form.to_bank}`
            : `${fromName} (${form.from_bank}) → ${toName} (${form.to_bank})`}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Jumlah</label>
        <input
          className="form-input"
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={transferAmt.display}
          onChange={transferAmt.onChange}
          onKeyDown={transferAmt.onKeyDown}
          style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}
        />
        {transferAmt.formatted && (
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: transferAmt.previewColor, textAlign: 'center', letterSpacing: '-0.02em', transition: 'color 0.2s' }}>
            {transferAmt.formatted}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Catatan (opsional)</label>
        <input className="form-input" type="text" placeholder="Contoh: buat belanja bulan ini"
          value={form.catatan || ''} onChange={e => setF('catatan', e.target.value)} />
      </div>

      {error && (
        <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <button
        onClick={() => onSave({ ...form, jumlah: form.jumlah })}
        disabled={saving}
        className="btn btn-primary btn-full"
        style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <ArrowLeftRight size={18} />{saving ? 'Menyimpan...' : 'Simpan Transfer'}
      </button>
    </BottomSheet>
  )
}
