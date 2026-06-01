'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useData } from '../DataContext'
import { supabase } from '../../lib/supabase'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'

export default function InputModal({ onClose, onSuccess }) {
  const { user, profiles, loadData } = useData()
  const [mode, setMode]     = useState('ai')
  const [tipe, setTipe]     = useState('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [parsedResult, setParsedResult] = useState(null)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState(null)

  // Voice note enhancements
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [silenceCountdown, setSilenceCountdown] = useState(null)
  const timerRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const silenceDelay = 2000 // 2s silence → auto stop

  const aiTextRef = useRef('')
  useEffect(() => { aiTextRef.current = aiText }, [aiText])

  const stopRecordingAndParse = useCallback((rec) => {
    clearInterval(timerRef.current)
    clearTimeout(silenceTimerRef.current)
    setSilenceCountdown(null)
    setRecordSeconds(0)
    setIsRecording(false)
    rec?.stop()
  }, [])

  // Reset silence timer on every new speech result
  const resetSilenceTimer = useCallback((rec) => {
    clearTimeout(silenceTimerRef.current)
    setSilenceCountdown(null)
    // Start countdown only if still recording
    silenceTimerRef.current = setTimeout(() => {
      stopRecordingAndParse(rec)
    }, silenceDelay)
  }, [stopRecordingAndParse])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'id-ID'

    rec.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      if (final) {
        setAiText(prev => {
          const next = prev ? `${prev} ${final}` : final
          aiTextRef.current = next
          return next
        })
        resetSilenceTimer(rec)
      }
      // Show interim in a ref (not state to avoid re-render lag)
      interimRef.current = interim
    }

    rec.onerror = (event) => {
      if (event.error === 'no-speech') {
        // silence detected by browser — trigger our stop
        stopRecordingAndParse(rec)
        return
      }
      console.error('Speech recognition error', event.error)
      stopRecordingAndParse(rec)
    }

    rec.onend = () => {
      clearInterval(timerRef.current)
      clearTimeout(silenceTimerRef.current)
      setSilenceCountdown(null)
      setRecordSeconds(0)
      setIsRecording(false)
      if (aiTextRef.current.trim()) {
        handleAIExtract(null, aiTextRef.current)
      }
    }

    setRecognition(rec)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const interimRef = useRef('')

  function toggleRecording() {
    if (!recognition) {
      setError('Browser Anda tidak mendukung perekaman suara. Coba gunakan Chrome.')
      return
    }
    if (isRecording) {
      stopRecordingAndParse(recognition)
    } else {
      setError('')
      interimRef.current = ''
      setRecordSeconds(0)
      try {
        recognition.start()
        setIsRecording(true)
        // Start seconds counter
        timerRef.current = setInterval(() => {
          setRecordSeconds(s => s + 1)
        }, 1000)
        // Start initial silence timer (in case user never speaks)
        resetSilenceTimer(recognition)
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(silenceTimerRef.current)
    }
  }, [])

  function formatSeconds(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = error => reject(error)
    })
  }

  function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width, height = img.height
          if (width > height) {
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth }
          } else {
            if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight }
          }
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(blob => {
            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
            else reject(new Error('Compression failed'))
          }, 'image/jpeg', quality)
        }
        img.onerror = err => reject(err)
      }
      reader.onerror = err => reject(err)
    })
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const [form, setForm] = useState(() => ({
    tanggal: today, toko: '', uraian: '', total: '',
    kategori: '', metode: 'Cash', bank: 'Cash', user_id: '',
  }))

  useEffect(() => {
    if (user?.id) setForm(f => ({ ...f, user_id: user.id }))
  }, [user])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function getBulan(tgl) {
    if (!tgl) return ''
    return BULAN_ORDER[new Date(tgl + 'T00:00:00').getMonth()]
  }

  async function handleAIExtract(fileToExtract = null, textToExtract = null) {
    const activeFile = (fileToExtract instanceof Blob) ? fileToExtract : imageFile
    const activeText = (typeof textToExtract === 'string') ? textToExtract : aiText
    if (!activeText.trim() && !activeFile) return
    setAiLoading(true)
    setError('')
    try {
      const systemInstruction = `Kamu adalah asisten keuangan pintar untuk aplikasi Arvifund. Tugasmu adalah mengekstrak data dari kalimat bahasa natural ATAU dari foto struk belanja/nota menjadi format JSON terstruktur.
Hari ini adalah: ${today} (${new Date().toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' })}).

Daftar Kategori yang valid: ${JSON.stringify(KATEGORI_LIST.filter(k => k !== 'Pemasukan'))}
Daftar Bank/Dompet yang valid: ${JSON.stringify(BANK_LIST)}
Daftar Metode yang valid: ${JSON.stringify(METODE_LIST)}
Daftar User yang tersedia (gunakan username untuk mencocokkan): ${JSON.stringify((profiles || []).map(p => ({ id: p.id, username: p.username })))}

Aturan ekstraksi:
1. "tipe": Tentukan apakah "expense", "income", atau "cash".
2. "tanggal": Format "YYYY-MM-DD".
3. "toko": Nama toko/merchant/sumber.
4. "uraian": Deskripsi singkat.
5. "total": Nominal angka murni tanpa simbol.
6. "kategori": Harus persis sama dengan salah satu di Daftar Kategori.
7. "metode": Harus persis sama dengan salah satu di Daftar Metode.
8. "bank": Harus persis sama dengan salah satu di Daftar Bank/Dompet.

Kembalikan HANYA objek JSON tanpa markdown:`

      let parts = []
      if (activeFile) {
        const base64Data = await fileToBase64(activeFile)
        parts.push({ inlineData: { mimeType: activeFile.type, data: base64Data } })
        parts.push({ text: `${systemInstruction}\n\nEkstrak dari struk terlampir. Catatan: "${activeText}"` })
      } else {
        parts.push({ text: `${systemInstruction}\n\nKalimat transaksi: "${activeText}"` })
      }

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${res.status}`)
      }

      const resData = await res.json()
      const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResult) throw new Error('Gagal mendapatkan respon dari AI')

      const result = JSON.parse(textResult)
      const aiTextTrimmed = activeText.trim().toLowerCase()
      let matchedProfile = null
      if (aiTextTrimmed.startsWith('a ') || aiTextTrimmed === 'a' || aiTextTrimmed.startsWith('a:')) {
        matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('ald'))
      } else if (aiTextTrimmed.startsWith('s ') || aiTextTrimmed === 's' || aiTextTrimmed.startsWith('s:')) {
        matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('sol'))
      } else {
        matchedProfile = profiles?.find(p => {
          const usernameLower = p.username?.toLowerCase()
          return usernameLower && aiTextTrimmed.includes(usernameLower)
        })
      }
      const finalUserId = matchedProfile ? matchedProfile.id : (user?.id || '')
      setParsedResult({
        tipe: result.tipe || 'expense',
        tanggal: result.tanggal || today,
        toko: result.toko || '',
        uraian: result.uraian || '',
        total: result.total ? String(result.total) : '',
        kategori: result.kategori || '',
        metode: result.metode || 'Cash',
        bank: result.bank || 'Cash',
        user_id: finalUserId,
      })
      setShowConfirm(true)
    } catch (err) {
      setError('AI Gagal memproses data: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleConfirmSave() {
    setError('')
    if (!parsedResult.total || isNaN(parseFloat(parsedResult.total))) { setError('Total harus diisi dengan angka'); return }
    if (!parsedResult.user_id) { setError('User harus dipilih'); return }
    setSaving(true)
    try {
      const bulan = getBulan(parsedResult.tanggal)
      const nilai = parseFloat(parsedResult.total)
      const t = parsedResult.tipe || 'expense'
      if (t === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{
          toko: parsedResult.toko, tanggal: parsedResult.tanggal, bulan,
          transaksi: parsedResult.metode || 'Cash', uraian: parsedResult.uraian,
          kategori: parsedResult.kategori || 'Lainnya', bank: parsedResult.bank || 'Cash',
          nilai, user_id: parsedResult.user_id,
        }])
        if (err) throw err
      } else if (t === 'income') {
        const { error: err } = await supabase.from('income').insert([{
          sumber: parsedResult.toko, tanggal: parsedResult.tanggal, bulan,
          jumlah: nilai, metode: parsedResult.metode || 'Cash', items: parsedResult.uraian,
          bank: parsedResult.bank || 'Cash', kategori: 'Pemasukan', user_id: parsedResult.user_id,
        }])
        if (err) throw err
      } else if (t === 'cash') {
        const { error: err } = await supabase.from('cash_records').insert([{
          tanggal: parsedResult.tanggal, bulan, transaksi: parsedResult.uraian || 'Tarik Tunai',
          kategori: 'Pengeluaran', bank: parsedResult.bank || 'Cash', nilai,
          alamat: parsedResult.toko, metode: 'Cash', user_id: parsedResult.user_id,
        }])
        if (err) throw err
      }
      await loadData()
      onSuccess?.()
      onClose()
    } catch (err) {
      setError('Gagal simpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.total || isNaN(parseFloat(form.total))) { setError('Total harus diisi dengan angka'); return }
    if (!form.user_id) { setError('User harus dipilih'); return }
    setSaving(true)
    try {
      const bulan = getBulan(form.tanggal)
      const nilai = parseFloat(form.total)
      if (tipe === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{
          toko: form.toko, tanggal: form.tanggal, bulan,
          transaksi: form.metode, uraian: form.uraian,
          kategori: form.kategori || 'Lainnya', bank: form.bank,
          nilai, user_id: form.user_id,
        }])
        if (err) throw err
      } else if (tipe === 'income') {
        const { error: err } = await supabase.from('income').insert([{
          sumber: form.toko, tanggal: form.tanggal, bulan,
          jumlah: nilai, metode: form.metode, items: form.uraian,
          bank: form.bank, kategori: 'Pemasukan', user_id: form.user_id,
        }])
        if (err) throw err
      } else if (tipe === 'cash') {
        const { error: err } = await supabase.from('cash_records').insert([{
          tanggal: form.tanggal, bulan, transaksi: form.uraian || 'Tarik Tunai',
          kategori: 'Pengeluaran', bank: form.bank, nilai,
          alamat: form.toko, metode: 'Cash', user_id: form.user_id,
        }])
        if (err) throw err
      }
      await loadData()
      onSuccess?.()
      onClose()
    } catch (err) {
      setError('Gagal simpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const TIPE_LIST = [
    { id: 'expense', label: 'Pengeluaran', color: 'var(--red)',    icon: '💸' },
    { id: 'income',  label: 'Pemasukan',   color: 'var(--green)',  icon: '💰' },
    { id: 'cash',    label: 'Tarik Tunai', color: 'var(--yellow)', icon: '🏧' },
  ]

  // Waveform bars (5 bars, animated when recording)
  const WaveformBars = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 18 }}>
      {[0.4, 0.8, 1, 0.7, 0.5].map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: 'var(--red)',
            height: `${h * 100}%`,
            animation: `waveBar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); opacity: 0.6; }
          to   { transform: scaleY(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )

  const confirmPopup = showConfirm && parsedResult ? (
    <div className="confirm-popup-overlay">
      <div className="confirm-popup-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Hasil Ekstraksi AI</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Periksa dan konfirmasi data berikut</div>
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
                <select value={parsedResult.user_id} onChange={e => setParsedResult(prev => ({ ...prev, user_id: e.target.value }))} style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => {
            setTipe(parsedResult.tipe || 'expense')
            setForm({ tanggal: parsedResult.tanggal || today, toko: parsedResult.toko || '', uraian: parsedResult.uraian || '', total: parsedResult.total ? String(parsedResult.total) : '', kategori: parsedResult.kategori || '', metode: parsedResult.metode || 'Cash', bank: parsedResult.bank || 'Cash', user_id: parsedResult.user_id || user?.id || '' })
            setShowConfirm(false)
            setMode('manual')
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
      {confirmPopup}
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-content">
          <div className="modal-header">
            <span className="modal-title">Input Transaksi</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
          <div className="modal-body">
            {/* Mode Selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <button type="button" onClick={() => setMode('manual')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: mode === 'manual' ? '2px solid var(--accent)' : 'none', color: mode === 'manual' ? 'var(--accent)' : 'var(--text3)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✍️ Input Manual</button>
              <button type="button" onClick={() => setMode('ai')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: mode === 'ai' ? '2px solid var(--accent)' : 'none', color: mode === 'ai' ? 'var(--accent)' : 'var(--text3)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🤖 Input AI</button>
            </div>

            {mode === 'ai' ? (
              <div>
                <div className="form-group">
                  <label className="form-label">Tulis, diktekan, atau unggah foto struk Anda</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Contoh: Beli bensin 50rb di Pertamina pakai BCA oleh aldin"
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    style={{ resize: 'vertical', width: '100%', fontFamily: 'inherit', marginBottom: 12 }}
                  />
                </div>

                {/* Media Helpers */}
                <div style={{ display: 'flex', gap: 10, marginBottom: isRecording ? 10 : 16 }}>
                  {/* Voice Note Button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: isRecording ? '1px solid var(--red)' : '1px solid var(--border)',
                      background: isRecording ? 'rgba(244,63,94,0.12)' : 'var(--surface2)',
                      color: isRecording ? 'var(--red)' : 'var(--text2)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                      animation: isRecording ? 'pulse-record 1.5s infinite' : 'none',
                      minWidth: 0,
                    }}
                  >
                    {isRecording ? (
                      <>
                        <WaveformBars />
                        <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.5px', fontSize: 13 }}>
                          {formatSeconds(recordSeconds)}
                        </span>
                        <span style={{ fontSize: 11, opacity: 0.8 }}>Tap stop</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>mic_none</span>
                        🎙️ Suara
                      </>
                    )}
                  </button>

                  {/* Camera */}
                  <button type="button" onClick={() => document.getElementById('receipt-upload-camera').click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 8, border: imageFile ? '1px solid var(--green)' : '1px solid var(--border)', background: imageFile ? 'rgba(16,185,129,0.15)' : 'var(--surface2)', color: imageFile ? 'var(--green)' : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>photo_camera</span>
                    {imageFile ? '✓ Kamera' : '📸 Kamera'}
                  </button>

                  {/* Gallery */}
                  <button type="button" onClick={() => document.getElementById('receipt-upload-gallery').click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 8, border: imageFile ? '1px solid var(--green)' : '1px solid var(--border)', background: imageFile ? 'rgba(16,185,129,0.15)' : 'var(--surface2)', color: imageFile ? 'var(--green)' : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>image</span>
                    {imageFile ? '✓ Galeri' : '🖼️ Galeri'}
                  </button>

                  <input id="receipt-upload-camera" type="file" accept="image/*" capture="environment" onChange={e => { const file = e.target.files?.[0]; if (file) { setAiLoading(true); compressImage(file).then(c => { setImageFile(c); setImagePreview(URL.createObjectURL(c)); handleAIExtract(c, aiTextRef.current) }).catch(() => { setImageFile(file); setImagePreview(URL.createObjectURL(file)); handleAIExtract(file, aiTextRef.current) }) } }} style={{ display: 'none' }} />
                  <input id="receipt-upload-gallery" type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) { setAiLoading(true); compressImage(file).then(c => { setImageFile(c); setImagePreview(URL.createObjectURL(c)); handleAIExtract(c, aiTextRef.current) }).catch(() => { setImageFile(file); setImagePreview(URL.createObjectURL(file)); handleAIExtract(file, aiTextRef.current) }) } }} style={{ display: 'none' }} />
                </div>

                {/* Recording Status Bar */}
                {isRecording && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(244,63,94,0.07)',
                    border: '1px solid rgba(244,63,94,0.2)',
                    marginBottom: 16,
                    fontSize: 12,
                    color: 'var(--red)',
                    fontWeight: 600,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, animation: 'pulse 1s infinite' }}>fiber_manual_record</span>
                    <span style={{ flex: 1 }}>Mendengarkan... berhenti otomatis setelah diam 2 detik</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 13 }}>{formatSeconds(recordSeconds)}</span>
                  </div>
                )}

                {/* AI Loading State */}
                {aiLoading && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'var(--accent-light)',
                    border: '1px solid var(--accent-dim)',
                    marginBottom: 16,
                    fontSize: 13,
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    AI sedang memproses...
                  </div>
                )}

                {imagePreview && (
                  <div style={{ position: 'relative', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', padding: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 50, height: 50, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={imagePreview} alt="Receipt Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{imageFile?.name || 'File Struk'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
                    </div>
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview('') }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                    </button>
                  </div>
                )}

                {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
                  <button type="button" className="btn btn-primary" onClick={() => handleAIExtract()} disabled={aiLoading || isRecording} style={{ flex: 2 }}>
                    {aiLoading ? '⏳ Memproses...' : isRecording ? '🎙️ Sedang Merekam...' : '🤖 Ekstrak Data'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {TIPE_LIST.map(t => (
                    <button key={t.id} type="button" onClick={() => setTipe(t.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${tipe === t.id ? t.color : 'var(--border)'}`, background: tipe === t.id ? `${t.color}18` : 'var(--surface2)', color: tipe === t.id ? t.color : 'var(--text3)', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                      {t.label}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Tanggal</label>
                    <input className="form-input" type="date" value={form.tanggal} onChange={e => set('tanggal', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tipe === 'income' ? 'Sumber' : tipe === 'cash' ? 'Lokasi ATM' : 'Toko / Merchant'}</label>
                    <input className="form-input" type="text" placeholder={tipe === 'income' ? 'Nama perusahaan' : tipe === 'cash' ? 'Nama ATM / lokasi' : 'Nama toko'} value={form.toko} onChange={e => set('toko', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tipe === 'income' ? 'Keterangan' : 'Uraian / Items'}</label>
                    <input className="form-input" type="text" placeholder="Deskripsi transaksi" value={form.uraian} onChange={e => set('uraian', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tipe === 'income' ? 'Jumlah' : 'Total'}</label>
                    <input className="form-input" type="number" inputMode="numeric" placeholder="0" value={form.total} onChange={e => set('total', e.target.value)} required min="0" />
                  </div>
                  {tipe === 'expense' && (
                    <div className="form-group">
                      <label className="form-label">Kategori</label>
                      <select className="form-select" value={form.kategori} onChange={e => set('kategori', e.target.value)}>
                        <option value="">Pilih Kategori</option>
                        {KATEGORI_LIST.filter(k => k !== 'Pemasukan').map(k => <option key={k}>{k}</option>)}
                      </select>
                    </div>
                  )}
                  {tipe !== 'cash' && (
                    <div className="form-group">
                      <label className="form-label">Metode</label>
                      <select className="form-select" value={form.metode} onChange={e => set('metode', e.target.value)}>
                        {METODE_LIST.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Bank / Dompet</label>
                    <select className="form-select" value={form.bank} onChange={e => set('bank', e.target.value)}>
                      {BANK_LIST.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">User</label>
                    <select className="form-select" value={form.user_id} onChange={e => set('user_id', e.target.value)} required>
                      <option value="">Pilih User</option>
                      {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                    </select>
                  </div>
                  {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? 'Menyimpan...' : '✅ Simpan'}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
