'use client'
import { ChevronRight } from 'lucide-react'
import { fmtFull } from '../../lib/utils'

export const CARD_THEME = {
  BCA:     { bg: 'linear-gradient(135deg, #003d82 0%, #0066cc 60%, #0099ff 100%)', chip: '#f5c842', label: '#a8d4ff' },
  Mandiri: { bg: 'linear-gradient(135deg, #1a3a00 0%, #2d6a00 60%, #4a9e00 100%)', chip: '#f5d442', label: '#b8e87a' },
  BRI:     { bg: 'linear-gradient(135deg, #7a0000 0%, #c0001a 60%, #e8003d 100%)', chip: '#ffd700', label: '#ffb3c0' },
  BNI:     { bg: 'linear-gradient(135deg, #001a4d 0%, #003399 60%, #0055cc 100%)', chip: '#f0c000', label: '#99bbff' },
  Cash:    { bg: 'linear-gradient(135deg, #3a2a00 0%, #7a5a00 60%, #b88a00 100%)', chip: '#ffe066', label: '#ffe8a0' },
  default: { bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)', chip: '#e0c97f', label: '#9eafd4' },
}

export default function AtmCard({ bankName, saldo, userName, needsSetup, onClick }) {
  const theme = CARD_THEME[bankName] || CARD_THEME.default
  const isNeg = saldo < 0
  return (
    <div onClick={onClick} style={{
      width: '100%', aspectRatio: '1.586 / 1', borderRadius: 18,
      background: theme.bg, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)', position: 'relative',
      overflow: 'hidden', flexShrink: 0, userSelect: 'none',
      opacity: needsSetup ? 0.6 : 1,
      cursor: needsSetup ? 'default' : 'pointer',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -20, left: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '0.04em', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{bankName}</div>
        <div style={{ width: 28, height: 22, borderRadius: 4, background: theme.chip, opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 18, height: 14, borderRadius: 2, border: '1px solid rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: 2 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 1 }} />)}
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: theme.label, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Saldo Rekening</div>
        {needsSetup ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>Belum diatur — tap Set</div>
        ) : (
          <div style={{ fontSize: 22, fontWeight: 800, color: isNeg ? '#ff6b6b' : '#fff', letterSpacing: '-0.01em', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
            {fmtFull(saldo)}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{userName}</div>
        {!needsSetup && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>Tap lihat riwayat</span><ChevronRight size={10} />
          </div>
        )}
      </div>
    </div>
  )
}
