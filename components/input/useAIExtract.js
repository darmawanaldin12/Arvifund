'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { buildSystemPrompt } from '../../lib/ai-prompt'
import { parseRupiahToInt } from '../../hooks/useAmountInput'
import { getAuthHeaders } from '../../lib/supabase'

function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

const SHARE_CACHE_NAME = 'arvifund-share-images-v4'
const SHARE_CACHE_KEY  = '/share-image-pending'
const SHARE_IMAGE_TTL  = 30 * 60 * 1000 // 30 menit

// Batas durasi rekaman suara (mode rekam → dikirim ke AI)
const RECORD_MAX_MS = 10_000

// Kalau metode Cash, paksa bank juga Cash
function normalizeBankFromMetode(result) {
  if (!result) return result
  if ((result.metode === 'Cash' || result.metode === 'cash') && result.bank !== 'Cash') {
    return { ...result, bank: 'Cash' }
  }
  return result
}

function bytesToBase64(bytes) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  return btoa(bin)
}

// Rekaman dari MediaRecorder (iPhone: audio/mp4, Android/desktop: audio/webm) → WAV mono 16 kHz
// supaya formatnya pasti diterima Gemini dan ukurannya kecil.
async function audioBlobToWavBase64(blob) {
  const AC = window.AudioContext || window.webkitAudioContext
  const ctx = new AC()
  try {
    const arrayBuf = await blob.arrayBuffer()
    // Bentuk callback dipakai supaya jalan juga di Safari lama
    const buf = await new Promise((resolve, reject) => ctx.decodeAudioData(arrayBuf, resolve, reject))
    const src = buf.getChannelData(0)
    const target = 16000
    const ratio = buf.sampleRate / target
    const len = Math.max(1, Math.floor(src.length / ratio))
    const wav = new Uint8Array(44 + len * 2)
    const dv = new DataView(wav.buffer)
    const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)) }
    w(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true)
    dv.setUint32(24, target, true); dv.setUint32(28, target * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true)
    w(36, 'data'); dv.setUint32(40, len * 2, true)
    for (let i = 0; i < len; i++) {
      const pos = i * ratio
      const i0 = Math.floor(pos)
      const i1 = Math.min(i0 + 1, src.length - 1)
      const f = pos - i0
      const s = Math.max(-1, Math.min(1, src[i0] * (1 - f) + src[i1] * f))
      dv.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return bytesToBase64(wav)
  } finally {
    try { ctx.close() } catch (_) {}
  }
}

// Simulasi progress bertahap
function useExtractProgress(aiLoading) {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (aiLoading) {
      setProgress(0)
      let current = 0
      function step() {
        setProgress(prev => {
          let increment
          if (prev < 30)      increment = 6 + Math.random() * 4
          else if (prev < 60) increment = 3 + Math.random() * 3
          else if (prev < 85) increment = 1 + Math.random() * 2
          else                return prev
          current = Math.min(90, prev + increment)
          return current
        })
        const delay = current < 30 ? 200 : current < 60 ? 350 : 600
        timerRef.current = setTimeout(step, delay)
      }
      timerRef.current = setTimeout(step, 150)
    } else {
      setProgress(100)
      timerRef.current = setTimeout(() => setProgress(0), 600)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [aiLoading])

  return progress
}

