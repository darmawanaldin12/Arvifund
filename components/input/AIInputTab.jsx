'use client'
import { Mic, MicOff, Camera, Image as ImageIcon, Trash2, Share2, Sparkles } from 'lucide-react'
import GeminiIcon from '../GeminiIcon'

// Ilustrasi ponsel memindai struk (warna mengikuti tema aplikasi)
function ScanIllustration() {
  const accent = { fill: 'var(--accent)' }
  const soft   = { fill: 'var(--text3)', opacity: 0.45 }
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect x="32" y="8" width="54" height="96" rx="11" style={{ fill: 'var(--accent-light)', stroke: 'var(--accent)' }} strokeWidth="2" />
      <rect x="38" y="17" width="42" height="72" rx="6" style={{ fill: 'var(--surface)' }} />
      <rect x="44" y="25" width="30" height="4" rx="2" style={{ ...accent, opacity: 0.7 }} />
      <rect x="44" y="35" width="24" height="3" rx="1.5" style={soft} />
      <rect x="44" y="43" width="28" height="3" rx="1.5" style={soft} />
      <rect x="44" y="51" width="20" height="3" rx="1.5" style={soft} />
      <rect x="44" y="59" width="26" height="3" rx="1.5" style={soft} />
      <rect x="40" y="68" width="38" height="2" rx="1" style={accent} />
      <rect x="50" y="94" width="18" height="3" rx="1.5" style={{ ...accent, opacity: 0.5 }} />
      <circle cx="88" cy="84" r="18" style={accent} />
      <path d="M80 81v-3a2 2 0 0 1 2-2h3M91 76h3a2 2 0 0 1 2 2v3M96 87v3a2 2 0 0 1-2 2h-3M85 92h-3a2 2 0 0 1-2-2v-3"
        stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AIInputTab({
  aiText, setAiText, aiTextRef,
  aiLoading,
  imageFile, imagePreview,
  isRecording, voiceSupported, iosDevice,
  error,
  sharedFromApp,
  handleAIExtract, handleImageFile, toggleRecording,
  onClearImage,
}) {
  const disabled = aiLoading || (!aiText.trim() && !imageFile)

  const S = {
    hintRow:    { fontSize: 12, color: 'var(--text3)', marginBottom: 3, lineHeight: 1.6 },
    hintAccent: { color: 'var(--accent)', fontWeight: 700 },
    errorBox:   { padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600 },
    sharedBanner: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-light)', border: '1px solid var(--accent-dim)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 },
    imgPreview: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', margin: '14px 0 0', textAlign: 'left' },
    iosTip:     { padding: '10px 12px', marginTop: 10, background: 'var(--accent-light)', border: '1px solid var(--accent-dim)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sharedFromApp && (
        <div style={S.sharedBanner}>
          <Share2 size={16} style={{ flexShrink: 0 }} />
          Foto diterima — tambahkan catatan (opsional) lalu tekan Ekstrak Data AI
        </div>
      )}

      {/* ── Kartu scan struk ── */}
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><ScanIllustration /></div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text1)', marginTop: 4 }}>Scan Struk dengan AI</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.55, margin: '6px 0 16px' }}>
          Ambil foto struk belanja, AI akan membaca dan mengisi data secara otomatis.
        </p>

        <button
          type="button" className="btn btn-primary btn-full"
          onClick={() => document.getElementById('input-page-camera').click()}
          style={{ height: 50, fontSize: 15, fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Camera size={18} />{imageFile ? 'Ganti Foto' : 'Mulai Scan'}
        </button>
        <button
          type="button" className="btn btn-ghost btn-full"
          onClick={() => document.getElementById('input-page-gallery').click()}
          style={{ height: 46, fontSize: 14, fontWeight: 700, borderRadius: 12, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <ImageIcon size={17} />Pilih dari Galeri
        </button>
        <input id="input-page-camera"  type="file" accept="image/*" capture="environment"
          onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />
        <input id="input-page-gallery" type="file" accept="image/*"
          onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />

        {imagePreview && (
          <div style={S.imgPreview}>
            <img src={imagePreview} alt="Struk"
              style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imageFile?.name || 'Struk'}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB · siap diekstrak` : ''}</div>
            </div>
            <button type="button" onClick={onClearImage} aria-label="Hapus foto"
              style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--red-bg)', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Ketik / ucapkan transaksi ── */}
      <div className="card" style={{ padding: 18 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="ai-text">{imageFile ? 'Catatan tambahan (opsional)' : 'Atau ketik / ucapkan transaksi'}</label>
          <div style={{ position: 'relative' }}>
            <textarea
              id="ai-text" className="form-input" rows={4}
              placeholder={imageFile ? 'Misal: beli baju, beli jajan... (boleh dikosongkan)' : 'Contoh: beli bensin 50rb aldin BCA...'}
              value={aiText}
              onChange={e => { setAiText(e.target.value); aiTextRef.current = e.target.value }}
              style={{ resize: 'none', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.6, paddingRight: 62 }}
            />
            <button
              type="button" onClick={toggleRecording}
              aria-label={isRecording ? 'Berhenti merekam' : 'Rekam suara'}
              style={{
                position: 'absolute', right: 10, bottom: 10, width: 44, height: 44, borderRadius: '50%',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isRecording ? 'var(--red)' : 'var(--accent)', color: '#fff', touchAction: 'manipulation',
                animation: isRecording ? 'pulse-record 1.5s infinite' : 'none',
              }}
            >
              {isRecording ? <MicOff size={19} /> : <Mic size={19} />}
            </button>
          </div>
        </div>

        {iosDevice && (
          <div style={S.iosTip}>
            📱 <strong>iPhone:</strong> Tap tombol mikrofon → bicara → tap lagi untuk berhenti. Rekaman otomatis berhenti setelah 10 detik, lalu langsung diproses AI.
          </div>
        )}

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6, minHeight: 32, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <Sparkles size={12} /> Contoh perintah
          </summary>
          <div style={{ marginTop: 8 }}>
            <div style={S.hintRow}><span style={{ color: 'var(--text1)', fontWeight: 600 }}>Pengeluaran:</span> "beli bensin 50rb aldin BCA"</div>
            <div style={S.hintRow}><span style={{ color: 'var(--text1)', fontWeight: 600 }}>Pemasukan:</span> "gaji 5jt mandiri aldin"</div>
            <div style={S.hintRow}><span style={{ color: 'var(--text1)', fontWeight: 600 }}>Tarik tunai:</span> "tarik 200rb ATM BCA"</div>
            <div style={S.hintRow}><span style={S.hintAccent}>Transfer:</span> "transfer 500rb ke solikhatun"</div>
            <div style={S.hintRow}><span style={S.hintAccent}>Pindah rekening:</span> "pindah 1jt BCA ke Mandiri"</div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              ⚠ Transfer ke selain Aldin/Solikhatun dicatat sebagai pengeluaran
            </div>
          </div>
        </details>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <button
        type="button" className="btn btn-primary btn-full"
        onClick={() => handleAIExtract()}
        disabled={disabled}
        style={{ height: 50, fontSize: 15, fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }}
      >
        <GeminiIcon size={20} style={{ flexShrink: 0 }} />
        {aiLoading ? 'Memproses...' : 'Ekstrak Data AI'}
      </button>
    </div>
  )
}
