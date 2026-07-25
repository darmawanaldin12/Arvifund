'use client'
import { useState, useMemo } from 'react'
import { AnimatePresence } from 'motion/react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { setAccountBalance, insertTransfer, updateTransfer, deleteTransfer } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { authenticateWithBiometric, isBiometricSupported, isBiometricRegistered } from '../../lib/biometric'
import { fmtFull, fmtTanggalShort } from '../../lib/utils'
import { ArrowLeftRight, Plus, Trash2, Pencil, ShieldCheck } from 'lucide-react'
import AccountSlider from '../../components/wallet/AccountSlider'
import RiwayatDrawer from '../../components/wallet/RiwayatDrawer'
import { SetSaldoModal, TransferForm } from '../../components/wallet/WalletModals'

async function requireBiometric() {
  const supported  = await isBiometricSupported()
  const registered = isBiometricRegistered()
  if (!supported || !registered) return true
  await authenticateWithBiometric(supabase)
  return true
}

export default function WalletPage() {
  const {
    expenses, income, cashRecords, transfers,
    bankBalances, accounts,
    periodIdx, setPeriodIdx, periods,
    loadData, loading, getUserName, profiles, user,
  } = useData()

  const [tab, setTab]                       = useState('summary')
  const [showAddModal, setShowAddModal]     = useState(false)
  const [editTransfer, setEditTransfer]     = useState(null)
  const [deletingId, setDeletingId]         = useState(null)
  const [bioError, setBioError]             = useState('')
  const [setSaldoTarget, setSetSaldoTarget] = useState(null)
  const [setSaldoUser, setSetSaldoUser]     = useState(null)
  const [historyAcc, setHistoryAcc]         = useState(null)

  const users = profiles.filter(p => p.username)

  const filteredTransfers = useMemo(() => {
    if (periodIdx === '' || periodIdx === null) return transfers
    const idx = parseInt(periodIdx); if (isNaN(idx)) return transfers
    const p = periods[idx]; if (!p) return transfers
    return transfers.filter(r => { const d = new Date(r.tanggal + 'T00:00:00'); return d >= p.start && d <= p.end })
  }, [transfers, periodIdx, periods])

  async function handleSaveSetSaldo(accountId, nilai) {
    await setAccountBalance(accountId, nilai, user?.id); await loadData()
  }

  async function handleDeleteTransfer(id) {
    setBioError(''); setDeletingId(id)
    try {
      await requireBiometric(); await deleteTransfer(id); await loadData()
    } catch (e) {
      setBioError(e?.name === 'NotAllowedError' || e?.message?.includes('cancelled') ? 'Autentikasi dibatalkan' : 'Gagal hapus: ' + e.message)
    } finally { setDeletingId(null) }
  }

  async function handleSaveAdd(form) {
    await insertTransfer({ tanggal: form.tanggal, from_user: form.from_user, to_user: form.to_user, from_bank: form.from_bank, to_bank: form.to_bank, jumlah: parseFloat(form.jumlah), catatan: form.catatan || null, biaya_admin: parseFloat(form.biaya_admin) || 0 }, user?.id)
    await loadData()
  }

  async function handleSaveEdit(form) {
    await updateTransfer(editTransfer.id, { tanggal: form.tanggal, from_user: form.from_user, to_user: form.to_user, from_bank: form.from_bank, to_bank: form.to_bank, jumlah: parseFloat(form.jumlah), catatan: form.catatan || null, biaya_admin: parseFloat(form.biaya_admin) || 0 }, user?.id)
    await loadData()
  }

  return (
    <>
      <AnimatePresence>
        {historyAcc && (
          <RiwayatDrawer key="riwayat-drawer" account={historyAcc} userName={historyAcc.userName}
            expenses={expenses} income={income} cashRecords={cashRecords} transfers={transfers}
            getUserName={getUserName} periodIdx={periodIdx} periods={periods}
            onClose={() => setHistoryAcc(null)} />
        )}
      </AnimatePresence>

      {setSaldoTarget && (
        <SetSaldoModal account={setSaldoTarget}
          userName={setSaldoUser ? getUserName(setSaldoUser) : ''}
          onClose={() => { setSetSaldoTarget(null); setSetSaldoUser(null) }}
          onSaved={handleSaveSetSaldo} />
      )}

      {showAddModal && (
        <TransferForm profiles={profiles} accounts={accounts} user={user}
          onClose={() => setShowAddModal(false)} onSaved={handleSaveAdd}
          title="Catat Transfer" submitLabel="Simpan Transfer" />
      )}
      {editTransfer && (
        <TransferForm profiles={profiles} accounts={accounts} user={user}
          initial={{ tanggal: editTransfer.tanggal, from_user: editTransfer.from_user, to_user: editTransfer.to_user, from_bank: editTransfer.from_bank, to_bank: editTransfer.to_bank, jumlah: String(editTransfer.jumlah), catatan: editTransfer.catatan || '', biaya_admin: editTransfer.biaya_admin ?? 0 }}
          onClose={() => setEditTransfer(null)} onSaved={handleSaveEdit}
          title="Edit Transfer" submitLabel="Simpan Perubahan" />
      )}

      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container">
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 }}>
          {[{ id: 'summary', label: 'Rekening' }, { id: 'transfer', label: `Transfer (${filteredTransfers.length})` }].map(t => (
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

        {tab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map(u => (
              <AccountSlider key={u.id} userId={u.id} userName={u.username}
                bankBalances={bankBalances} accounts={accounts}
                onSetSaldo={accInfo => { setSetSaldoUser(u.id); setSetSaldoTarget(accInfo) }}
                onViewHistory={acc => setHistoryAcc({ ...acc, userName: u.username })} />
            ))}
          </div>
        )}

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
              <div className="empty-state"><div className="emoji">⇔️</div><p>Belum ada transfer di periode ini</p></div>
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
                      {t.biaya_admin > 0 && <span style={{ color: 'var(--red)' }}>· biaya admin {fmtFull(t.biaya_admin)}</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)', flexShrink: 0 }}>{fmtFull(t.jumlah)}</div>
                  <button onClick={() => { setBioError(''); setEditTransfer(t) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}><Pencil size={14} /></button>
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
