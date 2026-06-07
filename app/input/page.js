'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { supabase } from '../../lib/supabase'
import { insertTransfer } from '../../lib/data'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'
import { buildSystemPrompt } from '../../lib/ai-prompt'
import { useAmountInput } from '../../hooks/useAmountInput'
import TabTransition from '../../components/TabTransition'
import BottomSheet, { SavedToast } from '../../components/input/BottomSheet'
import TransferConfirmPopup from '../../components/input/TransferConfirmPopup'
import {
  TrendingDown, TrendingUp, Landmark, Bot, PenLine,
  Mic, MicOff, Camera, Image, Trash2, X, Check,
  Share2, ArrowLeftRight,
} from 'lucide-react'

function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

const TIPE_LIST = [
  { id: 'expense',  label: 'Pengeluaran', color: 'var(--red)',    Icon: TrendingDown },
  { id: 'income',   label: 'Pemasukan',   color: 'var(--green)',  Icon: TrendingUp },
  { id: 'cash',     label: 'Tarik Tunai', color: 'var(--yellow)', Icon: Landmark },
]

const SHARE_CACHE_NAME = 'arvifund-share-images-v4'
const SHARE_CACHE_KEY  = '/share-image-pending'

// ── Main ───────────────────────────────────────────────────────────────────
export default function InputPage() {
  const { user, profiles, loadData } = useData()
  const [mode, setMode]     = useState('ai')
  const [prevMode, setPrevMode] = useState('ai')
  const [tipe, setTipe]     = useState('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [sharedFromApp, setSharedFromApp] = useState(false)
  const [toast, setToast]   = useState({ show: false, tipe: 'expense', amount: null })
  const toastTimer          = useRef(null)

  const [aiText, setAiText]             = useState('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)
  const [parsedResult, setParsedResult] = useState(null)
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isRecording, setIsRecording]   = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(true)
  const [iosDevice, setIosDevice]       = useState(false)

  const aiTextRef        = useRef('')
  const imageFileRef     = useRef(null)
  const recognitionRef   = useRef(null)
  const autoExtractTimer = useRef(null)
  const safetyTimer      = useRef(null)

  useEffect(() => { aiTextRef.current = aiText }, [aiText])
  useEffect(() => { imageFileRef.current = imageFile }, [imageFile])

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const [form, setForm] = useState({
    tanggal: today, toko: '', uraian: '', total: '',
    kategori: '', metode: 'Cash', bank: 'Cash', user_id: '',
  })

  useEffect(() => { if (user?.id) setForm(f => ({ ...f, user_id: user.id })) }, [user])
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function getBulan(tgl) { if (!tgl) return ''; return BULAN_ORDER[new Date(tgl + 'T00:00:00').getMonth()] }

  const manualAmt  = useAmountInput(form.total, v => setF('total', v))
  const confirmAmt = useAmountInput(
    parsedResult?.total ?? '',
    v => setParsedResult(p => ({ ...p, total: v }))
  )

  const TAB_ORDER = { ai: 0, manual: 1 }
  function handleModeChange(newMode) { setPrevMode(mode); setMode(newMode) }
  const tabDirection = TAB_ORDER[mode] > TAB_ORDER[prevMode] ? 'left' : 'right'

  function showToast(tipeVal, amount) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ show: true, tipe: tipeVal, amount })
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800)
  }

  // ── Web Share Target ──
  useEffect(() => {
    async function handleShareTarget() {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const isShared = params.get('shared') === '1'
      if (isShared) {
        window.history.replaceState({}, '', '/input')
        try {
          const cache = await caches.open(SHARE_CACHE_NAME)
          const cached = await cache.match(SHARE_CACHE_KEY)
          if (cached) {
            const { dataUrl, timestamp } = await cached.json()
            await cache.delete(SHARE_CACHE_KEY)
            if (Date.now() - timestamp > 5 * 60 * 1000) return
            if (dataUrl && dataUrl.startsWith('data:')) {
              const res = await fetch(dataUrl)
              const blob = await res.blob()
              const file = new File([blob], 'shared-image.jpg', { type: blob.type || 'image/jpeg' })
              setSharedFromApp(true); handleModeChange('ai')
              handleImageFile(file); return
            }
          }
        } catch (err) { console.error('[Share] Gagal baca cache:', err) }
      }
      const sharedText = params.get('text') || params.get('title') || ''
      const sharedUrl  = params.get('url')  || ''
      if (sharedText || sharedUrl) {
        setSharedFromApp(true); handleModeChange('ai')
        const combined = [sharedText, sharedUrl].filter(Boolean).join(' ').trim()
        setAiText(combined); aiTextRef.current = combined
        window.history.replaceState({}, '', '/input')
        setTimeout(() => { if (combined.trim()) handleAIExtractRef.current(null, combined) }, 500)
      }
    }
    handleShareTarget()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── AI Extract ──
  const handleAIExtract = useCallback(async (fileOverride = null, textOverride = null) => {
    const activeFile = fileOverride instanceof Blob ? fileOverride : imageFileRef.current
    const activeText = typeof textOverride === 'string' ? textOverride : aiTextRef.current
    if (!activeText.trim() && !activeFile) return
    setAiLoading(true); setError('')
    try {
      // System prompt diambil dari lib/ai-prompt.js — edit di sana untuk hemat token
      const systemInstruction = buildSystemPrompt(profiles, today, user)

      const parts = activeFile
        ? [{ inlineData: { mimeType: activeFile.type, data: await fileToBase64(activeFile) } }, { text: `${systemInstruction}\n\nEkstrak dari struk. Catatan: "${activeText}"` }]
        : [{ text: `${systemInstruction}\n\nKalimat: "${activeText}"` }]

      const res = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`) }
      const resData = await res.json()
      const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResult) throw new Error('Gagal mendapatkan respon dari AI')
      const result = JSON.parse(textResult)

      if (result.tipe === 'transfer') {
        const transferData = { ...result, tanggal: result.tanggal || today, jumlah: result.jumlah ? String(result.jumlah) : '', catatan: result.catatan || '' }
        setParsedResult(transferData)
        setShowTransferConfirm(true)
      } else {
        const aiLower = activeText.trim().toLowerCase()
        let matchedProfile = null
        if (!result.user_id) {
          if (aiLower.startsWith('a ') || aiLower === 'a' || aiLower.startsWith('a:'))
            matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('al'))
          else if (aiLower.startsWith('s ') || aiLower === 's' || aiLower.startsWith('s:'))
            matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('sol'))
          else
            matchedProfile = profiles?.find(p => { const u = p.username?.toLowerCase(); return u && aiLower.includes(u) })
        }
        setParsedResult({
          tipe: result.tipe || 'expense', tanggal: result.tanggal || today,
          toko: result.toko || '', uraian: result.uraian || '',
          total: result.total ? String(result.total) : '',
          kategori: result.kategori || '', metode: result.metode || 'Cash',
          bank: result.bank || 'Cash',
          user_id: result.user_id || matchedProfile?.id || user?.id || '',
        })
        setShowConfirm(true)
      }
    } catch (err) {
      setError('AI Gagal: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }, [profiles, today, user])

  const handleAIExtractRef = useRef(handleAIExtract)
  useEffect(() => { handleAIExtractRef.current = handleAIExtract }, [handleAIExtract])

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
      await loadData()
      setShowTransferConfirm(false)
      setAiText(''); setImageFile(null); setImagePreview('')
      aiTextRef.current = ''; imageFileRef.current = null
      showToast('transfer', parseFloat(formData.jumlah))
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  // ── Speech Recognition ──────────────────────────────────────────────────
  function clearRecordingTimers() {
    if (autoExtractTimer.current) clearTimeout(autoExtractTimer.current)
    if (safetyTimer.current)      clearTimeout(safetyTimer.current)
  }

  function triggerAutoExtract() {
    clearRecordingTimers()
    autoExtractTimer.current = setTimeout(() => {
      const t = aiTextRef.current
      const f = imageFileRef.current
      if (t.trim() || f) handleAIExtractRef.current(f, t)
    }, 400)
  }

  useEffect(() => {
    const ios = isIOS(); setIosDevice(ios)
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setVoiceSupported(false); return }
    setVoiceSupported(true)
    return () => {
      clearRecordingTimers()
      if (toastTimer.current) clearTimeout(toastTimer.current)
      try { recognitionRef.current?.abort() } catch (_) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR || !voiceSupported) {
      setError(iosDevice ? 'Pastikan Safari terbaru (iOS 14.5+) dan izinkan mikrofon.' : 'Browser tidak mendukung voice. Gunakan Chrome atau Safari.')
      return
    }
    if (isRecording) { clearRecordingTimers(); try { recognitionRef.current?.stop() } catch (e) {}; return }
    setError('')
    try {
      const rec = new SR()
      rec.continuous = false; rec.interimResults = false; rec.lang = 'id-ID'; rec.maxAlternatives = 1
      rec.onstart = () => {
        setIsRecording(true); setError('')
        safetyTimer.current = setTimeout(() => { try { recognitionRef.current?.stop() } catch (_) {} }, 10_000)
      }
      rec.onresult = (e) => {
        let t = ''
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' '
        t = t.trim()
        setAiText(prev => { const next = prev ? `${prev} ${t}` : t; aiTextRef.current = next; return next })
      }
      rec.onspeechend = () => { try { recognitionRef.current?.stop() } catch (_) {} }
      rec.onerror = (e) => {
        setIsRecording(false); clearRecordingTimers()
        if (e.error === 'not-allowed')    setError('Akses mikrofon ditolak.')
        else if (e.error === 'no-speech') setError('Tidak ada suara. Coba lagi.')
        else if (e.error !== 'aborted')   setError('Error: ' + e.error)
      }
      rec.onend = () => { setIsRecording(false); clearRecordingTimers(); triggerAutoExtract() }
      recognitionRef.current = rec; rec.start()
    } catch (err) { setError('Gagal mulai rekam: ' + err.message); setIsRecording(false) }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader(); r.readAsDataURL(file)
      r.onload  = () => resolve(r.result.split(',')[1])
      r.onerror = reject
    })
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Compress timeout')), 10_000)
      const reader = new FileReader(); reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new window.Image(); img.src = event.target.result
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            let { width, height } = img; const maxW = 1000, maxH = 1000
            if (width > height) { if (width  > maxW) { height = Math.round(height * maxW / width);  width  = maxW } }
            else                { if (height > maxH) { width  = Math.round(width  * maxH / height); height = maxH } }
            canvas.width = width; canvas.height = height
            canvas.getContext('2d').drawImage(img, 0, 0, width, height)
            canvas.toBlob(blob => {
              clearTimeout(timeout)
              if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
              else reject(new Error('Compression failed'))
            }, 'image/jpeg', 0.75)
          } catch (err) { clearTimeout(timeout); reject(err) }
        }
        img.onerror = (err) => { clearTimeout(timeout); reject(err) }
      }
      reader.onerror = (err) => { clearTimeout(timeout); reject(err) }
    })
  }

  function handleImageFile(file) {
    if (!file) return
    setAiLoading(true)
    compressImage(file)
      .then(c  => { setImageFile(c); imageFileRef.current = c; setImagePreview(URL.createObjectURL(c)); handleAIExtract(c, aiTextRef.current) })
      .catch(() => { setImageFile(file); imageFileRef.current = file; setImagePreview(URL.createObjectURL(file)); handleAIExtract(file, aiTextRef.current) })
  }

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
      setAiText(''); setImageFile(null); setImagePreview(''); aiTextRef.current = ''; imageFileRef.current = null
      showToast(t, nilai)
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

  // ── Loading Overlay ──────────────────────────────────────────────────────
  const loadingOverlay = aiLoading && !showConfirm && !showTransferConfirm ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      {imagePreview ? (
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 20, width: 280, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, position: 'relative', background: '#000', border: '2px solid #38bdf8', overflow: 'hidden' }}>
            <img src={imagePreview} alt="Scanning" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
            <div style={{ position: 'absolute', left: 0, right: 0, height: 3, top: 0, zIndex: 2, background: 'linear-gradient(90deg, transparent 0%, #38bdf8 30%, #38bdf8 70%, transparent 100%)', boxShadow: '0 0 10px 2px rgba(56,189,248,0.8)', animation: 'scanLineMove 1.8s ease-in-out infinite' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Bot size={16} /> Membaca Struk...</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>{[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', animation: `dotPulse 1.4s ease-in-out ${d}s infinite` }} />)}</div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 24, padding: '32px 28px', width: 260, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)', animation: 'spin 1.2s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#ec4899', borderLeftColor: '#ec4899', animation: 'spin 0.9s linear infinite reverse' }} />
            <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#f59e0b', animation: 'spin 0.6s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', animation: 'centerPulse 1.2s ease-in-out infinite', boxShadow: '0 0 12px var(--accent)' }} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Bot size={16} /> AI Memproses...</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>{[0, 0.15, 0.3].map((d, i) => <span key={i} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: `dotPulse 1.4s ease-in-out ${d}s infinite` }} />)}</div>
          </div>
          <div style={{ width: '100%', height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '40%', borderRadius: 2, background: 'linear-gradient(90deg, var(--accent), #ec4899, #f59e0b)', animation: 'progressSlide 1.4s ease-in-out infinite' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Menganalisa data transaksi</div>
        </div>
      )}
    </div>
  ) : null

  const TipeIconConfirm  = parsedResult?.tipe === 'income' ? TrendingUp : parsedResult?.tipe === 'cash' ? Landmark : TrendingDown
  const tipeColorConfirm = parsedResult?.tipe === 'expense' ? 'var(--red)' : parsedResult?.tipe === 'income' ? 'var(--green)' : 'var(--yellow)'

  const confirmPopup = showConfirm && parsedResult ? (
    <BottomSheet onBackdropClick={() => setShowConfirm(false)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={22} color="var(--accent)" />
          <div><div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Hasil Ekstraksi AI</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Periksa dan konfirmasi</div></div>
        </div>
        <button onClick={() => setShowConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={20} /></button>
      </div>
      <div style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16, fontSize: 13 }}>
        {[
          { label: 'Tipe', value: (<span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: tipeColorConfirm }}><TipeIconConfirm size={14} />{parsedResult.tipe === 'expense' ? 'Pengeluaran' : parsedResult.tipe === 'income' ? 'Pemasukan' : 'Tarik Tunai'}</span>) },
          { label: 'Tanggal', value: parsedResult.tanggal },
          { label: parsedResult.tipe === 'income' ? 'Sumber' : parsedResult.tipe === 'cash' ? 'ATM / Lokasi' : 'Merchant', value: parsedResult.toko || '—' },
          { label: 'Uraian', value: parsedResult.uraian || '—' },
          { label: 'Jumlah', isAmountInput: true },
          ...(parsedResult.tipe === 'expense' ? [{ label: 'Kategori', value: parsedResult.kategori || 'Lainnya' }] : []),
          { label: 'Bank / Dompet', value: parsedResult.bank || 'Cash' },
          { label: 'Metode', value: parsedResult.metode || 'Cash' },
          { label: 'User', isUserSelect: true },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ color: 'var(--text3)' }}>{row.label}</span>
            {row.isAmountInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <input type="text" inputMode="numeric" value={confirmAmt.display} onChange={confirmAmt.onChange} onKeyDown={confirmAmt.onKeyDown}
                  style={{ background: 'var(--surface)', color: tipeColorConfirm, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 16, fontWeight: 800, fontFamily: 'inherit', outline: 'none', textAlign: 'right', width: 140, letterSpacing: '-0.01em' }} />
                {confirmAmt.formatted && (<span style={{ fontSize: 10, color: tipeColorConfirm, opacity: 0.7 }}>{confirmAmt.formatted}</span>)}
              </div>
            ) : row.isUserSelect ? (
              <select value={parsedResult.user_id} onChange={e => setParsedResult(p => ({ ...p, user_id: e.target.value }))}
                style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Pilih User</option>
                {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
              </select>
            ) : typeof row.value === 'string' ? (
              <span style={{ fontWeight: row.bold ? 700 : 600, color: row.color || 'var(--text1)' }}>{row.value}</span>
            ) : row.value}
          </div>
        ))}
      </div>
      {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={() => {
          setTipe(parsedResult.tipe || 'expense')
          setForm({ tanggal: parsedResult.tanggal || today, toko: parsedResult.toko || '', uraian: parsedResult.uraian || '', total: parsedResult.total ? String(parsedResult.total) : '', kategori: parsedResult.kategori || '', metode: parsedResult.metode || 'Cash', bank: parsedResult.bank || 'Cash', user_id: parsedResult.user_id || user?.id || '' })
          setShowConfirm(false); handleModeChange('manual')
        }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <PenLine size={15} /> Edit Manual
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirmSave} disabled={saving}
          style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {saving ? 'Menyimpan...' : <><Check size={15} /> Konfirmasi &amp; Simpan</>}
        </button>
      </div>
    </BottomSheet>
  ) : null

  return (
    <>
      {loadingOverlay}
      {confirmPopup}
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

        {sharedFromApp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
            <Share2 size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
            Foto diterima dari share — AI sedang membaca struk...
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          {[{ id: 'ai', label: 'Input AI', Icon: Bot }, { id: 'manual', label: 'Manual', Icon: PenLine }].map(m => (
            <button key={m.id} type="button" onClick={() => handleModeChange(m.id)} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: mode === m.id ? 'var(--accent)' : 'transparent',
              color: mode === m.id ? 'white' : 'var(--text3)',
              fontWeight: 700, fontSize: 13, transition: 'all 0.2s', touchAction: 'manipulation',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}><m.Icon size={15} />{m.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ overflow: 'hidden' }}>
          <TabTransition tabKey={mode} direction={tabDirection}>
            {mode === 'ai' && (
              <div className="card">
                <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>💡 Contoh perintah AI:</div>
                  <div>• <span style={{ color: 'var(--text1)' }}>Pengeluaran:</span> "beli bensin 50rb aldin BCA"</div>
                  <div>• <span style={{ color: 'var(--text1)' }}>Pemasukan:</span> "gaji 5jt mandiri aldin"</div>
                  <div>• <span style={{ color: 'var(--text1)' }}>Tarik tunai:</span> "tarik 200rb ATM BCA"</div>
                  <div>• <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Transfer ke Solikhatun/Aldin:</span> "transfer 500rb ke solikhatun"</div>
                  <div>• <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Pindah rekening:</span> "pindah 1jt BCA ke Mandiri"</div>
                  <div style={{ marginTop: 4, color: 'var(--text3)', fontSize: 11 }}>⚠️ Transfer ke orang lain (bukan Aldin/Solikhatun) otomatis dicatat sebagai pengeluaran</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ketik atau diktekan transaksi</label>
                  <textarea className="form-input" rows={4}
                    placeholder="Contoh: transfer 500rb ke solikhatun, atau beli bensin 50rb aldin BCA..."
                    value={aiText}
                    onChange={e => { setAiText(e.target.value); aiTextRef.current = e.target.value }}
                    style={{ resize: 'none', fontFamily: 'inherit', fontSize: 16 }}
                  />
                </div>

                {iosDevice && (
                  <div style={{ padding: '10px 12px', marginBottom: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    📱 <strong>iPhone:</strong> Tap <Mic size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Suara → bicara → otomatis diproses. Rekaman berhenti otomatis setelah kamu diam atau maksimal 10 detik.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <button type="button" onClick={toggleRecording} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 8px', borderRadius: 10, border: isRecording ? '2px solid var(--red)' : '1px solid var(--border)', background: isRecording ? 'rgba(244,63,94,0.1)' : 'var(--surface2)', color: isRecording ? 'var(--red)' : 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation', animation: isRecording ? 'pulse-record 1.5s infinite' : 'none' }}>
                    {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{isRecording ? 'Rekam...' : 'Suara'}</span>
                  </button>
                  <button type="button" onClick={() => document.getElementById('input-page-camera').click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 8px', borderRadius: 10, border: imageFile ? '2px solid var(--green)' : '1px solid var(--border)', background: imageFile ? 'rgba(16,185,129,0.1)' : 'var(--surface2)', color: imageFile ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation' }}>
                    <Camera size={22} /><span style={{ fontSize: 11, fontWeight: 700 }}>Kamera</span>
                  </button>
                  <button type="button" onClick={() => document.getElementById('input-page-gallery').click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 8px', borderRadius: 10, border: imageFile ? '2px solid var(--green)' : '1px solid var(--border)', background: imageFile ? 'rgba(16,185,129,0.1)' : 'var(--surface2)', color: imageFile ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation' }}>
                    <Image size={22} /><span style={{ fontSize: 11, fontWeight: 700 }}>Galeri</span>
                  </button>
                  <input id="input-page-camera" type="file" accept="image/*" capture="environment" onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />
                  <input id="input-page-gallery" type="file" accept="image/*" onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />
                </div>

                {imagePreview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
                    <img src={imagePreview} alt="Struk" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imageFile?.name || 'Struk'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
                    </div>
                    <button type="button" onClick={() => { setImageFile(null); imageFileRef.current = null; setImagePreview('') }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}><Trash2 size={20} /></button>
                  </div>
                )}

                {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

                <button type="button" className="btn btn-primary btn-full" onClick={() => handleAIExtract()} disabled={aiLoading || (!aiText.trim() && !imageFile)}
                  style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Bot size={18} />{aiLoading ? 'Memproses...' : 'Ekstrak Data AI'}
                </button>
              </div>
            )}

            {mode === 'manual' && (
              <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {TIPE_LIST.map(t => { const I = t.Icon; return (
                    <button key={t.id} type="button" onClick={() => setTipe(t.id)} style={{ padding: '12px 6px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', border: `2px solid ${tipe === t.id ? t.color : 'var(--border)'}`, background: tipe === t.id ? `${t.color}18` : 'var(--surface2)', color: tipe === t.id ? t.color : 'var(--text3)', fontWeight: 700, fontSize: 11, touchAction: 'manipulation', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}><I size={22} />{t.label}</button>
                  )})}
                </div>
                <form onSubmit={handleManualSubmit}>
                  <div className="form-group"><label className="form-label">Tanggal</label><input className="form-input" type="date" value={form.tanggal} onChange={e => setF('tanggal', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">{tipe === 'income' ? 'Sumber' : tipe === 'cash' ? 'Lokasi ATM' : 'Toko / Merchant'}</label><input className="form-input" type="text" placeholder={tipe === 'income' ? 'Nama perusahaan' : tipe === 'cash' ? 'Nama ATM / lokasi' : 'Nama toko'} value={form.toko} onChange={e => setF('toko', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">{tipe === 'income' ? 'Keterangan' : 'Uraian / Items'}</label><input className="form-input" type="text" placeholder="Deskripsi transaksi" value={form.uraian} onChange={e => setF('uraian', e.target.value)} /></div>
                  <div className="form-group">
                    <label className="form-label">{tipe === 'income' ? 'Jumlah' : 'Total'}</label>
                    <input className="form-input" type="text" inputMode="numeric" placeholder="0"
                      value={manualAmt.display} onChange={manualAmt.onChange} onKeyDown={manualAmt.onKeyDown}
                      style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }} />
                    {manualAmt.formatted && (
                      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: manualAmt.previewColor, textAlign: 'center', letterSpacing: '-0.02em', transition: 'color 0.2s' }}>
                        {manualAmt.formatted}
                      </div>
                    )}
                  </div>
                  {tipe === 'expense' && (<div className="form-group"><label className="form-label">Kategori</label><select className="form-select" value={form.kategori} onChange={e => setF('kategori', e.target.value)}><option value="">Pilih Kategori</option>{KATEGORI_LIST.filter(k => k !== 'Pemasukan').map(k => <option key={k}>{k}</option>)}</select></div>)}
                  {tipe !== 'cash' && (<div className="form-group"><label className="form-label">Metode</label><select className="form-select" value={form.metode} onChange={e => setF('metode', e.target.value)}>{METODE_LIST.map(m => <option key={m}>{m}</option>)}</select></div>)}
                  <div className="form-group"><label className="form-label">Bank / Dompet</label><select className="form-select" value={form.bank} onChange={e => setF('bank', e.target.value)}>{BANK_LIST.map(b => <option key={b}>{b}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">User</label><select className="form-select" value={form.user_id} onChange={e => setF('user_id', e.target.value)} required><option value="">Pilih User</option>{(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}</select></div>
                  {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
                  <button type="submit" className="btn btn-primary btn-full" disabled={saving} style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Check size={18} />{saving ? 'Menyimpan...' : 'Simpan Transaksi'}
                  </button>
                </form>
              </div>
            )}
          </TabTransition>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanLineMove { 0% { top: 0%; } 50% { top: calc(100% - 3px); } 100% { top: 0%; } }
        @keyframes dotPulse { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.2); opacity: 1; } }
        @keyframes centerPulse { 0%,100% { transform: scale(0.8); opacity: 0.7; } 50% { transform: scale(1.2); opacity: 1; } }
        @keyframes progressSlide { 0% { transform: translateX(-150%); } 50% { transform: translateX(150%); } 100% { transform: translateX(400%); } }
        @keyframes pulse-record { 0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); } 70% { box-shadow: 0 0 0 10px rgba(244,63,94,0); } 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0); } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -16px) scale(0.92); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </>
  )
}
