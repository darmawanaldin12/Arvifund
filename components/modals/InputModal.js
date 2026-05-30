'use client'
import { useState, useEffect, useRef } from 'react'
import { useData } from '../DataContext'
import { supabase } from '../../lib/supabase'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'

export default function InputModal({ onClose, onSuccess }) {
  const { user, profiles, loadData } = useData()
  const [mode, setMode]     = useState('ai') // 'manual' | 'ai' (AI is default)
  const [tipe, setTipe]     = useState('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [parsedResult, setParsedResult] = useState(null)

  // OCR Struk and Voice Note States
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState(null)

  // Keep a ref of aiText to access instantly inside async SpeechRecognition callbacks
  const aiTextRef = useRef('')
  useEffect(() => {
    aiTextRef.current = aiText
  }, [aiText])

  // Setup Web Speech API for voice notes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = false
        rec.lang = 'id-ID' // Indonesian

        rec.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript
          setAiText(prev => {
            const next = prev ? `${prev} ${transcript}` : transcript
            aiTextRef.current = next
            return next
          })
        }

        rec.onerror = (event) => {
          console.error('Speech recognition error', event.error)
          setIsRecording(false)
        }

        rec.onend = () => {
          setIsRecording(false)
          // Auto extract once recording finishes
          if (aiTextRef.current.trim()) {
            handleAIExtract(null, aiTextRef.current)
          }
        }

        setRecognition(rec)
      }
    }
  }, [])

  function toggleRecording() {
    if (!recognition) {
      setError('Browser Anda tidak mendukung perekaman suara (Speech Recognition). Coba gunakan Chrome atau Safari.')
      return
    }
    if (isRecording) {
      recognition.stop()
      setIsRecording(false)
    } else {
      setError('')
      try {
        recognition.start()
        setIsRecording(true)
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Helper to convert File to Base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64String = reader.result.split(',')[1]
        resolve(base64String)
      };
      reader.onerror = error => reject(error)
    })
  }

  // Client-side image compression and resizing using HTML5 Canvas
  function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions to maintain aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Canvas compression failed'))
              }
            },
            'image/jpeg',
            quality
          )
        }
        img.onerror = (err) => reject(err)
      }
      reader.onerror = (err) => reject(err)
    })
  }

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(() => ({
    tanggal: today, toko: '', uraian: '', total: '',
    kategori: '', metode: 'Cash', bank: 'Cash',
    user_id: '',
  }))

  // Sync user_id when user context is loaded
  useEffect(() => {
    if (user?.id) {
      setForm(f => ({ ...f, user_id: user.id }))
    }
  }, [user])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function getBulan(tgl) {
    if (!tgl) return ''
    return BULAN_ORDER[new Date(tgl).getMonth()]
  }

  async function handleAIExtract(fileToExtract = null, textToExtract = null) {
    const activeText = textToExtract !== null ? textToExtract : aiText
    const activeFile = fileToExtract !== null ? fileToExtract : imageFile

    if (!activeText.trim() && !activeFile) return
    setAiLoading(true)
    setError('')
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) throw new Error('API Key Gemini tidak ditemukan di .env.local')

      const systemInstruction = `Kamu adalah asisten keuangan pintar untuk aplikasi Arvifund. Tugasmu adalah mengekstrak data dari kalimat bahasa natural ATAU dari foto struk belanja/nota menjadi format JSON terstruktur.
Hari ini adalah: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('id-ID', { weekday: 'long' })}).

Daftar Kategori yang valid: ${JSON.stringify(KATEGORI_LIST.filter(k => k !== 'Pemasukan'))}
Daftar Bank/Dompet yang valid: ${JSON.stringify(BANK_LIST)}
Daftar Metode yang valid: ${JSON.stringify(METODE_LIST)}
Daftar User yang tersedia (gunakan username untuk mencocokkan): ${JSON.stringify((profiles || []).map(p => ({ id: p.id, username: p.username })))}

Aturan ekstraksi:
1. "tipe": Tentukan apakah "expense" (jika pengeluaran/beli/bayar/struk belanja), "income" (jika pemasukan/gaji/transfer masuk), atau "cash" (jika tarik tunai/pengeluaran tunai mandiri).
2. "tanggal": Format "YYYY-MM-DD". Sesuaikan dengan kata penunjuk waktu seperti "kemarin", "hari ini", "2 hari lalu", atau tanggal spesifik yang tertulis di struk/kalimat.
3. "toko": Nama toko/merchant/sumber pemasukan/lokasi ATM.
4. "uraian": Deskripsi barang atau uraian transaksi secara singkat.
5. "total": Nominal angka murni tanpa simbol (misal 50000). Cari nilai total akhir/grand total jika menganalisis struk.
6. "kategori": Harus persis sama dengan salah satu di Daftar Kategori jika bertipe expense (bisa dikosongkan/diabaikan jika tipe income/cash).
7. "metode": Harus persis sama dengan salah satu di Daftar Metode (jika bertipe cash, default ke Cash).
8. "bank": Harus persis sama dengan salah satu di Daftar Bank/Dompet.

Kembalikan HANYA objek JSON dengan skema berikut tanpa markdown block, kutipan, atau teks tambahan:
{
  "tipe": "expense" | "income" | "cash",
  "tanggal": "YYYY-MM-DD",
  "toko": "string",
  "uraian": "string",
  "total": number,
  "kategori": "string",
  "metode": "string",
  "bank": "string"
}
`;

      let parts = []
      
      if (activeFile) {
        const base64Data = await fileToBase64(activeFile)
        parts.push({
          inlineData: {
            mimeType: activeFile.type,
            data: base64Data
          }
        })
        
        parts.push({
          text: `${systemInstruction}\n\nEkstrak data dari struk belanja/nota pada gambar terlampir. Catatan tambahan pengguna (jika ada): "${activeText}"`
        })
      } else {
        parts.push({
          text: `${systemInstruction}\n\nKalimat transaksi: "${activeText}"`
        })
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const resData = await response.json()
      const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResult) throw new Error('Gagal mendapatkan respon dari AI')

      const result = JSON.parse(textResult)

      // Find matches in profiles based on prefix shortcuts or full username matching
      const aiTextTrimmed = activeText.trim().toLowerCase()
      let matchedProfile = null

      if (aiTextTrimmed.startsWith('a ') || aiTextTrimmed === 'a' || aiTextTrimmed.startsWith('a:')) {
        // Aldin shortcut
        matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('ald'))
      } else if (aiTextTrimmed.startsWith('s ') || aiTextTrimmed === 's' || aiTextTrimmed.startsWith('s:')) {
        // Solikhatun shortcut
        matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('sol'))
      } else {
        // Fallback to substring matching
        matchedProfile = profiles?.find(p => {
          const usernameLower = p.username?.toLowerCase()
          return usernameLower && aiTextTrimmed.includes(usernameLower)
        })
      }
      
      const finalUserId = matchedProfile ? matchedProfile.id : (user?.id || '')

      // Set parsed result and open confirmation view
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

  // Confirmation pop-up overlay (shown on top of the main modal after AI parsing)
  const confirmPopup = showConfirm && parsedResult ? (
    <div className="confirm-popup-overlay">
      <div className="confirm-popup-card">
        {/* Header */}
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

        {/* Parsed Data Card */}
        <div style={{
          background: 'var(--surface2)', borderRadius: 10,
          border: '1px solid var(--border)',
          overflow: 'hidden', marginBottom: 16,
          fontSize: 13,
        }}>
          {[
            {
              label: 'Tipe',
              value: parsedResult.tipe === 'expense' ? '💸 Pengeluaran' : parsedResult.tipe === 'income' ? '💰 Pemasukan' : '🏧 Tarik Tunai',
              bold: true,
              color: parsedResult.tipe === 'expense' ? 'var(--red)' : parsedResult.tipe === 'income' ? 'var(--green)' : 'var(--yellow)',
            },
            { label: 'Tanggal', value: parsedResult.tanggal },
            {
              label: parsedResult.tipe === 'income' ? 'Sumber' : parsedResult.tipe === 'cash' ? 'ATM / Lokasi' : 'Merchant',
              value: parsedResult.toko || '—',
            },
            { label: 'Uraian', value: parsedResult.uraian || '—' },
            {
              label: 'Jumlah',
              value: `Rp ${parseFloat(parsedResult.total || 0).toLocaleString('id-ID')}`,
              bold: true,
              color: parsedResult.tipe === 'expense' ? 'var(--red)' : parsedResult.tipe === 'income' ? 'var(--green)' : 'var(--yellow)',
            },
            ...(parsedResult.tipe === 'expense' ? [{ label: 'Kategori', value: parsedResult.kategori || 'Lainnya' }] : []),
            { label: 'Bank / Dompet', value: parsedResult.bank || 'Cash' },
            { label: 'Metode', value: parsedResult.metode || 'Cash' },
            { label: 'User', isUserSelect: true },
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 14px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ color: 'var(--text3)' }}>{row.label}</span>
              {row.isUserSelect ? (
                <select
                  value={parsedResult.user_id}
                  onChange={e => setParsedResult(prev => ({ ...prev, user_id: e.target.value }))}
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text1)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                >
                  <option value="">Pilih User</option>
                  {(profiles || []).map(p => (
                    <option key={p.id} value={p.id}>{p.username}</option>
                  ))}
                </select>
              ) : (
                <span style={{ fontWeight: row.bold ? 700 : 600, color: row.color || 'var(--text1)' }}>{row.value}</span>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '10px 12px', marginBottom: 12, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => {
            setTipe(parsedResult.tipe || 'expense')
            setForm({
              tanggal: parsedResult.tanggal || today,
              toko: parsedResult.toko || '',
              uraian: parsedResult.uraian || '',
              total: parsedResult.total ? String(parsedResult.total) : '',
              kategori: parsedResult.kategori || '',
              metode: parsedResult.metode || 'Cash',
              bank: parsedResult.bank || 'Cash',
              user_id: parsedResult.user_id || user?.id || '',
            })
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
              <button type="button" onClick={() => setMode('manual')} style={{
                flex: 1, padding: '10px', background: 'none', border: 'none',
                borderBottom: mode === 'manual' ? '2px solid var(--accent)' : 'none',
                color: mode === 'manual' ? 'var(--accent)' : 'var(--text3)',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
              }}>✍️ Input Manual</button>
              <button type="button" onClick={() => setMode('ai')} style={{
                flex: 1, padding: '10px', background: 'none', border: 'none',
                borderBottom: mode === 'ai' ? '2px solid var(--accent)' : 'none',
                color: mode === 'ai' ? 'var(--accent)' : 'var(--text3)',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
              }}>🤖 Input AI</button>
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

              {/* Media Helpers: Voice & OCR */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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
                    background: isRecording ? 'rgba(244,63,94,0.15)' : 'var(--surface2)',
                    color: isRecording ? 'var(--red)' : 'var(--text2)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    boxShadow: isRecording ? '0 0 12px rgba(244,63,94,0.3)' : 'none',
                    animation: isRecording ? 'pulse-record 1.5s infinite' : 'none'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {isRecording ? 'mic' : 'mic_none'}
                  </span>
                  {isRecording ? 'Mendengarkan...' : '🎙️ Suara'}
                </button>

                {/* Direct Camera Button */}
                <button
                  type="button"
                  onClick={() => document.getElementById('receipt-upload-camera').click()}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: imageFile ? '1px solid var(--green)' : '1px solid var(--border)',
                    background: imageFile ? 'rgba(16,185,129,0.15)' : 'var(--surface2)',
                    color: imageFile ? 'var(--green)' : 'var(--text2)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    photo_camera
                  </span>
                  {imageFile ? '✓ Kamera' : '📸 Kamera'}
                </button>

                {/* Photo Gallery Button */}
                <button
                  type="button"
                  onClick={() => document.getElementById('receipt-upload-gallery').click()}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: imageFile ? '1px solid var(--green)' : '1px solid var(--border)',
                    background: imageFile ? 'rgba(16,185,129,0.15)' : 'var(--surface2)',
                    color: imageFile ? 'var(--green)' : 'var(--text2)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    image
                  </span>
                  {imageFile ? '✓ Galeri' : '🖼️ Galeri'}
                </button>

                {/* Hidden input for DIRECT camera capture */}
                <input
                  id="receipt-upload-camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setAiLoading(true)
                      compressImage(file)
                        .then(compressed => {
                          setImageFile(compressed)
                          setImagePreview(URL.createObjectURL(compressed))
                          handleAIExtract(compressed, aiTextRef.current)
                        })
                        .catch(err => {
                          console.error('Compression failed', err)
                          setImageFile(file)
                          setImagePreview(URL.createObjectURL(file))
                          handleAIExtract(file, aiTextRef.current)
                        })
                    }
                  }}
                  style={{ display: 'none' }}
                />

                {/* Hidden input for GALLERY upload */}
                <input
                  id="receipt-upload-gallery"
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setAiLoading(true)
                      compressImage(file)
                        .then(compressed => {
                          setImageFile(compressed)
                          setImagePreview(URL.createObjectURL(compressed))
                          handleAIExtract(compressed, aiTextRef.current)
                        })
                        .catch(err => {
                          console.error('Compression failed', err)
                          setImageFile(file)
                          setImagePreview(URL.createObjectURL(file))
                          handleAIExtract(file, aiTextRef.current)
                        })
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Image Preview Card */}
              {imagePreview && (
                <div style={{
                  position: 'relative',
                  background: 'var(--surface2)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  padding: 10,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img src={imagePreview} alt="Receipt Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {imageFile?.name || 'File Struk'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview('')
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                  </button>
                </div>
              )}

              {error && (
                <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', border: '1px solid var(--red)', borderColor: 'rgba(244,63,94,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
                <button type="button" className="btn btn-primary" onClick={handleAIExtract} disabled={aiLoading} style={{ flex: 2 }}>
                  {aiLoading ? 'Sedang Memproses...' : '🤖 Ekstrak Data'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tipe */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {TIPE_LIST.map(t => (
                  <button key={t.id} type="button" onClick={() => setTipe(t.id)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8,
                    border: `2px solid ${tipe === t.id ? t.color : 'var(--border)'}`,
                    background: tipe === t.id ? `${t.color}18` : 'var(--surface2)',
                    color: tipe === t.id ? t.color : 'var(--text3)',
                    fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
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
                {error && (
                  <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', border: '1px solid var(--red)', borderColor: 'rgba(244,63,94,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                    {saving ? 'Menyimpan...' : '✅ Simpan'}
                  </button>
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
