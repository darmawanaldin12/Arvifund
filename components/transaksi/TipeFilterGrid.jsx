'use client'
import { Receipt } from 'lucide-react'
import { fmt } from '../../lib/utils'
import { TIPE_CONFIG, TIPE_ORDER } from '../../lib/transaksiHelpers'

export default function TipeFilterGrid({ tab, onSwitch, countAll, totalInc, totalExp, totalByTipe, countByTipe }) {
  return (
    <div className="trx-typegrid">
      <button
        type="button"
        onClick={() => onSwitch('all')}
        className={`trx-tile trx-hero${tab === 'all' ? ' is-active' : ''}`}
        style={{ '--tile-color': 'var(--accent)', '--tile-bg': 'var(--accent-light)' }}
        aria-pressed={tab === 'all'}
      >
        <div className="trx-tile-top">
          <div className="trx-tile-icon"><Receipt size={16} /></div>
          <span className="trx-tile-count">{countAll} transaksi</span>
        </div>
        <div className="trx-tile-label">Semua Transaksi</div>
        <div className="trx-tile-value trx-hero-value">{countAll}</div>
        <div className="trx-hero-sub">
          <span style={{ color: 'var(--green)' }}>↑ {fmt(totalInc)}</span>
          <span style={{ color: 'var(--red)' }}>↓ {fmt(totalExp)}</span>
        </div>
      </button>

      {TIPE_ORDER.map(key => {
        const cfg = TIPE_CONFIG[key]
        const active = tab === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSwitch(key)}
            className={`trx-tile${active ? ' is-active' : ''}`}
            style={{ '--tile-color': cfg.color, '--tile-bg': cfg.bg }}
            aria-pressed={active}
          >
            <div className="trx-tile-top">
              <div className="trx-tile-icon"><cfg.Icon size={15} /></div>
              <span className="trx-tile-count">{countByTipe[key]}</span>
            </div>
            <div className="trx-tile-label">{cfg.label}</div>
            <div className="trx-tile-value">{fmt(totalByTipe[key])}</div>
          </button>
        )
      })}
    </div>
  )
}
