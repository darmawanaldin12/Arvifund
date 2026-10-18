'use client'
import { useState, useEffect } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { supabase } from '../../lib/supabase'
import { insertTransfer } from '../../lib/data'
import { BULAN_ORDER } from '../../lib/utils'
import { normalizeKategori, getBudgetStatus } from '../../lib/kategori'
import { parseRupiahToInt } from '../../hooks/useAmountInput'
import TabTransition from '../../components/TabTransition'
import SuccessSheet from '../../components/input/SuccessSheet'
import TransferConfirmPopup from '../../components/input/TransferConfirmPopup'
import { useAIExtract } from '../../components/input/useAIExtract'
import AIInputTab from '../../components/input/AIInputTab'
import ManualInputTab from '../../components/input/ManualInputTab'
import ConfirmPopup from '../../components/input/ConfirmPopup'
import LoadingOverlay from '../../components/input/LoadingOverlay'
import { Sparkles, PenLine } from 'lucide-react'

const TAB_ORDER = { ai: 0, manual: 1 }

// ── Validasi tanggal transaksi (format YYYY-MM-DD, zona WIB) ──
function isValidDate(t) {
  return /^\d{4}-\d{2}-\d{2}$/.test(t || '') && !isNaN(Date.parse(t + 'T00:00:00Z'))
}
// Selisih hari: positif = tanggal t di masa lalu, negatif = di masa depan
function daysAgo(t, today) {
  return Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(t + 'T00:00:00Z')) / 86400000)
}
// Tanggal hasil baca AI yang tak wajar (mis. tahun struk salah baca → 2018) diganti hari ini
function fixTanggal(t, today) {
  if (!isValidDate(t)) return { tanggal: today, original: t || '(kosong)' }
  const d = daysAgo(t, today)
  if (d < -1 || d > 45) return { tanggal: today, original: t }
  return { tanggal: t, original: null }
}
// Pesan error kalau tanggal tidak boleh disimpan, atau null kalau aman
function checkTanggal(t, today) {
  if (!isValidDate(t)) return 'Tanggal tidak valid'
  if (daysAgo(t, today) < -1) return 'Tanggal tidak boleh di masa depan'
  return null
}
// Tanggal lebih dari 90 hari lalu: minta konfirmasi karena tidak akan muncul di periode berjalan
function confirmOldDate(t, today) {
  const d = daysAgo(t, today)
  if (d <= 90) return true
  return window.confirm(`Tanggal transaksi ${t} sudah ${d} hari yang lalu, jadi tidak akan muncul di periode berjalan. Tetap simpan dengan tanggal itu?`)
}

