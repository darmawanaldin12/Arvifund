'use client'
import { ChevronRight } from 'lucide-react'
import { fmtFull } from '../../lib/utils'

export const CARD_THEME = {
  BCA:     { bg: 'linear-gradient(135deg, #06162c 0%, #0b2b50 58%, #075ca8 100%)', chip: '#d9e8f5', label: '#b8d8f5' },
  Mandiri: { bg: 'linear-gradient(135deg, #101827 0%, #17304a 58%, #2764a5 100%)', chip: '#d9e8f5', label: '#c0d9f3' },
  BRI:     { bg: 'linear-gradient(135deg, #211019 0%, #421b2c 58%, #812d4c 100%)', chip: '#ead9df', label: '#f0c4d3' },
  BNI:     { bg: 'linear-gradient(135deg, #111827 0%, #1e3150 58%, #365d91 100%)', chip: '#e0e7ef', label: '#c5d5ed' },
  Cash:    { bg: 'linear-gradient(135deg, #171717 0%, #292929 58%, #414141 100%)', chip: '#dedede', label: '#d4d4d4' },
  default: { bg: 'linear-gradient(135deg, #111318 0%, #20242d 58%, #343b49 100%)', chip: '#dedfe4', label: '#c6cad4' },
}

export default function AtmCard({ bankName, saldo, userName, needsSetup, onClick }) {
  const theme = CARD_THEME[bankName] || CARD_THEME.default
  const isNeg = saldo < 0
  return (
    <div className="wallet-atm-card" onClick={onClick} style={{
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
