'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { AnimatePresence } from 'motion/react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { setAccountBalance, insertTransfer, updateTransfer, deleteTransfer } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { authenticateWithBiometric, isBiometricSupported, isBiometricRegistered } from '../../lib/biometric'
import { fmtFull, fmtTanggalShort } from '../../lib/utils'
import { ArrowLeftRight, Plus, Trash2, Pencil, ShieldCheck, Clock, Settings2 } from 'lucide-react'
import RiwayatDrawer from '../../components/wallet/RiwayatDrawer'
import { SetSaldoModal, TransferForm } from '../../components/wallet/WalletModals'
import {
  UserSwitcher, BalanceHero, QuickActions, AccountListCard, RecentCard, AccountPickerSheet,
} from '../../components/wallet/WalletUI'

const HIDE_KEY = 'arvifund:wallet-hide'

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
  const [viewUserId, setViewUserId]         = useState(null)
  const [pickerOpen, setPickerOpen]         = useState(false)
  const [hide, setHide]                     = useState(false)

  // Sembunyikan saldo: pilihan diingat di perangkat
  useEffect(() => {
    try { setHide(localStorage.getItem(HIDE_KEY) === '1') } catch (_) {}
  }, [])
  function toggleHide() {
    setHide(v => {
      const next = !v
      try { localStorage.setItem(HIDE_KEY, next ? '1' : '0') } catch (_) {}
      return next
    })
  }

  const users = profiles.filter(p => p.username)

  // Dompet yang ditampilkan: user yang dipilih, default user yang sedang login
  const activeUserId = viewUserId && users.some(u => u.id === viewUserId)
    ? viewUserId
    : (users.find(u => u.id === user?.id)?.id || users[0]?.id)
  const activeUser = users.find(u => u.id === activeUserId)

  // Rekening user aktif (sama dengan logika AccountSlider sebelumnya)
  const items = useMemo(() => accounts
    .filter(a => a.user_id === activeUserId)
    .map(acc => ({
      ...acc,
      ...(bankBalances[activeUserId]?.[acc.name] || { saldo: 0, needsSetup: true, account_id: acc.id }),
    })), [accounts, bankBalances, activeUserId])

  const setUpItems = items.filter(a => !a.needsSetup)
  const total      = setUpItems.reduce((s, a) => s + a.saldo, 0)
  const allTotal    = users.reduce((sum, u) => sum + accounts
    .filter(a => a.user_id === u.id)
    .reduce((s, a) => {
      const b = bankBalances[u.id]?.[a.name]
      return b && !b.needsSetup ? s + (b.saldo || 0) : s
    }, 0), 0)

  // Transaksi terakhir milik user aktif: pengeluaran, pemasukan, tarik tunai, transfer
  const recent = useMemo(() => {
    const uid = activeUserId
    if (!uid) return []
    const rows = []
    expenses.filter(r => r.user_id === uid).forEach(r => rows.push({
      key: 'e' + r.id, kind: 'expense', sign: '−', tanggal: r.tanggal, ts: r.created_at || '',
      label: r.toko || r.kategori || 'Pengeluaran', sub: r.bank, nilai: r.nilai || 0,
    }))
    income.filter(r => r.user_id === uid).forEach(r => rows.push({
      key: 'i' + r.id, kind: 'income', sign: '+', tanggal: r.tanggal, ts: r.created_at || '',
      label: r.sumber || 'Pemasukan', sub: r.bank, nilai: r.jumlah || 0,
    }))
    cashRecords.filter(r => r.user_id === uid).forEach(r => rows.push({
      key: 'c' + r.id, kind: 'cash', sign: '', tanggal: r.tanggal, ts: r.created_at || '',
      label: r.transaksi || 'Tarik Tunai', sub: `${r.bank} → Cash`, nilai: r.nilai || 0,
    }))
    transfers.filter(t => t.from_user === uid || t.to_user === uid).forEach(t => {
      const internal = t.from_user === t.to_user
      const masuk    = !internal && t.to_user === uid
      rows.push({
        key: 't' + t.id, kind: 'transfer', sign: internal ? '' : masuk ? '+' : '−',
        tanggal: t.tanggal, ts: t.created_at || '',
        label: internal ? `Pindah ${t.from_bank} → ${t.to_bank}` : masuk ? `Transfer dari ${getUserName(t.from_user)}` : `Transfer ke ${getUserName(t.to_user)}`,
        sub: t.catatan || (internal ? '' : `${t.from_bank} → ${t.to_bank}`), nilai: t.jumlah || 0,
      })
    })
    return rows
      .sort((a, b) => {
        const dc = (b.tanggal || '').localeCompare(a.tanggal || '')
        return dc !== 0 ? dc : b.ts.localeCompare(a.ts)
      })
      .slice(0, 5)
  }, [activeUserId, expenses, income, cashRecords, transfers, getUserName])

  const filteredTransfers = useMemo(() => {
    if (periodIdx === '' || periodIdx === null) return transfers
    const idx = parseInt(periodIdx); if (isNaN(idx)) return transfers
    const p = periods[idx]; if (!p) return transfers
    return transfers.filter(r => { const d = new Date(r.tanggal + 'T00:00:00'); return d >= p.start && d <= p.end })
  }, [transfers, periodIdx, periods])

  function openSetSaldo(acc) {
    setPickerOpen(false)
    setSetSaldoUser(activeUserId)
    setSetSaldoTarget({ account_id: acc.id, name: acc.name })
  }

  function openHistory(acc) {
    if (acc.needsSetup) { openSetSaldo(acc); return }
    setHistoryAcc({ ...acc, userName: activeUser?.username })
  }

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

  function scrollToRecent() {
    setTab('summary')
    setTimeout(() => document.getElementById('wallet-recent')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const sectionTitle = { margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.02em' }

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

      {pickerOpen && (
        <AccountPickerSheet items={items} hide={hide} onPick={openSetSaldo} onClose={() => setPickerOpen(false)} />
      )}

      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container wallet-page-container">
        <div className="wallet-page-intro">
          <h2>Wallet</h2>
          <p>Kelola saldo, dompet, dan riwayat transaksi dengan mudah.</p>
        </div>

        <UserSwitcher users={users} activeId={activeUserId} onChange={setViewUserId} accountCount={items.length} />

        <div style={{ marginTop: 14 }}>
          <BalanceHero total={total} hasBalance={setUpItems.length > 0} allTotal={allTotal} hide={hide} onToggle={toggleHide} />
        </div>

        <div style={{ marginTop: 14 }}>
          <QuickActions actions={[
            { label: 'Transfer',   Icon: ArrowLeftRight, onClick: () => setShowAddModal(true) },
            { label: 'Riwayat',    Icon: Clock,          onClick: scrollToRecent },
            { label: 'Atur Saldo', Icon: Settings2,      onClick: () => items.length > 0 && setPickerOpen(true) },
          ]} />
        </div>

        {/* Tab: Rekening | Transfer */}
        <div role="tablist" aria-label="Wallet" style={{ display: 'flex', borderBottom: '1px solid var(--border)', margin: '20px 0 14px' }}>
          {[{ id: 'summary', label: 'Rekening' }, { id: 'transfer', label: `Transfer (${filteredTransfers.length})` }].map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, minHeight: 46, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 700, fontSize: 14, color: tab === t.id ? 'var(--accent)' : 'var(--text3)',
              borderBottom: tab === t.id ? '3px solid var(--accent)' : '3px solid transparent', marginBottom: -1,
              transition: 'color 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Filter periode (berlaku untuk daftar transfer & riwayat rekening) */}
        <div className="filter-bar wallet-period-filter" style={{ marginBottom: 14 }}>
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {tab === 'summary' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 10px' }}>
              <h3 style={sectionTitle}>Dompet &amp; Rekening</h3>
              {items.length > 0 && (
                <button type="button" onClick={() => setPickerOpen(true)}
                  style={{ minHeight: 44, padding: '0 4px', border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Atur Saldo
                </button>
              )}
            </div>
            <AccountListCard items={items} hide={hide} onOpen={openHistory} onSetSaldo={openSetSaldo} />

            <div id="wallet-recent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '26px 2px 10px', scrollMarginTop: 12 }}>
              <h3 style={sectionTitle}>Transaksi Terakhir</h3>
              <Link href="/transaksi" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 4px', color: 'var(--accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Lihat Semua</Link>
            </div>
            <RecentCard rows={recent} hide={hide} />
          </>
        )}

        {tab === 'transfer' && (
          <div className="wallet-transfer-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="wallet-transfer-new-btn" onClick={() => setShowAddModal(true)}
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
                <div key={t.id} className="wallet-transfer-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
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
                  <button onClick={() => { setBioError(''); setEditTransfer(t) }} aria-label="Edit transfer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}><Pencil size={14} /></button>
                  <button onClick={() => handleDeleteTransfer(t.id)} disabled={deletingId === t.id} aria-label="Hapus transfer"
                    style={{ background: 'none', border: 'none', cursor: deletingId === t.id ? 'not-allowed' : 'pointer', color: deletingId === t.id ? 'var(--text3)' : 'var(--red)', padding: 4, flexShrink: 0, opacity: deletingId === t.id ? 0.5 : 1 }}>
                    {deletingId === t.id ? <ShieldCheck size={14} style={{ animation: 'pulse 0.8s ease-in-out infinite' }} /> : <Trash2 size={14} />}
                  </button>
                </div>
              )
            })}
            {filteredTransfers.length > 0 && (
              <div className="wallet-transfer-total" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, fontSize: 13 }}>
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