export default function InputPage() {
  const { user, profiles, loadData, expenses, budgetPlans, payPeriodDate, overrides } = useData()
  const [mode, setMode]         = useState('ai')
  const [prevMode, setPrevMode] = useState('ai')
  const [tipe, setTipe]         = useState('expense')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(null) // info untuk layar "Transaksi Berhasil Disimpan"
  const [showConfirm, setShowConfirm]               = useState(false)
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)
  const [parsedResult, setParsedResult]             = useState(null)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const [form, setForm] = useState({
    tanggal: today, toko: '', uraian: '', total: '',
    kategori: '', metode: 'Cash', bank: 'BCA', user_id: '',
  })
  useEffect(() => { if (user?.id) setForm(f => ({ ...f, user_id: user.id })) }, [user])
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function getBulan(tgl) { if (!tgl) return ''; return BULAN_ORDER[new Date(tgl + 'T00:00:00').getMonth()] }

  function handleModeChange(newMode) { setPrevMode(mode); setMode(newMode) }
  const tabDirection = TAB_ORDER[mode] > TAB_ORDER[prevMode] ? 'left' : 'right'

  // info: { tipe, amount, toko, uraian, kategori, tanggal, budget } — budget = sisa budget kategori (pengeluaran)
  function showSuccess(info) { setSuccess(info) }

  const ai = useAIExtract({
    user, profiles, today,
    onModeChange: handleModeChange,
    // Kategori hasil AI disamakan dengan kategori Budget Plan, tanggal yang tak wajar diganti hari ini
    onResult: (result) => {
      const fx   = fixTanggal(result?.tanggal, today)
      const base = (result?.tipe || 'expense') === 'expense'
        ? { ...result, kategori: normalizeKategori(result.kategori) }
        : result
      setParsedResult({ ...base, tanggal: fx.tanggal, tanggalDikoreksi: fx.original })
      setShowConfirm(true)
    },
    onTransferResult: (result) => {
      const fx = fixTanggal(result?.tanggal, today)
      setParsedResult({ ...result, tanggal: fx.tanggal, tanggalDikoreksi: fx.original })
      setShowTransferConfirm(true)
    },
  })

  async function handleConfirmSave() {
    setError('')
    if (!parsedResult.total || isNaN(parseFloat(parsedResult.total))) { setError('Total harus diisi'); return }
    if (!parsedResult.user_id) { setError('User harus dipilih'); return }
    const tErr = checkTanggal(parsedResult.tanggal, today)
    if (tErr) { setError(tErr); return }
    if (!confirmOldDate(parsedResult.tanggal, today)) return
    setSaving(true)
    try {
      const bulan = getBulan(parsedResult.tanggal); const nilai = parseFloat(parsedResult.total); const t = parsedResult.tipe || 'expense'
      // Hitung sisa budget SEBELUM simpan (data context belum memuat transaksi baru ini)
      const budget = t === 'expense'
        ? getBudgetStatus({ kategori: parsedResult.kategori, tanggal: parsedResult.tanggal, nilai, expenses, budgetPlans, payPeriodDate, overrides })
        : null
      if (t === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{ toko: parsedResult.toko, tanggal: parsedResult.tanggal, bulan, transaksi: parsedResult.metode || 'Cash', uraian: parsedResult.uraian, kategori: normalizeKategori(parsedResult.kategori), bank: parsedResult.bank || 'Cash', nilai, user_id: parsedResult.user_id }])
        if (err) throw err
      } else if (t === 'income') {
        const { error: err } = await supabase.from('income').insert([{ sumber: parsedResult.toko, tanggal: parsedResult.tanggal, bulan, jumlah: nilai, metode: parsedResult.metode || 'Cash', items: parsedResult.uraian, bank: parsedResult.bank || 'Cash', kategori: 'Pemasukan', user_id: parsedResult.user_id }])
        if (err) throw err
      } else if (t === 'cash') {
        // Tarik tunai: bank = bank ASAL (bukan 'Cash')
        // buildBankBalances akan otomatis kurangi bank asal dan tambah Cash
        const bankAsal = parsedResult.bank && parsedResult.bank !== 'Cash' ? parsedResult.bank : 'BCA'
        const { error: err } = await supabase.from('cash_records').insert([{ tanggal: parsedResult.tanggal, bulan, transaksi: parsedResult.uraian || 'Tarik Tunai', kategori: 'Pengeluaran', bank: bankAsal, nilai, alamat: parsedResult.toko, metode: 'Cash', user_id: parsedResult.user_id }])
        if (err) throw err
      }
      await loadData(); setShowConfirm(false)
      ai.resetAI(); ai.clearPendingShareImage()
      showSuccess({
        tipe: t, amount: nilai, toko: parsedResult.toko, uraian: parsedResult.uraian,
        kategori: t === 'expense' ? normalizeKategori(parsedResult.kategori) : null,
        tanggal: parsedResult.tanggal, budget,
      })
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleSaveTransfer(formData) {
    setError('')
    if (!formData.from_user) return setError('Pilih pengirim')
    if (!formData.to_user)   return setError('Pilih penerima')
    if (!formData.from_bank) return setError('Pilih rekening asal')
    if (!formData.to_bank)   return setError('Pilih rekening tujuan')
    if (formData.from_user === formData.to_user && formData.from_bank === formData.to_bank)
      return setError('Rekening asal dan tujuan tidak boleh sama')
    if (!formData.jumlah || isNaN(parseFloat(formData.jumlah)) || parseFloat(formData.jumlah) <= 0)
      return setError('Jumlah harus lebih dari 0')
    const tErr = checkTanggal(formData.tanggal, today)
    if (tErr) return setError(tErr)
    if (!confirmOldDate(formData.tanggal, today)) return
    setSaving(true)
    try {
      await insertTransfer({
        tanggal: formData.tanggal, from_user: formData.from_user, to_user: formData.to_user,
        from_bank: formData.from_bank, to_bank: formData.to_bank,
        jumlah: parseFloat(formData.jumlah), catatan: formData.catatan || null,
      }, user?.id)
      await loadData(); setShowTransferConfirm(false)
      ai.resetAI(); ai.clearPendingShareImage()
      showSuccess({
        tipe: 'transfer', amount: parseFloat(formData.jumlah), toko: '', uraian: formData.catatan || '',
        kategori: null, tanggal: formData.tanggal, budget: null,
      })
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleManualSubmit(e) {
    e.preventDefault(); setError('')
    if (!form.total || isNaN(parseFloat(form.total))) { setError('Total harus diisi'); return }
    if (!form.user_id) { setError('User harus dipilih'); return }
    const tErr = checkTanggal(form.tanggal, today)
    if (tErr) { setError(tErr); return }
    if (!confirmOldDate(form.tanggal, today)) return
    setSaving(true)
    try {
      const bulan = getBulan(form.tanggal); const nilai = parseFloat(form.total)
      // Hitung sisa budget SEBELUM simpan (data context belum memuat transaksi baru ini)
      const budget = tipe === 'expense'
        ? getBudgetStatus({ kategori: form.kategori, tanggal: form.tanggal, nilai, expenses, budgetPlans, payPeriodDate, overrides })
        : null
      if (tipe === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{ toko: form.toko, tanggal: form.tanggal, bulan, transaksi: form.metode, uraian: form.uraian, kategori: normalizeKategori(form.kategori), bank: form.bank, nilai, user_id: form.user_id }])
        if (err) throw err
      } else if (tipe === 'income') {
        const { error: err } = await supabase.from('income').insert([{ sumber: form.toko, tanggal: form.tanggal, bulan, jumlah: nilai, metode: form.metode, items: form.uraian, bank: form.bank, kategori: 'Pemasukan', user_id: form.user_id }])
        if (err) throw err
      } else if (tipe === 'cash') {
        // Tarik tunai: bank = bank ASAL yang dipilih user (bukan 'Cash')
        // buildBankBalances akan otomatis kurangi bank asal dan tambah Cash
        const { error: err } = await supabase.from('cash_records').insert([{ tanggal: form.tanggal, bulan, transaksi: form.uraian || 'Tarik Tunai', kategori: 'Pengeluaran', bank: form.bank, nilai, alamat: form.toko, metode: 'Cash', user_id: form.user_id }])
        if (err) throw err
      }
      // Ambil data untuk layar sukses SEBELUM form direset
      const info = {
        tipe, amount: nilai, toko: form.toko, uraian: form.uraian,
        kategori: tipe === 'expense' ? normalizeKategori(form.kategori) : null,
        tanggal: form.tanggal, budget,
      }
      await loadData()
      setForm({ tanggal: today, toko: '', uraian: '', total: '', kategori: '', metode: 'Cash', bank: 'BCA', user_id: user?.id || '' })
      showSuccess(info)
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  // Pilihan metode input: AI (scan struk) atau manual
  const tabBarS = {
    tabBar: { display: 'flex', gap: 8, marginBottom: 16 },
    tabBtn: (active) => ({
      flex: 1, height: 46, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      border: active ? 'none' : '1px solid var(--border)',
      background: active ? 'var(--accent)' : 'var(--surface2)',
      color: active ? '#fff' : 'var(--text2)',
      fontWeight: 700, fontSize: 13, transition: 'all 0.2s', touchAction: 'manipulation',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      boxShadow: active ? '0 2px 8px rgba(0,61,155,0.25)' : 'none',
    }),
  }

  return (
    <>
      {ai.aiLoading && !showConfirm && !showTransferConfirm && (
        <LoadingOverlay imagePreview={ai.imagePreview} progress={ai.extractProgress} />
      )}

      {showConfirm && parsedResult && (
        <ConfirmPopup
          parsedResult={parsedResult}
          setParsedResult={setParsedResult}
          profiles={profiles}
          saving={saving}
          error={error}
          onSave={handleConfirmSave}
          onCancel={() => setShowConfirm(false)}
          onEditManual={() => {
            setTipe(parsedResult.tipe || 'expense')
            setForm({
              tanggal: parsedResult.tanggal || today,
              toko: parsedResult.toko || '', uraian: parsedResult.uraian || '',
              total: parsedResult.total ? String(parsedResult.total) : '',
              kategori: parsedResult.kategori || '', metode: parsedResult.metode || 'Cash',
              bank: parsedResult.bank || 'BCA', user_id: parsedResult.user_id || user?.id || '',
            })
            setShowConfirm(false); handleModeChange('manual')
          }}
        />
      )}

      {showTransferConfirm && parsedResult && (
        <TransferConfirmPopup
          result={parsedResult} profiles={profiles || []}
          onSave={handleSaveTransfer} onCancel={() => setShowTransferConfirm(false)}
          saving={saving} error={error}
        />
      )}

      <SuccessSheet info={success} onClose={() => setSuccess(null)} />
      <AppHeader title="Input Transaksi" />

      <div className="page-container" style={{ maxWidth: 560 }}>
        {/* Judul halaman */}
        <div style={{ margin: '4px 2px 18px' }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--text1)' }}>
            Catat Transaksi<br />Kelola Keuanganmu
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
            Pilih metode input yang paling nyaman untuk kamu, dengan cepat dan mudah.
          </p>
        </div>

        <div style={tabBarS.tabBar} role="tablist" aria-label="Metode input">
          {[{ id: 'ai', label: 'AI (Scan Struk)', Icon: Sparkles }, { id: 'manual', label: 'Manual', Icon: PenLine }].map(m => (
            <button key={m.id} type="button" role="tab" aria-selected={mode === m.id}
              onClick={() => handleModeChange(m.id)} style={tabBarS.tabBtn(mode === m.id)}>
              <m.Icon size={15} />{m.label}
            </button>
          ))}
        </div>

        <div style={{ overflow: 'hidden' }}>
          <TabTransition tabKey={mode} direction={tabDirection}>
            {mode === 'ai' && (
              <AIInputTab
                {...ai}
                onClearImage={() => { ai.setImageFile(null); ai.imageFileRef.current = null; ai.setImagePreview(''); ai.clearPendingShareImage() }}
              />
            )}
            {mode === 'manual' && (
              <ManualInputTab
                tipe={tipe} setTipe={setTipe}
                form={form} setF={setF}
                profiles={profiles}
                saving={saving} error={error}
                onSubmit={handleManualSubmit}
              />
            )}
          </TabTransition>
        </div>
      </div>

      <style>{`
        @keyframes spin          { to { transform: rotate(360deg); } }
        @keyframes scanLineMove  { 0% { top: 0%; } 50% { top: calc(100% - 3px); } 100% { top: 0%; } }
        @keyframes dotPulse      { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.2); opacity: 1; } }
        @keyframes progressSlide { 0% { width: 0%; } 60% { width: 80%; } 100% { width: 95%; } }
        @keyframes pulse-record  { 0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); } 70% { box-shadow: 0 0 0 8px rgba(244,63,94,0); } 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0); } }
        @keyframes toastIn       { from { opacity: 0; transform: translate(-50%, -12px) scale(0.94); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </>
  )
}
