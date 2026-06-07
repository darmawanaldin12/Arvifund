'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { supabase } from '../../lib/supabase'
import { insertTransfer } from '../../lib/data'
import { KATEGORI_LIST, BANK_LIST, METODE_LIST, BULAN_ORDER } from '../../lib/utils'
import {
  TrendingDown, TrendingUp, Landmark, Bot, PenLine,
  Mic, MicOff, Camera, Image, Trash2, X, Check, Share2, ArrowLeftRight, ChevronRight,
} from 'lucide-react'

function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

const BANK_BY_USER = {
  '9f5a9e66-a47e-4cf1-bfe6-107da0574a2e': ['BCA', 'Mandiri', 'BRI', 'Cash'],
  '42b635cc-a32d-4b15-95d6-d9afb504a850': ['BCA', 'Mandiri', 'Cash'],
}
const DEFAULT_BANKS = ['BCA', 'Mandiri', 'BRI', 'Cash']

const TIPE_LIST = [
  { id: 'expense',  label: 'Pengeluaran', color: 'var(--red)',    Icon: TrendingDown },
  { id: 'income',   label: 'Pemasukan',   color: 'var(--green)',  Icon: TrendingUp },
  { id: 'cash',     label: 'Tarik Tunai', color: 'var(--yellow)', Icon: Landmark },
  { id: 'transfer', label: 'Transfer',    color: 'var(--accent)', Icon: ArrowLeftRight },
]

// ── Toast ──────────────────────────────────────────────────────────────────
function SavedToast({ show, tipe, amount }) {
  if (!show) return null
  const map = { income: ['Pemasukan', '#10b981', TrendingUp], cash: ['Tarik Tunai', '#f59e0b', Landmark], transfer: ['Transfer', 'var(--accent)', ArrowLeftRight], expense: ['Pengeluaran', '#f43f5e', TrendingDown] }
  const [label, color, Icon] = map[tipe] || map.expense
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards', pointerEvents: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 260, maxWidth: 'calc(100vw - 32px)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={16} color={color} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} color={color} />{label} tersimpan</div>
          {amount && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Rp {Number(amount).toLocaleString('id-ID')}</div>}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, borderRadius: '0 0 16px 16px', background: color, opacity: 0.5, animation: 'toastProgress 2.5s linear 0.1s forwards', width: '100%' }} />
      </div>
    </div>
  )
}

