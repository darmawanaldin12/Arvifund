'use client'
import { Mic, MicOff, Camera, Image, Trash2, Share2, Sparkles } from 'lucide-react'
import GeminiIcon from '../GeminiIcon'

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
  const S = {
    hintCard:   { background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, borderLeft: '3px solid var(--accent)' },
    hintTitle:  { fontWeight: 700, fontSize: 12, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.4px' },
    hintRow:    { fontSize: 12, color: 'var(--text3)', marginBottom: 3, lineHeight: 1.6 },
    hintAccent: { color: 'var(--accent)', fontWeight: 700 },
    hintNote:   { marginTop: 8, fontSize: 11, color: 'var(--text3)', paddingTop: 8, borderTop: '1px solid var(--border)' },
    mediaGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 },
    mediaBtn:   (active, activeColor) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
      padding: '16px 8px', borderRadius: 12,
      border: active ? `2px solid ${activeColor}` : '1.5px solid var(--border)',
      background: active ? `${activeColor}12` : 'var(--surface2)',
      color: active ? activeColor : 'var(--text2)',
      cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation',
    }),
    mediaLabel: { fontSize: 11, fontWeight: 700 },
    errorBox:   { padding: '10px 14px', marginBottom: 14, background: 'var(--red-bg)', borderRadius: 10, color: 'var(--red)', fontSize: 13, fontWeight: 600 },
    ctaBtn:     (disabled) => ({ height: 50, fontSize: 15, fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }),
    sharedBanner: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-light)', border: '1px solid var(--accent-dim)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--accent)', fontWeight: 600 },
    imgPreview: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 },
    imgHint:    { fontSize: 12, color: 'var(--text3)', marginTop: -8, marginBottom: 16, lineHeight: 1.5 },
    iosTip:     { padding: '10px 12px', marginBottom: 12, background: 'var(--accent-light)', border: '1px solid var(--accent-dim)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 },
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      {sharedFromApp && (
        <div style={S.sharedBanner}>
          <Share2 size={16} style={{ flexShrink: 0 }} />
          Foto diterima — tambahkan catatan (opsional) lalu tekan Ekstrak Data AI
        </div>
      )}

      <div style={S.hintCard}>
        <div style={S.hintTitle}><Sparkles size={12} /> Contoh perintah</div>
        <div style={S.hintRow}><span style={{ color: 'var(--text1)', fontWeight: 600 }}>Pengeluaran:</span> "beli bensin 50rb aldin BCA"</div>
        <div style={S.hintRow}><span style={{ color: 'var(--text1)', fontWeight: 600 }}>Pemasukan:</span> "gaji 5jt mandiri aldin"</div>
        <div style={S.hintRow}><span style={{ color: 'var(--text1)', fontWeight: 600 }}>Tarik tunai:</span> "tarik 200rb ATM BCA"</div>
        <div style={S.hintRow}><span style={S.hintAccent}>Transfer:</span> "transfer 500rb ke solikhatun"</div>
        <div style={S.hintRow}><span style={S.hintAccent}>Pindah rekening:</span> "pindah 1jt BCA ke Mandiri"</div>
        <div style={S.hintNote}>⚠ Transfer ke selain Aldin/Solikhatun dicatat sebagai pengeluaran</div>
      </div>

      <div className="form-group">
        <label className="form-label">{imageFile ? 'Catatan tambahan (opsional)' : 'Ketik atau diktekan transaksi'}</label>
        <textarea
          className="form-input" rows={4}
          placeholder={imageFile ? 'Misal: beli baju, beli jajan... (boleh dikosongkan)' : 'Contoh: beli bensin 50rb aldin BCA...'}
          value={aiText}
          onChange={e => { setAiText(e.target.value); aiTextRef.current = e.target.value }}
          style={{ resize: 'none', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.6 }}
        />
      </div>

      {iosDevice && (
        <div style={S.iosTip}>
          📱 <strong>iPhone:</strong> Tap tombol Suara → bicara → otomatis diproses. Berhenti otomatis setelah diam atau 10 detik.
        </div>
      )}

      <div style={S.mediaGrid}>
        <button type="button" onClick={toggleRecording}
          style={{ ...S.mediaBtn(isRecording, 'var(--red)'), animation: isRecording ? 'pulse-record 1.5s infinite' : 'none' }}>
          {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
          <span style={S.mediaLabel}>{isRecording ? 'Berhenti' : 'Suara'}</span>
        </button>
        <button type="button" onClick={() => document.getElementById('input-page-camera').click()}
          style={S.mediaBtn(!!imageFile, 'var(--green)')}>
          <Camera size={22} />
          <span style={S.mediaLabel}>Kamera</span>
        </button>
        <button type="button" onClick={() => document.getElementById('input-page-gallery').click()}
          style={S.mediaBtn(!!imageFile, 'var(--green)')}>
          <Image size={22} />
          <span style={S.mediaLabel}>Galeri</span>
        </button>
        <input id="input-page-camera"  type="file" accept="image/*" capture="environment"
          onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />
        <input id="input-page-gallery" type="file" accept="image/*"
          onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: 'none' }} />
      </div>

      {imagePreview && (
        <div style={S.imgPreview}>
          <img src={imagePreview} alt="Struk"
            style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imageFile?.name || 'Struk'}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
          </div>
          <button type="button" onClick={onClearImage}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--red-bg)', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {imageFile && (
        <div style={S.imgHint}>
          💡 Gambar siap. Isi catatan di atas kalau perlu (misal "beli baju"), atau langsung tekan Ekstrak Data AI.
        </div>
      )}

      {error && <div style={S.errorBox}>{error}</div>}

      <button
        type="button" className="btn btn-primary btn-full"
        onClick={() => handleAIExtract()}
        disabled={aiLoading || (!aiText.trim() && !imageFile)}
        style={S.ctaBtn(aiLoading || (!aiText.trim() && !imageFile))}>
        <GeminiIcon size={20} style={{ flexShrink: 0 }} />
        {aiLoading ? 'Memproses...' : 'Ekstrak Data AI'}
      </button>
    </div>
  )
}
