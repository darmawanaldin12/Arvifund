'use client'
import { cn } from '../../lib/utils-cn'
import { fmt } from '../../lib/utils'
import { AnimatedAmount } from '../../hooks/useCountUp'

/* ── ScorecardCard (versi periode gajian) ───────────────────────────────────────────── */
export function ScorecardCard({ items, onItemClick, title = 'Pengeluaran Periode Ini' }) {
  return (
    <div className="bento-4">
      <div className="dash-card">
        <div className="dash-card-header">{title}</div>
        <div className="scorecard-grid">
          {items.map((item, i) => (
            <button key={i} onClick={() => onItemClick(item.modalType)}
              className={cn('scorecard-item', 'scorecard-item-btn')}
              aria-label={`${item.label}: ${item.value}, tap untuk grafik`}>
              <div className="scorecard-item-icon"><item.Icon size={18} /></div>
              <div className="scorecard-label">{item.label}</div>
              <div className={`scorecard-value ${item.cls}`}>
                {item.rawValue !== undefined
                  ? <AnimatedAmount value={item.rawValue} formatter={fmt} duration={600} />
                  : item.value}
              </div>
              <div className="scorecard-hint">tap untuk grafik</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
