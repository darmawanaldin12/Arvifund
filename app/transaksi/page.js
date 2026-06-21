'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import EditModal from '../../components/modals/EditModal'
import { useToast } from '../../hooks/useToast'
import {
  fmt, fmtTanggalShort, parseTanggal, filterByPeriod,
  KATEGORI_LIST, KATEGORI_COLOR, BULAN_ORDER,
} from '../../lib/utils'
import { updateExpense, deleteExpense, updateIncome, updateCashRecord, deleteCashRecord } from '../../lib/data'
import { authenticateWithBiometric, isBiometricSupported, isBiometricRegistered } from '../../lib/biometric'
import { supabase } from '../../lib/supabase'
import AppSelect from '../../components/ui/AppSelect'
import KategoriIcon from '../../components/ui/KategoriIcon'
import {
  Pencil, Trash2, Download, AlertTriangle, Loader2, ShieldCheck, Clock, Search,
  TrendingDown, TrendingUp, ArrowLeftRight, Landmark, Receipt, ArrowUpRight,
} from 'lucide-react'

// ── TIPE CONFIG — warna & icon konsisten dengan dashboard (RecentTransactionsCard) ──
const TIPE_CONFIG = {
  expense:  { key: 'expense',  label: 'Pengeluaran', color: 'var(--red)',    bg: 'var(--red-bg)',      Icon: TrendingDown   },
  income:   { key: 'income',   label: 'Pemasukan',   color: 'var(--green)',  bg: 'var(--green-bg)',    Icon: TrendingUp     },
  transfer: { key: 'transfer', label: 'Transfer',    color: 'var(--accent)', bg: 'var(--accent-light)',Icon: ArrowLeftRight },
  cash:     { key: 'cash',     label: 'Tarik Tunai',  color: 'var(--yellow)', bg: 'var(--yellow-bg)',  Icon: Landmark       },
}
const TIPE_ORDER = ['expense', 'income', 'transfer', 'cash']

