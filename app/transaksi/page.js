'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import EditModal from '../../components/modals/EditModal'
import { useToast } from '../../hooks/useToast'
import {
  fmtTanggalShort, parseTanggal, filterByPeriod,
  KATEGORI_LIST, KATEGORI_COLOR, BULAN_ORDER,
} from '../../lib/utils'
import { updateExpense, deleteExpense, updateIncome, deleteIncome, updateCashRecord, deleteCashRecord } from '../../lib/data'
import { authenticateWithBiometric, isBiometricSupported, isBiometricRegistered } from '../../lib/biometric'
import { supabase } from '../../lib/supabase'
import AppSelect from '../../components/ui/AppSelect'
import { Search } from 'lucide-react'
import { TIPE_CONFIG, fmtJam, isCatatTelat, exportTransaksiCSV } from '../../lib/transaksiHelpers'
import TipeFilterGrid from '../../components/transaksi/TipeFilterGrid'
import TransaksiSummaryBar from '../../components/transaksi/TransaksiSummaryBar'
import TransaksiAllTab from '../../components/transaksi/TransaksiAllTab'
import TransaksiExpenseTab from '../../components/transaksi/TransaksiExpenseTab'
import TransaksiIncomeTab from '../../components/transaksi/TransaksiIncomeTab'
import TransaksiCashTab from '../../components/transaksi/TransaksiCashTab'
import TransaksiTransferTab from '../../components/transaksi/TransaksiTransferTab'

