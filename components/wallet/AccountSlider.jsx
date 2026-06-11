'use client'
import { useState, useRef } from 'react'
import { AlertCircle, Settings2 } from 'lucide-react'
import { fmtFull } from '../../lib/utils'
import AtmCard from './AtmCard'

export default function AccountSlider({ userId, userName, bankBalances, accounts, onSetSaldo, onViewHistory }) {
  const isAldin  = userName?.toLowerCase().includes('ald')
  const color    = isAldin ? 'var(--accent)' : '#db2777'
  const initial  = userName?.[0]?.toUpperCase() || '?'
  const sliderRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)

  const userAccounts = accounts.filter(a => a.user_id === userId)
  const allItems = userAccounts.map(acc => ({
    ...acc,
    ...(bankBalances[userId]?.[acc.name] || { saldo: 0, needsSetup: true, account_id: acc.id }),
  }))

  const totalSaldo      = allItems.filter(a => !a.needsSetup).reduce((s, a) => s + a.saldo, 0)
  const needsSetupCount = allItems.filter(a => a.needsSetup).length
  const activeAcc       = allItems[activeIdx]

  const handleScroll = () => {
    if (!sliderRef.current) return
    const el = sliderRef.current
    setActiveIdx(Math.round(el.scrollLeft / el.offsetWidth))
  }

  const scrollTo = (idx) => {
    if (!sliderRef.current) return
    sliderRef.current.scrollTo({ left: idx * sliderRef.current.offsetWidth, behavior: 'smooth' })
    setActiveIdx(idx)
  }

  if (allItems.length === 0) return null

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: `color-mix(in srgb, ${color} 5%, var(--surface))`, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color, flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>{userName}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {needsSetupCount > 0 ? `${needsSetupCount} belum diatur` : `${allItems.length} rekening aktif`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 1 }}>Total aset</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: totalSaldo >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {needsSetupCount === allItems.length ? '—' : fmtFull(totalSaldo)}
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 0 6px' }}>
        <div ref={sliderRef} onScroll={handleScroll}
          style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingLeft: 14, paddingRight: 14 }}>
          {allItems.map((acc, i) => (
            <div key={acc.id}
              style={{ scrollSnapAlign: 'start', flexShrink: 0, width: 'calc(100% - 28px)', marginRight: i < allItems.length - 1 ? 10 : 0 }}>
              <AtmCard bankName={acc.name} saldo={acc.saldo} userName={userName} needsSetup={acc.needsSetup}
                onClick={() => !acc.needsSetup && onViewHistory(acc)} />
            </div>
          ))}
        </div>
        {allItems.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            {allItems.map((_, i) => (
              <div key={i} onClick={() => scrollTo(i)}
                style={{ width: i === activeIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === activeIdx ? color : 'var(--border)', cursor: 'pointer', transition: 'width 0.25s ease, background 0.25s ease' }} />
            ))}
          </div>
        )}
      </div>
      {activeAcc && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {activeAcc.needsSetup ? (
              <span style={{ color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Belum ada baseline
              </span>
            ) : (
              `Baseline ${new Date(activeAcc.balance_set_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!activeAcc.needsSetup && (
              <button onClick={() => onViewHistory(activeAcc)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text2)', fontFamily: 'inherit' }}>
                Riwayat
              </button>
            )}
            <button onClick={() => onSetSaldo({ account_id: activeAcc.id, name: activeAcc.name })}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', background: activeAcc.needsSetup ? color : 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: activeAcc.needsSetup ? '#fff' : 'var(--text2)', fontFamily: 'inherit' }}>
              <Settings2 size={12} />
              {activeAcc.needsSetup ? 'Set Saldo' : 'Ubah'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
