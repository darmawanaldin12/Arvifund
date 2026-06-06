'use client'
import { useMemo, useState } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { supabase } from '../../lib/supabase'
import { insertTransfer, deleteTransfer } from '../../lib/data'
import { fmt, fmtTanggal, BULAN_ORDER } from '../../lib/utils'
import {
  ArrowLeftRight, Plus, Trash2, X, ChevronRight,
  TrendingDown, TrendingUp, Landmark, Wallet,
} from 'lucide-react'

// Bank list per user — sesuai akun di tabel accounts
const BANK_BY_USER = {
  '9f5a9e66-a47e-4cf1-bfe6-107da0574a2e': ['BCA', 'Mandiri', 'BRI', 'Cash'], // Aldin
  '42b635cc-a32d-4b15-95d6-d9afb504a850': ['BCA', 'Mandiri', 'Cash'],         // Solikhatun
}
const DEFAULT_BANKS = ['BCA', 'Mandiri', 'BRI', 'Cash']

const USER_COLORS = {
  a: { bg: '#8b5cf6', text: '#fff' },
  s: { bg: '#3b82f6', text: '#fff' },
  default: { bg: '#64748b', text: '#fff' },
}

function Avatar({ name, size = 36 }) {
  const initial = name?.charAt(0)?.toUpperCase() || '?'
  const key = initial.toLowerCase()
  const color = USER_COLORS[key] || USER_COLORS.default
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3,
      background: color.bg, color: color.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 800, flexShrink: 0,
    }}>{initial}</div>
  )
}