// ── Pure helpers (aman dipanggil di useMemo) ──────────────────────────────
function _fmtJam(isoString) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
  } catch { return null }
}
function _isCatatTelat(tanggal, createdAt) {
  if (!tanggal || !createdAt) return false
  try {
    const tTrx   = tanggal.split('T')[0]
    const tInput = new Date(createdAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    return tTrx !== tInput
  } catch { return false }
}

// ── CSV EXPORT — kolom menyesuaikan tab aktif ─────────────────────────────
function exportCSV(rows, tab, getUserName) {
  const escape = v => {
    if (v == null) return ''
    const s = String(v)
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  let headers, body
  if (tab === 'expense') {
    headers = ['Tanggal', 'Bulan', 'Toko', 'Uraian', 'Kategori', 'Metode', 'Bank', 'User', 'Nilai']
    body = rows.map(r => [r.tanggal, r.bulan, r.toko, r.uraian, r.kategori, r.transaksi, r.bank, getUserName(r.user_id), r.nilai])
  } else if (tab === 'income') {
    headers = ['Tanggal', 'Bulan', 'Sumber', 'Keterangan', 'Metode', 'Bank', 'User', 'Jumlah']
    body = rows.map(r => [r.tanggal, r.bulan, r.sumber, r.items, r.metode, r.bank, getUserName(r.user_id), r.jumlah])
  } else if (tab === 'cash') {
    headers = ['Tanggal', 'Keterangan', 'Lokasi', 'Bank', 'User', 'Nilai']
    body = rows.map(r => [r.tanggal, r.transaksi, r.alamat, r.bank, getUserName(r.user_id), r.nilai])
  } else if (tab === 'transfer') {
    headers = ['Tanggal', 'Dari User', 'Dari Bank', 'Ke User', 'Ke Bank', 'Catatan', 'Jumlah']
    body = rows.map(r => [r.tanggal, getUserName(r.from_user), r.from_bank, getUserName(r.to_user), r.to_bank, r.catatan, r.jumlah])
  } else {
    headers = ['Tanggal', 'Tipe', 'Label', 'Keterangan', 'User', 'Jumlah']
    body = rows.map(r => [r.tanggal, TIPE_CONFIG[r.tipe]?.label || r.tipe, r.label, r.sub, r.userName, r.amount])
  }
  const csv = '\uFEFF' + [headers.join(','), ...body.map(row => row.map(escape).join(','))].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `arvifund-transaksi-${tab}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

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
      _jam:    _fmtJam(r.created_at),
      _telat:  _isCatatTelat(r.tanggal, r.created_at),
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
      const supported  = await isBiometricSupported()
      const registered = isBiometricRegistered()
      if (supported && registered) {
        await authenticateWithBiometric(supabase)
      } else if (!window.confirm('Hapus transaksi ini? Tindakan tidak bisa dibatalkan.')) {
        setDeletingId(null); return
      }
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
    if (!window.confirm('Hapus catatan tarik tunai ini? Tindakan tidak bisa dibatalkan.')) return
    setDeletingId(id)
    try {
      await deleteCashRecord(id)
      showToast('🗑️ Catatan dihapus')
      await loadData()
    } catch (e) {
      showToast('❌ Gagal hapus: ' + e.message, 'error')
    } finally { setDeletingId(null) }
  }

  function handleExport() {
    const map  = { all: allRows, expense: expenseRows, income: incomeRows, cash: cashRows, transfer: transferRows }
    const rows = map[tab] || []
    if (!rows.length) { showToast('Tidak ada data untuk diekspor', 'error'); return }
    setExporting(true)
    try {
      exportCSV(rows, tab, getUserName)
      showToast(`✅ CSV berhasil diunduh (${rows.length} baris)`)
    } catch (e) {
      showToast('❌ Gagal export: ' + e.message, 'error')
    } finally { setExporting(false) }
  }

  const activeCount = tab === 'all' ? allRows.length : tab === 'expense' ? expenseRows.length : tab === 'income' ? incomeRows.length : tab === 'cash' ? cashRows.length : transferRows.length
  const searchPlaceholder = tab === 'expense' ? '🔍 Cari toko / uraian...'
    : tab === 'income' ? '🔍 Cari sumber...'
    : tab === 'cash' ? '🔍 Cari keterangan / lokasi...'
    : tab === 'transfer' ? '🔍 Cari catatan / bank...'
    : '🔍 Cari semua transaksi...'

  return (
    <>
      <AppHeader title="Transaksi" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* ── Filter tipe transaksi (sekaligus ringkasan) ── */}
        <div className="trx-typegrid">
          <button
            type="button"
            onClick={() => switchTab('all')}
            className={`trx-tile trx-hero${tab === 'all' ? ' is-active' : ''}`}
            style={{ '--tile-color': 'var(--accent)', '--tile-bg': 'var(--accent-light)' }}
            aria-pressed={tab === 'all'}
          >
            <div className="trx-tile-top">
              <div className="trx-tile-icon"><Receipt size={16} /></div>
              <span className="trx-tile-count">{countAll} transaksi</span>
            </div>
            <div className="trx-tile-label">Semua Transaksi</div>
            <div className="trx-tile-value trx-hero-value">{countAll}</div>
            <div className="trx-hero-sub">
              <span style={{ color: 'var(--green)' }}>↑ {fmt(totalInc)}</span>
              <span style={{ color: 'var(--red)' }}>↓ {fmt(totalExp)}</span>
            </div>
          </button>

          {TIPE_ORDER.map(key => {
            const cfg = TIPE_CONFIG[key]
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                className={`trx-tile${active ? ' is-active' : ''}`}
                style={{ '--tile-color': cfg.color, '--tile-bg': cfg.bg }}
                aria-pressed={active}
              >
                <div className="trx-tile-top">
                  <div className="trx-tile-icon"><cfg.Icon size={15} /></div>
                  <span className="trx-tile-count">{COUNT_BY_TIPE[key]}</span>
                </div>
                <div className="trx-tile-label">{cfg.label}</div>
                <div className="trx-tile-value">{fmt(TOTAL_BY_TIPE[key])}</div>
              </button>
            )
          })}
        </div>

        {/* ── Period Filter ── */}
        <div className="filter-bar" style={{ marginBottom: 12 }}>
          <div className={`filter-chip${periodIdx === '' ? ' active' : ''}`} onClick={() => setPeriodIdx('')}>Semua</div>
          {periods.map((p, i) => (
            <div key={i} className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`} onClick={() => setPeriodIdx(String(i))}>{p.label}</div>
          ))}
        </div>

        {/* ── Search ── */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={15} aria-hidden="true" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
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

        {/* ── Summary + Export ── */}
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          marginBottom: 12, fontSize: 13, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
            <span><strong style={{ color: 'var(--text1)' }}>{activeCount}</strong> transaksi</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {tab !== 'all' && (
                <span>Total: <strong style={{ color: TIPE_CONFIG[tab].color }}>{fmt(TOTAL_BY_TIPE[tab])}</strong></span>
              )}
              <button
                onClick={handleExport}
                disabled={exporting || activeCount === 0}
                aria-label="Unduh CSV"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--surface2)',
                  color: activeCount === 0 ? 'var(--text3)' : 'var(--accent)',
                  fontSize: 12, fontWeight: 700, cursor: activeCount === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: activeCount === 0 ? 0.5 : 1,
                }}
              >
                {exporting ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={13} />}
                CSV
              </button>
            </span>
          </div>
        </div>

        {/* ══════════════ TAB: SEMUA ══════════════ */}
        {tab === 'all' && (
          <div>
            {allRows.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="emoji">🔍</div><p>Tidak ada transaksi ditemukan</p></div></div>
            ) : allRows.map(row => {
              const cfg = TIPE_CONFIG[row.tipe]
              const Ic  = cfg.Icon
              const tappable = row.tipe !== 'transfer'
              return (
                <div
                  key={row.id}
                  className={`trx-row${tappable ? ' is-tappable' : ''}`}
                  onClick={tappable ? () => openEditFromRow(row) : undefined}
                  role={tappable ? 'button' : undefined}
                  tabIndex={tappable ? 0 : undefined}
                >
                  <div className="trx-row-icon" style={{ background: cfg.bg, color: cfg.color }}>
                    <Ic size={17} />
                  </div>
                  <div className="trx-row-info">
                    <div className="trx-row-label">{row.label}</div>
                    <div className="trx-row-sub">
                      <span>{fmtTanggalShort(row.tanggal)}</span>
                      {row.sub && <><span style={{ opacity: 0.4 }}>·</span><span>{row.sub}</span></>}
                      <span style={{ padding: '1px 7px', borderRadius: 99, background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10 }}>{cfg.label}</span>
                    </div>
                  </div>
                  <div className="trx-row-amount" style={{ color: cfg.color }}>
                    {row.tipe === 'income' ? '+' : row.tipe === 'expense' ? '−' : ''}{fmt(row.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════ TAB: PENGELUARAN ══════════════ */}
        {tab === 'expense' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('tanggal')} style={{ cursor: 'pointer' }}>Tanggal {sortKey === 'tanggal' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th>Toko / Uraian</th>
                    <th>Kategori</th>
                    <th>Metode</th>
                    <th>Bank</th>
                    <th>User</th>
                    <th onClick={() => toggleSort('nilai')} style={{ cursor: 'pointer', textAlign: 'right' }}>Nilai {sortKey === 'nilai' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.length === 0 ? (
                    <tr><td colSpan={8}><div className="empty-state"><div className="emoji">🔍</div><p>Tidak ada data</p></div></td></tr>
                  ) : expenseRows.map(r => (
                    <tr key={r.id} style={r._isAnom ? { background: 'rgba(244,63,94,0.04)' } : {}}>
                      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        <div style={{
                          display: 'inline-flex', flexDirection: 'column', gap: 2,
                          padding: r._telat ? '4px 8px' : 0, borderRadius: r._telat ? 8 : 0,
                          background: r._telat ? 'var(--yellow-bg)' : 'transparent',
                          border: r._telat ? '1px solid rgba(180,83,9,0.2)' : 'none',
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: r._telat ? 'var(--yellow)' : 'var(--text2)' }}>{fmtTanggalShort(r.tanggal)}</div>
                          {r._telat ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--yellow)', opacity: 0.85 }}>
                              <Clock size={9} /> dicatat {r._jam} WIB
                            </div>
                          ) : r._jam ? (
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r._jam} WIB</div>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {r.toko || '—'}
                          {r._isAnom && <AlertTriangle size={12} style={{ color: 'var(--red)', flexShrink: 0 }} />}
                          {r.edited_at && <Pencil size={10} style={{ color: 'var(--yellow)', flexShrink: 0 }} />}
                        </div>
                        {r.uraian && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.uraian}</div>}
                      </td>
                      <td>
                        <span className="badge" style={{ background: `${r._color}22`, color: r._color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <KategoriIcon kategori={r.kategori} size={12} color={r._color} />{r.kategori}
                        </span>
                      </td>
                      <td><span className="badge badge-gray">{r.transaksi || '—'}</span></td>
                      <td><span className="badge badge-blue">{r.bank || '—'}</span></td>
                      <td><span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span></td>
                      <td className="amount" style={{ color: r._isAnom ? 'var(--orange)' : 'var(--red)' }}>{fmt(r.nilai)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button className="edit-btn" onClick={() => { setEditData(r); setEditType('expense') }} aria-label="Edit transaksi" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button
                            className="edit-btn"
                            onClick={() => handleDeleteExpense(r.id)}
                            disabled={deletingId === r.id}
                            aria-label="Hapus transaksi (perlu biometrik)"
                            title="Hapus (perlu biometrik)"
                            style={{ color: deletingId === r.id ? 'var(--text3)' : 'var(--red)', opacity: deletingId === r.id ? 0.5 : 1 }}
                          >
                            {deletingId === r.id ? <ShieldCheck size={13} style={{ animation: 'pulse 0.8s ease-in-out infinite' }} /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════ TAB: PEMASUKAN ══════════════ */}
        {tab === 'income' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('tanggal')} style={{ cursor: 'pointer' }}>Tgl {sortKey === 'tanggal' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th>Sumber / Ket.</th>
                    <th>Metode</th>
                    <th>Bank</th>
                    <th>User</th>
                    <th onClick={() => toggleSort('jumlah')} style={{ cursor: 'pointer', textAlign: 'right' }}>Jumlah {sortKey === 'jumlah' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {incomeRows.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="emoji">💰</div><p>Belum ada data</p></div></td></tr>
                  ) : incomeRows.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text3)' }}>{fmtTanggalShort(r.tanggal)}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {r.sumber || '—'}
                          {r.edited_at && <Pencil size={10} style={{ color: 'var(--yellow)' }} />}
                        </div>
                        {r.items && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.items}</div>}
                      </td>
                      <td><span className="badge badge-gray">{r.metode || '—'}</span></td>
                      <td><span className="badge badge-blue">{r.bank || '—'}</span></td>
                      <td><span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span></td>
                      <td className="amount" style={{ color: 'var(--green)' }}>{fmt(r.jumlah)}</td>
                      <td>
                        <button className="edit-btn" onClick={() => { setEditData(r); setEditType('income') }} aria-label="Edit pemasukan" title="Edit">
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════ TAB: TARIK TUNAI ══════════════ */}
        {tab === 'cash' && (
          <div>
            {cashRows.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="emoji">🏧</div><p>Belum ada catatan tarik tunai</p></div></div>
            ) : cashRows.map(r => (
              <div key={r.id} className="trx-row is-tappable" onClick={() => { setEditData(r); setEditType('cash') }} role="button" tabIndex={0}>
                <div className="trx-row-icon" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow)' }}><Landmark size={17} /></div>
                <div className="trx-row-info">
                  <div className="trx-row-label">{r.transaksi || 'Tarik Tunai'}</div>
                  <div className="trx-row-sub">
                    <span>{fmtTanggalShort(r.tanggal)}</span>
                    {r.bank && <><span style={{ opacity: 0.4 }}>·</span><span>{r.bank}</span></>}
                    {r.alamat && <><span style={{ opacity: 0.4 }}>·</span><span>{r.alamat}</span></>}
                    <span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="trx-row-amount" style={{ color: 'var(--yellow)' }}>{fmt(r.nilai)}</div>
                  <button
                    className="edit-btn"
                    onClick={e => { e.stopPropagation(); handleDeleteCash(r.id) }}
                    disabled={deletingId === r.id}
                    aria-label="Hapus catatan tarik tunai"
                    title="Hapus"
                    style={{ color: 'var(--red)', opacity: deletingId === r.id ? 0.5 : 1 }}
                  >
                    {deletingId === r.id ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            ))}
            <Link href="/cashrecord" className="trx-cta no-underline">
              Kelola lengkap tarik tunai &amp; saldo cash <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        {/* ══════════════ TAB: TRANSFER ══════════════ */}
        {tab === 'transfer' && (
          <div>
            {transferRows.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="emoji">🔁</div><p>Belum ada transfer antar rekening</p></div></div>
            ) : transferRows.map(r => (
              <div key={r.id} className="trx-row">
                <div className="trx-row-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><ArrowLeftRight size={17} /></div>
                <div className="trx-row-info">
                  <div className="trx-row-label">{getUserName(r.from_user)} → {getUserName(r.to_user)}</div>
                  <div className="trx-row-sub">
                    <span>{fmtTanggalShort(r.tanggal)}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{r.from_bank || '-'} → {r.to_bank || '-'}</span>
                    {r.catatan && <><span style={{ opacity: 0.4 }}>·</span><span>{r.catatan}</span></>}
                  </div>
                </div>
                <div className="trx-row-amount" style={{ color: 'var(--accent)' }}>{fmt(r.jumlah)}</div>
              </div>
            ))}
            <Link href="/wallet" className="trx-cta no-underline">
              Kelola transfer &amp; rekening di Wallet <ArrowUpRight size={13} />
            </Link>
          </div>
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
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }

        .trx-typegrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px; }
        @media (min-width: 480px) { .trx-typegrid { grid-template-columns: repeat(4, 1fr); } }

        .trx-tile {
          display: flex; flex-direction: column; gap: 6px; text-align: left;
          padding: 14px; border-radius: 16px; border: 1px solid var(--border);
          background: var(--surface); cursor: pointer; font-family: inherit;
          transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        .trx-tile:active { transform: scale(0.97); }
        .trx-tile.is-active { border-color: var(--tile-color); background: var(--tile-bg); }
        .trx-tile-top { display: flex; align-items: center; justify-content: space-between; }
        .trx-tile-icon { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: var(--tile-bg); color: var(--tile-color); flex-shrink: 0; }
        .trx-tile-count { font-size: 10px; font-weight: 700; color: var(--text3); }
        .trx-tile.is-active .trx-tile-count { color: var(--tile-color); }
        .trx-tile-label { font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.4px; }
        .trx-tile-value { font-size: 15px; font-weight: 800; color: var(--text1); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .trx-tile.is-active .trx-tile-value { color: var(--tile-color); }

        .trx-hero { grid-column: 1 / -1; }
        .trx-hero-value { font-size: 26px; }
        .trx-hero-sub { display: flex; gap: 12px; font-size: 11px; font-weight: 700; margin-top: 2px; }

        .trx-row {
          display: flex; align-items: center; gap: 12px; padding: 12px;
          border-radius: 14px; border: 1px solid var(--border); background: var(--surface);
          margin-bottom: 8px; transition: transform 0.12s ease;
        }
        .trx-row.is-tappable { cursor: pointer; }
        .trx-row.is-tappable:active { transform: scale(0.98); }
        .trx-row-icon { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .trx-row-info { flex: 1; min-width: 0; }
        .trx-row-label { font-size: 13px; font-weight: 700; color: var(--text1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .trx-row-sub { font-size: 11px; color: var(--text3); margin-top: 3px; display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
        .trx-row-amount { font-size: 13px; font-weight: 800; flex-shrink: 0; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

        .trx-cta {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 12px; margin-top: 4px; border-radius: 12px; border: 1px dashed var(--border);
          color: var(--accent); font-size: 12px; font-weight: 700; transition: background 0.15s ease;
        }
        .trx-cta:hover { background: var(--surface2); }

        @media (prefers-reduced-motion: reduce) {
          .trx-tile, .trx-row, .trx-cta { transition: none; }
        }
      `}</style>
    </>
  )
}
