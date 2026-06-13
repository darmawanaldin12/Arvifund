'use client'

const BARS = [
  { color: '#3b82f6', delay: '0s' },
  { color: '#6366f1', delay: '0.1s' },
  { color: '#8b5cf6', delay: '0.2s' },
  { color: '#a78bfa', delay: '0.3s' },
  { color: '#c4b5fd', delay: '0.4s' },
]

const SCAN_MESSAGES = [
  'Menyiapkan gambar...',
  'Menganalisa struk...',
  'Membaca data transaksi...',
  'Hampir selesai...',
]
const AI_MESSAGES = [
  'Menyiapkan data...',
  'Mengirim ke AI...',
  'Menganalisa transaksi...',
  'Hampir selesai...',
]

function getMsg(pct, msgs) {
  if (pct < 30) return msgs[0]
  if (pct < 60) return msgs[1]
  if (pct < 90) return msgs[2]
  return msgs[3]
}

export default function LoadingOverlay({ imagePreview, progress = 0 }) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>

      {imagePreview ? (
        /* ── Scan Struk mode ── */
        <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 20, width: 280, boxShadow: '0 20px 60px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Receipt preview + scan line */}
          <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, position: 'relative', background: '#000', border: '2px solid #3b82f6', overflow: 'hidden' }}>
            <img src={imagePreview} alt="Scanning struk" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            <div style={{ position: 'absolute', left: 0, right: 0, height: 3, top: 0, zIndex: 2, background: 'linear-gradient(90deg, transparent 0%, #3b82f6 30%, #8b5cf6 70%, transparent 100%)', animation: 'scanLine 1.8s ease-in-out infinite' }} />
          </div>

          {/* Bar wave */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 36 }}>
            {BARS.map((b, i) => (
              <div key={i} style={{ width: 7, borderRadius: 4, background: b.color, animation: `barWave 1.1s ease-in-out ${b.delay} infinite` }} />
            ))}
          </div>

          {/* Progress */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Membaca Struk...</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            </div>
            <div style={{ width: '100%', height: 4, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, textAlign: 'center' }}>
              {getMsg(pct, SCAN_MESSAGES)}
            </div>
          </div>
        </div>

      ) : (
        /* ── AI Processing mode ── */
        <div style={{ background: 'var(--surface)', borderRadius: 24, padding: '28px 24px', width: 256, boxShadow: '0 20px 60px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

          {/* Bar wave — bigger */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 52 }}>
            {BARS.map((b, i) => (
              <div key={i} style={{ width: 9, borderRadius: 5, background: b.color, animation: `barWave 1.1s ease-in-out ${b.delay} infinite` }} />
            ))}
          </div>

          {/* Progress */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>AI Memproses...</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            </div>
            <div style={{ width: '100%', height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
              {getMsg(pct, AI_MESSAGES)}
            </div>
          </div>

          {/* Sliding ghost bar — extra movement */}
          <div style={{ width: '100%', height: 3, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '40%', borderRadius: 99, background: 'linear-gradient(90deg,transparent,#6366f1,transparent)', animation: 'ghostSlide 1.6s ease-in-out infinite' }} />
          </div>

        </div>
      )}

      <style>{`
        @keyframes barWave {
          0%,100% { height: 10px; opacity: 0.45; }
          50%      { height: 46px; opacity: 1;    }
        }
        @keyframes scanLine {
          0%   { top: 0%;             }
          50%  { top: calc(100% - 3px); }
          100% { top: 0%;             }
        }
        @keyframes ghostSlide {
          0%   { margin-left: -40%; }
          100% { margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