export default function TransaksiPage() {
  const {
    filteredExpenses, filteredIncome, filteredCashRecords, transfers,
    loadData, loading, periodIdx, setPeriodIdx, periods,
    getUserName, user, payPeriodDate, overrides,
  } = useData()
  const { showToast, ToastContainer } = useToast()

  const [tab, setTab]               = useState('all') // 'all' | 'expense' | 'income' | 'transfer' | 'cash'
  const [filterKat, setFilterKat]   = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [search, setSearch]         = useState('')
  const [editData, setEditData]     = useState(null)
  const [editType, setEditType]     = useState(null)
  const [saving, setSaving]         = useState(false)
  const [sortKey, setSortKey]       = useState('tanggal')
  const [sortDir, setSortDir]       = useState('desc')
  const [exporting, setExporting]   = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  function switchTab(t) {
    setTab(t)
    setFilterKat('')
    setFilterUser('')
    setSearch('')
    setSortKey('tanggal')
    setSortDir('desc')
  }

  // ── Transfer butuh filter periode manual (tidak disediakan DataContext) ──
  const filteredTransfers = useMemo(
    () => periodIdx !== '' ? filterByPeriod(transfers, periodIdx, payPeriodDate, overrides) : transfers,
    [transfers, periodIdx, payPeriodDate, overrides]
  )

  // ── Totals untuk tile filter ──
  const totalExp = useMemo(() => filteredExpenses.reduce((s, r) => s + (r.nilai || 0), 0), [filteredExpenses])
  const totalInc = useMemo(() => filteredIncome.reduce((s, r) => s + (r.jumlah || 0), 0), [filteredIncome])
  const totalTrf = useMemo(() => filteredTransfers.reduce((s, r) => s + (r.jumlah || 0), 0), [filteredTransfers])
  const totalCsh = useMemo(() => filteredCashRecords.reduce((s, r) => s + (r.nilai || 0), 0), [filteredCashRecords])
  const countAll = filteredExpenses.length + filteredIncome.length + filteredTransfers.length + filteredCashRecords.length

  const TOTAL_BY_TIPE = { expense: totalExp, income: totalInc, transfer: totalTrf, cash: totalCsh }
  const COUNT_BY_TIPE = { expense: filteredExpenses.length, income: filteredIncome.length, transfer: filteredTransfers.length, cash: filteredCashRecords.length }

  // ── Anomali threshold (khusus expense) ──
  const anomaliThreshold = useMemo(() => {
    if (!filteredExpenses.length) return 0
    const avg = filteredExpenses.reduce((s, r) => s + (r.nilai || 0), 0) / filteredExpenses.length
    return avg * 3
  }, [filteredExpenses])

  // ── User names untuk dropdown — tergantung tab aktif ──
  const userNames = useMemo(() => {
    const set = new Set()
    const addFrom = (rows, key) => rows.forEach(r => { const n = getUserName(r[key]); if (n) set.add(n) })
    if (tab === 'expense') addFrom(filteredExpenses, 'user_id')
    else if (tab === 'income') addFrom(filteredIncome, 'user_id')
    else if (tab === 'cash') addFrom(filteredCashRecords, 'user_id')
    else if (tab === 'transfer') addFrom(filteredTransfers, 'from_user')
    else {
      addFrom(filteredExpenses, 'user_id'); addFrom(filteredIncome, 'user_id')
      addFrom(filteredCashRecords, 'user_id'); addFrom(filteredTransfers, 'from_user')
    }
    return [...set]
  }, [tab, filteredExpenses, filteredIncome, filteredCashRecords, filteredTransfers, getUserName])

  // ── Expense rows (full — parity dengan halaman lama /expenses) ──
  const expenseRows = useMemo(() => {
    const filtered = filteredExpenses.filter(r =>
      (!filterKat  || r.kategori === filterKat) &&
      (!filterUser || getUserName(r.user_id) === filterUser) &&
      (!search     || (r.toko + ' ' + (r.uraian || '')).toLowerCase().includes(search.toLowerCase()))
    )
    const sorted = [...filtered].sort((a, b) => {
      let va, vb
      if (sortKey === 'tanggal') {
        const dc = (a.tanggal || '').localeCompare(b.tanggal || '')
        if (dc !== 0) return sortDir === 'asc' ? dc : -dc
        va = a.created_at || ''; vb = b.created_at || ''
      } else if (sortKey === 'nilai') { va = a.nilai || 0; vb = b.nilai || 0 }
      else { va = a[sortKey] || ''; vb = b[sortKey] || '' }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted.map(r => ({
      ...r,
      _jam:    fmtJam(r.created_at),
      _telat:  isCatatTelat(r.tanggal, r.created_at),
      _isAnom: r.nilai >= anomaliThreshold && r.nilai > 100_000,
      _color:  KATEGORI_COLOR[r.kategori] || 'var(--text3)',
    }))
  }, [filteredExpenses, filterKat, filterUser, search, sortKey, sortDir, getUserName, anomaliThreshold])

  // ── Income rows ──
  const incomeRows = useMemo(() => {
    const filtered = filteredIncome.filter(r =>
      (!filterUser || getUserName(r.user_id) === filterUser) &&
      (!search || (r.sumber + ' ' + (r.items || '')).toLowerCase().includes(search.toLowerCase()))
    )
    return [...filtered].sort((a, b) => {
      let va = sortKey === 'jumlah' ? (a.jumlah || 0) : (a[sortKey] || '')
      let vb = sortKey === 'jumlah' ? (b.jumlah || 0) : (b[sortKey] || '')
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredIncome, filterUser, search, sortKey, sortDir, getUserName])

  // ── Cash rows ──
  const cashRows = useMemo(() => {
    const filtered = filteredCashRecords.filter(r =>
      (!filterUser || getUserName(r.user_id) === filterUser) &&
      (!search || ((r.transaksi || '') + ' ' + (r.alamat || '') + ' ' + (r.bank || '')).toLowerCase().includes(search.toLowerCase()))
    )
    return [...filtered].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
  }, [filteredCashRecords, filterUser, search, getUserName])

  // ── Transfer rows ──
  const transferRows = useMemo(() => {
    const filtered = filteredTransfers.filter(r =>
      (!filterUser || getUserName(r.from_user) === filterUser) &&
      (!search || ((r.catatan || '') + ' ' + (r.from_bank || '') + ' ' + (r.to_bank || '')).toLowerCase().includes(search.toLowerCase()))
    )
    return [...filtered].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
  }, [filteredTransfers, filterUser, search, getUserName])

  // ── Gabungan semua transaksi (tab "Semua") ──
  const allRows = useMemo(() => {
    const rows = []
    filteredExpenses.forEach(r => rows.push({
      id: 'exp_' + r.id, tipe: 'expense', tanggal: r.tanggal,
      label: r.toko || 'Pengeluaran', sub: r.uraian || r.kategori || '',
      amount: r.nilai, userName: getUserName(r.user_id), raw: r,
    }))
    filteredIncome.forEach(r => rows.push({
      id: 'inc_' + r.id, tipe: 'income', tanggal: r.tanggal,
      label: r.sumber || 'Pemasukan', sub: r.items || r.kategori || '',
      amount: r.jumlah, userName: getUserName(r.user_id), raw: r,
    }))
    filteredCashRecords.forEach(r => rows.push({
      id: 'csh_' + r.id, tipe: 'cash', tanggal: r.tanggal,
      label: r.transaksi || 'Tarik Tunai', sub: r.bank ? `dari ${r.bank}` : '',
      amount: r.nilai, userName: getUserName(r.user_id), raw: r,
    }))
    filteredTransfers.forEach(r => rows.push({
      id: 'trf_' + r.id, tipe: 'transfer', tanggal: r.tanggal,
      label: `${getUserName(r.from_user)} → ${getUserName(r.to_user)}`,
      sub: r.catatan || `${r.from_bank || '-'} → ${r.to_bank || '-'}`,
      amount: r.jumlah, userName: getUserName(r.from_user), raw: r,
    }))
    const filtered = rows.filter(r =>
      (!filterUser || r.userName === filterUser) &&
      (!search || (r.label + ' ' + r.sub).toLowerCase().includes(search.toLowerCase()))
    )
    return filtered.sort((a, b) => (parseTanggal(b.tanggal)?.getTime() || 0) - (parseTanggal(a.tanggal)?.getTime() || 0))
  }, [filteredExpenses, filteredIncome, filteredCashRecords, filteredTransfers, filterUser, search, getUserName])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // ── Buka modal edit dari row gabungan ──
  function openEditFromRow(row) {
    if (row.tipe === 'expense') { setEditData(row.raw); setEditType('expense') }
    else if (row.tipe === 'income') { setEditData(row.raw); setEditType('income') }
    else if (row.tipe === 'cash') { setEditData(row.raw); setEditType('cash') }
    // transfer: dikelola di halaman Wallet
  }

  // ── Hapus dari row gabungan (tab "Semua") — dispatch ke handler sesuai tipe ──
  function handleDeleteFromRow(row) {
    if (row.tipe === 'expense') return handleDeleteExpense(row.raw.id)
    if (row.tipe === 'income')  return handleDeleteIncome(row.raw.id)
    if (row.tipe === 'cash')    return handleDeleteCash(row.raw.id)
    // transfer: dikelola di halaman Wallet
  }

  // ── Helper: minta verifikasi biometrik sebelum aksi destruktif ──
  // Kalau biometrik tersedia & sudah didaftarkan → wajib verifikasi biometrik.
  // Kalau tidak tersedia (device lama / belum daftar) → fallback ke confirm biasa,
  // supaya user tetap bisa hapus data di device yang tidak support biometrik.
  async function confirmWithBiometric(confirmMessage) {
    const supported  = await isBiometricSupported()
    const registered = isBiometricRegistered()
    if (supported && registered) {
      await authenticateWithBiometric(supabase)
      return true
    }
    return window.confirm(confirmMessage)
  }

  // ── Handlers: Expense ──
  async function handleSaveExpense(form) {
    setSaving(true)
    try {
      const [, m] = (form.tanggal || '').split('-')
      const bulan = m ? BULAN_ORDER[parseInt(m) - 1] : form.bulan
      await updateExpense(form.id, {
        toko: form.toko, tanggal: form.tanggal?.split('T')[0], bulan,
        transaksi: form.transaksi, uraian: form.uraian,
        kategori: form.kategori, bank: form.bank,
        nilai: form.nilai, edited_note: form.edited_note,
      }, user?.id)
      showToast('✅ Berhasil disimpan')
      setEditData(null); setEditType(null)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal menyimpan: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  async function handleDeleteExpense(id) {
    setDeletingId(id)
    try {
      const ok = await confirmWithBiometric('Hapus transaksi ini? Tindakan tidak bisa dibatalkan.')
      if (!ok) { setDeletingId(null); return }
      await deleteExpense(id)
      showToast('🗑️ Transaksi dihapus')
      await loadData()
    } catch (e) {
      if (e?.name === 'NotAllowedError' || e?.message?.includes('cancelled')) showToast('Autentikasi dibatalkan', 'error')
      else showToast('❌ Gagal hapus: ' + e.message, 'error')
    } finally { setDeletingId(null) }
  }

  // ── Handlers: Income ──
  async function handleSaveIncome(form) {
    setSaving(true)
    try {
      const [, m] = (form.tanggal || '').split('-')
      const bulan = m ? BULAN_ORDER[parseInt(m) - 1] : form.bulan
      await updateIncome(form.id, {
        sumber: form.sumber, tanggal: form.tanggal?.split('T')[0], bulan,
        jumlah: form.jumlah, metode: form.metode, kategori: form.kategori,
        items: form.items, bank: form.bank, edited_note: form.edited_note,
      }, user?.id)
      showToast('✅ Berhasil disimpan')
      setEditData(null); setEditType(null)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  async function handleDeleteIncome(id) {
    setDeletingId(id)
    try {
      const ok = await confirmWithBiometric('Hapus pemasukan ini? Tindakan tidak bisa dibatalkan.')
      if (!ok) { setDeletingId(null); return }
      await deleteIncome(id)
      showToast('🗑️ Pemasukan dihapus')
      await loadData()
    } catch (e) {
      if (e?.name === 'NotAllowedError' || e?.message?.includes('cancelled')) showToast('Autentikasi dibatalkan', 'error')
      else showToast('❌ Gagal hapus: ' + e.message, 'error')
    } finally { setDeletingId(null) }
  }

  // ── Handlers: Cash ──
  async function handleSaveCash(form) {
    setSaving(true)
    try {
      const [, m] = (form.tanggal || '').split('-')
      const bulan = m ? BULAN_ORDER[parseInt(m) - 1] : form.bulan
      await updateCashRecord(form.id, {
        transaksi: form.transaksi, tanggal: form.tanggal?.split('T')[0], bulan,
        nilai: form.nilai, alamat: form.alamat, bank: form.bank, edited_note: form.edited_note,
      }, user?.id)
      showToast('✅ Berhasil disimpan')
      setEditData(null); setEditType(null)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  async function handleDeleteCash(id) {
    setDeletingId(id)
    try {
      const ok = await confirmWithBiometric('Hapus catatan tarik tunai ini? Tindakan tidak bisa dibatalkan.')
      if (!ok) { setDeletingId(null); return }
      await deleteCashRecord(id)
      showToast('🗑️ Catatan dihapus')
      await loadData()
    } catch (e) {
      if (e?.name === 'NotAllowedError' || e?.message?.includes('cancelled')) showToast('Autentikasi dibatalkan', 'error')
      else showToast('❌ Gagal hapus: ' + e.message, 'error')
    } finally { setDeletingId(null) }
  }

  function handleExport() {
    const map  = { all: allRows, expense: expenseRows, income: incomeRows, cash: cashRows, transfer: transferRows }
    const rows = map[tab] || []
    if (!rows.length) { showToast('Tidak ada data untuk diekspor', 'error'); return }
    setExporting(true)
    try {
      exportTransaksiCSV(rows, tab, getUserName)
      showToast(`✅ CSV berhasil diunduh (${rows.length} baris)`)
    } catch (e) {
      showToast('❌ Gagal export: ' + e.message, 'error')
    } finally { setExporting(false) }
  }

  const activeCount = tab === 'all' ? allRows.length : tab === 'expense' ? expenseRows.length : tab === 'income' ? incomeRows.length : tab === 'cash' ? cashRows.length : transferRows.length
  const searchPlaceholder = tab === 'expense' ? 'Cari toko / uraian...'
    : tab === 'income' ? 'Cari sumber...'
    : tab === 'cash' ? 'Cari keterangan / lokasi...'
    : tab === 'transfer' ? 'Cari catatan / bank...'
    : 'Cari semua transaksi...'

  return (
    <>
      <AppHeader title="Transaksi" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        <TipeFilterGrid
          tab={tab}
          onSwitch={switchTab}
          countAll={countAll}
          totalInc={totalInc}
          totalExp={totalExp}
          totalByTipe={TOTAL_BY_TIPE}
          countByTipe={COUNT_BY_TIPE}
        />

        {/* ── Period Filter ── */}
        <div className="filter-bar" style={{ marginBottom: 12 }}>
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="trx-search-wrap">
          <Search size={15} aria-hidden="true" className="trx-search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder={searchPlaceholder}
            aria-label="Cari transaksi"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* ── Filter sekunder: Kategori (khusus pengeluaran) + User ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {tab === 'expense' && (
            <AppSelect
              value={filterKat}
              onChange={e => setFilterKat(e.target.value)}
              placeholder="Semua Kategori"
              options={KATEGORI_LIST.filter(k => k !== 'Pemasukan')}
              style={{ flex: 1 }}
            />
          )}
          {userNames.length > 0 && (
            <AppSelect
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              placeholder="Semua User"
              options={userNames}
              style={{ flex: 1 }}
            />
          )}
        </div>

        <TransaksiSummaryBar
          activeCount={activeCount}
          tab={tab}
          totalByTipe={TOTAL_BY_TIPE}
          tipeConfig={TIPE_CONFIG}
          onExport={handleExport}
          exporting={exporting}
        />

        {tab === 'all' && (
          <TransaksiAllTab
            rows={allRows}
            onRowClick={openEditFromRow}
            onDelete={handleDeleteFromRow}
            deletingId={deletingId}
          />
        )}

        {tab === 'expense' && (
          <TransaksiExpenseTab
            rows={expenseRows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onEdit={r => { setEditData(r); setEditType('expense') }}
            onDelete={handleDeleteExpense}
            deletingId={deletingId}
            getUserName={getUserName}
          />
        )}

        {tab === 'income' && (
          <TransaksiIncomeTab
            rows={incomeRows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onEdit={r => { setEditData(r); setEditType('income') }}
            onDelete={handleDeleteIncome}
            deletingId={deletingId}
            getUserName={getUserName}
          />
        )}

        {tab === 'cash' && (
          <TransaksiCashTab
            rows={cashRows}
            onEdit={r => { setEditData(r); setEditType('cash') }}
            onDelete={handleDeleteCash}
            deletingId={deletingId}
            getUserName={getUserName}
          />
        )}

        {tab === 'transfer' && (
          <TransaksiTransferTab rows={transferRows} getUserName={getUserName} />
        )}

      </div>

      {editData && editType && (
        <EditModal
          type={editType}
          data={editData}
          onSave={editType === 'expense' ? handleSaveExpense : editType === 'income' ? handleSaveIncome : handleSaveCash}
          onClose={() => { setEditData(null); setEditType(null) }}
          loading={saving}
        />
      )}

      <ToastContainer />
    </>
  )
}
