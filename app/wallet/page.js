'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { setAccountBalance, insertTransfer, updateTransfer, deleteTransfer } from '../../lib/data'
import { authenticateWithBiometric, isBiometricSupported, isBiometricRegistered } from '../../lib/biometric'
import { fmtFull, fmtTanggalShort } from '../../lib/utils'
import {
  ArrowLeftRight, Plus, Trash2, X, ChevronRight,
  Pencil, ShieldCheck, Wallet2, Settings2, CheckCircle2, AlertCircle,
} from 'lucide-react'

const CARD_THEME = {
  BCA:     { bg: 'linear-gradient(135deg, #003d82 0%, #0066cc 60%, #0099ff 100%)', chip: '#f5c842', label: '#a8d4ff' },
  Mandiri: { bg: 'linear-gradient(135deg, #1a3a00 0%, #2d6a00 60%, #4a9e00 100%)', chip: '#f5d442', label: '#b8e87a' },
  BRI:     { bg: 'linear-gradient(135deg, #7a0000 0%, #c0001a 60%, #e8003d 100%)', chip: '#ffd700', label: '#ffb3c0' },
  BNI:     { bg: 'linear-gradient(135deg, #001a4d 0%, #003399 60%, #0055cc 100%)', chip: '#f0c000', label: '#99bbff' },
  Cash:    { bg: 'linear-gradient(135deg, #3a2a00 0%, #7a5a00 60%, #b88a00 100%)', chip: '#ffe066', label: '#ffe8a0' },
  default: { bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)', chip: '#e0c97f', label: '#9eafd4' },
}

async function requireBiometric() {
  const supported  = await isBiometricSupported()
  const registered = isBiometricRegistered()
  if (!supported || !registered) return true
  await authenticateWithBiometric()
  return true
}

