'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { supabase } from '../../lib/supabase'
import { insertTransfer, deleteTransfer } from '../../lib/data'
import { fmt, fmtTanggalShort, BULAN_ORDER } from '../../lib/utils'
import {
  ArrowLeftRight, Plus, Trash2, X, ChevronRight,
  TrendingDown, TrendingUp, Landmark, Wallet,
} from 'lucide-react'

// Bank list per user
const BANK_BY_USER = {
  '9f5a9e66-a47e-4cf1-bfe6-107da0574a2e': ['BCA', 'Mandiri', 'BRI', 'Cash'],
  '42b635cc-a32d-4b15-95d6-d9afb504a850': ['BCA', 'Mandiri', 'Cash'],
}
const DEFAULT_BANKS = ['BCA', 'Mandiri', 'BRI', 'Cash']

// ── Transfer Modal ─────────────────────────────────────────────────────────
function TransferModal({ profiles, user, onClose, onSaved }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [form, setForm] = useState({
    tanggal: today, from_user: user?.id || '', to_user: '',
    from_bank: '', to_bank: '', jumlah: '', catatan: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fromBanks = form.from_user ? (BANK_BY_USER[form.from_user] || DEFAULT_BANKS) : DEFAULT_BANKS
  const toBanks   = form.to_user   ? (BANK_BY_USER[form.to_user]   || DEFAULT_BANKS) : DEFAULT_BANKS
  const handleFromUser = uid => { const b = BANK_BY_USER[uid] || DEFAULT_BANKS; setForm(f => ({ ...f, from_user: uid, from_bank: b[0] || '' })) }
  const handleToUser   = uid => { const b = BANK_BY_USER[uid] || DEFAULT_BANKS; setForm(f => ({ ...f, to_user:   uid, to_bank:   b[0] || '' })) }
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
      await insertTransfer({ tanggal: form.tanggal, from_user: form.from_user, to_user: form.to_user, from_bank: form.from_bank, to_bank: form.to_bank, jumlah: parseFloat(form.jumlah), catatan: form.catatan || null }, user?.id)
      onSaved(); onClose()
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
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Catat Transfer</div>
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
          {saving ? 'Menyimpan...' : 'Simpan Transfer'}
        </button>
      </div>
    </div>
  )
}

// ── User Summary Card ───────────────────────────────────────────────────────
function UserSummary({ userId, userName, bankBalances, expenses, income, cashRecords, getUserName }) {
  const initial   = userName?.[0]?.toUpperCase() || '?'
  const isAldin   = userName?.toLowerCase().includes('ald')
  const color     = isAldin ? 'var(--accent)' : '#db2777'

  // Saldo rekening (bank only, no Cash/QRIS/Cardless)
  const userBanks = Object.entries(bankBalances[userId] || {})
    .filter(([bank]) => !['Cash', 'QRIS', 'Cardless'].includes(bank))
    .sort((a, b) => a[0].localeCompare(b[0]))

  // Ringkasan keuangan (all time, bisa difilter nanti)
  const myExpenses = expenses.filter(r => r.user_id === userId)
  const myIncome   = income.filter(r => r.user_id === userId)
  const myTarik    = cashRecords.filter(r => r.user_id === userId)
  const totalOut   = myExpenses.reduce((s, r) => s + (r.nilai  || 0), 0)
  const totalIn    = myIncome.reduce((s, r)   => s + (r.jumlah || 0), 0)
  const totalTarik = myTarik.reduce((s, r)    => s + (r.nilai  || 0), 0)
  const totalCashPakai = myExpenses.filter(r => r.transaksi === 'Cash').reduce((s, r) => s + (r.nilai || 0), 0)
  const sisaCash   = totalTarik - totalCashPakai
  const net        = totalIn - totalOut

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', background: `color-mix(in srgb, ${color} 5%, var(--surface))` }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color, flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{userName}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Ringkasan keuangan</div>
        </div>
        {/* Saldo net badge */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Saldo bersih</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(net)}</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'Masuk', val: totalIn,    color: 'var(--green)' },
          { label: 'Keluar', val: totalOut,   color: 'var(--red)'   },
          { label: 'Sisa Cash', val: sisaCash, color: sisaCash >= 0 ? 'var(--yellow)' : 'var(--red)' },
        ].map((item, i) => (
          <div key={item.label} style={{ padding: '12px 10px', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{fmt(item.val)}</div>
          </div>
        ))}
      </div>

      {/* Saldo rekening */}
      {userBanks.length > 0 && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Saldo Rekening</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {userBanks.map(([bank, saldo]) => {
              const isNeg = saldo < 0
              return (
                <div key={bank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10, border: `1px solid ${isNeg ? 'rgba(244,63,94,0.25)' : 'var(--border)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Landmark size={14} color="var(--text3)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{bank}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: isNeg ? 'var(--red)' : 'var(--green)' }}>{fmt(saldo)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function WalletPage() {
  const {
    filteredExpenses, filteredIncome, filteredCashRecords,
    expenses, income, cashRecords, transfers,
    bankBalances, summaryPeriode,
    periodIdx, setPeriodIdx, periods,
    loadData, loading, getUserName, profiles, user,
  } = useData()

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [tab, setTab] = useState('summary') // 'summary' | 'transfer'

  // Transfer difilter sesuai periode aktif
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

  async function handleDeleteTransfer(id) {
    if (!confirm('Hapus transfer ini?')) return
    setDeletingId(id)
    try { await deleteTransfer(id); await loadData() }
    catch (e) { alert('Gagal hapus: ' + e.message) }
    finally { setDeletingId(null) }
  }

  const users = profiles.filter(p => p.username)

  return (
    <>
      {showTransferModal && (
        <TransferModal profiles={profiles} user={user}
          onClose={() => setShowTransferModal(false)}
          onSaved={loadData} />
      )}

      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period Filter */}
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* Tab: Ringkasan / Transfer */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 }}>
          {[
            { id: 'summary',  label: 'Ringkasan' },
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

        {/* ── Tab: Ringkasan ── */}
        {tab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map(u => (
              <UserSummary
                key={u.id}
                userId={u.id}
                userName={u.username}
                bankBalances={bankBalances}
                expenses={filteredExpenses}
                income={filteredIncome}
                cashRecords={filteredCashRecords}
                getUserName={getUserName}
              />
            ))}
          </div>
        )}

        {/* ── Tab: Transfer ── */}
        {tab === 'transfer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Tombol catat transfer */}
            <button onClick={() => setShowTransferModal(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 12, border: '2px dashed var(--border)', background: 'transparent', color: 'var(--accent)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              <Plus size={18} /> Catat Transfer Baru
            </button>

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
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)', flexShrink: 0 }}>{fmt(t.jumlah)}</div>
                  <button onClick={() => handleDeleteTransfer(t.id)} disabled={deletingId === t.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}

            {filteredTransfers.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Total periode ini</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{fmt(filteredTransfers.reduce((s, r) => s + (r.jumlah || 0), 0))}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}
