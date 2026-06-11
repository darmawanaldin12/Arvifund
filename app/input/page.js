'use client'
import { useState, useEffect, useRef } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { supabase } from '../../lib/supabase'
import { insertTransfer } from '../../lib/data'
import { BULAN_ORDER } from '../../lib/utils'
import { parseRupiahToInt } from '../../hooks/useAmountInput'
import TabTransition from '../../components/TabTransition'
import { SavedToast } from '../../components/input/BottomSheet'
import TransferConfirmPopup from '../../components/input/TransferConfirmPopup'
import { useAIExtract } from '../../components/input/useAIExtract'
import AIInputTab from '../../components/input/AIInputTab'
import ManualInputTab from '../../components/input/ManualInputTab'
import ConfirmPopup from '../../components/input/ConfirmPopup'
import LoadingOverlay from '../../components/input/LoadingOverlay'
import { Sparkles, PenLine } from 'lucide-react'

const TAB_ORDER = { ai: 0, manual: 1 }

export default function InputPage() {
  const { user, profiles, loadData } = useData()
  const [mode, setMode]         = useState('ai')
  const [prevMode, setPrevMode] = useState('ai')
  const [tipe, setTipe]         = useState('expense')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [toast, setToast]       = useState({ show: false, tipe: 'expense', amount: null })
  const [showConfirm, setShowConfirm]               = useState(false)
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)
  const [parsedResult, setParsedResult]             = useState(null)
  const toastTimer = useRef(null)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const [form, setForm] = useState({
    tanggal: today, toko: '', uraian: '', total: '',
    kategori: '', metode: 'Cash', bank: 'Cash', user_id: '',
  })
  useEffect(() => { if (user?.id) setForm(f => ({ ...f, user_id: user.id })) }, [user])
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function getBulan(tgl) { if (!tgl) return ''; return BULAN_ORDER[new Date(tgl + 'T00:00:00').getMonth()] }

  function handleModeChange(newMode) { setPrevMode(mode); setMode(newMode) }
  const tabDirection = TAB_ORDER[mode] > TAB_ORDER[prevMode] ? 'left' : 'right'

  function showToast(tipeVal, amount) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ show: true, tipe: tipeVal, amount })
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800)
  }

  const ai = useAIExtract({
    user, profiles, today,
    onModeChange: handleModeChange,
    onResult: (result) => { setParsedResult(result); setShowConfirm(true) },
    onTransferResult: (result) => { setParsedResult(result); setShowTransferConfirm(true) },
  })

  async function handleConfirmSave() {
    setError('')
    if (!parsedResult.total || isNaN(parseFloat(parsedResult.total))) { setError('Total harus diisi'); return }
    if (!parsedResult.user_id) { setError('User harus dipilih'); return }
    setSaving(true)
    try {
      const bulan = getBulan(parsedResult.tanggal); const nilai = parseFloat(parsedResult.total); const t = parsedResult.tipe || 'expense'
      if (t === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{ toko: parsedResult.toko, tanggal: parsedResult.tanggal, bulan, transaksi: parsedResult.metode || 'Cash', uraian: parsedResult.uraian, kategori: parsedResult.kategori || 'Lainnya', bank: parsedResult.bank || 'Cash', nilai, user_id: parsedResult.user_id }])
        if (err) throw err
      } else if (t === 'income') {
        const { error: err } = await supabase.from('income').insert([{ sumber: parsedResult.toko, tanggal: parsedResult.tanggal, bulan, jumlah: nilai, metode: parsedResult.metode || 'Cash', items: parsedResult.uraian, bank: parsedResult.bank || 'Cash', kategori: 'Pemasukan', user_id: parsedResult.user_id }])
        if (err) throw err
      } else if (t === 'cash') {
        const { error: err } = await supabase.from('cash_records').insert([{ tanggal: parsedResult.tanggal, bulan, transaksi: parsedResult.uraian || 'Tarik Tunai', kategori: 'Pengeluaran', bank: parsedResult.bank || 'Cash', nilai, alamat: parsedResult.toko, metode: 'Cash', user_id: parsedResult.user_id }])
        if (err) throw err
      }
      await loadData(); setShowConfirm(false)
      ai.resetAI(); showToast(t, nilai)
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
    setSaving(true)
    try {
      await insertTransfer({
        tanggal: formData.tanggal, from_user: formData.from_user, to_user: formData.to_user,
        from_bank: formData.from_bank, to_bank: formData.to_bank,
        jumlah: parseFloat(formData.jumlah), catatan: formData.catatan || null,
      }, user?.id)
      await loadData(); setShowTransferConfirm(false)
      ai.resetAI(); showToast('transfer', parseFloat(formData.jumlah))
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleManualSubmit(e) {
    e.preventDefault(); setError('')
    if (!form.total || isNaN(parseFloat(form.total))) { setError('Total harus diisi'); return }
    if (!form.user_id) { setError('User harus dipilih'); return }
    setSaving(true)
    try {
      const bulan = getBulan(form.tanggal); const nilai = parseFloat(form.total)
      if (tipe === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{ toko: form.toko, tanggal: form.tanggal, bulan, transaksi: form.metode, uraian: form.uraian, kategori: form.kategori || 'Lainnya', bank: form.bank, nilai, user_id: form.user_id }])
        if (err) throw err
      } else if (tipe === 'income') {
        const { error: err } = await supabase.from('income').insert([{ sumber: form.toko, tanggal: form.tanggal, bulan, jumlah: nilai, metode: form.metode, items: form.uraian, bank: form.bank, kategori: 'Pemasukan', user_id: form.user_id }])
        if (err) throw err
      } else if (tipe === 'cash') {
        const { error: err } = await supabase.from('cash_records').insert([{ tanggal: form.tanggal, bulan, transaksi: form.uraian || 'Tarik Tunai', kategori: 'Pengeluaran', bank: form.bank, nilai, alamat: form.toko, metode: 'Cash', user_id: form.user_id }])
        if (err) throw err
      }
      await loadData()
      setForm({ tanggal: today, toko: '', uraian: '', total: '', kategori: '', metode: 'Cash', bank: 'Cash', user_id: user?.id || '' })
      showToast(tipe, nilai)
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  const tabBarS = {
    tabBar: { display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 },
    tabBtn: (active) => ({
      flex: 1, padding: '11px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'white' : 'var(--text3)',
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
              bank: parsedResult.bank || 'Cash', user_id: parsedResult.user_id || user?.id || '',
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

      <SavedToast show={toast.show} tipe={toast.tipe} amount={toast.amount} />
      <AppHeader title="Input Transaksi" />

      <div className="page-container" style={{ maxWidth: 560 }}>
        <div style={tabBarS.tabBar}>
          {[{ id: 'ai', label: 'Input AI', Icon: Sparkles }, { id: 'manual', label: 'Manual', Icon: PenLine }].map(m => (
            <button key={m.id} type="button" onClick={() => handleModeChange(m.id)} style={tabBarS.tabBtn(mode === m.id)}>
              <m.Icon size={15} />{m.label}
            </button>
          ))}
        </div>

        <div style={{ overflow: 'hidden' }}>
          <TabTransition tabKey={mode} direction={tabDirection}>
            {mode === 'ai' && (
              <AIInputTab
                {...ai}
                onClearImage={() => { ai.setImageFile(null); ai.imageFileRef.current = null; ai.setImagePreview('') }}
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