// ── Confirm popup (AI result) ──────────────────────────────────────────────
function ConfirmPopup({ parsedResult, setParsedResult, profiles, user, today, error, saving, onClose, onEditManual, onSave }) {
  if (!parsedResult) return null
  const isTransfer = parsedResult.tipe === 'transfer'
  const tipeColorMap = { expense: 'var(--red)', income: 'var(--green)', cash: 'var(--yellow)', transfer: 'var(--accent)' }
  const TipeIconMap  = { expense: TrendingDown, income: TrendingUp, cash: Landmark, transfer: ArrowLeftRight }
  const tipeColor    = tipeColorMap[parsedResult.tipe] || 'var(--red)'
  const TipeIcon     = TipeIconMap[parsedResult.tipe]  || TrendingDown
  const tipeLabel    = { expense: 'Pengeluaran', income: 'Pemasukan', cash: 'Tarik Tunai', transfer: 'Transfer' }[parsedResult.tipe] || 'Pengeluaran'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '92dvh', overflowY: 'auto', padding: '20px 20px', paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={22} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Hasil Ekstraksi AI</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Periksa dan konfirmasi</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16, fontSize: 13 }}>
          {/* Baris Tipe */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text3)' }}>Tipe</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: tipeColor }}>
              <TipeIcon size={14} />{tipeLabel}
            </span>
          </div>
          {/* Baris Tanggal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text3)' }}>Tanggal</span>
            <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{parsedResult.tanggal}</span>
          </div>

          {/* Transfer fields */}
          {isTransfer ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Dari</span>
                <select value={parsedResult.from_user || ''} onChange={e => setParsedResult(p => ({ ...p, from_user: e.target.value }))}
                  style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit' }}>
                  <option value="">Pilih</option>
                  {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Ke</span>
                <select value={parsedResult.to_user || ''} onChange={e => setParsedResult(p => ({ ...p, to_user: e.target.value }))}
                  style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit' }}>
                  <option value="">Pilih</option>
                  {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Rek. Asal</span>
                <select value={parsedResult.from_bank || ''} onChange={e => setParsedResult(p => ({ ...p, from_bank: e.target.value }))}
                  style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit' }}>
                  {(BANK_BY_USER[parsedResult.from_user] || DEFAULT_BANKS).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Rek. Tujuan</span>
                <select value={parsedResult.to_bank || ''} onChange={e => setParsedResult(p => ({ ...p, to_bank: e.target.value }))}
                  style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit' }}>
                  {(BANK_BY_USER[parsedResult.to_user] || DEFAULT_BANKS).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Jumlah</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)' }}>Rp {parseFloat(parsedResult.total || 0).toLocaleString('id-ID')}</span>
              </div>
              {parsedResult.catatan && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px' }}>
                  <span style={{ color: 'var(--text3)' }}>Catatan</span>
                  <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{parsedResult.catatan}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>{parsedResult.tipe === 'income' ? 'Sumber' : parsedResult.tipe === 'cash' ? 'ATM / Lokasi' : 'Merchant'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{parsedResult.toko || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Uraian</span>
                <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{parsedResult.uraian || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Jumlah</span>
                <span style={{ fontWeight: 800, color: tipeColor }}>Rp {parseFloat(parsedResult.total || 0).toLocaleString('id-ID')}</span>
              </div>
              {parsedResult.tipe === 'expense' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text3)' }}>Kategori</span>
                  <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{parsedResult.kategori || 'Lainnya'}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Bank / Dompet</span>
                <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{parsedResult.bank || 'Cash'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)' }}>Metode</span>
                <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{parsedResult.metode || 'Cash'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px' }}>
                <span style={{ color: 'var(--text3)' }}>User</span>
                <select value={parsedResult.user_id || ''} onChange={e => setParsedResult(p => ({ ...p, user_id: e.target.value }))}
                  style={{ background: 'var(--surface)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                  <option value="">Pilih User</option>
                  {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          {!isTransfer && (
            <button type="button" className="btn btn-ghost" onClick={onEditManual} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <PenLine size={15} /> Edit Manual
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {saving ? 'Menyimpan...' : <><Check size={15} /> Konfirmasi & Simpan</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InputPage() {
  const { user, profiles, loadData } = useData()
  const [mode, setMode]     = useState('ai')
  const [tipe, setTipe]     = useState('expense')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [sharedFromApp, setSharedFromApp] = useState(false)
  const [toast, setToast]   = useState({ show: false, tipe: 'expense', amount: null })
  const toastTimer          = useRef(null)

  // AI state
  const [aiText, setAiText]             = useState('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
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

  useEffect(() => { aiTextRef.current = aiText }, [aiText])
  useEffect(() => { imageFileRef.current = imageFile }, [imageFile])

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  // Manual form (expense/income/cash)
  const [form, setForm] = useState({ tanggal: today, toko: '', uraian: '', total: '', kategori: '', metode: 'Cash', bank: 'Cash', user_id: '' })
  useEffect(() => { if (user?.id) setForm(f => ({ ...f, user_id: user.id })) }, [user])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Manual form (transfer)
  const [tf, setTfRaw] = useState({ tanggal: today, from_user: '', to_user: '', from_bank: '', to_bank: '', jumlah: '', catatan: '' })
  useEffect(() => {
    if (user?.id) {
      const b = BANK_BY_USER[user.id] || DEFAULT_BANKS
      setTfRaw(f => ({ ...f, from_user: user.id, from_bank: b[0] || '' }))
    }
  }, [user])
  const setTf = (k, v) => setTfRaw(f => ({ ...f, [k]: v }))
  const handleFromUserChange = uid => { const b = BANK_BY_USER[uid] || DEFAULT_BANKS; setTfRaw(f => ({ ...f, from_user: uid, from_bank: b[0] || '' })) }
  const handleToUserChange   = uid => { const b = BANK_BY_USER[uid] || DEFAULT_BANKS; setTfRaw(f => ({ ...f, to_user:   uid, to_bank:   b[0] || '' })) }
  const fromBanks = tf.from_user ? (BANK_BY_USER[tf.from_user] || DEFAULT_BANKS) : DEFAULT_BANKS
  const toBanks   = tf.to_user   ? (BANK_BY_USER[tf.to_user]   || DEFAULT_BANKS) : DEFAULT_BANKS
  const isInternal = tf.from_user === tf.to_user && tf.from_user !== ''
  const fromName   = profiles?.find(p => p.id === tf.from_user)?.username || ''
  const toName     = profiles?.find(p => p.id === tf.to_user)?.username   || ''

  function getBulan(tgl) { return BULAN_ORDER[new Date((tgl || today) + 'T00:00:00').getMonth()] }

  function showToast(tipeVal, amount) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ show: true, tipe: tipeVal, amount })
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800)
  }

  // Share target
  useEffect(() => {
    async function handleShareTarget() {
      if (typeof window === 'undefined') return
      if ('serviceWorker' in navigator) {
        const swShare = sessionStorage.getItem('share-target-file')
        if (swShare) {
          sessionStorage.removeItem('share-target-file')
          try { const { url } = JSON.parse(swShare); const res = await fetch(url); const blob = await res.blob(); const file = new File([blob], 'shared-image.jpg', { type: blob.type || 'image/jpeg' }); setSharedFromApp(true); setMode('ai'); handleImageFile(file); return } catch (_) {}
        }
      }
      const params = new URLSearchParams(window.location.search)
      const sharedText = params.get('text') || params.get('title') || ''
      const sharedUrl  = params.get('url') || ''
      if (sharedText || sharedUrl) {
        setSharedFromApp(true); setMode('ai')
        const combined = [sharedText, sharedUrl].filter(Boolean).join(' ').trim()
        setAiText(combined); aiTextRef.current = combined
        window.history.replaceState({}, '', '/input')
        setTimeout(() => { if (combined.trim()) handleAIExtractRef.current(null, combined) }, 500)
      }
    }
    handleShareTarget()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── AI Extract ──────────────────────────────────────────────────────────
  const handleAIExtract = useCallback(async (fileOverride = null, textOverride = null) => {
    const activeFile = fileOverride instanceof Blob ? fileOverride : imageFileRef.current
    const activeText = typeof textOverride === 'string' ? textOverride : aiTextRef.current
    if (!activeText.trim() && !activeFile) return
    setAiLoading(true); setError('')
    try {
      const systemInstruction = `Kamu adalah asisten keuangan pintar untuk aplikasi Arvifund. Tugasmu adalah mengekstrak data dari kalimat bahasa natural ATAU dari foto struk belanja/nota menjadi format JSON terstruktur.
Hari ini adalah: ${today} (${new Date().toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' })}).

=== ATURAN UTAMA: MENENTUKAN TIPE TRANSAKSI ===
Tipe WAJIB diisi salah satu dari: "expense", "income", "cash", atau "transfer".

1. "cash" → KHUSUS untuk TARIK TUNAI / ambil uang di ATM / penarikan tunai dari rekening.
   Kata kunci: "tarik tunai", "tarik uang", "ambil uang", "ATM", "withdrawal", "ke ATM".

2. "income" → untuk PEMASUKAN / penerimaan uang / gaji / transfer masuk.
   Kata kunci: "gaji", "terima", "masuk", "dapat uang", "pemasukan", "bayaran".

3. "transfer" → untuk TRANSFER UANG antar rekening atau antar pengguna.
   Kata kunci: "transfer ke", "kirim ke", "kasih", "pindahin ke", "transfer dari BCA ke Mandiri", "kirim duit ke".
   Field transfer: from_user (id pengirim), to_user (id penerima), from_bank, to_bank.
   Jika internal (1 orang, beda rekening): from_user = to_user.

4. "expense" → untuk semua PENGELUARAN / belanja / bayar sesuatu (bukan tarik tunai).

=== DATA ===
Daftar Kategori (hanya untuk tipe "expense"): ${JSON.stringify(KATEGORI_LIST.filter(k => k !== 'Pemasukan'))}
Daftar Bank/Dompet yang valid: ${JSON.stringify(BANK_LIST)}
Daftar Metode yang valid: ${JSON.stringify(METODE_LIST)}
Daftar User (gunakan id untuk from_user/to_user): ${JSON.stringify((profiles || []).map(p => ({ id: p.id, username: p.username })))}

Aturan field:
- "tanggal": format "YYYY-MM-DD", gunakan hari ini jika tidak disebutkan
- "toko": nama toko/merchant/lokasi ATM (bukan untuk transfer)
- "uraian": deskripsi singkat
- "total": angka murni (contoh: 50000 bukan "50rb")
- "kategori": hanya isi jika tipe "expense"
- "metode": metode pembayaran, default "Cash"
- "bank": nama bank/dompet, default "Cash"
- "catatan": opsional untuk transfer

Kembalikan HANYA objek JSON tanpa markdown:
{
  "tipe": "expense|income|cash|transfer",
  "tanggal": "YYYY-MM-DD",
  "toko": "string",
  "uraian": "string",
  "total": number,
  "kategori": "string",
  "metode": "string",
  "bank": "string",
  "from_user": "uuid atau null",
  "to_user": "uuid atau null",
  "from_bank": "string atau null",
  "to_bank": "string atau null",
  "catatan": "string atau null"
}`

      const parts = activeFile
        ? [{ inlineData: { mimeType: activeFile.type, data: await fileToBase64(activeFile) } }, { text: `${systemInstruction}\n\nEkstrak dari struk. Catatan: "${activeText}"` }]
        : [{ text: `${systemInstruction}\n\nKalimat: "${activeText}"` }]

      const res = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } })
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`) }
      const resData = await res.json()
      const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResult) throw new Error('Gagal mendapatkan respon dari AI')
      const result = JSON.parse(textResult)

      // Match user dari teks jika AI tidak bisa
      const aiTextTrimmed = activeText.trim().toLowerCase()
      let matchedProfile = null
      if (!result.from_user && !result.to_user) {
        if (aiTextTrimmed.startsWith('a ') || aiTextTrimmed === 'a' || aiTextTrimmed.startsWith('a:'))
          matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('ald'))
        else if (aiTextTrimmed.startsWith('s ') || aiTextTrimmed === 's' || aiTextTrimmed.startsWith('s:'))
          matchedProfile = profiles?.find(p => p.username?.toLowerCase().startsWith('sol'))
        else
          matchedProfile = profiles?.find(p => { const u = p.username?.toLowerCase(); return u && aiTextTrimmed.includes(u) })
      }

      const defaultUserId = matchedProfile ? matchedProfile.id : (user?.id || '')
      const firstFromBank = result.from_user ? (BANK_BY_USER[result.from_user]?.[0] || 'BCA') : (BANK_BY_USER[defaultUserId]?.[0] || 'BCA')
      const firstToBank   = result.to_user   ? (BANK_BY_USER[result.to_user]?.[0]   || 'BCA') : 'BCA'

      setParsedResult({
        tipe:      result.tipe      || 'expense',
        tanggal:   result.tanggal   || today,
        toko:      result.toko      || '',
        uraian:    result.uraian    || '',
        total:     result.total     ? String(result.total) : '',
        kategori:  result.kategori  || '',
        metode:    result.metode    || 'Cash',
        bank:      result.bank      || 'Cash',
        from_user: result.from_user || defaultUserId,
        to_user:   result.to_user   || '',
        from_bank: result.from_bank || firstFromBank,
        to_bank:   result.to_bank   || firstToBank,
        catatan:   result.catatan   || '',
        user_id:   defaultUserId,
      })
      setShowConfirm(true)
    } catch (err) { setError('AI Gagal: ' + err.message) }
    finally { setAiLoading(false) }
  }, [profiles, today, user])

  const handleAIExtractRef = useRef(handleAIExtract)
  useEffect(() => { handleAIExtractRef.current = handleAIExtract }, [handleAIExtract])

  // ── Voice ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ios = isIOS(); setIosDevice(ios)
    if (typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setVoiceSupported(false); return }
    setVoiceSupported(true)
    return () => {
      if (autoExtractTimer.current) clearTimeout(autoExtractTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      try { recognitionRef.current?.abort() } catch (_) {}
    }
  }, [])

  function toggleRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition || !voiceSupported) { setError(iosDevice ? 'Pastikan Safari terbaru (iOS 14.5+) dan izinkan mikrofon.' : 'Browser tidak mendukung voice. Gunakan Chrome atau Safari.'); return }
    if (isRecording) { try { recognitionRef.current?.stop() } catch (e) {}; setIsRecording(false); return }
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
      recognitionRef.current = rec; rec.start()
    } catch (err) { setError('Gagal mulai rekam: ' + err.message); setIsRecording(false) }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject
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
            let { width, height } = img
            const maxW = 1000, maxH = 1000
            if (width > height) { if (width > maxW) { height = Math.round(height * maxW / width); width = maxW } }
            else { if (height > maxH) { width = Math.round(width * maxH / height); height = maxH } }
            canvas.width = width; canvas.height = height
            canvas.getContext('2d').drawImage(img, 0, 0, width, height)
            canvas.toBlob(blob => { clearTimeout(timeout); if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })); else reject(new Error('Compression failed')) }, 'image/jpeg', 0.75)
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
      .then(c => { setImageFile(c); imageFileRef.current = c; setImagePreview(URL.createObjectURL(c)); handleAIExtract(c, aiTextRef.current) })
      .catch(() => { setImageFile(file); imageFileRef.current = file; setImagePreview(URL.createObjectURL(file)); handleAIExtract(file, aiTextRef.current) })
  }

  // ── Save: confirm popup ──────────────────────────────────────────────────
  async function handleConfirmSave() {
    setError('')
    const p = parsedResult
    if (p.tipe === 'transfer') {
      if (!p.from_user) return setError('Pilih pengirim')
      if (!p.to_user)   return setError('Pilih penerima')
      if (!p.from_bank) return setError('Pilih rekening asal')
      if (!p.to_bank)   return setError('Pilih rekening tujuan')
      if (p.from_user === p.to_user && p.from_bank === p.to_bank) return setError('Rekening asal dan tujuan tidak boleh sama')
      if (!p.total || isNaN(parseFloat(p.total)) || parseFloat(p.total) <= 0) return setError('Jumlah harus lebih dari 0')
      setSaving(true)
      try {
        await insertTransfer({ tanggal: p.tanggal, from_user: p.from_user, to_user: p.to_user, from_bank: p.from_bank, to_bank: p.to_bank, jumlah: parseFloat(p.total), catatan: p.catatan || null }, user?.id)
        await loadData()
        setShowConfirm(false); setAiText(''); setImageFile(null); setImagePreview('')
        aiTextRef.current = ''; imageFileRef.current = null
        showToast('transfer', parseFloat(p.total))
      } catch (err) { setError('Gagal simpan: ' + err.message) }
      finally { setSaving(false) }
      return
    }

    // expense / income / cash
    if (!p.total || isNaN(parseFloat(p.total))) return setError('Total harus diisi')
    if (!p.user_id) return setError('User harus dipilih')
    setSaving(true)
    try {
      const bulan = getBulan(p.tanggal); const nilai = parseFloat(p.total)
      if (p.tipe === 'expense') {
        const { error: err } = await supabase.from('expenses').insert([{ toko: p.toko, tanggal: p.tanggal, bulan, transaksi: p.metode || 'Cash', uraian: p.uraian, kategori: p.kategori || 'Lainnya', bank: p.bank || 'Cash', nilai, user_id: p.user_id }])
        if (err) throw err
      } else if (p.tipe === 'income') {
        const { error: err } = await supabase.from('income').insert([{ sumber: p.toko, tanggal: p.tanggal, bulan, jumlah: nilai, metode: p.metode || 'Cash', items: p.uraian, bank: p.bank || 'Cash', kategori: 'Pemasukan', user_id: p.user_id }])
        if (err) throw err
      } else if (p.tipe === 'cash') {
        const { error: err } = await supabase.from('cash_records').insert([{ tanggal: p.tanggal, bulan, transaksi: p.uraian || 'Tarik Tunai', kategori: 'Pengeluaran', bank: p.bank || 'Cash', nilai, alamat: p.toko, metode: 'Cash', user_id: p.user_id }])
        if (err) throw err
      }
      await loadData(); setShowConfirm(false); setAiText(''); setImageFile(null); setImagePreview('')
      aiTextRef.current = ''; imageFileRef.current = null
      showToast(p.tipe, nilai)
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  // ── Save: manual (expense/income/cash) ──────────────────────────────────
  async function handleManualSubmit(e) {
    e.preventDefault(); setError('')
    if (!form.total || isNaN(parseFloat(form.total))) return setError('Total harus diisi')
    if (!form.user_id) return setError('User harus dipilih')
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

  // ── Save: manual transfer ────────────────────────────────────────────────
  async function handleTransferSubmit(e) {
    e.preventDefault(); setError('')
    if (!tf.from_user) return setError('Pilih pengirim')
    if (!tf.to_user)   return setError('Pilih penerima')
    if (!tf.from_bank) return setError('Pilih rekening asal')
    if (!tf.to_bank)   return setError('Pilih rekening tujuan')
    if (isInternal && tf.from_bank === tf.to_bank) return setError('Rekening asal dan tujuan tidak boleh sama')
    if (!tf.jumlah || isNaN(parseFloat(tf.jumlah)) || parseFloat(tf.jumlah) <= 0) return setError('Jumlah harus lebih dari 0')
    setSaving(true)
    try {
      await insertTransfer({ tanggal: tf.tanggal, from_user: tf.from_user, to_user: tf.to_user, from_bank: tf.from_bank, to_bank: tf.to_bank, jumlah: parseFloat(tf.jumlah), catatan: tf.catatan || null }, user?.id)
      await loadData()
      setTfRaw({ tanggal: today, from_user: user?.id || '', to_user: '', from_bank: BANK_BY_USER[user?.id]?.[0] || '', to_bank: '', jumlah: '', catatan: '' })
      showToast('transfer', parseFloat(tf.jumlah))
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  // ── AI Loading overlay ───────────────────────────────────────────────────
  const loadingOverlay = aiLoading && !showConfirm ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      {imagePreview ? (
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 20, width: 280, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, position: 'relative', background: '#000', border: '2px solid #38bdf8', overflow: 'hidden' }}>
            <img src={imagePreview} alt="Scanning" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
            <div style={{ position: 'absolute', left: 0, right: 0, height: 3, top: 0, zIndex: 2, background: 'linear-gradient(90deg, transparent 0%, #38bdf8 30%, #38bdf8 70%, transparent 100%)', boxShadow: '0 0 10px 2px rgba(56,189,248,0.8)', animation: 'scanLineMove 1.8s ease-in-out infinite' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Bot size={16} /> Membaca Struk...</div>
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
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', animation: 'centerPulse 1.2s ease-in-out infinite', boxShadow: '0 0 12px var(--accent)' }} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Bot size={16} /> AI Memproses...</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {[0, 0.15, 0.3].map((d, i) => <span key={i} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: `dotPulse 1.4s ease-in-out ${d}s infinite` }} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null

  return (
    <>
      {loadingOverlay}
      {showConfirm && (
        <ConfirmPopup
          parsedResult={parsedResult} setParsedResult={setParsedResult}
          profiles={profiles} user={user} today={today}
          error={error} saving={saving}
          onClose={() => setShowConfirm(false)}
          onEditManual={() => {
            setTipe(parsedResult.tipe || 'expense')
            setForm({ tanggal: parsedResult.tanggal || today, toko: parsedResult.toko || '', uraian: parsedResult.uraian || '', total: parsedResult.total ? String(parsedResult.total) : '', kategori: parsedResult.kategori || '', metode: parsedResult.metode || 'Cash', bank: parsedResult.bank || 'Cash', user_id: parsedResult.user_id || user?.id || '' })
            setShowConfirm(false); setMode('manual')
          }}
          onSave={handleConfirmSave}
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

        {/* Mode Tabs: AI / Manual */}
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          {[{ id: 'ai', label: 'Input AI', Icon: Bot }, { id: 'manual', label: 'Manual', Icon: PenLine }].map(m => (
            <button key={m.id} type="button" onClick={() => setMode(m.id)} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: mode === m.id ? 'var(--accent)' : 'transparent',
              color: mode === m.id ? 'white' : 'var(--text3)',
              fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}><m.Icon size={15} />{m.label}</button>
          ))}
        </div>

        {/* ── AI MODE ── */}
        {mode === 'ai' && (
          <div className="card">
            {/* Tips contoh transfer */}
            <div style={{ padding: '10px 12px', marginBottom: 14, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent)' }}>AI bisa catat:</strong> pengeluaran, pemasukan, tarik tunai, dan transfer antar rekening.<br />
              <span style={{ color: 'var(--text3)' }}>Contoh transfer: <em>"transfer 500rb dari BCA aldin ke BCA solikhatun"</em> atau <em>"pindahin 200rb dari BCA ke Mandiri"</em></span>
            </div>

            <div className="form-group">
              <label className="form-label">Ketik atau diktekan transaksi</label>
              <textarea className="form-input" rows={4}
                placeholder="Contoh: Transfer 500rb dari BCA Aldin ke Mandiri Solikhatun\nAtau: Beli bensin 50rb di Pertamina pakai BCA"
                value={aiText}
                onChange={e => { setAiText(e.target.value); aiTextRef.current = e.target.value }}
                style={{ resize: 'none', fontFamily: 'inherit', fontSize: 16 }}
              />
            </div>

            {iosDevice && (
              <div style={{ padding: '10px 12px', marginBottom: 12, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                📱 <strong>iPhone:</strong> Tap <Mic size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Suara → bicara → otomatis diproses.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[{ id: 'mic', icon: isRecording ? <MicOff size={22} /> : <Mic size={22} />, label: isRecording ? 'Rekam...' : 'Suara', active: isRecording, activeColor: 'var(--red)', onClick: toggleRecording },
                { id: 'cam', icon: <Camera size={22} />, label: 'Kamera', active: !!imageFile, activeColor: 'var(--green)', onClick: () => document.getElementById('input-page-camera').click() },
                { id: 'gal', icon: <Image size={22} />, label: 'Galeri',  active: !!imageFile, activeColor: 'var(--green)', onClick: () => document.getElementById('input-page-gallery').click() },
              ].map(btn => (
                <button key={btn.id} type="button" onClick={btn.onClick} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '14px 8px', borderRadius: 10,
                  border: btn.active ? `2px solid ${btn.activeColor}` : '1px solid var(--border)',
                  background: btn.active ? `${btn.activeColor}18` : 'var(--surface2)',
                  color: btn.active ? btn.activeColor : 'var(--text2)',
                  cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation',
                  animation: btn.id === 'mic' && isRecording ? 'pulse-record 1.5s infinite' : 'none',
                }}>
                  {btn.icon}
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{btn.label}</span>
                </button>
              ))}
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

        {/* ── MANUAL MODE ── */}
        {mode === 'manual' && (
          <div className="card">
            {/* Tipe selector: 4 tipe termasuk transfer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 20 }}>
              {TIPE_LIST.map(t => {
                const IconComp = t.Icon
                return (
                  <button key={t.id} type="button" onClick={() => { setTipe(t.id); setError('') }} style={{
                    padding: '10px 4px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${tipe === t.id ? t.color : 'var(--border)'}`,
                    background: tipe === t.id ? `${t.color}18` : 'var(--surface2)',
                    color: tipe === t.id ? t.color : 'var(--text3)',
                    fontWeight: 700, fontSize: 10, touchAction: 'manipulation',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  }}>
                    <IconComp size={20} />{t.label}
                  </button>
                )
              })}
            </div>

            {/* Form transfer */}
            {tipe === 'transfer' ? (
              <form onSubmit={handleTransferSubmit}>
                <div className="form-group">
                  <label className="form-label">Tanggal</label>
                  <input className="form-input" type="date" value={tf.tanggal} onChange={e => setTf('tanggal', e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Dari</label>
                    <select className="form-select" value={tf.from_user} onChange={e => handleFromUserChange(e.target.value)}>
                      <option value="">Pilih pengirim</option>
                      {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                    </select>
                  </div>
                  <div style={{ paddingBottom: 10, color: 'var(--text3)' }}><ArrowLeftRight size={16} /></div>
                  <div>
                    <label className="form-label">Ke</label>
                    <select className="form-select" value={tf.to_user} onChange={e => handleToUserChange(e.target.value)}>
                      <option value="">Pilih penerima</option>
                      {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Rekening asal</label>
                    <select className="form-select" value={tf.from_bank} onChange={e => setTf('from_bank', e.target.value)} disabled={!tf.from_user}>
                      {!tf.from_user && <option value="">Pilih pengirim dulu</option>}
                      {fromBanks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div style={{ paddingBottom: 10, color: 'var(--text3)' }}><ChevronRight size={16} /></div>
                  <div>
                    <label className="form-label">Rekening tujuan</label>
                    <select className="form-select" value={tf.to_bank} onChange={e => setTf('to_bank', e.target.value)} disabled={!tf.to_user}>
                      {!tf.to_user && <option value="">Pilih penerima dulu</option>}
                      {toBanks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                {tf.from_user && tf.to_user && tf.from_bank && tf.to_bank && (
                  <div style={{ padding: '8px 12px', marginBottom: 14, background: isInternal ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)', border: `1px solid ${isInternal ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}`, borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
                    {isInternal ? `Pindah rekening ${fromName}: ${tf.from_bank} → ${tf.to_bank}` : `${fromName} (${tf.from_bank}) → ${toName} (${tf.to_bank})`}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Jumlah</label>
                  <input className="form-input" type="number" inputMode="numeric" placeholder="0" value={tf.jumlah} onChange={e => setTf('jumlah', e.target.value)} required min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan (opsional)</label>
                  <input className="form-input" type="text" placeholder="Contoh: buat belanja bulan ini" value={tf.catatan} onChange={e => setTf('catatan', e.target.value)} />
                </div>

                {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={saving} style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ArrowLeftRight size={18} />{saving ? 'Menyimpan...' : 'Simpan Transfer'}
                </button>
              </form>
            ) : (
              /* Form expense / income / cash */
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
                <button type="submit" className="btn btn-primary btn-full" disabled={saving} style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Check size={18} />{saving ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </form>
            )}
          </div>
        )}
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
