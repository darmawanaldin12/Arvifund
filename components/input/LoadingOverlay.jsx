'use client'
import GeminiIcon from '../GeminiIcon'

export default function LoadingOverlay({ imagePreview, progress = 0 }) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      {imagePreview ? (
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 20, width: 280, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, position: 'relative', background: '#000', border: '2px solid var(--accent)', overflow: 'hidden' }}>
            <img src={imagePreview} alt="Scanning" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
            <div style={{ position: 'absolute', left: 0, right: 0, height: 3, top: 0, zIndex: 2, background: 'linear-gradient(90deg, transparent 0%, var(--accent) 30%, var(--accent) 70%, transparent 100%)', animation: 'scanLineMove 1.8s ease-in-out infinite' }} />
          </div>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <GeminiIcon size={18} /> Membaca Struk...
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{pct}%</span>
            </div>
            <div style={{ width: '100%', height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
              {pct < 30 ? 'Menyiapkan gambar...' : pct < 60 ? 'Menganalisa struk...' : pct < 90 ? 'Membaca data transaksi...' : 'Hampir selesai...'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 24, padding: '32px 28px', width: 260, boxShadow: '0 16px 48px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)', animation: 'spin 1.2s linear infinite' }} />
            <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: 'var(--accent-dim)', borderLeftColor: 'var(--accent-dim)', animation: 'spin 0.9s linear infinite reverse' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GeminiIcon size={26} />
            </div>
          </div>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>AI Memproses...</div>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{pct}%</span>
            </div>
            <div style={{ width: '100%', height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
              {pct < 30 ? 'Menyiapkan data...' : pct < 60 ? 'Mengirim ke AI...' : pct < 90 ? 'Menganalisa transaksi...' : 'Hampir selesai...'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
