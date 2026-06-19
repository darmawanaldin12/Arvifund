'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { buildSystemPrompt } from '../../lib/ai-prompt'
import { parseRupiahToInt } from '../../hooks/useAmountInput'

function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

const SHARE_CACHE_NAME = 'arvifund-share-images-v4'
const SHARE_CACHE_KEY  = '/share-image-pending'
const SHARE_IMAGE_TTL  = 30 * 60 * 1000 // 30 menit

// Kalau metode Cash, paksa bank juga Cash
function normalizeBankFromMetode(result) {
  if (!result) return result
  if ((result.metode === 'Cash' || result.metode === 'cash') && result.bank !== 'Cash') {
    return { ...result, bank: 'Cash' }
  }
  return result
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

  const handleAIExtract = useCallback(async (fileOverride = null, textOverride = null) => {
    const activeFile = fileOverride instanceof Blob ? fileOverride : imageFileRef.current
    const activeText = typeof textOverride === 'string' ? textOverride : aiTextRef.current
    if (!activeText.trim() && !activeFile) return
    setAiLoading(true); setError('')
    try {
      const systemInstruction = buildSystemPrompt(profiles, today, user)
      const parts = activeFile
        ? [{ inlineData: { mimeType: activeFile.type, data: await fileToBase64(activeFile) } }, { text: `${systemInstruction}\n\nEkstrak dari struk. Catatan: "${activeText}"` }]
        : [{ text: `${systemInstruction}\n\nKalimat: "${activeText}"` }]

      const res = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      if (isShared) {
        window.history.replaceState({}, '', '/input')
        try {
          const cache  = await caches.open(SHARE_CACHE_NAME)
          const cached = await cache.match(SHARE_CACHE_KEY)
          if (cached) {
            const { dataUrl, timestamp } = await cached.json()
            if (Date.now() - timestamp > SHARE_IMAGE_TTL) {
              await cache.delete(SHARE_CACHE_KEY)
              return
            }
            if (dataUrl && dataUrl.startsWith('data:')) {
              await cache.delete(SHARE_CACHE_KEY)
              const res  = await fetch(dataUrl)
              const blob = await res.blob()
              const file = new File([blob], 'shared-image.jpg', { type: blob.type || 'image/jpeg' })
              setSharedFromApp(true); onModeChange('ai')
              handleImageFile(file); return
            }
          }
        } catch (err) { console.error('[Share] Gagal baca cache:', err) }
      }
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
    if (!SR) { setVoiceSupported(false); return }
    setVoiceSupported(true)
    return () => {
      clearRecordingTimers()
      try { recognitionRef.current?.abort() } catch (_) {}
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
    imageFile, setImageFile,
    imagePreview, setImagePreview,
    isRecording, voiceSupported, iosDevice,
    error, setError,
    sharedFromApp,
    handleAIExtract, handleImageFile, toggleRecording,
    resetAI,
  }
}