// ── Modal input transfer ───────────────────────────────────────────────────
function TransferModal({ profiles, user, onClose, onSaved }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [form, setForm] = useState({
    tanggal:   today,
    from_user: user?.id || '',
    to_user:   '',
    from_bank: '',
    to_bank:   '',
    jumlah:    '',
    catatan:   '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Bank list dinamis per user yang dipilih
  const fromBanks = form.from_user ? (BANK_BY_USER[form.from_user] || DEFAULT_BANKS) : DEFAULT_BANKS
  const toBanks   = form.to_user   ? (BANK_BY_USER[form.to_user]   || DEFAULT_BANKS) : DEFAULT_BANKS

  // Reset bank saat user berubah
  const handleFromUserChange = (uid) => {
    const banks = BANK_BY_USER[uid] || DEFAULT_BANKS
    setForm(f => ({ ...f, from_user: uid, from_bank: banks[0] || '' }))
  }
  const handleToUserChange = (uid) => {
    const banks = BANK_BY_USER[uid] || DEFAULT_BANKS
    setForm(f => ({ ...f, to_user: uid, to_bank: banks[0] || '' }))
  }

  // Cek apakah ini transfer internal (user sama)
  const isInternal = form.from_user === form.to_user && form.from_user !== ''

  async function handleSave() {
    setError('')
    if (!form.from_user)       return setError('Pilih pengirim')
    if (!form.to_user)         return setError('Pilih penerima')
    if (!form.from_bank)       return setError('Pilih rekening asal')
    if (!form.to_bank)         return setError('Pilih rekening tujuan')
    if (isInternal && form.from_bank === form.to_bank)
      return setError('Rekening asal dan tujuan tidak boleh sama')
    if (!form.jumlah || isNaN(parseFloat(form.jumlah)) || parseFloat(form.jumlah) <= 0)
      return setError('Jumlah harus diisi dan lebih dari 0')

    setSaving(true)
    try {
      await insertTransfer({
        tanggal:   form.tanggal,
        from_user: form.from_user,
        to_user:   form.to_user,
        from_bank: form.from_bank,
        to_bank:   form.to_bank,
        jumlah:    parseFloat(form.jumlah),
        catatan:   form.catatan || null,
      }, user?.id)
      onSaved()
      onClose()
    } catch (err) {
      setError('Gagal simpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const fromName = profiles.find(p => p.id === form.from_user)?.username || ''
  const toName   = profiles.find(p => p.id === form.to_user)?.username   || ''

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 560, maxHeight: '92dvh',
        overflowY: 'auto', padding: '20px 20px',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 8px)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeftRight size={20} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Catat Transfer</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {isInternal ? 'Pindah rekening sendiri' : 'Transfer antar pengguna'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tanggal */}
        <div className="form-group">
          <label className="form-label">Tanggal</label>
          <input className="form-input" type="date" value={form.tanggal} onChange={e => setF('tanggal', e.target.value)} />
        </div>

        {/* From / To user */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
          <div>
            <label className="form-label">Dari</label>
            <select className="form-select" value={form.from_user} onChange={e => handleFromUserChange(e.target.value)}>
              <option value="">Pilih pengirim</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: 10, color: 'var(--text3)' }}>
            <ArrowLeftRight size={16} />
          </div>
          <div>
            <label className="form-label">Ke</label>
            <select className="form-select" value={form.to_user} onChange={e => handleToUserChange(e.target.value)}>
              <option value="">Pilih penerima</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </div>
        </div>

        {/* From / To bank — dinamis per user */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
          <div>
            <label className="form-label">Rekening asal</label>
            <select className="form-select" value={form.from_bank} onChange={e => setF('from_bank', e.target.value)} disabled={!form.from_user}>
              {!form.from_user && <option value="">Pilih pengirim dulu</option>}
              {fromBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: 10, color: 'var(--text3)' }}>
            <ChevronRight size={16} />
          </div>
          <div>
            <label className="form-label">Rekening tujuan</label>
            <select className="form-select" value={form.to_bank} onChange={e => setF('to_bank', e.target.value)} disabled={!form.to_user}>
              {!form.to_user && <option value="">Pilih penerima dulu</option>}
              {toBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Info label transfer type */}
        {form.from_user && form.to_user && form.from_bank && form.to_bank && (
          <div style={{
            padding: '8px 12px', marginBottom: 14,
            background: isInternal ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)',
            border: `1px solid ${isInternal ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}`,
            borderRadius: 8, fontSize: 12, color: 'var(--text2)',
          }}>
            {isInternal
              ? `Pindah rekening ${fromName}: ${form.from_bank} → ${form.to_bank}`
              : `${fromName} (${form.from_bank}) → ${toName} (${form.to_bank})`
            }
          </div>
        )}

        {/* Jumlah */}
        <div className="form-group">
          <label className="form-label">Jumlah</label>
          <input className="form-input" type="number" inputMode="numeric" placeholder="0"
            value={form.jumlah} onChange={e => setF('jumlah', e.target.value)} min="0" />
        </div>

        {/* Catatan */}
        <div className="form-group">
          <label className="form-label">Catatan (opsional)</label>
          <input className="form-input" type="text" placeholder="Contoh: buat belanja bulan ini"
            value={form.catatan} onChange={e => setF('catatan', e.target.value)} />
        </div>

        {error && (
          <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave} disabled={saving}
          className="btn btn-primary btn-full"
          style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <ArrowLeftRight size={18} />
          {saving ? 'Menyimpan...' : 'Simpan Transfer'}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function WalletPage() {
  const {
    filteredExpenses, filteredCashRecords, filteredIncome,
    expenses, income, cashRecords, transfers,
    summaryPeriode, bankBalances,
    periodIdx, setPeriodIdx, periods,
    loadData, loading, getUserName, profiles, user,
  } = useData()

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const s = summaryPeriode

  const cashSaldoEntries = Object.entries(s.saldoCashByUser || {})

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

  // Saldo per bank per user — flat list untuk display
  const bankBalanceList = useMemo(() => {
    const list = []
    Object.entries(bankBalances).forEach(([userId, banks]) => {
      const userName = getUserName(userId)
      Object.entries(banks).forEach(([bank, saldo]) => {
        if (bank === 'Cash' || bank === 'QRIS' || bank === 'Cardless') return
        list.push({ userId, userName, bank, saldo })
      })
    })
    list.sort((a, b) => a.userName.localeCompare(b.userName) || a.bank.localeCompare(b.bank))
    return list
  }, [bankBalances, getUserName])

  const totalTransferPeriode = useMemo(() =>
    filteredTransfers.reduce((s, r) => s + (r.jumlah || 0), 0)
  , [filteredTransfers])

  const metodeByBulan = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(BULAN_ORDER[d.getMonth()])
    }
    return months.map(bulan => {
      const exp = expenses.filter(r => r.bulan === bulan)
      return {
        bulan,
        cash:     exp.filter(r => r.transaksi === 'Cash').reduce((s, r) => s + (r.nilai || 0), 0),
        qris:     exp.filter(r => r.transaksi === 'QRIS').reduce((s, r) => s + (r.nilai || 0), 0),
        transfer: exp.filter(r => r.transaksi === 'Transfer').reduce((s, r) => s + (r.nilai || 0), 0),
      }
    })
  }, [expenses])

  const activePeriod = periodIdx !== '' ? periods[parseInt(periodIdx)] : null

  async function handleDeleteTransfer(id) {
    if (!confirm('Hapus transfer ini?')) return
    setDeletingId(id)
    try {
      await deleteTransfer(id)
      await loadData()
    } catch (e) {
      alert('Gagal hapus: ' + e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {showTransferModal && (
        <TransferModal
          profiles={profiles}
          user={user}
          onClose={() => setShowTransferModal(false)}
          onSaved={loadData}
        />
      )}

      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period Filter */}
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`}
              onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* ── Saldo Rekening per User ─────────────────────────── */}
        {bankBalanceList.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <Wallet size={14} /> Saldo Rekening
              </div>
              <span className="badge badge-blue" style={{ fontSize: 11 }}>REALTIME</span>
            </div>

            {(() => {
              const grouped = {}
              bankBalanceList.forEach(item => {
                if (!grouped[item.userId]) grouped[item.userId] = { userName: item.userName, banks: [] }
                grouped[item.userId].banks.push(item)
              })
              return Object.entries(grouped).map(([uid, { userName, banks }]) => (
                <div key={uid} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Avatar name={userName} size={28} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text1)' }}>{userName}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {banks.map(({ bank, saldo }) => {
                      const isNeg = saldo < 0
                      return (
                        <div key={bank} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px',
                          background: 'var(--surface2)',
                          borderRadius: 10,
                          border: `1px solid ${isNeg ? 'rgba(244,63,94,0.3)' : 'var(--border)'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Landmark size={16} color="var(--text3)" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{bank}</span>
                          </div>
                          <span style={{
                            fontSize: 15, fontWeight: 800,
                            color: isNeg ? 'var(--red)' : 'var(--green)',
                          }}>{fmt(saldo)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}

        {/* ── Tombol Catat Transfer ───────────────────────────── */}
        <button
          onClick={() => setShowTransferModal(true)}
          className="btn btn-ghost btn-full"
          style={{
            height: 48, marginBottom: 16, fontSize: 14,
            border: '2px dashed var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'var(--accent)',
          }}
        >
          <Plus size={18} /> Catat Transfer
        </button>

        {/* ── Riwayat Transfer ────────────────────────────────── */}
        {transfers.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <ArrowLeftRight size={14} /> Riwayat Transfer
              </div>
              <span className="badge badge-blue" style={{ fontSize: 11 }}>
                {filteredTransfers.length} transaksi
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredTransfers.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  Tidak ada transfer di periode ini
                </div>
              )}
              {filteredTransfers.map(t => {
                const fromName = getUserName(t.from_user)
                const toName   = getUserName(t.to_user)
                const isInternal = t.from_user === t.to_user
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: 'var(--surface2)',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: isInternal ? 'rgba(245,158,11,0.12)' : 'rgba(56,189,248,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ArrowLeftRight size={16} color={isInternal ? 'var(--yellow)' : 'var(--accent)'} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                        {isInternal
                          ? `${fromName}: ${t.from_bank} → ${t.to_bank}`
                          : `${fromName} → ${toName}`
                        }
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span>{fmtTanggal(t.tanggal)}</span>
                        {!isInternal && t.from_bank && t.to_bank && (
                          <span>· {t.from_bank} → {t.to_bank}</span>
                        )}
                        {t.catatan && <span>· {t.catatan}</span>}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                        {fmt(t.jumlah)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTransfer(t.id)}
                      disabled={deletingId === t.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>

            {filteredTransfers.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Total transfer periode ini</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{fmt(totalTransferPeriode)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Saldo Cash per User ──────────────────────────────── */}
        {cashSaldoEntries.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="section-title" style={{ margin: 0 }}>
                <Landmark size={14} /> Saldo Cash per User
              </div>
              <span className="badge badge-blue" style={{ cursor: 'pointer', fontSize: 11 }}>TARIK – TERPAKAI</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cashSaldoEntries.map(([uid, saldo]) => {
                const tarik    = s.tarikTunaiByUser?.[uid] || 0
                const terpakai = s.expensesCashByUser?.[uid] || 0
                const pct      = tarik > 0 ? Math.max(0, Math.min(100, Math.round((saldo / tarik) * 100))) : 0
                const name     = getUserName(uid)
                const isNeg    = saldo < 0
                return (
                  <div key={uid} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={name} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{activePeriod ? activePeriod.label : 'Semua Periode'}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                          <TrendingUp size={14} /> Tarik Tunai
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>{fmt(tarik)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                          <TrendingDown size={14} /> Terpakai
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>{fmt(terpakai)}</span>
                      </div>
                      <div style={{ height: 1, background: 'var(--border)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Sisa Cash</span>
                        <span style={{ fontWeight: 800, fontSize: 15, color: isNeg ? 'var(--red)' : 'var(--green)' }}>{fmt(saldo)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sisa cash</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isNeg ? 'var(--red)' : 'var(--green)' }}>
                        {isNeg ? '-' : ''}{Math.abs(pct)}% tersisa
                      </span>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{
                        width: `${Math.abs(pct)}%`,
                        background: isNeg ? 'var(--red)' : 'linear-gradient(90deg, var(--accent), var(--green))',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Cash vs QRIS vs Transfer per Bulan ──────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0 }}>Cash vs QRIS vs Transfer</div>
            <span className="badge badge-blue" style={{ fontSize: 11 }}>PER BULAN</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {metodeByBulan.map(({ bulan, cash, qris, transfer }) => {
              const total = cash + qris + transfer
              if (total === 0) return null
              return (
                <div key={bulan}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{bulan}</div>
                  {[
                    { label: 'Cash',     val: cash,     color: 'var(--yellow)' },
                    { label: 'QRIS',     val: qris,     color: 'var(--green)' },
                    { label: 'Transfer', val: transfer,  color: 'var(--accent)' },
                  ].map(({ label, val, color }) => {
                    const pct = total > 0 ? Math.round(val / total * 100) : 0
                    return (
                      <div key={label} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>
                            {fmt(val)} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({pct}%)</span>
                          </span>
                        </div>
                        <div className="progress-wrap">
                          <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {metodeByBulan.every(m => m.cash + m.qris + m.transfer === 0) && (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Belum ada data</div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
