'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { supabase } from '../../lib/supabase'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'

function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

const TIPE_LIST = [
  { id: 'expense', label: 'Pengeluaran', color: 'var(--red)',    icon: '💸' },
  { id: 'income',  label: 'Pemasukan',   color: 'var(--green)',  icon: '💰' },
  { id: 'cash',    label: 'Tarik Tunai', color: 'var(--yellow)', icon: '🏧' },
]

export default function InputPage() {
  const router = useRouter()
  const { user, profiles, loadData } = useData()
  const [mode, setMode]     = useState('ai')
  const [tipe, setTipe]     = useState('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // AI mode state
  const [aiText, setAiText]       = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [parsedResult, setParsedResult] = useState(null)
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isRecording, setIsRecording]   = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(true)
  const [iosDevice, setIosDevice]   = useState(false)

  const aiTextRef      = useRef('')
  const imageFileRef   = useRef(null)
  const recognitionRef = useRef(null)
  const autoExtractTimer = useRef(null)

  useEffect(() => { aiTextRef.current = aiText }, [aiText])
  useEffect(() => { imageFileRef.current = imageFile }, [imageFile])

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const [form, setForm] = useState({
    tanggal: today, toko: '', uraian: '', total: '',
    kategori: '', metode: 'Cash', bank: 'Cash', user_id: '',
  })

  useEffect(() => {
    if (user?.id) setForm(f => ({ ...f, user_id: user.id }))
  }, [user])

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function getBulan(tgl) {
    if (!tgl) return ''
    return BULAN_ORDER[new Date(tgl + 'T00:00:00').getMonth()]
  }

  // ── AI Extract ──
  const handleAIExtract = useCallback(async (fileOverride = null, textOverride = null) => {
    const activeFile = fileOverride instanceof Blob ? fileOverride : imageFileRef.current
    const activeText = typeof textOverride === 'string' ? textOverride : aiTextRef.current
    if (!activeText.trim() && !activeFile) return
    setAiLoading(true)
    setError('')
    try {
      const systemInstruction = `Kamu adalah asisten keuangan pintar untuk aplikasi Arvifund. Tugasmu adalah mengekstrak data dari kalimat bahasa natural ATAU dari foto struk belanja/nota menjadi format JSON terstruktur.
Hari ini adalah: ${today} (${new Date().toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' })}).
Daftar Kategori yang valid: ${JSON.stringify(KATEGORI_LIST.filter(k => k !== 'Pemasukan'))}
Daftar Bank/Dompet yang valid: ${JSON.stringify(BANK_LIST)}
Daftar Metode yang valid: ${JSON.stringify(METODE_LIST)}
Daftar User: ${JSON.stringify((profiles || []).map(p => ({ id: p.id, username: p.username })))}
Kembalikan HANYA objek JSON: {"tipe":"expense","tanggal":"YYYY-MM-DD","toko":"string","uraian":"string","total":number,"kategori":"string","metode":"string","bank":"string"}`

      const parts = activeFile
        ? [{ inlineData: { mimeType: activeFile.type, data: await fileToBase64(activeFile) } }, { text: `${systemInstruction}\n\nEkstrak dari struk. Catatan: "${activeText}"` }]
        : [{ text: `${systemInstruction}\n\nKalimat: "${activeText}"` }]

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } })
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`) }
      const resData = await res.json()
      const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResult) throw new Error('Gagal mendapatkan respon dari AI')
      const result = JSON.parse(textResult)

      const aiTextTrimmed = activeText.trim().toLowerCase()
      let matchedProfile = null
      if (aiTextTrimmed.startsWith('a ') || aiTextTrimmed === 'a' || aiTextTrimmed.startsWith('a:'))
        matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('ald'))
      else if (aiTextTrimmed.startsWith('s ') || aiTextTrimmed === 's' || aiTextTrimmed.startsWith('s:'))
        matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('sol'))
      else
        matchedProfile = profiles?.find(p => { const u = p.username?.toLowerCase(); return u && aiTextTrimmed.includes(u) })

      setParsedResult({
        tipe: result.tipe || 'expense', tanggal: result.tanggal || today,
        toko: result.toko || '', uraian: result.uraian || '',
        total: result.total ? String(result.total) : '', kategori: result.kategori || '',
        metode: result.metode || 'Cash', bank: result.bank || 'Cash',
        user_id: matchedProfile ? matchedProfile.id : (user?.id || ''),
      })
      setShowConfirm(true)
    } catch (err) {
      setError('AI Gagal: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }, [profiles, today, user])

  const handleAIExtractRef = useRef(handleAIExtract)
  useEffect(() => { handleAIExtractRef.current = handleAIExtract }, [handleAIExtract])

  // ── Speech Recognition ──
  useEffect(() => {
    const ios = isIOS()
    setIosDevice(ios)
    if (typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setVoiceSupported(false); return }
    setVoiceSupported(true)
    return () => {
      if (autoExtractTimer.current) clearTimeout(autoExtractTimer.current)
      try { recognitionRef.current?.abort() } catch (_) {}
    }
  }, [])

  function toggleRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition || !voiceSupported) {
      setError(iosDevice ? 'Pastikan Safari terbaru (iOS 14.5+) dan izinkan mikrofon.' : 'Browser tidak mendukung voice. Gunakan Chrome atau Safari.')
      return
    }
    if (isRecording) {
      try { recognitionRef.current?.stop() } catch (e) {}
      setIsRecording(false)
      return
    }
    setError('')
    try {
      const rec = new SpeechRecognition()
      rec.continuous = false; rec.interimResults = false; rec.lang = 'id-ID'; rec.maxAlternatives = 1
      rec.onstart = () => { setIsRecording(true); setError('') }
      rec.onresult = (event) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript + ' '
        transcript = transcript.trim()
        setAiText(prev => { const next = prev ? `${prev} ${transcript}` : transcript; aiTextRef.current = next; return next })
      }
      rec.onerror = (event) => {
        setIsRecording(false)
        if (autoExtractTimer.current) clearTimeout(autoExtractTimer.current)
        if (event.error === 'not-allowed') setError('Akses mikrofon ditolak.')
        else if (event.error === 'no-speech') setError('Tidak ada suara. Coba lagi.')
        else if (event.error !== 'aborted') setError('Error: ' + event.error)
      }
      rec.onend = () => {
        setIsRecording(false)
        autoExtractTimer.current = setTimeout(() => {
          const t = aiTextRef.current; const f = imageFileRef.current
          if (t.trim() || f) handleAIExtractRef.current(f, t)
        }, 300)
      }
      recognitionRef.current = rec
      rec.start()
    } catch (err) {
      setError('Gagal mulai rekam: ' + err.message)
      setIsRecording(false)
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
    })
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img
          const maxW = 1000, maxH = 1000
          if (width > height) { if (width > maxW) { height = Math.round(height * maxW / width); width = maxW } }
          else { if (height > maxH) { width = Math.round(width * maxH / height); height = maxH } }
          canvas.width = width; canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          canvas.toBlob(blob => {
            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
            else reject(new Error('Compression failed'))
          }, 'image/jpeg', 0.75)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  function handleImageFile(file) {
    if (!file) return
    setAiLoading(true)
    compressImage(file)
      .then(c => { setImageFile(c); imageFileRef.current = c; setImagePreview(URL.createObjectURL(c)); handleAIExtract(c, aiTextRef.current) })
      .catch(() => { setImageFile(file); imageFileRef.current = file; setImagePreview(URL.createObjectURL(file)); handleAIExtract(file, aiTextRef.current) })
  }

  async function handleConfirmSave() {
    setError('')
    if (!parsedResult.total || isNaN(parseFloat(parsedResult.total))) { setError('Total harus diisi'); return }
    if (!parsedResult.user_id) { setError('User harus dipilih'); return }
    setSaving(true)
    try {
      const bulan = getBulan(parsedResult.tanggal)
      const nilai = parseFloat(parsedResult.total)
      const t = parsedResult.tipe || 'expense'
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
      await loadData()
      setSuccess(true)
      setShowConfirm(false)
      setAiText(''); setImageFile(null); setImagePreview('')
      aiTextRef.current = ''; imageFileRef.current = null
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError('Gagal simpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.total || isNaN(parseFloat(form.total))) { setError('Total harus diisi'); return }
    if (!form.user_id) { setError('User harus dipilih'); return }
    setSaving(true)
    try {
      const bulan = getBulan(form.tanggal)
      const nilai = parseFloat(form.total)
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
      setSuccess(true)
      setForm({ tanggal: today, toko: '', uraian: '', total: '', kategori: '', metode: 'Cash', bank: 'Cash', user_id: user?.id || '' })
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError('Gagal simpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Loading overlay (scan / AI thinking) ──
  const loadingOverlay = aiLoading && !showConfirm ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      {imagePreview ? (
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 20, width: 280, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, position: 'relative', background: '#000', border: '2px solid #38bdf8', boxShadow: '0 0 0 3px rgba(56,189,248,0.2)', overflow: 'hidden' }}>
            <img src={imagePreview} alt="Scanning" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, display: 'block' }} />
            {[{ top: 8, left: 8, borderTop: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }, { top: 8, right: 8, borderTop: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }, { bottom: 8, left: 8, borderBottom: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }, { bottom: 8, right: 8, borderBottom: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 22, height: 22, zIndex: 3, ...s }} />
            ))}
            <div style={{ position: 'absolute', left: 0, right: 0, height: 3, top: 0, zIndex: 2, background: 'linear-gradient(90deg, transparent 0%, #38bdf8 30%, #38bdf8 70%, transparent 100%)', boxShadow: '0 0 10px 2px rgba(56,189,248,0.8)', animation: 'scanLineMove 1.8s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, height: 60, top: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(56,189,248,0.18) 0%, transparent 100%)', animation: 'scanGlowMove 1.8s ease-in-out infinite' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>🤖 Membaca Struk...</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', animation: `dotPulse 1.4s ease-in-out ${d}s infinite` }} />)}
            </div>
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
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>🤖 AI Memproses...</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {[0, 0.15, 0.3].map((d, i) => <span key={i} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: `dotPulse 1.4s ease-in-out ${d}s infinite` }} />)}
            </div>
          </div>
          <div style={{ width: '100%', height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '40%', borderRadius: 2, background: 'linear-gradient(90deg, var(--accent), #ec4899, #f59e0b)', animation: 'progressSlide 1.4s ease-in-out infinite' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Menganalisa data transaksi</div>
        </div>
      )}
    </div>
  ) : null

  // ── Confirm popup ──
  const confirmPopup = showConfirm && parsedResult ? (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && setShowConfirm(false)}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        width: '100%',
        maxWidth: 560,
        maxHeight: '92dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '20px 20px',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 8px)',
      }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Hasil Ekstraksi AI</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Periksa dan konfirmasi</div>
            </div>
          </div>
          <button onClick={() => setShowConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16, fontSize: 13 }}>
          {[
            { label: 'Tipe', value: parsedResult.tipe === 'expense' ? '💸 Pengeluaran' : parsedResult.tipe === 'income' ? '💰 Pemasukan' : '🏧 Tarik Tunai', bold: true, color: parsedResult.tipe === 'expense' ? 'var(--red)' : parsedResult.tipe === 'income' ? 'var(--green)' : 'var(--yellow)' },
            { label: 'Tanggal', value: parsedResult.tanggal },
            { label: parsedResult.tipe === 'income' ? 'Sumber' : parsedResult.tipe === 'cash' ? 'ATM / Lokasi' : 'Merchant', value: parsedResult.toko || '—' },
            { label: 'Uraian', value: parsedResult.uraian || '—' },
            { label: 'Jumlah', value: `Rp ${parseFloat(parsedResult.total || 0).toLocaleString('id-ID')}`, bold: true, color: parsedResult.tipe === 'expense' ? 'var(--red)' : parsedResult.tipe === 'income' ? 'var(--green)' : 'var(--yellow)' },
            ...(parsedResult.tipe === 'expense' ? [{ label: 'Kategori', value: parsedResult.kategori || 'Lainnya' }] : []),
            { label: 'Bank / Dompet', value: parsedResult.bank || 'Cash' },
            { label: 'Metode', value: parsedResult.metode || 'Cash' },
            { label: 'User', isUserSelect: true },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--text3)' }}>{row.label}</span>
              {row.isUserSelect ? (
                <select value={parsedResult.user_id} onChange={e => setParsedResult(p => ({ ...p, user_id: e.target.value }))}
                  style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                  <option value="">Pilih User</option>
                  {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
              ) : (
                <span style={{ fontWeight: row.bold ? 700 : 600, color: row.color || 'var(--text1)' }}>{row.value}</span>
              )}
            </div>
          ))}
        </div>
        {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginBottom: 'env(safe-area-inset-bottom, 16px)', paddingBottom: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => {
            setTipe(parsedResult.tipe || 'expense')
            setForm({ tanggal: parsedResult.tanggal || today, toko: parsedResult.toko || '', uraian: parsedResult.uraian || '', total: parsedResult.total ? String(parsedResult.total) : '', kategori: parsedResult.kategori || '', metode: parsedResult.metode || 'Cash', bank: parsedResult.bank || 'Cash', user_id: parsedResult.user_id || user?.id || '' })
            setShowConfirm(false); setMode('manual')
          }} style={{ flex: 1 }}>✍️ Edit Manual</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirmSave} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Menyimpan...' : '✅ Konfirmasi & Simpan'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {loadingOverlay}
      {confirmPopup}

      <AppHeader title="Input Transaksi" />
      <div className="page-container" style={{ maxWidth: 560 }}>

        {/* Success banner */}
        {success && (
          <div style={{ padding: '14px 16px', marginBottom: 16, background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: 'var(--green)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s ease' }}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Transaksi berhasil disimpan!
          </div>
        )}

        {/* Mode Tabs */}
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          <button type="button" onClick={() => setMode('ai')} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: mode === 'ai' ? 'var(--accent)' : 'transparent',
            color: mode === 'ai' ? 'white' : 'var(--text3)',
            fontWeight: 700, fontSize: 13, transition: 'all 0.2s', touchAction: 'manipulation',
          }}>🤖 Input AI</button>
          <button type="button" onClick={() => setMode('manual')} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: mode === 'manual' ? 'var(--accent)' : 'transparent',
            color: mode === 'manual' ? 'white' : 'var(--text3)',
            fontWeight: 700, fontSize: 13, transition: 'all 0.2s', touchAction: 'manipulation',
          }}>✍️ Manual</button>
        </div>

        {/* ── AI MODE ── */}
        {mode === 'ai' && (
          <div className="card">
            <div className="form-group">
              <label className="form-label">Ketik atau diktekan transaksi</label>
              <textarea className="form-input" rows={4}
                placeholder="Contoh: Beli bensin 50rb di Pertamina pakai BCA oleh aldin"
                value={aiText}
                onChange={e => { setAiText(e.target.value); aiTextRef.current = e.target.value }}
                style={{ resize: 'none', fontFamily: 'inherit', fontSize: 16 }}
              />
            </div>

            {iosDevice && (
              <div style={{ padding: '10px 12px', marginBottom: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                📱 <strong>iPhone:</strong> Tap 🎙️ Suara → bicara → otomatis diproses. Atau pakai ikon mikrofon di keyboard Safari.
              </div>
            )}

            {/* Media buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <button type="button" onClick={toggleRecording} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '14px 8px', borderRadius: 10,
                border: isRecording ? '2px solid var(--red)' : '1px solid var(--border)',
                background: isRecording ? 'rgba(244,63,94,0.1)' : 'var(--surface2)',
                color: isRecording ? 'var(--red)' : 'var(--text2)',
                cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation',
                animation: isRecording ? 'pulse-record 1.5s infinite' : 'none',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{isRecording ? 'mic' : 'mic_none'}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{isRecording ? 'Rekam...' : 'Suara'}</span>
              </button>
              <button type="button" onClick={() => document.getElementById('input-page-camera').click()} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '14px 8px', borderRadius: 10,
                border: imageFile ? '2px solid var(--green)' : '1px solid var(--border)',
                background: imageFile ? 'rgba(16,185,129,0.1)' : 'var(--surface2)',
                color: imageFile ? 'var(--green)' : 'var(--text2)',
                cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>photo_camera</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Kamera</span>
              </button>
              <button type="button" onClick={() => document.getElementById('input-page-gallery').click()} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '14px 8px', borderRadius: 10,
                border: imageFile ? '2px solid var(--green)' : '1px solid var(--border)',
                background: imageFile ? 'rgba(16,185,129,0.1)' : 'var(--surface2)',
                color: imageFile ? 'var(--green)' : 'var(--text2)',
                cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>image</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Galeri</span>
              </button>
              <input id="input-page-camera" type="file" accept="image/*" capture="environment" onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />
              <input id="input-page-gallery" type="file" accept="image/*" onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
                <img src={imagePreview} alt="Struk" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imageFile?.name || 'Struk'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
                </div>
                <button type="button" onClick={() => { setImageFile(null); imageFileRef.current = null; setImagePreview('') }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                </button>
              </div>
            )}

            {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

            <button type="button" className="btn btn-primary btn-full" onClick={() => handleAIExtract()} disabled={aiLoading || (!aiText.trim() && !imageFile)} style={{ height: 48, fontSize: 15 }}>
              {aiLoading ? 'Memproses...' : '🤖 Ekstrak Data AI'}
            </button>
          </div>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === 'manual' && (
          <div className="card">
            {/* Tipe selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
              {TIPE_LIST.map(t => (
                <button key={t.id} type="button" onClick={() => setTipe(t.id)} style={{
                  padding: '12px 6px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  border: `2px solid ${tipe === t.id ? t.color : 'var(--border)'}`,
                  background: tipe === t.id ? `${t.color}18` : 'var(--surface2)',
                  color: tipe === t.id ? t.color : 'var(--text3)',
                  fontWeight: 700, fontSize: 11, touchAction: 'manipulation',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 22 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label className="form-label">Tanggal</label>
                <input className="form-input" type="date" value={form.tanggal} onChange={e => setF('tanggal', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">{tipe === 'income' ? 'Sumber' : tipe === 'cash' ? 'Lokasi ATM' : 'Toko / Merchant'}</label>
                <input className="form-input" type="text" placeholder={tipe === 'income' ? 'Nama perusahaan' : tipe === 'cash' ? 'Nama ATM / lokasi' : 'Nama toko'} value={form.toko} onChange={e => setF('toko', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{tipe === 'income' ? 'Keterangan' : 'Uraian / Items'}</label>
                <input className="form-input" type="text" placeholder="Deskripsi transaksi" value={form.uraian} onChange={e => setF('uraian', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{tipe === 'income' ? 'Jumlah' : 'Total'}</label>
                <input className="form-input" type="number" inputMode="numeric" placeholder="0" value={form.total} onChange={e => setF('total', e.target.value)} required min="0" />
              </div>
              {tipe === 'expense' && (
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="form-select" value={form.kategori} onChange={e => setF('kategori', e.target.value)}>
                    <option value="">Pilih Kategori</option>
                    {KATEGORI_LIST.filter(k => k !== 'Pemasukan').map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
              )}
              {tipe !== 'cash' && (
                <div className="form-group">
                  <label className="form-label">Metode</label>
                  <select className="form-select" value={form.metode} onChange={e => setF('metode', e.target.value)}>
                    {METODE_LIST.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Bank / Dompet</label>
                <select className="form-select" value={form.bank} onChange={e => setF('bank', e.target.value)}>
                  {BANK_LIST.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">User</label>
                <select className="form-select" value={form.user_id} onChange={e => setF('user_id', e.target.value)} required>
                  <option value="">Pilih User</option>
                  {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
              </div>
              {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
              <button type="submit" className="btn btn-primary btn-full" disabled={saving} style={{ height: 48, fontSize: 15 }}>
                {saving ? 'Menyimpan...' : '✅ Simpan Transaksi'}
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanLineMove { 0% { top: 0%; } 50% { top: calc(100% - 3px); } 100% { top: 0%; } }
        @keyframes scanGlowMove { 0% { top: -60px; } 50% { top: calc(100% - 60px); } 100% { top: -60px; } }
        @keyframes dotPulse { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.2); opacity: 1; } }
        @keyframes centerPulse { 0%,100% { transform: scale(0.8); opacity: 0.7; } 50% { transform: scale(1.2); opacity: 1; } }
        @keyframes progressSlide { 0% { transform: translateX(-150%); } 50% { transform: translateX(150%); } 100% { transform: translateX(400%); } }
        @keyframes pulse-record { 0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); } 70% { box-shadow: 0 0 0 10px rgba(244,63,94,0); } 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0); } }
      `}</style>
    </>
  )
}