export function useAIExtract({ user, profiles, today, onResult, onTransferResult, onModeChange }) {
  const [aiText, setAiText]               = useState('')
  const [aiLoading, setAiLoading]         = useState(false)
  const [imageFile, setImageFile]         = useState(null)
  const [imagePreview, setImagePreview]   = useState('')
  const [isRecording, setIsRecording]     = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(true)
  const [iosDevice, setIosDevice]         = useState(false)
  const [error, setError]                 = useState('')
  const [sharedFromApp, setSharedFromApp] = useState(false)

  const extractProgress = useExtractProgress(aiLoading)

  const aiTextRef        = useRef('')
  const imageFileRef     = useRef(null)
  const recognitionRef   = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef   = useRef(null)
  const chunksRef        = useRef([])
  const autoExtractTimer = useRef(null)
  const safetyTimer      = useRef(null)

  useEffect(() => { aiTextRef.current = aiText }, [aiText])
  useEffect(() => { imageFileRef.current = imageFile }, [imageFile])

  function clearRecordingTimers() {
    if (autoExtractTimer.current) clearTimeout(autoExtractTimer.current)
    if (safetyTimer.current)      clearTimeout(safetyTimer.current)
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
      const reader  = new FileReader(); reader.readAsDataURL(file)
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

  // audioOverride: { mimeType, data(base64) } — rekaman suara yang langsung dikirim ke AI (tanpa Web Speech API)
  const handleAIExtract = useCallback(async (fileOverride = null, textOverride = null, audioOverride = null) => {
    const activeFile  = fileOverride instanceof Blob ? fileOverride : imageFileRef.current
    const activeText  = typeof textOverride === 'string' ? textOverride : aiTextRef.current
    const activeAudio = audioOverride && audioOverride.data ? audioOverride : null
    if (!activeText.trim() && !activeFile && !activeAudio) return
    setAiLoading(true); setError('')
    try {
      const systemInstruction = buildSystemPrompt(profiles, today, user)
      const parts = []
      if (activeFile)  parts.push({ inlineData: { mimeType: activeFile.type, data: await fileToBase64(activeFile) } })
      if (activeAudio) parts.push({ inlineData: { mimeType: activeAudio.mimeType, data: activeAudio.data } })
      let instruction
      if (activeFile) {
        instruction = `Ekstrak dari struk.${activeAudio ? ' Rekaman suara berisi keterangan tambahan dari user (bahasa Indonesia).' : ''} Catatan: "${activeText}"`
      } else if (activeAudio) {
        instruction = `Rekaman suara ini berisi satu transaksi dalam bahasa Indonesia. Dengarkan lalu ekstrak datanya.${activeText.trim() ? ` Catatan tambahan: "${activeText}"` : ''}`
      } else {
        instruction = `Kalimat: "${activeText}"`
      }
      parts.push({ text: `${systemInstruction}\n\n${instruction}` })

      // /api/gemini hanya melayani user yang login → sertakan token sesi Supabase
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`) }
      const resData    = await res.json()
      const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResult) throw new Error('Gagal mendapatkan respon dari AI')
      const result = JSON.parse(textResult)

      if (result.tipe === 'transfer') {
        onTransferResult({
          ...result,
          tanggal: result.tanggal || today,
          jumlah: result.jumlah ? parseRupiahToInt(result.jumlah) : '',
          catatan: result.catatan || '',
        })
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
        // Normalize: kalau metode Cash, paksa bank = Cash
        const normalized = normalizeBankFromMetode(result)
        onResult({
          tipe: normalized.tipe || 'expense',
          tanggal: normalized.tanggal || today,
          toko: normalized.toko || '',
          uraian: normalized.uraian || '',
          total: normalized.total ? parseRupiahToInt(normalized.total) : '',
          kategori: normalized.kategori || '',
          metode: normalized.metode || 'Cash',
          bank: normalized.bank || 'Cash',
          user_id: normalized.user_id || matchedProfile?.id || user?.id || '',
        })
      }
    } catch (err) { setError('AI Gagal: ' + err.message) }
    finally { setAiLoading(false) }
  }, [profiles, today, user, onResult, onTransferResult])

  const handleAIExtractRef = useRef(handleAIExtract)
  useEffect(() => { handleAIExtractRef.current = handleAIExtract }, [handleAIExtract])

  function triggerAutoExtract() {
    clearRecordingTimers()
    autoExtractTimer.current = setTimeout(() => {
      const t = aiTextRef.current; const f = imageFileRef.current
      if (t.trim() || f) handleAIExtractRef.current(f, t)
    }, 400)
  }

  function handleImageFile(file) {
    if (!file) return
    compressImage(file)
      .then(c  => { setImageFile(c); imageFileRef.current = c; setImagePreview(URL.createObjectURL(c)) })
      .catch(() => { setImageFile(file); imageFileRef.current = file; setImagePreview(URL.createObjectURL(file)) })
  }

  // Hapus entry gambar share-target yang pending di Cache API.
  // Dipanggil setelah transaksi berhasil disimpan, atau saat user
  // menghapus gambar secara manual — supaya gambar lama nggak
  // "nyangkut" dan ke-load ulang di sesi berikutnya.
  async function clearPendingShareImage() {
    try {
      const cache = await caches.open(SHARE_CACHE_NAME)
      await cache.delete(SHARE_CACHE_KEY)
    } catch (err) { console.error('[Share] Gagal hapus cache:', err) }
  }

  // Coba ambil gambar share-target yang masih pending dari Cache API.
  // Sengaja TIDAK bergantung pada flag ?shared=1 di URL, karena flag itu
  // bisa hilang kalau request sempat dilempar ke /login dulu (session
  // expired / re-auth biometrik) sebelum akhirnya balik ke /input.
  // Entry cache SENGAJA TIDAK langsung dihapus begitu dibaca — supaya kalau
  // user ke-logout paksa (session timeout) sebelum sempat extract/simpan,
  // gambar tetap bisa diambil ulang begitu balik lagi ke /input. Entry akan
  // hilang sendiri lewat TTL 30 menit, atau dihapus manual lewat
  // clearPendingShareImage() setelah transaksi disimpan / gambar dihapus.
  async function tryConsumePendingShareImage() {
    try {
      const cache  = await caches.open(SHARE_CACHE_NAME)
      const cached = await cache.match(SHARE_CACHE_KEY)
      if (!cached) return false
      const { dataUrl, timestamp } = await cached.json()
      if (Date.now() - timestamp > SHARE_IMAGE_TTL) {
        await cache.delete(SHARE_CACHE_KEY)
        return false
      }
      if (dataUrl && dataUrl.startsWith('data:')) {
        const res  = await fetch(dataUrl)
        const blob = await res.blob()
        const file = new File([blob], 'shared-image.jpg', { type: blob.type || 'image/jpeg' })
        setSharedFromApp(true); onModeChange('ai')
        handleImageFile(file)
        return true
      }
    } catch (err) { console.error('[Share] Gagal baca cache:', err) }
    return false
  }

  // Rekam suara lewat MediaRecorder → dikirim langsung ke AI.
  // Dipakai di iPhone (Web Speech API tidak bisa diandalkan di sana, terutama saat Arvifund
  // dibuka dari ikon Home Screen) dan di browser yang tidak punya Web Speech API.
  async function toggleRecorderRecording() {
    if (isRecording) {
      clearRecordingTimers()
      try { mediaRecorderRef.current?.stop() } catch (_) {}
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setError('Perangkat ini belum mendukung rekam suara. Perbarui iOS ke versi 14.3 atau lebih baru.')
      return
    }
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => window.MediaRecorder.isTypeSupported?.(t))
      const rec  = mime ? new window.MediaRecorder(stream, { mimeType: mime }) : new window.MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onerror = () => {
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false); clearRecordingTimers()
        setError('Gagal merekam suara. Coba lagi.')
      }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false); clearRecordingTimers()
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/mp4' })
        chunksRef.current = []
        if (blob.size < 1000) { setError('Tidak ada suara terekam. Coba lagi.'); return }
        try {
          setAiLoading(true)
          const data = await audioBlobToWavBase64(blob)
          setAiLoading(false)
          handleAIExtractRef.current(imageFileRef.current, aiTextRef.current, { mimeType: 'audio/wav', data })
        } catch (err) {
          setAiLoading(false)
          setError('Gagal memproses rekaman: ' + (err?.message || 'format audio tidak didukung'))
        }
      }
      mediaRecorderRef.current = rec
      rec.start()
      setIsRecording(true)
      safetyTimer.current = setTimeout(() => { try { rec.stop() } catch (_) {} }, RECORD_MAX_MS)
    } catch (err) {
      setIsRecording(false)
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') setError('Akses mikrofon ditolak. Izinkan mikrofon untuk Arvifund di Pengaturan perangkat.')
      else if (err?.name === 'NotFoundError') setError('Mikrofon tidak ditemukan di perangkat ini.')
      else setError('Gagal mulai rekam: ' + (err?.message || err))
    }
  }

  function toggleRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    // iPhone atau browser tanpa Web Speech API → pakai rekam suara + AI
    if (isIOS() || !SR) { toggleRecorderRecording(); return }
    if (!voiceSupported) {
      setError('Browser tidak mendukung voice. Gunakan Chrome atau Safari.')
      return
    }
    if (isRecording) { clearRecordingTimers(); try { recognitionRef.current?.stop() } catch (e) {}; return }
    setError('')
    try {
      const rec = new SR()
      rec.continuous = false; rec.interimResults = false; rec.lang = 'id-ID'; rec.maxAlternatives = 1
      rec.onstart  = () => { setIsRecording(true); setError(''); safetyTimer.current = setTimeout(() => { try { recognitionRef.current?.stop() } catch (_) {} }, 10_000) }
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

  useEffect(() => {
    async function handleShareTarget() {
      if (typeof window === 'undefined') return
      const params   = new URLSearchParams(window.location.search)
      const isShared = params.get('shared') === '1'
      if (isShared) window.history.replaceState({}, '', '/input')

      // Selalu coba konsumsi gambar pending dulu, terlepas dari ada/tidaknya
      // flag ?shared=1 (lihat catatan di tryConsumePendingShareImage).
      const consumed = await tryConsumePendingShareImage()
      if (consumed) return

      const sharedText = params.get('text') || params.get('title') || ''
      const sharedUrl  = params.get('url')  || ''
      if (sharedText || sharedUrl) {
        setSharedFromApp(true); onModeChange('ai')
        const combined = [sharedText, sharedUrl].filter(Boolean).join(' ').trim()
        setAiText(combined); aiTextRef.current = combined
        window.history.replaceState({}, '', '/input')
        setTimeout(() => { if (combined.trim()) handleAIExtractRef.current(null, combined) }, 500)
      }
    }
    handleShareTarget()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const ios = isIOS(); setIosDevice(ios)
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const canRecord = !!(navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined')
    if (!SR && !canRecord) { setVoiceSupported(false); return }
    setVoiceSupported(true)
    return () => {
      clearRecordingTimers()
      try { recognitionRef.current?.abort() } catch (_) {}
      try { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop() } catch (_) {}
      try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()) } catch (_) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetAI() {
    setAiText(''); setImageFile(null); setImagePreview('')
    aiTextRef.current = ''; imageFileRef.current = null
  }

  return {
    aiText, setAiText, aiTextRef,
    aiLoading,
    extractProgress,
    imageFile, setImageFile, imageFileRef,
    imagePreview, setImagePreview,
    isRecording, voiceSupported, iosDevice,
    error, setError,
    sharedFromApp,
    handleAIExtract, handleImageFile, toggleRecording,
    resetAI, clearPendingShareImage,
  }
}