// ── ATM Card ─────────────────────────────────────────────────────────────────
function AtmCard({ bankName, saldo, userName, needsSetup }) {
  const theme = CARD_THEME[bankName] || CARD_THEME.default
  const isNeg = saldo < 0
  return (
    <div style={{
      width: '100%', aspectRatio: '1.586 / 1', borderRadius: 16,
      background: theme.bg, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)', position: 'relative',
      overflow: 'hidden', flexShrink: 0, userSelect: 'none',
      opacity: needsSetup ? 0.7 : 1,
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '0.04em', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{bankName}</div>
        <div style={{ width: 28, height: 22, borderRadius: 4, background: theme.chip, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 18, height: 14, borderRadius: 2, border: '1px solid rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: 2 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 1 }} />)}
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: theme.label, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Saldo Rekening</div>
        {needsSetup ? (
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>Belum diatur</div>
        ) : (
          <div style={{ fontSize: 20, fontWeight: 800, color: isNeg ? '#ff6b6b' : '#fff', letterSpacing: '-0.01em', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
            {fmtFull(saldo)}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{userName}</div>
      </div>
    </div>
  )
}

// ── Set Saldo Modal ────────────────────────────────────────────────────────────
function SetSaldoModal({ account, userName, onClose, onSaved }) {
  const [nilai, setNilai] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSave() {
    const angka = parseFloat(nilai)
    if (isNaN(angka) || angka < 0) return setError('Masukkan nominal yang valid')
    setSaving(true)
    try {
      await onSaved(account.account_id, angka)
      onClose()
    } catch (e) {
      setError('Gagal simpan: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px', paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Set Saldo Aktual</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{userName} · {account.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ padding: '12px 14px', marginBottom: 16, background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
          Masukkan saldo rekening <strong>{account.name}</strong> sekarang sesuai yang tertera di m-banking. Transaksi ke depan akan dihitung dari angka ini.
        </div>
        <div className="form-group">
          <label className="form-label">Saldo saat ini (Rp)</label>
          <input
            className="form-input"
            type="number"
            inputMode="numeric"
            placeholder="Contoh: 2450000"
            value={nilai}
            onChange={e => setNilai(e.target.value)}
            autoFocus
          />
        </div>
        {nilai && !isNaN(parseFloat(nilai)) && (
          <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: 'var(--accent)', textAlign: 'center' }}>
            {fmtFull(parseFloat(nilai))}
          </div>
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

// ── Transfer Form ─────────────────────────────────────────────────────────────
function TransferForm({ profiles, accounts, user, initial, onClose, onSaved, title, submitLabel }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [form, setForm] = useState(initial || {
    tanggal: today, from_user: user?.id || '', to_user: '',
    from_bank: '', to_bank: '', jumlah: '', catatan: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const getBanksForUser = (uid) => accounts.filter(a => a.user_id === uid).map(a => a.name)
  const fromBanks = form.from_user ? getBanksForUser(form.from_user) : []
  const toBanks   = form.to_user   ? getBanksForUser(form.to_user)   : []

  const handleFromUser = uid => {
    const banks = getBanksForUser(uid)
    setForm(f => ({ ...f, from_user: uid, from_bank: banks[0] || '' }))
  }
  const handleToUser = uid => {
    const banks = getBanksForUser(uid)
    setForm(f => ({ ...f, to_user: uid, to_bank: banks[0] || '' }))
  }

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
    try {
      await onSaved(form)
      onClose()
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '92dvh', overflowY: 'auto', padding: '20px 20px', paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 8px)' }}>
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
          <input className="form-input" type="number" inputMode="numeric" placeholder="0" value={form.jumlah} onChange={e => setF('jumlah', e.target.value)} min="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Catatan (opsional)</label>
          <input className="form-input" type="text" placeholder="Contoh: buat belanja bulan ini" value={form.catatan} onChange={e => setF('catatan', e.target.value)} />
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

// ── User Wallet Card ──────────────────────────────────────────────────────────
function UserWalletCard({ userId, userName, bankBalances, accounts, onSetSaldo }) {
  const isAldin = userName?.toLowerCase().includes('ald')
  const color   = isAldin ? 'var(--accent)' : '#db2777'
  const initial = userName?.[0]?.toUpperCase() || '?'

  const userAccounts = accounts.filter(a => a.user_id === userId)
  const userBanks    = userAccounts.filter(a => a.type !== 'cash')
  const cashAcc      = userAccounts.find(a => a.type === 'cash')

  const bankItems = userBanks.map(acc => ({
    ...acc,
    ...(bankBalances[userId]?.[acc.name] || { saldo: 0, needsSetup: true, account_id: acc.id }),
  }))
  const cashItem = cashAcc ? {
    ...cashAcc,
    ...(bankBalances[userId]?.[cashAcc.name] || { saldo: 0, needsSetup: true, account_id: cashAcc.id }),
  } : null

  const totalSaldo = [...bankItems, ...(cashItem ? [cashItem] : [])]
    .filter(a => !a.needsSetup)
    .reduce((s, a) => s + a.saldo, 0)

  const needsSetupCount = [...bankItems, ...(cashItem ? [cashItem] : [])].filter(a => a.needsSetup).length

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: `color-mix(in srgb, ${color} 5%, var(--surface))`, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color, flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{userName}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {needsSetupCount > 0 ? `${needsSetupCount} rekening belum diatur` : 'Semua rekening aktif'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Total aset</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: totalSaldo >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {needsSetupCount === userAccounts.length ? '—' : fmtFull(totalSaldo)}
          </div>
        </div>
      </div>

      {/* Bank accounts */}
      {bankItems.map((acc, i) => (
        <div key={acc.id} style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>{acc.name}</div>
              {acc.needsSetup ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={11} color="var(--yellow)" />
                  <span style={{ fontSize: 11, color: 'var(--yellow)' }}>Belum diatur</span>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Baseline: {new Date(acc.balance_set_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', marginRight: 8 }}>
              {acc.needsSetup ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic' }}>—</div>
              ) : (
                <div style={{ fontSize: 15, fontWeight: 800, color: acc.saldo < 0 ? 'var(--red)' : 'var(--text1)' }}>{fmtFull(acc.saldo)}</div>
              )}
            </div>
            <button
              onClick={() => onSetSaldo({ account_id: acc.id, name: acc.name })}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text2)', fontFamily: 'inherit', flexShrink: 0 }}>
              <Settings2 size={12} />
              {acc.needsSetup ? 'Set' : 'Ubah'}
            </button>
          </div>
          {/* Mini ATM card preview — hanya tampil kalau sudah di-set */}
          {!acc.needsSetup && (
            <div style={{ padding: '0 16px 14px' }}>
              <AtmCard bankName={acc.name} saldo={acc.saldo} userName={userName} needsSetup={false} />
            </div>
          )}
        </div>
      ))}

      {/* Cash */}
      {cashItem && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'color-mix(in srgb, var(--yellow) 15%, transparent)', border: '1.5px solid var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet2 size={14} color="var(--yellow)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>Cash</div>
            {cashItem.needsSetup ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={11} color="var(--yellow)" />
                <span style={{ fontSize: 11, color: 'var(--yellow)' }}>Belum diatur</span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                Baseline: {new Date(cashItem.balance_set_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', marginRight: 8 }}>
            {cashItem.needsSetup ? (
              <div style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic' }}>—</div>
            ) : (
              <div style={{ fontSize: 15, fontWeight: 800, color: cashItem.saldo < 0 ? 'var(--red)' : 'var(--yellow)' }}>{fmtFull(cashItem.saldo)}</div>
            )}
          </div>
          <button
            onClick={() => onSetSaldo({ account_id: cashItem.id, name: cashItem.name })}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text2)', fontFamily: 'inherit', flexShrink: 0 }}>
            <Settings2 size={12} />
            {cashItem.needsSetup ? 'Set' : 'Ubah'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const {
    transfers, bankBalances, accounts,
    periodIdx, setPeriodIdx, periods,
    loadData, loading, getUserName, profiles, user,
  } = useData()

  const [tab, setTab]                 = useState('summary')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTransfer, setEditTransfer] = useState(null)
  const [deletingId, setDeletingId]     = useState(null)
  const [bioError, setBioError]         = useState('')
  const [setSaldoTarget, setSetSaldoTarget] = useState(null) // { account_id, name }
  const [setSaldoUser, setSetSaldoUser]     = useState(null)

  const users = profiles.filter(p => p.username)

  const filteredTransfers = useMemo(() => {
    if (periodIdx === '' || periodIdx === null) return transfers
    const idx = parseInt(periodIdx)
    if (isNaN(idx)) return transfers
    const p = periods[idx]
    if (!p) return transfers
    return transfers.filter(r => {
      const d = new Date(r.tanggal + 'T00:00:00')
      return d >= p.start && d <= p.end
    })
  }, [transfers, periodIdx, periods])

  function handleOpenSetSaldo(userId, accountInfo) {
    setSetSaldoUser(userId)
    setSetSaldoTarget(accountInfo)
  }

  async function handleSaveSetSaldo(accountId, nilai) {
    await setAccountBalance(accountId, nilai, user?.id)
    await loadData()
  }

  async function handleDeleteTransfer(id) {
    setBioError('')
    setDeletingId(id)
    try {
      await requireBiometric()
      await deleteTransfer(id)
      await loadData()
    } catch (e) {
      if (e?.name === 'NotAllowedError' || e?.message?.includes('cancelled')) {
        setBioError('Autentikasi dibatalkan')
      } else {
        setBioError('Gagal hapus: ' + e.message)
      }
    } finally { setDeletingId(null) }
  }

  async function handleSaveAdd(form) {
    await insertTransfer({
      tanggal: form.tanggal, from_user: form.from_user, to_user: form.to_user,
      from_bank: form.from_bank, to_bank: form.to_bank,
      jumlah: parseFloat(form.jumlah), catatan: form.catatan || null,
    }, user?.id)
    await loadData()
  }

  async function handleSaveEdit(form) {
    await updateTransfer(editTransfer.id, {
      tanggal: form.tanggal, from_user: form.from_user, to_user: form.to_user,
      from_bank: form.from_bank, to_bank: form.to_bank,
      jumlah: parseFloat(form.jumlah), catatan: form.catatan || null,
    }, user?.id)
    await loadData()
  }

  const setSaldoUserName = setSaldoUser ? getUserName(setSaldoUser) : ''

  return (
    <>
      {/* Set Saldo Modal */}
      {setSaldoTarget && (
        <SetSaldoModal
          account={setSaldoTarget}
          userName={setSaldoUserName}
          onClose={() => { setSetSaldoTarget(null); setSetSaldoUser(null) }}
          onSaved={handleSaveSetSaldo}
        />
      )}

      {/* Transfer Modals */}
      {showAddModal && (
        <TransferForm
          profiles={profiles} accounts={accounts} user={user}
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaveAdd}
          title="Catat Transfer" submitLabel="Simpan Transfer"
        />
      )}
      {editTransfer && (
        <TransferForm
          profiles={profiles} accounts={accounts} user={user}
          initial={{
            tanggal: editTransfer.tanggal, from_user: editTransfer.from_user,
            to_user: editTransfer.to_user, from_bank: editTransfer.from_bank,
            to_bank: editTransfer.to_bank, jumlah: String(editTransfer.jumlah),
            catatan: editTransfer.catatan || '',
          }}
          onClose={() => setEditTransfer(null)}
          onSaved={handleSaveEdit}
          title="Edit Transfer" submitLabel="Simpan Perubahan"
        />
      )}

      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period filter */}
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 }}>
          {[
            { id: 'summary',  label: 'Rekening' },
            { id: 'transfer', label: `Transfer (${filteredTransfers.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '9px 8px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
              background: tab === t.id ? 'var(--surface)' : 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text3)',
              boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab: Rekening */}
        {tab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map(u => (
              <UserWalletCard
                key={u.id}
                userId={u.id}
                userName={u.username}
                bankBalances={bankBalances}
                accounts={accounts}
                onSetSaldo={(accInfo) => handleOpenSetSaldo(u.id, accInfo)}
              />
            ))}
          </div>
        )}

        {/* Tab: Transfer */}
        {tab === 'transfer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 12, border: '2px dashed var(--border)', background: 'transparent', color: 'var(--accent)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              <Plus size={18} /> Catat Transfer Baru
            </button>

            {bioError && (
              <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={15} /> {bioError}
              </div>
            )}

            {filteredTransfers.length === 0 ? (
              <div className="empty-state"><div className="emoji">↔️</div><p>Belum ada transfer di periode ini</p></div>
            ) : filteredTransfers.map(t => {
              const fromName   = getUserName(t.from_user)
              const toName     = getUserName(t.to_user)
              const isInternal = t.from_user === t.to_user
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isInternal ? 'rgba(245,158,11,0.1)' : 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowLeftRight size={16} color={isInternal ? 'var(--yellow)' : 'var(--accent)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                      {isInternal ? `${fromName}: ${t.from_bank} → ${t.to_bank}` : `${fromName} → ${toName}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span>{fmtTanggalShort(t.tanggal)}</span>
                      {!isInternal && t.from_bank && <span>· {t.from_bank} → {t.to_bank}</span>}
                      {t.catatan && <span>· {t.catatan}</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)', flexShrink: 0 }}>{fmtFull(t.jumlah)}</div>
                  <button onClick={() => { setBioError(''); setEditTransfer(t) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDeleteTransfer(t.id)} disabled={deletingId === t.id}
                    style={{ background: 'none', border: 'none', cursor: deletingId === t.id ? 'not-allowed' : 'pointer', color: deletingId === t.id ? 'var(--text3)' : 'var(--red)', padding: 4, flexShrink: 0, opacity: deletingId === t.id ? 0.5 : 1 }}>
                    {deletingId === t.id ? <ShieldCheck size={14} style={{ animation: 'pulse 0.8s ease-in-out infinite' }} /> : <Trash2 size={14} />}
                  </button>
                </div>
              )
            })}

            {filteredTransfers.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Total periode ini</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{fmtFull(filteredTransfers.reduce((s, r) => s + (r.jumlah || 0), 0))}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </>
  )
}
