'use client'
import { useState } from 'react'
import { X, CheckCircle2, ArrowLeftRight, ChevronRight } from 'lucide-react'
import { fmtFull } from '../../lib/utils'

export function SetSaldoModal({ account, userName, onClose, onSaved }) {
  const [nilai, setNilai] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSave() {
    const angka = parseFloat(nilai)
    if (isNaN(angka) || angka < 0) return setError('Masukkan nominal yang valid')
    setSaving(true)
    try { await onSaved(account.account_id, angka); onClose() }
    catch (e) { setError('Gagal simpan: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px', paddingBottom: 'calc(60px + max(env(safe-area-inset-bottom), 16px) + 8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Set Saldo Aktual</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{userName} · {account.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ padding: '12px 14px', marginBottom: 16, background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
          Masukkan saldo <strong>{account.name}</strong> sesuai m-banking sekarang. Transaksi ke depan dihitung dari angka ini.
        </div>
        <div className="form-group">
          <label className="form-label">Saldo saat ini (Rp)</label>
          <input className="form-input" type="number" inputMode="numeric" placeholder="Contoh: 2450000"
            value={nilai} onChange={e => setNilai(e.target.value)} autoFocus />
        </div>
        {nilai && !isNaN(parseFloat(nilai)) && (
          <div style={{ marginBottom: 12, fontSize: 15, fontWeight: 700, color: 'var(--accent)', textAlign: 'center' }}>{fmtFull(parseFloat(nilai))}</div>
        )}
        {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-full"
          style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          {saving ? 'Menyimpan...' : 'Simpan Saldo Baseline'}
        </button>
      </div>
    </div>
  )
}

export function TransferForm({ profiles, accounts, user, initial, onClose, onSaved, title, submitLabel }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [form, setForm] = useState(initial || {
    tanggal: today, from_user: user?.id || '', to_user: '',
    from_bank: '', to_bank: '', jumlah: '', catatan: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const getBanksForUser = uid => accounts.filter(a => a.user_id === uid).map(a => a.name)
  const fromBanks = form.from_user ? getBanksForUser(form.from_user) : []
  const toBanks   = form.to_user   ? getBanksForUser(form.to_user)   : []
  const handleFromUser = uid => { const b = getBanksForUser(uid); setForm(f => ({ ...f, from_user: uid, from_bank: b[0] || '' })) }
  const handleToUser   = uid => { const b = getBanksForUser(uid); setForm(f => ({ ...f, to_user: uid, to_bank: b[0] || '' })) }
  const isInternal = form.from_user === form.to_user && form.from_user !== ''
  const fromName   = profiles.find(p => p.id === form.from_user)?.username || ''
  const toName     = profiles.find(p => p.id === form.to_user)?.username   || ''

  async function handleSave() {
    setError('')
    if (!form.from_user) return setError('Pilih pengirim')
    if (!form.to_user)   return setError('Pilih penerima')
    if (!form.from_bank) return setError('Pilih rekening asal')
    if (!form.to_bank)   return setError('Pilih rekening tujuan')
    if (isInternal && form.from_bank === form.to_bank) return setError('Rekening asal dan tujuan tidak boleh sama')
    if (!form.jumlah || isNaN(parseFloat(form.jumlah)) || parseFloat(form.jumlah) <= 0) return setError('Jumlah harus lebih dari 0')
    setSaving(true)
    try { await onSaved(form); onClose() }
    catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '92dvh', overflowY: 'auto', padding: '20px 20px', paddingBottom: 'calc(60px + max(env(safe-area-inset-bottom), 16px) + 8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeftRight size={20} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{isInternal ? 'Pindah rekening sendiri' : 'Transfer antar pengguna'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={20} /></button>
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal</label>
          <input className="form-input" type="date" value={form.tanggal} onChange={e => setF('tanggal', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
          <div>
            <label className="form-label">Dari</label>
            <select className="form-select" value={form.from_user} onChange={e => handleFromUser(e.target.value)}>
              <option value="">Pilih pengirim</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: 10, color: 'var(--text3)' }}><ArrowLeftRight size={16} /></div>
          <div>
            <label className="form-label">Ke</label>
            <select className="form-select" value={form.to_user} onChange={e => handleToUser(e.target.value)}>
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
          <div style={{ paddingBottom: 10, color: 'var(--text3)' }}><ChevronRight size={16} /></div>
          <div>
            <label className="form-label">Rekening tujuan</label>
            <select className="form-select" value={form.to_bank} onChange={e => setF('to_bank', e.target.value)} disabled={!form.to_user}>
              {!form.to_user && <option value="">Pilih penerima dulu</option>}
              {toBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
        {form.from_user && form.to_user && form.from_bank && form.to_bank && (
          <div style={{ padding: '8px 12px', marginBottom: 14, background: isInternal ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)', border: `1px solid ${isInternal ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}`, borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
            {isInternal ? `Pindah rekening ${fromName}: ${form.from_bank} → ${form.to_bank}` : `${fromName} (${form.from_bank}) → ${toName} (${form.to_bank})`}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Jumlah</label>
          <input className="form-input" type="number" inputMode="numeric" placeholder="0"
            value={form.jumlah} onChange={e => setF('jumlah', e.target.value)} min="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Catatan (opsional)</label>
          <input className="form-input" type="text" placeholder="Contoh: buat belanja bulan ini"
            value={form.catatan} onChange={e => setF('catatan', e.target.value)} />
        </div>
        {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-full"
          style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ArrowLeftRight size={18} />
          {saving ? 'Menyimpan...' : submitLabel}
        </button>
      </div>
    </div>
  )
}
